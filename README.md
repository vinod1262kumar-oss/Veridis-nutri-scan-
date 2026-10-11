# VERIDIS NutriScan

## Deploy on Netlify
1. Upload this ZIP to your repository by extracting it so `index.html`, `package.json`, and `netlify.toml` are at the repository root (not inside an extra nested folder).
2. In Netlify, set **Build command** to `npm run build` and **Publish directory** to `dist`.
3. Add your Supabase Project URL and **anon/publishable** key to `supabase-config.js` to enable login. Never use a Supabase `service_role` key in browser code.
4. In Supabase Authentication, enable the Google provider and add your Netlify site URL plus `/Login.html` to the allowed redirect URLs.

## Important limitations
- The build fixes the missing Vite root entry, invalid `jsonwebtoken` and `three` version ranges, nested-folder upload issue, and broken placeholder navigation behavior.
- This Netlify build is a static frontend. `server.js` is intentionally not copied into `dist`; API features such as live OCR/AI analysis need a separately deployed backend and server-side secrets.
- Google/email login cannot work until your own Supabase project is configured. The public anon/publishable key is intended for browser use with appropriate Supabase Row Level Security; never expose service-role or private API keys.
- Controls that depend on a backend display a clear message rather than pretending the action succeeded.
