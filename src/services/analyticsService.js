const pool = require('../config/database');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

class AnalyticsService {
  // Track user activity
  async trackActivity(userId, action, metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO user_analytics 
        (user_id, action, metadata, created_at) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [userId, action, JSON.stringify(metadata)]
      );

      // Increment daily activity counter in Redis
      const date = new Date().toISOString().split('T')[0];
      await redis.hincrby(`analytics:daily:${date}`, action, 1);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Get user engagement metrics
  async getUserEngagement(userId, startDate, endDate) {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT CASE WHEN action = 'post_create' THEN id END) as posts_created,
        COUNT(DISTINCT CASE WHEN action = 'comment_create' THEN id END) as comments_made,
        COUNT(DISTINCT CASE WHEN action = 'post_view' THEN metadata->>'post_id' END) as posts_viewed,
        COUNT(DISTINCT CASE WHEN action = 'like' THEN metadata->>'post_id' END) as likes_given
       FROM user_analytics
       WHERE user_id = $1 
       AND created_at BETWEEN $2 AND $3`,
      [userId, startDate, endDate]
    );
    return result.rows[0];
  }

  // Get post performance metrics
  async getPostAnalytics(postId, startDate, endDate) {
    const result = await pool.query(
      `WITH post_stats AS (
        SELECT 
          COUNT(DISTINCT CASE WHEN action = 'post_view' THEN user_id END) as unique_views,
          COUNT(DISTINCT CASE WHEN action = 'like' THEN user_id END) as unique_likes,
          COUNT(DISTINCT CASE WHEN action = 'comment_create' THEN user_id END) as unique_commenters,
          AVG(CASE WHEN action = 'rate' THEN (metadata->>'rating')::numeric END) as avg_rating
        FROM user_analytics
        WHERE metadata->>'post_id' = $1
        AND created_at BETWEEN $2 AND $3
      )
      SELECT 
        *,
        CASE 
          WHEN unique_views > 0 THEN 
            (unique_likes::float / unique_views * 100)
          ELSE 0 
        END as engagement_rate
      FROM post_stats`,
      [postId, startDate, endDate]
    );
    return result.rows[0];
  }
}

module.exports = new AnalyticsService();
