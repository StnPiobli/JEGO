-- ═══════════════════════════════════════════════════════════════
-- MIGRATION DE CONSOLIDATION — 2026-08-08
-- Le code (controllers) référence déjà toutes ces tables/colonnes ;
-- cette migration aligne la base dessus. Reconstruite par audit du
-- code, car les migrations locales correspondantes n'avaient pas
-- été committées dans le repo. Idempotente (IF NOT EXISTS partout).
--
--   1. Lignes multi-arrêts (ligne_points, ligne_troncon_prix)
--   2. Segments sur billets / soft_locks (point_embarquement_ordre,
--      point_debarquement_ordre) + contraintes d'exclusion overlap
--   3. Idempotence paiement (requetes_idempotentes)
--   4. Litiges → effet automatique sur l'escrow (colonne gagnant)
--   5. Vente guichet (voyageurs nullable + cree_par_guichet, especes)
--   6. Divers : versement_escrow_le, destinataire_email, avis agence
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── 1. LIGNES MULTI-ARRÊTS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS ligne_points (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ligne_id              UUID NOT NULL REFERENCES lignes(id) ON DELETE CASCADE,
  ville                 VARCHAR(50) NOT NULL REFERENCES villes(code),
  ordre                 INTEGER NOT NULL,
  lieu_prise_en_charge  VARCHAR(255),
  UNIQUE (ligne_id, ordre)
);
CREATE INDEX IF NOT EXISTS idx_ligne_points_ligne ON ligne_points(ligne_id);

CREATE TABLE IF NOT EXISTS ligne_troncon_prix (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ligne_id      UUID NOT NULL REFERENCES lignes(id) ON DELETE CASCADE,
  ordre_depart  INTEGER NOT NULL,
  ordre_arrivee INTEGER NOT NULL,
  prix          INTEGER NOT NULL CHECK (prix > 0),
  UNIQUE (ligne_id, ordre_depart, ordre_arrivee),
  CHECK (ordre_arrivee > ordre_depart)
);
CREATE INDEX IF NOT EXISTS idx_ligne_troncon_prix_ligne ON ligne_troncon_prix(ligne_id);

-- distance_km : conservée en base pour compat mais plus utilisée par le
-- code (recherche par tronçon désormais) -- on la laisse, nullable déjà.

-- ─── 2. SEGMENTS SUR BILLETS / SOFT_LOCKS ─────────────────────────

ALTER TABLE billets
  ADD COLUMN IF NOT EXISTS point_embarquement_ordre INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS point_debarquement_ordre INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS destinataire_email        VARCHAR(150);

ALTER TABLE soft_locks
  ADD COLUMN IF NOT EXISTS point_embarquement_ordre INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS point_debarquement_ordre INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prolongations            INTEGER NOT NULL DEFAULT 0;

-- L'ancienne contrainte UNIQUE(siege_id, trajet_id) empêchait deux
-- verrous sur des segments non-chevauchants du même siège -- on la
-- remplace par une exclusion sur le chevauchement réel de segment.
ALTER TABLE soft_locks DROP CONSTRAINT IF EXISTS soft_locks_siege_id_trajet_id_key;
ALTER TABLE soft_locks DROP CONSTRAINT IF EXISTS soft_locks_overlap_excl;
ALTER TABLE soft_locks ADD CONSTRAINT soft_locks_overlap_excl
  EXCLUDE USING gist (
    siege_id WITH =,
    trajet_id WITH =,
    int4range(point_embarquement_ordre, point_debarquement_ordre) WITH &&
  ) WHERE (actif);

-- Filet de sécurité au niveau base, en plus de la vérification
-- applicative déjà faite dans payer()/venteGuichet() : deux billets
-- confirmés ne peuvent pas se chevaucher sur le même siège/trajet.
ALTER TABLE billets DROP CONSTRAINT IF EXISTS billets_overlap_excl;
ALTER TABLE billets ADD CONSTRAINT billets_overlap_excl
  EXCLUDE USING gist (
    siege_id WITH =,
    trajet_id WITH =,
    int4range(point_embarquement_ordre, point_debarquement_ordre) WITH &&
  ) WHERE (statut = 'confirme');

-- ─── 3. IDEMPOTENCE PAIEMENT ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS requetes_idempotentes (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cle          VARCHAR(100) NOT NULL UNIQUE,
  voyageur_id  UUID REFERENCES voyageurs(id),
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'termine')),
  reponse      JSONB,
  cree_le      TIMESTAMP DEFAULT NOW()
);

-- ─── 4. LITIGES → EFFET AUTOMATIQUE SUR L'ESCROW ──────────────────

ALTER TABLE litiges
  ADD COLUMN IF NOT EXISTS gagnant VARCHAR(20) CHECK (gagnant IN ('voyageur', 'agence'));

-- ─── 5. VENTE GUICHET ──────────────────────────────────────────────

-- Le guichet crée un compte "fantôme" sans email/date/lieu de naissance.
ALTER TABLE voyageurs ALTER COLUMN email          DROP NOT NULL;
ALTER TABLE voyageurs ALTER COLUMN date_naissance DROP NOT NULL;
ALTER TABLE voyageurs ALTER COLUMN lieu_naissance DROP NOT NULL;
ALTER TABLE voyageurs
  ADD COLUMN IF NOT EXISTS cree_par_guichet BOOLEAN NOT NULL DEFAULT FALSE;

-- Un compte fantôme n'a pas d'email -> la contrainte UNIQUE sur une
-- colonne nullable autorise déjà plusieurs NULL, donc rien à changer
-- côté contrainte ; seule la colonne devait devenir nullable.

ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_operateur_check;
ALTER TABLE paiements ADD CONSTRAINT paiements_operateur_check
  CHECK (operateur IN ('mtn_momo', 'orange_money', 'especes'));

-- ─── 6. DIVERS ─────────────────────────────────────────────────────

ALTER TABLE trajets
  ADD COLUMN IF NOT EXISTS versement_escrow_le TIMESTAMP,
  -- heure promise au client à la publication : sert de référence au
  -- barème de retard, qui compare l'arrivée réelle à l'heure INITIALE
  -- et non à l'heure éventuellement révisée par l'agence en route.
  ADD COLUMN IF NOT EXISTS heure_arrivee_initiale TIME;

UPDATE trajets SET heure_arrivee_initiale = heure_arrivee_estimee
WHERE heure_arrivee_initiale IS NULL;

ALTER TABLE agences
  ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nombre_avis  INTEGER DEFAULT 0;

-- Rétrocompatibilité : pour toute ligne déjà existante (créée avant
-- cette migration, sans points/troncons), on génère automatiquement
-- ses 2 points (départ/arrivée) et son tronçon prix_base, pour que la
-- recherche continue de fonctionner exactement comme avant.
INSERT INTO ligne_points (ligne_id, ville, ordre, lieu_prise_en_charge)
SELECT l.id, l.ville_depart, 0, NULL
FROM lignes l
WHERE NOT EXISTS (SELECT 1 FROM ligne_points lp WHERE lp.ligne_id = l.id);

INSERT INTO ligne_points (ligne_id, ville, ordre, lieu_prise_en_charge)
SELECT l.id, l.ville_arrivee, 1, NULL
FROM lignes l
WHERE (SELECT COUNT(*) FROM ligne_points lp WHERE lp.ligne_id = l.id) = 1;

INSERT INTO ligne_troncon_prix (ligne_id, ordre_depart, ordre_arrivee, prix)
SELECT DISTINCT l.id, 0, 1, t.prix_base
FROM lignes l
JOIN trajets t ON t.ligne_id = l.id
WHERE NOT EXISTS (SELECT 1 FROM ligne_troncon_prix ltp WHERE ltp.ligne_id = l.id)
ON CONFLICT (ligne_id, ordre_depart, ordre_arrivee) DO NOTHING;
