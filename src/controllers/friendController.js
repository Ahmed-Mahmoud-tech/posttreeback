const pool = require('../config/database');

const friendController = {
  // Send friend request
  async sendRequest(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { to_user_id } = req.body;
      const from_user_id = req.user.id;

      // Check if request already exists
      const existingRequest = await client.query(
        'SELECT * FROM friend_requests WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)',
        [from_user_id, to_user_id]
      );

      if (existingRequest.rows.length > 0) {
        throw new Error('Friend request already exists');
      }

      const result = await client.query(
        'INSERT INTO friend_requests (from_user_id, to_user_id) VALUES ($1, $2) RETURNING *',
        [from_user_id, to_user_id]
      );

      // Create notification
      await client.query(
        'INSERT INTO notifications (author_user_id, to_user_id, content) VALUES ($1, $2, $3)',
        [from_user_id, to_user_id, 'You have a new friend request']
      );

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },

  // Handle friend request (accept/reject)
  async handleRequest(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { request_id, status } = req.body; // status: 'accept' or 'reject'
      const user_id = req.user.id;

      const request = await client.query(
        'SELECT * FROM friend_requests WHERE id = $1 AND to_user_id = $2',
        [request_id, user_id]
      );

      if (request.rows.length === 0) {
        throw new Error('Friend request not found');
      }

      // Update request status
      await client.query(
        'UPDATE friend_requests SET status = $1 WHERE id = $2',
        [status, request_id]
      );

      if (status === 'accept') {
        // Add to friends array for both users
        await client.query(
          'UPDATE users SET friends = array_append(friends, $1) WHERE id = $2',
          [request.rows[0].from_user_id, user_id]
        );
        await client.query(
          'UPDATE users SET friends = array_append(friends, $1) WHERE id = $2',
          [user_id, request.rows[0].from_user_id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: `Friend request ${status}ed` });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },
};

module.exports = friendController;
