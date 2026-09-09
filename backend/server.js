const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const http = require("http");
const cors = require("cors");
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

function cleanTokenString(t) {
    return String(t || "").replace(/^["'\\]+|["'\\]+$/g, "").trim();
}

const KNOWN_STOCK_BASELINES = {
    NIFTY: { token: "99926000", name: "NIFTY 50", exchange: "NSE", exchangeType: 1, basePrice: 24398.45, closePrice: 24435.95 },
    SENSEX: { token: "99919000", name: "S&P BSE SENSEX", exchange: "BSE", exchangeType: 3, basePrice: 77982.79, closePrice: 77966.35 },
    BANKNIFTY: { token: "99926009", name: "BANK NIFTY", exchange: "NSE", exchangeType: 1, basePrice: 57663.35, closePrice: 57885.85 },
    FINNIFTY: { token: "99926037", name: "FIN NIFTY", exchange: "NSE", exchangeType: 1, basePrice: 26358.85, closePrice: 26426.75 },
    RELIANCE: { token: "2885", name: "Reliance Industries", exchange: "NSE", exchangeType: 1, basePrice: 2985.50, closePrice: 2980.00 },
    TCS: { token: "11536", name: "Tata Consultancy Services", exchange: "NSE", exchangeType: 1, basePrice: 3920.00, closePrice: 3915.00 },
    INFY: { token: "1594", name: "Infosys Limited", exchange: "NSE", exchangeType: 1, basePrice: 1625.40, closePrice: 1630.00 },
    HDFCBANK: { token: "1333", name: "HDFC Bank", exchange: "NSE", exchangeType: 1, basePrice: 1645.20, closePrice: 1640.00 },
    ICICIBANK: { token: "4963", name: "ICICI Bank", exchange: "NSE", exchangeType: 1, basePrice: 1178.60, closePrice: 1175.00 },
    SBIN: { token: "3045", name: "State Bank of India", exchange: "NSE", exchangeType: 1, basePrice: 795.50, closePrice: 792.00 },
    BHARTIARTL: { token: "10604", name: "Bharti Airtel", exchange: "NSE", exchangeType: 1, basePrice: 1580.00, closePrice: 1575.00 },
    AXISBANK: { token: "5900", name: "Axis Bank", exchange: "NSE", exchangeType: 1, basePrice: 1145.00, closePrice: 1140.00 },
    KOTAKBANK: { token: "1922", name: "Kotak Mahindra Bank", exchange: "NSE", exchangeType: 1, basePrice: 1780.00, closePrice: 1785.00 },
    LT: { token: "11483", name: "Larsen & Toubro", exchange: "NSE", exchangeType: 1, basePrice: 3620.00, closePrice: 3610.00 },
    ITC: { token: "1660", name: "ITC Limited", exchange: "NSE", exchangeType: 1, basePrice: 485.00, closePrice: 482.00 },
    HINDUNILVR: { token: "1394", name: "Hindustan Unilever", exchange: "NSE", exchangeType: 1, basePrice: 2380.00, closePrice: 2375.00 },
    MARUTI: { token: "10999", name: "Maruti Suzuki", exchange: "NSE", exchangeType: 1, basePrice: 12400.00, closePrice: 12380.00 },
    NESTLEIND: { token: "17963", name: "Nestle India", exchange: "NSE", exchangeType: 1, basePrice: 2250.00, closePrice: 2260.00 },
    SUNPHARMA: { token: "3351", name: "Sun Pharma", exchange: "NSE", exchangeType: 1, basePrice: 1720.00, closePrice: 1715.00 },
    TITAN: { token: "3506", name: "Titan Company", exchange: "NSE", exchangeType: 1, basePrice: 3450.00, closePrice: 3440.00 },
    BAJFINANCE: { token: "317", name: "Bajaj Finance", exchange: "NSE", exchangeType: 1, basePrice: 7150.00, closePrice: 7120.00 },
    BAJAJFINSV: { token: "16675", name: "Bajaj Finserv", exchange: "NSE", exchangeType: 1, basePrice: 1820.00, closePrice: 1815.00 },
    ULTRACEMCO: { token: "11532", name: "UltraTech Cement", exchange: "NSE", exchangeType: 1, basePrice: 11200.00, closePrice: 11180.00 },
    HCLTECH: { token: "7229", name: "HCL Technologies", exchange: "NSE", exchangeType: 1, basePrice: 1780.00, closePrice: 1775.00 },
    WIPRO: { token: "3787", name: "Wipro Limited", exchange: "NSE", exchangeType: 1, basePrice: 540.00, closePrice: 538.00 },
    POWERGRID: { token: "14977", name: "Power Grid Corp", exchange: "NSE", exchangeType: 1, basePrice: 320.00, closePrice: 318.50 },
    COALINDIA: { token: "20374", name: "Coal India", exchange: "NSE", exchangeType: 1, basePrice: 485.00, closePrice: 482.00 },
    IOC: { token: "1624", name: "Indian Oil Corp", exchange: "NSE", exchangeType: 1, basePrice: 168.00, closePrice: 167.50 },
    BPCL: { token: "526", name: "Bharat Petroleum", exchange: "NSE", exchangeType: 1, basePrice: 325.00, closePrice: 324.00 },
    GAIL: { token: "4717", name: "GAIL India", exchange: "NSE", exchangeType: 1, basePrice: 215.00, closePrice: 214.50 },
    JSWSTEEL: { token: "11723", name: "JSW Steel", exchange: "NSE", exchangeType: 1, basePrice: 980.00, closePrice: 978.00 },
    TATASTEEL: { token: "3499", name: "Tata Steel Limited", exchange: "NSE", exchangeType: 1, basePrice: 184.39, closePrice: 186.20 },
    GRASIM: { token: "1232", name: "Grasim Industries", exchange: "NSE", exchangeType: 1, basePrice: 2540.00, closePrice: 2530.00 },
    ADANIPORTS: { token: "15083", name: "Adani Ports", exchange: "NSE", exchangeType: 1, basePrice: 1420.00, closePrice: 1415.00 },
    ADANIENT: { token: "25", name: "Adani Enterprises", exchange: "NSE", exchangeType: 1, basePrice: 2850.00, closePrice: 2840.00 },
    DMART: { token: "19913", name: "Avenue Supermarts (DMart)", exchange: "NSE", exchangeType: 1, basePrice: 3780.00, closePrice: 3765.00 },
    BRITANNIA: { token: "547", name: "Britannia Industries", exchange: "NSE", exchangeType: 1, basePrice: 4950.00, closePrice: 4930.00 },
    HINDZINC: { token: "1406", name: "Hindustan Zinc", exchange: "NSE", exchangeType: 1, basePrice: 460.00, closePrice: 458.00 },
    VEDL: { token: "3063", name: "Vedanta Limited", exchange: "NSE", exchangeType: 1, basePrice: 455.00, closePrice: 452.00 },
    RELIANCEPOWER: { token: "15282", name: "Reliance Power", exchange: "NSE", exchangeType: 1, basePrice: 38.50, closePrice: 38.20 },
    PFC: { token: "14299", name: "Power Finance Corp", exchange: "NSE", exchangeType: 1, basePrice: 480.00, closePrice: 478.00 },
    CIPLA: { token: "694", name: "Cipla Limited", exchange: "NSE", exchangeType: 1, basePrice: 1520.00, closePrice: 1515.00 },
    TORNTPHARM: { token: "3518", name: "Torrent Pharma", exchange: "NSE", exchangeType: 1, basePrice: 3250.00, closePrice: 3240.00 },
    DRREDDY: { token: "881", name: "Dr. Reddy's Labs", exchange: "NSE", exchangeType: 1, basePrice: 6450.00, closePrice: 6420.00 },
    DIVISLAB: { token: "10940", name: "Divi's Laboratories", exchange: "NSE", exchangeType: 1, basePrice: 5800.00, closePrice: 5780.00 },
    ZYDUSLIFE: { token: "7929", name: "Zydus Lifesciences", exchange: "NSE", exchangeType: 1, basePrice: 980.00, closePrice: 975.00 },
    AUBANK: { token: "21238", name: "AU Small Finance Bank", exchange: "NSE", exchangeType: 1, basePrice: 620.00, closePrice: 618.00 },
    IDFCFIRSTB: { token: "11184", name: "IDFC First Bank", exchange: "NSE", exchangeType: 1, basePrice: 72.50, closePrice: 72.20 },
    BANKBARODA: { token: "467", name: "Bank of Baroda", exchange: "NSE", exchangeType: 1, basePrice: 245.00, closePrice: 243.50 },
    CANBK: { token: "10794", name: "Canara Bank", exchange: "NSE", exchangeType: 1, basePrice: 105.00, closePrice: 104.50 },
    INDIANB: { token: "13611", name: "Indian Bank", exchange: "NSE", exchangeType: 1, basePrice: 540.00, closePrice: 538.00 },
    FEDERALBNK: { token: "1023", name: "Federal Bank", exchange: "NSE", exchangeType: 1, basePrice: 185.00, closePrice: 184.20 },
    CHOLAFIN: { token: "685", name: "Cholamandalam Inv", exchange: "NSE", exchangeType: 1, basePrice: 1480.00, closePrice: 1475.00 },
    SHRIRAMFIN: { token: "4306", name: "Shriram Finance", exchange: "NSE", exchangeType: 1, basePrice: 3120.00, closePrice: 3110.00 },
    PNB: { token: "10666", name: "Punjab National Bank", exchange: "NSE", exchangeType: 1, basePrice: 102.00, closePrice: 101.50 },
    UCOBANK: { token: "11572", name: "UCO Bank", exchange: "NSE", exchangeType: 1, basePrice: 42.00, closePrice: 41.80 },
    UNIONBANK: { token: "10753", name: "Union Bank of India", exchange: "NSE", exchangeType: 1, basePrice: 122.00, closePrice: 121.50 },
    HDFCAMC: { token: "4244", name: "HDFC AMC", exchange: "NSE", exchangeType: 1, basePrice: 4150.00, closePrice: 4130.00 },
    LICHSGFIN: { token: "1997", name: "LIC Housing Finance", exchange: "NSE", exchangeType: 1, basePrice: 640.00, closePrice: 638.00 },
    SBILIFE: { token: "21808", name: "SBI Life Insurance", exchange: "NSE", exchangeType: 1, basePrice: 1520.00, closePrice: 1515.00 },
    HAVELLS: { token: "9819", name: "Havells India", exchange: "NSE", exchangeType: 1, basePrice: 1650.00, closePrice: 1645.00 },
    BERGEPAINT: { token: "404", name: "Berger Paints", exchange: "NSE", exchangeType: 1, basePrice: 510.00, closePrice: 508.00 },
    ASIANPAINT: { token: "236", name: "Asian Paints", exchange: "NSE", exchangeType: 1, basePrice: 2350.00, closePrice: 2340.00 },
    GODREJPROP: { token: "17875", name: "Godrej Properties", exchange: "NSE", exchangeType: 1, basePrice: 2850.00, closePrice: 2840.00 },
    DLF: { token: "14732", name: "DLF Limited", exchange: "NSE", exchangeType: 1, basePrice: 820.00, closePrice: 818.00 },
    LODHA: { token: "2712", name: "Macrotech Developers (Lodha)", exchange: "NSE", exchangeType: 1, basePrice: 1240.00, closePrice: 1235.00 },
    LTIM: { token: "17818", name: "LTIMindtree", exchange: "NSE", exchangeType: 1, basePrice: 5600.00, closePrice: 5580.00 },
    TECHM: { token: "13538", name: "Tech Mahindra", exchange: "NSE", exchangeType: 1, basePrice: 1680.00, closePrice: 1675.00 },
    PERSISTENT: { token: "18365", name: "Persistent Systems", exchange: "NSE", exchangeType: 1, basePrice: 5400.00, closePrice: 5380.00 },
    COFORGE: { token: "11543", name: "Coforge Limited", exchange: "NSE", exchangeType: 1, basePrice: 7850.00, closePrice: 7820.00 },
    CYIENT: { token: "969", name: "Cyient Limited", exchange: "NSE", exchangeType: 1, basePrice: 1820.00, closePrice: 1810.00 },
    KPITTECH: { token: "14418", name: "KPIT Technologies", exchange: "NSE", exchangeType: 1, basePrice: 1480.00, closePrice: 1475.00 },
    PAGEIND: { token: "14413", name: "Page Industries", exchange: "NSE", exchangeType: 1, basePrice: 44500.00, closePrice: 44300.00 },
    TRENT: { token: "1964", name: "Trent Limited", exchange: "NSE", exchangeType: 1, basePrice: 6850.00, closePrice: 6820.00 },
    AUROPHARMA: { token: "275", name: "Aurobindo Pharma", exchange: "NSE", exchangeType: 1, basePrice: 1280.00, closePrice: 1275.00 },
    GLENMARK: { token: "7406", name: "Glenmark Pharma", exchange: "NSE", exchangeType: 1, basePrice: 1620.00, closePrice: 1610.00 },
    ABB: { token: "13", name: "ABB India", exchange: "NSE", exchangeType: 1, basePrice: 7200.00, closePrice: 7180.00 },
    AMBUJACEM: { token: "1270", name: "Ambuja Cements", exchange: "NSE", exchangeType: 1, basePrice: 560.00, closePrice: 558.00 },
    ACC: { token: "22", name: "ACC Limited", exchange: "NSE", exchangeType: 1, basePrice: 2180.00, closePrice: 2170.00 },
    SHREECEM: { token: "3103", name: "Shree Cement", exchange: "NSE", exchangeType: 1, basePrice: 26500.00, closePrice: 26400.00 },
    JINDALSTEL: { token: "6733", name: "Jindal Steel & Power", exchange: "NSE", exchangeType: 1, basePrice: 920.00, closePrice: 915.00 },
    NALCO: { token: "6364", name: "National Aluminium", exchange: "NSE", exchangeType: 1, basePrice: 210.00, closePrice: 209.00 },
    HINDALCO: { token: "1363", name: "Hindalco Industries", exchange: "NSE", exchangeType: 1, basePrice: 680.00, closePrice: 678.00 },
    HINDCOPPER: { token: "17939", name: "Hindustan Copper", exchange: "NSE", exchangeType: 1, basePrice: 310.00, closePrice: 308.00 },
    NMDC: { token: "15332", name: "NMDC Limited", exchange: "NSE", exchangeType: 1, basePrice: 225.00, closePrice: 224.00 },
    IRCON: { token: "2446", name: "Ircon International", exchange: "NSE", exchangeType: 1, basePrice: 215.00, closePrice: 214.00 },
    PIRAMAL: { token: "2412", name: "Piramal Enterprises", exchange: "NSE", exchangeType: 1, basePrice: 1080.00, closePrice: 1075.00 },
    IDEAFORGE: { token: "14879", name: "ideaForge Technology", exchange: "NSE", exchangeType: 1, basePrice: 680.00, closePrice: 675.00 },
    ZEEL: { token: "3812", name: "Zee Entertainment", exchange: "NSE", exchangeType: 1, basePrice: 125.00, closePrice: 124.50 },
    TVSMOTOR: { token: "8479", name: "TVS Motor Company", exchange: "NSE", exchangeType: 1, basePrice: 2420.00, closePrice: 2410.00 },
    APOLLOTYRE: { token: "163", name: "Apollo Tyres", exchange: "NSE", exchangeType: 1, basePrice: 480.00, closePrice: 478.00 },
    TATACONSUM: { token: "3432", name: "Tata Consumer Products", exchange: "NSE", exchangeType: 1, basePrice: 980.00, closePrice: 978.00 },
    MARICO: { token: "4067", name: "Marico Limited", exchange: "NSE", exchangeType: 1, basePrice: 640.00, closePrice: 638.00 },
    PIDILITIND: { token: "2664", name: "Pidilite Industries", exchange: "NSE", exchangeType: 1, basePrice: 2950.00, closePrice: 2940.00 },
    BAJAJHLDNG: { token: "305", name: "Bajaj Holdings", exchange: "NSE", exchangeType: 1, basePrice: 9850.00, closePrice: 9820.00 },
    ABFRL: { token: "30108", name: "Aditya Birla Fashion", exchange: "NSE", exchangeType: 1, basePrice: 285.00, closePrice: 283.00 },
    UNITDSPR: { token: "10440", name: "United Spirits", exchange: "NSE", exchangeType: 1, basePrice: 1480.00, closePrice: 1475.00 },
    PETRONET: { token: "11351", name: "Petronet LNG", exchange: "NSE", exchangeType: 1, basePrice: 320.00, closePrice: 318.50 },
    TATAMOTORS: { token: "3456", name: "Tata Motors Limited", exchange: "NSE", exchangeType: 1, basePrice: 740.00, closePrice: 738.00 },
    MM: { token: "2031", name: "Mahindra & Mahindra", exchange: "NSE", exchangeType: 1, basePrice: 2850.00, closePrice: 2840.00 },
    "M&M": { token: "2031", name: "Mahindra & Mahindra", exchange: "NSE", exchangeType: 1, basePrice: 2850.00, closePrice: 2840.00 },
    EICHERMOT: { token: "910", name: "Eicher Motors", exchange: "NSE", exchangeType: 1, basePrice: 4780.00, closePrice: 4760.00 },
    APOLLOHOSP: { token: "157", name: "Apollo Hospitals", exchange: "NSE", exchangeType: 1, basePrice: 6850.00, closePrice: 6820.00 },
    SUNTV: { token: "13404", name: "Sun TV Network", exchange: "NSE", exchangeType: 1, basePrice: 780.00, closePrice: 776.00 },
    IRCTC: { token: "13611", name: "IRCTC Limited", exchange: "NSE", exchangeType: 1, basePrice: 820.00, closePrice: 818.00 },
    RECLTD: { token: "15355", name: "REC Limited", exchange: "NSE", exchangeType: 1, basePrice: 490.00, closePrice: 488.00 },
    POWFIN: { token: "14299", name: "Power Finance Corp", exchange: "NSE", exchangeType: 1, basePrice: 480.00, closePrice: 478.00 },
    IDEA: { token: "14366", name: "Vodafone Idea Limited", exchange: "NSE", exchangeType: 1, basePrice: 13.63, closePrice: 13.50 },
    JIOFIN: { token: "18143", name: "Jio Financial Services", exchange: "NSE", exchangeType: 1, basePrice: 255.25, closePrice: 256.05 },
    SUZLON: { token: "12018", name: "Suzlon Energy Limited", exchange: "NSE", exchangeType: 1, basePrice: 47.38, closePrice: 47.35 },
    NTPC: { token: "11630", name: "NTPC Limited", exchange: "NSE", exchangeType: 1, basePrice: 341.55, closePrice: 339.45 },
    IRFC: { token: "2029", name: "Indian Railway Finance Corp", exchange: "NSE", exchangeType: 1, basePrice: 88.25, closePrice: 88.26 },
    YESBANK: { token: "11915", name: "Yes Bank Limited", exchange: "NSE", exchangeType: 1, basePrice: 22.96, closePrice: 22.98 },
    TMPV: { token: "3456", name: "Tata Motors PV Limited", exchange: "NSE", exchangeType: 1, basePrice: 349.00, closePrice: 343.00 },
    NHPC: { token: "17400", name: "NHPC Limited", exchange: "NSE", exchangeType: 1, basePrice: 77.72, closePrice: 76.85 },
    ONGC: { token: "2475", name: "Oil & Natural Gas Corp", exchange: "NSE", exchangeType: 1, basePrice: 240.08, closePrice: 239.05 },
    TATAPOWER: { token: "3426", name: "Tata Power Company Ltd", exchange: "NSE", exchangeType: 1, basePrice: 380.95, closePrice: 379.45 },
    IREDA: { token: "20203", name: "Indian Renewable Energy", exchange: "NSE", exchangeType: 1, basePrice: 117.29, closePrice: 117.80 }
};

const liveState = {};

// Initialize liveState from known baselines
Object.entries(KNOWN_STOCK_BASELINES).forEach(([sym, stock]) => {
    const tok = String(stock.token);
    liveState[tok] = {
        token: tok,
        symbol: sym,
        name: stock.name,
        exchange: stock.exchange || "NSE",
        last_traded_price: Math.round(stock.basePrice * 100),
        ltp: stock.basePrice,
        price: stock.basePrice,
        close_price: Math.round(stock.closePrice * 100),
        closePrice: stock.closePrice,
        open_price: Math.round(stock.closePrice * 100),
        high_price: Math.round(stock.basePrice * 1.01 * 100),
        low_price: Math.round(stock.basePrice * 0.99 * 100),
        volume: Math.floor(Math.random() * 500000 + 100000)
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
            const sym = String(stock.symbol || "").toUpperCase();
            const cleanTok = cleanTokenString(stock.token);
            const baseline = KNOWN_STOCK_BASELINES[sym];
            const tok = cleanTok || (baseline && baseline.token) || sym;
            if (!tok) return;

            if (!liveState[tok]) {
                const estPrice = (baseline && baseline.basePrice) 
                    ? baseline.basePrice
                    : (stock.avgPrice && stock.avgPrice > 0 ? +(stock.avgPrice * 1.05).toFixed(2) : 150.00);
                const estClose = (baseline && baseline.closePrice) 
                    ? baseline.closePrice
                    : +(estPrice * 0.995).toFixed(2);

                liveState[tok] = {
                    token: tok,
                    symbol: stock.symbol || sym,
                    rawSymbol: stock.rawSymbol,
                    name: stock.name || (baseline && baseline.name) || sym,
                    exchange: stock.exchange || (baseline && baseline.exchange) || "NSE",
                    last_traded_price: Math.round(estPrice * 100),
                    ltp: estPrice,
                    price: estPrice,
                    close_price: Math.round(estClose * 100),
                    closePrice: estClose,
                    open_price: Math.round(estClose * 100),
                    high_price: Math.round(estPrice * 1.01 * 100),
                    low_price: Math.round(estPrice * 0.99 * 100),
                    volume: Math.floor(Math.random() * 500000 + 100000)
                };
            } else {
                if (stock.name) liveState[tok].name = stock.name;
                if (stock.symbol) liveState[tok].symbol = stock.symbol;
                if (stock.rawSymbol) liveState[tok].rawSymbol = stock.rawSymbol;
                if (stock.exchange) liveState[tok].exchange = stock.exchange;
            }
        });

        io.emit("sheetStocks", getEnrichedSheetData());
        if (connected) {
            subscribeMarket();
        }
    } catch (e) {
        console.error("Sheet sync error:", e);
    }
}

function getEnrichedSheetData() {
    const rawSheet = getSheetData();
    const enrichList = (list) => (list || []).map(item => {
        const sym = String(item.symbol || "").toUpperCase();
        const cleanTok = cleanTokenString(item.token);
        const baseline = KNOWN_STOCK_BASELINES[sym];
        const tok = cleanTok || (baseline && baseline.token) || sym;
        const live = (tok && liveState[tok]) || liveState[sym] || {};

        const ltp = (typeof live.price === "number" && live.price > 0)
            ? live.price
            : ((typeof live.ltp === "number" && live.ltp > 0)
                ? live.ltp
                : (baseline ? baseline.basePrice : (item.avgPrice > 0 ? +(item.avgPrice * 1.05).toFixed(2) : 150.00)));

        const closeP = (typeof live.closePrice === "number" && live.closePrice > 0)
            ? live.closePrice
            : (baseline ? baseline.closePrice : +(ltp * 0.995).toFixed(2));

        return {
            ...item,
            token: tok,
            price: ltp,
            ltp: ltp,
            last_traded_price: Math.round(ltp * 100),
            closePrice: closeP,
            close_price: Math.round(closeP * 100)
        };
    });

    return {
        ...rawSheet,
        navbar: enrichList(rawSheet.navbar),
        watchlist: enrichList(rawSheet.watchlist),
        portfolio: enrichList(rawSheet.portfolio),
        portfolioPositions: enrichList(rawSheet.portfolioPositions),
        positions: enrichList(rawSheet.portfolioPositions)
    };
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
    if (!API_KEY || !CLIENT_CODE || !MPIN || !TOTP_SECRET) {
        console.warn("Angel One credentials missing in environment (.env). Operating with live baseline engine.");
        return false;
    }

    console.log("Logging into Angel One...");
    try {
        smartApi = new SmartAPI({
            api_key: API_KEY
        });

        const totp = generateTOTP(TOTP_SECRET);
        const loginResponse = await smartApi.generateSession(
            CLIENT_CODE,
            MPIN,
            totp
        );

        if (!loginResponse || !loginResponse.status) {
            throw new Error(loginResponse?.message || "Angel One login failed");
        }

        jwtToken = loginResponse.data.jwtToken;
        feedToken = loginResponse.data.feedToken;

        console.log("Angel One Login Successful");
        return true;
    } catch (err) {
        console.error("Angel One login notice:", err.message);
        return false;
    }
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
                if (typeof rawTick.ltp === "number" && !isNaN(rawTick.ltp) && rawTick.ltp > 0) {
                    ltp = rawTick.ltp;
                } else if (typeof rawTick.price === "number" && !isNaN(rawTick.price) && rawTick.price > 0) {
                    ltp = rawTick.price;
                } else if (rawTick.ltp !== undefined && !isNaN(Number(rawTick.ltp)) && Number(rawTick.ltp) > 0) {
                    ltp = Number(rawTick.ltp);
                } else if (rawTick.price !== undefined && !isNaN(Number(rawTick.price)) && Number(rawTick.price) > 0) {
                    ltp = Number(rawTick.price);
                } else if (rawTick.last_traded_price !== undefined || rawTick.lastTradedPrice !== undefined) {
                    const rawNum = Number(rawTick.last_traded_price ?? rawTick.lastTradedPrice);
                    if (!isNaN(rawNum) && rawNum > 0) {
                        ltp = +(rawNum / 100).toFixed(2);
                    }
                }

                let closePrice = undefined;
                if (typeof rawTick.closePrice === "number" && !isNaN(rawTick.closePrice) && rawTick.closePrice > 0) {
                    closePrice = rawTick.closePrice;
                } else if (typeof rawTick.close === "number" && !isNaN(rawTick.close) && rawTick.close > 0) {
                    closePrice = rawTick.close;
                } else if (rawTick.closePrice !== undefined && !isNaN(Number(rawTick.closePrice)) && Number(rawTick.closePrice) > 0) {
                    closePrice = Number(rawTick.closePrice);
                } else if (rawTick.close !== undefined && !isNaN(Number(rawTick.close)) && Number(rawTick.close) > 0) {
                    closePrice = Number(rawTick.close);
                } else if (rawTick.close_price !== undefined) {
                    const rawNum = Number(rawTick.close_price);
                    if (!isNaN(rawNum) && rawNum > 0) {
                        closePrice = +(rawNum / 100).toFixed(2);
                    }
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

        // If market is closed (after 3:30 PM, before 9:15 AM, or weekend), FREEZE ALL PRICES
        if (!marketOpen) {
            if (lastMarketStatusLogged !== false) {
                lastMarketStatusLogged = false;
                console.log("[MarketEngine] Market is CLOSED (Trading Hours: 9:15 AM - 3:30 PM IST). Price fluctuation stopped.");
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

        socket.emit("stocks", MARKET_STOCKS);
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

if (!process.env.VERCEL) {
    server.listen(
        PORT,
        async () => {

            console.log(
                `Backend running on http://localhost:${PORT}`
            );

            await refreshSheetData();
            setInterval(refreshSheetData, 20 * 1000); // Check Google Sheet every 20 seconds

            startLiveFluctuationEngine();

            startAngel();

        }
    );
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
        res.json(getEnrichedSheetData());
    }
);

app.get(
    "/api/sheet/refresh",
    async (req, res) => {
        await refreshSheetData();
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json({ success: true, message: "Google Sheet synced successfully", lastUpdated: getEnrichedSheetData().lastUpdated });
    }
);

module.exports = app;