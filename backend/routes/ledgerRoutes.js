const express = require('express');
const router = express.Router();
const { getStockLedger } = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getStockLedger);

module.exports = router;
