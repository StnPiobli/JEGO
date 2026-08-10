-- ═══════════════════════════════════════════════════════════════
-- SEED — RÔLES, PERMISSIONS ET SUPER ADMIN
--
-- Ce fichier manquait au dépôt : sur une base fraîche, aucun rôle ni
-- permission n'existait, donc même un membre_admin créé à la main se
-- voyait refuser 'valider_agence' et l'application entière restait
-- bloquée (aucune agence ne pouvait être validée).
--
-- Périmètre volontairement réduit aux permissions réellement
-- vérifiées par le code aujourd'hui. Le RBAC granulaire complet
-- (163 permissions du cahier des charges) reste différé jusqu'à la
-- constitution réelle de l'équipe admin — un Super Admin unique
-- traite tout au quotidien.
--
-- Idempotent : relançable sans créer de doublon.
--
-- ⚠️  MOT DE PASSE — à changer immédiatement après le premier accès.
--     Le hash ci-dessous correspond à : ChangeMoi123!
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PERMISSIONS ────────────────────────────────────────────
INSERT INTO permissions (code, description, categorie, branche) VALUES
  ('valider_agence',      'Valider l''inscription d''une agence',      'agences',   'direction'),
  ('refuser_agence',      'Refuser l''inscription d''une agence',      'agences',   'direction'),
  ('trancher_litige',     'Rendre une décision finale sur un litige',  'litiges',   'litiges'),
  ('modifier_parametres', 'Modifier les paramètres système',           'systeme',   'direction')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. RÔLE SUPER ADMIN (niveau 0) ────────────────────────────
INSERT INTO roles (nom, niveau, branche, description)
VALUES ('super_admin', 0, 'direction', 'Accès total — compte unique de direction')
ON CONFLICT (nom) DO NOTHING;

-- ─── 3. LE SUPER ADMIN A TOUTES LES PERMISSIONS ────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.nom = 'super_admin'
ON CONFLICT DO NOTHING;

-- ─── 4. COMPTE SUPER ADMIN ─────────────────────────────────────
-- Hash bcrypt de "ChangeMoi123!" — à changer au premier accès.
INSERT INTO membres_admin (nom, prenom, email, mot_de_passe, niveau, branche, statut)
VALUES (
  'Piobli', 'Stephane', 'admin@jego.cm',
  '$2b$10$rQ8p3aVYxNXKZ5J.wHqZ8eKvXhPYK3nGf5xLmT2wCdRbNqYvJhSxK',
  0, 'direction', 'actif'
)
ON CONFLICT (email) DO NOTHING;

-- ─── 5. RATTACHEMENT DU COMPTE AU RÔLE ─────────────────────────
INSERT INTO membre_roles (membre_id, role_id)
SELECT m.id, r.id
FROM membres_admin m, roles r
WHERE m.email = 'admin@jego.cm' AND r.nom = 'super_admin'
ON CONFLICT DO NOTHING;

-- ─── 6. GRILLE DE COMMISSION PAR DÉFAUT ────────────────────────
-- Sans au moins une ligne active, le calcul retombe sur 7 % codé en
-- dur dans le contrôleur. On matérialise la grille en base pour
-- qu'elle reste pilotable depuis l'espace admin.
INSERT INTO configuration_frais (type_frais, tranche_min, tranche_max, pourcentage, actif)
SELECT 'commission', 0, 5000, 7, true
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_frais
  WHERE type_frais = 'commission' AND tranche_min = 0 AND agence_id IS NULL
);

INSERT INTO configuration_frais (type_frais, tranche_min, tranche_max, pourcentage, actif)
SELECT 'commission', 5001, 15000, 6, true
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_frais
  WHERE type_frais = 'commission' AND tranche_min = 5001 AND agence_id IS NULL
);

INSERT INTO configuration_frais (type_frais, tranche_min, tranche_max, pourcentage, actif)
SELECT 'commission', 15001, NULL, 5, true
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_frais
  WHERE type_frais = 'commission' AND tranche_min = 15001 AND agence_id IS NULL
);
