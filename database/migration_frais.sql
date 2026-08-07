ALTER TABLE configuration_frais
  ADD COLUMN IF NOT EXISTS motif VARCHAR(255);

INSERT INTO configuration_frais (agence_id, tranche_min, tranche_max, pourcentage, type_frais, actif)
SELECT * FROM (VALUES
  (NULL::uuid,    0,  3000, 7.00, 'commission', true),
  (NULL::uuid, 3001,  8000, 7.00, 'commission', true),
  (NULL::uuid, 8001,  NULL, 6.00, 'commission', true)
) AS nouvelles(agence_id, tranche_min, tranche_max, pourcentage, type_frais, actif)
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_frais
  WHERE type_frais = 'commission' AND agence_id IS NULL AND actif = true
);