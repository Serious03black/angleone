/**
 * Global App Core Controller, Real-Time Header Ticker, Toast System, Trade Modal & Ask Angel Assistant
 */

(function () {
  // Toast Notification System
  function showToast(message) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  window.showToast = showToast;

  // Real-Time Header Ticker Controller (NIFTY & SENSEX)
  function initHeaderTicker() {
    const niftyPriceEl = document.getElementById("nifty-price");
    const niftyChangeEl = document.getElementById("nifty-change");
    const niftyArrowEl = document.getElementById("nifty-arrow");
    const sensexPriceEl = document.getElementById("sensex-price");
    const sensexChangeEl = document.getElementById("sensex-change");
    const sensexArrowEl = document.getElementById("sensex-arrow");

    function flashElement(el, isUp) {
      if (!el) return;
      el.classList.remove("flash-green", "flash-red");
      void el.offsetWidth;
      el.classList.add(isUp ? "flash-green" : "flash-red");
      setTimeout(() => el.classList.remove("flash-green", "flash-red"), 700);
    }

    function updateIndexDisplay(priceEl, changeEl, arrowEl, price, close) {
      if (!priceEl || !price || !Number.isFinite(price)) return;

      const oldVal = parseFloat(priceEl.innerText.replace(/,/g, ""));
      const isUp = isNaN(oldVal) ? true : price >= oldVal;

      const formattedPrice = price.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      priceEl.innerText = formattedPrice;
      flashElement(priceEl, isUp);

      if (close && Number.isFinite(close) && close > 0) {
        const diff = price - close;
        const pct = (diff / close) * 100;
        const sign = diff >= 0 ? "+" : "";
        const isPos = diff >= 0;

        if (changeEl) {
          changeEl.innerText = `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
          changeEl.className = `ticker-change ${isPos ? "val-up" : "val-down"}`;
        }
        priceEl.className = `ticker-val ${isPos ? "val-up" : "val-down"}`;

        const targetArrow = arrowEl || (priceEl.id === "nifty-price" ? niftyArrowEl : sensexArrowEl);
        if (targetArrow) {
          targetArrow.innerText = isPos ? "▲" : "▼";
          targetArrow.className = `ticker-arrow arrow ${isPos ? "val-up" : "val-down"}`;
        }
      }
    }

    function handleMarketData(event) {
      const data = event.detail;
      const ticks = Array.isArray(data) ? data : [data];

      ticks.forEach((tick) => {
        if (!tick) return;
        const rawTok = tick.token ?? tick.subscriptionToken ?? tick.instrumentToken ?? "";
        const token = String(rawTok).replace(/^["'\\]+|["'\\]+$/g, "").trim();
        const sym = String(tick.symbol || "").toUpperCase();

        const price = typeof window.parseTickPrice === "function"
          ? window.parseTickPrice(tick)
          : Number(tick.ltp || tick.price || (tick.last_traded_price ? tick.last_traded_price / 100 : undefined));

        const close = typeof window.parseTickClose === "function"
          ? window.parseTickClose(tick)
          : Number(tick.closePrice || (tick.close_price ? tick.close_price / 100 : undefined));

        if (token === "99926000" || sym === "NIFTY") {
          updateIndexDisplay(niftyPriceEl, niftyChangeEl, niftyArrowEl, price, close || 24435.95);
        } else if (token === "99919000" || sym === "SENSEX") {
          updateIndexDisplay(sensexPriceEl, sensexChangeEl, sensexArrowEl, price, close || 77966.35);
        }
      });
    }

    document.addEventListener("backend-market-data", handleMarketData);
    document.addEventListener("backend-nifty-data", (e) => handleMarketData({ detail: [e.detail] }));
    document.addEventListener("backend-sensex-data", (e) => handleMarketData({ detail: [e.detail] }));

    // Apply immediate ticks if already available in window
    if (window.marketTicks) {
      handleMarketData({ detail: Object.values(window.marketTicks) });
    }
  }

  // Ask Angel Assistant Modal Logic
  function initAskAngel() {
    const askBtn = document.getElementById("ask-angel-btn");
    let chatModal = document.getElementById("ask-angel-modal");

    if (!askBtn) return;

    if (!chatModal) {
      chatModal = document.createElement("div");
      chatModal.id = "ask-angel-modal";
      chatModal.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 24px;
        width: 340px;
        height: 440px;
        background: #FFFFFF;
        border: 1px solid #E3E8F2;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(16, 35, 63, 0.15);
        display: none;
        flex-direction: column;
        z-index: 10000;
        overflow: hidden;
      `;
      chatModal.innerHTML = `
        <div style="background: #3F5FEA; color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>✦</span> Ask Angel Assistant
          </div>
          <button id="close-ask-angel" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div id="ask-angel-messages" style="flex: 1; padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; font-size: 12px; background: #F8FAFC;">
          <div style="background: #EFF6FF; color: #10233F; padding: 10px 12px; border-radius: 8px; max-width: 85%; align-self: flex-start; border: 1px solid #BFDBFE;">
            👋 Hi! I'm Angel, your smart trading assistant. Ask me about stock recommendations, market trends, or IPO details!
          </div>
        </div>
        <div style="padding: 10px 12px; border-top: 1px solid #E3E8F2; background: white; display: flex; gap: 8px;">
          <input id="ask-angel-input" type="text" placeholder="Type your query..." style="flex: 1; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; font-size: 12px; outline: none;" />
          <button id="send-ask-angel" style="background: #3F5FEA; color: white; border: none; border-radius: 6px; padding: 8px 14px; font-weight: 600; font-size: 12px; cursor: pointer;">Send</button>
        </div>
      `;
      document.body.appendChild(chatModal);
    }

    askBtn.addEventListener("click", () => {
      const isVisible = chatModal.style.display === "flex";
      chatModal.style.display = isVisible ? "none" : "flex";
    });

    const closeBtn = document.getElementById("close-ask-angel");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        chatModal.style.display = "none";
      });
    }

    const sendBtn = document.getElementById("send-ask-angel");
    const inputEl = document.getElementById("ask-angel-input");
    const msgContainer = document.getElementById("ask-angel-messages");

    function handleSend() {
      const text = inputEl.value.trim();
      if (!text) return;

      const userMsg = document.createElement("div");
      userMsg.style.cssText = "background: #3F5FEA; color: white; padding: 8px 12px; border-radius: 8px; max-width: 80%; align-self: flex-end;";
      userMsg.innerText = text;
      msgContainer.appendChild(userMsg);

      inputEl.value = "";
      msgContainer.scrollTop = msgContainer.scrollHeight;

      setTimeout(() => {
        const botMsg = document.createElement("div");
        botMsg.style.cssText = "background: #EFF6FF; color: #10233F; padding: 10px 12px; border-radius: 8px; max-width: 85%; align-self: flex-start; border: 1px solid #BFDBFE;";
        
        const q = text.toLowerCase();
        if (q.includes("nifty") || q.includes("market")) {
          botMsg.innerText = "📈 NIFTY is currently trading around 24,398.45 (-0.15%). Support is at 24,310 and resistance at 24,435.";
        } else if (q.includes("ipo")) {
          botMsg.innerText = "🚀 Latest Open IPO: Milky Mist Dairy Food Ltd (Closes 13 Aug, Min. ₹14,231, Subscribed 4.1x).";
        } else if (q.includes("buy") || q.includes("stock")) {
          botMsg.innerText = "💡 Top recommended stocks for long term growth: NTPC, ONGC, and TATASTEEL.";
        } else {
          botMsg.innerText = `🤖 Angel AI response: I can help you analyze "${text}". Market sentiment remains neutral for today's session.`;
        }

        msgContainer.appendChild(botMsg);
        msgContainer.scrollTop = msgContainer.scrollHeight;
      }, 600);
    }

    if (sendBtn && inputEl) {
      sendBtn.addEventListener("click", handleSend);
      inputEl.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSend();
      });
    }
  }

  // Stock Quick Trade Modal Logic
  function initTradeModal() {
    let modal = document.getElementById("quick-trade-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "quick-trade-modal";
      modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(16, 35, 63, 0.4);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      `;
      modal.innerHTML = `
        <div style="background: white; width: 380px; border-radius: 12px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E3E8F2; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="trade-modal-symbol" style="font-weight: 700; font-size: 16px; color: #10233F;">IDEA</span>
              <span id="trade-modal-exchange" style="font-size: 11px; color: #94A3B8;">NSE</span>
            </div>
            <button id="close-trade-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748B;">&times;</button>
          </div>
          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <button id="trade-buy-tab" style="flex: 1; padding: 10px; font-weight: 700; background: #00A88F; color: white; border: none; border-radius: 6px; cursor: pointer;">BUY</button>
            <button id="trade-sell-tab" style="flex: 1; padding: 10px; font-weight: 700; background: #F1F5F9; color: #EF5350; border: 1px solid #E3E8F2; border-radius: 6px; cursor: pointer;">SELL</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            <div>
              <label style="font-size: 11px; color: #64748B; font-weight: 600; display: block; margin-bottom: 4px;">QUANTITY</label>
              <input id="trade-qty" type="number" value="1" min="1" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 13px; font-weight: 600; outline: none;" />
            </div>
            <div>
              <label style="font-size: 11px; color: #64748B; font-weight: 600; display: block; margin-bottom: 4px;">PRICE (₹)</label>
              <input id="trade-price" type="number" step="0.05" value="13.63" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 13px; font-weight: 600; outline: none;" />
            </div>
          </div>
          <button id="place-order-btn" style="width: 100%; padding: 12px; background: #3F5FEA; color: white; font-weight: 700; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">PLACE BUY ORDER</button>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById("close-trade-modal").addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.onStockSelected = function (stock) {
      if (!stock) return;
      document.getElementById("trade-modal-symbol").innerText = stock.symbol;
      document.getElementById("trade-modal-exchange").innerText = stock.exchange;
      document.getElementById("trade-price").value = (typeof stock.price === "number" ? stock.price : parseFloat(stock.price)).toFixed(2);
      modal.style.display = "flex";
    };

    document.getElementById("place-order-btn").addEventListener("click", () => {
      const sym = document.getElementById("trade-modal-symbol").innerText;
      const qty = document.getElementById("trade-qty").value;
      modal.style.display = "none";
      showToast(`✓ Order Placed: Buy ${qty} shares of ${sym}`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeaderTicker();
    initAskAngel();
    initTradeModal();
  });
})();
