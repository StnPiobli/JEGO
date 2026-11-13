-- ═══════════════════════════════════════════════════
-- MIGRATION — Garde-fous en base (2026-11-13)
--
-- Le serveur vérifie déjà ces bornes (utils/bornes.js). La base les
-- impose aussi : si un jour un autre chemin écrit dans ces tables, un
-- prix de -5 000 FCFA ou un bus de 100 000 rangées reste impossible.
--
-- Idempotent : chaque contrainte n'est ajoutée que si elle manque.
-- ═══════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trajets_prix_base_positif') THEN
    ALTER TABLE trajets ADD CONSTRAINT trajets_prix_base_positif CHECK (prix_base > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trajets_prix_bagage_positif') THEN
    ALTER TABLE trajets ADD CONSTRAINT trajets_prix_bagage_positif
      CHECK (prix_bagage_supplementaire IS NULL OR prix_bagage_supplementaire >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bus_supplement_premium_positif') THEN
    ALTER TABLE bus ADD CONSTRAINT bus_supplement_premium_positif
      CHECK (supplement_premium IS NULL OR supplement_premium >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bus_nombre_rangees_realiste') THEN
    ALTER TABLE bus ADD CONSTRAINT bus_nombre_rangees_realiste
      CHECK (nombre_rangees BETWEEN 1 AND 30);
  END IF;
END $$;

-- La table des tâches avait 'normale' comme priorité par défaut, valeur
-- refusée par sa propre contrainte (rouge / orange / verte) : toute
-- tâche créée sans priorité échouait. 'verte' = priorité normale.
ALTER TABLE taches ALTER COLUMN priorite SET DEFAULT 'verte';
