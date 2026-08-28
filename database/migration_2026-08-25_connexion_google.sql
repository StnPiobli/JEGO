-- ═══════════════════════════════════════════════════════════════
-- CONNEXION PAR COMPTE GOOGLE
--
-- Un compte créé par Google n'a pas de mot de passe : c'est Google qui
-- authentifie. La colonne devient donc facultative, au lieu d'obliger à
-- y ranger une valeur inventée que personne ne pourrait utiliser.
--
-- On mémorise l'identifiant Google (le « sub » du jeton), stable et
-- propre à chaque compte. L'email ne suffit pas : une personne peut le
-- changer chez Google, et deux fournisseurs différents peuvent porter
-- le même email.
--
-- Le téléphone reste obligatoire — c'est l'identifiant de connexion et
-- ce qui sert au paiement Mobile Money. Google ne le fournit jamais :
-- l'application le demande donc avant de finaliser la création.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE voyageurs
  ALTER COLUMN mot_de_passe DROP NOT NULL;

ALTER TABLE voyageurs
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_verifie BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voyageurs_google_id_unique') THEN
    ALTER TABLE voyageurs ADD CONSTRAINT voyageurs_google_id_unique UNIQUE (google_id);
  END IF;
END $$;

-- Un compte doit garder au moins un moyen de s'authentifier : un mot de
-- passe, ou un compte Google rattaché. Sans cette garantie, une future
-- suppression de mot de passe créerait un compte inaccessible.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voyageurs_authentification_possible') THEN
    ALTER TABLE voyageurs ADD CONSTRAINT voyageurs_authentification_possible
      CHECK (mot_de_passe IS NOT NULL OR google_id IS NOT NULL);
  END IF;
END $$;
