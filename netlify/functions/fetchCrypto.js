const fetch = require('node-fetch');

// Cache variables with longer duration
const CACHE_DURATION = 300000; // 5 minutes in milliseconds
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests

// Cache variables
let cachedData = new Map();
let lastFetchTimes = new Map();
let lastRequestTime = 0;

// Cache for individual coin details
let coinDetailsCache = new Map();
let coinDetailsFetchTimes = new Map();

exports.handler = async function(event, context) {
    try {
        const now = Date.now();

        // Global rate limiting
        if (now - lastRequestTime < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
        lastRequestTime = now;

        const coinId = event.queryStringParameters?.coinId;
        const page = parseInt(event.queryStringParameters?.page) || 1;
        const per_page = parseInt(event.queryStringParameters?.per_page) || 100;
        
        if (coinId) {
            // Handle coin detail request
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
                `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=false`
            );
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
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

        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=false`
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('Invalid data format received from API');
        }

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
