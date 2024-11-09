const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const WebSocketService = require('./services/websocketService');
const NotificationService = require('./services/notificationService');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const rateLimiter = require('./middleware/rateLimiter');
const securityMiddleware = require('./middleware/security');
const { metrics, logger } = require('./services/monitoringService');
const prometheus = require('prom-client');

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes/index');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Initialize Notification service
const notificationService = new NotificationService(webSocketService);

// Make services available to routes
app.set('webSocketService', webSocketService);
app.set('notificationService', notificationService);

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting for all routes
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.cors);
app.use(securityMiddleware.rateLimiter);
app.use(securityMiddleware.hpp);
app.use(securityMiddleware.xss);
app.use(securityMiddleware.customSecurity);

// Monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode,
      },
      duration / 1000
    );
  });
  next();
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

// Routes
app.use('/api', apiRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
