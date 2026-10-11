/* Shared interaction layer for the static Netlify build. */
(() => {
  const routes = {
    overview: '/',
    'auth-login': '/Login.html',
    'live-scanner': '/Scanner.html',
    'ingredient-intel': '/Analysis.html',
    'health-vault': '/User.html',
    'clean-food-explorer': '/code.html'
  };

  function toast(message) {
    let box = document.getElementById('site-action-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'site-action-toast';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.style.cssText = 'position:fixed;z-index:99999;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(90vw,560px);padding:12px 16px;border:1px solid #00f2a5;border-radius:12px;background:#111b20;color:#e9fff5;box-shadow:0 8px 28px #0008;font:14px/1.45 system-ui,sans-serif;text-align:center;';
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.display = 'block';
    clearTimeout(window.__siteToastTimer);
    window.__siteToastTimer = setTimeout(() => { box.style.display = 'none'; }, 3600);
  }

  function labelOf(el) {
    return (el.getAttribute('aria-label') || el.title || el.innerText || el.value || el.id || 'This control').trim().replace(/\s+/g, ' ').slice(0, 100);
  }

  function go(path) {
    if (!path) return;
    if (path === '/') { window.location.href = '/'; return; }
    window.location.href = path;
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link) {
      const key = link.getAttribute('data-path');
      if (key && routes[key]) {
        event.preventDefault();
        go(routes[key]);
        return;
      }
      if (link.getAttribute('href') === '#') {
        event.preventDefault();
        toast(`${labelOf(link)} — this link has no destination configured yet.`);
        return;
      }
    }

    const button = event.target.closest('button');
    if (!button || button.disabled || button.dataset.noToast === 'true') return;
    // Existing inline/page-specific click handlers are allowed to run normally.
    if (button.hasAttribute('onclick')) return;

    const id = button.id || '';
    const label = labelOf(button);

    if (id === 'btn-browse-local' || /browse local/i.test(label)) {
      let picker = document.getElementById('veridis-local-file-picker');
      if (!picker) {
        picker = document.createElement('input');
        picker.type = 'file';
        picker.id = 'veridis-local-file-picker';
        picker.accept = 'image/*,.pdf';
        picker.hidden = true;
        picker.addEventListener('change', () => {
          if (picker.files && picker.files[0]) toast(`Selected ${picker.files[0].name}. Live OCR requires a configured analysis backend.`);
        });
        document.body.appendChild(picker);
      }
      picker.click();
      return;
    }

    if (id === 'btn-run-ocr' || /run optical ocr|deep intel|analyze barcode|analyze food|scan food/i.test(label)) {
      toast('The interface received your tap. Live food analysis is not connected to a working backend in this static deployment yet.');
      return;
    }
    if (/sign in|sign up|login|create account|biometric/i.test(label)) {
      toast('The login screen is available, but real authentication must be connected to an auth provider before accounts can work.');
      return;
    }
    if (/notification/i.test(label) || id.toLowerCase().includes('notification')) {
      toast('You are all caught up.');
      return;
    }
    if (id.startsWith('mode-') || id.startsWith('tab-') || id.startsWith('btn-period-') || button.classList.contains('filter-chip')) {
      toast(`${label} selected.`);
      return;
    }
    toast(`${label} tapped. This control needs its feature handler connected.`);
  });

  // Keep forms from appearing to silently submit to nowhere on a static site.
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.getAttribute('onsubmit')) return; // preserve existing page logic
    event.preventDefault();
    toast('Form received. A backend endpoint is required to submit or save this information.');
  });

  // Real Supabase authentication on the login page. Never fake a successful login.
  window.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.toLowerCase();
    if (!page.includes('login')) return;

    const cfg = window.VERIDIS_SUPABASE_CONFIG || {};
    const isConfigured = Boolean(
      cfg.url && cfg.anonKey &&
      cfg.url.startsWith('https://') &&
      !cfg.url.includes('PASTE_YOUR_') &&
      !cfg.anonKey.includes('PASTE_YOUR_')
    );
    let client = null;
    if (isConfigured && window.supabase?.createClient) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
      window.veridisSupabase = client;
    }

    const status = document.getElementById('auth-status-bar');
    const label = document.getElementById('submit-label');
    const googleButton = document.getElementById('google-auth-btn');
    const googleHelp = document.getElementById('google-auth-help');
    const showStatus = (message) => {
      if (status) {
        status.classList.remove('hidden');
        status.textContent = message;
      }
      if (googleHelp) googleHelp.textContent = message;
    };

    if (googleButton) {
      googleButton.addEventListener('click', async () => {
        if (!client) {
          showStatus('Google login setup required: add your Supabase Project URL and anon/publishable key in supabase-config.js, then enable Google under Supabase Authentication → Providers.');
          return;
        }
        googleButton.disabled = true;
        showStatus('Connecting securely to Google…');
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/Login.html` }
        });
        if (error) {
          googleButton.disabled = false;
          showStatus(`Google sign-in failed: ${error.message}`);
        }
      });
    }

    // Finish OAuth callback if Google has redirected back to this page.
    if (client) {
      client.auth.getSession().then(({ data, error }) => {
        if (error) showStatus(`Could not check sign-in session: ${error.message}`);
        else if (data?.session?.user) {
          const name = data.session.user.user_metadata?.full_name || data.session.user.email || 'your account';
          showStatus(`Signed in successfully as ${name}.`);
          if (label) label.textContent = 'SIGNED IN';
          setTimeout(() => { window.location.replace('/'); }, 900);
        }
      });
    }

    // Email/password login and signup use Supabase too, if configured.
    window.triggerAuth = async function () {
      if (!client) {
        showStatus('Authentication is not configured. Set the Supabase URL/key and enable the desired provider first.');
        if (label) label.textContent = 'AUTH NOT CONFIGURED';
        return;
      }
      const email = document.querySelector('input[type="email"], input[name="email"]');
      const password = document.querySelector('input[type="password"], input[name="password"]');
      if (!email?.value || !password?.value) {
        showStatus('Enter your email and password to continue.');
        return;
      }
      const signupMode = document.getElementById('tab-signup')?.classList.contains('bg-surface-container-lowest');
      if (label) label.textContent = signupMode ? 'CREATING ACCOUNT…' : 'SIGNING IN…';
      const result = signupMode
        ? await client.auth.signUp({ email: email.value.trim(), password: password.value })
        : await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      if (result.error) {
        showStatus(result.error.message);
        if (label) label.textContent = signupMode ? 'CREATE ACCOUNT' : 'SIGN IN';
        return;
      }
      showStatus(signupMode ? 'Account request submitted. Check your email if confirmation is enabled.' : 'Signed in successfully.');
      if (!signupMode && result.data?.session) setTimeout(() => window.location.replace('/'), 900);
    };

    window.simulateBiometricAuth = function () {
      showStatus('Passkey / biometric sign-in is not connected yet. Use Google or email sign-in.');
    };
  });
})();
