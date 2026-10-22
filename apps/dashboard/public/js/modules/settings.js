// --- SETTINGS, OBSERVERS & DEV TOOLS ---
    // --- WHITE-LABEL BRANDING & SMARTPHONE PREVIEW ---
    function syncColorPickerToText(val) {
      const txt = document.getElementById('settingPrimaryColor');
      if (txt) txt.value = val;
      updateLiveWhiteLabelPreview();
    }

    function syncTextColorToPicker(val) {
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const picker = document.getElementById('settingColorPicker');
        if (picker) picker.value = val;
      }
      updateLiveWhiteLabelPreview();
    }

    function applyQuickPalette(color, theme) {
      const colIn = document.getElementById('settingPrimaryColor');
      const pickIn = document.getElementById('settingColorPicker');
      const thmIn = document.getElementById('settingHeaderTheme');
      if (colIn) colIn.value = color;
      if (pickIn) pickIn.value = color;
      if (thmIn && theme) thmIn.value = theme;
      updateLiveWhiteLabelPreview();
    }

    function adjustHexColor(col, amt) {
      if (!col) return '#0957cb';
      try {
        let usePound = false;
        if (col[0] === '#') { col = col.slice(1); usePound = true; }
        if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
        const num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
      } catch { return col; }
    }

    function updateLiveWhiteLabelPreview() {
      const bName = document.getElementById('settingBusinessName')?.value.trim() || 'Merchant Checkout';
      const appName = document.getElementById('settingAppName')?.value.trim() || 'YOUPI PG';
      const logoUrl = document.getElementById('settingLogoUrl')?.value.trim() || '';
      const primaryColor = document.getElementById('settingPrimaryColor')?.value.trim() || '#0b63e5';
      const headerTheme = document.getElementById('settingHeaderTheme')?.value || 'gradient';
      const trustBadgeText = document.getElementById('settingTrustBadgeText')?.value.trim();
      const hideTrustBadge = document.getElementById('settingHideTrustBadge')?.checked;
      const subbannerText = document.getElementById('settingSubbannerText')?.value.trim();
      const hideSubbanner = document.getElementById('settingHideSubbanner')?.checked;
      const hideTimeSavingBanner = document.getElementById('settingHideTimeSavingBanner')?.checked;
      const hidePoweredBy = document.getElementById('settingHidePoweredBy')?.checked;
      const footerGuarantee = document.getElementById('settingFooterGuarantee')?.value.trim();

      const headerEl = document.getElementById('mockupHeader');
      if (headerEl) {
        if (headerTheme === 'solid') headerEl.style.background = primaryColor;
        else if (headerTheme === 'dark') headerEl.style.background = '#0b1329';
        else {
          const darkAccent = adjustHexColor(primaryColor, -25);
          headerEl.style.background = `linear-gradient(180deg, ${primaryColor} 0%, ${darkAccent} 100%)`;
        }
      }

      const avatarLetter = document.getElementById('mockupAvatarLetter');
      const avatarImg = document.getElementById('mockupAvatarImg');
      if (logoUrl && avatarImg && avatarLetter) {
        avatarImg.src = logoUrl;
        avatarImg.style.display = 'block';
        avatarLetter.style.display = 'none';
        avatarImg.onerror = () => { avatarImg.style.display = 'none'; avatarLetter.style.display = 'block'; };
      } else if (avatarLetter && avatarImg) {
        avatarImg.style.display = 'none';
        avatarLetter.style.display = 'block';
        avatarLetter.textContent = bName.charAt(0).toUpperCase();
        avatarLetter.style.color = primaryColor;
      }

      const nameEl = document.getElementById('mockupHeaderMerchantName');
      if (nameEl) nameEl.textContent = bName;

      const trustBadgeBox = document.getElementById('mockupTrustBadge');
      const trustBadgeTextEl = document.getElementById('mockupTrustBadgeText');
      if (trustBadgeBox) {
        trustBadgeBox.style.display = hideTrustBadge ? 'none' : 'inline-flex';
        if (trustBadgeTextEl) trustBadgeTextEl.textContent = trustBadgeText || `${appName} Verified Business`;
      }

      const subbannerBox = document.getElementById('mockupSubbanner');
      const subbannerTextEl = document.getElementById('mockupSubbannerText');
      if (subbannerBox) {
        subbannerBox.style.display = hideSubbanner ? 'none' : 'flex';
        if (subbannerTextEl) subbannerTextEl.textContent = subbannerText || `Verified & Protected by ${appName}`;
      }

      const timeBanner = document.getElementById('mockupTimeSavingBanner');
      if (timeBanner) timeBanner.style.display = hideTimeSavingBanner ? 'none' : 'flex';

      const guaranteeEl = document.getElementById('mockupFooterGuarantee');
      if (guaranteeEl) {
        if (footerGuarantee) guaranteeEl.textContent = footerGuarantee;
        else if (hidePoweredBy) guaranteeEl.textContent = '100% Payment Protection & Security';
        else guaranteeEl.textContent = `100% Payment Protection by ${appName}`;
      }

      const legalEl = document.getElementById('mockupLegalDisclaimer');
      if (legalEl) {
        if (hidePoweredBy) legalEl.innerHTML = `Secured by 256-Bit Bank Encryption &bull; Privacy &amp; Terms`;
        else legalEl.innerHTML = `Secured by ${appName} &amp; 256-Bit Bank Encryption &bull; Privacy Notice`;
      }

      const ctaBtn = document.getElementById('mockupCtaButton');
      if (ctaBtn) ctaBtn.style.background = primaryColor;
    }

    // --- RECEIVING ACCOUNTS (VPAS) ---
    let currentUpiAccounts = [];
    async function fetchGatewaySettings() {
      try {
        const upiRes = await fetch(`${API_BASE}/api/v1/admin/upi-settings`);
        if (upiRes.ok) {
          const upiData = await upiRes.json();
          currentUpiAccounts = upiData.accounts || [];
          renderUpiAccountsTable(currentUpiAccounts);
          renderActiveVpaCallout(upiData);
        }

        const mRes = await fetch(`${API_BASE}/api/v1/admin/merchant-settings`);
        if (mRes.ok) {
          const mData = await mRes.json();
          currentMerchantId = mData.merchantId || currentMerchantId || '00000000-0000-0000-0000-000000000001';

          const branding = mData.branding || {};
          currentMerchantBranding = branding;

          const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val ?? '';
          };
          const setCheck = (id, checked) => {
            const el = document.getElementById(id);
            if (el) el.checked = Boolean(checked);
          };

          setVal('settingBusinessName', mData.businessName);
          setVal('settingWebhookUrl', mData.webhookUrl);
          setVal('settingWebhookSecret', mData.webhookSecret);

          setVal('settingAppName', branding.appName || 'YOUPI PG');
          setVal('settingLogoUrl', branding.logoUrl);
          setVal('settingSidebarNotice', branding.sidebarNotice);
          setVal('settingFooterGuarantee', branding.footerGuarantee);
          setVal('settingCounterInstructions', branding.counterInstructions);
          setVal('settingPrimaryColor', branding.primaryColor || '#0b63e5');
          setVal('settingColorPicker', branding.primaryColor || '#0b63e5');

          setVal('settingHeaderTheme', branding.headerTheme || 'gradient');
          setVal('settingTrustBadgeText', branding.trustBadgeText);
          setCheck('settingHideTrustBadge', branding.hideTrustBadge);
          setVal('settingSubbannerText', branding.subbannerText);
          setCheck('settingHideSubbanner', branding.hideSubbanner);
          setCheck('settingHideTimeSavingBanner', branding.hideTimeSavingBanner);
          setCheck('settingHidePoweredBy', branding.hidePoweredBy);
          setVal('settingCardCounterInstructions', branding.cardCounterInstructions);
          setVal('settingTermsUrl', branding.termsUrl);

          // Canonical Cloudflare Configuration & Environment
          const isRemoteHost = window.location.hostname && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
          currentEnvMode = isRemoteHost ? 'production' : (branding.envMode || mData.envMode || 'localhost');
          currentDomainPrefix = branding.deploymentPrefix || branding.domainPrefix || mData.deploymentPrefix || mData.domainPrefix || 'pay';
          currentDomainTld = branding.cloudflareDomain || branding.domainTld || mData.cloudflareDomain || mData.domainTld || (isRemoteHost ? window.location.hostname : '');

          setVal('settingDomainPrefix', currentDomainPrefix);
          setVal('settingDomainTld', currentDomainTld);

          setEnvMode(currentEnvMode, false);
          updateCloudflarePreview();

          // Selling Mode
          const sellingMode = mData.sellingMode || branding.sellingMode || 'ONLINE';
          setSellingMode(sellingMode, false);

          const codOn = mData.codEnabled !== undefined
            ? Boolean(mData.codEnabled)
            : (branding.codEnabled !== undefined
              ? Boolean(branding.codEnabled)
              : (branding.enabledPaymentMethods ? branding.enabledPaymentMethods.includes('COD') : false));
          const cashOn = mData.cashEnabled !== undefined ? mData.cashEnabled : (branding.cashEnabled !== undefined ? branding.cashEnabled : true);
          const cardOn = mData.cardEnabled !== undefined ? mData.cardEnabled : (branding.cardEnabled !== undefined ? branding.cardEnabled : true);

          setCheck('toggleMethodCod', codOn);
          setCheck('toggleMethodCash', cashOn);
          setCheck('toggleMethodCard', cardOn);

          const supportEmails = mData.supportEmails || branding.supportEmails || (mData.contactEmail ? [mData.contactEmail] : []);
          setVal('settingSupportEmails', Array.isArray(supportEmails) ? supportEmails.join(', ') : (supportEmails || ''));

          const supportMobiles = mData.supportMobiles || branding.supportMobiles || (mData.contactPhone ? [mData.contactPhone] : []);
          setVal('settingSupportMobiles', Array.isArray(supportMobiles) ? supportMobiles.join(', ') : (supportMobiles || ''));

          setVal('settingPrivacyPolicyUrl', mData.privacyPolicyUrl || branding.privacyPolicyUrl || '');

          updateLiveWhiteLabelPreview();
          if (typeof initDeveloperStudio === 'function') initDeveloperStudio();
        }
      } catch (e) {
        console.error('Error fetching gateway settings:', e);
      } finally {
        settingsLoaded = true;
      }
    }

    function renderActiveVpaCallout(activeData) {
      const idEl = document.getElementById('activeVpaIdDisplay');
      const payeeEl = document.getElementById('activeVpaPayeeDisplay');
      const headerVpa = document.getElementById('accountVpaDisplay');
      const sidebarVpa = document.getElementById('sidebarVpaVal');

      if (activeData && activeData.upiId && activeData.isActive) {
        if (idEl) idEl.textContent = activeData.upiId;
        if (payeeEl) payeeEl.textContent = `Payee: ${activeData.payeeName || 'Store'}`;
        if (headerVpa) headerVpa.textContent = `VPA: ${activeData.upiId}`;
        if (sidebarVpa) sidebarVpa.textContent = activeData.upiId;
      } else {
        if (idEl) idEl.textContent = 'No VPA currently active';
        if (payeeEl) payeeEl.textContent = 'Add or activate a VPA below to accept payments';
        if (headerVpa) headerVpa.textContent = 'NO ACTIVE VPA';
        if (sidebarVpa) sidebarVpa.textContent = 'None Active';
      }
    }

    function renderUpiAccountsTable(accounts) {
      const tbody = document.getElementById('upiAccountsTableBody');
      if (!tbody) return;
      if (!accounts || accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No UPI accounts saved yet. Add your first VPA above.</td></tr>';
        return;
      }

      tbody.innerHTML = accounts.map(a => {
        const statusBadge = a.isActive
          ? '<span class="badge badge-info" style="font-weight:800; font-size:0.78rem;">● ACTIVE</span>'
          : '<span class="badge badge-neutral" style="font-size:0.75rem;">Disabled</span>';

        const slotBadge = a.isSlotBusy
          ? '<span class="badge badge-warning" style="font-size:0.7rem;">Slot Busy</span>'
          : '<span style="color:var(--text-muted); font-size:0.75rem;">Available</span>';

        let actionBtns = '';
        if (!a.isActive) {
          actionBtns += `<button class="btn btn-primary" style="padding:0.35rem 0.65rem; font-size:0.78rem; margin-right:0.4rem;" onclick="activateVpa('${a.id}')">Activate</button>`;
        } else {
          actionBtns += `<button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.78rem; margin-right:0.4rem;" onclick="toggleVpa('${a.id}')">Deactivate</button>`;
        }
        actionBtns += `<button class="btn btn-danger" style="padding:0.35rem 0.65rem; font-size:0.78rem;" onclick="deleteVpa('${escapeHtml(a.id)}', '${escapeHtml(a.upiId)}')">Delete</button>`;

        return `
        <tr style="${a.isActive ? 'background:var(--primary-light);' : ''}">
          <td><strong style="color:var(--text-heading);">${escapeHtml(a.upiId)}</strong></td>
          <td>${escapeHtml(a.payeeName)}</td>
          <td>${statusBadge}</td>
          <td>${slotBadge}</td>
          <td style="font-size:0.75rem; color:var(--text-muted);">${new Date(a.createdAt).toLocaleDateString()}</td>
          <td>${actionBtns}</td>
        </tr>
      `;
      }).join('');
    }

    async function addNewUpiAccount() {
      const upiId = document.getElementById('newUpiVpa').value.trim();
      const payeeName = document.getElementById('newUpiPayee').value.trim();
      const isActive = document.getElementById('newUpiActivateNow').checked;
      if (!upiId) return alert('Please enter a valid UPI VPA.');

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/upi-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upiId, payeeName: payeeName || document.getElementById('settingBusinessName').value, isActive })
        });
        const data = await res.json();
        if (res.ok) {
          showAdminToast(`UPI account "${data.account.upiId}" added successfully!`);
          document.getElementById('newUpiVpa').value = '';
          document.getElementById('newUpiPayee').value = '';
          fetchGatewaySettings();
        } else {
          alert(data.error || 'Failed to add UPI account');
        }
      } catch (e) {
        alert('Network error adding UPI account');
      }
    }

    async function activateVpa(accountId) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/upi-accounts/${accountId}/activate`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          showAdminToast(`VPA "${data.activeAccount.upiId}" is now the active gateway VPA!`);
          fetchGatewaySettings();
        } else {
          alert(data.error || 'Failed to activate UPI account');
        }
      } catch (e) {
        alert('Network error activating UPI account');
      }
    }

    async function toggleVpa(accountId) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/upi-accounts/${accountId}/toggle`, { method: 'POST' });
        if (res.ok) fetchGatewaySettings();
      } catch (e) { }
    }

    async function deleteVpa(accountId, upiId) {
      if (!confirm(`Are you sure you want to delete VPA "${upiId}"?`)) return;
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/upi-accounts/${accountId}`, { method: 'DELETE' });
        if (res.ok) {
          showAdminToast(`VPA "${upiId}" deleted.`);
          fetchGatewaySettings();
        }
      } catch (e) { }
    }

    async function saveMerchantBrandingAndToggles() {
      settingsLoaded = true;
      const businessName = document.getElementById('settingBusinessName')?.value.trim() || '';
      const appName = document.getElementById('settingAppName')?.value.trim() || 'YOUPI PG';
      const logoUrl = document.getElementById('settingLogoUrl')?.value.trim() || '';
      const primaryColor = document.getElementById('settingPrimaryColor')?.value.trim() || '#0b63e5';
      const sidebarNotice = document.getElementById('settingSidebarNotice')?.value.trim() || (currentMerchantBranding?.sidebarNotice || '');
      const footerGuarantee = document.getElementById('settingFooterGuarantee')?.value.trim() || (currentMerchantBranding?.footerGuarantee || '');
      const counterInstructions = document.getElementById('settingCounterInstructions')?.value.trim() || '';
      const webhookUrl = document.getElementById('settingWebhookUrl')?.value.trim() || '';

      const supportEmails = (document.getElementById('settingSupportEmails')?.value || '').split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
      const supportMobiles = (document.getElementById('settingSupportMobiles')?.value || '').split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
      const privacyPolicyUrl = document.getElementById('settingPrivacyPolicyUrl')?.value.trim() || '';

      const headerTheme = document.getElementById('settingHeaderTheme')?.value || 'gradient';
      const trustBadgeText = (document.getElementById('settingTrustBadgeText')?.value || '').trim() || (currentMerchantBranding?.trustBadgeText || '');
      const hideTrustBadge = document.getElementById('settingHideTrustBadge')?.type === 'checkbox'
        ? (document.getElementById('settingHideTrustBadge')?.checked || false)
        : Boolean(currentMerchantBranding?.hideTrustBadge);
      const subbannerText = document.getElementById('settingSubbannerText')?.value.trim() || '';
      const hideSubbanner = document.getElementById('settingHideSubbanner')?.checked || false;
      const hideTimeSavingBanner = document.getElementById('settingHideTimeSavingBanner')?.checked || false;
      const hidePoweredBy = document.getElementById('settingHidePoweredBy')?.checked || false;
      const cardCounterInstructions = document.getElementById('settingCardCounterInstructions')?.value.trim() || '';
      const termsUrl = document.getElementById('settingTermsUrl')?.value.trim() || '';

      const codChecked = document.getElementById('toggleMethodCod')?.checked ?? true;
      const cashChecked = document.getElementById('toggleMethodCash')?.checked ?? true;
      const cardChecked = document.getElementById('toggleMethodCard')?.checked ?? true;

      const enabledMethods = ['UPI'];
      if (currentSellingMode === 'ONLINE') {
        if (codChecked) enabledMethods.push('COD');
      } else {
        if (cashChecked) enabledMethods.push('CASH_COUNTER');
        if (cardChecked) enabledMethods.push('CARD_COUNTER');
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/merchant-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: currentMerchantId || '00000000-0000-0000-0000-000000000001',
            businessName,
            webhookUrl,
            supportEmails,
            supportMobiles,
            privacyPolicyUrl: privacyPolicyUrl || null,
            termsUrl: termsUrl || null,
            sellingMode: currentSellingMode,
            enabledPaymentMethods: enabledMethods,
            codEnabled: codChecked,
            cashEnabled: cashChecked,
            cardEnabled: cardChecked,
            envMode: currentEnvMode,
            domainPrefix: (document.getElementById('settingDomainPrefix')?.value || 'pay').trim().toLowerCase(),
            domainTld: (document.getElementById('settingDomainTld')?.value || '').trim().toLowerCase(),
            customDomain: getCalculatedDomainUrl(),
            branding: {
              appName,
              logoUrl: logoUrl || null,
              primaryColor,
              headerTheme,
              trustBadgeText: trustBadgeText || null,
              hideTrustBadge,
              subbannerText: subbannerText || null,
              hideSubbanner,
              hideTimeSavingBanner,
              hidePoweredBy,
              sidebarNotice: sidebarNotice || null,
              footerGuarantee: footerGuarantee || null,
              counterInstructions: counterInstructions || null,
              cardCounterInstructions: cardCounterInstructions || null,
              termsUrl: termsUrl || null,
              sellingMode: currentSellingMode,
              enabledPaymentMethods: enabledMethods,
              codEnabled: codChecked,
              cashEnabled: cashChecked,
              cardEnabled: cardChecked,
              supportEmails,
              supportMobiles,
              privacyPolicyUrl: privacyPolicyUrl || null,
              envMode: currentEnvMode,
              domainPrefix: (document.getElementById('settingDomainPrefix')?.value || 'pay').trim().toLowerCase(),
              domainTld: (document.getElementById('settingDomainTld')?.value || '').trim().toLowerCase(),
              customDomain: getCalculatedDomainUrl()
            }
          })
        });
        const data = await res.json();
        if (res.ok) {
          if (data.branding) currentMerchantBranding = data.branding;
          showAdminToast('Store settings & branding saved successfully! Live on checkout.');
          updateLiveWhiteLabelPreview();
        } else {
          showAdminToast(data.error || 'Failed to save merchant settings', false);
        }
      } catch (e) {
        showAdminToast('Network error saving merchant settings.', false);
      }
    }

    // --- CANONICAL CLOUDFLARE TUNNEL ROUTING ---
    function getCalculatedDomainUrl() {
      if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
        return window.location.origin;
      }
      const prefix = (document.getElementById('settingDomainPrefix')?.value || currentDomainPrefix || 'pay').trim().toLowerCase();
      const tld = (document.getElementById('settingDomainTld')?.value || currentDomainTld || '').trim().toLowerCase();
      if (currentEnvMode === 'production' && tld) {
        return `https://${prefix}.${tld}`;
      }
      return window.location.origin || 'http://localhost:7000';
    }

    function setEnvMode(mode, save = true) {
      currentEnvMode = mode;
      const btnLoc = document.getElementById('btnEnvLocalhost');
      const btnProd = document.getElementById('btnEnvProduction');
      const badgeLoc = document.getElementById('badgeLocalhostActive');
      const badgeProd = document.getElementById('badgeProductionActive');
      const badgeDisplay = document.getElementById('envModeDisplayBadge');
      const headerBadge = document.getElementById('headerEnvBadge');
      const sidebarEnv = document.getElementById('sidebarEnvText');

      if (mode === 'production') {
        if (btnLoc) { btnLoc.style.borderColor = 'var(--border)'; btnLoc.style.background = '#f8fafc'; }
        if (btnProd) { btnProd.style.borderColor = '#16a34a'; btnProd.style.background = '#f0fdf4'; }
        if (badgeLoc) badgeLoc.style.display = 'none';
        if (badgeProd) badgeProd.style.display = 'inline-block';
        if (badgeDisplay) { badgeDisplay.textContent = '🌍 PRODUCTION MODE'; badgeDisplay.className = 'badge badge-success'; }
        if (headerBadge) { headerBadge.textContent = '🌍 PRODUCTION'; headerBadge.className = 'badge badge-success'; }
        if (sidebarEnv) sidebarEnv.textContent = 'ENV: PRODUCTION';
      } else {
        if (btnLoc) { btnLoc.style.borderColor = '#0284c7'; btnLoc.style.background = '#f0f9ff'; }
        if (btnProd) { btnProd.style.borderColor = 'var(--border)'; btnProd.style.background = '#f8fafc'; }
        if (badgeLoc) badgeLoc.style.display = 'inline-block';
        if (badgeProd) badgeProd.style.display = 'none';
        if (badgeDisplay) { badgeDisplay.textContent = '💻 LOCALHOST MODE'; badgeDisplay.className = 'badge badge-info'; }
        if (headerBadge) { headerBadge.textContent = '💻 LOCALHOST'; headerBadge.className = 'badge badge-info'; }
        if (sidebarEnv) sidebarEnv.textContent = 'ENV: LOCALHOST';
      }

      updateCloudflarePreview();
      if (save && settingsLoaded) saveDomainSettings(false);
    }

    function updateCloudflarePreview() {
      const prefix = (document.getElementById('settingDomainPrefix')?.value || currentDomainPrefix || 'pay').trim().toLowerCase();
      const tld = (document.getElementById('settingDomainTld')?.value || currentDomainTld || '').trim().toLowerCase();
      renderCloudflareRoutes(prefix, tld);
    }

    function renderCloudflareRoutes(prefix, domain) {
      const container = document.getElementById('cloudflareRoutesContainer');
      const previewPill = document.getElementById('dynamicGatewayPreviewPill');
      const instructionHost = document.getElementById('cfInstructionHost');
      const androidSyncUrl = document.getElementById('cfAndroidSyncUrl');

      const cleanDomain = (domain || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const cleanPrefix = (prefix || 'pay').trim().toLowerCase();

      let publicHost = '';
      let gatewayUrl = '';

      if (cleanDomain) {
        publicHost = cleanPrefix ? `${cleanPrefix}.${cleanDomain}` : cleanDomain;
        gatewayUrl = `https://${publicHost}`;
      } else {
        publicHost = currentEnvMode === 'production' ? 'pay.yourdomain.com' : 'localhost:7000';
        gatewayUrl = currentEnvMode === 'production' ? 'https://pay.yourdomain.com' : 'http://localhost:7000';
      }

      // 1. Update Preview Pill
      if (previewPill) previewPill.textContent = gatewayUrl;
      if (instructionHost) instructionHost.textContent = publicHost;
      if (androidSyncUrl) androidSyncUrl.textContent = gatewayUrl;

      // 2. Update Real-Time Integration Snippets
      const merchantKey = window.CURRENT_MERCHANT?.branding?.apiKey || window.CURRENT_MERCHANT?.id || 'YOUR_MERCHANT_KEY';
      
      const snippetScript = document.getElementById('snippetScriptTag');
      if (snippetScript) {
        snippetScript.textContent = `<script src="${gatewayUrl}/youpi.js" data-youpi-key="${merchantKey}"><\/script>`;
      }

      const snippetButton = document.getElementById('snippetButtonTag');
      if (snippetButton) {
        snippetButton.textContent = `<button \n  data-youpi-pay \n  data-order-id="ORDER_1001" \n  data-amount="499" \n  data-currency="INR"\n  data-customer-name="Mohit" \n  data-customer-phone="9876543210">\n  Pay ₹499 via UPI\n</button>`;
      }

      const snippetJs = document.getElementById('snippetJsApi');
      if (snippetJs) {
        snippetJs.textContent = `Youpi.pay({\n  order_id: "ORDER_1001",\n  amount: 499.00,\n  customer: {\n    name: "Mohit",\n    phone: "9876543210",\n    email: "mohit@example.com"\n  },\n  handler: function(response) {\n    console.log("Payment Confirmed! UTR:", response.utr);\n    alert("UPI Payment Verified! UTR: " + response.utr);\n  }\n});`;
      }

      // 3. Render Master Route Box
      if (!container) return;

      container.innerHTML = `
      <div style="background:#ffffff; border:1px solid var(--border); border-radius:0.75rem; padding:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.35rem;">
            <span style="font-weight:800; color:#0f172a; font-size:1.05rem;">Master Gateway Tunnel Route</span>
            <span class="badge badge-success" style="font-size:0.7rem; font-weight:700;">SINGLE PORT 7000</span>
          </div>
          <div style="font-size:0.82rem; color:#64748b; margin-bottom:0.75rem;">
            Unified entry point. Automatically routes Checkout (<code>/checkout/:id</code>), SDK (<code>/youpi.js</code>), Dashboard (<code>/dashboard</code>), and API (<code>/api/*</code>).
          </div>
          <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem;">
            <div>
              <span style="color:#64748b; font-weight:600;">Public Hostname:</span>
              <strong style="color:#0284c7; font-family:monospace; margin-left:0.35rem; font-size:0.95rem;">${escapeHtml(publicHost)}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-weight:600;">Local Service URL:</span>
              <code style="color:#0f172a; background:#f1f5f9; border:1px solid #e2e8f0; padding:2px 8px; border-radius:4px; font-family:monospace; margin-left:0.35rem; font-weight:700;">http://localhost:7000</code>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" style="font-size:0.8rem; padding:0.55rem 0.9rem;" onclick="copyText('${escapeHtml(publicHost)}', 'Public Hostname copied to clipboard!')">📋 Copy Hostname</button>
          <button class="btn btn-secondary" style="font-size:0.8rem; padding:0.55rem 0.9rem;" onclick="copyText('http://localhost:7000', 'Service URL (http://localhost:7000) copied to clipboard!')">📋 Copy Service URL</button>
        </div>
      </div>
      `;
    }

    function copySnippet(id) {
      const el = document.getElementById(id);
      if (!el) return;
      copyText(el.textContent, 'Code snippet copied to clipboard!');
    }

    function copyText(text, msg) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showAdminToast(msg || 'Copied to clipboard!');
      });
    }

    function copyAllMappings() {
      const prefix = (document.getElementById('settingDomainPrefix')?.value || currentDomainPrefix || 'pay').trim().toLowerCase();
      const tld = (document.getElementById('settingDomainTld')?.value || currentDomainTld || '').trim().toLowerCase();
      const cleanDomain = tld ? (prefix ? `${prefix}.${tld}` : tld) : 'pay.yourdomain.com';

      const text = `CLOUDFLARE TUNNEL INGRESS RULE (Single Port Master Gateway):

Public Hostname:
    ${cleanDomain}

Service URL:
    http://localhost:7000

Endpoints Unified Under This Domain:
• Universal Checkout Script: https://${cleanDomain}/youpi.js
• High-Converting Checkout:  https://${cleanDomain}/checkout/:id
• Merchant Admin & Login:    https://${cleanDomain}/login & /dashboard
• Payment & Banking API:     https://${cleanDomain}/api/v1/...
• Observer SMS Webhook:      https://${cleanDomain}/api/v1/observers/sms`;

      navigator.clipboard.writeText(text).then(() => {
        showAdminToast('Single-Port Cloudflare tunnel rule copied to clipboard!');
      }).catch(() => {
        showAdminToast('Clipboard copy failed.', false);
      });
    }

    async function saveDomainSettings(notify = true) {
      const prefix = (document.getElementById('settingDomainPrefix')?.value || 'pay').trim().toLowerCase();
      const tld = (document.getElementById('settingDomainTld')?.value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const customDomain = tld ? `https://${prefix}.${tld}` : '';

      currentDomainPrefix = prefix;
      currentDomainTld = tld;

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/merchant-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            envMode: currentEnvMode,
            domainPrefix: prefix,
            domainTld: tld,
            cloudflareDomain: tld,
            deploymentPrefix: prefix,
            customDomain,
            branding: {
              envMode: currentEnvMode,
              domainPrefix: prefix,
              domainTld: tld,
              cloudflareDomain: tld,
              deploymentPrefix: prefix,
              customDomain
            }
          })
        });
        if (res.ok && notify) {
          showAdminToast(`Cloudflare configuration saved!\nEnvironment: ${currentEnvMode.toUpperCase()}`);
          fetchGatewaySettings();
          fetchGmailCredentials();
        }
      } catch (e) {
        if (notify) showAdminToast('Failed to save Cloudflare configuration.', false);
      }
    }

    // --- CLOUDFLARE TUNNEL RUNNER ---
    async function fetchTunnelStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/tunnel/status`);
        if (!res.ok) return;
        const status = await res.json();
        renderTunnelStatus(status);
      } catch (e) { }
    }

    function renderTunnelStatus(status) {
      const badge = document.getElementById('tunnelStatusBadge');
      const pidInfo = document.getElementById('tunnelPidInfo');
      const logsEl = document.getElementById('tunnelLogsConsole');
      const btnStart = document.getElementById('btnStartTunnel');
      const btnStop = document.getElementById('btnStopTunnel');
      if (!badge) return;

      if (status.running) {
        badge.textContent = '🟢 RUNNING';
        badge.style.background = '#065f46';
        badge.style.color = '#34d399';
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'inline-flex';
        const upSec = Math.floor((status.uptimeMs || 0) / 1000);
        const upStr = upSec >= 60 ? `${Math.floor(upSec / 60)}m ${upSec % 60}s` : `${upSec}s`;
        if (pidInfo) pidInfo.textContent = `PID: ${status.pid} | Uptime: ${upStr}`;
      } else {
        badge.textContent = '⚪ STOPPED';
        badge.style.background = '#334155';
        badge.style.color = '#94a3b8';
        if (btnStart) btnStart.style.display = 'inline-flex';
        if (btnStop) btnStop.style.display = 'none';
        if (pidInfo) pidInfo.textContent = `PID: - | Uptime: -`;
      }

      if (logsEl && status.logs && status.logs.length > 0) {
        logsEl.textContent = status.logs.join('\n');
        logsEl.scrollTop = logsEl.scrollHeight;
      }
    }

    async function startTunnelFromInput() {
      const cmd = (document.getElementById('settingTunnelCommand')?.value || '').trim();
      if (!cmd) return alert('Please paste your Cloudflare tunnel command.');
      await saveTunnelSettings(cmd);
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/tunnel/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        if (!res.ok) alert(`Failed to start tunnel: ${data.error || 'Unknown error'}`);
        else {
          showAdminToast('Cloudflare Tunnel command executed!');
          fetchTunnelStatus();
        }
      } catch (e) {
        alert('Network error connecting to tunnel runner');
      }
    }

    async function stopTunnelFromInput() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/tunnel/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        showAdminToast(data.message || 'Tunnel stopped.');
        fetchTunnelStatus();
      } catch (e) {
        alert('Network error stopping tunnel');
      }
    }

    async function saveTunnelSettings(cmd) {
      try {
        await fetch(`${API_BASE}/api/v1/admin/merchant-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cloudflareTunnelCommand: cmd, branding: { cloudflareTunnelCommand: cmd } })
        });
      } catch (e) { }
    }

    // --- ANDROID SMS OBSERVER FUNCTIONS ---
    async function fetchObserversStatus() {
      fetchSmsGatewayDevices();
      fetchSmsPairQr();
      fetchGmailCredentials();
    }

    async function fetchSmsGatewayDevices() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/sms-gateway/devices`);
        if (!res.ok) return;
        const data = await res.json();
        const tbody = document.getElementById('smsDevicesTableBody');
        const badge = document.getElementById('smsGatewayBadge');
        const devBadge = document.getElementById('smsDevBadge');

        const devices = data.devices || [];
        if (badge) {
          badge.className = devices.length > 0 ? 'badge badge-success' : 'badge badge-info';
          badge.innerText = devices.length > 0 ? `${devices.length} PAIRED` : 'STANDBY';
        }
        if (devBadge) {
          devBadge.className = devices.length > 0 ? 'badge badge-success' : 'badge badge-info';
          devBadge.innerText = devices.length > 0 ? `${devices.length} PAIRED` : 'STANDBY';
        }

        if (!tbody) return;
        if (devices.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:1rem;">No devices paired yet. Scan QR above to pair.</td></tr>';
          return;
        }

        tbody.innerHTML = devices.map(d => {
          const name = d.deviceName || d.device_name || d.deviceModel || 'Android Observer';
          const id = d.deviceId || d.id || '-';
          const rawTime = d.pairedAt || d.createdAt || d.created_at;
          const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString() : 'Active';
          return `
        <tr>
          <td><strong>${escapeHtml(name)}</strong></td>
          <td><code style="font-size:0.75rem; color:#38bdf8;">${escapeHtml(id)}</code></td>
          <td><span style="font-size:0.75rem; color:var(--text-muted);">${timeStr}</span></td>
          <td>
            <button class="btn btn-danger" style="padding:0.25rem 0.6rem; font-size:0.72rem;" onclick="unpairSmsDevice('${escapeHtml(id)}')">Unpair</button>
          </td>
        </tr>
      `;
        }).join('');
      } catch (e) { }
    }

    async function fetchSmsPairQr() {
      const box = document.getElementById('smsPairQrBox');
      if (!box) return;
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/sms-gateway/pair-qr`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const qrSvg = data.pairingQrSvg || data.qrSvg;
        if (qrSvg) {
          box.innerHTML = qrSvg;
          const svgEl = box.querySelector('svg');
          if (svgEl) {
            svgEl.setAttribute('width', '100%');
            svgEl.setAttribute('height', '100%');
            svgEl.style.width = '100%';
            svgEl.style.height = '100%';
          }
        }
        const tok1 = document.getElementById('smsTokenVal');
        const tok2 = document.getElementById('smsTokenVal2');
        if (tok1 && data.enrollmentToken) tok1.textContent = data.enrollmentToken;
        if (tok2 && data.enrollmentToken) tok2.textContent = data.enrollmentToken;
      } catch (e) {
        box.innerHTML = '<span style="font-size:0.75rem; color:#ef4444;">Failed to load QR</span>';
      }
    }

    function copySmsToken() {
      const el = document.getElementById('smsTokenVal') || document.getElementById('smsTokenVal2');
      if (el && el.textContent) {
        navigator.clipboard.writeText(el.textContent.trim()).then(() => {
          showAdminToast('Pairing enrollment token copied!');
        });
      }
    }

    async function unpairSmsDevice(deviceId) {
      if (!confirm(`Are you sure you want to unpair device "${deviceId}"?`)) return;
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/sms-gateway/devices/${deviceId}`, { method: 'DELETE' });
        if (res.ok) {
          showAdminToast('Device unpaired.');
          fetchSmsGatewayDevices();
        }
      } catch (e) { }
    }

    async function sendTestBankSms() {
      const sender = (document.getElementById('testSmsSender')?.value || 'HDFCBK').trim();
      const body = (document.getElementById('testSmsBody')?.value || '').trim();
      const resBox = document.getElementById('testSmsResult');
      if (!body) return alert('Please enter SMS text.');

      if (resBox) resBox.textContent = 'Dispatching test SMS...';
      try {
        const res = await fetch(`${API_BASE}/api/v1/observers/sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender, body, timestamp: Date.now() })
        });
        const data = await res.json();
        if (resBox) {
          if (res.ok) {
            resBox.style.color = '#34d399';
            resBox.textContent = `✅ Parsed successfully! Amount: ₹${data.event?.amountPaise ? (data.event.amountPaise / 100) : 'N/A'}, Ref: ${data.event?.refId || 'N/A'}`;
          } else {
            resBox.style.color = '#f87171';
            resBox.textContent = `⚠️ Error: ${data.error || 'Failed to parse'}`;
          }
        }
      } catch (e) {
        if (resBox) { resBox.style.color = '#f87171'; resBox.textContent = 'Network error.'; }
      }
    }

    // --- GMAIL DIRECT API & AUTOMATED GOOGLE LOGIN ---
    function copyGmailRedirectUri() {
      const uri = document.getElementById('gmailRedirectUriInput')?.value || 'http://localhost:6003/oauth/callback';
      navigator.clipboard.writeText(uri).then(() => {
        showAdminToast('Redirect URI copied to clipboard!');
      });
    }

    function toggleGmailSecretVisibility() {
      const el = document.getElementById('gmailClientSecretInput');
      if (!el) return;
      el.type = el.type === 'password' ? 'text' : 'password';
    }
    window.toggleGmailSecretVisibility = toggleGmailSecretVisibility;

    let googleAuthPopup = null;
    let googleAuthPollInterval = null;

    async function startAutomatedGoogleAuth() {
      const banner = document.getElementById('gmailAuthInProgressBanner');
      if (banner) banner.style.display = 'flex';

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/gmail/oauth/start`);
        const data = await res.json();
        if (!res.ok || !data.authUrl) {
          throw new Error(data.error || 'Failed to generate Google Authorization URL');
        }

        if (!data.clientId || data.clientId.includes('your-client-id') || data.clientId.length < 20) {
          if (banner) banner.style.display = 'none';
          alert('⚠️ Google OAuth Client ID is not configured yet!\n\nPlease enter your Google OAuth Client ID and Secret under "⚙️ Advanced OAuth Credentials" below and click "Save Manual Credentials" before connecting.\n\n(Tip: If you do not want to set up Google Cloud, you can simply use the Android Companion APK or WhatsApp observer instead!)');
          return;
        }

        const w = 560;
        const h = 680;
        const left = window.screen.width ? (window.screen.width - w) / 2 : 100;
        const top = window.screen.height ? (window.screen.height - h) / 2 : 100;

        if (googleAuthPopup && !googleAuthPopup.closed) {
          googleAuthPopup.focus();
        } else {
          googleAuthPopup = window.open(
            data.authUrl,
            'youpi_google_oauth',
            `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no`
          );
        }

        const cleanup = (email) => {
          if (googleAuthPollInterval) {
            clearInterval(googleAuthPollInterval);
            googleAuthPollInterval = null;
          }
          window.removeEventListener('message', onMessage);
          window.removeEventListener('storage', onStorage);
          if (banner) banner.style.display = 'none';

          fetchGmailCredentials().then(() => {
            showAdminToast(`🎉 Google Account Connected: ${email || 'Verified'}! Live UPI observer active.`);
          });
        };

        const onMessage = (event) => {
          if (event.data && event.data.type === 'GMAIL_OAUTH_SUCCESS') {
            cleanup(event.data.email);
          }
        };
        window.addEventListener('message', onMessage);

        const onStorage = (event) => {
          if (event.key === 'youpi_gmail_oauth_result') {
            try {
              const parsed = JSON.parse(event.newValue);
              if (parsed && parsed.type === 'GMAIL_OAUTH_SUCCESS') {
                cleanup(parsed.email);
              }
            } catch (e) { }
          }
        };
        window.addEventListener('storage', onStorage);

        googleAuthPollInterval = setInterval(() => {
          if (!googleAuthPopup || googleAuthPopup.closed) {
            clearInterval(googleAuthPollInterval);
            googleAuthPollInterval = null;
            if (banner) banner.style.display = 'none';
            // Check state after popup close
            setTimeout(() => {
              fetchGmailCredentials();
            }, 800);
          }
        }, 1000);

      } catch (err) {
        if (banner) banner.style.display = 'none';
        alert('Error initiating Google Login: ' + err.message);
      }
    }

    async function disconnectGmailAccount() {
      if (!confirm('Are you sure you want to disconnect this Google Account? Automated email-based UPI verification will be paused until re-authorized.')) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/gmail/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId: currentMerchantId })
        });
        if (res.ok) {
          showAdminToast('Google Account disconnected successfully.');
          const box = document.getElementById('gmailTestResultBox');
          if (box) box.style.display = 'none';
          await fetchGmailCredentials();
        } else {
          const d = await res.json();
          alert(d.error || 'Failed to disconnect account');
        }
      } catch (e) {
        alert('Network error disconnecting Google Account');
      }
    }

    async function fetchGmailCredentials() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/gmail/credentials`);
        if (!res.ok) return;
        const data = await res.json();
        const cfg = data.gmailConfig || {};
        const isConnected = data.oauthStatus === 'CONNECTED' && Boolean(cfg.refreshToken);

        // Manual configuration inputs inside collapsible
        if (document.getElementById('gmailClientIdInput')) document.getElementById('gmailClientIdInput').value = cfg.clientId || data.clientId || '';
        if (document.getElementById('gmailClientSecretInput')) document.getElementById('gmailClientSecretInput').value = cfg.clientSecret || data.clientSecret || '';
        if (document.getElementById('gmailRefreshTokenInput')) document.getElementById('gmailRefreshTokenInput').value = cfg.refreshToken || '';

        const redirectUri = data.redirectUri || 'http://localhost:6003/oauth/callback';
        if (document.getElementById('gmailRedirectUriInput')) document.getElementById('gmailRedirectUriInput').value = redirectUri;
        if (document.getElementById('guideProdUri')) document.getElementById('guideProdUri').textContent = redirectUri;

        // Status badges
        const badge1 = document.getElementById('gmailConfigBadge');
        const badge2 = document.getElementById('gmailConfigBadge2');
        [badge1, badge2].forEach(b => {
          if (b) {
            b.className = isConnected ? 'badge badge-success' : 'badge badge-info';
            b.innerText = isConnected ? 'CONFIGURED' : 'NOT CONFIGURED';
          }
        });

        // Hero Box Dynamic State
        const heroDot = document.getElementById('gmailHeroStatusDot');
        const heroTitle = document.getElementById('gmailHeroStatusTitle');
        const heroDesc = document.getElementById('gmailHeroStatusDesc');
        const authBtnLabel = document.getElementById('btnGooglePrimaryAuthLabel');
        const disconnectBtn = document.getElementById('btnGoogleDisconnect');
        const connectedEmail = data.connectedEmail || cfg.connectedEmail || null;

        if (isConnected) {
          if (heroDot) heroDot.style.background = '#10b981';
          if (heroTitle) heroTitle.textContent = 'Google Account Connected & Active';
          if (heroDesc) {
            heroDesc.innerHTML = `✅ Authenticated as <strong style="color:#38bdf8; font-family:monospace;">${escapeHtml(connectedEmail || 'Authorized Account')}</strong>. Zero-delay mailbox polling active for incoming UPI payment notifications.`;
          }
          if (authBtnLabel) authBtnLabel.textContent = '🔄 Re-authorize Account';
          if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
        } else {
          if (heroDot) heroDot.style.background = '#ef4444';
          if (heroTitle) heroTitle.textContent = 'Google Account Disconnected';
          if (heroDesc) {
            heroDesc.textContent = 'Connect your bank-registered Google account with one click. When you click authorize, YouPI PG handles the full OAuth flow, acquires persistent offline credentials, and activates 1-second UPI credit polling.';
          }
          if (authBtnLabel) authBtnLabel.textContent = 'Connect with Google (One-Click)';
          if (disconnectBtn) disconnectBtn.style.display = 'none';
        }

        // Detailed Status Grid
        if (document.getElementById('gmailOAuthStatusText')) {
          document.getElementById('gmailOAuthStatusText').textContent = isConnected ? 'CONNECTED' : 'DISCONNECTED';
          document.getElementById('gmailOAuthStatusText').style.color = isConnected ? '#34d399' : '#f87171';
        }
        if (document.getElementById('gmailTokenStatusText')) {
          document.getElementById('gmailTokenStatusText').textContent = isConnected ? 'ACTIVE (OFFLINE READY)' : 'NOT CONFIGURED';
          document.getElementById('gmailTokenStatusText').style.color = isConnected ? '#34d399' : '#64748b';
        }
        if (document.getElementById('gmailConnectedAccountText')) {
          document.getElementById('gmailConnectedAccountText').textContent = connectedEmail || 'No account authorized';
          document.getElementById('gmailConnectedAccountText').style.color = isConnected ? '#38bdf8' : '#94a3b8';
        }
        if (document.getElementById('gmailLastPollText')) {
          document.getElementById('gmailLastPollText').textContent = data.lastTestedAt ? new Date(data.lastTestedAt).toLocaleTimeString() : (isConnected ? 'Active' : 'Never');
        }
        if (document.getElementById('gmailLastSentText')) {
          document.getElementById('gmailLastSentText').textContent = isConnected ? 'Active (Live Ingestion)' : 'Standby';
          document.getElementById('gmailLastSentText').style.color = isConnected ? '#34d399' : '#94a3b8';
        }
      } catch (e) { }
    }

    async function saveGmailCredentials() {
      const clientId = document.getElementById('gmailClientIdInput')?.value.trim() || '';
      const clientSecret = document.getElementById('gmailClientSecretInput')?.value.trim() || '';
      const refreshToken = document.getElementById('gmailRefreshTokenInput')?.value.trim() || '';

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/gmail/credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, clientSecret, refreshToken, merchantId: currentMerchantId })
        });
        if (res.ok) {
          showAdminToast('Gmail API credentials saved successfully!');
          fetchGmailCredentials();
        } else {
          const d = await res.json();
          alert(d.error || 'Failed to save Gmail credentials');
        }
      } catch (e) {
        alert('Network error saving Gmail credentials');
      }
    }

    async function testGmailConnection() {
      const clientId = document.getElementById('gmailClientIdInput')?.value.trim() || '';
      const clientSecret = document.getElementById('gmailClientSecretInput')?.value.trim() || '';
      const refreshToken = document.getElementById('gmailRefreshTokenInput')?.value.trim() || '';
      const box = document.getElementById('gmailTestResultBox');

      if (box) {
        box.style.display = 'block';
        box.style.background = '#0f172a';
        box.style.border = '1px solid #1e293b';
        box.style.color = '#38bdf8';
        box.textContent = '⏳ Testing live Google API connection & mailbox indexing...';
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/gmail/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, clientSecret, refreshToken, merchantId: currentMerchantId })
        });
        const data = await res.json();
        if (box) {
          if (res.ok && data.success) {
            box.style.background = 'rgba(16, 185, 129, 0.1)';
            box.style.border = '1px solid #059669';
            box.style.color = '#34d399';
            box.innerHTML = `
            <div style="font-weight:700; margin-bottom:0.35rem; color:#34d399;">✅ GOOGLE API VERIFICATION SUCCESSFUL</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.25rem; font-size:0.78rem; font-family:monospace;">
              <div><strong>AUTHENTICATED:</strong> <span style="color:#10b981;">YES</span></div>
              <div><strong>ACCOUNT:</strong> ${escapeHtml(data.emailAddress || 'Authorized')}</div>
              <div><strong>LAST POLL:</strong> ${new Date(data.lastPoll || Date.now()).toLocaleTimeString()}</div>
              <div><strong>MAILBOX INDEX:</strong> ${escapeHtml(data.lastMessageFetched || 'Mailbox active')}</div>
              <div style="grid-column: span 2;"><strong>STATUS:</strong> <span style="color:#10b981;">100% OPERATIONAL • INCOMING UPI NOTIFICATIONS MONITORED</span></div>
            </div>
          `;
            fetchGmailCredentials();
          } else {
            box.style.background = 'rgba(239, 68, 68, 0.1)';
            box.style.border = '1px solid #dc2626';
            box.style.color = '#f87171';
            box.innerHTML = `⚠️ <strong>Connection Test Notice:</strong> ${escapeHtml(data.error || 'Token expired or invalid. Please click Connect with Google to re-authorize.')}`;
          }
        }
      } catch (e) {
        if (box) {
          box.style.background = 'rgba(239, 68, 68, 0.1)';
          box.style.border = '1px solid #dc2626';
          box.style.color = '#f87171';
          box.textContent = 'Network error testing Gmail connection: ' + e.message;
        }
      }
    }

    function openGmailGuideModal() { document.getElementById('gmailGuideModal').hidden = false; }
    function closeGmailGuideModal() { document.getElementById('gmailGuideModal').hidden = true; }

    // --- WHATSAPP BERRY PROTOCOL ---
    async function fetchWhatsAppStatus(isManual = false) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/whatsapp/status`);
        if (!res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('waHeaderBadge');
        const dot = document.getElementById('waDotIndicator');
        const title = document.getElementById('waStateTitle');
        const phoneDisplay = document.getElementById('waPhoneDisplay');
        const qrBox = document.getElementById('waQrBox');
        const qrImg = document.getElementById('waQrImg');
        const qrPlaceholder = document.getElementById('waQrPlaceholder');
        const btnDisconnect = document.getElementById('btnWaDisconnect');
        const btnConnect = document.getElementById('btnWaConnect');

        if (data.status === 'CONNECTED') {
          if (badge) { badge.className = 'badge badge-success'; badge.innerText = 'CONNECTED'; }
          if (dot) dot.style.color = '#10b981';
          if (title) title.innerText = 'WhatsApp Connected & Active';
          if (phoneDisplay) phoneDisplay.innerHTML = `Linked Phone: <strong style="color:#34d399;">${data.phoneNumber || 'Linked Device'}</strong>`;
          if (qrBox) qrBox.style.display = 'none';
          if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
          if (btnConnect) btnConnect.innerText = '🔄 Re-Pair Device';
        } else if (data.status === 'QR_READY') {
          if (badge) { badge.className = 'badge badge-warning'; badge.innerText = 'QR READY'; }
          if (dot) dot.style.color = '#fbbf24';
          if (title) title.innerText = 'Scan QR Code with WhatsApp';
          if (phoneDisplay) phoneDisplay.innerText = 'Awaiting pairing scan from merchant WhatsApp handset';
          if (qrBox) qrBox.style.display = 'inline-block';
          if (btnDisconnect) btnDisconnect.style.display = 'none';
          if (btnConnect) btnConnect.innerText = '🔄 Refresh QR Code';

          if (data.qrCode && qrImg && qrPlaceholder) {
            let qrSrc = data.qrCode;
            if (typeof qrSrc === 'string' && !qrSrc.startsWith('data:image/') && !qrSrc.startsWith('http')) {
              if (qrSrc.startsWith('<svg')) {
                qrSrc = 'data:image/svg+xml;utf8,' + encodeURIComponent(qrSrc);
              }
            }

            if (qrSrc && (qrSrc.startsWith('data:image/') || qrSrc.startsWith('http'))) {
              qrImg.src = qrSrc;
              qrImg.style.display = 'block';
              qrPlaceholder.style.display = 'none';
            } else {
              qrImg.style.display = 'none';
              qrPlaceholder.style.display = 'flex';
              qrPlaceholder.innerText = 'Preparing pairing QR... Click "Refresh QR Code"';
            }
          }
        } else if (data.status === 'CONNECTING') {
          if (badge) { badge.className = 'badge badge-info'; badge.innerText = 'CONNECTING'; }
          if (dot) dot.style.color = '#38bdf8';
          if (title) title.innerText = 'Connecting to WhatsApp...';
          if (phoneDisplay) phoneDisplay.innerText = 'Establishing secure WhatsApp pairing session...';
          if (qrBox) qrBox.style.display = 'inline-block';
          if (qrImg) qrImg.style.display = 'none';
          if (qrPlaceholder) {
            qrPlaceholder.style.display = 'flex';
            qrPlaceholder.innerText = 'Generating official WhatsApp pairing QR...';
          }
          if (btnDisconnect) btnDisconnect.style.display = 'none';
          if (btnConnect) btnConnect.innerText = '⏳ Connecting...';
        } else {
          if (badge) { badge.className = 'badge badge-danger'; badge.innerText = 'DISCONNECTED'; }
          if (dot) dot.style.color = '#ef4444';
          if (title) title.innerText = 'Session Disconnected';
          if (phoneDisplay) phoneDisplay.innerText = 'No WhatsApp session active';
          if (qrBox) qrBox.style.display = 'inline-block';
          if (qrImg) qrImg.style.display = 'none';
          if (qrPlaceholder) {
            qrPlaceholder.style.display = 'flex';
            qrPlaceholder.innerText = 'Click "Connect WhatsApp" to pair device';
          }
          if (btnDisconnect) btnDisconnect.style.display = 'none';
          if (btnConnect) btnConnect.innerText = '⚡ Connect WhatsApp';
        }

        if (isManual) showAdminToast('WhatsApp session status: ' + data.status);
      } catch (e) { }
    }

    async function reconnectWhatsApp() {
      const btn = document.getElementById('btnWaConnect');
      const oldText = btn.innerText;
      btn.disabled = true;
      btn.innerText = '⏳ Initializing Pairing...';

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/whatsapp/reconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        await fetchWhatsAppStatus();
      } catch (e) {
        alert('Network error initiating WhatsApp pairing');
      } finally {
        btn.disabled = false;
        btn.innerText = oldText;
      }
    }

    async function disconnectWhatsApp() {
      if (!confirm('Disconnect WhatsApp session and wipe credentials?')) return;
      try {
        await fetch(`${API_BASE}/api/v1/admin/whatsapp/disconnect`, { method: 'POST' });
        await fetchWhatsAppStatus();
        showAdminToast('WhatsApp session disconnected.');
      } catch (e) { }
    }


    // --- DEVELOPER SETTINGS: FALSE NARRATIVE LOGIC (AUTO-EXPIRES IN 10 MINUTES) ---
    let falseNarrativeExpiry = null;
    let falseNarrativeTimer = null;
    let currentFalseNarrativeMode = 'OFF';

    async function fetchFalseNarrativeStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/false-narrative`);
        if (res.ok) {
          const data = await res.json();
          updateFalseNarrativeUI(data.enabled, data.falseNarrativeUntil, data.narrative || data.mode);
        }
      } catch (e) {
        console.warn('fetchFalseNarrativeStatus error:', e);
      }
    }

    function updateFalseNarrativeUI(isEnabled, untilTimestamp, mode = 'GREEN') {
      const badge = document.getElementById('falseNarrativeBadge');
      const wrap = document.getElementById('falseNarrativeCountdownWrap');
      const timerVal = document.getElementById('falseNarrativeTimerVal');

      if (falseNarrativeTimer) {
        clearInterval(falseNarrativeTimer);
        falseNarrativeTimer = null;
      }

      const now = Date.now();
      const isActive = Boolean(isEnabled && untilTimestamp && Number(untilTimestamp) > now);
      currentFalseNarrativeMode = isActive ? (mode || 'GREEN').toUpperCase() : 'OFF';

      const btnG = document.getElementById('btnNarrativeGreen');
      const btnY = document.getElementById('btnNarrativeYellow');
      const btnR = document.getElementById('btnNarrativeRed');
      const btnOff = document.getElementById('btnNarrativeOff');

      [btnG, btnY, btnR, btnOff].forEach(b => { if (b) { b.style.outline = 'none'; b.style.transform = ''; } });

      if (isActive) {
        falseNarrativeExpiry = Number(untilTimestamp);
        if (wrap) wrap.style.display = 'inline-block';

        if (currentFalseNarrativeMode === 'GREEN' && btnG) {
          btnG.style.outline = '2px solid #34d399';
          btnG.style.transform = 'scale(1.05)';
        } else if (currentFalseNarrativeMode === 'YELLOW' && btnY) {
          btnY.style.outline = '2px solid #fbbf24';
          btnY.style.transform = 'scale(1.05)';
        } else if (currentFalseNarrativeMode === 'RED' && btnR) {
          btnR.style.outline = '2px solid #f87171';
          btnR.style.transform = 'scale(1.05)';
        }

        const updateTimer = () => {
          const remMs = falseNarrativeExpiry - Date.now();
          if (remMs <= 0) {
            clearInterval(falseNarrativeTimer);
            falseNarrativeTimer = null;
            updateFalseNarrativeUI(false, null, 'OFF');
            showAdminToast('False narrative 10-minute window elapsed. Automatically reverted to live server status.');
            return;
          }
          const remSec = Math.floor(remMs / 1000);
          const m = String(Math.floor(remSec / 60)).padStart(2, '0');
          const s = String(remSec % 60).padStart(2, '0');
          const timeStr = `${m}:${s}`;
          if (timerVal) timerVal.textContent = timeStr;
          if (badge) {
            if (currentFalseNarrativeMode === 'GREEN') {
              badge.className = 'badge badge-success';
              badge.textContent = `🟢 GREEN (WORKING) · EXPIRES IN ${timeStr}`;
            } else if (currentFalseNarrativeMode === 'YELLOW') {
              badge.className = 'badge badge-warning';
              badge.textContent = `🟡 YELLOW (EXTRA PROCESSING) · EXPIRES IN ${timeStr}`;
            } else {
              badge.className = 'badge badge-danger';
              badge.textContent = `🔴 RED (DOWN) · EXPIRES IN ${timeStr}`;
            }
          }
        };

        updateTimer();
        falseNarrativeTimer = setInterval(updateTimer, 1000);
      } else {
        falseNarrativeExpiry = null;
        if (wrap) wrap.style.display = 'none';
        if (btnOff) {
          btnOff.style.outline = '2px solid #94a3b8';
        }
        if (badge) {
          badge.className = 'badge badge-info';
          badge.textContent = '⚪ OFF · REAL SERVER STATUS';
        }
      }
    }

    async function handleFalseNarrativeSelect(mode) {
      const isEnabling = mode !== 'OFF';
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/false-narrative`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: isEnabling, narrative: mode, mode })
        });
        if (res.ok) {
          const data = await res.json();
          updateFalseNarrativeUI(data.enabled, data.falseNarrativeUntil, data.narrative || data.mode);
          if (isEnabling) {
            const desc = mode === 'GREEN'
              ? 'Green (Server Is Working)'
              : (mode === 'YELLOW' ? 'Yellow (Extra processing seconds)' : 'Red (Server Facing Issues)');
            showAdminToast(`False narrative enabled for 10 minutes: ${desc}`);
          } else {
            showAdminToast('False narrative turned off. Reverted to live server status.');
          }
        } else {
          showAdminToast('Failed to update false narrative state', 'error');
          fetchFalseNarrativeStatus();
        }
      } catch (e) {
        showAdminToast('Network error updating false narrative', 'error');
        fetchFalseNarrativeStatus();
      }
    }

    async function handleFalseNarrativeToggle(checked) {
      return handleFalseNarrativeSelect(checked ? 'GREEN' : 'OFF');
    }

    // --- DEVELOPER SETTINGS: TEST MODE (10-MINUTE SERVER-ENFORCED AUTO-EXPIRY & INJECTION) ---
    let testModeExpiry = null;
    let testModeTimer = null;

    function openTestModeModal() {
      const modal = document.getElementById('modalEnableTestMode');
      if (modal) modal.style.display = 'flex';
    }

    function closeTestModeModal() {
      const modal = document.getElementById('modalEnableTestMode');
      if (modal) modal.style.display = 'none';
      const sw = document.getElementById('toggleTestModeSwitch');
      if (sw) sw.checked = Boolean(testModeExpiry && testModeExpiry > Date.now());
    }

    function confirmEnableTestMode() {
      closeTestModeModal();
      setTestMode(true);
    }

    function handleTestModeToggle(checkbox) {
      if (checkbox.checked) {
        // Require explicit confirmation before enabling (Section 11J)
        checkbox.checked = false;
        openTestModeModal();
      } else {
        setTestMode(false);
      }
    }

    async function setTestMode(enabled) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/test-mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        if (res.ok) {
          const data = await res.json();
          updateTestModeUI(data.enabled, data.testModeUntil, data.remainingSeconds);
          showAdminToast(enabled
            ? '🧪 Test Mode Enabled (10-minute window). Automatic banning is disabled.'
            : 'Test Mode disabled. Automatic ban system restored.');
        } else {
          showAdminToast('Failed to update Test Mode state', false);
          fetchTestModeStatus();
        }
      } catch (e) {
        showAdminToast('Network error updating Test Mode', false);
        fetchTestModeStatus();
      }
    }

    async function fetchTestModeStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/test-mode`);
        if (res.ok) {
          const data = await res.json();
          updateTestModeUI(data.enabled, data.testModeUntil, data.remainingSeconds);
        }
      } catch (e) {
        console.warn('fetchTestModeStatus error:', e);
      }
    }

    function updateTestModeUI(isEnabled, untilTimestamp, remSec) {
      const sw = document.getElementById('toggleTestModeSwitch');
      const badge = document.getElementById('testModeBadge');
      const wrap = document.getElementById('testModeCountdownWrap');
      const timerVal = document.getElementById('testModeTimerVal');
      const label = document.getElementById('testModeLabelText');
      const banner = document.getElementById('testModeActiveBanner');
      const section = document.getElementById('sectionTestObservation');
      const banText = document.getElementById('testModeBanStatusText');

      if (testModeTimer) {
        clearInterval(testModeTimer);
        testModeTimer = null;
      }

      const now = Date.now();
      const isActive = Boolean(isEnabled && untilTimestamp && Number(untilTimestamp) > now);

      if (sw) sw.checked = isActive;
      if (label) label.textContent = isActive ? 'Active (Testing)' : 'Test Mode';

      if (isActive) {
        testModeExpiry = Number(untilTimestamp);
        if (wrap) wrap.style.display = 'inline-block';
        if (banner) banner.style.display = 'block';
        if (section) section.style.display = 'block';
        if (banText) {
          banText.innerHTML = '🛡️ Automatic Ban System: <strong style="color:#ef4444;">DISABLED (Test Mode Active)</strong>';
        }

        const updateTimer = () => {
          const remMs = testModeExpiry - Date.now();
          if (remMs <= 0) {
            clearInterval(testModeTimer);
            testModeTimer = null;
            updateTestModeUI(false, null, 0);
            showAdminToast('Test Mode 10-minute window elapsed. Test Mode = OFF. Automatic ban system restored.');
            return;
          }
          const rem = Math.floor(remMs / 1000);
          const m = String(Math.floor(rem / 60)).padStart(2, '0');
          const s = String(rem % 60).padStart(2, '0');
          const timeStr = `${m}:${s}`;
          if (timerVal) timerVal.textContent = timeStr;
          if (badge) {
            badge.style.background = '#b45309';
            badge.style.color = '#fef3c7';
            badge.textContent = `🔴 [ ON ] TEST MODE (${timeStr})`;
          }
        };

        updateTimer();
        testModeTimer = setInterval(updateTimer, 1000);
        fetchTestModeAuditLog();
      } else {
        testModeExpiry = null;
        if (wrap) wrap.style.display = 'none';
        if (banner) banner.style.display = 'none';
        if (section) section.style.display = 'none';
        if (badge) {
          badge.style.background = '#334155';
          badge.style.color = '#94a3b8';
          badge.textContent = '[ OFF ] Test Mode';
        }
        if (banText) {
          banText.innerHTML = '🛡️ Automatic Ban System: <strong style="color:#22c55e;">ENABLED (Normal)</strong>';
        }
      }
    }

    function handleTestTimestampChange(val) {
      const customInput = document.getElementById('inputCustomTimestamp');
      if (customInput) {
        customInput.style.display = (val === 'CUSTOM') ? 'inline-block' : 'none';
        if (val === 'CUSTOM' && !customInput.value) {
          customInput.value = new Date().toISOString();
        }
      }
    }

    function generateFakeSmsTemplate() {
      const smsInput = document.getElementById('inputTestSmsMessage');
      const senderInput = document.getElementById('inputTestSmsSender');
      if (senderInput) senderInput.value = 'VM-HDFCBK';
      if (smsInput) {
        const randomRef = '123' + Math.floor(100000000 + Math.random() * 900000000);
        smsInput.value = `A/C XX1234 credited by Rs 499.00 CR. Ref ${randomRef}.`;
      }
      showAdminToast('Generated standard valid Indian Bank SMS template');
    }

    function generateFakeGmailTemplate() {
      const gmailInput = document.getElementById('inputTestGmailMessage');
      const senderInput = document.getElementById('inputTestGmailSender');
      if (senderInput) senderInput.value = 'alerts@hdfc.bank.in';
      if (gmailInput) {
        const randomRef = '123' + Math.floor(100000000 + Math.random() * 900000000);
        gmailInput.value = `Dear Customer, your account has been credited with INR 499.00 via UPI. UPI Ref No: ${randomRef}.`;
      }
      showAdminToast('Generated standard valid Indian Bank Gmail template');
    }

    async function injectTestMessage(channel) {
      const isSms = channel === 'SMS';
      const textElem = document.getElementById(isSms ? 'inputTestSmsMessage' : 'inputTestGmailMessage');
      const senderElem = document.getElementById(isSms ? 'inputTestSmsSender' : 'inputTestGmailSender');
      const timeControl = document.getElementById('selectTestTimestampControl');
      const customTimeInput = document.getElementById('inputCustomTimestamp');

      const raw = (textElem?.value || '').trim();
      if (!raw) {
        showAdminToast(`Please enter test ${channel} message content first`, false);
        return;
      }

      const sender = senderElem?.value?.trim() || (isSms ? 'VM-HDFCBK' : 'alerts@hdfc.bank.in');

      let receivedAt = new Date().toISOString();
      const mode = timeControl?.value || 'CURRENT';
      if (mode === 'BEFORE_SESSION') {
        receivedAt = new Date(Date.now() - 300000).toISOString(); // 5 minutes in past
      } else if (mode === 'AFTER_EXPIRY') {
        receivedAt = new Date(Date.now() + 1800000).toISOString(); // 30 minutes in future
      } else if (mode === 'CUSTOM' && customTimeInput?.value) {
        receivedAt = customTimeInput.value.trim();
      }

      const btn = document.getElementById(isSms ? 'btnInjectSms' : 'btnInjectGmail');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/test-mode/inject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: channel,
            message: raw,
            sender,
            receivedAt
          })
        });

        const data = await res.json();
        if (res.status === 403) {
          showAdminToast(data.error || 'Test Mode has expired. Injections blocked.', false);
          fetchTestModeStatus();
          return;
        }

        displayTestResults(data);
        fetchTestModeAuditLog();

        if (data.status === 'VERIFIED') {
          showAdminToast(`Observation VERIFIED! Attributed to Order #${data.session?.orderId || 'Active'}`);
        } else if (data.status === 'REJECTED' && (data.reason === 'FRAUDULENT_PAYMENT_INJECTION' || data.failingCondition === 'FRAUDULENT_PAYMENT_INJECTION' || data.stages?.stage5?.reason === 'FRAUDULENT_PAYMENT_INJECTION')) {
          showAdminToast('🚨 FRAUD DETECTED! Customer automatically BANNED and session terminated.', false);
          if (typeof fetchBannedUsers === 'function') fetchBannedUsers();
        } else if (data.status === 'SUSPICIOUS') {
          showAdminToast('Observation flagged as SUSPICIOUS!', false);
        } else {
          showAdminToast(`Observation REJECTED: ${data.reason || 'Verification failed'}`, false);
        }
      } catch (e) {
        showAdminToast(`Error injecting test message: ${e.message}`, false);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    function displayTestResults(res) {
      const container = document.getElementById('testResultContainer');
      if (!container) return;
      container.style.display = 'block';

      const badge = document.getElementById('testResultStatusBadge');
      const meta = document.getElementById('testResultMeta');
      const sourceElem = document.getElementById('testResultSource');
      const amountElem = document.getElementById('testResultAmount');
      const refElem = document.getElementById('testResultRef');
      const reasonElem = document.getElementById('testResultReason');
      const stagesList = document.getElementById('testResultStagesList');

      const isFraudBan = res.reason === 'FRAUDULENT_PAYMENT_INJECTION' ||
        res.failingCondition === 'FRAUDULENT_PAYMENT_INJECTION' ||
        res.stages?.stage5?.autoBanApplied ||
        res.stages?.stage5?.reason === 'FRAUDULENT_PAYMENT_INJECTION';

      if (badge) {
        badge.textContent = isFraudBan ? 'FRAUD BANNED' : res.status;
        if (res.status === 'VERIFIED') {
          badge.className = 'badge badge-success';
          badge.style.background = '#059669';
        } else if (isFraudBan) {
          badge.className = 'badge badge-danger';
          badge.style.background = '#dc2626';
        } else if (res.status === 'SUSPICIOUS') {
          badge.className = 'badge badge-warning';
          badge.style.background = '#d97706';
        } else {
          badge.className = 'badge badge-danger';
          badge.style.background = '#dc2626';
        }
      }

      if (meta) {
        meta.textContent = `ID: ${res.messageId || 'TEST'} · ${new Date(res.receivedAt).toLocaleTimeString()}`;
      }

      if (sourceElem) sourceElem.textContent = res.source || '-';
      if (amountElem) amountElem.textContent = res.amount || 'None';
      if (refElem) refElem.textContent = res.reference || 'None';
      if (reasonElem) {
        reasonElem.textContent = res.reason || 'None (Passed)';
        reasonElem.style.color = res.reason ? '#f87171' : '#4ade80';
      }

      if (stagesList && res.stages) {
        const stageDefs = [
          { key: 'stage1', num: 1, title: 'Stage 1: Raw Evidence Loader' },
          { key: 'stage2', num: 2, title: 'Stage 2: Source / Sender Filtering' },
          { key: 'stage3', num: 3, title: 'Stage 3: Payment Parser' },
          { key: 'stage4', num: 4, title: 'Stage 4: Payment Verification' },
          { key: 'stage5', num: 5, title: 'Stage 5: Security Engine' },
          { key: 'stage6', num: 6, title: 'Stage 6: Attribution' }
        ];

        stagesList.innerHTML = stageDefs.map(def => {
          const st = res.stages[def.key] || { status: 'UNKNOWN' };
          let statusColor = '#94a3b8';
          let statusBadge = 'PENDING';
          let bg = 'rgba(15,23,42,0.6)';

          if (st.status === 'LOADED' || st.status === 'PASSED' || st.status === 'PARSED' || st.status === 'VERIFIED' || st.status === 'ATTRIBUTED') {
            statusColor = '#34d399';
            statusBadge = st.status;
            bg = 'rgba(6,95,70,0.15)';
          } else if (st.status === 'FAILED') {
            statusColor = '#f87171';
            statusBadge = (def.key === 'stage5' && st.autoBanApplied) ? 'FAILED (CUSTOMER BANNED)' : `FAILED (${st.reason || 'REJECTED'})`;
            bg = 'rgba(153,27,27,0.2)';
          } else if (st.status === 'SUSPICIOUS_FLAGGED' || st.status === 'FLAGGED_SUSPICIOUS') {
            statusColor = '#fbbf24';
            statusBadge = 'SUSPICIOUS (BAN SUPPRESSED)';
            bg = 'rgba(180,83,9,0.2)';
          }

          const detailsText = st.details ? (typeof st.details === 'object' ? JSON.stringify(st.details) : st.details) : (st.diagnostic || '');

          return `
          <div style="background:${bg}; border:1px solid #334155; border-radius:6px; padding:0.6rem 0.85rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <strong style="color:#ffffff; font-size:0.83rem;">${def.title}</strong>
              ${detailsText ? `<div style="font-size:0.75rem; color:#cbd5e1; margin-top:0.2rem; font-family:monospace;">${escapeHtml(detailsText)}</div>` : ''}
            </div>
            <span style="font-weight:700; font-size:0.75rem; color:${statusColor};">${statusBadge}</span>
          </div>
        `;
        }).join('');
      }
    }

    async function fetchTestModeAuditLog() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/test-mode/audit`);
        if (res.ok) {
          const data = await res.json();
          const tbody = document.getElementById('testAuditLogTableBody');
          if (!tbody) return;

          if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:1rem; text-align:center; color:#64748b;">No test records recorded yet.</td></tr>';
            return;
          }

          tbody.innerHTML = data.logs.map(log => {
            const d = log.details || {};
            const time = new Date(log.createdAt).toLocaleTimeString();
            const actionText = log.action === 'TEST_OBSERVATION_INJECTED' ? (d.testMessageId || 'INJECTION') : log.action;
            const rawSnippet = d.raw ? (d.raw.length > 50 ? d.raw.substring(0, 48) + '...' : d.raw) : '-';
            const outcome = d.outcomeStatus || '-';
            let outcomeColor = '#94a3b8';
            if (outcome === 'VERIFIED' || outcome === 'SUCCESS') outcomeColor = '#34d399';
            else if (outcome === 'REJECTED' || outcome === 'FAILED') outcomeColor = '#f87171';
            else if (outcome === 'SUSPICIOUS') outcomeColor = '#fbbf24';

            return `
            <tr style="border-bottom:1px solid #1e293b;">
              <td style="padding:0.4rem; color:#94a3b8;">${time}</td>
              <td style="padding:0.4rem; font-family:monospace; color:#f8fafc;">${escapeHtml(actionText)}</td>
              <td style="padding:0.4rem; color:#38bdf8;">${escapeHtml(d.source || '-')}</td>
              <td style="padding:0.4rem; font-weight:700; color:${outcomeColor};">${escapeHtml(outcome)}</td>
              <td style="padding:0.4rem; color:#cbd5e1; font-family:monospace; font-size:0.75rem;">${escapeHtml(rawSnippet)}</td>
            </tr>
          `;
          }).join('');
        }
      } catch (e) {
        console.warn('fetchTestModeAuditLog error:', e);
      }
    }

    // =========================================================================
    // DEVELOPER TOOLS -> PAYMENT SIMULATOR CONTROLLER (FEATURE 65)
    // =========================================================================

    let simCustomersCache = [];
    let simSelectedCustomer = null;
    let simSelectedSession = null;
    let currentSimulatorMerchantId = null;

    async function simGetMerchantId() {
      if (currentSimulatorMerchantId) return currentSimulatorMerchantId;
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/merchant-settings`);
        if (res.ok) {
          const d = await res.json();
          if (d && d.merchantId) {
            currentSimulatorMerchantId = d.merchantId;
            return currentSimulatorMerchantId;
          }
        }
      } catch { }
      return '00000000-0000-0000-0000-000000000001';
    }

    async function simGetHeaders(extraHeaders = {}) {
      const mId = await simGetMerchantId();
      return {
        'x-merchant-id': mId,
        ...extraHeaders
      };
    }

    async function initPaymentSimulator() {
      await simCheckTestMode();
      await simFetchCustomers();
      await simFetchHistory();
    }

    async function simCheckTestMode() {
      try {
        const headers = await simGetHeaders();
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/test-mode`, { headers });
        if (res.ok) {
          const data = await res.json();
          const statusEl = document.getElementById('simTestModeStatus');
          const btnEnable = document.getElementById('simBtnEnableTestMode');
          if (data.enabled) {
            if (statusEl) {
              statusEl.innerHTML = `<span style="color:#22c55e;">● ACTIVE</span> (${Math.floor(data.remainingSeconds / 60)}m ${data.remainingSeconds % 60}s)`;
            }
            if (btnEnable) btnEnable.style.display = 'none';
          } else {
            if (statusEl) {
              statusEl.innerHTML = `<span style="color:#ef4444;">● OFF / EXPIRED</span>`;
            }
            if (btnEnable) {
              btnEnable.style.display = 'inline-block';
              btnEnable.textContent = 'Enable Test Mode';
            }
          }
        }
      } catch (e) {
        console.warn('simCheckTestMode error:', e);
      }
    }

    async function simQuickEnableTestMode() {
      try {
        const headers = await simGetHeaders({ 'Content-Type': 'application/json' });
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/test-mode`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ enabled: true })
        });
        if (res.ok) {
          showAdminToast('Developer Test Mode Enabled (10 minutes)');
          await simCheckTestMode();
        }
      } catch (e) {
        showAdminToast('Failed to enable Test Mode: ' + e.message, 'error');
      }
    }

    async function simFetchCustomers(searchQuery = '') {
      const select = document.getElementById('simCustomerSelect');
      if (select) {
        select.innerHTML = '<option value="" disabled selected>Loading existing customers...</option>';
      }

      try {
        const url = searchQuery
          ? `${API_BASE}/api/v1/admin/dev/simulator/customers?q=${encodeURIComponent(searchQuery)}`
          : `${API_BASE}/api/v1/admin/dev/simulator/customers`;
        const headers = await simGetHeaders();
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to load customers');
        const data = await res.json();
        simCustomersCache = data.customers || [];

        if (!select) return;

        if (simCustomersCache.length === 0) {
          select.innerHTML = '<option value="" disabled selected>No existing customers found.</option>';
          return;
        }

        select.innerHTML = simCustomersCache.map(c => {
          return `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.phone || c.email)})</option>`;
        }).join('');

        // If already selected, re-select
        if (simSelectedCustomer) {
          select.value = simSelectedCustomer.id;
        }
      } catch (e) {
        if (select) select.innerHTML = `<option value="" disabled selected>Error: ${escapeHtml(e.message)}</option>`;
      }
    }

    function simFilterCustomers(q) {
      simFetchCustomers(q);
    }

    async function simSelectCustomer(customerId) {
      if (!customerId) return;
      const cust = simCustomersCache.find(c => c.id === customerId);
      if (!cust) return;

      simSelectedCustomer = cust;
      simSelectedSession = null;

      // Display customer details
      const box = document.getElementById('simSelectedCustomerBox');
      if (box) box.style.display = 'block';
      const nameEl = document.getElementById('simCustName');
      const phoneEl = document.getElementById('simCustPhone');
      const emailEl = document.getElementById('simCustEmail');
      if (nameEl) nameEl.textContent = cust.name;
      if (phoneEl) phoneEl.textContent = cust.phone || cust.mobileNumber || 'No phone';
      if (emailEl) emailEl.textContent = cust.email || 'No email';

      // Fetch sessions
      await simReloadSessions();
    }

    async function simReloadSessions() {
      if (!simSelectedCustomer) return;
      const container = document.getElementById('simSessionsList');
      if (container) {
        container.innerHTML = '<div style="padding:1.5rem; text-align:center; color:#94a3b8;">Loading payment sessions...</div>';
      }

      // Hide session bar and terminal notice
      const bar = document.getElementById('simSelectedSessionBar');
      if (bar) bar.style.display = 'none';
      const notice = document.getElementById('simTerminalNotice');
      if (notice) notice.style.display = 'none';

      try {
        const headers = await simGetHeaders();
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/simulator/customers/${simSelectedCustomer.id}/sessions`, { headers });
        if (!res.ok) throw new Error('Failed to load customer sessions');
        const data = await res.json();
        const sessions = data.sessions || [];

        if (!container) return;

        if (sessions.length === 0) {
          container.innerHTML = `
          <div style="padding:1.5rem; text-align:center; color:#64748b; font-size:0.84rem;">
            No payment sessions found for ${escapeHtml(simSelectedCustomer.name)}.<br/>
            <span style="font-size:0.75rem; color:#475569;">Initiate a payment via checkout or Coin Store to test.</span>
          </div>
        `;
          return;
        }

        container.innerHTML = sessions.map(s => {
          const isProcessable = s.isProcessable;
          let badgeColor = '#94a3b8';
          let badgeBg = '#1e293b';
          if (s.status === 'ACTIVE') { badgeColor = '#0f172a'; badgeBg = '#22c55e'; }
          else if (s.status === 'PROCESSING') { badgeColor = '#0f172a'; badgeBg = '#fbbf24'; }
          else if (s.status === 'SUCCESS') { badgeColor = '#ffffff'; badgeBg = '#059669'; }
          else if (s.status === 'CANCELLED' || s.status === 'EXPIRED' || s.status === 'FAILED') { badgeColor = '#ffffff'; badgeBg = '#ef4444'; }

          return `
          <div class="sim-session-row" onclick="simPickSession('${s.id}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.65rem; border-radius:6px; margin-bottom:0.35rem; background:#0f172a; border:1px solid #1e293b; transition:all 0.15s ease;" id="simSessItem_${s.id}">
            <div>
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <input type="radio" name="simSessionRadio" id="radio_${s.id}" style="accent-color:#3b82f6; cursor:pointer;" />
                <strong style="color:#f8fafc; font-size:0.84rem; font-family:monospace;">${escapeHtml(s.id.slice(0, 14))}...</strong>
                <span style="color:#94a3b8; font-size:0.78rem;">#${escapeHtml(s.orderId)}</span>
              </div>
              <div style="font-size:0.72rem; color:#64748b; margin-left:1.4rem;">
                Device: <code>${escapeHtml(s.deviceId ? s.deviceId.slice(0, 16) : 'None')}</code>
              </div>
            </div>
            <div style="text-align:right;">
              <strong style="color:#38bdf8; font-size:0.88rem;">₹${escapeHtml(s.amount)}</strong>
              <div style="margin-top:0.15rem;">
                <span class="badge" style="font-size:0.68rem; padding:0.15rem 0.45rem; background:${badgeBg}; color:${badgeColor}; font-weight:700;">
                  ${escapeHtml(s.status)}
                </span>
              </div>
            </div>
          </div>
        `;
        }).join('');

        // Store sessions
        container._sessions = sessions;

        // Auto-select the first processable session if available, else first session
        const firstActive = sessions.find(s => s.isProcessable) || sessions[0];
        if (firstActive) {
          simPickSession(firstActive.id);
        }
      } catch (e) {
        if (container) container.innerHTML = `<div style="padding:1rem; color:#ef4444; font-size:0.8rem;">Error: ${escapeHtml(e.message)}</div>`;
      }
    }

    function simPickSession(sessionId) {
      const container = document.getElementById('simSessionsList');
      const sessions = container?._sessions || [];
      const sess = sessions.find(s => s.id === sessionId);
      if (!sess) return;

      simSelectedSession = sess;

      // Highlight row
      document.querySelectorAll('.sim-session-row').forEach(r => {
        r.style.borderColor = '#1e293b';
        r.style.background = '#0f172a';
      });
      const item = document.getElementById(`simSessItem_${sessionId}`);
      if (item) {
        item.style.borderColor = '#3b82f6';
        item.style.background = 'rgba(59,130,246,0.12)';
      }
      const radio = document.getElementById(`radio_${sessionId}`);
      if (radio) radio.checked = true;

      // Update session details bar
      const bar = document.getElementById('simSelectedSessionBar');
      if (bar) bar.style.display = 'flex';
      const idEl = document.getElementById('simSelectedSessionId');
      const ordEl = document.getElementById('simSelectedSessionOrder');
      const amtEl = document.getElementById('simSelectedSessionAmount');
      const badgeEl = document.getElementById('simSelectedSessionBadge');

      if (idEl) idEl.textContent = sess.id;
      if (ordEl) ordEl.textContent = `#${sess.orderId}`;
      if (amtEl) amtEl.textContent = `₹${sess.amount}`;
      if (badgeEl) {
        badgeEl.textContent = sess.status;
        badgeEl.style.background = sess.isProcessable ? '#22c55e' : '#ef4444';
        badgeEl.style.color = sess.isProcessable ? '#0f172a' : '#ffffff';
      }

      // Terminal session enforcement (Section 6)
      const notice = document.getElementById('simTerminalNotice');
      const btnSms = document.getElementById('simBtnPushSms');
      const btnGmail = document.getElementById('simBtnPushGmail');

      const isTerminal = ['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(sess.status);
      if (isTerminal) {
        if (notice) notice.style.display = 'block';
        if (btnSms) { btnSms.disabled = true; btnSms.style.opacity = '0.5'; btnSms.style.cursor = 'not-allowed'; }
        if (btnGmail) { btnGmail.disabled = true; btnGmail.style.opacity = '0.5'; btnGmail.style.cursor = 'not-allowed'; }
      } else {
        if (notice) notice.style.display = 'none';
        if (btnSms) { btnSms.disabled = false; btnSms.style.opacity = '1'; btnSms.style.cursor = 'pointer'; }
        if (btnGmail) { btnGmail.disabled = false; btnGmail.style.opacity = '1'; btnGmail.style.cursor = 'pointer'; }

        // Fill in sample amounts matching session
        const randRef = Math.floor(100000000000 + Math.random() * 900000000000);
        const smsContent = document.getElementById('simSmsContent');
        if (smsContent && (!smsContent.value || smsContent.value.includes('credited with'))) {
          smsContent.value = `A/C XX1234 credited with Rs ${sess.amount} CR. Ref ${randRef}`;
        }
        const gmailContent = document.getElementById('simGmailContent');
        if (gmailContent && (!gmailContent.value || gmailContent.value.includes('credited with'))) {
          gmailContent.value = `Your account has been credited with ₹${sess.amount} via UPI. Reference ${randRef}`;
        }
      }
    }

    function simToggleTimeInput(stream) {
      const isSms = stream === 'SMS';
      const typeSelect = document.getElementById(isSms ? 'simSmsTimeType' : 'simGmailTimeType');
      const customInput = document.getElementById(isSms ? 'simSmsCustomTime' : 'simGmailCustomTime');
      if (!typeSelect || !customInput) return;

      if (typeSelect.value === 'CUSTOM') {
        customInput.style.display = 'block';
        if (!customInput.value) customInput.value = new Date().toISOString();
      } else {
        customInput.style.display = 'none';
      }
    }

    async function simInjectObservation(stream) {
      await simCheckTestMode();

      const isSms = stream === 'SMS';
      const senderInput = document.getElementById(isSms ? 'simSmsSender' : 'simGmailSender');
      const contentInput = document.getElementById(isSms ? 'simSmsContent' : 'simGmailContent');
      const timeTypeSelect = document.getElementById(isSms ? 'simSmsTimeType' : 'simGmailTimeType');
      const customTimeInput = document.getElementById(isSms ? 'simSmsCustomTime' : 'simGmailCustomTime');

      const sender = senderInput ? senderInput.value : '';
      const content = contentInput ? contentInput.value : '';
      let receivedAt = undefined;
      if (timeTypeSelect && timeTypeSelect.value === 'CUSTOM' && customTimeInput) {
        receivedAt = customTimeInput.value;
      }

      const payload = {
        source: stream,
        sender,
        content,
        receivedAt,
        paymentSessionId: simSelectedSession ? simSelectedSession.id : undefined,
        customerId: simSelectedCustomer ? simSelectedCustomer.id : undefined
      };

      const btn = document.getElementById(isSms ? 'simBtnPushSms' : 'simBtnPushGmail');
      const originalText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Processing via Real Pipeline...';
      }

      try {
        const headers = await simGetHeaders({ 'Content-Type': 'application/json' });
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/simulator/inject`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
          showAdminToast(data.error || 'Simulation rejected by engine', 'error');
          if (data.error === 'SESSION NO LONGER ACTIVE') {
            const notice = document.getElementById('simTerminalNotice');
            if (notice) notice.style.display = 'block';
          }
        } else {
          showAdminToast(`Observation Processed: ${data.status}`);
        }

        // Display results in Result Inspector
        simRenderResultInspector(data, stream);

        // Refresh customer sessions & history
        if (simSelectedCustomer) {
          await simReloadSessions();
        }
        await simFetchHistory();
      } catch (e) {
        showAdminToast('Injection Network Error: ' + e.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }

    function simRenderResultInspector(data, stream) {
      const card = document.getElementById('simResultInspectorCard');
      if (!card) return;
      card.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Status Badge
      const badge = document.getElementById('simResultStatusBadge');
      if (badge) {
        badge.textContent = data.status || 'UNKNOWN';
        if (data.status === 'VERIFIED') {
          badge.style.background = '#22c55e';
          badge.style.color = '#0f172a';
        } else if (data.status === 'REJECTED') {
          badge.style.background = '#ef4444';
          badge.style.color = '#ffffff';
        } else if (data.status === 'SUSPICIOUS') {
          badge.style.background = '#f59e0b';
          badge.style.color = '#0f172a';
        } else {
          badge.style.background = '#64748b';
          badge.style.color = '#ffffff';
        }
      }

      const msgIdEl = document.getElementById('simResultMessageId');
      if (msgIdEl) msgIdEl.textContent = `ID: ${data.messageId || '-'}`;

      const tgtEl = document.getElementById('simResTargetSession');
      if (tgtEl) {
        tgtEl.textContent = (simSelectedSession ? `${simSelectedSession.id.slice(0, 10)}... (#${simSelectedSession.orderId})` : 'Auto-Resolved');
      }

      const srcEl = document.getElementById('simResSource');
      if (srcEl) srcEl.textContent = stream;

      const amtEl = document.getElementById('simResAmount');
      if (amtEl) amtEl.textContent = data.amount || '-';

      const refEl = document.getElementById('simResRef');
      if (refEl) refEl.textContent = data.reference || '-';

      const reasonEl = document.getElementById('simResReason');
      if (reasonEl) {
        reasonEl.textContent = data.reason || data.failingCondition || 'None (Passed)';
        reasonEl.style.color = (data.reason || data.failingCondition) ? '#f87171' : '#22c55e';
      }

      // Exact Raw Text
      const rawEl = document.getElementById('simResRawText');
      if (rawEl) rawEl.textContent = data.raw || data.syntheticObservation?.raw || '';

      // Stages 1 through 6 Visualizer
      const stagesContainer = document.getElementById('simStagesContainer');
      if (stagesContainer) {
        const stages = data.stages || {};
        const stageDefs = [
          { key: 'stage1', num: 1, name: 'Stage 1: Observation Loaded & Evidence Preserved', desc: 'Normalized and preserved verbatim raw text evidence.' },
          { key: 'stage2', num: 2, name: 'Stage 2: Source / Sender Filtering', desc: 'Validates bank institutional shortcodes or authorized email domains.' },
          { key: 'stage3', num: 3, name: 'Stage 3: Payment Notification Parser', desc: 'Parses currency indicators (Rs, Rs., ₹, INR), credit indicators, 12-digit UTR.' },
          { key: 'stage4', num: 4, name: 'Stage 4: Payment Verification Engine', desc: 'Verifies active session match, timestamp window, amount equality, deduplication.' },
          { key: 'stage5', num: 5, name: 'Stage 5: Security & Fraud Pattern Engine', desc: 'Scans for injection patterns and checks customer ban status.' },
          { key: 'stage6', num: 6, name: 'Stage 6: Attribution & State Machine Transition', desc: 'Attributes payment, promotes next queued customer, and emits webhooks & SSE.' }
        ];

        stagesContainer.innerHTML = stageDefs.map(def => {
          const s = stages[def.key] || { status: 'PENDING' };
          let icon = '⚪';
          let statusColor = '#94a3b8';
          let bgColor = '#0f172a';
          let borderCol = '#1e293b';

          if (s.status === 'LOADED' || s.status === 'PASSED' || s.status === 'PARSED' || s.status === 'VERIFIED' || s.status === 'ATTRIBUTED') {
            icon = '✅';
            statusColor = '#22c55e';
            borderCol = 'rgba(34,197,94,0.3)';
          } else if (s.status === 'FAILED') {
            icon = '❌';
            statusColor = '#ef4444';
            borderCol = 'rgba(239,68,68,0.4)';
            bgColor = 'rgba(239,68,68,0.06)';
          } else if (s.status === 'FLAGGED_CUSTOMER_SENDER' || s.status === 'FLAGGED_SUSPICIOUS' || s.status === 'SUSPICIOUS') {
            icon = '⚠️';
            statusColor = '#f59e0b';
            borderCol = 'rgba(245,158,11,0.4)';
          } else if (s.status === 'UNRESOLVED') {
            icon = '❓';
            statusColor = '#cbd5e1';
          }

          const detailText = s.details ? (typeof s.details === 'string' ? s.details : JSON.stringify(s.details)) : def.desc;
          const reasonBadge = s.reason ? `<span class="badge" style="background:#ef4444; color:#fff; font-size:0.7rem; margin-left:0.5rem;">${escapeHtml(s.reason)}</span>` : '';

          return `
          <div style="background:${bgColor}; border:1px solid ${borderCol}; border-radius:8px; padding:0.6rem 0.85rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:1.05rem;">${icon}</span>
                <strong style="color:#ffffff; font-size:0.86rem;">${escapeHtml(def.name)}</strong>
                ${reasonBadge}
              </div>
              <div style="font-size:0.75rem; color:#94a3b8; margin-left:1.85rem; margin-top:0.15rem;">
                ${escapeHtml(detailText)}
              </div>
            </div>
            <div>
              <span style="font-size:0.75rem; font-weight:800; color:${statusColor}; font-family:monospace;">
                ${escapeHtml(s.status || 'PENDING')}
              </span>
            </div>
          </div>
        `;
        }).join('');
      }
    }

    async function simFetchHistory() {
      try {
        const headers = await simGetHeaders();
        const res = await fetch(`${API_BASE}/api/v1/admin/dev/simulator/history`, { headers });
        if (res.ok) {
          const data = await res.json();
          const tbody = document.getElementById('simHistoryTableBody');
          if (!tbody) return;

          if (!data.history || data.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding:1.5rem; text-align:center; color:#64748b;">No simulations recorded yet.</td></tr>';
            return;
          }

          tbody.innerHTML = data.history.map(item => {
            const time = new Date(item.timestamp).toLocaleTimeString();
            let resColor = '#94a3b8';
            if (item.result === 'VERIFIED') resColor = '#22c55e';
            else if (item.result === 'REJECTED') resColor = '#ef4444';
            else if (item.result === 'SUSPICIOUS') resColor = '#f59e0b';

            return `
            <tr style="border-bottom:1px solid #1e293b;">
              <td style="padding:0.6rem 0.75rem; color:#94a3b8; font-size:0.78rem;">${time}</td>
              <td style="padding:0.6rem 0.75rem; color:#38bdf8; font-weight:700;">${escapeHtml(item.source)}</td>
              <td style="padding:0.6rem 0.75rem; color:#f8fafc; font-family:monospace; font-size:0.78rem;">${escapeHtml(item.sender || '-')}</td>
              <td style="padding:0.6rem 0.75rem; color:#e2e8f0; font-family:monospace; font-size:0.75rem;">${escapeHtml(item.sessionId ? item.sessionId.slice(0, 10) + '...' : '-')}</td>
              <td style="padding:0.6rem 0.75rem; font-weight:800; color:${resColor};">${escapeHtml(item.result)}</td>
              <td style="padding:0.6rem 0.75rem; font-family:monospace; color:#64748b; font-size:0.72rem;">${escapeHtml(item.messageId || '-')}</td>
              <td style="padding:0.6rem 0.75rem; color:#f87171; font-size:0.75rem;">${escapeHtml(item.failingReason || '-')}</td>
            </tr>
          `;
          }).join('');
        }
      } catch (e) {
        console.warn('simFetchHistory error:', e);
      }
    }

    // =========================================================================
    // SECURITY & BAN MANAGEMENT CONTROLLER (Section 9)
    // =========================================================================

    let bannedUsersCache = [];
    let currentModalCustomerId = null;
    let currentUnbanCustomerId = null;

    async function fetchBannedUsers() {
      const tbody = document.getElementById('bannedUsersTableBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading banned users...</td></tr>';
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/security/banned-users`);
        if (!res.ok) throw new Error('Failed to fetch banned users');
        const data = await res.json();
        bannedUsersCache = data.bannedUsers || [];
        renderBannedUsersTable(bannedUsersCache);
      } catch (e) {
        console.warn('fetchBannedUsers error:', e);
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#f87171; padding:1.5rem;">⚠️ Failed to load banned users: ${escapeHtml(e.message)}</td></tr>`;
        }
      }
    }

    function renderBannedUsersTable(users) {
      const tbody = document.getElementById('bannedUsersTableBody');
      if (!tbody) return;

      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:2rem;">No customers currently banned.</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(u => {
        const bannedTime = u.bannedAt ? new Date(u.bannedAt).toLocaleString() : '-';
        const reasonBadge = u.banReason === 'MANUAL_BAN'
          ? '<span class="badge badge-warning" style="font-size:0.75rem;">MANUAL_BAN</span>'
          : `<span class="badge badge-danger" style="font-size:0.75rem;">${escapeHtml(u.banReason || 'FRAUDULENT_PAYMENT_INJECTION')}</span>`;

        return `
        <tr style="border-bottom:1px solid #1e293b;">
          <td><strong style="color:#ffffff;">${escapeHtml(u.name || 'Anonymous')}</strong><div style="font-size:0.72rem; color:#64748b; font-family:monospace;">${u.id}</div></td>
          <td style="color:#cbd5e1; font-size:0.83rem;">${escapeHtml(u.email || '-')}</td>
          <td style="color:#38bdf8; font-family:monospace; font-size:0.83rem;">${escapeHtml(u.phone || u.mobileNumber || '-')}</td>
          <td><span class="badge badge-danger" style="font-weight:800; font-size:0.75rem; letter-spacing:0.04em;">BANNED</span></td>
          <td style="color:#94a3b8; font-size:0.8rem;">${bannedTime}</td>
          <td>${reasonBadge}</td>
          <td><code style="font-size:0.75rem; color:#94a3b8;">${u.lastSessionId ? u.lastSessionId.substring(0, 14) + '...' : '-'}</code></td>
          <td style="color:#94a3b8; font-size:0.78rem;">${escapeHtml(u.lastDevice || 'android-gateway')}</td>
          <td><span class="badge badge-info" style="font-size:0.7rem;">${escapeHtml(u.source || 'SMS')}</span></td>
          <td style="text-align:right;">
            <div style="display:inline-flex; gap:0.4rem;">
              <button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="viewBanDetails('${u.id}')">🔍 Details</button>
              <button class="btn btn-success" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:#059669; border-color:#059669;" onclick="promptUnbanCustomer('${u.id}', '${escapeHtml(u.name || '')}', '${escapeHtml(u.phone || u.mobileNumber || '')}')">🔓 Unban</button>
            </div>
          </td>
        </tr>
      `;
      }).join('');
    }

    function filterBannedUsers(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        renderBannedUsersTable(bannedUsersCache);
        return;
      }
      const filtered = bannedUsersCache.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.mobileNumber && u.mobileNumber.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
      renderBannedUsersTable(filtered);
    }

    async function viewBanDetails(customerId) {
      currentModalCustomerId = customerId;
      const modal = document.getElementById('banDetailsModal');
      const modalBody = document.getElementById('banDetailsModalBody');
      if (!modal || !modalBody) return;

      modalBody.innerHTML = '<div style="text-align:center; padding:2rem; color:#94a3b8;">Loading comprehensive forensic evidence...</div>';
      modal.hidden = false;

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/security/banned-users/${customerId}`);
        if (!res.ok) throw new Error('Failed to retrieve ban evidence dossier');
        const data = await res.json();

        const c = data.customer || {};
        const b = data.banDetails || {};
        const meta = data.observationMetadata || {};
        const disc = data.discrepancyAnalysis || {};
        const timeline = data.timeline || {};
        const rawEvidence = data.rawEvidence || 'NO_RAW_PAYLOAD_AVAILABLE';

        modalBody.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
          <!-- 1. Customer Profile -->
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:1rem;">
            <div style="font-weight:700; color:#38bdf8; font-size:0.85rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">👤 Customer Profile</div>
            <div style="display:grid; grid-template-columns:auto 1fr; gap:0.4rem 0.8rem; font-size:0.82rem;">
              <span style="color:#64748b;">Name:</span><strong style="color:#ffffff;">${escapeHtml(c.name || '-')}</strong>
              <span style="color:#64748b;">Phone:</span><span style="color:#38bdf8; font-family:monospace;">${escapeHtml(c.phone || '-')}</span>
              <span style="color:#64748b;">Email:</span><span style="color:#cbd5e1;">${escapeHtml(c.email || '-')}</span>
              <span style="color:#64748b;">Customer ID:</span><code style="color:#94a3b8; font-size:0.72rem;">${c.id || '-'}</code>
              <span style="color:#64748b;">Created At:</span><span style="color:#cbd5e1;">${c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</span>
              <span style="color:#64748b;">Total Orders:</span><strong style="color:#ffffff;">${c.totalOrders || 0}</strong>
              <span style="color:#64748b;">Total Spent:</span><strong style="color:#34d399;">₹${c.totalSpentRupees || '0.00'}</strong>
            </div>
          </div>

          <!-- 2. Ban & Trigger Details -->
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:1rem;">
            <div style="font-weight:700; color:#f87171; font-size:0.85rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">⚖️ Enforcement Attributes</div>
            <div style="display:grid; grid-template-columns:auto 1fr; gap:0.4rem 0.8rem; font-size:0.82rem;">
              <span style="color:#64748b;">Ban Type:</span><span class="badge ${b.banType === 'AUTOMATIC' ? 'badge-danger' : 'badge-warning'}">${escapeHtml(b.banType)}</span>
              <span style="color:#64748b;">Trigger Event:</span><strong style="color:#f87171;">${escapeHtml(b.triggerEvent)}</strong>
              <span style="color:#64748b;">Timestamp:</span><span style="color:#cbd5e1;">${b.triggerTimestamp ? new Date(b.triggerTimestamp).toLocaleString() : '-'}</span>
              <span style="color:#64748b;">Session ID:</span><code style="color:#94a3b8; font-size:0.72rem;">${b.paymentSessionId || '-'}</code>
              <span style="color:#64748b;">Order ID:</span><strong style="color:#ffffff;">#${escapeHtml(b.orderId || '-')}</strong>
              <span style="color:#64748b;">Session Amount:</span><strong style="color:#38bdf8;">₹${b.sessionAmountRupees || '-'}</strong>
            </div>
          </div>
        </div>

        <!-- 3. VERBATIM RAW EVIDENCE (PRESERVED WORD-FOR-WORD) -->
        <div style="margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <div style="font-weight:700; color:#f87171; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em;">
              📜 Verbatim Raw Message Evidence (Exact Word-For-Word Payload)
            </div>
            <span class="badge badge-danger" style="font-size:0.68rem;">UNTOUCHED RAW STRING</span>
          </div>
          <pre style="background:#020617; border:1px solid #dc2626; color:#fca5a5; padding:1.1rem; border-radius:8px; font-family:Consolas, Monaco, monospace; white-space:pre-wrap; word-break:break-all; font-size:0.85rem; line-height:1.55; margin:0; box-shadow:inset 0 2px 4px rgba(0,0,0,0.5);"><code>${escapeHtml(rawEvidence)}</code></pre>
          <div style="font-size:0.74rem; color:#94a3b8; margin-top:0.35rem; font-style:italic;">
            * Stored verbatim without parsing truncation or database mutation. Exact fake message sent by the customer.
          </div>
        </div>

        <!-- 4. Observation Metadata & Discrepancy Analysis -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
          <!-- Metadata -->
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:1rem;">
            <div style="font-weight:700; color:#94a3b8; font-size:0.85rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">📡 Observation Metadata</div>
            <div style="display:grid; grid-template-columns:auto 1fr; gap:0.4rem 0.8rem; font-size:0.82rem;">
              <span style="color:#64748b;">Source Channel:</span><strong style="color:#ffffff;">${escapeHtml(meta.source || 'SMS')}</strong>
              <span style="color:#64748b;">Sender Identity:</span><code style="color:#38bdf8;">${escapeHtml(meta.sender || '-')}</code>
              <span style="color:#64748b;">Receiver Identity:</span><span style="color:#cbd5e1;">${escapeHtml(meta.receiver || '-')}</span>
              <span style="color:#64748b;">Observer Device ID:</span><code style="color:#cbd5e1; font-size:0.72rem;">${escapeHtml(meta.deviceId || '-')}</code>
            </div>
          </div>

          <!-- Discrepancy Analysis -->
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:1rem;">
            <div style="font-weight:700; color:#fbbf24; font-size:0.85rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">🔍 Discrepancy Forensic Audit</div>
            <div style="display:grid; grid-template-columns:auto 1fr; gap:0.35rem 0.8rem; font-size:0.8rem;">
              <span style="color:#64748b;">Customer Phone:</span><span style="color:#38bdf8; font-family:monospace;">${escapeHtml(disc.customerPhone || '-')}</span>
              <span style="color:#64748b;">Sender Number:</span><span style="color:#f87171; font-family:monospace;">${escapeHtml(disc.observationSender || '-')}</span>
              <span style="color:#64748b;">Legitimate Bank:</span><strong style="color:#f87171;">${escapeHtml(disc.registeredBankHeader || 'NO')}</strong>
              <span style="color:#64748b;">Session Amount:</span><span style="color:#ffffff;">${escapeHtml(disc.sessionAmount || '-')}</span>
              <span style="color:#64748b;">Fraud Engine Verdict:</span><strong style="color:#f87171;">${escapeHtml(disc.result || 'FRAUDULENT_PAYMENT_INJECTION')}</strong>
            </div>
          </div>
        </div>

        <!-- 5. Forensic Timeline -->
        <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:1rem;">
          <div style="font-weight:700; color:#cbd5e1; font-size:0.85rem; margin-bottom:0.6rem; text-transform:uppercase; letter-spacing:0.05em;">⏱️ Immutable Incident Timeline</div>
          <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.8rem;">
            <div style="display:flex; gap:0.75rem;"><span style="color:#64748b; width:170px;">1. Payment Session Created:</span><span style="color:#ffffff;">${timeline.sessionCreated ? new Date(timeline.sessionCreated).toLocaleString() : '-'}</span></div>
            <div style="display:flex; gap:0.75rem;"><span style="color:#64748b; width:170px;">2. Fake Observation Injected:</span><span style="color:#f87171; font-weight:700;">${timeline.fakeObservationReceived ? new Date(timeline.fakeObservationReceived).toLocaleString() : '-'}</span></div>
            <div style="display:flex; gap:0.75rem;"><span style="color:#64748b; width:170px;">3. Confirmation Blocked:</span><span style="color:#f87171; font-weight:700;">${timeline.paymentRejected ? new Date(timeline.paymentRejected).toLocaleString() : '-'} (DO NOT PAY)</span></div>
            <div style="display:flex; gap:0.75rem;"><span style="color:#64748b; width:170px;">4. Customer Identity Banned:</span><span style="color:#f87171; font-weight:700;">${timeline.autoBanExecuted ? new Date(timeline.autoBanExecuted).toLocaleString() : '-'} (AUTO BAN)</span></div>
          </div>
        </div>
      `;
      } catch (e) {
        modalBody.innerHTML = `<div style="text-align:center; padding:2rem; color:#f87171;">⚠️ Error retrieving ban details: ${escapeHtml(e.message)}</div>`;
      }
    }

    function closeBanDetailsModal() {
      const modal = document.getElementById('banDetailsModal');
      if (modal) modal.hidden = true;
      currentModalCustomerId = null;
    }

    function handleModalUnbanClick() {
      if (!currentModalCustomerId) return;
      const user = bannedUsersCache.find(u => u.id === currentModalCustomerId);
      promptUnbanCustomer(currentModalCustomerId, user?.name || '', user?.phone || user?.mobileNumber || '');
    }

    function promptUnbanCustomer(customerId, name, phone) {
      currentUnbanCustomerId = customerId;
      const nameEl = document.getElementById('unbanCustName');
      const phoneEl = document.getElementById('unbanCustPhone');
      const reasonSelect = document.getElementById('unbanReasonSelect');
      const reasonCustom = document.getElementById('unbanReasonCustom');

      if (nameEl) nameEl.textContent = name || 'Customer';
      if (phoneEl) phoneEl.textContent = phone || customerId;
      if (reasonSelect) reasonSelect.value = 'Customer verified via phone call';
      if (reasonCustom) { reasonCustom.style.display = 'none'; reasonCustom.value = ''; }

      const modal = document.getElementById('unbanConfirmModal');
      if (modal) modal.hidden = false;
    }

    function handleUnbanReasonChange() {
      const select = document.getElementById('unbanReasonSelect');
      const custom = document.getElementById('unbanReasonCustom');
      if (!select || !custom) return;
      if (select.value === 'OTHER') {
        custom.style.display = 'block';
        custom.focus();
      } else {
        custom.style.display = 'none';
      }
    }

    function closeUnbanModal() {
      const modal = document.getElementById('unbanConfirmModal');
      if (modal) modal.hidden = true;
      currentUnbanCustomerId = null;
    }

    async function executeUnbanCustomer() {
      if (!currentUnbanCustomerId) return;
      const select = document.getElementById('unbanReasonSelect');
      const custom = document.getElementById('unbanReasonCustom');
      let reason = select ? select.value : 'Administrative Override';
      if (reason === 'OTHER') {
        reason = custom ? custom.value.trim() : '';
      }

      if (!reason) {
        return alert('A mandatory reason is required to unban a customer.');
      }

      const btn = document.getElementById('btnConfirmUnbanAction');
      if (btn) { btn.disabled = true; btn.textContent = 'Unbanning...'; }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/security/unban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: currentUnbanCustomerId,
            reason
          })
        });

        const data = await res.json();
        if (res.ok) {
          showAdminToast(data.message || 'Customer unbanned successfully! Access restored.');
          closeUnbanModal();
          closeBanDetailsModal();
          fetchBannedUsers();
          fetchSecurityEvents();
          fetchSecurityHistory();
        } else {
          alert(data.error || 'Failed to unban customer');
        }
      } catch (e) {
        alert('Network error unbanning customer');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirm Unban'; }
      }
    }

    async function openManualBanModal() {
      const modal = document.getElementById('manualBanModal');
      const select = document.getElementById('manualBanCustomerSelect');
      const inputId = document.getElementById('manualBanCustomerIdInput');
      const reasonInput = document.getElementById('manualBanReasonInput');
      const notesInput = document.getElementById('manualBanNotesInput');

      if (inputId) inputId.value = '';
      if (reasonInput) reasonInput.value = 'MANUAL_BAN';
      if (notesInput) notesInput.value = '';

      if (select) {
        select.innerHTML = '<option value="">-- Choose Existing Customer --</option>';
        try {
          const res = await fetch(`${API_BASE}/api/v1/admin/customers`);
          if (res.ok) {
            const data = await res.json();
            (data.customers || []).forEach(c => {
              const opt = document.createElement('option');
              opt.value = c.id;
              opt.textContent = `${c.name || 'Anonymous'} (${c.phone || c.email || c.id}) - Status: ${c.status}`;
              select.appendChild(opt);
            });
          }
        } catch (e) { }
      }

      if (modal) modal.hidden = false;
    }

    function handleManualBanCustomerChange() {
      const select = document.getElementById('manualBanCustomerSelect');
      const input = document.getElementById('manualBanCustomerIdInput');
      if (select && input && select.value) {
        input.value = select.value;
      }
    }

    function closeManualBanModal() {
      const modal = document.getElementById('manualBanModal');
      if (modal) modal.hidden = true;
    }

    async function executeManualBan() {
      const select = document.getElementById('manualBanCustomerSelect');
      const inputId = document.getElementById('manualBanCustomerIdInput');
      const reasonInput = document.getElementById('manualBanReasonInput');
      const notesInput = document.getElementById('manualBanNotesInput');

      const customerId = (inputId?.value || select?.value || '').trim();
      const reason = (reasonInput?.value || '').trim();
      const notes = (notesInput?.value || '').trim();

      if (!customerId) {
        return alert('Please select a customer or enter a Customer ID / Phone / Email.');
      }
      if (!reason) {
        return alert('Mandatory ban reason is required.');
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/security/manual-ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId, reason, notes })
        });
        const data = await res.json();
        if (res.ok) {
          showAdminToast(data.message || 'Customer manually banned.');
          closeManualBanModal();
          fetchBannedUsers();
          fetchSecurityEvents();
          fetchSecurityHistory();
        } else {
          alert(data.error || 'Failed to ban customer');
        }
      } catch (e) {
        alert('Network error executing manual ban');
      }
    }

    async function fetchSecurityEvents() {
      const tbody = document.getElementById('securityEventsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading security events...</td></tr>';

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/security/events`);
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        const events = data.events || [];

        if (events.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No security events recorded yet.</td></tr>';
          return;
        }

        tbody.innerHTML = events.map(e => {
          const time = e.createdAt ? new Date(e.createdAt).toLocaleString() : '-';
          const rawSnippet = e.rawMessage ? (e.rawMessage.length > 55 ? e.rawMessage.substring(0, 52) + '...' : e.rawMessage) : '-';
          let eventBadge = '<span class="badge badge-info">' + escapeHtml(e.eventType) + '</span>';
          if (e.eventType === 'FRAUDULENT_PAYMENT_INJECTION') eventBadge = '<span class="badge badge-danger">FRAUD_INJECTION</span>';
          else if (e.eventType === 'USER_UNBANNED') eventBadge = '<span class="badge badge-success">USER_UNBANNED</span>';
          else if (e.eventType === 'MANUAL_BAN') eventBadge = '<span class="badge badge-warning">MANUAL_BAN</span>';

          return `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="color:#94a3b8; font-size:0.8rem;">${time}</td>
            <td>${eventBadge}</td>
            <td><code style="color:#cbd5e1; font-size:0.75rem;">${escapeHtml(e.customerId || '-')}</code></td>
            <td><span class="badge badge-secondary" style="font-size:0.7rem;">${escapeHtml(e.source || 'SMS')}</span></td>
            <td style="color:#38bdf8; font-family:monospace; font-size:0.8rem;">${escapeHtml(e.sender || '-')}</td>
            <td style="color:#f87171; font-size:0.8rem;">${escapeHtml(e.fraudReason || '-')}</td>
            <td><code style="color:#fca5a5; font-size:0.75rem; background:#020617; padding:2px 6px; border-radius:4px;">${escapeHtml(rawSnippet)}</code></td>
            <td style="text-align:right;">
              ${e.customerId ? `<button class="btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="viewBanDetails('${e.customerId}')">View Dossier</button>` : '-'}
            </td>
          </tr>
        `;
        }).join('');
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#f87171; padding:1.5rem;">⚠️ Failed to load events: ${escapeHtml(e.message)}</td></tr>`;
      }
    }

    async function fetchSecurityHistory() {
      const tbody = document.getElementById('securityHistoryTableBody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">Loading ban history...</td></tr>';

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/security/history`);
        if (!res.ok) throw new Error('Failed to fetch security history');
        const data = await res.json();
        const logs = data.history || [];

        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No historical ban actions logged.</td></tr>';
          return;
        }

        tbody.innerHTML = logs.map(l => {
          const time = l.createdAt ? new Date(l.createdAt).toLocaleString() : '-';
          const d = l.details || {};
          const detailsStr = JSON.stringify(d);
          let actionBadge = '<span class="badge badge-info">' + escapeHtml(l.action) + '</span>';
          if (l.action === 'CUSTOMER_AUTOMATICALLY_BANNED') actionBadge = '<span class="badge badge-danger">AUTO_BANNED</span>';
          else if (l.action === 'USER_UNBANNED') actionBadge = '<span class="badge badge-success">UNBANNED</span>';
          else if (l.action === 'CUSTOMER_MANUALLY_BANNED') actionBadge = '<span class="badge badge-warning">MANUAL_BAN</span>';

          return `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="color:#94a3b8; font-size:0.8rem;">${time}</td>
            <td>${actionBadge}</td>
            <td style="color:#cbd5e1; font-size:0.82rem;">${escapeHtml(l.actorId || l.actorType || 'SYSTEM')}</td>
            <td><code style="color:#38bdf8; font-size:0.75rem;">${escapeHtml(l.entityId || '-')}</code></td>
            <td style="color:#cbd5e1; font-size:0.75rem; font-family:monospace; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(detailsStr)}">
              ${escapeHtml(detailsStr)}
            </td>
          </tr>
        `;
        }).join('');
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#f87171; padding:1.5rem;">⚠️ Failed to load history: ${escapeHtml(e.message)}</td></tr>`;
      }
    }

    // =========================================================================
    // DEVELOPER STUDIO & INTERACTIVE WEBHOOK TESTER (RAZORPAY CALIBER)
    // =========================================================================

    let LAST_TEST_RESULT = null;
    let ACTIVE_WEBHOOK_SNIPPET_LANG = 'express';
    let ACTIVE_CONSOLE_TAB = 'response';
    let CURRENT_API_KEY_DATA = null;
    let DISPLAY_SECRET_REVEALED = false;

    function getActiveCredentials() {
      if (!CURRENT_API_KEY_DATA) return null;
      return {
        keyId: CURRENT_API_KEY_DATA.keyId || CURRENT_API_KEY_DATA.live?.keyId || '',
        keySecret: CURRENT_API_KEY_DATA.keySecret || CURRENT_API_KEY_DATA.live?.keySecret || '',
        webhookSecret: CURRENT_API_KEY_DATA.webhookSecret || CURRENT_API_KEY_DATA.live?.webhookSecret || '',
        createdAt: CURRENT_API_KEY_DATA.createdAt || CURRENT_API_KEY_DATA.live?.createdAt || new Date().toISOString()
      };
    }

    async function fetchApiKeys() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/api-keys`);
        if (!res.ok) return;
        const data = await res.json();
        CURRENT_API_KEY_DATA = data;
        renderActiveApiKeys();
      } catch (e) {
        console.error('Failed to fetch api keys:', e);
      }
    }

    function renderActiveApiKeys() {
      const activeCreds = getActiveCredentials();
      if (!activeCreds) return;

      const keyIdEl = document.getElementById('displayApiKeyId');
      const keySecEl = document.getElementById('displayApiKeySecret');
      const dateEl = document.getElementById('displayApiKeyDate');
      const modalKeyId = document.getElementById('modalKeyId');
      const modalKeySecret = document.getElementById('modalKeySecret');
      const modalWebhookSecret = document.getElementById('modalWebhookSecret');

      if (keyIdEl) keyIdEl.textContent = activeCreds.keyId || 'Loading...';
      if (modalKeyId) modalKeyId.value = activeCreds.keyId || '';
      if (modalKeySecret) modalKeySecret.value = activeCreds.keySecret || '';
      if (modalWebhookSecret) modalWebhookSecret.value = activeCreds.webhookSecret || '';

      if (keySecEl) {
        if (DISPLAY_SECRET_REVEALED) {
          keySecEl.textContent = activeCreds.keySecret || '••••••••••••••••••••••••••••••••';
        } else {
          keySecEl.textContent = '••••••••••••••••••••••••••••••••';
        }
      }

      if (dateEl && activeCreds.createdAt) {
        dateEl.textContent = new Date(activeCreds.createdAt).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        });
      }

      updateWebhookSnippets();
      updateFrontendSnippet();
    }

    function toggleDisplaySecret() {
      DISPLAY_SECRET_REVEALED = !DISPLAY_SECRET_REVEALED;
      const btn = document.getElementById('btnToggleDisplaySecret');
      if (btn) btn.textContent = DISPLAY_SECRET_REVEALED ? '🔒' : '👁️';
      renderActiveApiKeys();
    }

    function copyDisplaySecret() {
      const activeCreds = getActiveCredentials();
      if (!activeCreds?.keySecret) return;
      navigator.clipboard.writeText(activeCreds.keySecret).then(() => {
        showAdminToast('Key Secret copied to clipboard! 📋');
      });
    }

    function copyElementText(elId, toastMsg) {
      const el = document.getElementById(elId);
      const text = el?.value || el?.textContent;
      if (!text) return;
      navigator.clipboard.writeText(text.trim()).then(() => {
        showAdminToast(toastMsg || 'Copied to clipboard!');
      });
    }

    async function generateApiKeyModal() {
      const activeCreds = getActiveCredentials();
      const isRegen = activeCreds && activeCreds.keyId;
      if (isRegen) {
        const confirmed = window.confirm(
          '⚠️ Regenerate API Key Pair?\n\n' +
          'This will generate a fresh Key ID and Key Secret. Any existing website or application using your old key will need to be updated with the new credentials.'
        );
        if (!confirmed) return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/api-keys/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId: CURRENT_MERCHANT?.id })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          CURRENT_API_KEY_DATA = data;
          DISPLAY_SECRET_REVEALED = true;
          renderActiveApiKeys();
          openApiKeyModal(data.keyId, data.keySecret, data.webhookSecret);
          showAdminToast('🎉 New API Key Pair generated successfully!');
        } else {
          showAdminToast(data.error || 'Failed to generate key.', false);
        }
      } catch (e) {
        showAdminToast('Network error generating API key.', false);
      }
    }

    function openApiKeyModal(keyId, keySecret, webhookSecret) {
      const modal = document.getElementById('modalApiKeyGenerated');
      if (!modal) return;
      const modalKeyId = document.getElementById('modalKeyId');
      const modalKeySecret = document.getElementById('modalKeySecret');
      const modalWebhookSecret = document.getElementById('modalWebhookSecret');
      if (modalKeyId) modalKeyId.value = keyId || '';
      if (modalKeySecret) modalKeySecret.value = keySecret || '';
      if (modalWebhookSecret) modalWebhookSecret.value = webhookSecret || '';
      modal.style.display = 'flex';
    }

    function closeApiKeyModal() {
      const modal = document.getElementById('modalApiKeyGenerated');
      if (modal) modal.style.display = 'none';
      DISPLAY_SECRET_REVEALED = false;
      renderActiveApiKeys();
    }

    function downloadEnvFile() {
      const creds = getActiveCredentials();
      if (!creds) return;
      const origin = window.location.origin || 'http://localhost:7000';
      const content = `# YOUPI PAYMENT GATEWAY API CREDENTIALS
# Generated on: ${new Date().toISOString()}

YOUPI_GATEWAY_URL="${origin}"
YOUPI_KEY_ID="${creds.keyId || ''}"
YOUPI_KEY_SECRET="${creds.keySecret || ''}"
YOUPI_WEBHOOK_SECRET="${creds.webhookSecret || ''}"
`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'youpi_credentials.env';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showAdminToast('Downloaded youpi_credentials.env file! 📥');
    }

    function initDeveloperStudio() {
      // 1. Fetch current API Keys from server
      fetchApiKeys();

      // 2. Populate URL if empty
      const targetInput = document.getElementById('testWebhookUrl');
      if (targetInput && !targetInput.value) {
        const savedUrl = document.getElementById('settingWebhookUrl')?.value.trim();
        targetInput.value = savedUrl || `${window.location.origin}/api/webhook`;
      }

      // 3. Randomize Order ID and UTR if default
      const orderInput = document.getElementById('testWebhookOrderId');
      if (orderInput && (!orderInput.value || orderInput.value === 'TEST-ORD-1001')) {
        randomizeOrderId();
      }
      const utrInput = document.getElementById('testWebhookUtr');
      if (utrInput && (!utrInput.value || utrInput.value === '428901284910')) {
        randomizeUtr();
      }

      // 4. Render verification and frontend snippets
      updateWebhookSnippets();
      updateFrontendSnippet();
    }

    function toggleSecretVisibility() {
      const input = document.getElementById('settingWebhookSecret');
      const btn = document.getElementById('btnToggleSecretVisibility');
      if (!input || !btn) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🔒 Hide';
      } else {
        input.type = 'password';
        btn.textContent = '👁️ Show';
      }
    }

    function copyWebhookSecret() {
      const input = document.getElementById('settingWebhookSecret');
      if (!input || !input.value) {
        showAdminToast('No webhook secret available to copy.', false);
        return;
      }
      navigator.clipboard.writeText(input.value).then(() => {
        showAdminToast('Webhook secret copied to clipboard! 📋');
      }).catch(() => {
        showAdminToast('Failed to copy to clipboard', false);
      });
    }

    async function regenerateWebhookSecret() {
      const confirmed = window.confirm(
        '⚠️ Are you sure you want to regenerate your Webhook Signing Secret?\n\n' +
        'Existing backend servers verifying signatures with your current secret will immediately fail verification until updated with the new secret.'
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/webhooks/regenerate-secret`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId: CURRENT_MERCHANT?.id })
        });
        const data = await res.json();
        if (res.ok && data.webhookSecret) {
          const secretInput = document.getElementById('settingWebhookSecret');
          if (secretInput) secretInput.value = data.webhookSecret;
          if (CURRENT_MERCHANT) CURRENT_MERCHANT.webhookSecret = data.webhookSecret;
          updateWebhookSnippets();
          showAdminToast('New webhook secret generated and saved! 🔑');
        } else {
          showAdminToast(data.error || 'Failed to regenerate secret.', false);
        }
      } catch (err) {
        showAdminToast('Network error regenerating secret.', false);
      }
    }

    function useSavedWebhookUrl() {
      const saved = document.getElementById('settingWebhookUrl')?.value.trim();
      const testInput = document.getElementById('testWebhookUrl');
      if (testInput) {
        testInput.value = saved || '';
        if (saved) showAdminToast('Loaded saved production webhook URL');
        else showAdminToast('No production URL saved yet. Please enter one.', false);
      }
    }

    function setTestUrlShortcut(url) {
      const testInput = document.getElementById('testWebhookUrl');
      if (testInput) {
        testInput.value = url;
        testInput.focus();
      }
    }

    function randomizeOrderId() {
      const input = document.getElementById('testWebhookOrderId');
      if (input) {
        input.value = `TEST-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      }
    }

    function randomizeUtr() {
      const input = document.getElementById('testWebhookUtr');
      if (input) {
        input.value = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      }
    }

    function onTestEventChanged() {
      const ev = document.getElementById('testWebhookEvent')?.value;
      if (ev === 'COD') {
        const utrInput = document.getElementById('testWebhookUtr');
        if (utrInput && !utrInput.value.startsWith('COD-')) {
          utrInput.value = `COD-${Math.floor(100000 + Math.random() * 900000)}`;
        }
      }
    }

    function switchWebhookConsoleTab(tab) {
      ACTIVE_CONSOLE_TAB = tab;
      const tabs = {
        response: document.getElementById('btnTabWebhookResponse'),
        payload: document.getElementById('btnTabWebhookPayload'),
        headers: document.getElementById('btnTabWebhookHeaders')
      };
      Object.keys(tabs).forEach(k => {
        if (tabs[k]) {
          if (k === tab) tabs[k].classList.add('active');
          else tabs[k].classList.remove('active');
        }
      });
      renderWebhookConsoleOutput();
    }

    function renderWebhookConsoleOutput() {
      const out = document.getElementById('testWebhookOutputWindow');
      if (!out) return;

      if (!LAST_TEST_RESULT) {
        out.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:260px; color:#64748b; text-align:center;">
            <div style="font-size:2.2rem; margin-bottom:0.75rem;">📡</div>
            <strong style="color:#94a3b8; font-size:0.95rem; margin-bottom:0.35rem;">Awaiting Webhook Dispatch</strong>
            <p style="max-width:320px; font-size:0.75rem; margin:0; line-height:1.4;">
              Configure parameters on the left and click <strong>⚡ Send Test Webhook</strong>. Your server's response code, latency, and headers will appear here in real-time.
            </p>
          </div>
        `;
        return;
      }

      const res = LAST_TEST_RESULT;

      if (ACTIVE_CONSOLE_TAB === 'response') {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        const color = isSuccess ? '#10b981' : (res.statusCode >= 500 || res.statusCode === 0 ? '#ef4444' : '#f59e0b');
        const statusLabel = res.statusCode ? `${res.statusCode} ${res.statusText || ''}` : `Error: ${res.error || 'Connection Failed'}`;

        let prettyBody = res.responseBody || '(Empty response body)';
        try {
          const parsed = JSON.parse(prettyBody);
          prettyBody = JSON.stringify(parsed, null, 2);
        } catch (_) {}

        out.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:#090d16; padding:0.6rem 0.85rem; border-radius:0.5rem; border:1px solid #1e293b;">
              <div>
                <span style="color:#64748b; font-size:0.75rem;">HTTP STATUS:</span>
                <strong style="color:${color}; font-size:0.88rem; margin-left:0.5rem;">${escapeHtml(statusLabel)}</strong>
              </div>
              <div>
                <span style="color:#64748b; font-size:0.75rem;">ROUNDTRIP:</span>
                <span style="color:#38bdf8; font-size:0.8rem; font-weight:700; margin-left:0.35rem;">${res.latencyMs}ms</span>
              </div>
            </div>

            <div>
              <div style="color:#94a3b8; font-size:0.75rem; font-weight:700; margin-bottom:0.35rem;">RESPONSE BODY FROM YOUR SERVER:</div>
              <pre style="margin:0; background:#040814; border:1px solid #1e293b; border-radius:0.5rem; padding:0.85rem; font-family:monospace; font-size:0.78rem; color:#cbd5e1; white-space:pre-wrap; word-break:break-all;">${escapeHtml(prettyBody)}</pre>
            </div>

            ${!isSuccess ? `
              <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:0.5rem; padding:0.75rem; font-size:0.75rem; color:#fca5a5; line-height:1.45;">
                ⚠️ <strong>Troubleshooting Guide:</strong> If your server returned a non-200 status:<br>
                • <strong>401 Unauthorized / Invalid Signature:</strong> Verify that you calculate HMAC-SHA256 over <em>raw unparsed request bytes</em> (e.g. <code>express.raw()</code> or <code>await req.text()</code>), NOT after JSON parsing.<br>
                • <strong>404 Not Found:</strong> Check that your webhook route path matches the target URL.<br>
                • <strong>Connection Error / ECONNREFUSED:</strong> Check if your local dev server is running on the specified port.
              </div>
            ` : `
              <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:0.5rem; padding:0.75rem; font-size:0.75rem; color:#6ee7b7; line-height:1.45;">
                ✓ <strong>Delivery Successful:</strong> Your server acknowledged the signed webhook with a 2xx success status code.
              </div>
            `}
          </div>
        `;
      } else if (ACTIVE_CONSOLE_TAB === 'payload') {
        const payloadStr = JSON.stringify(res.request?.payload || {}, null, 2);
        out.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
              <span style="color:#94a3b8; font-size:0.75rem; font-weight:700;">TRANSMITTED JSON PAYLOAD:</span>
              <button class="quick-pill-btn" onclick="navigator.clipboard.writeText('${escapeHtml(payloadStr).replace(/'/g, "\\'")}').then(() => showAdminToast('Payload copied!'))">📋 Copy JSON</button>
            </div>
            <pre style="margin:0; background:#040814; border:1px solid #1e293b; border-radius:0.5rem; padding:0.85rem; font-family:monospace; font-size:0.78rem; color:#a5f3fc; white-space:pre-wrap; word-break:break-all;">${escapeHtml(payloadStr)}</pre>
          </div>
        `;
      } else if (ACTIVE_CONSOLE_TAB === 'headers') {
        const headers = res.request?.headers || {};
        const rows = Object.entries(headers).map(([k, v]) => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="color:#38bdf8; font-weight:700; padding:6px 8px; font-family:monospace; font-size:0.75rem;">${escapeHtml(k)}</td>
            <td style="color:#cbd5e1; padding:6px 8px; font-family:monospace; font-size:0.75rem; word-break:break-all;">${escapeHtml(v)}</td>
          </tr>
        `).join('');

        out.innerHTML = `
          <div>
            <div style="color:#94a3b8; font-size:0.75rem; font-weight:700; margin-bottom:0.35rem;">OUTBOUND HTTP HEADERS:</div>
            <div style="border:1px solid #1e293b; border-radius:0.5rem; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse; background:#040814; font-size:0.75rem;">
                <thead>
                  <tr style="background:#090d16; border-bottom:1px solid #1e293b; color:#64748b; text-align:left;">
                    <th style="padding:6px 8px;">Header Name</th>
                    <th style="padding:6px 8px;">Header Value</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        `;
      }
    }

    async function sendTestWebhook() {
      const targetUrl = document.getElementById('testWebhookUrl')?.value.trim();
      const event = document.getElementById('testWebhookEvent')?.value || 'SUCCESS';
      const orderId = document.getElementById('testWebhookOrderId')?.value.trim() || `TEST-ORD-${Date.now().toString().slice(-6)}`;
      const amount = document.getElementById('testWebhookAmount')?.value.trim() || '499';
      const utr = document.getElementById('testWebhookUtr')?.value.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

      if (!targetUrl) {
        showAdminToast('Please specify a Target Webhook URL to test.', false);
        document.getElementById('testWebhookUrl')?.focus();
        return;
      }

      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        showAdminToast('Target Webhook URL must begin with http:// or https://', false);
        document.getElementById('testWebhookUrl')?.focus();
        return;
      }

      const btn = document.getElementById('btnSendTestWebhook');
      const oldHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite; margin-right:6px;"></span> Dispatching Event...';
      }

      const statusBadge = document.getElementById('testWebhookStatusBadge');
      const latencyPill = document.getElementById('testWebhookLatencyPill');
      if (statusBadge) {
        statusBadge.className = 'badge badge-info';
        statusBadge.textContent = 'DISPATCHING...';
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/webhooks/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl,
            event,
            orderId,
            amount,
            utr,
            merchantId: CURRENT_MERCHANT?.id
          })
        });

        const data = await res.json();
        LAST_TEST_RESULT = data;

        if (statusBadge) {
          if (data.statusCode >= 200 && data.statusCode < 300) {
            statusBadge.className = 'badge badge-success';
            statusBadge.textContent = `✓ ${data.statusCode} ${data.statusText || 'OK'}`;
          } else if (data.statusCode >= 400 && data.statusCode < 500) {
            statusBadge.className = 'badge badge-danger';
            statusBadge.textContent = `⚠ ${data.statusCode} ${data.statusText || 'Client Error'}`;
          } else if (data.statusCode >= 500) {
            statusBadge.className = 'badge badge-danger';
            statusBadge.textContent = `✕ ${data.statusCode} ${data.statusText || 'Server Error'}`;
          } else {
            statusBadge.className = 'badge badge-warning';
            statusBadge.textContent = `⚠ ${data.statusText || 'Connection Failed'}`;
          }
        }

        if (latencyPill) {
          latencyPill.textContent = `⚡ ${data.latencyMs} ms`;
        }

        switchWebhookConsoleTab('response');
        showAdminToast(`Webhook dispatched! Status: ${data.statusCode || data.statusText}`);
      } catch (err) {
        if (statusBadge) {
          statusBadge.className = 'badge badge-danger';
          statusBadge.textContent = 'REQUEST FAILED';
        }
        showAdminToast(`Webhook test failed: ${err.message}`, false);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = oldHtml;
        }
      }
    }

    function switchWebhookSnippetTab(lang) {
      ACTIVE_WEBHOOK_SNIPPET_LANG = lang;
      const tabs = {
        express: document.getElementById('tabLangExpress'),
        next: document.getElementById('tabLangNext'),
        fastapi: document.getElementById('tabLangFastAPI'),
        php: document.getElementById('tabLangPhp'),
        go: document.getElementById('tabLangGo')
      };
      Object.keys(tabs).forEach(k => {
        if (tabs[k]) {
          if (k === lang) tabs[k].classList.add('active');
          else tabs[k].classList.remove('active');
        }
      });
      updateWebhookSnippets();
    }

    function updateWebhookSnippets() {
      const secret = document.getElementById('settingWebhookSecret')?.value || 'YOUR_MERCHANT_WEBHOOK_SECRET';
      const codeBlock = document.getElementById('webhookSnippetCodeBlock');
      const titleSpan = document.getElementById('webhookSnippetLangTitle');
      if (!codeBlock) return;

      const snippets = {
        express: {
          title: 'Express.js Server Route (Node.js)',
          code: `import express from 'express';
import crypto from 'node:crypto';

const app = express();
const WEBHOOK_SECRET = process.env.YOUPI_WEBHOOK_SECRET || '${secret}';

// RAW BODY REQUIREMENT: Request bytes must NOT be parsed to JSON before HMAC calculation!
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-gateway-signature'] || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex');

  // Constant-time signature verification prevents timing attacks
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const payload = JSON.parse(req.body.toString('utf8'));

  // PAYMENT METHOD RULE:
  // event: "SUCCESS" is also sent for Cash on Delivery (method === 'COD').
  // Only fulfill digital goods/mark paid when method === 'UPI'!
  if (payload.event === 'SUCCESS' && payload.method === 'UPI') {
    console.log('✓ Payment confirmed! Order:', payload.orderId, 'UTR:', payload.utr, '₹' + payload.amount);
    // TODO: Authoritatively fulfill order in your database
  } else if (payload.event === 'SUCCESS' && payload.method === 'COD') {
    console.log('📦 Cash on delivery order placed:', payload.orderId);
  }

  res.status(200).json({ received: true });
});`
        },
        next: {
          title: 'Next.js App Router (app/api/webhook/route.ts)',
          code: `import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

const WEBHOOK_SECRET = process.env.YOUPI_WEBHOOK_SECRET || '${secret}';

export async function POST(req: NextRequest) {
  // Read raw body as text for HMAC verification
  const rawBody = await req.text();
  const signature = req.headers.get('x-gateway-signature') || '';

  const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  if (payload.event === 'SUCCESS' && payload.method === 'UPI') {
    console.log('✓ Payment verified! Order:', payload.orderId, 'UTR:', payload.utr);
    // TODO: Authoritatively mark order as PAID in your database
  }

  return NextResponse.json({ received: true });
}`
        },
        fastapi: {
          title: 'Python (FastAPI)',
          code: `import hmac, hashlib, json, os
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = os.getenv("YOUPI_WEBHOOK_SECRET", "${secret}").encode("utf-8")

@app.post("/api/webhook")
async def youpi_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("x-gateway-signature", "")

    expected = "sha256=" + hmac.new(WEBHOOK_SECRET, raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = json.loads(raw_body.decode("utf-8"))
    if payload.get("event") == "SUCCESS" and payload.get("method") == "UPI":
        print(f"✓ Payment verified! Order: {payload['orderId']}, UTR: {payload.get('utr')}")
        # TODO: Authoritatively fulfill order

    return {"received": True}`
        },
        php: {
          title: 'PHP (Vanilla / Laravel)',
          code: `<?php
$rawPayload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'] ?? '';
$secret = getenv('YOUPI_WEBHOOK_SECRET') ?: '${secret}';

$expected = 'sha256=' . hash_hmac('sha256', $rawPayload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit(json_encode(['error' => 'Invalid webhook signature']));
}

$payload = json_decode($rawPayload, true);
if (($payload['event'] ?? '') === 'SUCCESS' && ($payload['method'] ?? '') === 'UPI') {
    // Authoritatively mark order as PAID: $payload['orderId'], $payload['utr'], $payload['amount']
    error_log("Payment verified for order: " . $payload['orderId']);
}

http_response_code(200);
echo json_encode(['received' => true]);
?>`
        },
        go: {
          title: 'Go (net/http)',
          code: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
)

func youpiWebhookHandler(w http.ResponseWriter, r *http.Request) {
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	signature := r.Header.Get("X-Gateway-Signature")
	secret := []byte(os.Getenv("YOUPI_WEBHOOK_SECRET"))
	if len(secret) == 0 {
		secret = []byte("${secret}")
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write(rawBody)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expected)) {
		http.Error(w, "Invalid webhook signature", http.StatusUnauthorized)
		return
	}

	var payload struct {
		Event  string \`json:"event"\`
		OrderId string \`json:"orderId"\`
		UTR    string \`json:"utr"\`
		Method string \`json:"method"\`
		Amount string \`json:"amount"\`
	}
	if err := json.Unmarshal(rawBody, &payload); err == nil {
		if payload.Event == "SUCCESS" && payload.Method == "UPI" {
			// Authoritatively mark order as PAID in merchant database
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(\`{"received":true}\`))
}`
        }
      };

      const selected = snippets[ACTIVE_WEBHOOK_SNIPPET_LANG] || snippets.express;
      if (titleSpan) titleSpan.textContent = selected.title;
      codeBlock.textContent = selected.code;
    }

    function updateFrontendSnippet() {
      const block = document.getElementById('frontendSnippetCodeBlock');
      if (!block) return;
      const origin = window.location.origin || 'http://localhost:7000';
      const merchantKey = CURRENT_API_KEY_DATA?.keyId || CURRENT_MERCHANT?.id || 'YOUR_KEY_ID';

      block.textContent = `<!-- 1. Universal One-Script Integration (Razorpay Style) -->
<script 
  src="${origin}/youpi.js" 
  data-youpi-key="${merchantKey}">
</script>

<!-- 2. Zero-JS Button: Automatically opens responsive checkout modal -->
<button 
  data-youpi-pay 
  data-order-id="ORDER-1001" 
  data-amount="499"
  data-customer-name="Customer Name"
  data-customer-phone="9876543210">
  Pay ₹499 via UPI
</button>

<!-- 3. (Optional) Browser Event Listener for instant UI updates -->
<script>
  window.addEventListener('youpi:payment:success', (e) => {
    console.log('Payment modal completed:', e.detail);
    // UI update only: Wait for server webhook before fulfilling physical or digital goods!
  });
</script>`;
    }

    function copyActiveWebhookSnippet() {
      const code = document.getElementById('webhookSnippetCodeBlock')?.textContent;
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btnCopyWebhookSnippet');
        if (btn) {
          btn.textContent = '✓ Copied!';
          setTimeout(() => { btn.textContent = '📋 Copy Code'; }, 2000);
        }
        showAdminToast('Verification code copied to clipboard!');
      });
    }

    function copyFrontendSnippet() {
      const code = document.getElementById('frontendSnippetCodeBlock')?.textContent;
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        showAdminToast('Frontend embed snippet copied to clipboard! 📋');
      });
    }

    // Expose all functions to window for onclick handlers
    window.initDeveloperStudio = initDeveloperStudio;
    window.fetchApiKeys = fetchApiKeys;
    window.generateApiKeyModal = generateApiKeyModal;
    window.openApiKeyModal = openApiKeyModal;
    window.closeApiKeyModal = closeApiKeyModal;
    window.downloadEnvFile = downloadEnvFile;
    window.toggleDisplaySecret = toggleDisplaySecret;
    window.copyDisplaySecret = copyDisplaySecret;
    window.copyElementText = copyElementText;
    window.toggleSecretVisibility = toggleSecretVisibility;
    window.copyWebhookSecret = copyWebhookSecret;
    window.regenerateWebhookSecret = regenerateWebhookSecret;
    window.useSavedWebhookUrl = useSavedWebhookUrl;
    window.setTestUrlShortcut = setTestUrlShortcut;
    window.randomizeOrderId = randomizeOrderId;
    window.randomizeUtr = randomizeUtr;
    window.onTestEventChanged = onTestEventChanged;
    window.switchWebhookConsoleTab = switchWebhookConsoleTab;
    window.sendTestWebhook = sendTestWebhook;
    window.switchWebhookSnippetTab = switchWebhookSnippetTab;
    window.updateWebhookSnippets = updateWebhookSnippets;
    window.updateFrontendSnippet = updateFrontendSnippet;
    window.copyActiveWebhookSnippet = copyActiveWebhookSnippet;
    window.copyFrontendSnippet = copyFrontendSnippet;


