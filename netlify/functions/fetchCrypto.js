const fetch = require('node-fetch');

// Cache variables with longer duration
const CACHE_DURATION = 300000; // 5 minutes in milliseconds
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const API_KEY = process.env.COINGECKO_API_KEY;
const MAX_PAGES = 25; // Maximum pages we'll fetch

// Common headers for all requests
const API_HEADERS = {
    'x-cg-demo-api-key': API_KEY,
    'Content-Type': 'application/json'
};

// Base URL for CoinGecko API (using regular API endpoint)
const API_BASE_URL = 'https://api.coingecko.com/api/v3';

// Cache variables
let cachedData = new Map();
let lastFetchTimes = new Map();
let lastRequestTime = 0;
let isInitialDataFetched = false;

// Cache for individual coin details
let coinDetailsCache = new Map();
let coinDetailsFetchTimes = new Map();
let searchCache = new Map();
let searchFetchTimes = new Map();

async function fetchAllPages() {
    const allData = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const response = await fetch(
            `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=false`,
            { headers: API_HEADERS }
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) break;
        
        allData.push(...data);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
    return allData;
}

exports.handler = async function(event, context) {
    try {
        const now = Date.now();
        const coinId = event.queryStringParameters?.coinId;
        const searchQuery = event.queryStringParameters?.search;
        const page = parseInt(event.queryStringParameters?.page) || 1;
        const per_page = parseInt(event.queryStringParameters?.per_page) || 100;

        // Handle search request
        if (searchQuery) {
            const cacheKey = `search_${searchQuery}`;
            const lastSearchTime = searchFetchTimes.get(cacheKey) || 0;

            if (searchCache.has(cacheKey) && (now - lastSearchTime) < CACHE_DURATION) {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        data: searchCache.get(cacheKey),
                        fromCache: true
                    })
                };
            }

            const response = await fetch(
                `${API_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}`,
                { headers: API_HEADERS }
            );

            if (!response.ok) {
                throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            searchCache.set(cacheKey, data);
            searchFetchTimes.set(cacheKey, now);

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

        // Handle coin details request
        if (coinId) {
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
                `${API_BASE_URL}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=false`,
                { headers: API_HEADERS }
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
        if (!isInitialDataFetched || (now - Math.min(...lastFetchTimes.values())) > CACHE_DURATION) {
            // Fetch all pages and store in cache
            const allData = await fetchAllPages();
            isInitialDataFetched = true;
            
            // Split data into pages and cache each page
            for (let i = 0; i < allData.length; i += per_page) {
                const pageNum = Math.floor(i / per_page) + 1;
                const pageData = allData.slice(i, i + per_page);
                cachedData.set(`page_${pageNum}`, pageData);
                lastFetchTimes.set(`page_${pageNum}`, now);
            }
        }

        const cacheKey = `page_${page}`;
        const pageData = cachedData.get(cacheKey) || [];

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                data: pageData,
                fromCache: true,
                totalPages: Math.ceil(cachedData.size)
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
}; const fetch = require('node-fetch');

// Cache variables with longer duration
const CACHE_DURATION = 300000; // 5 minutes in milliseconds
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const API_KEY = process.env.COINGECKO_API_KEY;
const MAX_PAGES = 25; // Maximum pages we'll fetch

// Common headers for all requests
const API_HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

// Base URL for CoinGecko Pro API
const API_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

// Cache variables
let cachedData = new Map();
let lastFetchTimes = new Map();
let lastRequestTime = 0;
let isInitialDataFetched = false;

// Cache for individual coin details
let coinDetailsCache = new Map();
let coinDetailsFetchTimes = new Map();
let searchCache = new Map();
let searchFetchTimes = new Map();

async function fetchAllPages() {
    const allData = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const response = await fetch(
            `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=false`,
            { headers: API_HEADERS }
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) break;
        
        allData.push(...data);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
    return allData;
}

exports.handler = async function(event, context) {
    try {
        const now = Date.now();
        const coinId = event.queryStringParameters?.coinId;
        const searchQuery = event.queryStringParameters?.search;
        const page = parseInt(event.queryStringParameters?.page) || 1;
        const per_page = parseInt(event.queryStringParameters?.per_page) || 100;

        // Handle search request
        if (searchQuery) {
            const cacheKey = `search_${searchQuery}`;
            const lastSearchTime = searchFetchTimes.get(cacheKey) || 0;

            if (searchCache.has(cacheKey) && (now - lastSearchTime) < CACHE_DURATION) {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        data: searchCache.get(cacheKey),
                        fromCache: true
                    })
                };
            }

            const response = await fetch(
                `${API_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}`,
                { headers: API_HEADERS }
            );

            if (!response.ok) {
                throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            searchCache.set(cacheKey, data);
            searchFetchTimes.set(cacheKey, now);

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

        // Handle coin details request
        if (coinId) {
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
                `${API_BASE_URL}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=false`,
                { headers: API_HEADERS }
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
        if (!isInitialDataFetched || (now - Math.min(...lastFetchTimes.values())) > CACHE_DURATION) {
            // Fetch all pages and store in cache
            const allData = await fetchAllPages();
            isInitialDataFetched = true;
            
            // Split data into pages and cache each page
            for (let i = 0; i < allData.length; i += per_page) {
                const pageNum = Math.floor(i / per_page) + 1;
                const pageData = allData.slice(i, i + per_page);
                cachedData.set(`page_${pageNum}`, pageData);
                lastFetchTimes.set(`page_${pageNum}`, now);
            }
        }

        const cacheKey = `page_${page}`;
        const pageData = cachedData.get(cacheKey) || [];

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                data: pageData,
                fromCache: true,
                totalPages: Math.ceil(cachedData.size)
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
