const analyticsService = require('../services/analyticsService');
const { cache } = require('../middleware/cache');

const analyticsController = {
  // Get user analytics
  async getUserAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const analytics = await analyticsService.getUserEngagement(
        userId,
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
        endDate || new Date()
      );

      res.json(analytics);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get post analytics
  async getPostAnalytics(req, res) {
    try {
      const { postId } = req.params;
      const { startDate, endDate } = req.query;

      const analytics = await analyticsService.getPostAnalytics(
        postId,
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date()
      );

      res.json(analytics);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = analyticsController;
