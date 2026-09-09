const GOOGLE_SHEET_ID = "1KheQCIcEHbQ29JnCG46ODlKuiDH6zzd3RCCEchhTOSQ";

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const symbolIdx = headers.findIndex(h => h === 'symbol' || h === 'ticker' || h === 'scrip');
  const tokenIdx = headers.findIndex(h => h === 'token' || h === 'symboltoken');
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'company');
  const exchangeIdx = headers.findIndex(h => h === 'exchange');
  const exchangeTypeIdx = headers.findIndex(h => h === 'exchangetype');
  const qtyIdx = headers.findIndex(h => h === 'quantity' || h === 'qty' || h === 'shares' || h === 'units');
  const avgPriceIdx = headers.findIndex(h => h === 'avg price' || h === 'avgprice' || h === 'average price' || h === 'buy price' || h === 'cost');
  const overAllProfitIdx = headers.findIndex(h => 
    h === 'over all profit' || 
    h === 'overall profit' || 
    h === 'previous profit' || 
    h === 'prev profit' || 
    h === 'closing profit' || 
    h === 'priveous profit'
  );

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    // Parse CSV line handling quotes
    const row = [];
    let inQuotes = false;
    let current = '';
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    const rawSym = (symbolIdx !== -1 ? row[symbolIdx] : (nameIdx !== -1 ? row[nameIdx] : row[0])) || '';
    const rawToken = (tokenIdx !== -1 ? row[tokenIdx] : '') || '';
    const rawName = (nameIdx !== -1 ? row[nameIdx] : (symbolIdx !== -1 ? row[symbolIdx] : row[0])) || rawSym;
    const rawExchange = (exchangeIdx !== -1 ? row[exchangeIdx] : '') || 'NSE';
    const rawExchangeType = (exchangeTypeIdx !== -1 ? row[exchangeTypeIdx] : '') || 1;
    const rawQty = (qtyIdx !== -1 ? row[qtyIdx] : '') || '';
    const rawAvgPrice = (avgPriceIdx !== -1 ? row[avgPriceIdx] : '') || '';
    const rawOverAllProfit = (overAllProfitIdx !== -1 ? row[overAllProfitIdx] : '') || '';

    const symbol = rawSym.replace(/^["']|["']$/g, '').trim();
    const token = rawToken.replace(/^["']|["']$/g, '').trim();
    const name = rawName.replace(/^["']|["']$/g, '').trim();
    const exchange = rawExchange.replace(/^["']|["']$/g, '').trim() || 'NSE';
    const exchangeType = Number(String(rawExchangeType).replace(/^["']|["']$/g, '').trim()) || 1;
    const quantity = parseFloat(String(rawQty).replace(/[₹, ]/g, '')) || 0;
    const avgPrice = parseFloat(String(rawAvgPrice).replace(/[₹, ]/g, '')) || 0;
    const cleanOverAllProfit = rawOverAllProfit.replace(/^["']|["']$/g, '').replace(/[₹, ]/g, '').trim();
    const previousProfit = cleanOverAllProfit !== '' ? parseFloat(cleanOverAllProfit) : null;

    if (symbol && symbol.toLowerCase() !== 'symbol' && symbol.toLowerCase() !== 'name') {
      const cleanSymbol = symbol.replace(/NSE$/i, '').replace(/BSE$/i, '').trim();
      records.push({
        rawSymbol: symbol,
        symbol: cleanSymbol,
        token: token || '',
        name: name || cleanSymbol,
        exchange: exchange,
        exchangeType: exchangeType,
        quantity: quantity,
        qty: quantity,
        avgPrice: avgPrice,
        previousProfit: (previousProfit !== null && !isNaN(previousProfit)) ? previousProfit : null,
        overAllProfit: (previousProfit !== null && !isNaN(previousProfit)) ? previousProfit : null
      });
    }
  }

  return records;
}

async function fetchTab(sheetName) {
  try {
    const nocache = Date.now();
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&t=${nocache}&nocache=${nocache}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet ${sheetName}: ${response.status}`);
    }
    const text = await response.text();
    return parseCsv(text);
  } catch (err) {
    console.error(`[GoogleSheet] Error loading tab '${sheetName}':`, err.message);
    return [];
  }
}

async function fetchProfileData() {
  try {
    const nocache = Date.now();
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('profile data')}&t=${nocache}&nocache=${nocache}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet profile data: ${response.status}`);
    }
    const text = await response.text();
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length <= 1) return { name: '', balance: 0 };

    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'profile name' || h === 'user' || h === 'client name');
    const balanceIdx = headers.findIndex(h => h === 'balance' || h === 'trading balance' || h === 'amount' || h === 'funds');

    const row = [];
    let inQuotes = false;
    let current = '';
    const line = lines[1];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    const rawName = (nameIdx !== -1 ? row[nameIdx] : row[0]) || '';
    const rawBalance = (balanceIdx !== -1 ? row[balanceIdx] : (row[1] !== undefined ? row[1] : '0')) || '0';

    const cleanName = rawName.replace(/^["']|["']$/g, '').trim();
    const cleanBalStr = String(rawBalance).replace(/^["']|["']$/g, '').replace(/[₹, ]/g, '').trim();
    const balance = parseFloat(cleanBalStr) || 0;

    return {
      name: cleanName,
      balance: balance
    };
  } catch (err) {
    console.error(`[GoogleSheet] Error loading tab 'profile data':`, err.message);
    return { name: '', balance: 0 };
  }
}

let cachedSheetData = {
  navbar: [],
  watchlist: [],
  portfolio: [],
  portfolioPositions: [],
  positions: [],
  profileData: { name: '', balance: 0 },
  lastUpdated: 0
};

async function syncGoogleSheet() {
  console.log('[GoogleSheet] Fetching tabs: navbar, watchlish, portfolio, portfolio positions, profile data...');
  const [navbar, watchlist, portfolio, portfolioPositionsRaw, profileData] = await Promise.all([
    fetchTab('navbar'),
    fetchTab('watchlish'),
    fetchTab('portfolio'),
    fetchTab('portfolio positions').then(res => res.length > 0 ? res : fetchTab('positions')),
    fetchProfileData()
  ]);

  // Update profile data (name + balance)
  if (profileData && (profileData.name || profileData.balance > 0)) {
    cachedSheetData.profileData = profileData;
    console.log(`[GoogleSheet] Loaded profile data: Name="${profileData.name}", Balance=₹${profileData.balance}`);
  }

  if (navbar.length > 0) cachedSheetData.navbar = navbar;
  if (watchlist.length > 0) cachedSheetData.watchlist = watchlist;

  // Build a lookup map of symbols to tokens/exchanges from portfolio and watchlist
  const stockLookup = {};
  [...portfolio, ...watchlist, ...navbar].forEach(stock => {
    if (stock.symbol) stockLookup[stock.symbol.toUpperCase()] = stock;
    if (stock.rawSymbol) stockLookup[stock.rawSymbol.toUpperCase()] = stock;
    if (stock.name) stockLookup[stock.name.toUpperCase()] = stock;
  });

  // Enrich portfolioPositions with matching tokens & exchanges
  const mergedPositions = (portfolioPositionsRaw || []).map((pos, idx) => {
    const symKey = (pos.symbol || pos.name || '').toUpperCase();
    const cleanSymKey = symKey.replace(/NSE$/i, '').replace(/BSE$/i, '').trim();
    const matchedStock = stockLookup[cleanSymKey] || stockLookup[symKey] || portfolio[idx] || {};

    const finalSymbol = pos.symbol || matchedStock.symbol || cleanSymKey;
    const finalToken = pos.token || matchedStock.token || '';
    const finalExchange = pos.exchange || matchedStock.exchange || 'NSE';
    const finalExchangeType = pos.exchangeType || matchedStock.exchangeType || 1;
    const finalName = pos.name || matchedStock.name || finalSymbol;

    return {
      rawSymbol: matchedStock.rawSymbol || pos.rawSymbol || finalSymbol,
      symbol: finalSymbol,
      token: finalToken,
      name: finalName,
      exchange: finalExchange,
      exchangeType: finalExchangeType,
      quantity: pos.quantity || 0,
      qty: pos.quantity || 0,
      avgPrice: pos.avgPrice || 0,
      previousProfit: pos.previousProfit !== undefined ? pos.previousProfit : (matchedStock.previousProfit !== undefined ? matchedStock.previousProfit : null),
      overAllProfit: pos.overAllProfit !== undefined ? pos.overAllProfit : (matchedStock.overAllProfit !== undefined ? matchedStock.overAllProfit : null)
    };
  });

  // Also enrich portfolio tab items with quantity and avgPrice from portfolioPositions
  const enrichedPortfolio = portfolio.map((stock, idx) => {
    const symKey = (stock.symbol || '').toUpperCase();
    const matchedPos = mergedPositions.find(p => (p.symbol && p.symbol.toUpperCase() === symKey) || (p.name && p.name.toUpperCase() === symKey)) || mergedPositions[idx];
    return {
      ...stock,
      quantity: matchedPos ? matchedPos.quantity : (stock.quantity || 0),
      qty: matchedPos ? matchedPos.quantity : (stock.qty || 0),
      avgPrice: matchedPos ? matchedPos.avgPrice : (stock.avgPrice || 0),
      previousProfit: (matchedPos && matchedPos.previousProfit !== null) ? matchedPos.previousProfit : (stock.previousProfit !== undefined ? stock.previousProfit : null),
      overAllProfit: (matchedPos && matchedPos.overAllProfit !== null) ? matchedPos.overAllProfit : (stock.overAllProfit !== undefined ? stock.overAllProfit : null)
    };
  });

  if (enrichedPortfolio.length > 0) cachedSheetData.portfolio = enrichedPortfolio;
  cachedSheetData.portfolioPositions = mergedPositions.length > 0 ? mergedPositions : enrichedPortfolio;
  cachedSheetData.positions = cachedSheetData.portfolioPositions;
  cachedSheetData.lastUpdated = Date.now();

  console.log(`[GoogleSheet] Synced: ${cachedSheetData.navbar.length} navbar, ${cachedSheetData.watchlist.length} watchlist, ${cachedSheetData.portfolio.length} portfolio, ${cachedSheetData.portfolioPositions.length} positions.`);
  return cachedSheetData;
}

function getSheetData() {
  return cachedSheetData;
}

module.exports = {
  syncGoogleSheet,
  getSheetData,
  GOOGLE_SHEET_ID
};

