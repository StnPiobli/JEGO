-- ═══════════════════════════════════════════════════════════════
-- VISIBILITÉ DU NOM SUR LES AVIS
--
-- Le réglage existait dans l'application mais ne faisait rien : le
-- prénom du voyageur était renvoyé avec chaque avis, sans condition.
--
-- Le choix est stocké sur le compte et s'applique RÉTROACTIVEMENT :
-- désactiver masque aussi les avis déjà laissés. C'est le sens d'un
-- réglage de confidentialité — on ne veut pas devoir supprimer ses
-- anciens avis pour retirer son nom.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE voyageurs
  ADD COLUMN IF NOT EXISTS avis_avec_nom BOOLEAN NOT NULL DEFAULT true;
