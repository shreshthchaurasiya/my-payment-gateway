// --- CORE NAVIGATION & THEME ---
    // --- ALWAYS CLEAN BRIGHT WHITE THEME ---
    function updateThemeForSection(sectionId) {
      applyTheme('light');
    }

    function applyTheme(theme = 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-theme', 'light');

      const icon = document.getElementById('headerThemeIcon');
      const text = document.getElementById('headerThemeText');
      if (icon) icon.textContent = '☀️';
      if (text) text.textContent = 'Bright White';
    }

    function toggleThemeManual() {
      applyTheme('light');
    }

    // --- CASHFREE / RAZORPAY NAVIGATION CONTROLLERS ---
    function toggleMobileSidebar() {
      document.body.classList.toggle('sidebar-open');
    }

    function closeMobileSidebar() {
      document.body.classList.remove('sidebar-open');
    }

    function navigateTo(sectionId, subViewId) {
      switchSection(sectionId, subViewId);
      closeMobileSidebar();
    }

    function updateSidebarActiveItem(sectionId, subViewId) {
      document.querySelectorAll('.cf-nav-item').forEach(item => {
        const itemSec = item.getAttribute('data-sec');
        const itemSub = item.getAttribute('data-sub');
        if (itemSec === sectionId && (!subViewId || itemSub === subViewId)) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    function updateBreadcrumbs(sectionId, subViewId) {
      const secNames = {
        operations: 'Daily Operations',
        storeSettings: 'Store & Checkout',
        developerHub: 'Developer Hub',
        security: 'Risk & Security'
      };
      const subNames = {
        subViewOpsLive: 'Live Monitor & Slots',
        subViewOpsLinks: 'Payment Links',
        subViewOpsClients: 'Clients & Merchants',
        subViewOpsCounter: 'Counter Desk (POS)',
        subViewOpsTransactions: 'Transactions Ledger',
        subViewOpsObservers: 'Payment Observers Status',
        subViewStoreBrand: 'Brand Identity & Live Mockup',
        subViewStoreVpa: 'Receiving Accounts (VPAs)',
        subViewStoreModes: 'Selling Modes & Modalities',
        subViewDevSimulator: 'Bank SMS Simulator',
        subViewDevSupervisor: 'System Supervisor & Store',
        subViewDevCloudflare: 'Cloudflare Tunnel',
        subViewDevWebhooks: 'API Keys & Webhooks',
        subViewDevAndroid: 'Android SMS Hub',
        subViewDevProtocols: 'Gmail & WhatsApp Protocols',
        subViewSecBanned: 'Banned Users',
        subViewSecEvents: 'Security Events',
        subViewSecHistory: 'Ban History'
      };
      const bSec = document.getElementById('cfBreadcrumbSec');
      const bCurr = document.getElementById('cfBreadcrumbCurr');
      if (bSec) bSec.textContent = secNames[sectionId] || sectionId;
      if (bCurr) bCurr.textContent = subNames[subViewId] || subViewId || 'Overview';
    }

    // --- NAVIGATION CONTROLLER: 3 HIGH-LEVEL SECTIONS ---
    function switchSection(sectionId, targetSubTab = null) {
      if (targetSubTab === 'subTabGmail') targetSubTab = 'subViewDevProtocols';
      if (targetSubTab === 'subTabAndroid') targetSubTab = 'subViewDevAndroid';
      if (targetSubTab === 'subTabVpa') targetSubTab = 'subViewStoreVpa';

      activeSection = sectionId;
      manualThemeOverride = null; // Auto-switching restores when navigating tabs
      updateThemeForSection(sectionId);

      // Sync URL hash without jumping
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', `#${sectionId}`);
        } else {
          window.location.hash = sectionId;
        }
      } catch (e) { }

      // Update main nav buttons
      document.querySelectorAll('.main-nav-btn').forEach(b => b.classList.remove('active'));
      const navBtn = document.getElementById('mainNav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
      if (navBtn) navBtn.classList.add('active');

      // Show/hide sections
      document.getElementById('sectionOperations').hidden = (sectionId !== 'operations');
      document.getElementById('sectionStoreSettings').hidden = (sectionId !== 'storeSettings');
      document.getElementById('sectionDeveloperHub').hidden = (sectionId !== 'developerHub');
      document.getElementById('sectionSecurity').hidden = (sectionId !== 'security');

      // Update sidebar active highlight
      updateSidebarActiveItem(sectionId, targetSubTab);

      // Render sub-navigation bar
      renderSubNavBar(sectionId, targetSubTab);

      // Initial triggers
      if (sectionId === 'operations') {
        fetchLiveData();
      } else if (sectionId === 'storeSettings') {
        if (!settingsLoaded) fetchGatewaySettings();
      } else if (sectionId === 'developerHub') {
        const isMerchant = CURRENT_USER && CURRENT_USER.role === 'MERCHANT';
        if (!isMerchant) {
          loadServices();
          connectServicesLogsSse();
          fetchTunnelStatus();
        }
      } else if (sectionId === 'security') {
        fetchBannedUsers();
      }
    }

    function renderSubNavBar(sectionId, targetSubTab = null) {
      const subNav = document.getElementById('subNavBar');
      subNav.innerHTML = '';

      const isMerchant = CURRENT_USER && CURRENT_USER.role === 'MERCHANT';

      let items = [];
      if (sectionId === 'operations') {
        items = [
          { id: 'subViewOpsLive', label: '📊 Live Monitor & Slots', viewId: 'subViewOpsLive' },
          { id: 'subViewOpsLinks', label: '🔗 Payment Links', viewId: 'subViewOpsLinks' },
          ...(!isMerchant ? [{ id: 'subViewOpsClients', label: '👥 Clients & Merchants', viewId: 'subViewOpsClients' }] : []),
          { id: 'subViewOpsCounter', label: '🏪 Counter Desk (POS Cashier)', viewId: 'subViewOpsCounter' },
          { id: 'subViewOpsTransactions', label: '💳 Transactions Ledger', viewId: 'subViewOpsTransactions' },
          { id: 'subViewOpsObservers', label: '📡 Payment Observers Status', viewId: 'subViewOpsObservers' }
        ];
      } else if (sectionId === 'storeSettings') {
        items = [
          { id: 'subViewStoreBrand', label: '🎨 Brand Identity & Live Mockup', viewId: 'subViewStoreBrand' },
          { id: 'subViewStoreVpa', label: '⚡ Receiving Accounts (VPAs)', viewId: 'subViewStoreVpa' },
          { id: 'subViewStoreModes', label: '🏬 Selling Modes & Modalities', viewId: 'subViewStoreModes' }
        ];
      } else if (sectionId === 'developerHub') {
        items = [
          { id: 'subViewDevWebhooks', label: '🔑 API Keys & Webhooks', viewId: 'subViewDevWebhooks' },
          { id: 'subViewDevSimulator', label: '🎮 Bank SMS Simulator', viewId: 'subViewDevSimulator' },
          ...(!isMerchant ? [
            { id: 'subViewDevSupervisor', label: '🖥️ System Supervisor & Store (5000)', viewId: 'subViewDevSupervisor' },
            { id: 'subViewDevCloudflare', label: '☁️ Cloudflare Tunnel', viewId: 'subViewDevCloudflare' }
          ] : []),
          { id: 'subViewDevAndroid', label: '📱 Android SMS Hub', viewId: 'subViewDevAndroid' },
          { id: 'subViewDevProtocols', label: '📧 Gmail & WhatsApp Protocols', viewId: 'subViewDevProtocols' }
        ];
      } else if (sectionId === 'security') {
        items = [
          { id: 'subViewSecBanned', label: '🚫 Banned Users', viewId: 'subViewSecBanned' },
          { id: 'subViewSecEvents', label: '🚨 Security Events', viewId: 'subViewSecEvents' },
          { id: 'subViewSecHistory', label: '📜 Ban History', viewId: 'subViewSecHistory' }
        ];
      }

      let defaultSub = targetSubTab || items[0].id;
      items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = `sub-nav-pill ${item.id === defaultSub ? 'active' : ''}`;
        btn.textContent = item.label;
        btn.onclick = () => switchSubView(sectionId, item.id);
        subNav.appendChild(btn);
      });

      switchSubView(sectionId, defaultSub);
    }

    function switchSubView(sectionId, subViewId) {
      activeSubTab = subViewId;

      // Update pill styles
      document.querySelectorAll('.sub-nav-pill').forEach(p => {
        p.classList.remove('active');
        if (p.onclick.toString().includes(subViewId)) p.classList.add('active');
      });

      // Update sidebar item active
      updateSidebarActiveItem(sectionId, subViewId);
      updateBreadcrumbs(sectionId, subViewId);

      // Hide all sub-views in current section and show target
      const parent = document.getElementById(
        sectionId === 'operations' ? 'sectionOperations' :
          sectionId === 'storeSettings' ? 'sectionStoreSettings' :
            sectionId === 'developerHub' ? 'sectionDeveloperHub' : 'sectionSecurity'
      );
      Array.from(parent.children).forEach(child => {
        if (child.id && child.id.startsWith('subView')) {
          child.hidden = (child.id !== subViewId);
        }
      });

      if (subViewId === 'subViewOpsLinks') {
        loadPaymentLinksLedger();
      }
      if (subViewId === 'subViewDevSimulator') {
        initPaymentSimulator();
      }
      if (subViewId === 'subViewOpsClients') {
        loadAdminClients();
      }
      if (subViewId === 'subViewOpsCounter') {
        if (currentSellingMode === 'ONLINE') fetchCodOrders();
        else fetchCounterPayments();
      }
      if (subViewId === 'subViewOpsTransactions') fetchPaymentsLedger();
      if (subViewId === 'subViewOpsObservers') fetchObserversStatus();
      if (subViewId === 'subViewDevAndroid') {
        fetchObserversStatus();
        fetchSmsPairQr();
      }
      if (subViewId === 'subViewDevProtocols') {
        fetchWhatsAppStatus();
        fetchGmailCredentials();
      }
      if (subViewId === 'subViewDevWebhooks') {
        if (!settingsLoaded) fetchGatewaySettings();
        if (typeof initDeveloperStudio === 'function') initDeveloperStudio();
      }
      if (subViewId === 'subViewDevSupervisor') {
        loadServices();
        fetchFalseNarrativeStatus();
      }
      if (subViewId === 'subViewSecBanned') fetchBannedUsers();
      if (subViewId === 'subViewSecEvents') fetchSecurityEvents();
      if (subViewId === 'subViewSecHistory') fetchSecurityHistory();
    }

