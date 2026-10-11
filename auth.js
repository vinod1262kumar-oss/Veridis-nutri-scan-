/**
 * VERIDIS NutriScan — Authentication Manager
 * Version: 2.0.0
 *
 * Features:
 * - Supabase authentication
 * - Google OAuth support
 * - Session persistence
 * - Automatic token refresh
 * - User profile management
 * - Protected-page helpers
 * - Secure logout
 *
 * IMPORTANT:
 * Configure your Supabase URL and publishable/anon key
 * in supabase-config.js before using this module.
 */

class AuthManager {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.currentUser = null;
    this.currentSession = null;

    this.listeners = new Set();
    this.authSubscription = null;

    this.configFile = "./supabase-config.js";
  }

  /**
   * Initialize Supabase authentication.
   *
   * Requires:
   * 1. Supabase JS client loaded in the browser.
   * 2. A global supabaseClient created by supabase-config.js.
   */
  async init() {
    if (this.initialized) {
      return this.getSession();
    }

    try {
      const client = window.supabaseClient;

      if (!client) {
        throw new Error(
          "Supabase is not configured. Check supabase-config.js."
        );
      }

      if (
        typeof client.auth?.getSession !== "function" ||
        typeof client.auth?.signInWithOAuth !== "function"
      ) {
        throw new Error(
          "The configured Supabase client is invalid."
        );
      }

      this.client = client;

      // Restore the existing session and let Supabase
      // manage token expiration and refresh.
      const {
        data,
        error
      } = await this.client.auth.getSession();

      if (error) {
        throw error;
      }

      this.currentSession = data.session;
      this.currentUser = data.session?.user ?? null;

      // Listen for login, logout, token refresh and
      // other authentication-state changes.
      const {
        data: subscription
      } = this.client.auth.onAuthStateChange(
        (event, session) => {
          this.currentSession = session;
          this.currentUser = session?.user ?? null;

          this.notifyListeners({
            event,
            session,
            user: this.currentUser
          });
        }
      );

      this.authSubscription = subscription.subscription;
      this.initialized = true;

      return data.session;
    } catch (error) {
      console.error(
        "[VERIDIS Auth] Initialization failed:",
        error.message
      );

      throw error;
    }
  }

  /**
   * Ensure authentication has been initialized.
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }

    return this.client;
  }

  /**
   * Get the current Supabase session.
   */
  async getSession() {
    await this.ensureInitialized();

    const {
      data,
      error
    } = await this.client.auth.getSession();

    if (error) {
      throw error;
    }

    this.currentSession = data.session;
    this.currentUser = data.session?.user ?? null;

    return data.session;
  }

  /**
   * Get the currently authenticated user.
   */
  async getUser() {
    await this.ensureInitialized();

    const {
      data,
      error
    } = await this.client.auth.getUser();

    if (error) {
      throw error;
    }

    this.currentUser = data.user;

    return data.user;
  }

  /**
   * Check whether a valid authenticated session exists.
   */
  async isAuthenticated() {
    try {
      const session = await this.getSession();

      return Boolean(
        session?.access_token &&
        session?.user?.id
      );
    } catch (error) {
      console.error(
        "[VERIDIS Auth] Authentication check failed:",
        error.message
      );

      return false;
    }
  }

  /**
   * Sign in using Google OAuth.
   *
   * The redirect URL should be registered in:
   * Supabase Dashboard → Authentication → URL Configuration.
   */
  async signInWithGoogle() {
    await this.ensureInitialized();

    try {
      const redirectTo = new URL(
        "Index.html",
        window.location.href
      ).href;

      const {
        data,
        error
      } = await this.client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "[VERIDIS Auth] Google login failed:",
        error.message
      );

      throw new Error(
        this.getFriendlyError(error)
      );
    }
  }

  /**
   * Sign in using email and password.
   */
  async signInWithEmail(email, password) {
    await this.ensureInitialized();

    if (!email || !password) {
      throw new Error(
        "Please enter your email and password."
      );
    }

    try {
      const {
        data,
        error
      } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw error;
      }

      this.currentSession = data.session;
      this.currentUser = data.user;

      return data;
    } catch (error) {
      throw new Error(
        this.getFriendlyError(error)
      );
    }
  }

  /**
   * Register a new user using email and password.
   */
  async signUpWithEmail(email, password) {
    await this.ensureInitialized();

    if (!email || !password) {
      throw new Error(
        "Please enter your email and password."
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Your password must contain at least 8 characters."
      );
    }

    try {
      const {
        data,
        error
      } = await this.client.auth.signUp({
        email: email.trim(),
        password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(
        this.getFriendlyError(error)
      );
    }
  }

  /**
   * Send a password-reset email.
   */
  async resetPassword(email) {
    await this.ensureInitialized();

    if (!email) {
      throw new Error(
        "Please enter your email address."
      );
    }

    try {
      const redirectTo = new URL(
        "Login.html",
        window.location.href
      ).href;

      const {
        data,
        error
      } = await this.client.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo
        }
      );

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(
        this.getFriendlyError(error)
      );
    }
  }

  /**
   * Sign out the current user.
   */
  async signOut() {
    await this.ensureInitialized();

    try {
      const {
        error
      } = await this.client.auth.signOut();

      if (error) {
        throw error;
      }

      this.currentSession = null;
      this.currentUser = null;

      return true;
    } catch (error) {
      console.error(
        "[VERIDIS Auth] Logout failed:",
        error.message
      );

      throw new Error(
        this.getFriendlyError(error)
      );
    }
  }

  /**
   * Require authentication before showing a private page.
   *
   * Example:
   * await authManager.requireAuth("Login.html");
   */
  async requireAuth(loginPage = "Login.html") {
    const authenticated = await this.isAuthenticated();

    if (!authenticated) {
      const returnTo =
        window.location.pathname +
        window.location.search;

      const loginURL = new URL(
        loginPage,
        window.location.href
      );

      loginURL.searchParams.set(
        "returnTo",
        returnTo
      );

      window.location.replace(loginURL.href);

      return false;
    }

    return true;
  }

  /**
   * Return the user's public-facing profile information.
   *
   * This does not query the database or expose private
   * application data.
   */
  async getUserProfile() {
    const user = await this.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        null,
      avatar:
        user.user_metadata?.avatar_url ??
        user.user_metadata?.picture ??
        null,
      provider:
        user.app_metadata?.provider ?? null,
      createdAt: user.created_at ?? null,
      emailVerified: Boolean(
        user.email_confirmed_at
      )
    };
  }

  /**
   * Subscribe to authentication-state changes.
   *
   * Example:
   * const unsubscribe = authManager.onAuthStateChange(
   *   ({ event, user }) => console.log(event, user)
   * );
   */
  onAuthStateChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "The authentication listener must be a function."
      );
    }

    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify registered listeners.
   */
  notifyListeners(payload) {
    for (const callback of this.listeners) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[VERIDIS Auth] Listener error:",
          error
        );
      }
    }
  }

  /**
   * Read the current access token when needed.
   *
   * Do not save a separate copy of this token in localStorage.
   */
  async getAccessToken() {
    const session = await this.getSession();

    return session?.access_token ?? null;
  }

  /**
   * Ask Supabase to refresh the session if necessary.
   *
   * Supabase normally refreshes tokens automatically.
   * This method is provided for explicit refresh requests.
   */
  async refreshSession() {
    await this.ensureInitialized();

    try {
      const {
        data,
        error
      } = await this.client.auth.refreshSession();

      if (error) {
        throw error;
      }

      this.currentSession = data.session;
      this.currentUser = data.session?.user ?? null;

      return data.session;
    } catch (error) {
      console.error(
        "[VERIDIS Auth] Session refresh failed:",
        error.message
      );

      throw new Error(
        this.getFriendlyError(error)
      );
    }
  }

  /**
   * Check whether a user has an application role.
   *
   * This only reads role information from JWT claims.
   * It does not grant permissions.
   */
  async hasRole(role) {
    const session = await this.getSession();

    if (!session || !role) {
      return false;
    }

    const claims =
      session.user?.app_metadata ?? {};

    const roles = Array.isArray(claims.roles)
      ? claims.roles
      : claims.role
        ? [claims.role]
        : [];

    return roles.includes(role);
  }

  /**
   * Translate common authentication errors.
   */
  getFriendlyError(error) {
    const message = String(
      error?.message ?? ""
    ).toLowerCase();

    if (
      message.includes("invalid login credentials")
    ) {
      return "Incorrect email or password.";
    }

    if (
      message.includes("email not confirmed")
    ) {
      return "Please verify your email before signing in.";
    }

    if (
      message.includes("user already registered")
    ) {
      return "An account with this email may already exist.";
    }

    if (
      message.includes("network") ||
      message.includes("fetch")
    ) {
      return "Connection failed. Check your internet and try again.";
    }

    if (
      message.includes("redirect") &&
      message.includes("allow")
    ) {
      return "The login redirect URL is not configured in Supabase.";
    }

    return error?.message ||
      "Authentication failed. Please try again.";
  }

  /**
   * Remove this module's event listener and subscriptions.
   */
  destroy() {
    this.authSubscription?.unsubscribe();

    this.authSubscription = null;
    this.listeners.clear();
    this.client = null;
    this.currentSession = null;
    this.currentUser = null;
    this.initialized = false;
  }
}

/**
 * Create one shared authentication manager.
 */
const authManager = new AuthManager();

/**
 * Expose the manager for existing HTML pages and scripts.
 */
if (typeof window !== "undefined") {
  window.authManager = authManager;

  window.addEventListener("DOMContentLoaded", () => {
    authManager.init().catch((error) => {
      console.error(
        "[VERIDIS Auth] Startup error:",
        error.message
      );
    });
  });
}

/**
 * Optional CommonJS export for Node-based tests.
 */
if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = {
    AuthManager,
    authManager
  };
  }
