// VERIDIS NutriScan
// Supabase Authentication Manager
// Requires: @supabase/supabase-js v2
// Requires: supabase client initialized in supabase-config.js

class AuthManager {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.authSubscription = null;
    this.initializationPromise = null;
  }

  /**
   * Initialize using the existing Supabase client.
   * supabase-config.js must expose window.supabaseClient.
   */
  async init() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      this.client = window.supabaseClient || null;

      if (!this.client) {
        throw new Error(
          "Supabase client not found. Check supabase-config.js."
        );
      }

      const { data, error } = await this.client.auth.getSession();

      if (error) {
        throw error;
      }

      this.currentUser = data.session?.user || null;

      if (!this.authSubscription) {
        const { data: subscriptionData } =
          this.client.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;

            window.dispatchEvent(
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
      throw error;
    }
  }

  /**
   * Get the active session.
   */
  async getSession() {
    await this.init();

    const { data, error } =
      await this.client.auth.getSession();

    if (error) throw error;

    return data.session;
  }

  /**
   * Get the authenticated user.
   */
  async getUser() {
    await this.init();

    const { data, error } =
      await this.client.auth.getUser();

    if (error) throw error;

    this.currentUser = data.user;
    return data.user;
  }

  /**
   * Return the current access token.
   * Supabase manages refreshing the session.
   */
  async getToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  }

  /**
   * Compatibility method.
   * New code should use getToken() instead.
   */
  setToken() {
    console.warn(
      "Do not store tokens manually. Supabase manages sessions."
    );
  }

  /**
   * Get the current user's profile.
   */
  async getUserProfile() {
    const user = await this.getUser();

    if (!user) return null;

    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not fetch user profile:",
        error.message
      );
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      full_name:
        data?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "",
      avatar_url:
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null,
      created_at: data?.created_at || user.created_at
    };
  }

  /**
   * Save or update the current user's profile.
   */
  async setUserProfile(profile = {}) {
    const user = await this.getUser();

    if (!user) {
      throw new Error("Please log in first.");
    }

    const fullName =
      profile.full_name ||
      profile.fullName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
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
      console.error(
        "Could not save profile:",
        error.message
      );
      throw error;
    }

    return data;
  }

  /**
   * Check authentication.
   * Returns a Promise<boolean>.
   */
  async isAuthenticated() {
    const session = await this.getSession();
    return !!session?.user;
  }

  /**
   * Sign in with Google.
   */
  async signInWithGoogle() {
    await this.init();

    const redirectTo = window.location.origin;

    const { data, error } =
      await this.client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });

    if (error) throw error;

    return data;
  }

  /**
   * Sign out the current user.
   */
  async signOut() {
    await this.init();

    const { error } = await this.client.auth.signOut();

    if (error) throw error;

    this.currentUser = null;
    return true;
  }

  /**
   * Clear the Supabase session.
   * Retained for compatibility with older code.
   */
  async clearAuth() {
    return this.signOut();
  }

  /**
   * Refresh the Supabase session when necessary.
   */
  async refreshSession() {
    await this.init();

    const { data, error } =
      await this.client.auth.refreshSession();

    if (error) throw error;

    this.currentUser = data.session?.user || null;
    return data.session;
  }

  /**
   * Decode JWT payload for informational purposes only.
   * Decoding does NOT verify the token's authenticity.
   */
  decodeToken(token) {
    try {
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
        atob(padded),
        char => char.charCodeAt(0)
      );

      const payload = new TextDecoder().decode(bytes);

      return JSON.parse(payload);
    } catch (error) {
      console.error("Token decode error:", error);
      return null;
    }
  }

  /**
   * Token expiry information.
   */
  async getTokenExpiration() {
    const session = await this.getSession();

    if (!session?.expires_at) return null;

    return new Date(session.expires_at * 1000);
  }

  async isTokenExpired() {
    const expiration = await this.getTokenExpiration();

    if (!expiration) return true;

    return Date.now() >= expiration.getTime();
  }

  async getTimeUntilExpiration() {
    const expiration = await this.getTokenExpiration();

    if (!expiration) return 0;

    return Math.max(
      0,
      expiration.getTime() - Date.now()
    );
  }

  /**
   * Supabase automatically refreshes sessions.
   * This method is retained for compatibility.
   */
  setupAutoRefresh() {
    console.info(
      "Supabase Auth manages session refresh automatically."
    );
  }

  /**
   * Validate basic token structure.
   * This does not replace server-side verification.
   */
  validateToken(token) {
    if (!token || typeof token !== "string") {
      return false;
    }

    const decoded = this.decodeToken(token);

    return !!(
      decoded &&
      (decoded.sub || decoded.id) &&
      decoded.exp
    );
  }

  /**
   * Read permissions from user app metadata.
   * Never trust client-side permissions for authorization.
   */
  async getUserPermissions() {
    const user = await this.getUser();

    return user?.app_metadata?.permissions || [];
  }

  async hasPermission(permission) {
    const permissions = await this.getUserPermissions();

    return permissions.includes(permission);
  }

  /**
   * Read roles from user app metadata.
   */
  async getUserRoles() {
    const user = await this.getUser();

    const role = user?.app_metadata?.role;

    return role ? [role] : [];
  }

  async hasRole(role) {
    const roles = await this.getUserRoles();

    return roles.includes(role);
  }

  /**
   * Unsubscribe from authentication events.
   */
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

// Create the singleton.
const authManager = new AuthManager();

// Keep compatibility with browser scripts.
if (typeof window !== "undefined") {
  window.authManager = authManager;
}

// Support CommonJS environments where applicable.
if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = {
    AuthManager,
    authManager
  };
      }
