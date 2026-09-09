/**
 * Angel One Portfolio Dashboard - Dynamic Google Sheet Holdings Integration & Real-Time Updates
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const btnTabOverview = document.getElementById('btnTabOverview');
  const btnTabEquity = document.getElementById('btnTabEquity');
  const viewPaneOverview = document.getElementById('viewPaneOverview');
  const viewPaneEquity = document.getElementById('viewPaneEquity');
  const overviewEquityRow = document.getElementById('overviewEquityRow');

  // Metrics Bar Elements
  const metricVal1 = document.getElementById('metricVal1');
  const metricVal2 = document.getElementById('metricVal2');
  const metricLabel3 = document.getElementById('metricLabel3');
  const metricVal3 = document.getElementById('metricVal3');
  const metricIconWrap3 = document.getElementById('metricIconWrap3');
  const metricLabel4 = document.getElementById('metricLabel4');
  const metricVal4 = document.getElementById('metricVal4');
  const metricIconWrap4 = document.getElementById('metricIconWrap4');

  // Watchlist Sidebar Toggle
  const watchlistSidebar = document.getElementById('watchlistSidebar');
  const btnHideWatchlist = document.getElementById('btnHideWatchlist');
  const hideWatchlistText = document.getElementById('hideWatchlistText');
  const reopenWatchlistBtn = document.getElementById('reopenWatchlistBtn');

  // Search Inputs
  const holdingsSearchInput = document.getElementById('holdingsSearchInput');
  const holdingsTableTbody = document.getElementById('holdingsTableTbody');
  const holdingsCountBadge = document.getElementById('holdingsCountBadge');

  // Allocation Toggles
  const btnViewSector = document.getElementById('btnViewSector');
  const btnViewMarketCap = document.getElementById('btnViewMarketCap');

  // Top Drivers Toggles
  const btnGainers = document.getElementById('btnGainers');
  const btnLosers = document.getElementById('btnLosers');
  const topDriversTbody = document.getElementById('topDriversTbody');

  // Portfolio Events Toggles
  const btnEventsBonus = document.getElementById('btnEventsBonus');
  const btnEventsSplits = document.getElementById('btnEventsSplits');
  const eventsEmptyText = document.querySelector('.events-empty-text');

  // Dropdown
  const btnGroupBy = document.getElementById('btnGroupBy');
  const dropdownGroupByMenu = document.getElementById('dropdownGroupByMenu');

  let currentTab = 'equity';
  let portfolioHoldings = [];
  let filterQuery = '';

  // Seed baseline holdings data
  function generateDefaultHoldings() {
    const baseStocks = [
      { symbol: "RELIANCE", name: "RELIANCE INDUSTRIES", token: "2885", qty: 12, avgPrice: 1285.40, price: 2985.50, closePrice: 2980.00 },
      { symbol: "HDFCBANK", name: "HDFC BANK", token: "1333", qty: 25, avgPrice: 694.75, price: 1645.20, closePrice: 1640.00 },
      { symbol: "ICICIBANK", name: "ICICI BANK", token: "4963", qty: 8, avgPrice: 1412.30, price: 1178.60, closePrice: 1175.00 },
      { symbol: "TCS", name: "TATA CONSULTANCY SERVICES", token: "11536", qty: 15, avgPrice: 2894.60, price: 3920.00, closePrice: 3915.00 },
      { symbol: "INFY", name: "INFOSYS LIMITED", token: "1594", qty: 20, avgPrice: 1548.25, price: 1625.40, closePrice: 1630.00 },
      { symbol: "HINDUNILVR", name: "HINDUSTAN UNILEVER", token: "1394", qty: 6, avgPrice: 2476.80, price: 2480.00, closePrice: 2470.00 },
      { symbol: "ITC", name: "ITC LIMITED", token: "1660", qty: 40, avgPrice: 412.35, price: 432.50, closePrice: 430.00 },
      { symbol: "LT", name: "LARSEN & TOUBRO", token: "11483", qty: 5, avgPrice: 3568.40, price: 3580.00, closePrice: 3560.00 },
      { symbol: "SBIN", name: "STATE BANK OF INDIA", token: "3045", qty: 18, avgPrice: 982.65, price: 815.40, closePrice: 810.00 },
      { symbol: "BHARTIARTL", name: "BHARTI AIRTEL", token: "10604", qty: 10, avgPrice: 1876.20, price: 1510.00, closePrice: 1500.00 },
      { symbol: "AXISBANK", name: "AXIS BANK", token: "5900", qty: 14, avgPrice: 1198.45, price: 1195.00, closePrice: 1190.00 },
      { symbol: "KOTAKBANK", name: "KOTAK MAHINDRA BANK", token: "1922", qty: 7, avgPrice: 2024.70, price: 1765.00, closePrice: 1760.00 },
      { symbol: "MARUTI", name: "MARUTI SUZUKI", token: "10999", qty: 3, avgPrice: 12485.30, price: 12450.00, closePrice: 12400.00 },
      { symbol: "TATASTEEL", name: "TATA STEEL", token: "3499", qty: 70, avgPrice: 164.80, price: 184.39, closePrice: 186.20 },
      { symbol: "NTPC", name: "NTPC LIMITED", token: "11630", qty: 50, avgPrice: 384.20, price: 341.55, closePrice: 339.45 }
    ];
    return baseStocks;
  }

  // Flash element animation
  function flashCell(el, isUp) {
    if (!el) return;
    el.classList.remove('flash-green', 'flash-red');
    void el.offsetWidth;
    el.classList.add(isUp ? 'flash-green' : 'flash-red');
    setTimeout(() => {
      el.classList.remove('flash-green', 'flash-red');
    }, 700);
  }

  // Load all stocks from the Google Sheet "portfolio positions" tab
  function loadPortfolioSheetStocks() {
    fetch('/api/sheet-stocks?refresh=true&_t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rawPositions = (data && (data.portfolioPositions || data.positions || data.portfolio)) || [];
        if (rawPositions.length > 0) {
          portfolioHoldings = rawPositions.map((item, idx) => {
            const cleanTok = String(item.token || '').replace(/^["'\\]+|["'\\]+$/g, '').trim();
            const qty = typeof item.quantity === 'number' && item.quantity > 0 
                ? item.quantity 
                : (typeof item.qty === 'number' && item.qty > 0 ? item.qty : 10);
            const avgP = typeof item.avgPrice === 'number' && item.avgPrice > 0 
                ? item.avgPrice 
                : 150.00;

            const tick = (window.marketTicks && (window.marketTicks[cleanTok] || window.marketTicks[item.symbol])) || {};
            const liveP = typeof window.parseTickPrice === 'function' ? window.parseTickPrice(tick) : Number(tick.ltp || tick.price);
            const closeP = typeof window.parseTickClose === 'function' ? window.parseTickClose(tick) : Number(tick.closePrice);

            const curP = liveP && liveP > 0 ? liveP : (item.price || avgP);
            const refClose = closeP && closeP > 0 ? closeP : (item.closePrice || curP);

            const prevProfit = (item.previousProfit !== undefined && item.previousProfit !== null)
              ? item.previousProfit
              : (item.overAllProfit !== undefined && item.overAllProfit !== null ? item.overAllProfit : null);

            return {
              symbol: item.symbol,
              rawSymbol: item.rawSymbol,
              token: cleanTok,
              name: item.name || item.symbol,
              exchange: item.exchange || "NSE",
              qty: qty,
              quantity: qty,
              avgPrice: avgP,
              price: curP,
              closePrice: refClose,
              previousProfit: prevProfit,
              overAllProfit: prevProfit
            };
          });

          renderHoldings();
          updateSummaryMetrics();
          renderTopDrivers();
        }
      })
      .catch(() => {
        portfolioHoldings = generateDefaultHoldings();
        renderHoldings();
        updateSummaryMetrics();
        renderTopDrivers();
      });
  }

  // Format currency
  function formatMoney(num, decimals = 2) {
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // Render holdings table
  function renderHoldings() {
    if (!holdingsTableTbody) return;

    const filtered = portfolioHoldings.filter(h =>
      h.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      h.name.toLowerCase().includes(filterQuery.toLowerCase())
    );

    if (holdingsCountBadge) {
      holdingsCountBadge.textContent = filtered.length;
    }

    if (filtered.length === 0) {
      holdingsTableTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: #94A3B8;">
            No holdings found matching "${filterQuery}"
          </td>
        </tr>
      `;
      return;
    }

    holdingsTableTbody.innerHTML = filtered.map((stock) => {
      const invAmt = stock.qty * stock.avgPrice;
      const curVal = stock.qty * stock.price;
      const overallGL = curVal - invAmt;
      const overallGLPct = invAmt > 0 ? (overallGL / invAmt) * 100 : 0;
      const isOverallPos = overallGL >= 0;

      // Calculate Day's P&L:
      // If 'over all profit' (previous profit) is provided in sheet, Today's Profit = Current Overall Profit - Previous Profit
      let dayGL, dayGLPct;
      if (stock.previousProfit !== null && stock.previousProfit !== undefined && !isNaN(stock.previousProfit)) {
        dayGL = overallGL - Number(stock.previousProfit);
        const prevDayVal = invAmt + Number(stock.previousProfit);
        dayGLPct = prevDayVal > 0 ? (dayGL / prevDayVal) * 100 : 0;
      } else {
        const refClose = stock.closePrice > 0 ? stock.closePrice : stock.avgPrice;
        dayGL = stock.qty * (stock.price - refClose);
        dayGLPct = refClose > 0 ? ((stock.price - refClose) / refClose) * 100 : 0;
      }
      const isDayPos = dayGL >= 0;

      const overallClass = isOverallPos ? 'val-positive' : 'val-negative';
      const dayClass = isDayPos ? 'val-positive' : 'val-negative';
      const idKey = stock.token || stock.symbol;

      return `
        <tr class="table-data-row holding-stock-row" data-symbol="${stock.symbol}" data-token="${stock.token || ''}">
          <td class="text-left font-medium font-bold text-dark stock-name-cell">
            <div style="font-weight: 500; color: #10233F;">${stock.symbol}</div>
            <div style="font-size: 11px; color: #94A3B8; font-weight: 400; text-transform: uppercase;">${stock.name}</div>
          </td>
          <td class="text-right font-regular">${stock.qty}</td>
          <td class="text-left font-regular">₹${formatMoney(stock.avgPrice)}</td>
          <td class="text-right font-regular live-ticker-cell" id="holding-ltp-${idKey}">₹${formatMoney(stock.price)}</td>
          <td class="text-left font-regular">₹${formatMoney(invAmt, 0)}</td>
          <td class="text-right font-regular" id="holding-cur-${idKey}">₹${formatMoney(curVal, 0)}</td>
          <td class="text-left ${overallClass}" id="holding-gl-${idKey}">
            <div class="gl-top-val">${isOverallPos ? '+' : ''}₹${formatMoney(overallGL)}</div>
            <div class="gl-bottom-val">${isOverallPos ? '+' : ''}${overallGLPct.toFixed(2)}%</div>
          </td>
          <td class="text-right ${dayClass}" id="holding-day-${idKey}">
            <div class="gl-top-val">${isDayPos ? '+' : ''}₹${formatMoney(dayGL)}</div>
            <div class="gl-bottom-val">${isDayPos ? '+' : ''}${dayGLPct.toFixed(2)}%</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Update specific stock row cells
  function updateHoldingStockRow(stock, isUp) {
    const idKey = stock.token || stock.symbol;
    const ltpEl = document.getElementById(`holding-ltp-${idKey}`);
    const curEl = document.getElementById(`holding-cur-${idKey}`);
    const glEl = document.getElementById(`holding-gl-${idKey}`);
    const dayEl = document.getElementById(`holding-day-${idKey}`);

    const invAmt = stock.qty * stock.avgPrice;
    const curVal = stock.qty * stock.price;
    const overallGL = curVal - invAmt;
    const overallGLPct = invAmt > 0 ? (overallGL / invAmt) * 100 : 0;
    const isOverallPos = overallGL >= 0;

    let dayGL, dayGLPct;
    if (stock.previousProfit !== null && stock.previousProfit !== undefined && !isNaN(stock.previousProfit)) {
      dayGL = overallGL - Number(stock.previousProfit);
      const prevDayVal = invAmt + Number(stock.previousProfit);
      dayGLPct = prevDayVal > 0 ? (dayGL / prevDayVal) * 100 : 0;
    } else {
      const refClose = stock.closePrice > 0 ? stock.closePrice : stock.avgPrice;
      dayGL = stock.qty * (stock.price - refClose);
      dayGLPct = refClose > 0 ? ((stock.price - refClose) / refClose) * 100 : 0;
    }
    const isDayPos = dayGL >= 0;

    if (ltpEl) {
      ltpEl.textContent = `₹${formatMoney(stock.price)}`;
      flashCell(ltpEl, isUp);
    }
    if (curEl) {
      curEl.textContent = `₹${formatMoney(curVal, 0)}`;
    }
    if (glEl) {
      glEl.className = `text-left ${isOverallPos ? 'val-positive' : 'val-negative'}`;
      glEl.innerHTML = `
        <div class="gl-top-val">${isOverallPos ? '+' : ''}₹${formatMoney(overallGL)}</div>
        <div class="gl-bottom-val">${isOverallPos ? '+' : ''}${overallGLPct.toFixed(2)}%</div>
      `;
    }
    if (dayEl) {
      dayEl.className = `text-right ${isDayPos ? 'val-positive' : 'val-negative'}`;
      dayEl.innerHTML = `
        <div class="gl-top-val">${isDayPos ? '+' : ''}₹${formatMoney(dayGL)}</div>
        <div class="gl-bottom-val">${isDayPos ? '+' : ''}${dayGLPct.toFixed(2)}%</div>
      `;
      flashCell(dayEl, isDayPos);
    }
  }

  // Update top summary cards
  function updateSummaryMetrics() {
    let totalInvested = 0;
    let totalCurrent = 0;
    let totalDayGL = 0;

    portfolioHoldings.forEach(stock => {
      const inv = stock.qty * stock.avgPrice;
      const cur = stock.qty * stock.price;
      const overall = cur - inv;
      let day;
      if (stock.previousProfit !== null && stock.previousProfit !== undefined && !isNaN(stock.previousProfit)) {
        day = overall - Number(stock.previousProfit);
      } else {
        const refClose = stock.closePrice > 0 ? stock.closePrice : stock.avgPrice;
        day = stock.qty * (stock.price - refClose);
      }
      totalInvested += inv;
      totalCurrent += cur;
      totalDayGL += day;
    });

    const totalOverallGL = totalCurrent - totalInvested;
    const totalOverallPct = totalInvested > 0 ? (totalOverallGL / totalInvested) * 100 : 0;
    const totalDayPct = totalInvested > 0 ? (totalDayGL / totalInvested) * 100 : 0;

    if (metricVal1) metricVal1.textContent = `₹ ${formatMoney(totalInvested, 0)}`;
    if (metricVal2) metricVal2.textContent = `₹ ${formatMoney(totalCurrent, 0)}`;

    if (metricLabel3) metricLabel3.textContent = totalOverallGL >= 0 ? "Overall Gain" : "Overall Loss";
    if (metricVal3) {
      const isPos = totalOverallGL >= 0;
      metricVal3.className = `metric-value ${isPos ? 'val-positive' : 'val-negative'}`;
      metricVal3.innerHTML = `₹ ${formatMoney(Math.abs(totalOverallGL))} <span class="val-sub-percent">${isPos ? '+' : ''}${totalOverallPct.toFixed(2)}%</span>`;
    }
    if (metricIconWrap3) {
      metricIconWrap3.className = `metric-icon-circle ${totalOverallGL >= 0 ? 'green-icon-bg' : 'red-icon-bg'}`;
    }

    if (metricLabel4) metricLabel4.textContent = totalDayGL >= 0 ? "Today's Gain" : "Today's Loss";
    if (metricVal4) {
      const isDayPos = totalDayGL >= 0;
      metricVal4.className = `metric-value ${isDayPos ? 'val-positive' : 'val-negative'}`;
      metricVal4.innerHTML = `₹ ${formatMoney(Math.abs(totalDayGL))} <span class="val-sub-percent">${isDayPos ? '+' : ''}${totalDayPct.toFixed(2)}%</span>`;
    }
    if (metricIconWrap4) {
      metricIconWrap4.className = `metric-icon-circle ${totalDayGL >= 0 ? 'green-icon-bg' : 'red-icon-bg'}`;
    }
  }

  // Handle Real-Time Market Ticks
  function handleMarketData(event) {
    const dataList = Array.isArray(event.detail) ? event.detail : [event.detail];
    const ticksByToken = {};
    const ticksBySymbol = {};

    dataList.forEach(tick => {
      if (!tick) return;
      const rawToken = tick.token ?? tick.subscriptionToken ?? tick.instrumentToken;
      const token = String(rawToken || "").replace(/^["'\\]+|["'\\]+$/g, "").trim();
      if (token) ticksByToken[token] = tick;
      if (tick.symbol) ticksBySymbol[String(tick.symbol).toUpperCase()] = tick;
      if (tick.rawSymbol) ticksBySymbol[String(tick.rawSymbol).toUpperCase()] = tick;
    });

    let changed = false;

    portfolioHoldings.forEach(stock => {
      const cleanTok = String(stock.token || "").replace(/^["'\\]+|["'\\]+$/g, "").trim();
      const tick = (cleanTok && ticksByToken[cleanTok]) || ticksBySymbol[String(stock.symbol).toUpperCase()];
      if (!tick) return;

      const price = typeof window.parseTickPrice === 'function'
        ? window.parseTickPrice(tick)
        : Number(tick.ltp || tick.price || (tick.last_traded_price ? tick.last_traded_price / 100 : undefined));

      const close = typeof window.parseTickClose === 'function'
        ? window.parseTickClose(tick)
        : Number(tick.closePrice || (tick.close_price ? tick.close_price / 100 : undefined));

      if (price && Number.isFinite(price) && price > 0 && Math.abs(stock.price - price) > 0.001) {
        const isUp = price >= stock.price;
        stock.price = price;
        if (close && Number.isFinite(close) && close > 0) {
          stock.closePrice = close;
        }
        changed = true;
        updateHoldingStockRow(stock, isUp);
      }
    });

    if (changed) {
      updateSummaryMetrics();
      renderTopDrivers();
    }
  }

  document.addEventListener("backend-market-data", handleMarketData);
  document.addEventListener("backend-sheet-stocks", loadPortfolioSheetStocks);

  // Auto-sync when user switches back to tab or every 15 seconds
  window.addEventListener("focus", loadPortfolioSheetStocks);
  setInterval(loadPortfolioSheetStocks, 15000);

  // 1. Tab Switching Function
  function switchTab(targetTab) {
    currentTab = targetTab;
    if (targetTab === 'overview') {
      btnTabOverview.classList.add('active');
      btnTabEquity.classList.remove('active');
      viewPaneOverview.classList.add('active');
      viewPaneEquity.classList.remove('active');
    } else if (targetTab === 'equity') {
      btnTabEquity.classList.add('active');
      btnTabOverview.classList.remove('active');
      viewPaneEquity.classList.add('active');
      viewPaneOverview.classList.remove('active');
    }
  }

  if (btnTabOverview) {
    btnTabOverview.addEventListener('click', () => switchTab('overview'));
  }
  if (btnTabEquity) {
    btnTabEquity.addEventListener('click', () => switchTab('equity'));
  }
  if (overviewEquityRow) {
    overviewEquityRow.addEventListener('click', () => switchTab('equity'));
  }

  // 2. Watchlist Toggle
  function toggleWatchlist() {
    if (!watchlistSidebar) return;
    const isHidden = watchlistSidebar.classList.toggle('collapsed');
    if (hideWatchlistText) {
      hideWatchlistText.textContent = isHidden ? 'SHOW WATCHLIST' : 'HIDE WATCHLIST';
    }
    if (reopenWatchlistBtn) {
      reopenWatchlistBtn.classList.toggle('show', isHidden);
    }
  }

  if (btnHideWatchlist) {
    btnHideWatchlist.addEventListener('click', toggleWatchlist);
  }
  if (reopenWatchlistBtn) {
    reopenWatchlistBtn.addEventListener('click', toggleWatchlist);
  }

  // 3. Holdings Live Search
  if (holdingsSearchInput) {
    holdingsSearchInput.addEventListener('input', (e) => {
      filterQuery = e.target.value;
      renderHoldings();
    });
  }

  // 4. Portfolio Allocation View Toggle
  if (btnViewSector && btnViewMarketCap) {
    btnViewSector.addEventListener('click', () => {
      btnViewSector.classList.add('active');
      btnViewMarketCap.classList.remove('active');
    });

    btnViewMarketCap.addEventListener('click', () => {
      btnViewMarketCap.classList.add('active');
      btnViewSector.classList.remove('active');
    });
  }

  // 5. Top Drivers Toggle (Dynamic Gainers vs Losers)
  let activeDriverTab = 'gainers';

  function renderTopDrivers() {
    if (!topDriversTbody || portfolioHoldings.length === 0) return;

    const list = [...portfolioHoldings].map(s => {
      const dayDiff = s.price - s.closePrice;
      const dayPct = s.closePrice > 0 ? (dayDiff / s.closePrice) * 100 : 0;
      return {
        symbol: s.symbol,
        name: s.name,
        closePrice: s.closePrice,
        price: s.price,
        dayDiff,
        dayPct
      };
    });

    if (activeDriverTab === 'gainers') {
      list.sort((a, b) => b.dayPct - a.dayPct);
    } else {
      list.sort((a, b) => a.dayPct - b.dayPct);
    }

    const topItems = list.slice(0, 3);
    topDriversTbody.innerHTML = topItems.map(item => {
      const isPos = item.dayPct >= 0;
      const valClass = isPos ? 'val-positive' : 'val-negative';
      const sign = isPos ? '+' : '';
      return `
        <tr>
          <td class="text-left font-bold stock-driver-name">${item.symbol}</td>
          <td class="text-right text-muted">${formatMoney(item.closePrice)}</td>
          <td class="text-right font-medium">${formatMoney(item.price)}</td>
          <td class="text-right ${valClass} font-medium">${sign}${item.dayPct.toFixed(2)}%</td>
        </tr>
      `;
    }).join('');
  }

  if (btnGainers && btnLosers && topDriversTbody) {
    btnGainers.addEventListener('click', () => {
      btnGainers.classList.add('active');
      btnLosers.classList.remove('active');
      activeDriverTab = 'gainers';
      renderTopDrivers();
    });

    btnLosers.addEventListener('click', () => {
      btnLosers.classList.add('active');
      btnGainers.classList.remove('active');
      activeDriverTab = 'losers';
      renderTopDrivers();
    });
  }

  // 6. Portfolio Events Toggle (Bonus vs Splits)
  if (btnEventsBonus && btnEventsSplits && eventsEmptyText) {
    btnEventsBonus.addEventListener('click', () => {
      btnEventsBonus.classList.add('active');
      btnEventsSplits.classList.remove('active');
      eventsEmptyText.textContent = 'No stocks with Bonus found in your portfolio.';
    });

    btnEventsSplits.addEventListener('click', () => {
      btnEventsSplits.classList.add('active');
      btnEventsBonus.classList.remove('active');
      eventsEmptyText.textContent = 'No stocks with Splits found in your portfolio.';
    });
  }

  // 7. Group Holdings Dropdown
  if (btnGroupBy && dropdownGroupByMenu) {
    btnGroupBy.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownGroupByMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!btnGroupBy.contains(e.target) && !dropdownGroupByMenu.contains(e.target)) {
        dropdownGroupByMenu.classList.remove('open');
      }
    });

    const options = dropdownGroupByMenu.querySelectorAll('.dropdown-opt');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const text = opt.textContent.trim();
        btnGroupBy.querySelector('span').textContent = text === 'None' ? 'GROUP HOLDINGS BY' : `GROUPED: ${text.toUpperCase()}`;
        dropdownGroupByMenu.classList.remove('open');
      });
    });
  }

  // 8. Sorting on Tables
  function makeSortable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = table.querySelectorAll('th.sortable');
    headers.forEach((th, idx) => {
      let asc = true;
      th.addEventListener('click', () => {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
          const aCell = a.children[idx]?.textContent.trim().replace(/[₹,%,]/g, '') || '';
          const bCell = b.children[idx]?.textContent.trim().replace(/[₹,%,]/g, '') || '';

          const aNum = parseFloat(aCell);
          const bNum = parseFloat(bCell);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return asc ? aNum - bNum : bNum - aNum;
          }
          return asc ? aCell.localeCompare(bCell) : bCell.localeCompare(aCell);
        });

        asc = !asc;
        const arrow = th.querySelector('.sort-icon-glyph');
        if (arrow) arrow.textContent = asc ? '▲' : '▼';

        rows.forEach(row => tbody.appendChild(row));
      });
    });
  }

  makeSortable('portfolioBreakupTable');
  makeSortable('holdingsDataTable');

  // Initialize Portfolio
  loadPortfolioSheetStocks();
});
