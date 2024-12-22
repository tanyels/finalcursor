const fetch = require('node-fetch');

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds
const ITEMS_PER_PAGE = 250;
const PAGES_TO_FETCH = 20; // Will fetch 5000 coins (250 * 20)

async function fetchAllPages() {
    const allData = [];

    try {
        for (let page = 1; page <= PAGES_TO_FETCH; page++) {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?' + new URLSearchParams({
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: ITEMS_PER_PAGE.toString(),
                    page: page.toString(),
                    sparkline: 'false',
                    price_change_percentage: '24h'
                }),
                {
                    headers: {
                        'x-cg-demo-api-key': 'CG-4rXLTancGryw45RBGe2ua7Ui'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const pageData = await response.json();
            if (Array.isArray(pageData) && pageData.length > 0) {
                allData.push(...pageData);
            }

            // Add delay between requests
            if (page < PAGES_TO_FETCH) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay to avoid rate limits
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }

    return allData;
}

exports.handler = async function(event, context) {
    try {
        const now = Date.now();
        if (!cachedData || (now - lastFetchTime) > CACHE_DURATION) {
            const rawData = await fetchAllPages();
            if (!Array.isArray(rawData) || rawData.length === 0) {
                throw new Error('No data received from API');
            }
            
            cachedData = rawData.map(coin => ({
                ...coin,
                xToAth: (coin.ath && coin.current_price) 
                    ? (coin.ath / coin.current_price).toFixed(2)
                    : 'N/A'
            }));
            lastFetchTime = now;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(cachedData)
        };
    } catch (error) {
        console.error('Handler Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to fetch cryptocurrency data',
                details: error.message
            })
        };
    }
};
