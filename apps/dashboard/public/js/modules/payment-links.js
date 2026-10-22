// --- PAYMENT LINKS & CHECKOUT STUDIO ---
    // --- PAYMENT LINKS & INSTANT CHECKOUT STUDIO (Razorpay Standard) ---
    let currentPaymentLinkData = null;

    async function handleCreatePaymentLink(e) {
      if (e) e.preventDefault();
      const btn = document.getElementById('btnGeneratePl');
      const amtInput = document.getElementById('plInputAmount');
      const purposeInput = document.getElementById('plInputPurpose');
      const nameInput = document.getElementById('plInputCustName');
      const phoneInput = document.getElementById('plInputCustPhone');
      const orderIdInput = document.getElementById('plInputOrderId');

      const amount = parseFloat(amtInput?.value || 0);
      if (!amount || amount <= 0) {
        showAdminToast('Please enter a valid amount (minimum ₹1.00)');
        return;
      }

      const purpose = (purposeInput?.value || 'Payment Link').trim();
      const customerName = (nameInput?.value || '').trim();
      const customerPhone = (phoneInput?.value || '').trim();
      const customOrderId = (orderIdInput?.value || '').trim();
      const orderId = customOrderId || ('PL-' + Date.now().toString(36).toUpperCase() + Math.floor(100 + Math.random() * 900));

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite;"></span> Creating...';
      }

      try {
        const payload = {
          orderId,
          amount,
          customer: {
            name: customerName,
            phone: customerPhone
          },
          metadata: {
            purpose,
            source: 'DASHBOARD_PAYMENT_LINK'
          }
        };

        const res = await fetch(`${API_BASE}/api/v1/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-id': currentMerchantId
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate payment link');
        }

        const canonicalUrl = `${window.location.origin}/checkout/${data.paymentId}`;
        currentPaymentLinkData = {
          paymentId: data.paymentId,
          orderId: data.orderId || orderId,
          amount: (Number(data.amountPaise || (amount * 100)) / 100).toFixed(2),
          purpose,
          customerName,
          customerPhone,
          url: canonicalUrl
        };

        // Render Generated Box
        const heroBox = document.getElementById('plResultHero');
        const amtBadge = document.getElementById('plResultAmountBadge');
        const descEl = document.getElementById('plResultMetaDesc');
        const urlInput = document.getElementById('plResultUrlInput');
        const qrContainer = document.getElementById('plResultQrContainer');

        if (heroBox) heroBox.style.display = 'block';
        if (amtBadge) amtBadge.textContent = `₹${currentPaymentLinkData.amount}`;
        if (descEl) descEl.textContent = `Single-use UPI dynamic session created for Order #${currentPaymentLinkData.orderId} (${escapeHtml(purpose)})`;
        if (urlInput) urlInput.value = canonicalUrl;

        if (qrContainer) {
          qrContainer.innerHTML = `<img src="/checkout/${data.paymentId}/qr.svg" alt="UPI QR" style="width:100%; height:100%; object-fit:contain; border-radius:4px;" />`;
        }

        showAdminToast('Payment Link generated successfully! Ready to accept UPI.');
        loadPaymentLinksLedger();
      } catch (err) {
        showAdminToast(`Error: ${err.message}`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡ Generate Payment Link</span>';
        }
      }
    }

    function createQuickOneRupeeLink() {
      const amtInput = document.getElementById('plInputAmount');
      const purposeInput = document.getElementById('plInputPurpose');
      const orderIdInput = document.getElementById('plInputOrderId');
      if (amtInput) amtInput.value = '1.00';
      if (purposeInput) purposeInput.value = 'Quick ₹1 Test UPI Verification';
      if (orderIdInput) orderIdInput.value = '';
      handleCreatePaymentLink();
    }

    function copyCurrentPaymentLink() {
      if (!currentPaymentLinkData || !currentPaymentLinkData.url) return;
      navigator.clipboard.writeText(currentPaymentLinkData.url).then(() => {
        showAdminToast('Payment link copied to clipboard!');
      }).catch(() => {
        const input = document.getElementById('plResultUrlInput');
        if (input) {
          input.select();
          document.execCommand('copy');
          showAdminToast('Payment link copied!');
        }
      });
    }

    function copySpecificPaymentLink(url) {
      if (!url) return;
      navigator.clipboard.writeText(url).then(() => {
        showAdminToast('Payment link copied to clipboard!');
      }).catch(() => {
        showAdminToast('Copied: ' + url);
      });
    }

    function shareCurrentPaymentLinkWhatsApp() {
      if (!currentPaymentLinkData || !currentPaymentLinkData.url) return;
      const storeName = (window.CURRENT_MERCHANT && window.CURRENT_MERCHANT.businessName) || 'Store';
      const msg = `Hi${currentPaymentLinkData.customerName ? ' ' + currentPaymentLinkData.customerName : ''}, please complete your payment of ₹${currentPaymentLinkData.amount} for "${currentPaymentLinkData.purpose}" to ${storeName} via UPI:\n\n👉 ${currentPaymentLinkData.url}`;
      
      let phoneParam = '';
      if (currentPaymentLinkData.customerPhone) {
        const cleanPhone = currentPaymentLinkData.customerPhone.replace(/\D/g, '');
        const withCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        phoneParam = `phone=${withCountry}&`;
      }
      const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    }

    function openCurrentPaymentLinkTab() {
      if (currentPaymentLinkData && currentPaymentLinkData.url) {
        window.open(currentPaymentLinkData.url, '_blank');
      }
    }

    function previewCurrentPaymentLinkModal(explicitUrl = null) {
      const url = explicitUrl || currentPaymentLinkData?.url;
      if (!url) return;
      const modal = document.getElementById('checkoutPreviewModal');
      const iframe = document.getElementById('checkoutPreviewIframe');
      if (modal && iframe) {
        iframe.src = url;
        modal.style.display = 'flex';
      }
    }

    function closeCheckoutPreviewModal() {
      const modal = document.getElementById('checkoutPreviewModal');
      const iframe = document.getElementById('checkoutPreviewIframe');
      if (modal) modal.style.display = 'none';
      if (iframe) iframe.src = 'about:blank';
    }

    async function loadPaymentLinksLedger() {
      const tbody = document.getElementById('paymentLinksTableBody');
      if (!tbody) return;

      try {
        const mParam = (typeof currentMerchantId !== 'undefined' && currentMerchantId) ? `?merchantId=${encodeURIComponent(currentMerchantId)}` : '';
        const res = await fetch(`${API_BASE}/api/v1/admin/payments${mParam}`);
        if (!res.ok) throw new Error('Failed to fetch payments');
        const data = await res.json();
        const payments = data.payments || [];

        if (payments.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No payment links or orders created yet. Click "Generate Payment Link" above to create one.</td></tr>`;
          return;
        }

        tbody.innerHTML = payments.map(p => {
          const canonicalLink = `${window.location.origin}/checkout/${p.id}`;
          const amount = (Number(p.amountPaise || 0) / 100).toFixed(2);
          const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';

          let statusBadge = '<span class="badge badge-info">INITIATED</span>';
          if (p.status === 'SUCCESS') {
            statusBadge = '<span class="badge badge-success">✓ PAID</span>';
          } else if (p.status === 'ACTIVE') {
            statusBadge = '<span class="badge badge-warning" style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3);">⏱ SCANNING</span>';
          } else if (p.status === 'EXPIRED') {
            statusBadge = '<span class="badge" style="background:rgba(148,163,184,0.1); color:#94a3b8; border:1px solid rgba(148,163,184,0.2);">EXPIRED</span>';
          } else if (p.status === 'CANCELLED') {
            statusBadge = '<span class="badge badge-danger">CANCELLED</span>';
          }

          const utrDisplay = p.utr 
            ? `<code style="color:#10b981; font-weight:700; font-size:0.75rem;">${escapeHtml(p.utr)}</code>`
            : '<span style="color:var(--text-muted); font-size:0.75rem;">-</span>';

          return `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px 14px; font-size:0.78rem; color:var(--text-muted);">${createdAt}</td>
              <td style="padding:10px 14px; font-size:0.82rem; font-weight:700; color:var(--text-heading);">
                ${escapeHtml(p.orderId || p.id.slice(0, 8))}
              </td>
              <td style="padding:10px 14px; font-size:0.88rem; font-weight:800; color:#38bdf8;">
                ₹${amount}
              </td>
              <td style="padding:10px 14px; font-size:0.78rem; color:var(--text-muted);">
                <span class="badge badge-info" style="font-size:0.7rem;">${escapeHtml(p.method || 'UPI')}</span>
              </td>
              <td style="padding:10px 14px;">
                ${statusBadge}
              </td>
              <td style="padding:10px 14px;">
                ${utrDisplay}
              </td>
              <td style="padding:10px 14px; text-align:right;">
                <div style="display:inline-flex; gap:0.4rem;">
                  <button type="button" class="btn btn-secondary" onclick="copySpecificPaymentLink('${canonicalLink}')" style="font-size:0.72rem; padding:0.25rem 0.55rem;" title="Copy Checkout Link">
                    📋 Copy
                  </button>
                  <button type="button" class="btn btn-secondary" onclick="window.open('${canonicalLink}', '_blank')" style="font-size:0.72rem; padding:0.25rem 0.55rem;" title="Open in New Tab">
                    🚀 Open
                  </button>
                  <button type="button" class="btn btn-secondary" onclick="previewCurrentPaymentLinkModal('${canonicalLink}')" style="font-size:0.72rem; padding:0.25rem 0.55rem;" title="Preview Checkout Modal">
                    👁️ View
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Failed to load payment links: ${escapeHtml(err.message)}</td></tr>`;
      }
    }

