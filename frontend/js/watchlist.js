/**
 * Watchlist Sidebar Component Logic with Google Sheets & Real-Time Updates
 */

(function () {
  let currentList = [];
  let filterQuery = "";

  function initWatchlist() {
    reloadWatchlistData();
    attachEventListeners();
    document.addEventListener("backend-market-data", updateFromMarketData);
    document.addEventListener("backend-sheet-stocks", reloadWatchlistData);
  }

  function reloadWatchlistData() {
    currentList = window.AngelOneData ? window.AngelOneData.getWatchlist() : [];
    renderWatchlist();
    if (window.marketTicks && Object.keys(window.marketTicks).length > 0) {
      updateFromMarketData({ detail: Object.values(window.marketTicks) });
    }
  }

  function updateFromMarketData(event) {
    const data = event.detail;
    const tickList = Array.isArray(data) ? data : [data];
    const ticksByToken = {};
    const ticksBySymbol = {};

    tickList.forEach((tick) => {
      if (!tick) return;
      const token = tick.token ?? tick.subscriptionToken ?? tick.instrumentToken;
      if (token !== undefined) ticksByToken[String(token)] = tick;
      if (tick.symbol) ticksBySymbol[String(tick.symbol).toUpperCase()] = tick;
      if (tick.rawSymbol) ticksBySymbol[String(tick.rawSymbol).toUpperCase()] = tick;
    });

    let changed = false;

    currentList.forEach((stock) => {
      const config = (window.marketStocks || []).find(item => item.symbol === stock.symbol || item.token === stock.token);
      const tick = (config && ticksByToken[String(config.token)]) ||
                   ticksBySymbol[stock.symbol] ||
                   (stock.token && ticksByToken[String(stock.token)]);

      if (!tick) return;

      const price = typeof window.parseTickPrice === 'function'
        ? window.parseTickPrice(tick)
        : Number(tick.ltp || (tick.last_traded_price ? tick.last_traded_price / 100 : undefined));

      const close = typeof window.parseTickClose === 'function'
        ? window.parseTickClose(tick)
        : Number(tick.closePrice || (tick.close_price ? tick.close_price / 100 : undefined));

      if (price !== undefined && Number.isFinite(price) && price > 0) {
        if (stock.price !== price) {
          stock.price = price;
          const refClose = (close !== undefined && Number.isFinite(close) && close > 0)
            ? close
            : (stock.price - stock.change);

          if (refClose && Number.isFinite(refClose)) {
            stock.change = price - refClose;
            stock.percentage = ((price - refClose) / refClose) * 100;
            stock.direction = stock.change >= 0 ? "up" : "down";
          }
          changed = true;
        }
      }
    });

    if (changed) renderWatchlist();
  }

  function renderWatchlist() {
    const container = document.getElementById("watchlist-items-container");
    if (!container) return;

    const filtered = currentList.filter(item => 
      item.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(filterQuery.toLowerCase())
    );

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding: 20px; text-align: center; color: #94A3B8; font-size: 12px;">No stocks found matching "${filterQuery}"</div>`;
      return;
    }

    container.innerHTML = filtered.map((stock) => {
      const isPositive = stock.direction === "up";
      const changeSign = isPositive ? "+" : "";
      const arrowIcon = isPositive ? "▲" : "▼";
      const valClass = isPositive ? "val-up" : "val-down";
      const fnoBadge = stock.isFno ? `<span style="color: #7E22CE; font-size: 10px; margin-left: 2px;">◇</span>` : "";

      return `
        <div class="stock-item" data-symbol="${stock.symbol}" data-token="${stock.token || ''}">
          <div class="stock-info-left">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-exchange">${stock.exchange}</span>
            ${fnoBadge}
          </div>
          <div class="stock-info-right">
            <div class="stock-price-row ${valClass}">
              <span>${Number(stock.price).toFixed(2)}</span>
              <span style="font-size: 9px; margin-left: 2px;">${arrowIcon}</span>
            </div>
            <div class="stock-change-row ${valClass}">
              <span>${changeSign}${Number(stock.change).toFixed(2)} (${changeSign}${Number(stock.percentage).toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Attach click events to each stock row
    const stockItems = container.querySelectorAll(".stock-item");
    stockItems.forEach(item => {
      item.addEventListener("click", () => {
        stockItems.forEach(el => el.classList.remove("selected"));
        item.classList.add("selected");
        const symbol = item.getAttribute("data-symbol");
        const selectedStock = currentList.find(s => s.symbol === symbol);
        if (window.onStockSelected) {
          window.onStockSelected(selectedStock);
        }
      });
    });
  }

  function attachEventListeners() {
    const searchInput = document.getElementById("watchlist-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        filterQuery = e.target.value;
        renderWatchlist();
      });
    }

    const addBtn = document.getElementById("add-stock-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const symbol = prompt("Enter stock symbol to add (e.g. RELIANCE, INFOSYS):");
        if (symbol && symbol.trim()) {
          const newStock = {
            symbol: symbol.trim().toUpperCase(),
            exchange: "NSE",
            name: `${symbol.trim().toUpperCase()} India Ltd`,
            price: +(Math.random() * 500 + 50).toFixed(2),
            change: +(Math.random() * 4 - 2).toFixed(2),
            percentage: +(Math.random() * 2 - 1).toFixed(2),
            direction: Math.random() > 0.5 ? "up" : "down"
          };
          currentList.unshift(newStock);
          window.AngelOneData.saveWatchlist(currentList);
          renderWatchlist();
          if (window.showToast) {
            window.showToast(`✓ Added ${newStock.symbol} to watchlist`);
          }
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", initWatchlist);
  window.refreshWatchlist = reloadWatchlistData;
})();
