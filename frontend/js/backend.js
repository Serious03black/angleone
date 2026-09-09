/**
 * Global Real-Time Backend WebSocket & Serverless Polling Connector
 * Seamlessly supports both local WebSockets and Vercel serverless environments.
 */
(function () {
  const backendUrl = "";
  let lastWsMessageTime = 0;
  let pollingInterval = null;

  window.marketStocks = window.marketStocks || [];
  window.marketTicks = window.marketTicks || {};

  window.parseTickPrice = function (tick) {
    if (!tick || typeof tick !== 'object') return undefined;
    if (typeof tick.price === 'number' && !isNaN(tick.price) && tick.price > 0) return tick.price;
    if (typeof tick.ltp === 'number' && !isNaN(tick.ltp) && tick.ltp > 0) return tick.ltp;
    if (tick.price !== undefined && !isNaN(Number(tick.price)) && Number(tick.price) > 0) return Number(tick.price);
    if (tick.ltp !== undefined && !isNaN(Number(tick.ltp)) && Number(tick.ltp) > 0) return Number(tick.ltp);

    const raw = tick.last_traded_price ?? tick.lastTradedPrice;
    if (raw !== undefined && raw !== null) {
      const num = Number(raw);
      if (!isNaN(num) && num > 0) {
        return +(num / 100).toFixed(2);
      }
    }
    return undefined;
  };

  window.parseTickClose = function (tick) {
    if (!tick || typeof tick !== 'object') return undefined;
    if (typeof tick.closePrice === 'number' && !isNaN(tick.closePrice) && tick.closePrice > 0) return tick.closePrice;
    if (typeof tick.close === 'number' && !isNaN(tick.close) && tick.close > 0) return tick.close;
    if (tick.closePrice !== undefined && !isNaN(Number(tick.closePrice)) && Number(tick.closePrice) > 0) return Number(tick.closePrice);
    if (tick.close !== undefined && !isNaN(Number(tick.close)) && Number(tick.close) > 0) return Number(tick.close);

    const raw = tick.close_price;
    if (raw !== undefined && raw !== null) {
      const num = Number(raw);
      if (!isNaN(num) && num > 0) {
        return +(num / 100).toFixed(2);
      }
    }
    return undefined;
  };

  function processMarketData(data) {
    if (!data) return;
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

    const niftyTick = ticks.find(t => t && (t.token === "99926000" || t.symbol === "NIFTY"));
    if (niftyTick) {
      document.dispatchEvent(new CustomEvent("backend-nifty-data", { detail: niftyTick }));
    }

    const sensexTick = ticks.find(t => t && (t.token === "99919000" || t.symbol === "SENSEX"));
    if (sensexTick) {
      document.dispatchEvent(new CustomEvent("backend-sensex-data", { detail: sensexTick }));
    }
  }

  function startHttpPolling() {
    if (pollingInterval) return;

    async function poll() {
      // If WebSocket is actively connected and received live data within last 4s, skip HTTP poll
      if (window.backendSocket && window.backendSocket.connected && (Date.now() - lastWsMessageTime < 4000)) {
        return;
      }

      try {
        const res = await fetch("/api/stocks", { cache: "no-store" });
        if (res.ok) {
          const stocks = await res.json();
          if (Array.isArray(stocks) && stocks.length > 0) {
            processMarketData(stocks);
          }
        }
      } catch (err) {
        // Silently continue polling
      }
    }

    // Run poll every 2 seconds for smooth serverless live updates
    pollingInterval = setInterval(poll, 2000);
  }

  // Immediate fetch on page boot for zero-delay display
  function initialFetch() {
    fetch("/api/stocks", { cache: "no-store" })
      .then(res => res.json())
      .then(stocks => {
        if (Array.isArray(stocks) && stocks.length > 0) {
          window.marketStocks = stocks;
          document.dispatchEvent(new CustomEvent("backend-stocks", { detail: stocks }));
          processMarketData(stocks);
        }
      })
      .catch(() => {});
  }

  function connectBackend() {
    initialFetch();
    startHttpPolling();

    if (typeof io !== "function") {
      return null;
    }

    if (window.backendSocket) return window.backendSocket;

    try {
      const socket = io(backendUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        timeout: 5000
      });
      window.backendSocket = socket;

      socket.on("stocks", (stocks) => {
        lastWsMessageTime = Date.now();
        window.marketStocks = stocks;
        document.dispatchEvent(new CustomEvent("backend-stocks", { detail: stocks }));
      });

      socket.on("status", (data) => {
        window.backendConnected = Boolean(data.connected);
        document.dispatchEvent(new CustomEvent("backend-status", { detail: data }));
      });

      socket.on("marketData", (data) => {
        lastWsMessageTime = Date.now();
        processMarketData(data);
      });

      socket.on("niftyData", (data) => {
        lastWsMessageTime = Date.now();
        document.dispatchEvent(new CustomEvent("backend-nifty-data", { detail: data }));
      });

      socket.on("sensexData", (data) => {
        lastWsMessageTime = Date.now();
        document.dispatchEvent(new CustomEvent("backend-sensex-data", { detail: data }));
      });

      socket.on("sheetStocks", (data) => {
        window.sheetStocksData = data;
        document.dispatchEvent(new CustomEvent("backend-sheet-stocks", { detail: data }));
        if (typeof window.AngelOneData !== "undefined" && typeof window.AngelOneData.reloadSheet === "function") {
          window.AngelOneData.reloadSheet();
        }
      });

      return socket;
    } catch (err) {
      console.warn("Socket.io initialization fallback to HTTP polling:", err.message);
      return null;
    }
  }

  function loadSocketIoClient() {
    if (typeof io === "function") {
      connectBackend();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.8.1/socket.io.min.js";
    script.onload = connectBackend;
    script.onerror = () => {
      console.warn("Could not load Socket.IO CDN; using serverless HTTP polling.");
      initialFetch();
      startHttpPolling();
    };
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSocketIoClient);
  } else {
    loadSocketIoClient();
  }
})();