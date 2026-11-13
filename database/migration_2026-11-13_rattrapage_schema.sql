-- ═══════════════════════════════════════════════════
-- MIGRATION — Rattrapage du schéma (2026-11-13)
--
-- En rejouant TOUS les fichiers SQL sur une base vierge, on retrouvait
-- une base incomplète : ces tables et colonnes existaient dans la base de
-- développement (ajoutées à la main) mais dans aucun fichier. Sur un
-- serveur neuf, l'ajout d'une pièce à un litige, l'escalade automatique
-- d'un litige, le refus d'une agence et la connexion d'un voyageur ou
-- d'un admin auraient échoué.
--
-- Idempotent : sans effet sur une base qui les a déjà.
-- ═══════════════════════════════════════════════════

-- Pièces jointes d'un litige (fichier déposé ou lien)
CREATE TABLE IF NOT EXISTS pieces_litige (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  litige_id   UUID NOT NULL REFERENCES litiges(id) ON DELETE CASCADE,
  auteur_type VARCHAR(20) NOT NULL CHECK (auteur_type IN ('agence', 'voyageur', 'admin')),
  genre       VARCHAR(10) NOT NULL CHECK (genre IN ('fichier', 'lien')),
  nom         VARCHAR(255) NOT NULL,
  url         TEXT NOT NULL,
  type        VARCHAR(100),
  cree_le     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pieces_litige ON pieces_litige (litige_id);

-- Journal des connexions des voyageurs (statistiques du tableau de bord)
CREATE TABLE IF NOT EXISTS connexions_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voyageur_id UUID REFERENCES voyageurs(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,
  ip          VARCHAR(64),
  lieu        VARCHAR(120),
  cree_le     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connexions_log_ts ON connexions_log (cree_le);

ALTER TABLE litiges   ADD COLUMN IF NOT EXISTS collectif   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE litiges   ADD COLUMN IF NOT EXISTS escalade_le TIMESTAMP;
ALTER TABLE agences   ADD COLUMN IF NOT EXISTS refuse_le   TIMESTAMP;
ALTER TABLE voyageurs ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMP;

-- Réglages lus par le code mais jamais insérés. Les valeurs sont celles
-- que le code applique déjà quand le réglage manque : rien ne change
-- pour une base existante (ON CONFLICT : on ne touche pas aux valeurs
-- déjà réglées depuis l'écran Paramètres).
INSERT INTO parametres_systeme (cle, valeur, type_valeur, categorie, description) VALUES
  ('points_palier_reduction_points', '500', 'nombre', 'points_jego',
   'Points que le voyageur DÉPENSE pour obtenir une remise sur son billet'),
  ('points_palier_reduction_fcfa', '500', 'nombre', 'points_jego',
   'Montant de la remise EN FCFA reçue en échange de ces points (ex. : 500 points dépensés = 500 FCFA déduits du billet)'),
  ('points_palier_gratuit_points', '1000', 'nombre', 'points_jego',
   'Points que le voyageur DÉPENSE pour obtenir un billet entièrement gratuit'),
  ('programmation_min_jours_initial', '30', 'nombre', 'programmation',
   'Nombre de jours obligatoires à programmer à l''inscription'),
  ('programmation_seuil_alerte_jours', '14', 'nombre', 'programmation',
   'Seuil minimum en jours avant déclenchement de l''alerte quotidienne')
ON CONFLICT (cle) DO NOTHING;
