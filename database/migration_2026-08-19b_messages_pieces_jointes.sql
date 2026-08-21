ALTER TABLE messages_agence ADD COLUMN IF NOT EXISTS piece_jointe_nom VARCHAR(255);
ALTER TABLE messages_agence ADD COLUMN IF NOT EXISTS piece_jointe_url VARCHAR(500);
ALTER TABLE messages_agence ADD COLUMN IF NOT EXISTS piece_jointe_type VARCHAR(100);
