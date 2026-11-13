const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./config/secrets').verifierSecrets();

const { demarrerNettoyageVerrous } = require('./jobs/nettoyageVerrous');
const { demarrerVersementEscrow } = require('./jobs/versementEscrow');

const app = express();

// Derrière le proxy HTTPS / le tunnel Cloudflare, req.ip doit être la
// VRAIE adresse du visiteur. On ne croit l'en-tête X-Forwarded-For que
// s'il vient d'un relais de confiance (par défaut : cette machine même,
// où tournent le tunnel et le relais de l'appli web). Faire confiance à
// tout le monde laisserait chacun s'inventer une adresse, et contourner
// la limite des tentatives de connexion.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

// Qui peut appeler l'API depuis un navigateur. L'appli mobile installée
// n'est pas concernée (pas de navigateur, donc pas de contrôle CORS).
app.use(cors({ origin: require('./config/origines').origineAutorisee }));
app.disable('x-powered-by');

// Pièces jointes des messages et des litiges : réservées à l'agence
// concernée et à JEGO (avant, l'adresse seule suffisait pour les ouvrir).
const { authentifierFichier } = require('./middleware/auth');
const { servirPieceJointe } = require('./controllers/fichierController');
app.get('/uploads/messages/:nom', authentifierFichier, servirPieceJointe('messages'));
app.get('/uploads/litiges/:nom', authentifierFichier, servirPieceJointe('litiges'));
// Fichiers publics (logos d'agence) — pas les documents officiels,
// ceux-là restent servis via une route API authentifiée séparée.
app.use('/uploads/agences/logos', express.static(path.join(__dirname, 'uploads', 'agences', 'logos')));
app.use('/uploads/voyageurs/photos', express.static(path.join(__dirname, 'uploads', 'voyageurs', 'photos')));
// express.json() doit laisser passer les envois de fichiers : la route
// de téléversement lit le flux multipart brut elle-même.
app.use((req, res, next) => {
  if ((req.headers['content-type'] || '').startsWith('multipart/form-data')) return next();
  express.json()(req, res, next);
});
app.use('/api/voyageurs', require('./routes/voyageurRoutes'));
app.use('/api/agences', require('./routes/agenceRoutes'));
app.use('/api/bus', require('./routes/busRoutes'));
app.use('/api/lignes', require('./routes/ligneRoutes'));
app.use('/api/trajets', require('./routes/trajetRoutes'));
app.use('/api/recherche', require('./routes/rechercheRoutes'));
app.use('/api/villes', require('./routes/villeRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/annulations', require('./routes/annulationRoutes'));
app.use('/api/chauffeurs', require('./routes/chauffeurRoutes'));
app.use('/api/signalements', require('./routes/signalementRoutes'));
app.use('/api/avis', require('./routes/avisRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/programmation', require('./routes/programmationRoutes'));
app.use('/api/litiges', require('./routes/litigeRoutes'));
app.use('/api/rapports', require('./routes/rapportRoutes'));
app.use('/api/denonciations', require('./routes/denonciationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/parametres', require('./routes/parametreRoutes'));
const { demarrerAlerteProgrammation } = require('./jobs/alerteProgrammation');
const { demarrerEcheanceLitige } = require('./jobs/echeanceLitige');

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API JEGO opérationnelle 🚀' });
});


// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur JEGO démarré sur le port ${PORT}`);
  demarrerNettoyageVerrous();
  demarrerVersementEscrow();
  demarrerAlerteProgrammation();
  demarrerEcheanceLitige();
});