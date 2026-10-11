// VERIDIS NutriScan — Supabase Authentication Manager
// Requires supabase-config.js to initialize window.supabaseClient.

(function (global) {
  "use strict";

  class AuthManager {
    constructor() {
      this.client = null;
      this.currentUser = null;
      this.authSubscription = null;
      this.initializationPromise = null;
    }

    async init() {
      if (this.initializationPromise) {
        return this.initializationPromise;
      }

      this.initializationPromise = (async () => {
        const client = global.supabaseClient;

        if (!client?.auth) {
          throw new Error(
            "Supabase client unavailable. Check script order and supabase-config.js."
          );
        }

        this.client = client;

        const { data, error } = await client.auth.getSession();

        if (error) throw error;

        this.currentUser = data.session?.user || null;

        if (!this.authSubscription) {
          const { data: subscriptionData } =
            client.auth.onAuthStateChange((event, session) => {
              this.currentUser = session?.user || null;

              global.dispatchEvent(
                new CustomEvent("veridis:auth-state-changed", {
                  detail: {
                    event,
                    user: this.currentUser
                  }
                })
              );
            });

          this.authSubscription =
            subscriptionData.subscription;
        }

        return this.currentUser;
      })();

      try {
        return await this.initializationPromise;
      } catch (error) {
        this.initializationPromise = null;
        this.client = null;
        throw error;
      }
    }

    async getSession() {
      await this.init();

      const { data, error } =
        await this.client.auth.getSession();

      if (error) throw error;

      return data.session;
    }

    async getUser() {
      await this.init();

      const { data, error } =
        await this.client.auth.getUser();

      if (error) throw error;

      this.currentUser = data.user || null;
      return this.currentUser;
    }

    async getToken() {
      const session = await this.getSession();
      return session?.access_token || null;
    }

    // Supabase manages session storage and refresh.
    setToken() {
      console.warn(
        "Manual token storage is disabled. Use Supabase Auth."
      );
    }

    async isAuthenticated() {
      const session = await this.getSession();
      return Boolean(session?.user);
    }

    async signInWithGoogle(redirectTo) {
      await this.init();

      const destination =
        redirectTo || `${global.location.origin}/`;

      const { data, error } =
        await this.client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: destination
          }
        });

      if (error) throw error;

      return data;
    }

    async signInWithPassword(email, password) {
      await this.init();

      const { data, error } =
        await this.client.auth.signInWithPassword({
          email: String(email).trim(),
          password
        });

      if (error) throw error;

      this.currentUser = data.user || null;
      return data;
    }

    async signUp(email, password, options = {}) {
      await this.init();

      const { data, error } =
        await this.client.auth.signUp({
          email: String(email).trim(),
          password,
          options
        });

      if (error) throw error;

      this.currentUser = data.user || null;
      return data;
    }

    async signOut() {
      await this.init();

      const { error } = await this.client.auth.signOut();

      if (error) throw error;

      this.currentUser = null;
      return true;
    }

    async clearAuth() {
      return this.signOut();
    }

    async refreshSession() {
      await this.init();

      const { data, error } =
        await this.client.auth.refreshSession();

      if (error) throw error;

      this.currentUser = data.session?.user || null;
      return data.session;
    }

    async getUserProfile() {
      const user = await this.getUser();

      if (!user) return null;

      const { data, error } = await this.client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile lookup failed:", error.message);
        throw error;
      }

      return {
        ...(data || {}),
        id: user.id,
        email: user.email,
        full_name:
          data?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "",
        avatar_url:
          data?.avatar_url ||
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null,
        created_at: data?.created_at || user.created_at
      };
    }

    async setUserProfile(profile = {}) {
      const user = await this.getUser();

      if (!user) {
        throw new Error("Please sign in before saving your profile.");
      }

      const fullName =
        profile.full_name ??
        profile.fullName ??
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        "";

      const { data, error } = await this.client
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) {
        console.error("Profile save failed:", error.message);
        throw error;
      }

      return data;
    }

    decodeToken(token) {
      try {
        if (typeof token !== "string") return null;

        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const base64 = parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        const padded = base64.padEnd(
          Math.ceil(base64.length / 4) * 4,
          "="
        );

        const bytes = Uint8Array.from(
          global.atob(padded),
          character => character.charCodeAt(0)
        );

        return JSON.parse(
          new TextDecoder().decode(bytes)
        );
      } catch {
        return null;
      }
    }

    async getTokenExpiration() {
      const session = await this.getSession();

      return session?.expires_at
        ? new Date(session.expires_at * 1000)
        : null;
    }

    async isTokenExpired() {
      const expiration = await this.getTokenExpiration();

      return !expiration || Date.now() >= expiration.getTime();
    }

    async getTimeUntilExpiration() {
      const expiration = await this.getTokenExpiration();

      return expiration
        ? Math.max(0, expiration.getTime() - Date.now())
        : 0;
    }

    setupAutoRefresh() {
      console.info(
        "Supabase Auth handles session refresh automatically."
      );
    }

    validateToken(token) {
      const decoded = this.decodeToken(token);

      // This is only a structural check, not signature verification.
      return Boolean(
        decoded &&
        (decoded.sub || decoded.id) &&
        decoded.exp
      );
    }

    async getUserPermissions() {
      const user = await this.getUser();
      return user?.app_metadata?.permissions || [];
    }

    async hasPermission(permission) {
      const permissions = await this.getUserPermissions();
      return permissions.includes(permission);
    }

    async getUserRoles() {
      const user = await this.getUser();
      const role = user?.app_metadata?.role;

      return role ? [role] : [];
    }

    async hasRole(role) {
      const roles = await this.getUserRoles();
      return roles.includes(role);
    }

    destroy() {
      if (this.authSubscription) {
        this.authSubscription.unsubscribe();
        this.authSubscription = null;
      }

      this.client = null;
      this.currentUser = null;
      this.initializationPromise = null;
    }
  }

  const authManager = new AuthManager();

  global.AuthManager = AuthManager;
  global.authManager = authManager;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      AuthManager,
      authManager
    };
  }
})(window);
