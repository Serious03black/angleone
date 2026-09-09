require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const { SmartAPI, WebSocketV2 } = require("smartapi-javascript");
const { syncGoogleSheet, getSheetData } = require("./sheetService");


// ======================================================
// CONFIG
// ======================================================

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.ANGEL_API_KEY;
const CLIENT_CODE = process.env.ANGEL_CLIENT_CODE;
const MPIN = process.env.ANGEL_MPIN;
const TOTP_SECRET = process.env.ANGEL_TOTP_SECRET;

const MARKET_STOCKS = [
    { symbol: "NIFTY", name: "NIFTY 50", exchange: "NSE", exchangeType: 1, token: "99926000", basePrice: 24398.45, closePrice: 24435.95 },
    { symbol: "SENSEX", name: "SENSEX", exchange: "BSE", exchangeType: 3, token: "99919000", basePrice: 77982.79, closePrice: 77966.35 },
    { symbol: "BANKNIFTY", name: "BANK NIFTY", exchange: "NSE", exchangeType: 1, token: "99926009", basePrice: 57663.35, closePrice: 57885.85 },
    { symbol: "FINNIFTY", name: "FIN NIFTY", exchange: "NSE", exchangeType: 1, token: "99926037", basePrice: 26358.85, closePrice: 26426.75 },
    { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", exchangeType: 1, token: "2885", basePrice: 2985.50, closePrice: 2980.00 },
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", exchangeType: 1, token: "11536", basePrice: 3920.00, closePrice: 3915.00 },
    { symbol: "INFY", name: "Infosys Limited", exchange: "NSE", exchangeType: 1, token: "1594", basePrice: 1625.40, closePrice: 1630.00 },
    { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", exchangeType: 1, token: "1333", basePrice: 1645.20, closePrice: 1640.00 },
    { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE", exchangeType: 1, token: "4963", basePrice: 1178.60, closePrice: 1175.00 },
    { symbol: "IDEA", name: "Vodafone Idea Limited", exchange: "NSE", exchangeType: 1, token: "14366", basePrice: 13.63, closePrice: 13.50 },
    { symbol: "JIOFIN", name: "Jio Financial Services", exchange: "NSE", exchangeType: 1, token: "18143", basePrice: 255.25, closePrice: 256.05 },
    { symbol: "SUZLON", name: "Suzlon Energy Limited", exchange: "NSE", exchangeType: 1, token: "12018", basePrice: 47.38, closePrice: 47.35 },
    { symbol: "TATASTEEL", name: "Tata Steel Limited", exchange: "NSE", exchangeType: 1, token: "3499", basePrice: 184.39, closePrice: 186.20 },
    { symbol: "NTPC", name: "NTPC Limited", exchange: "NSE", exchangeType: 1, token: "11630", basePrice: 341.55, closePrice: 339.45 },
    { symbol: "IRFC", name: "Indian Railway Finance Corp", exchange: "NSE", exchangeType: 1, token: "2029", basePrice: 88.25, closePrice: 88.26 },
    { symbol: "YESBANK", name: "Yes Bank Limited", exchange: "NSE", exchangeType: 1, token: "11915", basePrice: 22.96, closePrice: 22.98 },
    { symbol: "TMPV", name: "Tata Motors PV Limited", exchange: "NSE", exchangeType: 1, token: "3456", basePrice: 349.00, closePrice: 343.00 },
    { symbol: "NHPC", name: "NHPC Limited", exchange: "NSE", exchangeType: 1, token: "17400", basePrice: 77.72, closePrice: 76.85 },
    { symbol: "ONGC", name: "Oil & Natural Gas Corp", exchange: "NSE", exchangeType: 1, token: "2475", basePrice: 240.08, closePrice: 239.05 },
    { symbol: "TATAPOWER", name: "Tata Power Company Ltd", exchange: "NSE", exchangeType: 1, token: "3426", basePrice: 380.95, closePrice: 379.45 },
    { symbol: "IREDA", name: "Indian Renewable Energy", exchange: "NSE", exchangeType: 1, token: "20203", basePrice: 117.29, closePrice: 117.80 }
];

const liveState = {};
// Outside market hours seed with closePrice so users see the final closing value
const _seedMarketOpen = isMarketOpen();
MARKET_STOCKS.forEach(stock => {
    const seedPrice = _seedMarketOpen ? stock.basePrice : stock.closePrice;
    liveState[stock.token] = {
        token: stock.token,
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchange,
        last_traded_price: Math.round(seedPrice * 100),
        ltp: seedPrice,
        price: seedPrice,
        close_price: Math.round(stock.closePrice * 100),
        closePrice: stock.closePrice,
        open_price: Math.round(stock.closePrice * 100),
        high_price: Math.round(stock.basePrice * 1.01 * 100),
        low_price: Math.round(stock.basePrice * 0.99 * 100),
        volume: Math.floor(Math.random() * 500000 + 100000),
        // Stamp so fluctuation engine doesn't immediately overwrite seed prices
        _lastRealTick: Date.now()
    };
});

async function refreshSheetData() {
    try {
        const sheetData = await syncGoogleSheet();
        const allSheetStocks = [
            ...(sheetData.navbar || []),
            ...(sheetData.watchlist || []),
            ...(sheetData.portfolio || []),
            ...(sheetData.portfolioPositions || [])
        ];
        
        allSheetStocks.forEach(stock => {
            if (!stock.token) return;
            const tok = String(stock.token).trim();
            if (!liveState[tok]) {
                const estPrice = stock.avgPrice && stock.avgPrice > 0
                    ? stock.avgPrice
                    : (tok === "99926000" ? 24398.45 : tok === "99919000" ? 77982.79 : 150.00);
                liveState[tok] = {
                    token: tok,
                    symbol: stock.symbol,
                    rawSymbol: stock.rawSymbol,
                    name: stock.name,
                    exchange: stock.exchange || "NSE",
                    last_traded_price: Math.round(estPrice * 100),
                    ltp: estPrice,
                    price: estPrice,
                    close_price: Math.round(estPrice * 100),
                    closePrice: estPrice,
                    open_price: Math.round(estPrice * 100),
                    high_price: Math.round(estPrice * 1.01 * 100),
                    low_price: Math.round(estPrice * 0.99 * 100),
                    volume: Math.floor(Math.random() * 500000 + 100000),
                    // Stamp so fluctuation engine doesn't immediately overwrite sheet-sourced prices
                    _lastRealTick: Date.now()
                };
            } else {
                if (stock.name) liveState[tok].name = stock.name;
                if (stock.symbol) liveState[tok].symbol = stock.symbol;
                if (stock.rawSymbol) liveState[tok].rawSymbol = stock.rawSymbol;
                if (stock.exchange) liveState[tok].exchange = stock.exchange;
            }
        });

        io.emit("sheetStocks", sheetData);
        if (connected) {
            subscribeMarket();
        }
    } catch (e) {
        console.error("Sheet sync error:", e);
    }
}


// ======================================================
// EXPRESS
// ======================================================

const app = express();

app.use(cors());

app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));
app.use(express.static(path.join(__dirname, '../frontend')));

// ======================================================
// HTTP SERVER
// ======================================================

const server = http.createServer(app);


// ======================================================
// SOCKET.IO
// ======================================================

const io = new Server(server, {

    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }

});


// ======================================================
// ANGEL ONE
// ======================================================

let smartApi = null;

let angelSocket = null;

let jwtToken = null;

let feedToken = null;

let connected = false;


// ======================================================
// TOTP
// ======================================================

const crypto = require("crypto");


function base32ToBuffer(base32) {

    const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";


    base32 =
        base32
            .toUpperCase()
            .replace(/[\s=]/g, "");


    let bits = "";


    for (const char of base32) {

        const value =
            alphabet.indexOf(char);


        if (value === -1) {

            throw new Error(
                "Invalid TOTP secret"
            );

        }


        bits +=
            value
                .toString(2)
                .padStart(5, "0");

    }


    const bytes = [];


    for (
        let i = 0;
        i + 8 <= bits.length;
        i += 8
    ) {

        bytes.push(
            parseInt(
                bits.substring(i, i + 8),
                2
            )
        );

    }


    return Buffer.from(bytes);

}


function generateTOTP(secret) {

    const key =
        base32ToBuffer(secret);


    const counter =
        Math.floor(
            Date.now() / 30000
        );


    const buffer =
        Buffer.alloc(8);


    buffer.writeUInt32BE(
        Math.floor(
            counter / 0x100000000
        ),
        0
    );


    buffer.writeUInt32BE(
        counter >>> 0,
        4
    );


    const hmac =
        crypto
            .createHmac(
                "sha1",
                key
            )
            .update(buffer)
            .digest();


    const offset =
        hmac[hmac.length - 1] & 0xf;


    const binary =
        (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        ) >>> 0;


    return (
        binary % 1000000
    )
        .toString()
        .padStart(6, "0");

}


// ======================================================
// ANGEL LOGIN
// ======================================================

async function loginAngelOne() {

    console.log(
        "Logging into Angel One..."
    );


    smartApi =
        new SmartAPI({

            api_key:
                API_KEY

        });


    const totp =
        generateTOTP(
            TOTP_SECRET
        );


    const loginResponse =
        await smartApi.generateSession(
            CLIENT_CODE,
            MPIN,
            totp
        );


    console.log(
        "Login response received"
    );


    if (
        !loginResponse ||
        !loginResponse.status
    ) {

        throw new Error(
            loginResponse?.message ||
            "Angel One login failed"
        );

    }


    jwtToken =
        loginResponse
            .data
            .jwtToken;


    feedToken =
        loginResponse
            .data
            .feedToken;


    console.log(
        "Angel One Login Successful"
    );


    return true;

}


// ======================================================
// MARKET SUBSCRIPTION
// ======================================================

function cleanTokenString(raw) {
    if (!raw) return "";
    return String(raw).replace(/^["'\\]+|["'\\]+$/g, '').trim();
}

function subscribeMarket() {
    if (!angelSocket) {
        return;
    }

    const nseTokens = [];
    const bseTokens = [];

    Object.values(liveState).forEach(stock => {
        const token = cleanTokenString(stock.token);
        if (!token || !/^\d+$/.test(token)) return;

        if (stock.exchange === "BSE" || token === "99919000") {
            bseTokens.push(token);
        } else {
            nseTokens.push(token);
        }
    });

    // Subscribe NSE in batches of 45
    for (let i = 0; i < nseTokens.length; i += 45) {
        const chunk = nseTokens.slice(i, i + 45);
        try {
            angelSocket.fetchData({
                correlationID: `NSE_BATCH_${i}`,
                action: 1,
                mode: 1, // LTP Mode for fast real-time feed
                exchangeType: 1,
                tokens: chunk
            });
        } catch (err) {
            console.warn("SmartAPI NSE subscription error:", err.message);
        }
    }

    // Subscribe BSE in batches of 45
    for (let i = 0; i < bseTokens.length; i += 45) {
        const chunk = bseTokens.slice(i, i + 45);
        try {
            angelSocket.fetchData({
                correlationID: `BSE_BATCH_${i}`,
                action: 1,
                mode: 1, // LTP Mode for fast real-time feed
                exchangeType: 3, // BSE CM
                tokens: chunk
            });
        } catch (err) {
            console.warn("SmartAPI BSE subscription error:", err.message);
        }
    }

    console.log(
        `Subscribed ${nseTokens.length} NSE & ${bseTokens.length} BSE stocks to SmartAPI WebSocket.`
    );
}


function subscribeToken(token) {
    const clean = cleanTokenString(token);
    if (!angelSocket || !/^\d+$/.test(clean)) {
        return false;
    }

    const exType = clean === "99919000" || liveState[clean]?.exchange === "BSE" ? 3 : 1;

    angelSocket.fetchData({
        correlationID: `TOKEN_${clean}`,
        action: 1,
        mode: 1,
        exchangeType: exType,
        tokens: [clean]
    });

    return true;
}


// ======================================================
// START ANGEL WEBSOCKET
// ======================================================

let lastRealTickTime = 0;

async function startAngelWebSocket() {
    if (!jwtToken || !feedToken) {
        throw new Error(
            "Angel One session not available"
        );
    }

    angelSocket =
        new WebSocketV2({
            jwttoken:
                jwtToken,
            apikey:
                API_KEY,
            clientcode:
                CLIENT_CODE,
            feedtype:
                feedToken
        });

    angelSocket.on(
        "tick",
        (data) => {
            lastRealTickTime = Date.now();
            const rawTicks = Array.isArray(data) ? data : [data];
            const processedTicks = [];

            rawTicks.forEach(rawTick => {
                if (!rawTick || typeof rawTick !== "object") return;
                const token = cleanTokenString(rawTick.token ?? rawTick.subscriptionToken ?? rawTick.instrumentToken ?? "");
                if (!token) return;

                let ltp = undefined;
                if (rawTick.last_traded_price !== undefined) {
                    // SmartAPI WebSocket always sends last_traded_price in paise — always divide by 100
                    ltp = Number(rawTick.last_traded_price) / 100;
                } else if (rawTick.ltp !== undefined) {
                    ltp = Number(rawTick.ltp);
                } else if (rawTick.price !== undefined) {
                    ltp = Number(rawTick.price);
                }

                let closePrice = undefined;
                if (rawTick.close_price !== undefined) {
                    // SmartAPI WebSocket always sends close_price in paise — always divide by 100
                    closePrice = Number(rawTick.close_price) / 100;
                } else if (rawTick.closePrice !== undefined) {
                    closePrice = Number(rawTick.closePrice);
                }

                const normalized = {
                    ...rawTick,
                    token: token,
                    ltp: ltp,
                    price: ltp,
                    last_traded_price: ltp !== undefined ? Math.round(ltp * 100) : rawTick.last_traded_price,
                    closePrice: closePrice,
                    close_price: closePrice !== undefined ? Math.round(closePrice * 100) : rawTick.close_price
                };

                if (liveState[token]) {
                    liveState[token]._lastRealTick = Date.now();
                    if (ltp !== undefined && ltp > 0) {
                        liveState[token].price = ltp;
                        liveState[token].ltp = ltp;
                        liveState[token].last_traded_price = Math.round(ltp * 100);
                    }
                    if (closePrice !== undefined && closePrice > 0) {
                        liveState[token].closePrice = closePrice;
                        liveState[token].close_price = Math.round(closePrice * 100);
                    }
                    normalized.symbol = liveState[token].symbol;
                    normalized.name = liveState[token].name;
                    normalized.exchange = liveState[token].exchange;
                }

                processedTicks.push(normalized);
            });

            if (processedTicks.length > 0) {
                io.emit("marketData", processedTicks);

                processedTicks
                    .filter(t => t.token === "99926000" || t.symbol === "NIFTY")
                    .forEach(tick => io.emit("niftyData", tick));

                processedTicks
                    .filter(t => t.token === "99919000" || t.symbol === "SENSEX")
                    .forEach(tick => io.emit("sensexData", tick));
            }
        }
    );

    angelSocket.on(
        "error",
        (error) => {
            console.error(
                "Angel WebSocket Error:",
                error
            );
            io.emit(
                "status",
                {
                    connected: false,
                    message: "Angel WebSocket Error"
                }
            );
        }
    );

    await angelSocket.connect();
    connected = true;

    io.emit(
        "status",
        {
            connected: true,
            message: "Live Market Connected"
        }
    );

    subscribeMarket();
}

// ======================================================
// REALISTIC CONTINUOUS LIVE MARKET FLUCTUATION ENGINE
// ======================================================

// ======================================================
// MARKET TRADING HOURS HELPER (NSE / BSE: 9:15 AM - 3:30 PM IST)
// ======================================================

function isMarketOpen() {
    // Override flags for manual testing / simulation
    if (process.env.FORCE_MARKET_OPEN === "true") return true;
    if (process.env.FORCE_MARKET_CLOSED === "true") return false;

    // Convert current time to Indian Standard Time (IST, UTC+5:30)
    const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istTime = new Date(istString);

    const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    // Market is strictly closed on Saturday and Sunday
    if (day === 0 || day === 6) {
        return false;
    }

    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Normal Trading Hours: 9:15 AM (555 mins) to 3:30 PM (930 mins)
    const marketOpenMinutes = 9 * 60 + 15; // 9:15 AM
    const marketCloseMinutes = 15 * 60 + 30; // 3:30 PM (15:30)

    return currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes;
}

let fluctuationTimer = null;
let lastMarketStatusLogged = null;

function startLiveFluctuationEngine() {
    if (fluctuationTimer) return;

    fluctuationTimer = setInterval(() => {
        const marketOpen = isMarketOpen();

        // If market is closed (after 3:30 PM, before 9:15 AM, or weekend), FREEZE ALL PRICES at closePrice
        if (!marketOpen) {
            if (lastMarketStatusLogged !== false) {
                lastMarketStatusLogged = false;
                console.log("[MarketEngine] Market is CLOSED. Resetting all prices to closing values.");

                // Reset every stock price to its closePrice and push one final snapshot to all clients
                const closingSnapshot = [];
                Object.values(liveState).forEach(stock => {
                    const cp = stock.closePrice || stock.price || stock.ltp;
                    if (cp > 0) {
                        stock.price = cp;
                        stock.ltp = cp;
                        stock.last_traded_price = Math.round(cp * 100);
                    }
                    closingSnapshot.push({
                        token: stock.token,
                        symbol: stock.symbol,
                        name: stock.name,
                        exchange: stock.exchange,
                        last_traded_price: stock.last_traded_price,
                        ltp: stock.ltp,
                        price: stock.price,
                        close_price: stock.close_price,
                        closePrice: stock.closePrice,
                        volume: stock.volume
                    });
                });

                io.emit("marketData", closingSnapshot);
                io.emit("status", {
                    connected,
                    marketOpen: false,
                    message: "Market Closed (Trading Hours: 9:15 AM - 3:30 PM IST)"
                });
            }
            return;
        }

        if (lastMarketStatusLogged !== true) {
            lastMarketStatusLogged = true;
            console.log("[MarketEngine] Market is OPEN (9:15 AM - 3:30 PM IST). Live price fluctuation active.");
            io.emit("status", {
                connected,
                marketOpen: true,
                message: "Live Market Open (9:15 AM - 3:30 PM IST)"
            });
        }

        const now = Date.now();
        const allTokens = Object.keys(liveState);
        if (allTokens.length === 0) return;

        const updatedTicks = [];

        // Always tick NIFTY & SENSEX if real ticks have been quiet for > 2 seconds
        const indexTokens = ["99926000", "99919000", "99926009", "99926037"];
        // Also pick 8-15 random stocks each second for continuous dynamic market feeling
        const otherTokens = allTokens.filter(t => !indexTokens.includes(t));
        const pickedOthers = otherTokens.sort(() => 0.5 - Math.random()).slice(0, 15);
        const tokensToProcess = [...indexTokens, ...pickedOthers];

        tokensToProcess.forEach(token => {
            const stock = liveState[token];
            if (!stock) return;

            // If real tick arrived within last 2 seconds, do not synthesize
            if (stock._lastRealTick && (now - stock._lastRealTick < 2000)) {
                return;
            }

            const curPrice = stock.price || stock.ltp || (stock.last_traded_price ? stock.last_traded_price / 100 : 100);
            const closePrice = stock.closePrice || curPrice;

            // Micro fluctuation between -0.09% and +0.09%
            const pct = (Math.random() - 0.495) * 0.0018;
            let nextPrice = +(curPrice * (1 + pct)).toFixed(2);

            // Keep within realistic daily bounds of +/- 5% of closePrice
            if (closePrice > 0) {
                if (nextPrice > closePrice * 1.05) nextPrice = +(closePrice * 1.05).toFixed(2);
                if (nextPrice < closePrice * 0.95) nextPrice = +(closePrice * 0.95).toFixed(2);
            }

            stock.price = nextPrice;
            stock.ltp = nextPrice;
            stock.last_traded_price = Math.round(nextPrice * 100);
            stock.volume = (stock.volume || 100000) + Math.floor(Math.random() * 20 + 1);

            const tickPayload = {
                token: stock.token,
                symbol: stock.symbol,
                name: stock.name,
                exchange: stock.exchange,
                last_traded_price: stock.last_traded_price,
                ltp: stock.ltp,
                price: stock.price,
                close_price: stock.close_price,
                closePrice: stock.closePrice,
                volume: stock.volume
            };

            updatedTicks.push(tickPayload);

            if (token === "99926000") io.emit("niftyData", tickPayload);
            if (token === "99919000") io.emit("sensexData", tickPayload);
        });

        if (updatedTicks.length > 0) {
            io.emit("marketData", updatedTicks);
        }
    }, 1200);
}


// ======================================================
// FETCH REAL MARKET QUOTES FROM SMARTAPI
// ======================================================

async function fetchInitialQuotes() {
    if (!smartApi || !jwtToken) return;
    try {
        const tokensByExchange = { NSE: [], BSE: [] };
        Object.values(liveState).forEach(st => {
            const ex = st.exchange === "BSE" ? "BSE" : "NSE";
            if (st.token && /^\d+$/.test(st.token)) {
                tokensByExchange[ex].push(String(st.token));
            }
        });

        for (const [exchange, tokenList] of Object.entries(tokensByExchange)) {
            for (let i = 0; i < tokenList.length; i += 45) {
                const chunk = tokenList.slice(i, i + 45);
                if (chunk.length === 0) continue;
                try {
                    const res = await smartApi.marketData({
                        mode: "FULL",
                        exchangeTokens: { [exchange]: chunk }
                    });
                    if (res && res.status && res.data && res.data.fetched) {
                        res.data.fetched.forEach(quote => {
                            const tok = String(quote.symbolToken || quote.token || "");
                            if (tok && liveState[tok]) {
                                const ltp = Number(quote.ltp || (quote.lastPrice ? quote.lastPrice / 100 : 0));
                                const close = Number(quote.close || (quote.closePrice ? quote.closePrice / 100 : 0));
                                if (ltp > 0) {
                                    liveState[tok].price = ltp;
                                    liveState[tok].ltp = ltp;
                                    liveState[tok].last_traded_price = Math.round(ltp * 100);
                                    // Stamp real tick time so fluctuation engine won't overwrite fresh data
                                    liveState[tok]._lastRealTick = Date.now();
                                }
                                if (close > 0) {
                                    liveState[tok].closePrice = close;
                                    liveState[tok].close_price = Math.round(close * 100);
                                }
                            }
                        });
                    }
                } catch (chunkErr) {
                    // continue with next chunk
                }
            }
        }
        console.log("Real market quotes updated from Angel One SmartAPI.");
        io.emit("marketData", Object.values(liveState));
    } catch (err) {
        console.warn("SmartAPI market quote fetch notice:", err.message);
    }
}

// ======================================================
// START ANGEL
// ======================================================

async function startAngel() {

    try {

        await loginAngelOne();

        await fetchInitialQuotes();

        await startAngelWebSocket();

    }

    catch (error) {

        console.error(
            "Angel One startup failed:",
            error
        );


        io.emit(
            "status",
            {
                connected: false,
                message:
                    error.message
            }
        );

    }

}


// ======================================================
// FRONTEND SOCKET
// ======================================================

io.on(
    "connection",
    (socket) => {

        console.log(
            "Frontend connected:",
            socket.id
        );


        const marketOpen = isMarketOpen();
        socket.emit(
            "status",
            {
                connected,
                marketOpen,
                message: marketOpen
                    ? (connected ? "Live Market Connected" : "Angel One Connected")
                    : "Market Closed (Trading Hours: 9:15 AM - 3:30 PM IST)"
            }
        );

        // Send liveState-derived list so prices match marketData (closePrice outside hours, live price inside)
        const stocksSnapshot = Object.values(liveState).map(s => ({
            token: s.token,
            symbol: s.symbol,
            rawSymbol: s.rawSymbol,
            name: s.name,
            exchange: s.exchange,
            ltp: s.ltp,
            price: s.price,
            last_traded_price: s.last_traded_price,
            close_price: s.close_price,
            closePrice: s.closePrice
        }));
        socket.emit("stocks", stocksSnapshot);
        socket.emit("marketData", Object.values(liveState));

        socket.on("subscribeToken", (token) => {

            const normalizedToken = String(token || "").trim();
            const subscribed = subscribeToken(normalizedToken);

            socket.emit("tokenSubscription", {
                token: normalizedToken,
                subscribed,
                message: subscribed
                    ? `Subscribed to token ${normalizedToken}`
                    : "Subscribed to live feed for token " + normalizedToken
            });

        });


        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Frontend disconnected:",
                    socket.id
                );

            }
        );

    }
);


// ======================================================
// HEALTH
// ======================================================

app.get("/", (req, res) => res.render("index"));
app.get("/markets", (req, res) => res.render("markets"));
app.get("/portfolio", (req, res) => res.render("portfolio"));
app.get("/orders", (req, res) => res.render("orders"));
app.get("/positions", (req, res) => res.render("positions"));
// app.get("/tradeone", (req, res) => res.render("tradeone"));
app.get("/tools", (req, res) => res.render("tools"));
app.get("/sheet", (req, res) => res.render("sheet"));
app.get("/profile", (req, res) => {
    const sheet = getSheetData();
    res.render("profile", {
        profileData: (sheet && sheet.profileData) || { name: 'Budhbhushan Waghmare', balance: 370000000 }
    });
});
app.get("/account", (req, res) => {
    const sheet = getSheetData();
    res.render("profile", {
        profileData: (sheet && sheet.profileData) || { name: 'Budhbhushan Waghmare', balance: 370000000 }
    });
});
app.get("/api/profile-data", (req, res) => {
    const sheet = getSheetData();
    res.json((sheet && sheet.profileData) || { name: 'Budhbhushan Waghmare', balance: 370000000 });
});
app.get("/dem", (req, res) => res.render("dem"));
app.get("/demo", (req, res) => res.render("dem"));

app.get("/api/health", (req, res) => {
    res.json({
        status: "running",
        angelOne: connected,
        message: "Angel One Live Market Backend"
    });
});

app.get("/api/market-status", (req, res) => {
    const open = isMarketOpen();
    const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    res.json({
        isOpen: open,
        tradingHours: "9:15 AM - 3:30 PM IST (Monday - Friday)",
        currentTimeIST: istString
    });
});


// ======================================================
// START SERVER
// ======================================================

// Initialize data services at module load time (runs on both local & Vercel serverless)
(async () => {
    await refreshSheetData();
    setInterval(refreshSheetData, 20 * 1000); // Check Google Sheet every 20 seconds
    startLiveFluctuationEngine();
    startAngel();
})();

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

app.get(
    "/api/stocks",
    (req, res) => {
        res.json(Object.values(liveState));
    }
);

app.get(
    "/api/sheet-stocks",
    async (req, res) => {
        const sheet = getSheetData();
        const now = Date.now();
        if (req.query.refresh === "true" || (now - (sheet.lastUpdated || 0) > 5000)) {
            await refreshSheetData();
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(getSheetData());
    }
);

app.get(
    "/api/sheet/refresh",
    async (req, res) => {
        await refreshSheetData();
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json({ success: true, message: "Google Sheet synced successfully", lastUpdated: getSheetData().lastUpdated });
    }
);

module.exports = app;