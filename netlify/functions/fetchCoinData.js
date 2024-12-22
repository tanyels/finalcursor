const fetch = require('node-fetch');

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds
const PAGES_TO_FETCH = 15; // This will fetch up to 3750 coins (250 * 15)

async function fetchAllPages() {
    const allData = [];
    
    try {
        // First, make a test call to check total available coins
        const testResponse = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?' + new URLSearchParams({
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: '1',
                page: '1'
            }),
            {
                headers: {
                    'x-cg-demo-api-key': 'CG-4rXLTancGryw45RBGe2ua7Ui',
                    'Accept': 'application/json'
                }
            }
        );

        // Fetch all pages in parallel with delay between batches to avoid rate limits
        for (let batch = 0; batch < PAGES_TO_FETCH; batch++) {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?' + new URLSearchParams({
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: '250',
                    page: (batch + 1).toString(),
                    sparkline: 'true',
                    price_change_percentage: '1h,24h,7d,14d,30d,200d,1y',
                    locale: 'en',
                    precision: 'full',
                    ath: 'true',
                    atl: 'true',
                    developer_data: 'true',
                    community_data: 'true',
                    last_updated: 'true'
                }),
                {
                    headers: {
                        'x-cg-demo-api-key': 'CG-4rXLTancGryw45RBGe2ua7Ui',
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error(`Failed to fetch page ${batch + 1}`);
                continue;
            }

            const pageData = await response.json();
            if (Array.isArray(pageData) && pageData.length > 0) {
                allData.push(...pageData);
            } else {
                // If we get an empty page, we've reached the end
                break;
            }

            // Small delay between batches to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }

    return allData;
}

exports.handler = async function(event, context) {
    try {
        const now = Date.now();
        if (!cachedData || (now - lastFetchTime) > CACHE_DURATION) {
            const rawData = await fetchAllPages();
            if (rawData.length > 0) {
                cachedData = rawData.map(coin => ({
                    ...coin,
                    xToAth: (coin.ath && coin.current_price) 
                        ? (coin.ath / coin.current_price).toFixed(2)
                        : 'N/A'
                }));
                lastFetchTime = now;
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60'
            },
            body: JSON.stringify(cachedData || [])
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}; 