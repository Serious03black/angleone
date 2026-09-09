/**
 * Central Data Repository for Angel One Clone - Integrated with Google Sheets
 */

const initialWatchlist = [
  { symbol: "IDEA", token: "14366", exchange: "NSE", name: "VODAFONE IDEA", price: 13.63, change: 0.13, percentage: 0.96, direction: "up", isFno: false },
  { symbol: "JIOFIN", token: "18143", exchange: "NSE", name: "JIO FINANCIAL SERVICES", price: 255.25, change: -0.80, percentage: -0.31, direction: "down", isFno: false },
  { symbol: "SUZLON", token: "12018", exchange: "NSE", name: "SUZLON ENERGY", price: 47.38, change: 0.03, percentage: 0.06, direction: "up", isFno: false },
  { symbol: "TATASTEEL", token: "3499", exchange: "NSE", name: "TATA STEEL", price: 184.39, change: -1.81, percentage: -0.97, direction: "down", isFno: false },
  { symbol: "NTPC", token: "11630", exchange: "NSE", name: "NTPC", price: 341.55, change: 2.10, percentage: 0.62, direction: "up", isFno: true },
  { symbol: "IRFC", token: "2029", exchange: "NSE", name: "INDIAN RAILWAY FINANCE CORPORATION", price: 88.25, change: -0.01, percentage: -0.01, direction: "down", isFno: false },
  { symbol: "YESBANK", token: "11915", exchange: "NSE", name: "YES BANK", price: 22.96, change: -0.02, percentage: -0.09, direction: "down", isFno: false },
  { symbol: "NHPC", token: "17400", exchange: "NSE", name: "NHPC", price: 77.72, change: 0.87, percentage: 1.13, direction: "up", isFno: false },
  { symbol: "ONGC", token: "2475", exchange: "NSE", name: "OIL AND NATURAL GAS CORPORATION", price: 240.08, change: 1.03, percentage: 0.43, direction: "up", isFno: true },
  { symbol: "TATAPOWER", token: "3426", exchange: "NSE", name: "TATA POWER", price: 380.95, change: 1.50, percentage: 0.40, direction: "up", isFno: false },
  { symbol: "IREDA", token: "20203", exchange: "NSE", name: "INDIAN RENEWABLE ENERGY DEVELOPMENT AGENCY", price: 117.29, change: -0.51, percentage: -0.43, direction: "down", isFno: false }
];

const indicesData = [
  { name: "NIFTY", value: "24,398.45", change: "-37.50", percentage: "-0.15%", direction: "down", tag: null },
  { name: "SENSEX", value: "77,982.79", change: "+16.44", percentage: "+0.02%", direction: "up", tag: "EXPIRY" },
  { name: "BANKNIFTY", value: "57,663.35", change: "-222.50", percentage: "-0.38%", direction: "down", tag: null },
  { name: "FINNIFTY", value: "26,358.85", change: "-67.90", percentage: "-0.26%", direction: "down", tag: null },
  { name: "MIDCPNIFTY", value: "15,034.55", change: "+1.90", percentage: "+0.01%", direction: "up", tag: null },
  { name: "INDIA VIX", value: "11.50", change: "-0.19", percentage: "-1.63%", direction: "down", tag: null }
];

const indexStatsData = {
  NIFTY: {
    current: "24,394.25",
    change: "-40.80",
    percentage: "-0.17%",
    low: "24,311.40",
    high: "24,431.60",
    open: "24,431.60",
    close: "24,435.95",
    timeSeries: [
      { time: "09:30", price: 24345.50 },
      { time: "10:00", price: 24370.20 },
      { time: "10:30", price: 24335.80 },
      { time: "11:00", price: 24350.10 },
      { time: "11:30", price: 24340.00 },
      { time: "12:00", price: 24420.75 },
      { time: "12:30", price: 24394.25 }
    ]
  },
  SENSEX: {
    current: "77,966.37",
    change: "+0.02",
    percentage: "+0.00%",
    low: "77,810.20",
    high: "78,050.00",
    open: "78,010.00",
    close: "77,950.00",
    timeSeries: [
      { time: "09:30", price: 77850 },
      { time: "10:00", price: 77920 },
      { time: "10:30", price: 77890 },
      { time: "11:00", price: 77980 },
      { time: "11:30", price: 77940 },
      { time: "12:00", price: 78020 },
      { time: "12:30", price: 77966 }
    ]
  }
};

const mostBoughtStocksData = [
  { symbol: "IDEA", name: "VODAFONE IDEA LIMITED", price: "13.62", change: "+0.12", percentage: "+0.89%", direction: "up", logoText: "Vi", logoBg: "#E11D48" },
  { symbol: "YESBANK", name: "YES BANK LIMITED", price: "22.95", change: "-0.03", percentage: "-0.13%", direction: "down", logoText: "✓", logoBg: "#DC2626" },
  { symbol: "JPPOWER", name: "JAIPRAKASH POWER VE...", price: "17.71", change: "-0.02", percentage: "-0.11%", direction: "down", logoText: "JP", logoBg: "#2563EB" },
  { symbol: "RPOWER", name: "RELIANCE POWER LTD.", price: "23.26", change: "-0.12", percentage: "-0.51%", direction: "down", logoText: "R", logoBg: "#0284C7" },
  { symbol: "IRB", name: "IRB INFRA DEV LTD.", price: "19.27", change: "-0.06", percentage: "-0.31%", direction: "down", logoText: "IRB", logoBg: "#1E3A8A" }
];

const ipoData = [
  {
    name: "MILKY MIST DAIRY FOOD LTD",
    badge: "MAINBOARD",
    closesOn: "13 Aug 26",
    minInvestment: "₹14,231",
    subscription: "4.1x",
    logoText: "Milky Mist",
    logoColor: "#2563EB"
  },
  {
    name: "SHIPROCKET LTD",
    badge: "MAINBOARD",
    closesOn: "14 Aug 26",
    minInvestment: "₹14,168",
    subscription: "1.65x",
    logoText: "Shiprocket",
    logoColor: "#7C3AED"
  },
  {
    name: "BEHARI LAL ENGINEERING LTD",
    badge: "MAINBOARD",
    closesOn: "14 Aug 26",
    minInvestment: "₹14,092",
    subscription: "3.87x",
    logoText: "Behari Lal",
    logoColor: "#D97706"
  }
];

const toolsData = [
  { title: "Calculators", desc: "SIP, Lumpsum, Brokerage & Margin Calculators", icon: "calculator" },
  { title: "Option Chain", desc: "Real-time F&O Open Interest & Greeks Data", icon: "layers" },
  { title: "Market Tools", desc: "Heatmaps, Top Gainers, Losers & Volatility", icon: "activity" },
  { title: "SIP Calculator", desc: "Plan long-term wealth growth & investment goals", icon: "pie-chart" },
  { title: "Margin Calculator", desc: "Calculate exact required margin for F&O positions", icon: "dollar-sign" },
  { title: "Trading Tools", desc: "Basket order building & GTT multi-trigger setup", icon: "sliders" }
];

let activeWatchlist = [...initialWatchlist];

function getStoredWatchlist() {
  return activeWatchlist;
}

function saveStoredWatchlist(list) {
  activeWatchlist = list;
}

// Fetch Google Sheet stocks directly on page load
function loadSheetStocks() {
  fetch("/api/sheet-stocks")
    .then(res => res.json())
    .then(data => {
      if (data && data.watchlist && data.watchlist.length > 0) {
        const sheetWatchlist = data.watchlist.map(item => {
          const existing = activeWatchlist.find(s => s.symbol === item.symbol || s.token === item.token);
          return {
            symbol: item.symbol,
            rawSymbol: item.rawSymbol,
            token: item.token,
            exchange: item.exchange || "NSE",
            name: item.name,
            price: existing ? existing.price : 100.0,
            change: existing ? existing.change : 0.0,
            percentage: existing ? existing.percentage : 0.0,
            direction: existing ? existing.direction : "up",
            isFno: ["NTPC", "ONGC", "TATASTEEL"].includes(item.symbol)
          };
        });
        activeWatchlist = sheetWatchlist;
        if (typeof window.refreshWatchlist === "function") {
          window.refreshWatchlist();
        }
      }
    })
    .catch(err => console.warn("Could not load Google Sheet stocks:", err));
}

document.addEventListener("DOMContentLoaded", loadSheetStocks);

// Make data available globally
window.AngelOneData = {
  getWatchlist: getStoredWatchlist,
  saveWatchlist: saveStoredWatchlist,
  indices: indicesData,
  indexStats: indexStatsData,
  mostBought: mostBoughtStocksData,
  ipos: ipoData,
  tools: toolsData,
  reloadSheet: loadSheetStocks
};
