const express = require('express');
const router = express.Router();
const {
  getReceipts,
  getReceiptById,
  createReceipt,
  validateReceipt,
} = require('../controllers/receiptController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getReceipts)
  .post(protect, createReceipt);

router.route('/:id')
  .get(protect, getReceiptById);

router.route('/:id/validate')
  .post(protect, validateReceipt);

module.exports = router;
