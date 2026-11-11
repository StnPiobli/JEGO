-- ═══════════════════════════════════════════════════════════════
-- PHOTO DE PROFIL DU VOYAGEUR
--
-- Elle ne vivait que sur le téléphone : changer d'appareil ou
-- réinstaller l'application la faisait disparaître. Elle est
-- désormais conservée par le serveur.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE voyageurs
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255);
