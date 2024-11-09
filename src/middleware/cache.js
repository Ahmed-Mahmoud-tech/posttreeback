const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const cache = duration => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json method
      res.json = function (body) {
        // Restore original res.json function
        res.json = originalJson;

        // Cache the response
        redis.set(key, JSON.stringify(body), 'EX', duration);

        // Send the response
        return res.json(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Cache invalidation helper
const invalidateCache = async patterns => {
  try {
    const keys = await redis.keys('cache:*');
    const matchingKeys = keys.filter(key =>
      patterns.some(pattern => key.includes(pattern))
    );

    if (matchingKeys.length > 0) {
      await redis.del(...matchingKeys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

module.exports = { cache, invalidateCache };
