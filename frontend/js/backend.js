/**
 * Global Real-Time Backend WebSocket Connector
 */
(function () {
  const backendUrl = "";

  window.parseTickPrice = function (tick) {
    if (!tick) return undefined;
    const raw = tick.last_traded_price ?? tick.lastTradedPrice ?? tick.ltp ?? tick.price;
    if (raw === undefined) return undefined;
    const num = Number(raw);
    if (num > 100000 && tick.last_traded_price !== undefined) {
      return num / 100;
    }
    return num > 10000 && num % 1 === 0 && tick.last_traded_price !== undefined ? num / 100 : num;
  };

  window.parseTickClose = function (tick) {
    if (!tick) return undefined;
    const raw = tick.close_price ?? tick.closePrice ?? tick.close;
    if (raw === undefined) return undefined;
    const num = Number(raw);
    if (num > 100000 && tick.close_price !== undefined) {
      return num / 100;
    }
    return num > 10000 && num % 1 === 0 && tick.close_price !== undefined ? num / 100 : num;
  };

  function connectBackend() {
    if (typeof io !== "function") {
      console.warn("Socket.IO client is loading...");
      return null;
    }

    if (window.backendSocket) return window.backendSocket;

    const socket = io(backendUrl);
    window.backendSocket = socket;
    window.marketStocks = [];
    window.marketTicks = {};

    socket.on("stocks", (stocks) => {
      window.marketStocks = stocks;
      document.dispatchEvent(new CustomEvent("backend-stocks", { detail: stocks }));
    });

    socket.on("status", (data) => {
      window.backendConnected = Boolean(data.connected);
      document.dispatchEvent(new CustomEvent("backend-status", { detail: data }));
    });

    socket.on("marketData", (data) => {
      window.latestMarketData = data;
      window.latestMarketTick = data;

      const ticks = Array.isArray(data) ? data : [data];
      ticks.forEach((tick) => {
        if (!tick) return;
        const rawToken = tick.token ?? tick.subscriptionToken ?? tick.instrumentToken;
        const token = String(rawToken || "").replace(/^["'\\]+|["'\\]+$/g, "").trim();
        if (token) {
          window.marketTicks[token] = tick;
        }
        if (tick.symbol) {
          window.marketTicks[String(tick.symbol).toUpperCase()] = tick;
        }
        if (tick.rawSymbol) {
          window.marketTicks[String(tick.rawSymbol).toUpperCase()] = tick;
        }
      });

      document.dispatchEvent(new CustomEvent("backend-market-data", { detail: data }));
    });

    socket.on("niftyData", (data) => {
      document.dispatchEvent(new CustomEvent("backend-nifty-data", { detail: data }));
    });

    socket.on("sensexData", (data) => {
      document.dispatchEvent(new CustomEvent("backend-sensex-data", { detail: data }));
    });

    socket.on("sheetStocks", (data) => {
      window.sheetStocksData = data;
      document.dispatchEvent(new CustomEvent("backend-sheet-stocks", { detail: data }));
      if (typeof window.AngelOneData !== 'undefined' && typeof window.AngelOneData.reloadSheet === 'function') {
        window.AngelOneData.reloadSheet();
      }
    });

    return socket;
  }

  function loadSocketIoClient() {
    if (typeof io === "function") {
      connectBackend();
      return;
    }

    const script = document.createElement("script");
    script.src = `${backendUrl}/socket.io/socket.io.js`;
    script.onload = connectBackend;
    script.onerror = () => console.error("Could not load Socket.IO from the backend.");
    document.head.appendChild(script);
  }

  loadSocketIoClient();
})();