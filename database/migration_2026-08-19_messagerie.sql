CREATE TABLE IF NOT EXISTS messages_agence (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id      UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  auteur_type    VARCHAR(10) NOT NULL CHECK (auteur_type IN ('agence', 'admin')),
  texte          TEXT NOT NULL,
  lu_par_agence  BOOLEAN DEFAULT false,
  lu_par_admin   BOOLEAN DEFAULT false,
  cree_le        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_agence_agence ON messages_agence(agence_id);
CREATE INDEX IF NOT EXISTS idx_messages_agence_cree_le ON messages_agence(cree_le);
