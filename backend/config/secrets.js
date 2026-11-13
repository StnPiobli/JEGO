// ═══════════════════════════════════════════════════
// SECRETS OBLIGATOIRES AU DÉMARRAGE
//
// JWT_SECRET signe les connexions, QR_SECRET signe les billets. Sans eux,
// ou avec une valeur trop courte, quelqu'un pourrait se fabriquer une
// connexion admin ou de faux QR. Le serveur refuse donc de démarrer
// plutôt que de tourner avec une valeur devinable.
// ═══════════════════════════════════════════════════
const LONGUEUR_MIN = 24;

function verifierSecrets() {
  const manquants = ['JWT_SECRET', 'QR_SECRET'].filter(
    (nom) => !process.env[nom] || process.env[nom].length < LONGUEUR_MIN
  );
  if (manquants.length === 0) return;
  console.error(
    `\n⛔ Démarrage refusé : ${manquants.join(' et ')} absent(s) ou trop court(s) dans backend/.env ` +
    `(${LONGUEUR_MIN} caractères minimum).\n` +
    `   Pour en générer un : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n`
  );
  process.exit(1);
}

module.exports = { verifierSecrets };
