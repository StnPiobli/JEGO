const express = require('express');
const router = express.Router();
const { televerserPhoto, supprimerPhoto, contacterSupport, inscription, connexion, connexionGoogle, mesNotifications,
  monPortefeuille,
  recupererBillet,
  deconnexion, marquerNotificationsLues, supprimerNotifications, demanderReinitialisation, reinitialiserMotDePasse, monProfil, modifierProfil, changerMotDePasse, historiqueVoyages } = require('../controllers/voyageurController');
const { authentifier } = require('../middleware/auth');
const { limiteConnexion, limiteMotDePasse, limiteCodeReinit, limiteContact, limiteRecuperationBillet } = require('../middleware/limiteur');

router.post('/inscription', inscription);
router.post('/connexion', limiteConnexion, connexion);

// Écran « Nous contacter » : connexion non obligatoire
router.post('/contact', limiteContact, contacterSupport);

// Photo de profil, gardée par le serveur
router.post('/photo', authentifier, televerserPhoto);
router.delete('/photo', authentifier, supprimerPhoto);
// Connexion par compte Google. Le corps porte le jeton d'identité, et
// le téléphone au second appel lorsque le compte reste à créer.
router.post('/connexion-google', limiteConnexion, connexionGoogle);
// Mot de passe oublié : demande d'un code, puis nouveau mot de passe.
router.post('/mot-de-passe/demande', limiteMotDePasse, demanderReinitialisation);
router.post('/mot-de-passe/reinitialiser', limiteCodeReinit, reinitialiserMotDePasse);
router.get('/profil', authentifier, monProfil);
router.put('/profil', authentifier, modifierProfil);
// Changement de mot de passe par une personne deja connectee :
// l'ancien mot de passe est verifie cote serveur.
router.put('/mot-de-passe', authentifier, changerMotDePasse);
router.get('/historique', authentifier, historiqueVoyages);

// Notifications du voyageur : lecture, marquage comme lues, suppression.
// Recuperation d'un billet sur un autre appareil : publique, par le
// seul numero (imprevisible). Les essais rates sont limites.
router.post('/billets/recuperer', limiteRecuperationBillet, recupererBillet);
router.get('/portefeuille', authentifier, monPortefeuille);
router.post('/deconnexion', authentifier, deconnexion);
router.get('/notifications', authentifier, mesNotifications);
router.put('/notifications/lues', authentifier, marquerNotificationsLues);
router.put('/notifications/:id/lue', authentifier, marquerNotificationsLues);
router.delete('/notifications/:id', authentifier, supprimerNotifications);
router.delete('/notifications', authentifier, supprimerNotifications);

module.exports = router;