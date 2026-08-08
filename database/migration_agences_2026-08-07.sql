-- ═══════════════════════════════════════════════════
-- MIGRATION — Espace Agences (admin)
-- 2026-08-07
--   1. Documents téléversés par les agences
--   2. Demandes de pièces envoyées par l'admin
--   3. Traçabilité de la désactivation d'une agence
-- ═══════════════════════════════════════════════════

-- 1. Documents envoyés par l'agence (registre de commerce, assurance, etc.)
--    Le fichier lui-même est stocké sur le disque du serveur (dossier
--    backend/uploads/agences/), la base ne garde que sa référence.
CREATE TABLE IF NOT EXISTS documents_agence (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id      UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  type_document  VARCHAR(80) NOT NULL,
  nom_fichier    VARCHAR(255) NOT NULL,   -- nom d'origine, affiché à l'admin
  fichier_stocke VARCHAR(255) NOT NULL,   -- nom réel sur le disque (aléatoire)
  taille_octets  INTEGER NOT NULL,
  type_mime      VARCHAR(100) NOT NULL,
  statut         VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                   'en_attente', 'verifie', 'refuse'
                 )),
  verifie_par    UUID REFERENCES membres_admin(id),
  verifie_le     TIMESTAMP,
  televerse_le   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_agence ON documents_agence(agence_id);

-- 2. Demandes de pièces : l'admin réclame des documents, l'agence les
--    téléverse depuis son espace. La demande reste ouverte tant que
--    l'admin ne l'a pas close.
CREATE TABLE IF NOT EXISTS demandes_pieces (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id    UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  pieces       TEXT NOT NULL,
  statut       VARCHAR(20) DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'close')),
  demande_par  UUID REFERENCES membres_admin(id),
  cree_le      TIMESTAMP DEFAULT NOW(),
  close_le     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_demandes_pieces_agence ON demandes_pieces(agence_id);

-- 3. Traçabilité de la désactivation. Le statut 'suspendu' distingue une
--    agence désactivée par l'admin d'une agence refusée à l'inscription :
--    les deux ne doivent pas être traitées pareil.
ALTER TABLE agences
  ADD COLUMN IF NOT EXISTS desactivee_le        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS motif_desactivation  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS desactivee_par       UUID REFERENCES membres_admin(id);

-- Le CHECK sur agences.statut, s'il existe, doit accepter 'suspendu'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agences_statut_check' AND conrelid = 'agences'::regclass
  ) THEN
    ALTER TABLE agences DROP CONSTRAINT agences_statut_check;
  END IF;
END $$;

ALTER TABLE agences ADD CONSTRAINT agences_statut_check
  CHECK (statut IN ('en_attente', 'actif', 'refuse', 'suspendu'));

-- 4. Motif du remboursement : la désactivation d'une agence est une cause
--    distincte d'une annulation ponctuelle de trajet.
ALTER TABLE remboursements DROP CONSTRAINT IF EXISTS remboursements_motif_check;
ALTER TABLE remboursements ADD CONSTRAINT remboursements_motif_check
  CHECK (motif IN (
    'annulation_agence', 'retard_excessif', 'billet_flexible',
    'litige', 'manuel', 'agence_desactivee'
  ));
