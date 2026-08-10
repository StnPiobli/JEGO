const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const EMAIL = 'contact@touristique.cm';
const MOT_DE_PASSE = 'Agence1234';

(async () => {
  const hash = await bcrypt.hash(MOT_DE_PASSE, 10);
  const r = await pool.query(
    'UPDATE agences SET mot_de_passe = $1 WHERE email = $2',
    [hash, EMAIL]
  );
  console.log('Lignes mises a jour :', r.rowCount);
  const check = await pool.query('SELECT mot_de_passe FROM agences WHERE email = $1', [EMAIL]);
  console.log('Verification :', await bcrypt.compare(MOT_DE_PASSE, check.rows[0].mot_de_passe));
  await pool.end();
})();
