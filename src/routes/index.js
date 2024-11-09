const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const friendController = require('../controllers/friendController');
const ratingController = require('../controllers/ratingController');
const auth = require('../middleware/auth');
const donationController = require('../controllers/donationController');
const searchController = require('../controllers/searchController');
const uploadController = require('../controllers/uploadController');
const subscriptionController = require('../controllers/subscriptionController');
const viewController = require('../controllers/viewController');

// Like routes
router.post('/likes', auth, likeController.toggleLike);
router.get('/likes/:like_on', likeController.getLikes);

// Friend routes
router.post('/friends/request', auth, friendController.sendRequest);
router.put('/friends/request', auth, friendController.handleRequest);

// Rating routes
router.post('/ratings', auth, ratingController.ratePost);
router.get('/ratings/:post_id', ratingController.getPostRatings);

// Donation routes
router.post('/donations/intent', auth, donationController.createDonationIntent);
router.post('/donations/complete', auth, donationController.completeDonation);
router.get('/donations/history', auth, donationController.getDonationHistory);

// Search routes
router.get('/search/posts', searchController.searchPosts);

// Upload routes
router.post(
  '/upload',
  auth,
  uploadController.uploadImage,
  uploadController.handleUpload
);
router.delete('/upload/:key', auth, uploadController.deleteImage);

// Subscription routes
router.post('/subscribe', auth, subscriptionController.subscribe);
router.delete('/subscribe/:post_id', auth, subscriptionController.unsubscribe);
router.get('/subscriptions', auth, subscriptionController.getSubscriptions);

// View tracking routes
router.post('/views/:post_id', auth, viewController.trackView);
router.get('/views/:post_id/stats', auth, viewController.getViewStats);

module.exports = router;
