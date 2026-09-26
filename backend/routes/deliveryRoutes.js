const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  validateDelivery,
  deleteDelivery,
} = require('../controllers/deliveryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getDeliveries)
  .post(protect, createDelivery);

router.route('/:id')
  .get(protect, getDeliveryById)
  .put(protect, updateDelivery)
  .delete(protect, deleteDelivery);

router.route('/:id/status')
  .patch(protect, updateDeliveryStatus);

router.route('/:id/validate')
  .post(protect, validateDelivery);

module.exports = router;
