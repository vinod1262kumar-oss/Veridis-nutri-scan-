(function () {
"use strict";

const config = {
url: "https://gsgdwkaoulkhmvmksawe.supabase.co",
anonKey: "sb_publishable_Ee5LElW1w8BxhrXVbFaMSA_69hcSTqd"
};

// Make the configuration available globally.
window.VERIDIS_SUPABASE_CONFIG = Object.freeze(config);

// Ensure the Supabase SDK loaded before initializing the client.
if (!window.supabase?.createClient) {
console.error(
"[VERIDIS] Supabase SDK is missing. Check the script loading order."
);
return;
}

if (!config.url || !config.anonKey ||
config.anonKey === "sb_publishable_Ee5LElW1w8BxhrXVbFaMSA_69hcSTqd") {
console.error(
"[VERIDIS] Supabase URL or publishable key is missing."
);
return;
}

try {
// Avoid creating duplicate clients.
if (!window.supabaseClient) {
window.supabaseClient = window.supabase.createClient(
config.url,
config.anonKey,
{
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true
}
}
);
}

console.info("[VERIDIS] Supabase client initialized.");

} catch (error) {
console.error(
"[VERIDIS] Supabase initialization failed:",
error.message
);
}
})();
