const express = require('express');
const router = express.Router();
const { televerserPhoto, supprimerPhoto, contacterSupport, inscription, connexion, connexionGoogle, mesNotifications,
  monPortefeuille,
  recupererBillet,
  deconnexion, marquerNotificationsLues, supprimerNotifications, demanderReinitialisation, reinitialiserMotDePasse, monProfil, modifierProfil, changerMotDePasse, historiqueVoyages } = require('../controllers/voyageurController');
const { authentifier } = require('../middleware/auth');

router.post('/inscription', inscription);
router.post('/connexion', connexion);

// Écran « Nous contacter » : connexion non obligatoire
router.post('/contact', contacterSupport);

// Photo de profil, gardée par le serveur
router.post('/photo', authentifier, televerserPhoto);
router.delete('/photo', authentifier, supprimerPhoto);
// Connexion par compte Google. Le corps porte le jeton d'identité, et
// le téléphone au second appel lorsque le compte reste à créer.
router.post('/connexion-google', connexionGoogle);
// Mot de passe oublié : demande d'un code, puis nouveau mot de passe.
router.post('/mot-de-passe/demande', demanderReinitialisation);
router.post('/mot-de-passe/reinitialiser', reinitialiserMotDePasse);
router.get('/profil', authentifier, monProfil);
router.put('/profil', authentifier, modifierProfil);
// Changement de mot de passe par une personne deja connectee :
// l'ancien mot de passe est verifie cote serveur.
router.put('/mot-de-passe', authentifier, changerMotDePasse);
router.get('/historique', authentifier, historiqueVoyages);

// Notifications du voyageur : lecture, marquage comme lues, suppression.
// Recuperation d'un billet sur un autre appareil : publique, la
// preuve est le couple numero + telephone du compte.
router.post('/billets/recuperer', recupererBillet);
router.get('/portefeuille', authentifier, monPortefeuille);
router.post('/deconnexion', authentifier, deconnexion);
router.get('/notifications', authentifier, mesNotifications);
router.put('/notifications/lues', authentifier, marquerNotificationsLues);
router.put('/notifications/:id/lue', authentifier, marquerNotificationsLues);
router.delete('/notifications/:id', authentifier, supprimerNotifications);
router.delete('/notifications', authentifier, supprimerNotifications);

module.exports = router;