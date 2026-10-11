// VERIDIS NutriScan
// Supabase-compatible Navigation System

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
      icon: "home",
      visible: true,
      requiresAuth: false
    },
    {
      id: "login",
      path: "/login",
      file: "/Login.html",
      label: "Login",
      title: "Clinical Telemetry Portal",
      icon: "vpn_key",
      visible: true,
      requiresAuth: false
    },
    {
      id: "scanner",
      path: "/scanner",
      file: "/Scanner.html",
      label: "Scanner",
      title: "Real-time Barcode Scanner",
      icon: "qr_code_scanner",
      visible: true,
      requiresAuth: true
    },
    {
      id: "analysis",
      path: "/analysis",
      file: "/Analysis.html",
      label: "Analysis",
      title: "Molecular Analysis Dashboard",
      icon: "analytics",
      visible: true,
      requiresAuth: true
    },
    {
      id: "explanation",
      path: "/explanation",
      file: "/Explanation.html",
      label: "Learn",
      title: "Educational Hub",
      icon: "school",
      visible: true,
      requiresAuth: false
    },
    {
      id: "user",
      path: "/user-profile",
      file: "/User.html",
      label: "Profile",
      title: "User Profile & Health Vault",
      icon: "account_circle",
      visible: true,
      requiresAuth: true
    },
    {
      id: "code",
      path: "/code",
      file: "/code.html",
      label: "API Docs",
      title: "Developer API Documentation",
      icon: "code",
      visible: true,
      requiresAuth: false
    }
  ]
};

let navigationHistory = [];
let currentPage = "home";
let navigationInitialized = false;
let navigationRequestId = 0;

function getAuthManager() {
  return window.authManager || null;
}

/**
 * Check authentication through Supabase.
 */
async function isUserAuthenticated() {
  const authManager = getAuthManager();

  if (!authManager) {
    console.error("AuthManager is not available.");
    return false;
  }

  try {
    return await authManager.isAuthenticated();
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

/**
 * Initialize navigation once.
 */
function initNavigation() {
  if (typeof window === "undefined" || navigationInitialized) {
    return;
  }

  navigationInitialized = true;

  document.addEventListener("click", handleNavigationClick);

  window.addEventListener("popstate", async () => {
    await loadPageByPath(window.location.pathname, false);
  });

  window.addEventListener("veridis:auth-state-changed", async () => {
    const page = getCurrentPage();

    if (page?.requiresAuth && !(await isUserAuthenticated())) {
      navigateTo("/login");
    }
  });

  loadPageByPath(window.location.pathname, false);
}

/**
 * Intercept internal navigation links.
 */
function handleNavigationClick(event) {
  const link = event.target.closest("a[href]");

  if (!link || event.defaultPrevented) return;
  if (link.target === "_blank" || link.hasAttribute("download")) return;

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const url = new URL(link.href, window.location.origin);

  if (url.origin !== window.location.origin) return;

  const page = navigationConfig.pages.find(
    item => item.path === url.pathname
  );

  if (!page) return;

  event.preventDefault();
  navigateTo(page.path);
}

/**
 * Navigate to a registered page.
 */
async function navigateTo(path, updateHistory = true) {
  const url = new URL(path, window.location.origin);

  if (url.origin !== window.location.origin) return;

  const page = navigationConfig.pages.find(
    item => item.path === url.pathname
  );

  if (!page) {
    window.location.href = url.href;
    return;
  }

  if (page.requiresAuth && !(await isUserAuthenticated())) {
    if (updateHistory) {
      window.history.pushState(
        { page: "login" },
        "Login",
        "/login"
      );
    }

    await loadPage("login");
    return;
  }

  if (updateHistory) {
    window.history.pushState(
      { page: page.id },
      page.title,
      page.path
    );
  }

  await loadPage(page.id);
}

/**
 * Load a page from the current URL.
 */
async function loadPageByPath(path, updateHistory = false) {
  const page = navigationConfig.pages.find(
    item => item.path === path
  );

  if (!page) {
    await loadPage("home");
    return;
  }

  await navigateTo(page.path, updateHistory);
}

/**
 * Load a registered page.
 *
 * Note: This AJAX loader is only appropriate if the HTML files
 * are designed as content fragments. Complete HTML documents
 * may require normal browser navigation instead.
 */
async function loadPage(pageId) {
  const page = navigationConfig.pages.find(
    item => item.id === pageId
  );

  if (!page) {
    console.error("Page not found:", pageId);
    return;
  }

  if (page.requiresAuth && !(await isUserAuthenticated())) {
    if (window.location.pathname !== "/login") {
      window.history.replaceState(
        { page: "login" },
        "Login",
        "/login"
      );
    }

    await loadPage("login");
    return;
  }

  currentPage = page.id;

  if (
    navigationHistory[navigationHistory.length - 1] !== page.id
  ) {
    navigationHistory.push(page.id);
  }

  document.title = page.title;
  updateActiveNav(page.id);

  const container = document.getElementById("app-container");

  // If this page is a standalone HTML document, navigate normally.
  if (!container) {
    if (page.path !== window.location.pathname) {
      window.location.href = page.path;
    }

    return;
  }

  const requestId = ++navigationRequestId;

  container.style.opacity = "0";

  try {
    const response = await fetch(page.file, {
      headers: { Accept: "text/html" }
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load ${page.file}: HTTP ${response.status}`
      );
    }

    const html = await response.text();

    if (requestId !== navigationRequestId) return;

    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(
      html,
      "text/html"
    );

    container.innerHTML = parsedDocument.body.innerHTML;

    // Scripts inserted through innerHTML do not execute automatically.
    // Existing global initialization functions can be called explicitly.
    initializePageScripts(page.id);

    container.style.opacity = "1";
    window.scrollTo({ top: 0, behavior: "auto" });
  } catch (error) {
    if (requestId !== navigationRequestId) return;

    console.error("Page loading failed:", error);

    container.textContent =
      "Unable to load this page. Please refresh and try again.";

    container.style.opacity = "1";
  }
}

/**
 * Update active navigation links.
 */
function updateActiveNav(pageId) {
  document.querySelectorAll("[data-nav-link]").forEach(link => {
    const active = link.getAttribute("data-nav-link") === pageId;

    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

/**
 * Initialize scripts for the selected page.
 */
function initializePageScripts(pageId) {
  switch (pageId) {
    case "scanner":
      if (typeof window.initScanner === "function") {
        window.initScanner();
      }
      break;

    case "analysis":
      if (typeof window.initAnalysis === "function") {
        window.initAnalysis();
      }
      break;

    case "login":
      if (typeof window.initLogin === "function") {
        window.initLogin();
      }
      break;

    case "user":
      if (typeof window.initUserProfile === "function") {
        window.initUserProfile();
      }
      break;
  }
}

function getCurrentPage() {
  return navigationConfig.pages.find(
    page => page.id === currentPage
  ) || null;
}

function getNavigation() {
  return navigationConfig.pages.filter(page => page.visible);
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo("/");
  }
}

/**
 * Supabase owns authentication tokens.
 * Do not store or set auth tokens in navigation.js.
 */
function setAuthToken() {
  console.warn(
    "setAuthToken() is deprecated. Use Supabase Auth instead."
  );
}

/**
 * Clear authentication through Supabase.
 */
async function clearAuth() {
  const authManager = getAuthManager();

  if (!authManager) {
    throw new Error("AuthManager is not available.");
  }

  await authManager.signOut();
  await navigateTo("/login");
}

// Browser globals for compatibility with existing scripts.
if (typeof window !== "undefined") {
  window.navigationConfig = navigationConfig;
  window.initNavigation = initNavigation;
  window.navigateTo = navigateTo;
  window.loadPage = loadPage;
  window.getCurrentPage = getCurrentPage;
  window.getNavigation = getNavigation;
  window.goBack = goBack;
  window.isUserAuthenticated = isUserAuthenticated;
  window.clearAuth = clearAuth;
  window.setAuthToken = setAuthToken;
}

// CommonJS support.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    navigationConfig,
    initNavigation,
    navigateTo,
    loadPage,
    getCurrentPage,
    getNavigation,
    goBack,
    isUserAuthenticated,
    setAuthToken,
    clearAuth
  };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigation);
  } else {
    initNavigation();
  }
      }
