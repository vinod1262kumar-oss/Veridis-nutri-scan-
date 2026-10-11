// Authentication Module
// Handles user authentication, token management, and security

class AuthManager {
  constructor() {
    this.tokenKey = 'authToken';
    this.userKey = 'userProfile';
    this.expirationKey = 'tokenExpiration';
    this.refreshTokenKey = 'refreshToken';
  }

  /**
   * Store authentication token
   */
  setToken(token, expiresIn = 86400) {
    const expirationTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.expirationKey, expirationTime.toString());
  }

  /**
   * Get stored authentication token
   */
  getToken() {
    const token = localStorage.getItem(this.tokenKey);
    const expiration = localStorage.getItem(this.expirationKey);

    if (!token || !expiration) {
      return null;
    }

    // Check if token has expired
    if (Date.now() > parseInt(expiration)) {
      this.clearAuth();
      return null;
    }

    return token;
  }

  /**
   * Store refresh token
   */
  setRefreshToken(refreshToken) {
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  /**
   * Get refresh token
   */
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Store user profile
   */
  setUserProfile(userProfile) {
    localStorage.setItem(this.userKey, JSON.stringify(userProfile));
  }

  /**
   * Get stored user profile
   */
  getUserProfile() {
    const profile = localStorage.getItem(this.userKey);
    return profile ? JSON.parse(profile) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Clear all authentication data
   */
  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.expirationKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  /**
   * Decode JWT token (basic implementation)
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const decoded = JSON.parse(atob(parts[1]));
      return decoded;
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration() {
    const expiration = localStorage.getItem(this.expirationKey);
    return expiration ? new Date(parseInt(expiration)) : null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;
    return Date.now() > expiration.getTime();
  }

  /**
   * Get time until token expiration
   */
  getTimeUntilExpiration() {
    const expiration = this.getTokenExpiration();
    if (!expiration) return 0;
    
    const timeLeft = expiration.getTime() - Date.now();
    return Math.max(0, timeLeft);
  }

  /**
   * Check if token needs refresh
   */
  shouldRefreshToken() {
    const timeLeft = this.getTimeUntilExpiration();
    // Refresh if less than 5 minutes left
    return timeLeft < (5 * 60 * 1000);
  }

  /**
   * Set up auto-refresh
   */
  setupAutoRefresh(refreshCallback) {
    setInterval(() => {
      if (this.isAuthenticated() && this.shouldRefreshToken()) {
        console.log('Auto-refreshing token...');
        if (typeof refreshCallback === 'function') {
          refreshCallback();
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Validate token structure
   */
  validateToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const decoded = this.decodeToken(token);
    if (!decoded) {
      return false;
    }

    // Check required fields
    return !!(decoded.sub || decoded.id) && decoded.exp;
  }

  /**
   * Get user permissions
   */
  getUserPermissions() {
    const token = this.getToken();
    if (!token) return [];

    const decoded = this.decodeToken(token);
    return decoded?.permissions || [];
  }

  /**
   * Check user permission
   */
  hasPermission(permission) {
    const permissions = this.getUserPermissions();
    return permissions.includes(permission);
  }

  /**
   * Get user roles
   */
  getUserRoles() {
    const token = this.getToken();
    if (!token) return [];

    const decoded = this.decodeToken(token);
    return decoded?.roles || [];
  }

  /**
   * Check user role
   */
  hasRole(role) {
    const roles = this.getUserRoles();
    return roles.includes(role);
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Set up auto-refresh when page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (authManager.isAuthenticated()) {
      authManager.setupAutoRefresh(() => {
        // Refresh token logic here
        console.log('Token auto-refresh triggered');
      });
    }
  });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager };
}
