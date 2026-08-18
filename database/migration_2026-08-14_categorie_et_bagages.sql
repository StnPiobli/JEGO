ALTER TABLE trajets DROP CONSTRAINT IF EXISTS trajets_categorie_check;
ALTER TABLE trajets ADD CONSTRAINT trajets_categorie_check CHECK (categorie IN ('standard', 'mixte', 'vip'));
ALTER TABLE trajets ADD COLUMN IF NOT EXISTS prix_bagage_supplementaire INTEGER DEFAULT 1000;
