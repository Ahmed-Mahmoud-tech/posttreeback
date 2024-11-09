const pool = require('../config/database');
const WebSocketService = require('./websocketService');

class NotificationService {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
  }

  async createNotification(authorId, toUserId, content, type, relatedId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create notification in database
      const result = await client.query(
        `INSERT INTO notifications 
        (author_user_id, to_user_id, content, type, related_id) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`,
        [authorId, toUserId, content, type, relatedId]
      );

      // Send real-time notification
      this.webSocketService.sendNotification(toUserId, {
        type: 'notification',
        data: result.rows[0],
      });

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND to_user_id = $2 RETURNING *',
        [notificationId, userId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getUserNotifications(userId) {
    try {
      const result = await pool.query(
        `SELECT n.*, u.name as author_name, u.image as author_image
         FROM notifications n
         JOIN users u ON n.author_user_id = u.id
         WHERE n.to_user_id = $1
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = NotificationService;
