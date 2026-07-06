const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware');

// Apply auth middleware to all routes
router.use(protect);

// Get all notifications
router.get('/', notificationController.getNotifications);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Mark single notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
