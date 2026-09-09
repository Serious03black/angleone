/**
 * Angel One - Profile / My Account Page Logic
 * Handles dynamic profile data sync (name & trading balance from Google Sheet),
 * modals for View Profile, Add Funds, Withdraw Funds, Logout, and Reports.
 */

(function () {
  let currentBalance = 370000000;
  let currentName = 'Budhbhushan Waghmare';

  // ── Helper: Format currency in Indian locale ──────────────────────────────
  function formatINR(num) {
    return Number(num || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ── Helper: Derive initials ────────────────────────────────────────────────
  function getInitials(name) {
    if (!name) return 'BW';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'BW';
  }

  // ── Apply profile data to DOM ──────────────────────────────────────────────
  function applyProfileData(profile) {
    if (!profile) return;

    if (profile.name) {
      currentName = profile.name;
      const initials = getInitials(currentName);
      const clientCode = (initials + '9821').toUpperCase();

      // Main account card
      const elFullName = document.getElementById('profileFullName');
      if (elFullName) elFullName.textContent = currentName;

      const elAvatar = document.getElementById('profileAvatarCircle');
      if (elAvatar) elAvatar.textContent = initials;

      // Header avatar
      document.querySelectorAll('.profile-avatar').forEach(a => {
        a.textContent = initials;
      });

      // View Profile Modal
      const modalName = document.getElementById('modalProfileName');
      if (modalName) modalName.textContent = currentName;

      const modalCode = document.getElementById('modalClientCode');
      if (modalCode) modalCode.textContent = clientCode;

      const modalEmail = document.getElementById('modalProfileEmail');
      if (modalEmail) {
        modalEmail.textContent = currentName.toLowerCase().replace(/\s+/g, '.') + '@gmail.com';
      }
    }

    if (profile.balance !== undefined && profile.balance !== null) {
      currentBalance = Number(profile.balance) || 0;
      const formatted = formatINR(currentBalance);

      // Main balance display
      const elBalance = document.getElementById('profileTradingBalance');
      if (elBalance) elBalance.textContent = `₹ ${formatted}`;

      // Withdraw modal available balance
      const modalAvail = document.getElementById('modalWithdrawAvailable');
      if (modalAvail) modalAvail.textContent = `₹ ${formatted}`;

      // Withdraw input max attribute
      const withdrawInput = document.getElementById('withdrawFundsInput');
      if (withdrawInput) withdrawInput.max = currentBalance;

      // Quick amount (All) button
      const btnAll = document.getElementById('btnQuickAmtAll');
      if (btnAll) {
        btnAll.setAttribute('data-wamt', currentBalance);
        btnAll.textContent = `₹ ${formatted} (All)`;
      }
    }
  }

  // ── Sync from Backend / Google Sheet ───────────────────────────────────────
  async function fetchProfileData() {
    try {
      const res = await fetch('/api/profile-data');
      if (res.ok) {
        const data = await res.json();
        if (data && (data.name || data.balance !== undefined)) {
          applyProfileData(data);
        }
      }
    } catch (e) {
      console.warn('[Profile] Failed to fetch profile-data:', e.message);
    }
  }

  // Initial fetch
  fetchProfileData();

  // Listen to Socket.IO if available for real-time sheet update
  if (typeof io !== 'undefined') {
    try {
      const socket = window.socket || io();
      window.socket = socket;
      socket.on('sheetStocks', (sheetData) => {
        if (sheetData && sheetData.profileData) {
          applyProfileData(sheetData.profileData);
        }
      });
    } catch (err) {
      console.warn('[Profile] Socket connection error:', err);
    }
  }

  // ── Helper: open/close modals ──────────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  // Close modal when clicking the overlay backdrop
  document.querySelectorAll('.profile-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // ── VIEW PROFILE Modal ─────────────────────────────────────────────────────
  const btnViewProfile = document.getElementById('btnViewProfile');
  if (btnViewProfile) {
    btnViewProfile.addEventListener('click', () => openModal('modalViewProfile'));
  }

  const closeViewProfile = document.getElementById('closeModalViewProfile');
  if (closeViewProfile) {
    closeViewProfile.addEventListener('click', () => closeModal('modalViewProfile'));
  }

  // ── ADD FUNDS Modal ────────────────────────────────────────────────────────
  const btnAddFunds = document.getElementById('btnAddFunds');
  if (btnAddFunds) {
    btnAddFunds.addEventListener('click', () => {
      const inp = document.getElementById('addFundsInput');
      if (inp) inp.value = '';
      openModal('modalAddFunds');
    });
  }

  const closeAddFunds = document.getElementById('closeModalAddFunds');
  if (closeAddFunds) {
    closeAddFunds.addEventListener('click', () => closeModal('modalAddFunds'));
  }

  // Quick amount buttons for Add Funds
  document.querySelectorAll('.btn-quick-amt[data-amt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('addFundsInput');
      if (inp) inp.value = btn.getAttribute('data-amt');
    });
  });

  const btnProceedAdd = document.getElementById('btnProceedAddFunds');
  if (btnProceedAdd) {
    btnProceedAdd.addEventListener('click', () => {
      const val = parseFloat(document.getElementById('addFundsInput').value);
      if (!val || val <= 0) {
        alert('Please enter a valid amount to add.');
        return;
      }
      currentBalance += val;
      applyProfileData({ balance: currentBalance });
      closeModal('modalAddFunds');
      showToast(`₹ ${formatINR(val)} added successfully to your trading account!`);
    });
  }

  // ── WITHDRAW FUNDS Modal ───────────────────────────────────────────────────
  const btnWithdraw = document.getElementById('btnWithdraw');
  if (btnWithdraw) {
    btnWithdraw.addEventListener('click', () => {
      const inp = document.getElementById('withdrawFundsInput');
      if (inp) inp.value = '';
      openModal('modalWithdrawFunds');
    });
  }

  const closeWithdraw = document.getElementById('closeModalWithdrawFunds');
  if (closeWithdraw) {
    closeWithdraw.addEventListener('click', () => closeModal('modalWithdrawFunds'));
  }

  // Quick amount buttons for Withdraw Funds
  document.querySelectorAll('.btn-quick-amt[data-wamt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('withdrawFundsInput');
      if (inp) inp.value = btn.getAttribute('data-wamt');
    });
  });

  const btnProceedWithdraw = document.getElementById('btnProceedWithdraw');
  if (btnProceedWithdraw) {
    btnProceedWithdraw.addEventListener('click', () => {
      const val = parseFloat(document.getElementById('withdrawFundsInput').value);
      if (!val || val <= 0) {
        alert('Please enter a valid withdrawal amount.');
        return;
      }
      if (val > currentBalance) {
        alert(`Withdrawal amount cannot exceed your available balance of ₹ ${formatINR(currentBalance)}`);
        return;
      }
      currentBalance -= val;
      applyProfileData({ balance: currentBalance });
      closeModal('modalWithdrawFunds');
      showToast(`₹ ${formatINR(val)} withdrawal request submitted!`);
    });
  }

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout from Angel One?')) {
        showToast('Logging out... Goodbye!');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    });
  }

  // ── BALANCE SUMMARY link ───────────────────────────────────────────────────
  const btnBalanceSummary = document.getElementById('btnBalanceSummary');
  if (btnBalanceSummary) {
    btnBalanceSummary.addEventListener('click', () => {
      showToast(`Trading Balance Summary: Available ₹${formatINR(currentBalance)} | Used Margin ₹0.00 | Collateral ₹0.00`);
    });
  }

  const btnTxnSummary = document.getElementById('btnTransactionSummary');
  if (btnTxnSummary) {
    btnTxnSummary.addEventListener('click', () => {
      showToast('Redirecting to Transaction Summary...');
    });
  }

  // ── REPORTS cards ──────────────────────────────────────────────────────────
  const reportActions = {
    reportTradesCharges: 'Opening Trades & Charges report...',
    reportStatements:    'Opening Statements report...',
    reportPnl:           'Opening Profit & Loss report...',
    reportDownload:      'Downloading your reports...'
  };

  Object.keys(reportActions).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(reportActions[id]);
      });
    }
  });

  // ── PLEDGING cards ─────────────────────────────────────────────────────────
  const pledgeActions = {
    cardPledgeHoldings: 'Pledge Holdings: Redirecting to pledge your holdings for extra margin...',
    cardMtf:            'MTF: Redirecting to Margin Trade Funding...',
    cardTransferStocks: 'Transfer Stocks: Redirecting to stock transfer portal...'
  };

  Object.keys(pledgeActions).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        showToast(pledgeActions[id]);
      });
    }
  });

  // ── Toast Notification ─────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById('profileToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'profileToast';
      toast.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        'background:#10233F',
        'color:#fff',
        'padding:12px 20px',
        'border-radius:8px',
        'font-size:13px',
        'font-weight:500',
        'box-shadow:0 4px 16px rgba(0,0,0,0.18)',
        'z-index:2000',
        'max-width:380px',
        'line-height:1.5',
        'opacity:0',
        'transition:all 0.25s ease',
        'pointer-events:none',
        'transform:translateY(10px)'
      ].join(';');
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3500);
  }

  // ── Keyboard ESC to close modals ───────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.profile-modal-overlay.active').forEach(m => {
        m.classList.remove('active');
      });
    }
  });

})();
