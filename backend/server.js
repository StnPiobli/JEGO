const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/voyageurs', require('./routes/voyageurRoutes'));
app.use('/api/agences', require('./routes/agenceRoutes'));
app.use('/api/bus', require('./routes/busRoutes'));

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
});