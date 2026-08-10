-- ═══════════════════════════════════════════════════════════════
-- MIGRATION — ARRIVÉES PAR ARRÊT INTERMÉDIAIRE
-- 2026-08-08
--
-- Sur une ligne multi-arrêts (Douala -> Loum -> Yaoundé), un passager
-- qui descend à Loum a terminé son voyage bien avant le terminus.
-- Jusqu'ici, seule l'arrivée finale était déclarée : ce passager
-- restait en attente et son escrow ne se libérait qu'au terminus.
--
-- Le chauffeur déclare désormais son passage à CHAQUE point de la
-- ligne. Conséquences pour chaque arrêt déclaré :
--   - les billets qui se terminent à ce point passent en 'utilise'
--   - le retard est calculé sur CE tronçon, pas sur le trajet entier
--   - le seuil de signalement collectif s'apprécie sur les seuls
--     passagers descendus à cet arrêt
--
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS arrivees_arrets (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trajet_id         UUID NOT NULL REFERENCES trajets(id) ON DELETE CASCADE,
  ordre             INTEGER NOT NULL,
  ville             VARCHAR(50) NOT NULL REFERENCES villes(code),
  -- Heure promise à ce point (renseignée à la publication du trajet
  -- si l'agence l'a précisée, sinon NULL = pas de barème de retard
  -- applicable sur ce tronçon).
  heure_promise     TIME,
  heure_reelle      TIMESTAMP NOT NULL DEFAULT NOW(),
  retard_minutes    INTEGER DEFAULT 0,
  declare_par       UUID REFERENCES chauffeurs(id),
  billets_termines  INTEGER DEFAULT 0,
  cree_le           TIMESTAMP DEFAULT NOW(),
  -- Un arrêt ne se déclare qu'une fois
  UNIQUE (trajet_id, ordre)
);
CREATE INDEX IF NOT EXISTS idx_arrivees_arrets_trajet ON arrivees_arrets(trajet_id);

-- Heure de passage prévue à chaque point de la ligne. Permet de
-- calculer un retard par tronçon et d'afficher au voyageur une heure
-- d'arrivée réaliste à SON point de descente, plutôt que celle du
-- terminus.
ALTER TABLE ligne_points
  ADD COLUMN IF NOT EXISTS heure_passage_prevue TIME;

-- Le signalement collectif s'apprécie par tronçon : on mémorise à
-- quel arrêt se rapporte un signalement pour que le seuil ne soit pas
-- dilué par des passagers qui n'étaient pas concernés.
ALTER TABLE signalements
  ADD COLUMN IF NOT EXISTS ordre_arret INTEGER;
