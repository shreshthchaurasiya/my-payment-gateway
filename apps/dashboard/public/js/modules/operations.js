// --- OPERATIONS, LEDGER & SUPERVISOR ---
    // --- MERGED CONTROL CENTER & SYSTEM SUPERVISOR ---
    async function loadServices() {
      try {
        const res = await fetch('/api/services');
        if (!res.ok) throw new Error('Supervisor unreachable');
        servicesList = await res.json();
        renderServicesTable(servicesList);
        updateYoupiStoreStatus(servicesList);
      } catch (e) {
        console.warn('loadServices error:', e);
        const tbody = document.getElementById('servicesTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:1.5rem;">⚠️ Supervisor API unavailable (Port 8090). Ensure services are running.</td></tr>`;
      }
    }

    function renderServicesTable(services) {
      const tbody = document.getElementById('servicesTableBody');
      if (!tbody) return;

      if (!services || services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No managed services registered.</td></tr>`;
        return;
      }

      tbody.innerHTML = services.map(s => {
        const isRunning = s.status === 'RUNNING';
        const isStarting = s.status === 'STARTING';
        const badgeClass = isRunning ? 'badge-success' : (isStarting ? 'badge-warning' : 'badge-danger');
        const statusIcon = isRunning ? '🟢' : (isStarting ? '🟡' : '🔴');

        const upSec = s.uptimeSeconds || 0;
        const uptimeStr = isRunning
          ? (upSec >= 3600 ? `${Math.floor(upSec / 3600)}h ${Math.floor((upSec % 3600) / 60)}m` : `${Math.floor(upSec / 60)}m ${upSec % 60}s`)
          : '-';

        const isStore = s.id === 'coin-wallet-store';

        return `
        <tr style="${isStore ? 'background:rgba(56,189,248,0.03);' : ''}">
          <td>
            <strong>${escapeHtml(s.name)}</strong>
            ${isStore ? '<span class="badge badge-info" style="font-size:0.68rem; margin-left:0.4rem;">Demo Store</span>' : ''}
            <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${escapeHtml(s.id)}</div>
          </td>
          <td><code style="color:#f59e0b; background:#070c17; padding:2px 6px; border-radius:4px; font-weight:700;">${s.port}</code></td>
          <td><code style="color:#38bdf8;">${s.pid || '-'}</code></td>
          <td><span class="badge ${badgeClass}">${statusIcon} ${s.status}</span></td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${uptimeStr}</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              ${!isRunning ? `
                <button class="btn btn-success" style="padding:0.3rem 0.65rem; font-size:0.75rem;" onclick="startService('${s.id}')">▶ Start</button>
              ` : `
                <button class="btn btn-danger" style="padding:0.3rem 0.65rem; font-size:0.75rem;" onclick="stopService('${s.id}')">⏹ Stop</button>
                <button class="btn btn-secondary" style="padding:0.3rem 0.65rem; font-size:0.75rem;" onclick="restartService('${s.id}')">🔄 Restart</button>
              `}
              ${isRunning && s.port ? `
                <a href="http://localhost:${s.port}" target="_blank" class="btn btn-secondary" style="padding:0.3rem 0.55rem; font-size:0.75rem; text-decoration:none;" title="Open in browser">↗</a>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
      }).join('');
    }

    // --- YOUPI SHOWCASE STORE (PORT 5000) MASTER SWITCH ---
    function updateYoupiStoreStatus(services) {
      const store = services.find(s => s.id === 'coin-wallet-store');
      const isRunning = store && store.status === 'RUNNING';

      // 1. Header Badge
      const hBadge = document.getElementById('headerStoreBadge');
      const hText = document.getElementById('headerStoreText');
      const hDot = document.getElementById('headerStoreDot');
      if (hBadge && hText) {
        if (isRunning) {
          hBadge.className = 'store-switch-badge is-online';
          hText.textContent = 'Store (5000): ONLINE';
          hDot.textContent = '🟢';
        } else {
          hBadge.className = 'store-switch-badge is-offline';
          hText.textContent = 'Store (5000): DISABLED';
          hDot.textContent = '🔴';
        }
      }

      // 2. Developer Card
      const cBadge = document.getElementById('cardStoreBadge');
      const btnToggle = document.getElementById('btnToggleYoupiStore') || document.getElementById('btnToggleGamerVaultStore');
      const btnLink = document.getElementById('btnOpenStoreLink');
      if (cBadge && btnToggle) {
        if (isRunning) {
          cBadge.className = 'badge badge-success';
          cBadge.textContent = '🟢 ONLINE & ACTIVE (PORT 5000)';
          btnToggle.className = 'btn btn-danger';
          btnToggle.innerHTML = '⏹ Disable YOUPI Store (Port 5000)';
          if (btnLink) btnLink.style.display = 'inline-flex';
        } else {
          cBadge.className = 'badge badge-danger';
          cBadge.textContent = '🔴 DISABLED (PORT 5000 FREE)';
          btnToggle.className = 'btn btn-success';
          btnToggle.innerHTML = '▶ Enable YOUPI Store (Port 5000)';
          if (btnLink) btnLink.style.display = 'none';
        }
      }
    }

    async function toggleYoupiStore() {
      const store = servicesList.find(s => s.id === 'coin-wallet-store');
      const isRunning = store && store.status === 'RUNNING';

      if (isRunning) {
        await stopService('coin-wallet-store');
        showAdminToast('YOUPI Showcase Store disabled. Port 5000 freed.');
      } else {
        await startService('coin-wallet-store');
        showAdminToast('YOUPI Showcase Store enabled on port 5000!');
      }
    }

    // Compatibility aliases
    window.updateGamerVaultStoreStatus = updateYoupiStoreStatus;
    window.toggleGamerVaultStore = toggleYoupiStore;

    async function startService(id) {
      try {
        const res = await fetch(`/api/services/${id}/start`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) alert(data.error || 'Failed to start service');
        loadServices();
      } catch (e) {
        alert('Network error starting service');
      }
    }

    async function stopService(id) {
      try {
        const res = await fetch(`/api/services/${id}/stop`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) alert(data.error || 'Failed to stop service');
        loadServices();
      } catch (e) {
        alert('Network error stopping service');
      }
    }

    async function restartService(id) {
      try {
        const res = await fetch(`/api/services/${id}/restart`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) alert(data.error || 'Failed to restart service');
        loadServices();
      } catch (e) {
        alert('Network error restarting service');
      }
    }

    async function startAllServices() {
      try {
        await fetch('/api/services/start-all', { method: 'POST' });
        showAdminToast('Starting all modular services...');
        setTimeout(loadServices, 1000);
      } catch (e) { }
    }

    async function stopAllServices() {
      if (!confirm('Are you sure you want to stop all background gateway services? (Control supervisor will remain online).')) return;
      try {
        await fetch('/api/services/stop-all', { method: 'POST' });
        showAdminToast('Stopping all services...');
        setTimeout(loadServices, 1000);
      } catch (e) { }
    }

    // --- LIVE AGGREGATE TERMINAL LOGS (SSE) ---
    let rawLogsBuffer = [];
    function connectServicesLogsSse() {
      if (servicesLogsSse) return;
      try {
        const tok = window.__youpiAdminAuth.token();
        servicesLogsSse = new EventSource('/api/logs/stream' + (tok ? `?token=${encodeURIComponent(tok)}` : ''));
        servicesLogsSse.addEventListener('log', (e) => {
          try {
            const entry = JSON.parse(e.data);
            appendLogEntry(entry);
          } catch { }
        });
        servicesLogsSse.addEventListener('status_change', () => {
          loadServices();
        });
        servicesLogsSse.onerror = () => {
          servicesLogsSse.close();
          servicesLogsSse = null;
          setTimeout(connectServicesLogsSse, 5000);
        };
      } catch (e) { }
    }

    function appendLogEntry(entry) {
      rawLogsBuffer.push(entry);
      if (rawLogsBuffer.length > 500) rawLogsBuffer.shift();

      const filterVal = document.getElementById('logServiceFilter')?.value || 'ALL';
      if (filterVal !== 'ALL' && entry.serviceId !== filterVal) return;

      const term = document.getElementById('terminalLogWindow');
      if (!term) return;

      const div = document.createElement('div');
      div.className = `log-line ${entry.stream === 'stderr' ? 'log-stderr' : (entry.stream === 'system' ? 'log-system' : '')}`;

      const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
      div.innerHTML = `<span class="log-ts">[${timeStr}]</span><span class="log-svc">[${escapeHtml(entry.serviceId)}]</span>${escapeHtml(entry.line)}`;

      term.appendChild(div);
      if (term.children.length > 300) term.removeChild(term.firstChild);
      term.scrollTop = term.scrollHeight;
    }

    function filterLogs() {
      const filterVal = document.getElementById('logServiceFilter')?.value || 'ALL';
      const term = document.getElementById('terminalLogWindow');
      if (!term) return;
      term.innerHTML = '';
      rawLogsBuffer.forEach(entry => {
        if (filterVal === 'ALL' || entry.serviceId === filterVal) {
          const div = document.createElement('div');
          div.className = `log-line ${entry.stream === 'stderr' ? 'log-stderr' : (entry.stream === 'system' ? 'log-system' : '')}`;
          const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
          div.innerHTML = `<span class="log-ts">[${timeStr}]</span><span class="log-svc">[${escapeHtml(entry.serviceId)}]</span>${escapeHtml(entry.line)}`;
          term.appendChild(div);
        }
      });
      term.scrollTop = term.scrollHeight;
    }

    function clearLogsConsole() {
      const term = document.getElementById('terminalLogWindow');
      if (term) term.innerHTML = `<div class="log-line log-system"><span class="log-ts">[Cleared]</span> Console cleared by merchant.</div>`;
    }

    // --- SELLING MODE & PAYMENT MODALITIES ---
    function setSellingMode(mode, save = false) {
      currentSellingMode = (mode === 'OFFLINE') ? 'OFFLINE' : 'ONLINE';
      const cardOnline = document.getElementById('cardModeOnline');
      const cardOffline = document.getElementById('cardModeOffline');
      const badgeOnline = document.getElementById('badgeOnlineActive');
      const badgeOffline = document.getElementById('badgeOfflineActive');
      const panelOnline = document.getElementById('panelOnlineMode');
      const panelOffline = document.getElementById('panelOfflineMode');
      const modeBadge = document.getElementById('currentSellingModeBadge');
      const codCard = document.getElementById('counterDeskCodCard');
      const offlineCard = document.getElementById('counterDeskOfflineCard');

      if (currentSellingMode === 'ONLINE') {
        if (cardOnline) {
          cardOnline.className = 'selling-mode-card mode-selected-online';
        }
        if (cardOffline) {
          cardOffline.className = 'selling-mode-card';
        }
        if (badgeOnline) badgeOnline.style.display = 'inline-block';
        if (badgeOffline) badgeOffline.style.display = 'none';
        if (panelOnline) panelOnline.hidden = false;
        if (panelOffline) panelOffline.hidden = true;
        if (modeBadge) { modeBadge.textContent = 'ONLINE SELLING MODE'; modeBadge.className = 'badge badge-info'; }
        if (codCard) codCard.style.display = 'block';
        if (offlineCard) offlineCard.style.display = 'none';
      } else {
        if (cardOffline) {
          cardOffline.className = 'selling-mode-card mode-selected-offline';
        }
        if (cardOnline) {
          cardOnline.className = 'selling-mode-card';
        }
        if (badgeOffline) badgeOffline.style.display = 'inline-block';
        if (badgeOnline) badgeOnline.style.display = 'none';
        if (panelOnline) panelOnline.hidden = true;
        if (panelOffline) panelOffline.hidden = false;
        if (modeBadge) { modeBadge.textContent = 'OFFLINE SELLING MODE'; modeBadge.className = 'badge badge-warning'; }
        if (codCard) codCard.style.display = 'none';
        if (offlineCard) offlineCard.style.display = 'block';
      }

      if (save) {
        saveMerchantBrandingAndToggles();
      }
    }

    // --- LIVE AUTO-POLLING (2.5s) ---
    async function fetchLiveData() {
      try {
        const mParam = (typeof currentMerchantId !== 'undefined' && currentMerchantId) ? `?merchantId=${encodeURIComponent(currentMerchantId)}` : '';
        const qRes = await fetch(`${API_BASE}/api/v1/admin/queue${mParam}`);
        const qData = await qRes.json();
        renderSlotActive(qData.currentSlot);
        renderSlotProcessing(qData.currentSlot);
        renderQueueTable(qData.queue || []);

        const pRes = await fetch(`${API_BASE}/api/v1/admin/payments${mParam}`);
        const pData = await pRes.json();
        updateKpis(pData.payments || [], qData.queue || []);

        if (activeSection === 'operations' && activeSubTab === 'subViewOpsCounter') {
          if (currentSellingMode === 'ONLINE') fetchCodOrders();
          else renderCounterDesk(pData.payments || []);
        }
      } catch (e) { }
    }

    function renderSlotActive(currentSlot) {
      const box = document.getElementById('slotActiveBox');
      const content = document.getElementById('slotActiveContent');
      if (!box || !content) return;

      if (currentSlot && currentSlot.status === 'ACTIVE') {
        box.className = 'slot-card busy-active';
        const remainingSec = currentSlot.expiresAt ? Math.max(0, Math.ceil((new Date(currentSlot.expiresAt).getTime() - Date.now()) / 1000)) : 0;
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        content.innerHTML = `
        <div style="font-size:1.75rem; font-weight:800; color:#38bdf8;">₹${(Number(currentSlot.amountPaise) / 100).toFixed(2)}</div>
        <div style="font-weight:700; margin:0.35rem 0;">Order #${escapeHtml(currentSlot.orderId)}</div>
        <div class="badge badge-info">ACTIVE (⏱ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} remaining)</div>
      `;
      } else {
        box.className = 'slot-card';
        content.innerHTML = '<div style="color:var(--text-muted); padding:1rem 0;">No customer actively checking out.</div>';
      }
    }

    function renderSlotProcessing(currentSlot) {
      const box = document.getElementById('slotProcBox');
      const content = document.getElementById('slotProcContent');
      if (!box || !content) return;

      if (currentSlot && currentSlot.status === 'PROCESSING') {
        box.className = 'slot-card busy-proc';
        const remainingSec = currentSlot.processingExpiresAt ? Math.max(0, Math.ceil((new Date(currentSlot.processingExpiresAt).getTime() - Date.now()) / 1000)) : 0;
        content.innerHTML = `
        <div style="font-size:1.75rem; font-weight:800; color:#fbbf24;">₹${(Number(currentSlot.amountPaise) / 100).toFixed(2)}</div>
        <div style="font-weight:700; margin:0.35rem 0;">Order #${escapeHtml(currentSlot.orderId)}</div>
        <div class="badge badge-warning">VERIFYING (⏳ ${remainingSec}s remaining)</div>
      `;
      } else {
        box.className = 'slot-card';
        content.innerHTML = '<div style="color:var(--text-muted); padding:1rem 0;">No payment in verification.</div>';
      }
    }

    function renderQueueTable(queue) {
      const tbody = document.getElementById('queueTableBody');
      if (!tbody) return;
      if (!queue || queue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1rem;">Waiting queue is empty.</td></tr>';
        return;
      }
      tbody.innerHTML = queue.map(q => `
      <tr>
        <td><strong>#${q.queuePosition}</strong></td>
        <td>Order #${escapeHtml(q.orderId)}</td>
        <td>₹${(Number(q.amountPaise) / 100).toFixed(2)}</td>
        <td><span class="badge badge-warning">QUEUED</span></td>
        <td>${new Date(q.createdAt).toLocaleTimeString()}</td>
      </tr>
    `).join('');
    }

    function updateKpis(payments, queue) {
      let successVol = 0;
      let successCount = 0;
      let pendingCounter = 0;
      let singleVerify = 0;
      let dualVerify = 0;

      payments.forEach(p => {
        if (p.status === 'SUCCESS') {
          successCount++;
          successVol += Number(p.amountPaise);
          if (p.verificationLevel >= 2) dualVerify++;
          else singleVerify++;
        }
        if (p.status === 'ACTIVE' && (p.method === 'CASH_COUNTER' || p.method === 'CARD_COUNTER')) {
          pendingCounter++;
        }
      });

      const kVol = document.getElementById('kpiVol');
      const kSuccess = document.getElementById('kpiSuccessCount');
      const kQueue = document.getElementById('kpiQueueCount');
      const kPending = document.getElementById('kpiPendingCounterCount');
      const kSingle = document.getElementById('kpiSingleVerify');
      const kDual = document.getElementById('kpiDualVerify');

      if (kVol) kVol.textContent = `₹${(successVol / 100).toFixed(2)}`;
      if (kSuccess) kSuccess.textContent = successCount;
      if (kQueue) kQueue.textContent = queue.length;
      if (kPending) kPending.textContent = pendingCounter;
      if (kSingle) kSingle.textContent = singleVerify;
      if (kDual) kDual.textContent = dualVerify;
    }

    async function promptClearAllQueue() {
      if (!confirm('Are you sure you want to clear the entire UPI waiting queue? All currently queued sessions will be expired automatically.')) return;
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/queue/clear`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          showAdminToast(`UPI Queue Cleared! Expired ${data.clearedCount || 0} queued sessions.`);
          fetchLiveData();
        } else {
          alert(data.error || 'Failed to clear queue');
        }
      } catch (e) {
        alert('Network error clearing queue');
      }
    }

    // --- COUNTER DESK (POS CASHIER) ---
    async function fetchCounterPayments() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/payments`);
        const data = await res.json();
        renderCounterDesk(data.payments || []);
      } catch (e) { }
    }

    function renderCounterDesk(payments) {
      const pending = payments.filter(p => p.status === 'ACTIVE' && (p.method === 'CASH_COUNTER' || p.method === 'CARD_COUNTER'));
      const tbody = document.getElementById('counterTableBody');
      if (!tbody) return;

      if (!pending || pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No pending counter payments right now.</td></tr>';
        return;
      }

      tbody.innerHTML = pending.map(p => `
      <tr>
        <td><strong>Order #${escapeHtml(p.orderId)}</strong></td>
        <td><code style="font-size:0.75rem;">${p.id.substring(0, 16)}...</code></td>
        <td><strong style="color:#34d399; font-size:1.15rem;">₹${(Number(p.amountPaise) / 100).toFixed(2)}</strong></td>
        <td>
          <span class="badge ${p.method === 'CASH_COUNTER' ? 'badge-success' : 'badge-info'}">
            ${p.method === 'CASH_COUNTER' ? '💵 Cash at Till' : '💳 Card at POS'}
          </span>
        </td>
        <td>${new Date(p.createdAt).toLocaleTimeString()}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-success" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="confirmCounterPayment('${p.id}', '${p.method}')">✓ Approve</button>
            <button class="btn btn-danger" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="declineCounterPayment('${p.id}', '${p.method}')">✕ Decline</button>
          </div>
        </td>
      </tr>
    `).join('');
    }

    async function confirmCounterPayment(paymentId, method) {
      const operatorId = document.getElementById('operatorDisplay')?.textContent || 'Cashier Desk #1';
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/counter-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, operatorId, method })
        });
        if (res.ok) {
          showAdminToast('Payment approved successfully!');
          pollGlobalCounterPending();
          fetchLiveData();
          fetchCounterPayments();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to approve payment');
        }
      } catch (e) {
        alert('Network error confirming payment');
      }
    }

    async function declineCounterPayment(paymentId, method) {
      const reason = prompt('Reason for declining this counter payment:', 'Payment note rejected at till');
      if (reason === null) return;
      const operatorId = document.getElementById('operatorDisplay')?.textContent || 'Cashier Desk #1';
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/counter-decline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, operatorId, reason })
        });
        if (res.ok) {
          showAdminToast('Payment declined.');
          pollGlobalCounterPending();
          fetchLiveData();
          fetchCounterPayments();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to decline payment');
        }
      } catch (e) {
        alert('Network error declining payment');
      }
    }

    async function fetchCodOrders() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/cod-orders`);
        const data = await res.json();
        const tbody = document.getElementById('codOrdersTableBody');
        if (!tbody) return;
        const orders = data.codOrders || [];
        if (orders.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No Cash on Delivery orders placed yet.</td></tr>';
          return;
        }
        tbody.innerHTML = orders.map(o => `
        <tr>
          <td><strong>Order #${escapeHtml(o.orderId)}</strong></td>
          <td><code style="font-size:0.75rem;">${o.paymentId.substring(0, 16)}...</code></td>
          <td><strong style="color:#34d399; font-size:1.15rem;">₹${(Number(o.amountPaise) / 100).toFixed(2)}</strong></td>
          <td>${escapeHtml(o.customerName || 'Customer')}</td>
          <td>${escapeHtml(o.customerPhone || '-')}</td>
          <td>${new Date(o.placedAt).toLocaleTimeString()}</td>
          <td>
            <a href="${API_BASE}/api/v1/orders/${o.orderId}/cod" target="_blank" class="btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem; text-decoration:none;">
              API ↗
            </a>
          </td>
        </tr>
      `).join('');
      } catch (e) { }
    }


    // --- TRANSACTIONS LEDGER ---
    async function fetchPaymentsLedger() {
      try {
        const mParam = (typeof currentMerchantId !== 'undefined' && currentMerchantId) ? `?merchantId=${encodeURIComponent(currentMerchantId)}` : '';
        const res = await fetch(`${API_BASE}/api/v1/admin/payments${mParam}`);
        const data = await res.json();
        const tbody = document.getElementById('paymentsLedgerTbody');
        if (!tbody) return;

        tbody.innerHTML = (data.payments || []).map(p => {
          let verifyBadge = '<span style="color:var(--text-muted); font-size:0.75rem;">-</span>';
          if (p.status === 'SUCCESS') {
            const tag = p.verificationTag || (p.verificationLevel >= 2 ? 'Dual Verification' : 'Single Verification');
            if (p.verificationLevel >= 2) {
              verifyBadge = `<span class="badge badge-success">✓✓ ${tag}</span>`;
            } else {
              verifyBadge = `<span class="badge badge-info">✓ ${tag}</span>`;
            }
          }

          const sourcesChips = (p.verificationSources && p.verificationSources.length > 0)
            ? p.verificationSources.map(s => `<code style="font-size:0.7rem; background:#0f172a; padding:0.15rem 0.35rem; border-radius:0.25rem; margin-right:0.2rem; border:1px solid var(--border); color:#93c5fd;">${s === 'GOOGLE_MESSAGES' ? 'SMS' : s}</code>`).join('')
            : '<span style="color:var(--text-muted); font-size:0.75rem;">-</span>';

          return `
          <tr>
            <td><strong>Order #${escapeHtml(p.orderId)}</strong></td>
            <td><code>${p.id}</code></td>
            <td>₹${(Number(p.amountPaise) / 100).toFixed(2)}</td>
            <td>${p.method}</td>
            <td><span class="badge ${p.status === 'SUCCESS' ? 'badge-success' : (p.status === 'ACTIVE' ? 'badge-info' : 'badge-danger')}">${p.status}</span></td>
            <td>${verifyBadge}</td>
            <td>${sourcesChips}</td>
            <td>${new Date(p.createdAt).toLocaleTimeString()}</td>
            <td>${p.completedAt ? new Date(p.completedAt).toLocaleTimeString() : '-'}</td>
          </tr>
        `;
        }).join('');
      } catch (e) { }
    }

    // --- SUPER ADMIN CLIENTS & MERCHANTS DIRECTORY ---
    let cachedAdminClients = [];

    async function loadAdminClients() {
      const tbody = document.getElementById('adminClientsTableBody');
      const countEl = document.getElementById('adminTotalClientsCount');
      if (!tbody) return;

      try {
        const token = localStorage.getItem('youpi_auth_token') || ADMIN_TOKEN || '';
        const res = await fetch(`${API_BASE}/api/v1/admin/clients`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (res.status === 401 || res.status === 403) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#f87171;">Super Admin authorization required to view client directory.</td></tr>';
          return;
        }

        const data = await res.json();
        cachedAdminClients = data.clients || [];
        if (countEl) countEl.textContent = cachedAdminClients.length;
        renderAdminClients(cachedAdminClients);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#f87171;">Failed to load client directory: ${escapeHtml(err.message)}</td></tr>`;
      }
    }

    function renderAdminClients(clients) {
      const tbody = document.getElementById('adminClientsTableBody');
      if (!tbody) return;

      if (!clients || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No clients registered yet.</td></tr>';
        return;
      }

      tbody.innerHTML = clients.map(c => {
        const userBadges = (c.users && c.users.length > 0)
          ? c.users.map(u => `<div style="font-size:0.75rem; margin-bottom:2px;"><strong style="color:#f1f5f9;">${escapeHtml(u.name)}</strong> (${escapeHtml(u.email)}) <span class="badge ${u.role === 'SUPER_ADMIN' ? 'badge-primary' : 'badge-neutral'}" style="font-size:0.65rem;">${u.role}</span></div>`).join('')
          : '<span style="color:var(--text-dim); font-size:0.75rem;">None</span>';

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:12px 14px;">
              <strong style="color:#f8fafc; font-size:0.92rem;">${escapeHtml(c.businessName)}</strong>
              <div style="font-family:monospace; font-size:0.75rem; color:#60a5fa; margin-top:2px;">slug: ${escapeHtml(c.slug)}</div>
            </td>
            <td style="padding:12px 14px; font-size:0.82rem;">
              <div style="color:#cbd5e1;">${escapeHtml(c.contactEmail)}</div>
              <div style="color:var(--text-dim); font-size:0.75rem;">${escapeHtml(c.contactPhone || 'N/A')}</div>
            </td>
            <td style="padding:12px 14px;">
              <code style="color:#34d399; font-weight:700; background:rgba(16,185,129,0.1); padding:3px 8px; border-radius:6px; font-size:0.8rem;">
                ${escapeHtml(c.activeVpa || 'None')}
              </code>
            </td>
            <td style="padding:12px 14px; font-size:0.84rem;">
              <div><strong style="color:#10b981;">₹${escapeHtml(c.totalSuccessRupees || '0.00')}</strong></div>
              <div style="color:var(--text-dim); font-size:0.74rem;">${c.totalSessions || 0} sessions</div>
            </td>
            <td style="padding:12px 14px; font-size:0.76rem; font-family:monospace;">
              <div style="color:#94a3b8;" title="${escapeHtml(c.webhookSecret)}">secret: ${escapeHtml(c.webhookSecret ? c.webhookSecret.slice(0, 14) + '...' : 'None')}</div>
              <div style="color:var(--text-dim); font-size:0.72rem; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(c.webhookUrl || 'No webhook set')}</div>
            </td>
            <td style="padding:12px 14px;">
              ${userBadges}
            </td>
            <td style="padding:12px 14px; font-size:0.76rem; color:var(--text-dim);">
              ${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
            </td>
          </tr>
        `;
      }).join('');
    }

    function filterAdminClients(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        renderAdminClients(cachedAdminClients);
        return;
      }
      const filtered = cachedAdminClients.filter(c => 
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q)) ||
        (c.contactEmail && c.contactEmail.toLowerCase().includes(q)) ||
        (c.activeVpa && c.activeVpa.toLowerCase().includes(q))
      );
      renderAdminClients(filtered);
    }

    async function logoutAdmin() {
      try {
        await fetch('/api/v1/auth/logout', { method: 'POST' });
      } catch {}
      localStorage.removeItem('youpi_auth_token');
      localStorage.removeItem('youpi_user');
      window.location.href = '/login';
    }


    // --- FLOATING CASHIER MODALS DOCK ---
    let minimizedCounterIds = new Set();
    let cachedPendingPayments = [];
    let isInitialCounterPollDone = false;
    async function pollGlobalCounterPending() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/counter-pending`);
        if (!res.ok) return;
        const data = await res.json();
        const payments = data.payments || [];

        const kpiEl = document.getElementById('kpiPendingCounterCount');
        if (kpiEl) kpiEl.textContent = payments.length;

        const prevIds = new Set((cachedPendingPayments || []).map(p => p.id));
        const newlyAdded = payments.filter(p => !prevIds.has(p.id));
        if (newlyAdded.length > 0 && isInitialCounterPollDone) {
          newlyAdded.forEach(p => {
            const isCash = p.method === 'CASH_COUNTER';
            showAdminToast(`🔔 Counter Payment Request: ${isCash ? '💵 Cash at Till' : '💳 Card at POS'} for ₹${p.amount} (Order #${p.orderId})`);
          });
        }
        isInitialCounterPollDone = true;

        if (typeof renderCounterDesk === 'function') renderCounterDesk(payments);
        renderFloatingCashierModals(payments);
      } catch (e) { }
    }

    function connectAdminEventsSse() {
      try {
        // EventSource cannot send an Authorization header, so the stream accepts ?token= (GET only).
        if (!window.__youpiAdminAuth.token()) return; // reconnected right after the token is entered
        if (window.__adminSse) { try { window.__adminSse.close(); } catch (e) {} }
        const adminSse = window.__adminSse = new EventSource(`${API_BASE}/api/v1/admin/stream?token=${encodeURIComponent(window.__youpiAdminAuth.token())}`);
        adminSse.addEventListener('counter_payment_requested', (event) => {
          pollGlobalCounterPending();
          fetchLiveData();
          if (typeof fetchCounterPayments === 'function') fetchCounterPayments();
          try {
            const payload = event.data ? JSON.parse(event.data) : null;
            const isCash = payload?.method === 'CASH_COUNTER';
            const amt = payload?.amountPaise ? `₹${(Number(payload.amountPaise) / 100).toFixed(2)}` : '';
            const ord = payload?.orderId ? `(Order #${payload.orderId})` : '';
            showAdminToast(`🔔 Cashier Prompt: Customer requested ${isCash ? '💵 Cash at Till' : '💳 Card at POS'} ${amt} ${ord}!`);
          } catch (e) {
            showAdminToast('🔔 Cashier Prompt: In-store customer selected Cash/Card payment!');
          }
        });
        adminSse.addEventListener('status_change', () => {
          pollGlobalCounterPending();
          fetchLiveData();
          if (typeof fetchCounterPayments === 'function') fetchCounterPayments();
        });
        adminSse.onerror = () => {
          adminSse.close();
          if (window.__youpiAdminAuth.token()) {
            setTimeout(connectAdminEventsSse, 8000);
          }
        };
      } catch (e) { }
    }

    function toggleMinimizeCard(paymentId) {
      if (minimizedCounterIds.has(paymentId)) minimizedCounterIds.delete(paymentId);
      else minimizedCounterIds.add(paymentId);
      if (cachedPendingPayments) renderFloatingCashierModals(cachedPendingPayments);
    }

    function renderFloatingCashierModals(payments) {
      cachedPendingPayments = payments;
      const dock = document.getElementById('cashierFloatingDock');
      if (!dock) return;
      if (!payments || payments.length === 0) {
        dock.innerHTML = '';
        return;
      }

      dock.innerHTML = payments.map(p => {
        const isMinimized = minimizedCounterIds.has(p.id);
        const isCash = p.method === 'CASH_COUNTER';
        const methodLabel = isCash ? '💵 Cash at Till' : '💳 Card at Counter';
        const badgeClass = isCash ? 'cashier-badge-cash' : 'cashier-badge-card';
        const orderIdStr = p.orderId ? (String(p.orderId).startsWith('#') ? p.orderId : `#${p.orderId}`) : `#${p.id.slice(0, 8)}`;
        const amountStr = `₹${p.amount}`;
        const customerText = p.customer && p.customer.name ? `${p.customer.name}` : 'Customer at Till';

        if (isMinimized) {
          return `
          <div class="cashier-modal-card is-minimized ${!isCash ? 'is-card-terminal' : ''}">
            <div class="cashier-modal-header">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="cashier-modal-badge ${badgeClass}">${methodLabel}</span>
                <strong style="color:#ffffff; font-size:12px; font-family:monospace;">${orderIdStr}</strong>
                <span style="color:#f59e0b; font-size:12px; font-weight:700;">${amountStr}</span>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <button type="button" class="cashier-btn-minimize" onclick="toggleMinimizeCard('${p.id}')">▲</button>
                <button type="button" class="cashier-btn-accept" style="padding:4px 8px; font-size:11px;" onclick="confirmCounterPayment('${p.id}', '${p.method}')">✓ Accept</button>
              </div>
            </div>
          </div>
        `;
        }

        return `
        <div class="cashier-modal-card ${!isCash ? 'is-card-terminal' : ''}">
          <div class="cashier-modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="cashier-modal-badge ${badgeClass}">${methodLabel}</span>
              <strong style="color:#ffffff; font-size:13px; font-family:monospace;">${orderIdStr}</strong>
            </div>
            <button type="button" class="cashier-btn-minimize" onclick="toggleMinimizeCard('${p.id}')">—</button>
          </div>
          <div class="cashier-modal-body">
            <div class="cashier-modal-amount-row">
              <div>
                <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Payable at Desk</div>
                <div style="font-size:1.35rem; font-weight:900; color:${isCash ? '#22c55e' : '#38bdf8'};">${amountStr}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px; color:var(--text-muted);">${customerText}</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">Requested at counter</div>
              </div>
            </div>
            <div class="cashier-modal-actions">
              <button type="button" class="cashier-btn-accept" onclick="confirmCounterPayment('${p.id}', '${p.method}')">✓ Confirm &amp; Accept</button>
              <button type="button" class="cashier-btn-decline" onclick="declineCounterPayment('${p.id}', '${p.method}')">✕ Decline</button>
            </div>
          </div>
        </div>
      `;
      }).join('');
    }

