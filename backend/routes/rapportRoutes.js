const express = require('express');
const router = express.Router();
const { rapportAgence, rapportJego } = require('../controllers/rapportController');
const { authentifier } = require('../middleware/auth');

router.get('/agence', authentifier, rapportAgence);
router.get('/jego', authentifier, rapportJego);

module.exports = router;