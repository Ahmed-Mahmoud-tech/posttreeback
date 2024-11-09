const pool = require('../config/database');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const viewController = {
  // Track post view
  async trackView(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { post_id } = req.params;
      const from_user_id = req.user.id;

      // Check if view exists in Redis cache
      const cacheKey = `view:${post_id}:${from_user_id}`;
      const cached = await redis.get(cacheKey);

      if (!cached) {
        // Create view record
        await client.query(
          'INSERT INTO views (from_user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [from_user_id, post_id]
        );

        // Cache the view for 24 hours
        await redis.set(cacheKey, 'viewed', 'EX', 86400);

        // Increment view count in Redis
        await redis.hincrby(`post:${post_id}:stats`, 'views', 1);
      }

      await client.query('COMMIT');
      res.json({ message: 'View tracked successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },

  // Get post views statistics
  async getViewStats(req, res) {
    try {
      const { post_id } = req.params;

      // Get views from database
      const result = await pool.query(
        `SELECT 
          COUNT(DISTINCT from_user_id) as unique_viewers,
          COUNT(*) as total_views,
          DATE_TRUNC('day', created_at) as view_date,
          COUNT(*) as daily_views
         FROM views 
         WHERE post_id = $1
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY view_date DESC`,
        [post_id]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = viewController;
