const Queue = require('bull');
const emailService = require('./emailService');
const analyticsService = require('./analyticsService');
const { pool } = require('../config/database');

// Create queues
const emailQueue = new Queue('email-queue', process.env.REDIS_URL);
const analyticsQueue = new Queue('analytics-queue', process.env.REDIS_URL);
const cleanupQueue = new Queue('cleanup-queue', process.env.REDIS_URL);

// Process email queue
emailQueue.process(async job => {
  const { to, subject, template, data } = job.data;
  await emailService.sendEmail(to, subject, template, data);
});

// Process analytics queue
analyticsQueue.process(async job => {
  const { userId, action, metadata } = job.data;
  await analyticsService.trackActivity(userId, action, metadata);
});

// Process cleanup queue
cleanupQueue.process(async job => {
  const { days } = job.data;
  const date = new Date();
  date.setDate(date.getDate() - days);

  await Promise.all([
    // Clean old notifications
    pool.query('DELETE FROM notifications WHERE created_at < $1', [date]),
    // Clean old analytics data
    pool.query('DELETE FROM user_analytics WHERE created_at < $1', [date]),
    // Clean old view records
    pool.query('DELETE FROM views WHERE created_at < $1', [date]),
  ]);
});

// Schedule cleanup job to run daily
cleanupQueue.add(
  { days: 30 },
  {
    repeat: {
      cron: '0 0 * * *', // Run at midnight every day
    },
  }
);

module.exports = {
  emailQueue,
  analyticsQueue,
  cleanupQueue,
};
