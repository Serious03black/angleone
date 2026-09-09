/**
 * Global Real-Time Backend WebSocket & Serverless Polling Connector
 * Price updates are ONLY processed during NSE/BSE market hours: 9:15 AM – 3:30 PM IST (Mon–Fri).
 * Outside those hours one initial fetch is done to show the correct closing price, then all
 * polling and incoming price events are silently ignored so the price never changes.
 */
(function () {
  const backendUrl = "";
  let lastWsMessageTime = 0;
  let pollingInterval = null;

  window.marketStocks = window.marketStocks || [];
  window.marketTicks  = window.marketTicks  || {};

  // ─── Market Hours Gate ────────────────────────────────────────────────────
  // Returns true only Mon–Fri between 9:15 AM and 3:30 PM IST.
  function isMarketOpen() {
    try {
      const istStr  = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const ist     = new Date(istStr);
      const day     = ist.getDay();           // 0 Sun … 6 Sat
      if (day === 0 || day === 6) return false;
      const mins    = ist.getHours() * 60 + ist.getMinutes();
      return mins >= (9 * 60 + 15) && mins < (15 * 60 + 30); // 555 – 930
    } catch (_) {
      return false; // safe default: treat as closed
    }
  }
  // Expose globally so other scripts can use the same check
  window.isMarketOpen = isMarketOpen;

  // ─── Tick Parsers ────────────────────────────────────────────────────────
  window.parseTickPrice = function (tick) {
    if (!tick) return undefined;
    if (tick.ltp  !== undefined && Number(tick.ltp)  > 0) return Number(tick.ltp);
    if (tick.price !== undefined && Number(tick.price) > 0) return Number(tick.price);
    if (tick.last_traded_price !== undefined) return Number(tick.last_traded_price) / 100;
    if (tick.lastTradedPrice   !== undefined) return Number(tick.lastTradedPrice)   / 100;
    return undefined;
  };

  window.parseTickClose = function (tick) {
    if (!tick) return undefined;
    if (tick.closePrice !== undefined && Number(tick.closePrice) > 0) return Number(tick.closePrice);
    if (tick.close_price !== undefined) return Number(tick.close_price) / 100;
    if (tick.close       !== undefined) return Number(tick.close);
    return undefined;
  };

  // ─── Core Data Processor ─────────────────────────────────────────────────
  // IMPORTANT: always check isMarketOpen() before calling this.
  function processMarketData(data) {
    if (!data) return;

    // ── Hard gate: outside market hours ignore ALL incoming price data ──────
    if (!isMarketOpen()) return;

    window.latestMarketData = data;
    window.latestMarketTick = data;

    const ticks = Array.isArray(data) ? data : [data];
    ticks.forEach((tick) => {
      if (!tick) return;
      const rawToken = tick.token ?? tick.subscriptionToken ?? tick.instrumentToken;
      const token = String(rawToken || "").replace(/^["'\\]+|["'\\]+$/g, "").trim();
      if (token) window.marketTicks[token] = tick;
      if (tick.symbol)    window.marketTicks[String(tick.symbol).toUpperCase()]    = tick;
      if (tick.rawSymbol) window.marketTicks[String(tick.rawSymbol).toUpperCase()] = tick;
    });

    document.dispatchEvent(new CustomEvent("backend-market-data", { detail: data }));

    const niftyTick = ticks.find(t => t && (t.token === "99926000" || t.symbol === "NIFTY"));
    if (niftyTick) document.dispatchEvent(new CustomEvent("backend-nifty-data",  { detail: niftyTick }));

    const sensexTick = ticks.find(t => t && (t.token === "99919000" || t.symbol === "SENSEX"));
    if (sensexTick) document.dispatchEvent(new CustomEvent("backend-sensex-data", { detail: sensexTick }));
  }

  // ─── Initial Fetch (runs once on page load) ───────────────────────────────
  // Always fetches so the correct closing price (or current live price) is shown
  // immediately — regardless of market hours.
  function initialFetch() {
    fetch("/api/stocks", { cache: "no-store" })
      .then(res => res.json())
      .then(stocks => {
        if (!Array.isArray(stocks) || stocks.length === 0) return;
        window.marketStocks = stocks;
        // Seed marketTicks so watchlist / other components have data right away
        stocks.forEach(tick => {
          if (!tick) return;
          const rawToken = tick.token ?? tick.subscriptionToken;
          const token = String(rawToken || "").replace(/^["'\\]+|["'\\]+$/g, "").trim();
          if (token) window.marketTicks[token] = tick;
          if (tick.symbol)    window.marketTicks[String(tick.symbol).toUpperCase()]    = tick;
          if (tick.rawSymbol) window.marketTicks[String(tick.rawSymbol).toUpperCase()] = tick;
        });
        document.dispatchEvent(new CustomEvent("backend-stocks",      { detail: stocks }));
        document.dispatchEvent(new CustomEvent("backend-market-data", { detail: stocks }));
      })
      .catch(() => {});
  }

  // ─── HTTP Polling (only during market hours) ─────────────────────────────
  function startHttpPolling() {
    if (pollingInterval) return;
    if (!isMarketOpen()) {
      console.log("[Backend] Market closed – HTTP polling disabled.");
      return;
    }

    async function poll() {
      // Skip if WebSocket delivered fresh data in the last 4 s
      if (window.backendSocket && window.backendSocket.connected && (Date.now() - lastWsMessageTime < 4000)) return;
      // Double-check market is still open each tick (handles the 3:30 PM boundary)
      if (!isMarketOpen()) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("[Backend] Market closed – stopping HTTP polling.");
        return;
      }
      try {
        const res = await fetch("/api/stocks", { cache: "no-store" });
        if (res.ok) {
          const stocks = await res.json();
          if (Array.isArray(stocks) && stocks.length > 0) processMarketData(stocks);
        }
      } catch (_) { /* silently continue */ }
    }

    pollingInterval = setInterval(poll, 2000);
    console.log("[Backend] Market open – HTTP polling started (2 s interval).");
  }

  // ─── WebSocket Connection ─────────────────────────────────────────────────
  function connectBackend() {
    initialFetch();
    startHttpPolling(); // no-op when market closed

    if (typeof io !== "function") return null;
    if (window.backendSocket) return window.backendSocket;

    try {
      const socket = io(backendUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        timeout: 5000
      });
      window.backendSocket = socket;

      // stocks — always process (carries the correct closePrice outside hours)
      socket.on("stocks", (stocks) => {
        lastWsMessageTime = Date.now();
        window.marketStocks = stocks;
        document.dispatchEvent(new CustomEvent("backend-stocks", { detail: stocks }));
      });

      socket.on("status", (data) => {
        window.backendConnected = Boolean(data.connected);
        document.dispatchEvent(new CustomEvent("backend-status", { detail: data }));
        // If the server tells us market just opened, kick off polling if not already running
        if (data.marketOpen && !pollingInterval) startHttpPolling();
        // If the server tells us market just closed, stop polling
        if (data.marketOpen === false && pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      });

      // marketData / niftyData / sensexData — ONLY process during market hours
      socket.on("marketData", (data) => {
        lastWsMessageTime = Date.now();
        if (!isMarketOpen()) return; // closed → ignore, keep last closing price
        processMarketData(data);
      });

      socket.on("niftyData", (data) => {
        lastWsMessageTime = Date.now();
        if (!isMarketOpen()) return;
        document.dispatchEvent(new CustomEvent("backend-nifty-data", { detail: data }));
      });

      socket.on("sensexData", (data) => {
        lastWsMessageTime = Date.now();
        if (!isMarketOpen()) return;
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
      console.warn("Socket.io init fallback to HTTP polling:", err.message);
      return null;
    }
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  function loadSocketIoClient() {
    if (typeof io === "function") {
      connectBackend();
      return;
    }
    const script    = document.createElement("script");
    script.src      = "https://cdn.socket.io/4.8.1/socket.io.min.js";
    script.onload   = connectBackend;
    script.onerror  = () => {
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