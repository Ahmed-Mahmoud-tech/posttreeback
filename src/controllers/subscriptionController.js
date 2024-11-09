const pool = require('../config/database');

const subscriptionController = {
  // Subscribe to a post
  async subscribe(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { post_id } = req.body;
      const from_user_id = req.user.id;

      // Check if already subscribed
      const existingSub = await client.query(
        'SELECT * FROM subscribe WHERE from_user_id = $1 AND post_id = $2',
        [from_user_id, post_id]
      );

      if (existingSub.rows.length > 0) {
        throw new Error('Already subscribed to this post');
      }

      // Create subscription
      const result = await client.query(
        'INSERT INTO subscribe (from_user_id, post_id) VALUES ($1, $2) RETURNING *',
        [from_user_id, post_id]
      );

      // Get post author
      const postAuthor = await client.query(
        'SELECT author_user_id FROM posts WHERE id = $1',
        [post_id]
      );

      // Create notification for post author
      await client.query(
        `INSERT INTO notifications (author_user_id, to_user_id, content) 
         VALUES ($1, $2, $3)`,
        [
          from_user_id,
          postAuthor.rows[0].author_user_id,
          'Someone subscribed to your post',
        ]
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },

  // Unsubscribe from a post
  async unsubscribe(req, res) {
    try {
      const { post_id } = req.params;
      const from_user_id = req.user.id;

      const result = await pool.query(
        'DELETE FROM subscribe WHERE from_user_id = $1 AND post_id = $2 RETURNING *',
        [from_user_id, post_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get user's subscriptions
  async getSubscriptions(req, res) {
    try {
      const result = await pool.query(
        `SELECT s.*, p.title, p.description, u.name as author_name
         FROM subscribe s
         JOIN posts p ON s.post_id = p.id
         JOIN users u ON p.author_user_id = u.id
         WHERE s.from_user_id = $1
         ORDER BY s.created_at DESC`,
        [req.user.id]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = subscriptionController;
