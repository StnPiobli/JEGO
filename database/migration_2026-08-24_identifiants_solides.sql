-- ═══════════════════════════════════════════════════════════════
-- IDENTIFIANTS PUBLICS SOLIDES
--
-- Les identifiants visibles par les utilisateurs étaient soit
-- séquentiels (« JG-000043 »), soit des horodatages bruts
-- (« LIT-1783514025899 »), soit trop courts pour éviter les collisions
-- (« JG-20260114-UI55 », quatre caractères). Tous énumérables : depuis
-- un identifiant on devinait les voisins.
--
-- Nouveau format : PPP-XXXXX-XXXXX
--   - un préfixe qui dit de quoi il s'agit ;
--   - dix caractères tirés au sort dans un alphabet de 30 symboles
--     d'où sont retirés 0, O, 1, I, L et U — ceux qu'on confond en
--     dictant un numéro au téléphone.
--
-- 30^10 ≈ 5,9 × 10^14 combinaisons : ni devinable, ni énumérable.
--
-- ATTENTION : les numéros DÉJÀ attribués ne sont pas régénérés. Celui
-- d'un billet est inscrit dans son QR code signé ; le changer rendrait
-- inscannable tout billet déjà émis. Seuls les trajets sont
-- renumérotés, car leur numéro date d'aujourd'hui et rien ne le
-- référence encore.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generer_identifiant(prefixe TEXT) RETURNS TEXT AS $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  taille   CONSTANT INT  := length(alphabet);
  tirage   TEXT := '';
  i        INT;
BEGIN
  FOR i IN 1..10 LOOP
    IF i = 6 THEN
      tirage := tirage || '-';
    END IF;
    tirage := tirage || substr(alphabet, 1 + floor(random() * taille)::int, 1);
  END LOOP;
  RETURN prefixe || '-' || tirage;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ─── TRAJETS ──────────────────────────────────────────────────────
-- Seule table renumérotée : ses numéros n'existent que depuis
-- aujourd'hui et aucune donnée ne s'y réfère.
ALTER TABLE trajets ALTER COLUMN numero DROP DEFAULT;
ALTER TABLE trajets ALTER COLUMN numero TYPE VARCHAR(24);
UPDATE trajets SET numero = generer_identifiant('TRJ');
ALTER TABLE trajets ALTER COLUMN numero SET DEFAULT generer_identifiant('TRJ');
DROP SEQUENCE IF EXISTS trajet_numero_seq;

-- ─── COMPTES : numéro public, l'UUID reste la clé technique ───────
ALTER TABLE voyageurs  ADD COLUMN IF NOT EXISTS numero VARCHAR(24);
ALTER TABLE agences    ADD COLUMN IF NOT EXISTS numero VARCHAR(24);
ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS numero VARCHAR(24);
ALTER TABLE bus        ADD COLUMN IF NOT EXISTS numero VARCHAR(24);

UPDATE voyageurs  SET numero = generer_identifiant('CLI') WHERE numero IS NULL;
UPDATE agences    SET numero = generer_identifiant('AGC') WHERE numero IS NULL;
UPDATE chauffeurs SET numero = generer_identifiant('CHF') WHERE numero IS NULL;
UPDATE bus        SET numero = generer_identifiant('BUS') WHERE numero IS NULL;

ALTER TABLE voyageurs  ALTER COLUMN numero SET DEFAULT generer_identifiant('CLI');
ALTER TABLE agences    ALTER COLUMN numero SET DEFAULT generer_identifiant('AGC');
ALTER TABLE chauffeurs ALTER COLUMN numero SET DEFAULT generer_identifiant('CHF');
ALTER TABLE bus        ALTER COLUMN numero SET DEFAULT generer_identifiant('BUS');

ALTER TABLE voyageurs  ALTER COLUMN numero SET NOT NULL;
ALTER TABLE agences    ALTER COLUMN numero SET NOT NULL;
ALTER TABLE chauffeurs ALTER COLUMN numero SET NOT NULL;
ALTER TABLE bus        ALTER COLUMN numero SET NOT NULL;

-- ─── Unicité ──────────────────────────────────────────────────────
DO $$
DECLARE
  cible RECORD;
BEGIN
  FOR cible IN
    SELECT * FROM (VALUES
      ('trajets','numero'), ('voyageurs','numero'), ('agences','numero'),
      ('chauffeurs','numero'), ('bus','numero'), ('billets','numero'),
      ('litiges','numero'), ('denonciations','numero')
    ) AS v(nom_table, nom_colonne)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = cible.nom_table || '_' || cible.nom_colonne || '_unique'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (%I)',
                     cible.nom_table,
                     cible.nom_table || '_' || cible.nom_colonne || '_unique',
                     cible.nom_colonne);
    END IF;
  END LOOP;
END $$;
