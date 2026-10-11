// VERIDIS NutriScan
// Supabase-compatible API Client
//
// Requirements:
// 1. supabase-config.js must expose window.supabaseClient
// 2. auth.js must expose window.authManager
// 3. Supabase RLS policies must protect user data

class APIClient {
  constructor(baseURL = "") {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.timeout = 15000;

    this.headers = {
      "Content-Type": "application/json"
    };
  }

  // Get the initialized Supabase client.
  getSupabase() {
    const client = window.supabaseClient;

    if (!client) {
      throw new Error(
        "Supabase client not initialized. Check supabase-config.js."
      );
    }

    return client;
  }

  // Get the authenticated user.
  async getCurrentUser() {
    const client = this.getSupabase();

    const { data, error } = await client.auth.getUser();

    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error("Please log in to continue.");
    }

    return data.user;
  }

  // Make a request to the existing backend.
  async request(method, endpoint, data = null) {
    if (!this.baseURL) {
      throw new Error(
        "Backend URL is not configured. Use Supabase methods for database operations."
      );
    }

    const authManager = window.authManager;

    let token = null;

    if (authManager) {
      token = await authManager.getToken();
    }

    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      this.timeout
    );

    const options = {
      method,
      headers: {
        ...this.headers,
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {})
      },
      signal: controller.signal
    };

    if (data !== null && data !== undefined) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (response.status === 401) {
        throw new Error(
          "Your session may have expired. Please log in again."
        );
      }

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          `Request failed (${response.status}): ${message || response.statusText}`
        );
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }

      console.error("API request failed:", error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get(endpoint) {
    return this.request("GET", endpoint);
  }

  post(endpoint, data) {
    return this.request("POST", endpoint, data);
  }

  put(endpoint, data) {
    return this.request("PUT", endpoint, data);
  }

  delete(endpoint) {
    return this.request("DELETE", endpoint);
  }

  // ----------------------------------------
  // AUTHENTICATION
  // ----------------------------------------

  async login(email, password) {
    const client = this.getSupabase();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return data;
  }

  async register(userData) {
    const client = this.getSupabase();

    const { email, password, full_name } = userData;

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || ""
        }
      }
    });

    if (error) throw error;

    return data;
  }

  async logout() {
    const authManager = window.authManager;

    if (authManager) {
      return authManager.signOut();
    }

    const { error } = await this.getSupabase().auth.signOut();

    if (error) throw error;

    return true;
  }

  async refreshToken() {
    const { data, error } =
      await this.getSupabase().auth.refreshSession();

    if (error) throw error;

    return data.session;
  }

  // ----------------------------------------
  // FOOD SCANS
  // ----------------------------------------

  async saveFoodScan(scanData) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const record = {
      user_id: user.id,
      product_name: scanData.product_name || "Unknown product",
      nutrition_data: scanData.nutrition_data || {},
      ingredients: scanData.ingredients || [],
      health_score: scanData.health_score ?? null
    };

    const { data, error } = await client
      .from("food_scans")
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async getScanHistory() {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("food_scans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
  }

  async deleteFoodScan(scanId) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { error } = await client
      .from("food_scans")
      .delete()
      .eq("id", scanId)
      .eq("user_id", user.id);

    if (error) throw error;

    return true;
  }

  // ----------------------------------------
  // DIET PLANS
  // ----------------------------------------

  async saveDietPlan(plan) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("diet_plans")
      .insert({
        user_id: user.id,
        title: plan.title || "My Diet Plan",
        plan_data: plan
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async getDietPlans() {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("diet_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
  }

  async deleteDietPlan(planId) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { error } = await client
      .from("diet_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", user.id);

    if (error) throw error;

    return true;
  }

  // ----------------------------------------
  // USER TASKS
  // ----------------------------------------

  async createTask(task) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("user_tasks")
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description || "",
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async getTasks() {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("user_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
  }

  async updateTask(taskId, updates) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const safeUpdates = {};

    if (typeof updates.title === "string") {
      safeUpdates.title = updates.title;
    }

    if (typeof updates.description === "string") {
      safeUpdates.description = updates.description;
    }

    if (typeof updates.completed === "boolean") {
      safeUpdates.completed = updates.completed;
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new Error("No valid task updates provided.");
    }

    const { data, error } = await client
      .from("user_tasks")
      .update(safeUpdates)
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async deleteTask(taskId) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { error } = await client
      .from("user_tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) throw error;

    return true;
  }

  // ----------------------------------------
  // USER PROFILE
  // ----------------------------------------

  async getUserProfile() {
    const authManager = window.authManager;

    if (authManager) {
      return authManager.getUserProfile();
    }

    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async updateUserProfile(userData) {
    const authManager = window.authManager;

    if (!authManager) {
      throw new Error("Authentication manager is unavailable.");
    }

    return authManager.setUserProfile(userData);
  }

  // ----------------------------------------
  // HEALTH VAULT
  // ----------------------------------------

  async getUserHealthVault() {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    const { data, error } = await client
      .from("health_vault")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    return data;
  }

  async updateHealthMetrics(metrics) {
    const client = this.getSupabase();
    const user = await this.getCurrentUser();

    // Requires a health_vault table with a compatible schema.
    const { data, error } = await client
      .from("health_vault")
      .insert({
        user_id: user.id,
        metrics
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  // ----------------------------------------
  // NUTRITION / BACKEND APIs
  // ----------------------------------------

  async scanBarcode(barcodeData) {
    return this.post("/scan/barcode", {
      barcode: barcodeData
    });
  }

  async analyzeProduct(productId) {
    return this.get(
      `/scan/analyze/${encodeURIComponent(productId)}`
    );
  }

  async getNutritionData(productId) {
    return this.get(
      `/nutrition/${encodeURIComponent(productId)}`
    );
  }

  async searchProducts(query) {
    return this.get(
      `/nutrition/search?q=${encodeURIComponent(query)}`
    );
  }

  async getProductRecommendations() {
    return this.get("/nutrition/recommendations");
  }

  async getFormulationDatabase() {
    return this.get("/nutrition/database");
  }

  async queryFormulations(query) {
    return this.post("/nutrition/query", query);
  }
}

// Create singleton.
const apiClient = new APIClient();

// Browser compatibility.
if (typeof window !== "undefined") {
  window.apiClient = apiClient;
}

// CommonJS compatibility.
if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = {
    APIClient,
    apiClient
  };
  }
