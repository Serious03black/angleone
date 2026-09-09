/**
 * Markets Page Logic & Index Tab Controller with Real-Time Updates
 */

document.addEventListener("DOMContentLoaded", () => {
  const indexTabsContainer = document.getElementById("index-tabs-bar");
  const mostBoughtContainer = document.getElementById("most-bought-grid");

  if (!indexTabsContainer && !mostBoughtContainer) return;

  const data = window.AngelOneData;
  let activeIndex = "NIFTY";

  // Render Index Selector Tabs
  function renderIndexTabs() {
    if (!indexTabsContainer) return;
    indexTabsContainer.innerHTML = data.indices.map(idx => {
      const isSelected = idx.name === activeIndex;
      const valClass = idx.direction === "up" ? "val-up" : "val-down";
      const arrow = idx.direction === "up" ? "▲" : "▼";

      return `
        <div class="index-tab-item ${isSelected ? 'active' : ''}" data-name="${idx.name}">
          <span class="index-tab-name">${idx.name}</span>
          <div class="index-tab-val ${valClass}">
            <span>${idx.value}</span>
            <span style="font-size: 9px; margin-left: 2px;">${arrow}</span>
            <span style="font-size: 10px; font-weight: 500;">${idx.change} (${idx.percentage})</span>
          </div>
        </div>
      `;
    }).join("") + `<div class="card-link" style="margin-left: auto; font-size: 11px; white-space: nowrap;">VIEW ALL &gt;</div>`;

    // Click handler for Index tabs
    const tabItems = indexTabsContainer.querySelectorAll(".index-tab-item");
    tabItems.forEach(item => {
      item.addEventListener("click", () => {
        activeIndex = item.getAttribute("data-name");
        renderIndexTabs();
        updateIndexStats();
      });
    });
  }

  // Update High/Low & Chart for selected index
  function updateIndexStats() {
    const stats = data.indexStats[activeIndex] || data.indexStats["NIFTY"];

    const currentEl = document.getElementById("stat-current");
    const lowEl = document.getElementById("stat-low");
    const highEl = document.getElementById("stat-high");
    const openEl = document.getElementById("stat-open");
    const closeEl = document.getElementById("stat-close");
    const highSubEl = document.getElementById("stat-high-sub");
    const lowSubEl = document.getElementById("stat-low-sub");
    const pointerEl = document.getElementById("range-pointer");

    if (currentEl) currentEl.innerText = stats.current;
    if (lowEl) lowEl.innerText = stats.low;
    if (highEl) highEl.innerText = stats.high;
    if (highSubEl) highSubEl.innerText = stats.high;
    if (lowSubEl) lowSubEl.innerText = stats.low;
    if (openEl) openEl.innerText = stats.open;
    if (closeEl) closeEl.innerText = stats.close;

    // Calculate pointer percentage along range bar
    if (pointerEl) {
      const lowNum = parseFloat(String(stats.low).replace(/,/g, ""));
      const highNum = parseFloat(String(stats.high).replace(/,/g, ""));
      const currNum = parseFloat(String(stats.current).replace(/,/g, ""));
      if (highNum > lowNum) {
        const pct = Math.max(5, Math.min(95, ((currNum - lowNum) / (highNum - lowNum)) * 100));
        pointerEl.style.left = `${pct}%`;
      }
    }

    // Render Canvas Area Chart
    if (window.renderMarketChart) {
      const currNum = parseFloat(String(stats.current).replace(/,/g, ""));
      window.renderMarketChart("market-chart-canvas", stats.timeSeries, currNum);
    }
  }

  // Render Most Bought Stocks Cards
  function renderMostBoughtStocks() {
    if (!mostBoughtContainer) return;
    mostBoughtContainer.innerHTML = data.mostBought.map(stock => {
      const isPositive = stock.direction === "up";
      const valClass = isPositive ? "val-up" : "val-down";
      const arrow = isPositive ? "▲" : "▼";

      return `
        <div class="stock-card" data-symbol="${stock.symbol}">
          <div class="stock-card-top">
            <div class="stock-card-logo" style="background-color: ${stock.logoBg};">
              ${stock.logoText}
            </div>
            <div class="stock-card-meta">
              <span class="stock-card-symbol">${stock.symbol}</span>
              <span class="stock-card-fullname">${stock.name}</span>
            </div>
          </div>
          <div class="stock-card-price-row ${valClass}">
            <span>₹${typeof stock.price === 'number' ? stock.price.toFixed(2) : stock.price}</span>
            <span style="font-size: 10px;">${arrow}</span>
            <span class="stock-card-change">${stock.change} (${stock.percentage})</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function handleMarketData(event) {
    const dataList = Array.isArray(event.detail) ? event.detail : [event.detail];
    let changed = false;

    dataList.forEach(tick => {
      if (!tick) return;
      const token = String(tick.token ?? tick.subscriptionToken ?? "");
      const sym = String(tick.symbol || "").toUpperCase();

      const price = typeof window.parseTickPrice === 'function'
        ? window.parseTickPrice(tick)
        : Number(tick.ltp || (tick.last_traded_price ? tick.last_traded_price / 100 : undefined));

      const close = typeof window.parseTickClose === 'function'
        ? window.parseTickClose(tick)
        : Number(tick.closePrice || (tick.close_price ? tick.close_price / 100 : undefined));

      if (!price || !Number.isFinite(price)) return;

      // Update Indices
      const idxObj = data.indices.find(i => (i.name === "NIFTY" && (token === "99926000" || sym === "NIFTY")) ||
                                           (i.name === "SENSEX" && (token === "99919000" || sym === "SENSEX")));
      if (idxObj) {
        idxObj.value = price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const refClose = close || parseFloat(idxObj.value.replace(/,/g, ""));
        const diff = price - refClose;
        const pct = (diff / refClose) * 100;
        idxObj.change = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`;
        idxObj.percentage = `${diff >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
        idxObj.direction = diff >= 0 ? "up" : "down";
        changed = true;

        if (data.indexStats[idxObj.name]) {
          data.indexStats[idxObj.name].current = idxObj.value;
          data.indexStats[idxObj.name].change = idxObj.change;
          data.indexStats[idxObj.name].percentage = idxObj.percentage;
        }
      }

      // Update Most Bought Stocks
      const mbStock = data.mostBought.find(s => s.symbol === sym || (token === "14366" && s.symbol === "IDEA") || (token === "11915" && s.symbol === "YESBANK"));
      if (mbStock) {
        mbStock.price = price.toFixed(2);
        const refClose = close || parseFloat(mbStock.price);
        const diff = price - refClose;
        const pct = (diff / refClose) * 100;
        mbStock.change = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`;
        mbStock.percentage = `${diff >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
        mbStock.direction = diff >= 0 ? "up" : "down";
        changed = true;
      }
    });

    if (changed) {
      renderIndexTabs();
      updateIndexStats();
      renderMostBoughtStocks();
    }
  }

  document.addEventListener("backend-market-data", handleMarketData);

  // Timeframe selector buttons click handlers
  const tfBtns = document.querySelectorAll(".tf-btn");
  tfBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tfBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateIndexStats();
    });
  });

  renderIndexTabs();
  updateIndexStats();
  renderMostBoughtStocks();
  window.addEventListener("resize", updateIndexStats);
});
