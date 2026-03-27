const NodeCache = require('node-cache');

// TTL in seconds
const cache = new NodeCache({
  stdTTL: 60,         // default 60s
  checkperiod: 120,   // cleanup every 2min
  useClones: false,   // performance: return references
});

// Cache keys
const KEYS = {
  contestList: (userId) => `contests:${userId}`,
  contest: (id) => `contest:${id}`,
  scrapedProblem: (url) => `scrape:${url}`,
  userProfile: (id) => `profile:${id}`,
  leaderboard: (contestId) => `leaderboard:${contestId}`,
};

// Get or set pattern
async function getOrSet(key, ttl, fetchFn) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
}

// Invalidate patterns
function invalidate(key) {
  cache.del(key);
}

function invalidatePattern(prefix) {
  const keys = cache.keys().filter(k => k.startsWith(prefix));
  keys.forEach(k => cache.del(k));
}

module.exports = { cache, KEYS, getOrSet, invalidate, invalidatePattern };
