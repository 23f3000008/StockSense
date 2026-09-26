const express = require('express');
const router = express.Router();
const { getDashboardKPIs } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/kpis', protect, getDashboardKPIs);

module.exports = router;
