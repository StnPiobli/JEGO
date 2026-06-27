const express = require('express');
const router = express.Router();
const { autocompletion } = require('../controllers/villeController');

// Route PUBLIQUE - le client cherche une ville sans être connecté
router.get('/autocompletion', autocompletion);

module.exports = router;