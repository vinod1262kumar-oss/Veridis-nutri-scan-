(function () {
"use strict";

const config = {
url: "https://gsgdwkaoulkhmvmksawe.supabase.co",
anonKey: "sb_publishable_Ee5LElW1w8BxhrXVbFaMSA_69hcSTqd"
};

window.VERIDIS_SUPABASE_CONFIG = Object.freeze(config);

if (!window.supabase || typeof window.supabase.createClient !== "function") {
console.error(
"[VERIDIS] Supabase SDK not loaded. Check the script order."
);
return;
}

if (
!config.url ||
!config.anonKey ||
config.url.startsWith("YOUR_") ||
config.anonKey.startsWith("YOUR_")
) {
console.error(
"[VERIDIS] Supabase URL or publishable key is missing."
);
return;
}

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
})();
