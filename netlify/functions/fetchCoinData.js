const fetch = require('node-fetch');

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

exports.handler = async function(event, context) {
    try {
        const now = Date.now();
        if (!cachedData || (now - lastFetchTime) > CACHE_DURATION) {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage_24h=true&ath=true',
                {
                    headers: {
                        'x-cg-demo-api-key': 'CG-4rXLTancGryw45RBGe2ua7Ui'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const rawData = await response.json();
            cachedData = rawData.map(coin => ({
                ...coin,
                xToAth: (coin.ath / coin.current_price).toFixed(2)
            }));
            lastFetchTime = now;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60'
            },
            body: JSON.stringify(cachedData)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}; 