const fetch = require('node-fetch');

// Cache variables
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

// Cache for individual coin details
let coinDetailsCache = new Map();
let coinDetailsFetchTimes = new Map();

exports.handler = async function(event, context) {
    try {
        const coinId = event.queryStringParameters?.coinId;
        const page = event.queryStringParameters?.page || 1;
        const perPage = event.queryStringParameters?.per_page || 100;
        const category = event.queryStringParameters?.category;
        const search = event.queryStringParameters?.search;

        // Handle search request
        if (search) {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(search)}`
            );
            const data = await response.json();
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

        // Check if this is a coin detail request
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

        // Handle main list request
        const now = Date.now();
        const cacheKey = `${page}-${perPage}-${category || 'all'}`;
        
        if (cachedData && cachedData[cacheKey] && (now - lastFetchTime) < CACHE_DURATION) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    data: cachedData[cacheKey],
                    fromCache: true
                })
            };
        }

        const categoryParam = category && category !== 'all' ? `&category=${category}` : '';
        const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}${categoryParam}`;

        try {
            console.log('Fetching from URL:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                console.error(`CoinGecko API error: ${response.status} - ${response.statusText}`);
                console.error('Request URL:', apiUrl);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`API responded with status ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            // Validate data
            if (!data || !Array.isArray(data)) {
                console.error('Invalid data received:', data);
                throw new Error('Invalid data received from API');
            }

            // If the category returns empty data, try without category
            if (data.length === 0 && category && category !== 'all') {
                console.warn(`No data for category: ${category}, falling back to all coins`);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        data: [],
                        message: `No coins found in category: ${category}`,
                        fromCache: false
                    })
                };
            }

            // Update cache with new structure
            if (!cachedData) cachedData = {};
            cachedData[cacheKey] = data;
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
            console.error('Error in category fetch:', error);
            throw error;
        }

        // Add a new condition for fetching categories
        if (event.queryStringParameters?.getCategories === 'true') {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/coins/categories/list');
                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }
                const data = await response.json();
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
                console.error('Error fetching categories:', error);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        data: [],
                        error: 'Failed to fetch categories'
                    })
                };
            }
        }

    } catch (error) {
        console.error('Serverless function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed fetching data' })
        };
    }
}; 
