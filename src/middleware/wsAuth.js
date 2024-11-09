const jwt = require('jsonwebtoken');
const { logger } = require('../services/monitoringService');

class WebSocketSecurity {
  authenticate(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  rateLimit() {
    const connections = new Map();
    const MAX_CONNECTIONS_PER_IP = 5;
    const TIME_WINDOW = 60000; // 1 minute

    return (socket, next) => {
      const ip = socket.handshake.address;
      const currentTime = Date.now();

      if (!connections.has(ip)) {
        connections.set(ip, []);
      }

      const userConnections = connections.get(ip);
      const recentConnections = userConnections.filter(
        time => currentTime - time < TIME_WINDOW
      );

      if (recentConnections.length >= MAX_CONNECTIONS_PER_IP) {
        next(new Error('Too many connection attempts'));
        return;
      }

      recentConnections.push(currentTime);
      connections.set(ip, recentConnections);
      next();
    };
  }
}

module.exports = new WebSocketSecurity();
