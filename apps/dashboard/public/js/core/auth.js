// --- CORE AUTH & IDENTITY ---
    // --- Admin API authentication ---------------------------------------------------------
    // /api/v1/admin/* requires the admin token (ADMIN_API_TOKEN, or the generated file
    // data/.secrets/admin_api_token on the server). It is kept in sessionStorage for this tab only.
    window.__youpiAdminAuth = (function () {
      const KEY = 'youpi_admin_token';
      const nativeFetch = window.fetch.bind(window);
      let pending = null;
      const injectedToken = (function () {
        try {
          const el = document.getElementById('youpiInjectedAdminToken');
          if (el && el.textContent && !el.textContent.startsWith('{{')) return el.textContent.trim();
        } catch (e) {}
        return '';
      })();

      const read = () => {
        try {
          const t = sessionStorage.getItem(KEY);
          if (t) return t;
          const userToken = localStorage.getItem('youpi_auth_token');
          if (userToken) return userToken;
          if (injectedToken) {
            sessionStorage.setItem(KEY, injectedToken);
            return injectedToken;
          }
          return '';
        } catch (e) {
          const userToken = localStorage.getItem('youpi_auth_token');
          if (userToken) return userToken;
          return injectedToken || '';
        }
      };
      const write = (t) => { try { sessionStorage.setItem(KEY, t); } catch (e) {} };
      const clear = () => { try { sessionStorage.removeItem(KEY); } catch (e) {} };

      function isProtected(url) {
        return (
          /\/api\/v1\/admin\//.test(url) ||
          /\/api\/services/.test(url) ||
          /\/api\/admin\//.test(url) ||
          /\/api\/v1\/observers\/sms/.test(url)
        ) && !/\/admin\/sms-gateway\/download-apk/.test(url);
      }

      function prompt(message) {
        if (pending) return pending;
        pending = new Promise((resolve) => {
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.85);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif';
          const box = document.createElement('form');
          box.style.cssText = 'background:#fff;color:#0f172a;border-radius:12px;padding:24px;max-width:420px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.4)';
          const title = document.createElement('h3');
          title.textContent = 'Admin token required';
          title.style.margin = '0 0 8px';
          const hint = document.createElement('p');
          hint.textContent = message || 'Enter the admin API token (ADMIN_API_TOKEN, or the contents of data/.secrets/admin_api_token on the server).';
          hint.style.cssText = 'margin:0 0 12px;font-size:14px;color:#475569';
          const input = document.createElement('input');
          input.type = 'password';
          input.autocomplete = 'off';
          input.required = true;
          input.style.cssText = 'width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:12px';
          const btn = document.createElement('button');
          btn.type = 'submit';
          btn.textContent = 'Unlock';
          btn.style.cssText = 'width:100%;padding:10px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer';
          box.append(title, hint, input, btn);
          overlay.appendChild(box);
          document.body.appendChild(overlay);
          input.focus();
          box.addEventListener('submit', (ev) => {
            ev.preventDefault();
            write(input.value.trim());
            overlay.remove();
            pending = null;
            resolve();
          });
        });
        return pending;
      }

      async function authedFetch(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (!isProtected(url)) return nativeFetch(input, init);

        const isMerchant = window.CURRENT_USER && window.CURRENT_USER.role === 'MERCHANT';

        if (!read() && !isMerchant) {
          await prompt();
          if (typeof connectAdminEventsSse === 'function') connectAdminEventsSse();
        }
        const attempt = () => {
          const headers = new Headers((init && init.headers) || (input && input.headers) || {});
          const t = read();
          if (t) headers.set('Authorization', 'Bearer ' + t);
          if (typeof currentMerchantId !== 'undefined' && currentMerchantId) {
            headers.set('x-merchant-id', currentMerchantId);
          }
          return nativeFetch(input, Object.assign({}, init, { headers }));
        };
        let res = await attempt();
        if (res.status === 401 && !isMerchant) {
          clear();
          await prompt('That token was rejected. Enter the admin API token again.');
          res = await attempt();
          if (res.ok && typeof connectAdminEventsSse === 'function') connectAdminEventsSse();
        }
        return res;
      }

      window.fetch = authedFetch;
      return { token: read, ensure: () => (read() ? Promise.resolve() : prompt()) };
    })();

    const CURRENT_USER = (function() {
      try {
        const el = document.getElementById('youpiInjectedUser');
        if (el && el.textContent && !el.textContent.startsWith('{{')) {
          return JSON.parse(el.textContent);
        }
      } catch (e) {}
      return null;
    })();

    const CURRENT_MERCHANT = (function() {
      try {
        const el = document.getElementById('youpiInjectedMerchant');
        if (el && el.textContent && !el.textContent.startsWith('{{')) {
          return JSON.parse(el.textContent);
        }
      } catch (e) {}
      return null;
    })();

    window.CURRENT_USER = CURRENT_USER;
    window.CURRENT_MERCHANT = CURRENT_MERCHANT;

    var API_BASE = "";
    var currentEnvMode = 'localhost';
    var currentDomainPrefix = 'pay';
    var currentDomainTld = '';
    var currentSellingMode = 'ONLINE';
    var currentMerchantId = (CURRENT_USER && CURRENT_USER.role === 'MERCHANT' && (CURRENT_USER.merchantId || CURRENT_MERCHANT?.id))
      ? (CURRENT_USER.merchantId || CURRENT_MERCHANT.id)
      : '00000000-0000-0000-0000-000000000001';
    var currentMerchantBranding = (CURRENT_MERCHANT && CURRENT_MERCHANT.branding) || {};
    var settingsLoaded = false;
    var pollingTimer = null;
    var waPollingTimer = null;
    var servicesLogsSse = null;
    var activeSection = 'operations';
    var activeSubTab = 'subViewOpsLive';
    var servicesList = [];

    window.API_BASE = API_BASE;
    window.currentMerchantId = currentMerchantId;
    window.activeSection = activeSection;

    // --- APPLY USER ROLE CONTEXT & UI RESTRICTIONS ---
    function applyUserRoleConfig() {
      const isMerchant = CURRENT_USER && CURRENT_USER.role === 'MERCHANT';
      if (isMerchant) {
        let style = document.getElementById('roleAdminHideStyle');
        if (!style) {
          style = document.createElement('style');
          style.id = 'roleAdminHideStyle';
          style.textContent = '.admin-only { display: none !important; }';
          document.head.appendChild(style);
        }

        const bTitle = document.getElementById('cfSidebarBrandTitle');
        if (bTitle) {
          bTitle.textContent = (CURRENT_MERCHANT && CURRENT_MERCHANT.businessName) || CURRENT_USER.name || 'Merchant Console';
        }
        const bSub = document.getElementById('cfSidebarBrandSub');
        if (bSub) {
          bSub.textContent = 'Merchant Portal';
        }

        const userDisp = document.getElementById('headerUserDisplay');
        if (userDisp) {
          userDisp.textContent = `${CURRENT_USER.name} (Merchant)`;
        }
      } else {
        const userDisp = document.getElementById('headerUserDisplay');
        if (userDisp) {
          userDisp.textContent = CURRENT_USER?.name ? `${CURRENT_USER.name} (Super Admin)` : 'Super Admin';
        }
      }
    }
    applyUserRoleConfig();

    // Helper to escape HTML safely
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }


    // --- ADMIN LIVE TOAST ---
    function showAdminToast(msg, isSuccess = true) {
      let t = document.getElementById('adminLiveToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'adminLiveToast';
        t.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:999999; padding:12px 20px; border-radius:8px; font-weight:700; font-size:13.5px; box-shadow:0 8px 24px rgba(0,0,0,0.5); display:flex; align-items:center; gap:8px; transition:all 0.25s ease; transform:translateY(100px); opacity:0; pointer-events:none;';
        document.body.appendChild(t);
      }
      t.style.background = isSuccess ? '#065f46' : '#991b1b';
      t.style.color = '#ffffff';
      t.style.border = isSuccess ? '1px solid #10b981' : '1px solid #ef4444';
      t.innerHTML = `${isSuccess ? '✓' : '⚠️'} ${escapeHtml(msg)}`;
      t.style.transform = 'translateY(0)';
      t.style.opacity = '1';
      clearTimeout(t._timer);
      t._timer = setTimeout(() => {
        t.style.transform = 'translateY(100px)';
        t.style.opacity = '0';
      }, 4000);
    }

