const express = require('express');
const router = express.Router();
const {
  listerMessagesAgence, envoyerMessageAgence, compterMessagesNonLusAgence,
  listerConversationsAdmin, voirConversationAdmin, envoyerMessageAdmin
} = require('../controllers/messageController');
const { authentifier } = require('../middleware/auth');

// Côté agence
router.get('/', authentifier, listerMessagesAgence);
router.get('/non-lus', authentifier, compterMessagesNonLusAgence);
router.post('/', authentifier, envoyerMessageAgence);

// Côté admin
router.get('/admin/conversations', authentifier, listerConversationsAdmin);
router.get('/admin/conversations/:agenceId', authentifier, voirConversationAdmin);
router.post('/admin/conversations/:agenceId', authentifier, envoyerMessageAdmin);

module.exports = router;
