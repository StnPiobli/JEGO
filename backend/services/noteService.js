const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : NOTES DES AGENCES ET DES CHAUFFEURS
// La note d'une agence (et son nombre d'avis) est gardée sur sa fiche
// pour ne pas recompter à chaque recherche. Elle doit donc être
// recalculée à CHAQUE changement des avis : nouvel avis, mais aussi
// avis retiré ou rétabli par la modération. Sans cela, une agence
// affichait 4.0 sur 1 avis alors qu'elle en avait 3, à 3.3 de moyenne.
// ═══════════════════════════════════════════════════
async function recalculerNotes({ agenceId, chauffeurId }, client = pool) {
  if (agenceId) {
    await client.query(
      `UPDATE agences SET
         note_moyenne = (SELECT ROUND(AVG(note_globale), 2) FROM avis
                          WHERE agence_id = $1 AND statut = 'visible'),
         nombre_avis = (SELECT COUNT(*) FROM avis
                         WHERE agence_id = $1 AND statut = 'visible')
       WHERE id = $1`,
      [agenceId]
    );
  }
  if (chauffeurId) {
    // La note du chauffeur est celle de la conduite.
    await client.query(
      `UPDATE chauffeurs SET
         note_moyenne = (SELECT ROUND(AVG(note_conduite), 2) FROM avis
                          WHERE chauffeur_id = $1 AND statut = 'visible')
       WHERE id = $1`,
      [chauffeurId]
    );
  }
}

module.exports = { recalculerNotes };
