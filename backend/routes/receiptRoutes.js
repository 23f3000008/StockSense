const express = require('express');
const router = express.Router();
const {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  updateReceiptStatus,
  validateReceipt,
  deleteReceipt,
} = require('../controllers/receiptController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getReceipts)
  .post(protect, createReceipt);

router.route('/:id')
  .get(protect, getReceiptById)
  .put(protect, updateReceipt)
  .delete(protect, deleteReceipt);

router.route('/:id/status')
  .patch(protect, updateReceiptStatus);

router.route('/:id/validate')
  .post(protect, validateReceipt);

module.exports = router;
