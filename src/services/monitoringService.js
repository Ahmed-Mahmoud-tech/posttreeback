const prometheus = require('prom-client');
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Prometheus metrics
const metrics = {
  httpRequestDuration: new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
  }),

  activeUsers: new prometheus.Gauge({
    name: 'active_users_total',
    help: 'Total number of active users',
  }),

  totalPosts: new prometheus.Gauge({
    name: 'posts_total',
    help: 'Total number of posts',
  }),
};

// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new ElasticsearchTransport({
      level: 'info',
      index: 'logs',
      clientOpts: { node: process.env.ELASTICSEARCH_URL },
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = { metrics, logger };
