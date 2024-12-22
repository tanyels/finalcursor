const fetch = require('node-fetch');

// Cache variables
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

exports.handler = async function(event, context) {
  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          data: cachedData,
          fromCache: true
        })
      };
    }

    // Fetch new data from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
    );
    
    const data = await response.json();
    
    // Update cache
    cachedData = data;
    lastFetchTime = now;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        data: data,
        fromCache: false
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed fetching data' })
    };
  }
}; 
