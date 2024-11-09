const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map to store client connections

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  // Handle new WebSocket connections
  handleConnection(ws, req) {
    const token = req.url.split('token=')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // Store the connection
      this.clients.set(userId, ws);

      ws.on('close', () => {
        this.clients.delete(userId);
      });

      ws.on('error', error => {
        console.error('WebSocket error:', error);
        this.clients.delete(userId);
      });
    } catch (error) {
      ws.close();
    }
  }

  // Send notification to specific user
  sendNotification(userId, notification) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  }

  // Broadcast notification to multiple users
  broadcastNotification(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }
}

module.exports = WebSocketService;
