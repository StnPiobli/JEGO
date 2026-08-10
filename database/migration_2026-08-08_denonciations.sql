-- ═══════════════════════════════════════════════════════════════
-- MIGRATION — ESPACE DÉNONCIATION VOYAGEUR
-- 2026-08-08
--
-- Distinct du signalement collectif temps réel (table signalements),
-- qui sert à alerter pendant le trajet au franchissement d'un seuil.
--
-- La dénonciation est un dossier individuel, documenté, ouvert APRÈS
-- le voyage sur un billet réel du voyageur. L'agence et l'admin sont
-- notifiés simultanément ; l'agence est en mode observation et peut
-- déposer des pièces justificatives, mais ne peut pas clore le
-- dossier elle-même — seul l'admin tranche.
--
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS denonciations (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero            VARCHAR(30) NOT NULL UNIQUE,
  billet_id         UUID NOT NULL REFERENCES billets(id),
  trajet_id         UUID NOT NULL REFERENCES trajets(id),
  voyageur_id       UUID NOT NULL REFERENCES voyageurs(id),
  agence_id         UUID NOT NULL REFERENCES agences(id),
  chauffeur_id      UUID REFERENCES chauffeurs(id),
  categorie         VARCHAR(50) NOT NULL CHECK (categorie IN (
                      'conduite_dangereuse', 'comportement_chauffeur',
                      'etat_du_bus', 'surcharge', 'arret_non_respecte',
                      'horaire_non_respecte', 'securite', 'autre'
                    )),
  raison            TEXT NOT NULL,
  statut            VARCHAR(30) DEFAULT 'ouverte' CHECK (statut IN (
                      'ouverte', 'observation_agence', 'traitee', 'classee'
                    )),
  -- Observation de l'agence : elle se défend, sans pouvoir clore.
  observation_agence      TEXT,
  observation_agence_le   TIMESTAMP,
  -- Décision de l'admin
  decision          TEXT,
  decide_par        UUID REFERENCES membres_admin(id),
  decide_le         TIMESTAMP,
  -- Escalade éventuelle vers un litige formel
  litige_id         UUID REFERENCES litiges(id),
  cree_le           TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le     TIMESTAMP DEFAULT NOW(),
  -- Une seule dénonciation par billet : évite le harcèlement d'une
  -- agence par dépôts répétés sur le même voyage.
  UNIQUE (billet_id)
);
CREATE INDEX IF NOT EXISTS idx_denonciations_agence ON denonciations(agence_id);
CREATE INDEX IF NOT EXISTS idx_denonciations_statut ON denonciations(statut);

-- Pièces jointes : déposées par le voyageur (preuves) OU par l'agence
-- (pièces justificatives en défense). Même stockage disque que les
-- documents d'agence : la base ne garde que la référence.
CREATE TABLE IF NOT EXISTS pieces_denonciation (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  denonciation_id   UUID NOT NULL REFERENCES denonciations(id) ON DELETE CASCADE,
  depose_par        VARCHAR(20) NOT NULL CHECK (depose_par IN ('voyageur', 'agence')),
  deposant_id       UUID NOT NULL,
  nom_fichier       VARCHAR(255) NOT NULL,
  fichier_stocke    VARCHAR(255) NOT NULL,
  taille_octets     INTEGER NOT NULL,
  type_mime         VARCHAR(100) NOT NULL,
  televerse_le      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pieces_denonciation ON pieces_denonciation(denonciation_id);

-- ─── DÉLAIS PARAMÉTRABLES (jamais codés en dur) ────────────────
-- Un litige/dénonciation ne s'ouvre qu'APRÈS le départ du bus et se
-- ferme au bout d'un délai configurable après la fin du trajet.
INSERT INTO parametres_systeme (cle, valeur, description, type_valeur, categorie)
SELECT 'delai_ouverture_litige_jours', '2',
       'Nombre de jours après la fin du trajet pendant lesquels un litige ou une dénonciation peut encore être ouvert',
       'nombre', 'litiges'
WHERE NOT EXISTS (SELECT 1 FROM parametres_systeme WHERE cle = 'delai_ouverture_litige_jours');

INSERT INTO parametres_systeme (cle, valeur, description, type_valeur, categorie)
SELECT 'delai_reponse_agence_heures', '48',
       'Délai laissé à l''agence pour répondre à un litige ou déposer ses observations sur une dénonciation',
       'nombre', 'litiges'
WHERE NOT EXISTS (SELECT 1 FROM parametres_systeme WHERE cle = 'delai_reponse_agence_heures');
