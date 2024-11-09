const pool = require('../config/database');

const commentController = {
  // Create a new comment
  async createComment(req, res) {
    try {
      const { content, post_id, replay } = req.body;
      const author_user_id = req.user.id;

      const type = replay ? 'reply' : 'comment';

      const result = await pool.query(
        `INSERT INTO comments 
        (author_user_id, content, post_id, replay, status, type) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
        [author_user_id, content, post_id, replay, 'active', type]
      );

      // If this is a comment on a post, create notification for post author
      if (!replay) {
        const postResult = await pool.query(
          'SELECT author_user_id FROM posts WHERE id = $1',
          [post_id]
        );
        const postAuthorId = postResult.rows[0].author_user_id;

        await pool.query(
          `INSERT INTO notifications 
          (author_user_id, to_user_id, content) 
          VALUES ($1, $2, $3)`,
          [
            author_user_id,
            postAuthorId,
            `New comment on your post: ${content.substring(0, 50)}...`,
          ]
        );
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get comments for a post
  async getComments(req, res) {
    try {
      const { post_id } = req.params;

      const result = await pool.query(
        `SELECT c.*, u.name as author_name, u.image as author_image 
         FROM comments c 
         JOIN users u ON c.author_user_id = u.id 
         WHERE c.post_id = $1 AND c.status = 'active' 
         ORDER BY c.created_at DESC`,
        [post_id]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update comment
  async updateComment(req, res) {
    try {
      const { content } = req.body;
      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        `UPDATE comments 
         SET content = $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND author_user_id = $3 AND status = 'active' 
         RETURNING *`,
        [content, id, userId]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'Comment not found or not authorized' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = commentController;
