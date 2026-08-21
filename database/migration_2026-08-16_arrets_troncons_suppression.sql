ALTER TABLE trajets DROP CONSTRAINT IF EXISTS trajets_statut_check;
ALTER TABLE trajets ADD CONSTRAINT trajets_statut_check CHECK (statut IN ('programme', 'en_cours', 'termine', 'annule', 'retard', 'incident', 'supprime'));
ALTER TABLE ligne_points ADD COLUMN IF NOT EXISTS heure_arrivee_estimee TIME;
ALTER TABLE billets ADD COLUMN IF NOT EXISTS quantite_bagages INTEGER DEFAULT 0;
