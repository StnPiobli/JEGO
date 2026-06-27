const express = require('express');
const router = express.Router();
const { planTrajet } = require('../controllers/reservationController');

// Route PUBLIQUE - le voyageur consulte le plan avant de réserver
router.get('/trajets/:id/plan', planTrajet);

module.exports = router;