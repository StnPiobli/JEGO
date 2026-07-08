const express = require('express');
const router = express.Router();
const { monHorizon } = require('../controllers/programmationController');
const { authentifier } = require('../middleware/auth');

router.get('/mon-horizon', authentifier, monHorizon);

module.exports = router;