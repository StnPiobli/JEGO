-- ═══════════════════════════════════════════════════════════════
-- SOLDE JEGO RÉUTILISABLE
--
-- Un remboursement ne repart plus sur Mobile Money : il crédite le
-- solde du voyageur, qui le dépense sur un prochain billet.
--
-- Le solde reste un registre, jamais un nombre stocké :
--   crédits = remboursements traités (table existante)
--   débits  = utilisations_portefeuille (ci-dessous)
-- Deux écritures concurrentes ne peuvent donc pas le faire dériver.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS utilisations_portefeuille (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  voyageur_id UUID NOT NULL REFERENCES voyageurs(id),
  billet_id   UUID NOT NULL UNIQUE REFERENCES billets(id),
  montant     INTEGER NOT NULL CHECK (montant > 0),
  cree_le     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utilisations_portefeuille_voyageur
  ON utilisations_portefeuille (voyageur_id);

-- Part du prix réglée avec le solde. prix_total_client reste le prix
-- complet payé : un remboursement futur recrédite donc tout le billet.
ALTER TABLE billets
  ADD COLUMN IF NOT EXISTS montant_portefeuille INTEGER NOT NULL DEFAULT 0;

-- Billet payé entièrement avec le solde : aucun opérateur Mobile Money.
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_operateur_check;
ALTER TABLE paiements ADD CONSTRAINT paiements_operateur_check
  CHECK (operateur IN ('mtn_momo', 'orange_money', 'especes', 'portefeuille'));

-- Remboursements restés « en attente » de l'ancien circuit, où ils
-- attendaient un virement Mobile Money. Un crédit sur le solde est
-- immédiat : ils sont traités maintenant, sinon l'historique les montre
-- sans que le solde les compte.
UPDATE remboursements
   SET statut = 'traite', traite_le = COALESCE(traite_le, NOW())
 WHERE statut = 'en_attente';
