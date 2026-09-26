const express = require('express');
const router = express.Router();
const {
  getTransfers,
  getTransferById,
  createTransfer,
  validateTransfer,
} = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTransfers)
  .post(protect, createTransfer);

router.route('/:id')
  .get(protect, getTransferById);

router.route('/:id/validate')
  .post(protect, validateTransfer);

module.exports = router;
