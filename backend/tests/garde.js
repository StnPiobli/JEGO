// ═══════════════════════════════════════════════════
// GARDE-FOU AVANT LES TESTS (lancé en premier par `npm test`)
//
// Les tests créent de vrais comptes, trajets, billets et remboursements
// (adresses en @t.cm). Lancés par erreur sur la base de production, ils
// la pollueraient. On refuse donc de démarrer :
//   - si NODE_ENV vaut « production » ;
//   - si la base n'est pas dans la liste autorisée (TEST_BASES_AUTORISEES,
//     par défaut « jego,jego_test ») ;
//   - si l'API visée n'est pas sur cette machine (TEST_BASE_URL).
// ═══════════════════════════════════════════════════
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const base = process.env.DB_NAME || '';
const autorisees = (process.env.TEST_BASES_AUTORISEES || 'jego,jego_test')
  .split(',').map((b) => b.trim()).filter(Boolean);
const url = process.env.TEST_BASE_URL || 'http://localhost:3000';

const refus = [];
if (process.env.NODE_ENV === 'production') refus.push('NODE_ENV vaut « production »');
if (!autorisees.includes(base)) refus.push(`la base « ${base} » n'est pas une base de test autorisée (${autorisees.join(', ')})`);
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(url)) refus.push(`l'API visée (${url}) n'est pas sur cette machine`);

if (refus.length) {
  console.error('\n⛔ Tests refusés : ' + refus.join(' ; ') + '.');
  console.error('   Les tests écrivent de vraies données. Pour une autre base de test :');
  console.error('   TEST_BASES_AUTORISEES=ma_base_de_test npm test\n');
  process.exit(1);
}
console.log(`✅ Base de test : ${base} — API : ${url}`);
