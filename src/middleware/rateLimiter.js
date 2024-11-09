const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const rateLimiter = ({ windowMs, max }) => {
  return async (req, res, next) => {
    const key = `ratelimit:${req.ip}`;

    try {
      // Get current count
      const current = await redis.get(key);

      if (!current) {
        // First request, set initial count
        await redis.set(key, 1, 'PX', windowMs);
        return next();
      }

      if (parseInt(current) >= max) {
        return res.status(429).json({
          error: 'Too many requests, please try again later.',
        });
      }

      // Increment count
      await redis.incr(key);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = rateLimiter;
