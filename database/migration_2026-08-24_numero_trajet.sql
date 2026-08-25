-- ═══════════════════════════════════════════════════════════════
-- NUMÉRO DE VOYAGE STOCKÉ SUR LE TRAJET
--
-- Jusqu'ici le « numéro de voyage » n'existait pas en base : le
-- portail agence le fabriquait dans le navigateur à partir de la date,
-- de l'heure et des trois premières lettres des villes
-- (« JG-260827-0700:00-DOUDSC »). Trois défauts :
--
--   1. il changeait dès qu'on modifiait l'horaire du trajet, donc il
--      n'identifiait rien de durable ;
--   2. deux agences partant le même jour à la même heure sur le même
--      couple de villes obtenaient le même numéro ;
--   3. l'application mobile ne connaissait pas la recette et affichait
--      l'UUID technique à la place.
--
-- Le numéro est désormais attribué une fois pour toutes à la création,
-- par la base elle-même : tous les chemins d'insertion en héritent
-- sans modification, et il ne bouge plus jamais.
-- ═══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS trajet_numero_seq START 1;

ALTER TABLE trajets
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20);

-- Trajets déjà en base : numérotés dans leur ordre de création, pour
-- que l'ancienneté se lise dans le numéro.
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT id FROM trajets WHERE numero IS NULL ORDER BY cree_le, id LOOP
    UPDATE trajets
       SET numero = 'JG-' || LPAD(nextval('trajet_numero_seq')::text, 6, '0')
     WHERE id = t.id;
  END LOOP;
END $$;

ALTER TABLE trajets
  ALTER COLUMN numero SET DEFAULT 'JG-' || LPAD(nextval('trajet_numero_seq')::text, 6, '0');

ALTER TABLE trajets
  ALTER COLUMN numero SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trajets_numero_unique') THEN
    ALTER TABLE trajets ADD CONSTRAINT trajets_numero_unique UNIQUE (numero);
  END IF;
END $$;
