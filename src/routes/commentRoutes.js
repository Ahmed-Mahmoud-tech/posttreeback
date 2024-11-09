const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

router.post('/', auth, commentController.createComment);
router.get('/post/:post_id', commentController.getComments);
router.put('/:id', auth, commentController.updateComment);

module.exports = router;
