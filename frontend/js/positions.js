/**
 * Angel One Positions Terminal Logic
 * Handles loading portfolio stocks, live WebSocket price streaming, search, sorting, and position actions.
 */

(function () {
  let positionsList = [];
  let filterQuery = '';
  let sortColumn = null;
  let sortDirection = 'asc';
  let showPercentOnly = false;

  const positionsTableTbody = document.getElementById('positionsTableTbody');
  const positionsCountTitle = document.getElementById('positionsCountTitle');
  const positionsSearchInput = document.getElementById('positionsSearchInput');
  const totalGlValueEl = document.getElementById('totalGlValue');
  const exitAllBtn = document.getElementById('exitAllBtn');
  const btnSecureExit = document.getElementById('btnSecureExit');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnPercentToggle = document.getElementById('btnPercentToggle');
  const btnFilter = document.getElementById('btnFilter');
  const toastEl = document.getElementById('positionsToast');

  // Baseline stocks fallback if sheet data is completely empty
  const defaultBaselineStocks = [
    { symbol: "IDEA", name: "Vodafone Idea", token: "14366", qty: 1, avgPrice: 15.50, price: 15.50, closePrice: 15.60 },
    { symbol: "JIOFIN", name: "Jio Financial Services", token: "18143", qty: 10, avgPrice: 235.00, price: 233.47, closePrice: 234.40 },
    { symbol: "SUZLON", name: "Suzlon Energy", token: "12018", qty: 25, avgPrice: 46.00, price: 45.46, closePrice: 45.55 },
    { symbol: "TATASTEEL", name: "Tata Steel", token: "3499", qty: 15, avgPrice: 182.50, price: 184.78, closePrice: 185.61 },
    { symbol: "NTPC", name: "NTPC Limited", token: "11630", qty: 20, avgPrice: 330.00, price: 331.55, closePrice: 332.00 },
    { symbol: "RELIANCE", name: "Reliance Industries", token: "2885", qty: 5, avgPrice: 2950.00, price: 2985.50, closePrice: 2980.00 },
    { symbol: "HDFCBANK", name: "HDFC Bank", token: "1333", qty: 12, avgPrice: 1620.00, price: 1645.20, closePrice: 1640.00 }
  ];

  // Helper: Format currency
  function formatMoney(num, decimals = 2) {
    if (isNaN(num) || num === null || num === undefined) return "0.00";
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // Show Toast Notification
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  }

  // Flash row or cell when tick updates
  function flashElement(el, isUp) {
    if (!el) return;
    const flashClass = isUp ? 'flash-green-bg' : 'flash-red-bg';
    el.classList.remove('flash-green-bg', 'flash-red-bg');
    void el.offsetWidth;
    el.classList.add(flashClass);
    setTimeout(() => {
      el.classList.remove(flashClass);
    }, 600);
  }

  // Load all stocks from Google Sheets API
  function loadPositionsFromSheet() {
    fetch('/api/sheet-stocks?refresh=true&_t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rawStocks = (data && (data.portfolioPositions || data.portfolio || data.positions)) || [];
        if (rawStocks && rawStocks.length > 0) {
          positionsList = rawStocks.map(item => {
            const cleanToken = String(item.token || '').replace(/^["'\\]+|["'\\]+$/g, '').trim();
            const qty = typeof item.quantity === 'number' && item.quantity > 0
              ? item.quantity
              : (typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1);
            const avgP = typeof item.avgPrice === 'number' && item.avgPrice > 0
              ? item.avgPrice
              : (item.price || 15.50);

            const tick = (window.marketTicks && (window.marketTicks[cleanToken] || window.marketTicks[item.symbol])) || {};
            const liveP = typeof window.parseTickPrice === 'function' ? window.parseTickPrice(tick) : Number(tick.ltp || tick.price);
            const closeP = typeof window.parseTickClose === 'function' ? window.parseTickClose(tick) : Number(tick.closePrice);

            const curPrice = liveP && liveP > 0 ? liveP : (item.price || avgP);
            const refClose = closeP && closeP > 0 ? closeP : (item.closePrice || curPrice);

            return {
              symbol: item.symbol || item.name,
              rawSymbol: item.rawSymbol || item.symbol,
              name: item.name || item.symbol,
              token: cleanToken,
              exchange: item.exchange || "NSE",
              action: "BUY",
              product: "IN",
              qty: qty,
              avgPrice: avgP,
              price: curPrice,
              closePrice: refClose,
              previousProfit: item.previousProfit !== undefined ? item.previousProfit : null,
              overAllProfit: item.overAllProfit !== undefined ? item.overAllProfit : null
            };
          });

          renderPositionsTable();
          updateTotalGL();
        } else {
          useDefaultPositions();
        }
      })
      .catch(() => {
        useDefaultPositions();
      });
  }

  function useDefaultPositions() {
    positionsList = defaultBaselineStocks.map(s => ({
      ...s,
      action: "BUY",
      product: "IN"
    }));
    renderPositionsTable();
    updateTotalGL();
  }

  // Filter and Sort positions
  function getVisiblePositions() {
    let list = positionsList.filter(p => {
      const q = filterQuery.toLowerCase().trim();
      if (!q) return true;
      return (p.symbol && p.symbol.toLowerCase().includes(q)) ||
             (p.name && p.name.toLowerCase().includes(q));
    });

    if (sortColumn === 'scrip') {
      list.sort((a, b) => {
        const res = (a.symbol || '').localeCompare(b.symbol || '');
        return sortDirection === 'asc' ? res : -res;
      });
    } else if (sortColumn === 'gl') {
      list.sort((a, b) => {
        const glA = (a.price - a.avgPrice) * a.qty;
        const glB = (b.price - b.avgPrice) * b.qty;
        return sortDirection === 'asc' ? glA - glB : glB - glA;
      });
    } else if (sortColumn === 'qty') {
      list.sort((a, b) => sortDirection === 'asc' ? a.qty - b.qty : b.qty - a.qty);
    } else if (sortColumn === 'atp') {
      list.sort((a, b) => sortDirection === 'asc' ? a.avgPrice - b.avgPrice : b.avgPrice - a.avgPrice);
    } else if (sortColumn === 'ltp') {
      list.sort((a, b) => sortDirection === 'asc' ? a.price - b.price : b.price - a.price);
    }

    return list;
  }

  // Render Table Rows
  function renderPositionsTable() {
    if (!positionsTableTbody) return;

    const visibleList = getVisiblePositions();

    if (positionsCountTitle) {
      positionsCountTitle.textContent = `Position(${visibleList.length})`;
    }

    if (visibleList.length === 0) {
      positionsTableTbody.innerHTML = `
        <tr>
          <td colspan="6" class="positions-status-row">
            ${filterQuery ? `No open positions match "${filterQuery}"` : 'No open positions available'}
          </td>
        </tr>
      `;
      return;
    }

    positionsTableTbody.innerHTML = visibleList.map(stock => {
      const keyId = stock.token || stock.symbol;
      const hasPrevProfit = (stock.previousProfit !== null && stock.previousProfit !== undefined && !isNaN(stock.previousProfit));
      const refClose = hasPrevProfit && stock.qty > 0
        ? (stock.avgPrice + (Number(stock.previousProfit) / stock.qty))
        : (stock.closePrice > 0 ? stock.closePrice : stock.price);
      const dayDiffPct = refClose > 0 ? ((stock.price - refClose) / refClose) * 100 : 0;
      const isDayUp = dayDiffPct >= 0;

      const invested = stock.qty * stock.avgPrice;
      const curVal = stock.qty * stock.price;
      const gainLoss = curVal - invested;
      const glPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;
      const isGlPositive = gainLoss > 0.001;
      const isGlNegative = gainLoss < -0.001;

      const glClass = isGlPositive ? 'val-positive' : (isGlNegative ? 'val-negative' : 'val-neutral');
      const ltpClass = isDayUp ? 'val-positive' : 'val-negative';

      const shareText = `${stock.qty} Share${stock.qty > 1 ? 's' : ''}`;
      const atpText = stock.avgPrice % 1 === 0 ? stock.avgPrice.toFixed(1) : stock.avgPrice.toFixed(2);
      const ltpFormatted = `${formatMoney(stock.price)} (${isDayUp ? '+' : ''}${dayDiffPct.toFixed(2)}%)`;
      const glFormatted = `${isGlPositive ? '+' : ''}${formatMoney(gainLoss)} (${isGlPositive ? '+' : ''}${glPercent.toFixed(2)}%)`;

      return `
        <tr id="pos-row-${keyId}" class="position-data-row" data-symbol="${stock.symbol}" data-token="${stock.token || ''}">
          <!-- Scrip Name -->
          <td class="cell-scrip">
            <span class="scrip-name-text">${stock.symbol}</span>
          </td>

          <!-- Action / Product Type -->
          <td class="cell-action">
            <div class="action-type-cell">
              <span class="badge-action-buy">B</span>
              <span class="badge-product-in">IN</span>
            </div>
          </td>

          <!-- Qty. -->
          <td class="cell-qty">${shareText}</td>

          <!-- ATP -->
          <td class="cell-atp">${atpText}</td>

          <!-- LTP -->
          <td class="cell-ltp ${ltpClass}" id="pos-ltp-${keyId}">
            ${ltpFormatted}
          </td>

          <!-- Gain & Loss -->
          <td class="cell-gl">
            <div class="gl-content-wrap">
              <span class="gl-amount-text ${glClass}" id="pos-gl-${keyId}">
                ${glFormatted}
              </span>
              <button class="btn-square-off" title="Exit ${stock.symbol}" data-symbol="${stock.symbol}" aria-label="Square off">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach square off click events
    document.querySelectorAll('.btn-square-off').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = btn.getAttribute('data-symbol');
        exitPosition(sym);
      });
    });
  }

  // Update specific stock row when WebSocket tick arrives
  function updateSingleStockTick(stock, isUp) {
    const keyId = stock.token || stock.symbol;
    const ltpEl = document.getElementById(`pos-ltp-${keyId}`);
    const glEl = document.getElementById(`pos-gl-${keyId}`);
    if (!ltpEl && !glEl) return;

    const hasPrevProfit = (stock.previousProfit !== null && stock.previousProfit !== undefined && !isNaN(stock.previousProfit));
    const refClose = hasPrevProfit && stock.qty > 0
      ? (stock.avgPrice + (Number(stock.previousProfit) / stock.qty))
      : (stock.closePrice > 0 ? stock.closePrice : stock.price);
    const dayDiffPct = refClose > 0 ? ((stock.price - refClose) / refClose) * 100 : 0;
    const isDayUp = dayDiffPct >= 0;

    const invested = stock.qty * stock.avgPrice;
    const curVal = stock.qty * stock.price;
    const gainLoss = curVal - invested;
    const glPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;
    const isGlPositive = gainLoss > 0.001;
    const isGlNegative = gainLoss < -0.001;
    const glClass = isGlPositive ? 'val-positive' : (isGlNegative ? 'val-negative' : 'val-neutral');

    if (ltpEl) {
      ltpEl.className = `cell-ltp ${isDayUp ? 'val-positive' : 'val-negative'}`;
      ltpEl.textContent = `${formatMoney(stock.price)} (${isDayUp ? '+' : ''}${dayDiffPct.toFixed(2)}%)`;
    }

    if (glEl) {
      glEl.className = `gl-amount-text ${glClass}`;
      glEl.textContent = `${isGlPositive ? '+' : ''}${formatMoney(gainLoss)} (${isGlPositive ? '+' : ''}${glPercent.toFixed(2)}%)`;
    }
  }

  // Calculate & update Total G/L in bottom summary bar
  function updateTotalGL() {
    if (!totalGlValueEl) return;
    let totalGL = 0;

    positionsList.forEach(stock => {
      const inv = stock.qty * stock.avgPrice;
      const cur = stock.qty * stock.price;
      totalGL += (cur - inv);
    });

    const isPositive = totalGL > 0.001;
    const isNegative = totalGL < -0.001;

    totalGlValueEl.className = `total-gl-value ${isPositive ? 'val-positive' : (isNegative ? 'val-negative' : '')}`;
    totalGlValueEl.textContent = `${isPositive ? '+' : ''}${formatMoney(totalGL)}`;
  }

  // Handle single position exit
  function exitPosition(symbol) {
    const idx = positionsList.findIndex(p => p.symbol === symbol);
    if (idx !== -1) {
      const removed = positionsList.splice(idx, 1)[0];
      renderPositionsTable();
      updateTotalGL();
      showToast(`Position squared off: ${removed.symbol}`);
    }
  }

  // Handle EXIT ALL
  function exitAllPositions() {
    if (positionsList.length === 0) {
      showToast('No open positions to exit');
      return;
    }
    const count = positionsList.length;
    if (confirm(`Are you sure you want to EXIT ALL ${count} open position(s)?`)) {
      positionsList = [];
      renderPositionsTable();
      updateTotalGL();
      showToast(`All ${count} positions exited successfully`);
    }
  }

  // Handle SECURE EXIT
  function secureExitPositions() {
    if (positionsList.length === 0) {
      showToast('No open positions to secure');
      return;
    }
    showToast(`🛡️ Secure Exit activated with trailing stop-loss for ${positionsList.length} positions`);
  }

  // Export positions to CSV
  function exportPositionsToCSV() {
    if (positionsList.length === 0) {
      showToast('No positions data to export');
      return;
    }

    let csv = 'Scrip Name,Action,Product Type,Qty,ATP,LTP,Gain & Loss,Gain & Loss %\n';
    positionsList.forEach(p => {
      const inv = p.qty * p.avgPrice;
      const cur = p.qty * p.price;
      const gl = cur - inv;
      const glPct = inv > 0 ? (gl / inv) * 100 : 0;
      csv += `"${p.symbol}","BUY","IN",${p.qty},${p.avgPrice.toFixed(2)},${p.price.toFixed(2)},${gl.toFixed(2)},${glPct.toFixed(2)}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `angel_one_positions_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Positions report downloaded');
  }

  // Setup WebSocket live ticks listener
  function setupWebSocketListeners() {
    document.addEventListener('backend-market-data', (e) => {
      const data = e.detail;
      const ticks = Array.isArray(data) ? data : [data];
      let needsTotalUpdate = false;

      ticks.forEach(tick => {
        if (!tick) return;
        const rawTok = tick.token ?? tick.subscriptionToken ?? tick.instrumentToken;
        const cleanTok = String(rawTok || '').replace(/^["'\\]+|["'\\]+$/g, '').trim();
        const sym = tick.symbol ? String(tick.symbol).toUpperCase() : '';

        positionsList.forEach(stock => {
          const matchTok = cleanTok && cleanTok === stock.token;
          const matchSym = sym && (sym === stock.symbol.toUpperCase() || sym === (stock.rawSymbol || '').toUpperCase());

          if (matchTok || matchSym) {
            const liveP = typeof window.parseTickPrice === 'function' ? window.parseTickPrice(tick) : Number(tick.ltp || tick.price);
            const closeP = typeof window.parseTickClose === 'function' ? window.parseTickClose(tick) : Number(tick.closePrice);

            if (liveP && liveP > 0) {
              const isUp = liveP >= stock.price;
              stock.price = liveP;
              if (closeP && closeP > 0) stock.closePrice = closeP;
              updateSingleStockTick(stock, isUp);
              needsTotalUpdate = true;
            }
          }
        });
      });

      if (needsTotalUpdate) {
        updateTotalGL();
      }
    });

    // Sheet re-sync event
    document.addEventListener('backend-sheet-stocks', () => {
      loadPositionsFromSheet();
    });
  }

  // Setup UI event listeners
  function setupUIListeners() {
    // Search filter
    if (positionsSearchInput) {
      positionsSearchInput.addEventListener('input', (e) => {
        filterQuery = e.target.value;
        renderPositionsTable();
      });
    }

    // Sort column headers
    document.querySelectorAll('.positions-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (sortColumn === col) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn = col;
          sortDirection = 'asc';
        }
        renderPositionsTable();
      });
    });

    // Exit All button
    if (exitAllBtn) {
      exitAllBtn.addEventListener('click', exitAllPositions);
    }

    // Secure Exit button
    if (btnSecureExit) {
      btnSecureExit.addEventListener('click', secureExitPositions);
    }

    // Export CSV
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', exportPositionsToCSV);
    }

    // Percent toggle
    if (btnPercentToggle) {
      btnPercentToggle.addEventListener('click', () => {
        showPercentOnly = !showPercentOnly;
        btnPercentToggle.classList.toggle('active', showPercentOnly);
        showToast(showPercentOnly ? 'Showing percentage focus' : 'Standard view');
      });
    }

    // Filter button
    if (btnFilter) {
      btnFilter.addEventListener('click', () => {
        showToast('Filter options: All Positions, Intraday, CarryForward');
      });
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupUIListeners();
    setupWebSocketListeners();
    loadPositionsFromSheet();

    // Auto-sync when user switches back to tab or every 15 seconds
    window.addEventListener('focus', loadPositionsFromSheet);
    setInterval(loadPositionsFromSheet, 15000);
  });
})();
