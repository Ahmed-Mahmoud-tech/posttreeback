const pool = require('../config/database');

const ratingController = {
  // Add or update rating
  async ratePost(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { post_id, rate } = req.body;
      const from_user_id = req.user.id;

      // Check if rating exists
      const existingRating = await client.query(
        'SELECT * FROM ratings WHERE from_user_id = $1 AND post_id = $2',
        [from_user_id, post_id]
      );

      let result;
      if (existingRating.rows.length === 0) {
        result = await client.query(
          'INSERT INTO ratings (from_user_id, post_id, rate) VALUES ($1, $2, $3) RETURNING *',
          [from_user_id, post_id, rate]
        );
      } else {
        result = await client.query(
          'UPDATE ratings SET rate = $1, updated_at = CURRENT_TIMESTAMP WHERE from_user_id = $2 AND post_id = $3 RETURNING *',
          [rate, from_user_id, post_id]
        );
      }

      // Calculate average rating
      const avgRating = await client.query(
        'SELECT AVG(rate) as average FROM ratings WHERE post_id = $1',
        [post_id]
      );

      await client.query('COMMIT');
      res.json({
        rating: result.rows[0],
        averageRating: avgRating.rows[0].average,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },

  // Get ratings for a post
  async getPostRatings(req, res) {
    try {
      const { post_id } = req.params;

      const result = await pool.query(
        `SELECT 
          AVG(rate) as average_rating,
          COUNT(*) as total_ratings,
          COUNT(CASE WHEN rate = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rate = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rate = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rate = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rate = 1 THEN 1 END) as one_star
         FROM ratings 
         WHERE post_id = $1`,
        [post_id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = ratingController;
