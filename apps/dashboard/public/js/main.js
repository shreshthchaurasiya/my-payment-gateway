// --- GATEWAY BOOTSTRAPPER & TIMERS ---
    // --- INITIALIZATION ---
    const validSections = ['operations', 'storeSettings', 'developerHub', 'security'];
    const hashSec = (window.location.hash || '').replace('#', '').trim();
    const searchSec = new URLSearchParams(window.location.search).get('section');
    const initialSec = validSections.includes(hashSec) ? hashSec : (validSections.includes(searchSec) ? searchSec : 'operations');
    switchSection(initialSec);

    window.addEventListener('hashchange', () => {
      const h = (window.location.hash || '').replace('#', '').trim();
      if (validSections.includes(h) && h !== activeSection) {
        switchSection(h);
      }
    });

    const isUserMerchant = CURRENT_USER && CURRENT_USER.role === 'MERCHANT';

    fetchGatewaySettings();
    fetchObserversStatus();
    fetchWhatsAppStatus();
    pollGlobalCounterPending();

    pollingTimer = setInterval(fetchLiveData, 2500);
    setInterval(pollGlobalCounterPending, 4000);
    setInterval(fetchWhatsAppStatus, 4000);
    setInterval(fetchSmsGatewayDevices, 3500);

    if (!isUserMerchant) {
      loadServices();
      fetchFalseNarrativeStatus();
      fetchTestModeStatus();
      connectServicesLogsSse();
      connectAdminEventsSse();
      setInterval(fetchTunnelStatus, 4000);
      setInterval(loadServices, 5000);
      setInterval(fetchFalseNarrativeStatus, 15000);
      setInterval(fetchTestModeStatus, 15000);
    }
