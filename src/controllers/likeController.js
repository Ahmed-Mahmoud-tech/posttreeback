const pool = require('../config/database');

const likeController = {
  // Toggle like (create or update)
  async toggleLike(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { like_on } = req.body;
      const from_user_id = req.user.id;
      const newStatus = req.body.status; // 'liked' or 'dislike'

      // Check if like exists
      const existingLike = await client.query(
        'SELECT * FROM likes WHERE from_user_id = $1 AND like_on = $2',
        [from_user_id, like_on]
      );

      let result;
      if (existingLike.rows.length === 0) {
        // Create new like
        result = await client.query(
          'INSERT INTO likes (from_user_id, like_on, status) VALUES ($1, $2, $3) RETURNING *',
          [from_user_id, like_on, newStatus]
        );
      } else {
        // Update existing like
        result = await client.query(
          'UPDATE likes SET status = $1 WHERE from_user_id = $2 AND like_on = $3 RETURNING *',
          [newStatus, from_user_id, like_on]
        );
      }

      // Create notification for post owner
      const postResult = await client.query(
        'SELECT author_user_id FROM posts WHERE id = $1',
        [like_on]
      );

      if (postResult.rows.length > 0) {
        await client.query(
          'INSERT INTO notifications (author_user_id, to_user_id, content) VALUES ($1, $2, $3)',
          [
            from_user_id,
            postResult.rows[0].author_user_id,
            `Someone ${newStatus} your post`,
          ]
        );
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },

  // Get likes for a post
  async getLikes(req, res) {
    try {
      const { like_on } = req.params;

      const result = await pool.query(
        `SELECT l.*, u.name, u.image 
         FROM likes l 
         JOIN users u ON l.from_user_id = u.id 
         WHERE l.like_on = $1 AND l.status = 'liked'`,
        [like_on]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = likeController;
