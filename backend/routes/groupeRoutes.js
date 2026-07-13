const express = require('express');
const router = express.Router();
const { reserverGroupe } = require('../controllers/groupeController');
const { authentifier } = require('../middleware/auth');

router.post('/', authentifier, reserverGroupe);

module.exports = router;