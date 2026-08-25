-- ═══════════════════════════════════════════════════════════════
-- DÉPART DÉCLARÉ À CHAQUE ARRÊT
--
-- Jusqu'ici le chauffeur déclarait son ARRIVÉE à un arrêt, jamais son
-- départ. Le scan des billets restait donc bloqué une fois le bus
-- parti du terminus initial : personne montant à un arrêt
-- intermédiaire ne pouvait être embarqué, et les places de ce même
-- arrêt n'étaient plus vendables.
--
-- On mémorise maintenant l'instant où le bus REPART de chaque arrêt.
-- Cette seule information suffit à ouvrir puis refermer la fenêtre
-- d'embarquement arrêt par arrêt, au lieu de la fermer une fois pour
-- toutes au départ de la ligne.
--
-- NULL = le bus est encore à cet arrêt (ou l'arrêt n'est pas atteint).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE arrivees_arrets
  ADD COLUMN IF NOT EXISTS heure_depart_reelle TIMESTAMP;
