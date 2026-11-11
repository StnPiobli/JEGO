-- ═══════════════════════════════════════════════════════════════
-- NOTES DES AGENCES ET DES CHAUFFEURS RECALCULÉES
--
-- La modération changeait le statut d'un avis sans recalculer les notes
-- gardées sur les fiches : une agence affichait 4.0 sur 1 avis alors
-- qu'elle avait 3 avis visibles à 3.3 de moyenne. Le code recalcule
-- désormais à chaque changement ; on remet ici tout le monde d'aplomb.
-- ═══════════════════════════════════════════════════════════════

UPDATE agences a SET
  note_moyenne = (SELECT ROUND(AVG(note_globale), 2) FROM avis
                   WHERE agence_id = a.id AND statut = 'visible'),
  nombre_avis = (SELECT COUNT(*) FROM avis
                  WHERE agence_id = a.id AND statut = 'visible');

UPDATE chauffeurs c SET
  note_moyenne = (SELECT ROUND(AVG(note_conduite), 2) FROM avis
                   WHERE chauffeur_id = c.id AND statut = 'visible');
