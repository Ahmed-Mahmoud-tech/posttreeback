const { metrics, logger } = require('./monitoringService');
const { redis } = require('../config/redis');

class PerformanceMonitor {
  async analyzePerformance() {
    try {
      // Analyze response times
      const slowestEndpoints = await redis.zrevrange(
        'response_times',
        0,
        9,
        'WITHSCORES'
      );

      // Analyze cache hit rates
      const cacheStats = await this.analyzeCachePerformance();

      // Analyze database query times
      const queryStats = await this.analyzeQueryPerformance();

      // Log performance metrics
      logger.info('Performance Analysis', {
        slowestEndpoints,
        cacheStats,
        queryStats,
      });

      // Update Prometheus metrics
      metrics.responseTime.set(queryStats.averageQueryTime);
      metrics.cacheHitRate.set(cacheStats.hitRate);
    } catch (error) {
      logger.error('Performance analysis error:', error);
    }
  }

  async analyzeCachePerformance() {
    const hits = parseInt(await redis.get('cache:hits')) || 0;
    const misses = parseInt(await redis.get('cache:misses')) || 0;
    const total = hits + misses;

    return {
      hits,
      misses,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
    };
  }

  async analyzeQueryPerformance() {
    // Implementation depends on your database monitoring setup
  }
}

module.exports = new PerformanceMonitor();
