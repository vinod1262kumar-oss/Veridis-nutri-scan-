// VERIDIS NutriScan — Multipage Navigation
// Uses Supabase Auth through window.authManager.
// Intended for complete HTML pages, not HTML fragments.

(function (window, document) {
  "use strict";

  const navigationConfig = {
    brand: {
      name: "VERIDIS NutriScan",
      logo: "biotech",
      description: "Hyperspectral Nutrition Intelligence Platform"
    },

    pages: [
      {
        id: "home",
        path: "/",
        file: "/Index.html",
        label: "Home",
        title: "VERIDIS NutriScan",
        visible: true,
        requiresAuth: false
      },
      {
        id: "login",
        path: "/Login.html",
        file: "/Login.html",
        label: "Login",
        title: "VERIDIS NutriScan — Login",
        visible: true,
        requiresAuth: false
      },
      {
        id: "scanner",
        path: "/Scanner.html",
        file: "/Scanner.html",
        label: "Scanner",
        title: "VERIDIS NutriScan — Scanner",
        visible: true,
        requiresAuth: true
      },
      {
        id: "analysis",
        path: "/Analysis.html",
        file: "/Analysis.html",
        label: "Analysis",
        title: "VERIDIS NutriScan — Analysis",
        visible: true,
        requiresAuth: true
      },
      {
        id: "explanation",
        path: "/Explanation.html",
        file: "/Explanation.html",
        label: "Learn",
        title: "VERIDIS NutriScan — Learn",
        visible: true,
        requiresAuth: false
      },
      {
        id: "user",
        path: "/User.html",
        file: "/User.html",
        label: "Profile",
        title: "VERIDIS NutriScan — Profile",
        visible: true,
        requiresAuth: true
      },
      {
        id: "code",
        path: "/code.html",
        file: "/code.html",
        label: "API Docs",
        title: "VERIDIS NutriScan — API Documentation",
        visible: true,
        requiresAuth: false
      }
    ]
  };

  let navigationHistory = [];
  let navigationInitialized = false;

  function getAuthManager() {
    return window.authManager || null;
  }

  async function isUserAuthenticated() {
    const authManager = getAuthManager();

    if (!authManager) {
      console.error(
        "[VERIDIS] AuthManager unavailable. Check script loading order."
      );
      return false;
    }

    try {
      return await authManager.isAuthenticated();
    } catch (error) {
      console.error(
        "[VERIDIS] Authentication check failed:",
        error
      );
      return false;
    }
  }

  function normalizePath(path) {
    if (!path) return "/";

    const pathname = new URL(
      path,
      window.location.origin
    ).pathname;

    return pathname.length > 1
      ? pathname.replace(/\/+$/, "")
      : "/";
  }

  function findPageByPath(path) {
    const normalized = normalizePath(path);

    return navigationConfig.pages.find(
      page => normalizePath(page.path) === normalized
    ) || null;
  }

  async function navigateTo(path) {
    const url = new URL(path, window.location.origin);

    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }

    const page = findPageByPath(url.pathname);

    if (!page) {
      window.location.assign(url.href);
      return;
    }

    if (page.requiresAuth) {
      const authenticated = await isUserAuthenticated();

      if (!authenticated) {
        window.location.assign("/Login.html");
        return;
      }
    }

    if (normalizePath(window.location.pathname) ===
        normalizePath(page.file)) {
      return;
    }

    window.location.assign(page.file);
  }

  function handleNavigationClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest("a[href]");

    if (
      !link ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const url = new URL(link.href, window.location.origin);

    if (url.origin !== window.location.origin) return;

    const page = findPageByPath(url.pathname);

    if (!page) return;

    event.preventDefault();
    void navigateTo(page.path);
  }

  async function protectCurrentPage() {
    const page = findPageByPath(window.location.pathname);

    if (!page || !page.requiresAuth) return;

    const authenticated = await isUserAuthenticated();

    if (!authenticated) {
      window.location.replace("/Login.html");
    }
  }

  function initNavigation() {
    if (navigationInitialized) return;

    navigationInitialized = true;

    document.addEventListener(
      "click",
      handleNavigationClick
    );

    navigationHistory.push(
      normalizePath(window.location.pathname)
    );

    void protectCurrentPage();
  }

  function getCurrentPage() {
    return findPageByPath(window.location.pathname);
  }

  function getNavigation() {
    return navigationConfig.pages.filter(
      page => page.visible
    );
  }

  function goBack() {
    window.history.back();
  }

  async function clearAuth() {
    const authManager = getAuthManager();

    if (!authManager) {
      throw new Error("AuthManager is not available.");
    }

    await authManager.signOut();
    window.location.assign("/Login.html");
  }

  // Tokens must be managed by Supabase, not localStorage helpers.
  function setAuthToken() {
    console.warn(
      "[VERIDIS] setAuthToken() is deprecated. Use Supabase Auth."
    );
  }

  window.navigationConfig = navigationConfig;
  window.initNavigation = initNavigation;
  window.navigateTo = navigateTo;
  window.getCurrentPage = getCurrentPage;
  window.getNavigation = getNavigation;
  window.goBack = goBack;
  window.isUserAuthenticated = isUserAuthenticated;
  window.clearAuth = clearAuth;
  window.setAuthToken = setAuthToken;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initNavigation,
      { once: true }
    );
  } else {
    initNavigation();
  }
})(window, document);
