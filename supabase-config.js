/*

* VERIDIS NutriScan — Supabase Browser Configuration
* 
* Only the Supabase project URL and publishable/legacy anon key
* belong here. Never expose a service_role or secret API key.
  */

(function () {
"use strict";

const config = {
url: "https://gsgdwkaoulkhmvmksawe.supabase.co",
anonKey: "sb_publishable_Ee5LElW1w8BxhrXVbFaMSA_69hcSTqd"
};

window.VERIDIS_SUPABASE_CONFIG = Object.freeze(config);

// Compatibility aliases for code using common variable names.
window.SUPABASE_URL = config.url;
window.SUPABASE_ANON_KEY = config.anonKey;

console.info(
"[VERIDIS] Supabase configuration loaded:",
Boolean(config.url && config.anonKey)
);
})();
