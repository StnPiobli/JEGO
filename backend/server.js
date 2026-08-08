const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const { demarrerNettoyageVerrous } = require('./jobs/nettoyageVerrous');
const { demarrerVersementEscrow } = require('./jobs/versementEscrow');

const app = express();

// Middleware
app.use(cors());
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
app.use('/api/groupes', require('./routes/groupeRoutes'));
const { demarrerAlerteProgrammation } = require('./jobs/alerteProgrammation');

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API JEGO opérationnelle 🚀' });
});

// Route de test base de données
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM voyageurs');
    res.json({
      message: 'Connexion base de données réussie',
      voyageurs: result.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur JEGO démarré sur le port ${PORT}`);
  demarrerNettoyageVerrous();
  demarrerVersementEscrow();
  demarrerAlerteProgrammation();
});