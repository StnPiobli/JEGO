-- ═══════════════════════════════════════════════════════════════
-- RÈGLES D'ARGENT RÉGLABLES PAR L'ADMIN (CDC §15 et §16)
--
-- Ces taux étaient écrits en dur dans le code. Ils apparaissent
-- désormais dans Paramètres système de l'admin.
--
-- Retards (décision du 11/11/2026) : moins de 4 h, rien ; à partir de
-- 4 h, un nombre fixe de points JEGO. Plus aucun remboursement en
-- argent pour un retard.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO parametres_systeme (cle, valeur, type_valeur, categorie, description) VALUES
  ('retard_seuil_compensation_heures', '4', 'nombre', 'remboursements',
   'Retard à partir duquel les passagers reçoivent des points JEGO'),
  ('retard_points_compensation', '500', 'nombre', 'remboursements',
   'Points JEGO offerts à chaque passager au-delà du seuil de retard'),
  ('flexible_delai_heures', '24', 'nombre', 'remboursements',
   'Billet flexible : délai avant le départ qui sépare les deux taux de remboursement'),
  ('flexible_remboursement_avant_delai_pourcent', '80', 'nombre', 'remboursements',
   'Billet flexible annulé plus tôt que le délai : part du prix remboursée'),
  ('flexible_remboursement_apres_delai_pourcent', '50', 'nombre', 'remboursements',
   'Billet flexible annulé moins de ce délai avant le départ : part du prix remboursée'),
  ('option_flexible_pourcent', '10', 'nombre', 'options',
   'Prix de l''option billet flexible, en pourcentage du prix du billet'),
  ('option_choix_siege_fcfa', '500', 'nombre', 'options',
   'Prix du choix d''un siège premium'),
  ('frais_momo_pour_mille', '15', 'nombre', 'frais',
   'Frais Mobile Money absorbés par JEGO, pour mille (15 = 1,5 %)'),
  ('points_par_1000_fcfa', '10', 'nombre', 'points',
   'Points JEGO gagnés pour 1 000 FCFA payés par Mobile Money')
ON CONFLICT (cle) DO NOTHING;

-- Billets déjà remboursés : l'agence n'est pas versée (sa part passe à 0)
-- et la part JEGO devient ce qu'il reste réellement : payé par le client,
-- moins frais, moins remboursé. Un billet du guichet ne rapporte rien.
UPDATE escrow e
   SET montant_agence = 0,
       montant_jego = CASE
         WHEN b.source_vente = 'physique' THEN 0
         ELSE b.prix_total_client - e.frais_momo
              - COALESCE((SELECT SUM(r.montant) FROM remboursements r
                           WHERE r.billet_id = b.id AND r.statut = 'traite'), 0)
       END
  FROM billets b
 WHERE b.id = e.billet_id
   AND e.statut = 'rembourse';
