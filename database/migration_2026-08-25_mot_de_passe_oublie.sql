-- ═══════════════════════════════════════════════════════════════
-- RÉINITIALISATION DU MOT DE PASSE VOYAGEUR
--
-- Il n'existait aucun moyen de retrouver son compte : le lien « mot de
-- passe oublié » ne faisait rien, et aucune route serveur ne
-- l'accompagnait. Une voyageuse ayant perdu son mot de passe perdait
-- l'accès à ses billets, définitivement.
--
-- Le code est stocké HACHÉ, jamais en clair : c'est un identifiant de
-- connexion à part entière, et une lecture de la base ne doit pas
-- permettre de prendre la main sur des comptes.
--
-- Le nombre de tentatives est compté pour qu'un code à six chiffres ne
-- puisse pas être trouvé en les essayant tous.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reinitialisations_mot_de_passe (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  voyageur_id  UUID NOT NULL REFERENCES voyageurs(id) ON DELETE CASCADE,
  code_hash    VARCHAR(255) NOT NULL,
  expire_le    TIMESTAMP NOT NULL,
  utilise_le   TIMESTAMP,
  tentatives   INTEGER NOT NULL DEFAULT 0,
  cree_le      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reinit_voyageur
  ON reinitialisations_mot_de_passe(voyageur_id, utilise_le);
