const fetch = require('node-fetch');

// Cache variables
let cachedData = new Map();
let lastFetchTimes = new Map();
const CACHE_DURATION = 60000; // 1 minute in milliseconds

// Cache for individual coin details
let coinDetailsCache = new Map();
let coinDetailsFetchTimes = new Map();

exports.handler = async function(event, context) {
    try {
        // Check if this is a coin detail request
        const coinId = event.queryStringParameters?.coinId;
        const page = parseInt(event.queryStringParameters?.page) || 1;
        const per_page = parseInt(event.queryStringParameters?.per_page) || 100;
        
        if (coinId) {
            // Handle coin detail request
            const now = Date.now();
            const lastCoinFetch = coinDetailsFetchTimes.get(coinId) || 0;
            
            if (coinDetailsCache.has(coinId) && (now - lastCoinFetch) < CACHE_DURATION) {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        data: coinDetailsCache.get(coinId),
                        fromCache: true
                    })
                };
            }

            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`
            );
            
            const data = await response.json();
            
            // Update cache
            coinDetailsCache.set(coinId, data);
            coinDetailsFetchTimes.set(coinId, now);

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
        }

        // Handle main list request with pagination
        const now = Date.now();
        const cacheKey = `page_${page}`;
        
        if (cachedData.has(cacheKey) && (now - lastFetchTimes.get(cacheKey)) < CACHE_DURATION) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    data: cachedData.get(cacheKey),
                    fromCache: true
                })
            };
        }

        // Add delay between requests to avoid rate limiting
        if (lastFetchTimes.size > 0) {
            const lastFetchTime = Math.max(...lastFetchTimes.values());
            if (now - lastFetchTime < 1000) { // 1 second delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=false`
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Verify data is an array
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format received from API');
        }

        // Update cache for this page
        cachedData.set(cacheKey, data);
        lastFetchTimes.set(cacheKey, now);

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
        console.error('Server Error:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed fetching data',
                message: error.message,
                page: event.queryStringParameters?.page || 1
            })
        };
    }
}; 
