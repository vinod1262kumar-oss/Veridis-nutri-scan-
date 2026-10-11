// Navigation Configuration & Routing System
// This module handles multi-page navigation and routing

const navigationConfig = {
  brand: {
    name: 'VERIDIS NutriScan',
    logo: 'biotech',
    description: 'Hyperspectral Nutrition Intelligence Platform'
  },
  pages: [
    {
      id: 'home',
      path: '/',
      label: 'Home',
      title: 'VERIDIS NutriScan',
      icon: 'home',
      visible: true
    },
    {
      id: 'login',
      path: '/login',
      label: 'Login',
      title: 'Clinical Telemetry Portal',
      icon: 'vpn_key',
      visible: true,
      requiresAuth: false
    },
    {
      id: 'scanner',
      path: '/scanner',
      label: 'Scanner',
      title: 'Real-time Barcode Scanner',
      icon: 'qr_code_scanner',
      visible: true,
      requiresAuth: true
    },
    {
      id: 'analysis',
      path: '/analysis',
      label: 'Analysis',
      title: 'Molecular Analysis Dashboard',
      icon: 'analytics',
      visible: true,
      requiresAuth: true
    },
    {
      id: 'explanation',
      path: '/explanation',
      label: 'Learn',
      title: 'Educational Hub',
      icon: 'school',
      visible: true,
      requiresAuth: false
    },
    {
      id: 'user',
      path: '/user-profile',
      label: 'Profile',
      title: 'User Profile & Health Vault',
      icon: 'account_circle',
      visible: true,
      requiresAuth: true
    },
    {
      id: 'code',
      path: '/code',
      label: 'API Docs',
      title: 'Developer API Documentation',
      icon: 'code',
      visible: true,
      requiresAuth: false
    }
  ]
};

// Navigation History
let navigationHistory = [];
let currentPage = 'home';

/**
 * Initialize navigation system
 */
function initNavigation() {
  if (typeof window !== 'undefined') {
    // Set up link click handlers
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link && link.href) {
        e.preventDefault();
        navigateTo(link.href);
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        loadPage(e.state.page);
      }
    });

    // Load initial page based on current URL
    const currentPath = window.location.pathname;
    loadPageByPath(currentPath);
  }
}

/**
 * Navigate to a page by path
 */
function navigateTo(path) {
  const page = navigationConfig.pages.find(p => p.path === path);
  if (page) {
    loadPage(page.id);
    window.history.pushState({ page: page.id }, page.title, path);
  }
}

/**
 * Load page by path
 */
function loadPageByPath(path) {
  const page = navigationConfig.pages.find(p => p.path === path);
  if (page) {
    loadPage(page.id);
  } else {
    loadPage('home');
  }
}

/**
 * Load specific page
 */
function loadPage(pageId) {
  const page = navigationConfig.pages.find(p => p.id === pageId);
  
  if (!page) {
    console.error('Page not found:', pageId);
    return;
  }

  // Check authentication
  const isAuthenticated = localStorage.getItem('authToken');
  if (page.requiresAuth && !isAuthenticated) {
    navigateTo('/login');
    return;
  }

  // Update active navigation
  updateActiveNav(pageId);
  
  // Update page history
  navigationHistory.push(pageId);
  currentPage = pageId;

  // Update document title and meta
  document.title = page.title;
  
  // Update page content
  updatePageContent(page);

  // Scroll to top
  window.scrollTo(0, 0);
}

/**
 * Update active navigation indicator
 */
function updateActiveNav(pageId) {
  const navLinks = document.querySelectorAll('[data-nav-link]');
  navLinks.forEach(link => {
    if (link.getAttribute('data-nav-link') === pageId) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Update page content
 */
function updatePageContent(page) {
  const container = document.getElementById('app-container');
  
  if (container) {
    // Fade out
    container.style.opacity = '0';
    
    setTimeout(() => {
      // Fetch and insert page content
      fetch(page.file)
        .then(response => response.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const content = doc.body.innerHTML;
          container.innerHTML = content;
          
          // Re-initialize scripts on new page
          initializePageScripts(pageId);
          
          // Fade in
          container.style.opacity = '1';
        })
        .catch(error => {
          console.error('Failed to load page:', error);
          container.innerHTML = '<div class="error">Failed to load page</div>';
          container.style.opacity = '1';
        });
    }, 300);
  }
}

/**
 * Initialize page-specific scripts
 */
function initializePageScripts(pageId) {
  switch(pageId) {
    case 'scanner':
      if (typeof initScanner === 'function') {
        initScanner();
      }
      break;
    case 'analysis':
      if (typeof initAnalysis === 'function') {
        initAnalysis();
      }
      break;
    case 'login':
      if (typeof initLogin === 'function') {
        initLogin();
      }
      break;
    // Add more page-specific initializations as needed
  }
}

/**
 * Get current page info
 */
function getCurrentPage() {
  return navigationConfig.pages.find(p => p.id === currentPage);
}

/**
 * Get all navigation items
 */
function getNavigation() {
  return navigationConfig.pages.filter(p => p.visible);
}

/**
 * Go back in navigation history
 */
function goBack() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop();
    const previousPage = navigationHistory[navigationHistory.length - 1];
    const page = navigationConfig.pages.find(p => p.id === previousPage);
    if (page) {
      navigateTo(page.path);
    }
  }
}

/**
 * Check if user is authenticated
 */
function isUserAuthenticated() {
  return !!localStorage.getItem('authToken');
}

/**
 * Set authentication token
 */
function setAuthToken(token) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('tokenTimestamp', Date.now().toString());
}

/**
 * Clear authentication
 */
function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('tokenTimestamp');
  localStorage.removeItem('userProfile');
  navigateTo('/login');
}

/**
 * Export for use in modules
 */
if (typeof module !== 'undefined' && module.exports) {
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

// Initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
}
