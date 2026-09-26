const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  validateDelivery,
} = require('../controllers/deliveryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getDeliveries)
  .post(protect, createDelivery);

router.route('/:id')
  .get(protect, getDeliveryById);

router.route('/:id/validate')
  .post(protect, validateDelivery);

module.exports = router;
