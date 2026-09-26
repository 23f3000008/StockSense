const express = require('express');
const router = express.Router();
const { getMoveHistory, createMove } = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMoveHistory)
  .post(protect, createMove);

module.exports = router;
