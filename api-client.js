// API Client Module
// Handles all HTTP requests to the backend

class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
    this.timeout = 30000;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get authorization header
   */
  getAuthHeader() {
    const token = localStorage.getItem('authToken');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    return {};
  }

  /**
   * Perform HTTP request
   */
  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        ...this.headers,
        ...this.getAuthHeader()
      },
      timeout: this.timeout
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  get(endpoint) {
    return this.request('GET', endpoint);
  }

  /**
   * POST request
   */
  post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  /**
   * PUT request
   */
  put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  /**
   * DELETE request
   */
  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  // Authentication APIs
  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    return this.post('/auth/logout', {});
  }

  async refreshToken() {
    return this.post('/auth/refresh', {});
  }

  // Scan APIs
  async scanBarcode(barcodeData) {
    return this.post('/scan/barcode', { barcode: barcodeData });
  }

  async analyzeProduct(productId) {
    return this.get(`/scan/analyze/${productId}`);
  }

  async getScanHistory() {
    return this.get('/scan/history');
  }

  // Nutrition APIs
  async getNutritionData(productId) {
    return this.get(`/nutrition/${productId}`);
  }

  async searchProducts(query) {
    return this.get(`/nutrition/search?q=${encodeURIComponent(query)}`);
  }

  async getProductRecommendations() {
    return this.get('/nutrition/recommendations');
  }

  // User APIs
  async getUserProfile() {
    return this.get('/user/profile');
  }

  async updateUserProfile(userData) {
    return this.put('/user/profile', userData);
  }

  async getUserHealthVault() {
    return this.get('/user/health-vault');
  }

  async updateHealthMetrics(metrics) {
    return this.post('/user/health-metrics', metrics);
  }

  // Database APIs
  async getFormulationDatabase() {
    return this.get('/nutrition/database');
  }

  async queryFormulations(query) {
    return this.post('/nutrition/query', query);
  }
}

// Create singleton instance
const apiClient = new APIClient();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, apiClient };
}
