const pool = require('../config/database');
const { genererIdentifiant } = require('../utils/identifiant');

// ═══════════════════════════════════════════════════
// SERVICE : SOLDE JEGO
// L'argent remboursé reste dans l'application : il crédite le solde
// du voyageur, qui le dépense sur un prochain billet. Il ne repart
// jamais sur Mobile Money.
//
// Le solde n'est stocké nulle part : c'est un registre.
//   crédits = remboursements traités, hors billets du guichet (ceux-là
//             sont rendus en espèces par l'agence)
//   débits  = utilisations_portefeuille
// ═══════════════════════════════════════════════════

// Solde disponible d'un voyageur. Passer `verrouiller` dans une
// transaction de paiement : la ligne du voyageur est verrouillée
// jusqu'au COMMIT, si bien que deux paiements simultanés ne peuvent
// pas dépenser le même argent.
//
// NO KEY UPDATE et non FOR UPDATE : le paiement a déjà posé un verrou de
// clé étrangère sur cette ligne (requetes_idempotentes -> voyageurs).
// FOR UPDATE entre en conflit avec lui et deux paiements simultanés
// finissaient en interblocage.
async function soldeDisponible(voyageurId, client = pool, { verrouiller = false } = {}) {
  if (verrouiller) {
    await client.query(`SELECT id FROM voyageurs WHERE id = $1 FOR NO KEY UPDATE`, [voyageurId]);
  }
  const r = await client.query(
    `SELECT
       COALESCE((SELECT SUM(r.montant) FROM remboursements r
                   JOIN billets b ON b.id = r.billet_id
                  WHERE r.voyageur_id = $1 AND r.statut = 'traite'
                    AND b.source_vente IS DISTINCT FROM 'physique'), 0)
     - COALESCE((SELECT SUM(montant) FROM utilisations_portefeuille
                  WHERE voyageur_id = $1), 0) AS solde`,
    [voyageurId]
  );
  return Number(r.rows[0].solde);
}

async function debiterSolde(voyageurId, billetId, montant, client) {
  await client.query(
    `INSERT INTO utilisations_portefeuille (voyageur_id, billet_id, montant)
     VALUES ($1, $2, $3)`,
    [voyageurId, billetId, montant]
  );
}

// À qui revient le remboursement d'un billet : à celui qui l'a payé,
// pas à son détenteur (un billet cadeau est crédité à l'acheteur).
// Renvoie null pour un billet vendu au guichet : le client a payé en
// espèces, l'agence le rembourse en espèces, rien ne passe par un solde.
async function beneficiaireRemboursement(billetId, client = pool) {
  const r = await client.query(
    `SELECT b.source_vente, b.voyageur_id,
            (SELECT p.voyageur_id FROM paiements p
              WHERE p.billet_id = b.id AND p.type = 'paiement'
              ORDER BY p.cree_le LIMIT 1) AS payeur_id
       FROM billets b WHERE b.id = $1`,
    [billetId]
  );
  const b = r.rows[0];
  if (!b || b.source_vente === 'physique') return null;
  return b.payeur_id || b.voyageur_id;
}

// Part JEGO d'un billet, toujours recalculée de la même façon :
//   payé par le client − frais Mobile Money − part de l'agence − remboursé
// Négative quand JEGO rembourse plus qu'il n'a gagné. Un billet du
// guichet ne rapporte rien à JEGO.
async function recalculerPartJego(billetId, client = pool) {
  await client.query(
    `UPDATE escrow e
        SET montant_jego = CASE
              WHEN b.source_vente = 'physique' THEN 0
              ELSE b.prix_total_client - e.frais_momo - e.montant_agence
                   - COALESCE((SELECT SUM(r.montant) FROM remboursements r
                                WHERE r.billet_id = b.id AND r.statut = 'traite'), 0)
            END
       FROM billets b
      WHERE b.id = e.billet_id AND e.billet_id = $1`,
    [billetId]
  );
}

// Rembourse un billet sur le solde JEGO de son acheteur.
//   pourcentage    part du prix payé à rendre (100 = tout)
//   agencePayee    vrai pour un billet flexible : l'agence garde sa part
//                  (CDC §16 « JEGO rembourse, agence déjà payée ») ; faux
//                  sinon : l'agence n'est pas versée.
// Jamais plus que ce qui a été payé : ce qui a déjà été remboursé sur le
// billet est déduit. Un billet du guichet n'est pas crédité (l'agence
// rend les espèces) ; `guichet` le signale à l'appelant.
async function rembourserBillet(billetId, { motif, pourcentage = 100, agencePayee = false }, client) {
  const r = await client.query(
    `SELECT b.prix_total_client, b.source_vente,
            COALESCE((SELECT SUM(montant) FROM remboursements
                       WHERE billet_id = b.id AND statut = 'traite'), 0)::int AS deja
       FROM billets b WHERE b.id = $1`,
    [billetId]
  );
  const b = r.rows[0];
  const reste = Math.max(0, b.prix_total_client - b.deja);
  const montant = Math.min(reste, Math.round(b.prix_total_client * pourcentage / 100));

  if (!agencePayee) {
    await client.query(
      `UPDATE escrow SET statut = 'rembourse', montant_agence = 0 WHERE billet_id = $1`,
      [billetId]
    );
  }

  const beneficiaire = await beneficiaireRemboursement(billetId, client);
  let reference = null;
  if (beneficiaire && montant > 0) {
    reference = genererIdentifiant('RMB');
    await client.query(
      `INSERT INTO remboursements
         (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
       VALUES ($1, $2, $3, $4, $5, 'traite', $6, NOW())`,
      [billetId, beneficiaire, montant, motif, pourcentage, reference]
    );
  }
  await recalculerPartJego(billetId, client);

  return {
    montant: beneficiaire ? montant : 0,
    beneficiaire,
    reference,
    guichet: !beneficiaire,
    montantGuichet: beneficiaire ? 0 : b.prix_total_client
  };
}

module.exports = { soldeDisponible, debiterSolde, beneficiaireRemboursement, rembourserBillet, recalculerPartJego };
