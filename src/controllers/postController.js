const pool = require('../config/database');

const postController = {
  // Create a new post
  async createPost(req, res) {
    try {
      const {
        title,
        category,
        description,
        tags,
        image,
        parent_post_id,
        main_post,
      } = req.body;
      const author_user_id = req.user.id; // From auth middleware

      const result = await pool.query(
        `INSERT INTO posts 
        (author_user_id, title, category, description, tags, image, parent_post_id, main_post, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          author_user_id,
          title,
          category,
          description,
          tags,
          image,
          parent_post_id,
          main_post,
          'draft',
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get all posts (with pagination)
  async getPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status = 'published',
      } = req.query;
      const offset = (page - 1) * limit;

      let query = 'SELECT * FROM posts WHERE status = $1';
      let params = [status];

      if (category) {
        query += ' AND category = $2';
        params.push(category);
      }

      query +=
        ' ORDER BY created_at DESC LIMIT $' +
        (params.length + 1) +
        ' OFFSET $' +
        (params.length + 2);
      params.push(limit, offset);

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get single post with author details
  async getPost(req, res) {
    try {
      const result = await pool.query(
        `SELECT p.*, u.name as author_name, u.image as author_image 
         FROM posts p 
         JOIN users u ON p.author_user_id = u.id 
         WHERE p.id = $1 AND p.status = 'published'`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update post
  async updatePost(req, res) {
    try {
      const { title, category, description, tags, image, status } = req.body;
      const postId = req.params.id;
      const userId = req.user.id;

      // Check if user is author or moderator
      const postCheck = await pool.query(
        'SELECT * FROM posts WHERE id = $1 AND (author_user_id = $2 OR $2 = ANY(moderators))',
        [postId, userId]
      );

      if (postCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: 'Not authorized to update this post' });
      }

      const result = await pool.query(
        `UPDATE posts 
         SET title = COALESCE($1, title),
             category = COALESCE($2, category),
             description = COALESCE($3, description),
             tags = COALESCE($4, tags),
             image = COALESCE($5, image),
             status = COALESCE($6, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [title, category, description, tags, image, status, postId]
      );

      res.json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = postController;
