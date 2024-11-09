const compression = require('compression');
const { promisify } = require('util');
const { redis } = require('../config/redis');

const performanceMiddleware = {
  // Compression middleware
  compress: compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  }),

  // Response time tracking
  responseTime: (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const time = diff[0] * 1e3 + diff[1] * 1e-6;

      // Store response time metrics
      redis.zadd('response_times', time, `${req.method}:${req.path}`);
    });

    next();
  },

  // Query optimization
  queryOptimizer: (req, res, next) => {
    // Store original query method
    const originalQuery = req.query;

    // Add pagination defaults
    req.query = {
      limit: parseInt(originalQuery.limit) || 10,
      offset: parseInt(originalQuery.offset) || 0,
      ...originalQuery,
    };

    // Validate and sanitize query parameters
    if (req.query.limit > 100) req.query.limit = 100;
    if (req.query.offset < 0) req.query.offset = 0;

    next();
  },

  // Cache warming
  cacheWarmer: async (req, res, next) => {
    if (req.method === 'GET') {
      const cacheKey = `cache:${req.originalUrl}`;
      const cached = await redis.get(cacheKey);

      if (!cached) {
        // Store original send method
        const originalSend = res.send;

        // Override send method to cache response
        res.send = function (body) {
          redis.set(cacheKey, body, 'EX', 300); // Cache for 5 minutes
          originalSend.call(this, body);
        };
      }
    }
    next();
  },
};

module.exports = performanceMiddleware;
