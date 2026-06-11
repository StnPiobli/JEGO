-- ═══════════════════════════════════════════════════
-- JEGO — Schéma de base de données complet
-- Version corrigée — tables dans le bon ordre
-- ═══════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════
-- TABLE 1 — VILLES
-- ═══════════════════════════════════════════════════

CREATE TABLE villes (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  abreviations  TEXT[],
  region        VARCHAR(100),
  pays          VARCHAR(50) DEFAULT 'Cameroun',
  actif         BOOLEAN DEFAULT TRUE,
  cree_le       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_villes_nom ON villes(nom);

INSERT INTO villes (nom, abreviations, region) VALUES
  ('Douala', ARRAY['d', 'dla', 'douala'], 'Littoral'),
  ('Yaoundé', ARRAY['y', 'yde', 'yaounde'], 'Centre'),
  ('Bafoussam', ARRAY['b', 'baf', 'bafoussam'], 'Ouest');

-- ═══════════════════════════════════════════════════
-- TABLE 2 — VOYAGEURS
-- ═══════════════════════════════════════════════════

CREATE TABLE voyageurs (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nom                     VARCHAR(100) NOT NULL,
  prenom                  VARCHAR(100) NOT NULL,
  date_naissance          DATE NOT NULL,
  lieu_naissance          VARCHAR(150) NOT NULL,
  telephone               VARCHAR(20) NOT NULL UNIQUE,
  email                   VARCHAR(150) NOT NULL UNIQUE,
  mot_de_passe            VARCHAR(255) NOT NULL,
  contact_urgence         VARCHAR(20),
  langue                  VARCHAR(5) DEFAULT 'fr',
  mode_sombre             BOOLEAN DEFAULT FALSE,
  mode_eco_donnees        BOOLEAN DEFAULT FALSE,
  points_fidelite         INTEGER DEFAULT 0,
  statut                  VARCHAR(20) DEFAULT 'actif',
  dernier_changement_nom  DATE,
  cree_le                 TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le           TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 3 — AGENCES
-- ═══════════════════════════════════════════════════

CREATE TABLE agences (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nom                 VARCHAR(150) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  telephone           VARCHAR(20) NOT NULL UNIQUE,
  adresse             VARCHAR(255),
  ville               VARCHAR(100),
  registre_commerce   VARCHAR(100),
  logo_url            VARCHAR(255),
  badge_certifie      BOOLEAN DEFAULT FALSE,
  statut              VARCHAR(20) DEFAULT 'en_attente',
  mot_de_passe        VARCHAR(255) NOT NULL,
  langue              VARCHAR(5) DEFAULT 'fr',
  cree_le             TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le       TIMESTAMP DEFAULT NOW(),
  valide_le           TIMESTAMP,
  valide_par          UUID
);

-- ═══════════════════════════════════════════════════
-- TABLE 4 — MEMBRES ÉQUIPE ADMIN
-- ═══════════════════════════════════════════════════

CREATE TABLE membres_admin (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  telephone           VARCHAR(20),
  mot_de_passe        VARCHAR(255) NOT NULL,
  niveau              INTEGER NOT NULL CHECK (niveau BETWEEN 0 AND 4),
  branche             VARCHAR(50),
  superieur_id        UUID REFERENCES membres_admin(id),
  statut              VARCHAR(20) DEFAULT 'actif',
  date_naissance      DATE,
  adresse             VARCHAR(255),
  date_arrivee        DATE DEFAULT CURRENT_DATE,
  derniere_connexion  TIMESTAMP,
  cree_le             TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 5 — CHAUFFEURS
-- ═══════════════════════════════════════════════════

CREATE TABLE chauffeurs (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id           UUID NOT NULL REFERENCES agences(id),
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  date_naissance      DATE NOT NULL,
  lieu_naissance      VARCHAR(150) NOT NULL,
  telephone           VARCHAR(20) NOT NULL UNIQUE,
  photo_permis_url    VARCHAR(255),
  mot_de_passe        VARCHAR(255) NOT NULL,
  statut              VARCHAR(20) DEFAULT 'actif',
  note_moyenne        DECIMAL(3,2) DEFAULT 0,
  nombre_voyages      INTEGER DEFAULT 0,
  session_active      BOOLEAN DEFAULT FALSE,
  appareil_token      VARCHAR(255),
  desactive_urgence   BOOLEAN DEFAULT FALSE,
  cree_le             TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 6 — RÔLES
-- ═══════════════════════════════════════════════════

CREATE TABLE roles (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL UNIQUE,
  niveau      INTEGER NOT NULL CHECK (niveau BETWEEN 0 AND 4),
  branche     VARCHAR(50),
  description VARCHAR(255),
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 7 — PERMISSIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE permissions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  categorie   VARCHAR(50),
  branche     VARCHAR(50),
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 8 — RÔLES ↔ PERMISSIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ═══════════════════════════════════════════════════
-- TABLE 9 — MEMBRES ↔ RÔLES
-- ═══════════════════════════════════════════════════

CREATE TABLE membre_roles (
  membre_id UUID NOT NULL REFERENCES membres_admin(id) ON DELETE CASCADE,
  role_id   UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (membre_id, role_id)
);

-- ═══════════════════════════════════════════════════
-- TABLE 10 — BUS
-- ═══════════════════════════════════════════════════

CREATE TABLE bus (
  id                        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id                 UUID NOT NULL REFERENCES agences(id),
  nom                       VARCHAR(150) NOT NULL,
  type_bus                  VARCHAR(20) NOT NULL CHECK (type_bus IN ('vip', 'standard', 'mixte')),
  disposition               VARCHAR(10) NOT NULL CHECK (disposition IN ('2+2', '2+1', '1+1', '2+3')),
  nombre_rangees            INTEGER NOT NULL,
  derniere_rangee_speciale  BOOLEAN DEFAULT FALSE,
  sieges_derniere_rangee    INTEGER,
  toilettes                 BOOLEAN DEFAULT FALSE,
  climatisation             BOOLEAN DEFAULT FALSE,
  prises_usb                BOOLEAN DEFAULT FALSE,
  wifi                      BOOLEAN DEFAULT FALSE,
  sieges_inclinables        BOOLEAN DEFAULT FALSE,
  supplement_premium        INTEGER DEFAULT 0,
  statut                    VARCHAR(20) DEFAULT 'actif',
  cree_le                   TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le             TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 11 — SIÈGES
-- ═══════════════════════════════════════════════════

CREATE TABLE sieges (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bus_id        UUID NOT NULL REFERENCES bus(id) ON DELETE CASCADE,
  numero        VARCHAR(10) NOT NULL,
  rangee        INTEGER NOT NULL,
  position      INTEGER NOT NULL,
  type_position VARCHAR(20) CHECK (type_position IN (
                  'fenetre_gauche', 'couloir_gauche', 'milieu',
                  'couloir_droit', 'fenetre_droite'
                )),
  est_premium   BOOLEAN DEFAULT FALSE,
  statut        VARCHAR(30) DEFAULT 'disponible' CHECK (statut IN (
                  'disponible', 'desactive', 'supprime_toilettes'
                )),
  cree_le       TIMESTAMP DEFAULT NOW(),
  UNIQUE (bus_id, numero)
);

-- ═══════════════════════════════════════════════════
-- TABLE 12 — LIGNES
-- ═══════════════════════════════════════════════════

CREATE TABLE lignes (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id       UUID NOT NULL REFERENCES agences(id),
  ville_depart    VARCHAR(100) NOT NULL,
  ville_arrivee   VARCHAR(100) NOT NULL,
  est_direct      BOOLEAN DEFAULT TRUE,
  arrets          TEXT[],
  distance_km     INTEGER,
  cree_le         TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le   TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 13 — TRAJETS
-- ═══════════════════════════════════════════════════

CREATE TABLE trajets (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ligne_id              UUID NOT NULL REFERENCES lignes(id),
  bus_id                UUID NOT NULL REFERENCES bus(id),
  chauffeur_id          UUID REFERENCES chauffeurs(id),
  agence_id             UUID NOT NULL REFERENCES agences(id),
  date_depart           DATE NOT NULL,
  heure_depart          TIME NOT NULL,
  heure_arrivee_estimee TIME NOT NULL,
  prix_base             INTEGER NOT NULL,
  categorie             VARCHAR(20) CHECK (categorie IN (
                          'standard', 'vip', 'express', 'nuit'
                        )),
  statut                VARCHAR(30) DEFAULT 'programme' CHECK (statut IN (
                          'programme', 'en_cours', 'termine',
                          'annule', 'retard'
                        )),
  retard_minutes        INTEGER DEFAULT 0,
  heure_depart_reelle   TIMESTAMP,
  heure_arrivee_reelle  TIMESTAMP,
  cree_le               TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le         TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 14 — RÉSERVATIONS GROUPE
-- ═══════════════════════════════════════════════════

CREATE TABLE reservations_groupe (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  voyageur_id     UUID NOT NULL REFERENCES voyageurs(id),
  trajet_id       UUID NOT NULL REFERENCES trajets(id),
  nombre_places   INTEGER NOT NULL CHECK (nombre_places > 1),
  montant_total   INTEGER NOT NULL,
  statut          VARCHAR(20) DEFAULT 'confirme' CHECK (statut IN (
                    'confirme', 'annule', 'partiel'
                  )),
  cree_le         TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 15 — BILLETS
-- ═══════════════════════════════════════════════════

CREATE TABLE billets (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero              VARCHAR(20) NOT NULL UNIQUE,
  trajet_id           UUID NOT NULL REFERENCES trajets(id),
  voyageur_id         UUID NOT NULL REFERENCES voyageurs(id),
  siege_id            UUID NOT NULL REFERENCES sieges(id),
  agence_id           UUID NOT NULL REFERENCES agences(id),
  groupe_id           UUID REFERENCES reservations_groupe(id),
  type_billet         VARCHAR(20) DEFAULT 'standard' CHECK (type_billet IN (
                        'standard', 'flexible', 'cadeau'
                      )),
  statut              VARCHAR(30) DEFAULT 'confirme' CHECK (statut IN (
                        'confirme', 'annule', 'utilise', 'expire'
                      )),
  est_flexible        BOOLEAN DEFAULT FALSE,
  supplement_flexible INTEGER DEFAULT 0,
  supplement_bagage   INTEGER DEFAULT 0,
  supplement_siege    INTEGER DEFAULT 0,
  prix_total_client   INTEGER NOT NULL,
  prix_agence         INTEGER NOT NULL,
  marge_jego          INTEGER NOT NULL,
  frais_momo          INTEGER NOT NULL,
  est_cadeau          BOOLEAN DEFAULT FALSE,
  destinataire_tel    VARCHAR(20),
  qr_code             TEXT NOT NULL,
  qr_scanne           BOOLEAN DEFAULT FALSE,
  qr_scanne_le        TIMESTAMP,
  source_vente        VARCHAR(20) DEFAULT 'en_ligne' CHECK (source_vente IN (
                        'en_ligne', 'physique'
                      )),
  est_revente         BOOLEAN DEFAULT FALSE,
  billet_original_id  UUID REFERENCES billets(id),
  cree_le             TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 16 — PAIEMENTS
-- ═══════════════════════════════════════════════════

CREATE TABLE paiements (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  billet_id       UUID NOT NULL REFERENCES billets(id),
  voyageur_id     UUID NOT NULL REFERENCES voyageurs(id),
  montant         INTEGER NOT NULL,
  operateur       VARCHAR(20) NOT NULL CHECK (operateur IN (
                    'mtn_momo', 'orange_money'
                  )),
  reference_momo  VARCHAR(100) UNIQUE,
  statut          VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                    'en_attente', 'confirme', 'echoue', 'rembourse'
                  )),
  type            VARCHAR(20) DEFAULT 'paiement' CHECK (type IN (
                    'paiement', 'remboursement'
                  )),
  cree_le         TIMESTAMP DEFAULT NOW(),
  confirme_le     TIMESTAMP,
  mis_a_jour_le   TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 17 — ESCROW
-- ═══════════════════════════════════════════════════

CREATE TABLE escrow (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  billet_id       UUID NOT NULL REFERENCES billets(id) UNIQUE,
  montant_total   INTEGER NOT NULL,
  montant_agence  INTEGER NOT NULL,
  montant_jego    INTEGER NOT NULL,
  frais_momo      INTEGER NOT NULL,
  statut          VARCHAR(20) DEFAULT 'retenu' CHECK (statut IN (
                    'retenu', 'verse', 'rembourse'
                  )),
  verse_le        TIMESTAMP,
  cree_le         TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 18 — SOFT LOCK
-- ═══════════════════════════════════════════════════

CREATE TABLE soft_locks (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  siege_id    UUID NOT NULL REFERENCES sieges(id),
  trajet_id   UUID NOT NULL REFERENCES trajets(id),
  voyageur_id UUID NOT NULL REFERENCES voyageurs(id),
  expire_le   TIMESTAMP NOT NULL,
  actif       BOOLEAN DEFAULT TRUE,
  cree_le     TIMESTAMP DEFAULT NOW(),
  UNIQUE (siege_id, trajet_id)
);

-- ═══════════════════════════════════════════════════
-- TABLE 19 — REMBOURSEMENTS
-- ═══════════════════════════════════════════════════

CREATE TABLE remboursements (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  billet_id   UUID NOT NULL REFERENCES billets(id),
  voyageur_id UUID NOT NULL REFERENCES voyageurs(id),
  montant     INTEGER NOT NULL,
  motif       VARCHAR(50) NOT NULL CHECK (motif IN (
                'annulation_agence',
                'retard_excessif',
                'billet_flexible',
                'litige',
                'manuel'
              )),
  pourcentage INTEGER NOT NULL,
  statut      VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                'en_attente', 'traite', 'echoue'
              )),
  reference   VARCHAR(50) UNIQUE,
  traite_le   TIMESTAMP,
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 20 — NOTIFICATIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE notifications (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  destinataire_type   VARCHAR(20) NOT NULL CHECK (destinataire_type IN (
                        'voyageur', 'agence', 'chauffeur', 'admin'
                      )),
  destinataire_id     UUID NOT NULL,
  type                VARCHAR(50) NOT NULL,
  titre               VARCHAR(150),
  contenu             TEXT NOT NULL,
  canal               VARCHAR(20) NOT NULL CHECK (canal IN (
                        'push', 'email', 'sms'
                      )),
  statut              VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                        'en_attente', 'envoye', 'echoue'
                      )),
  lu                  BOOLEAN DEFAULT FALSE,
  cree_le             TIMESTAMP DEFAULT NOW(),
  envoye_le           TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- TABLE 21 — MODÈLES NOTIFICATIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE modeles_notifications (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code          VARCHAR(100) NOT NULL UNIQUE,
  canal         VARCHAR(20) NOT NULL CHECK (canal IN (
                  'push', 'email', 'sms'
                )),
  langue        VARCHAR(5) NOT NULL DEFAULT 'fr',
  sujet         VARCHAR(200),
  contenu       TEXT NOT NULL,
  variables     TEXT[],
  actif         BOOLEAN DEFAULT TRUE,
  cree_le       TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 22 — SIGNALEMENTS
-- ═══════════════════════════════════════════════════

CREATE TABLE signalements (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trajet_id       UUID NOT NULL REFERENCES trajets(id),
  voyageur_id     UUID NOT NULL REFERENCES voyageurs(id),
  categorie       VARCHAR(50) NOT NULL CHECK (categorie IN (
                    'exces_vitesse',
                    'conduite_dangereuse',
                    'comportement_inapproprie',
                    'panne_technique',
                    'arret_prolonge',
                    'autre'
                  )),
  commentaire     TEXT,
  seuil_atteint   BOOLEAN DEFAULT FALSE,
  alerte_envoyee  BOOLEAN DEFAULT FALSE,
  cree_le         TIMESTAMP DEFAULT NOW(),
  UNIQUE (trajet_id, voyageur_id, categorie)
);

-- ═══════════════════════════════════════════════════
-- TABLE 23 — LITIGES
-- ═══════════════════════════════════════════════════

CREATE TABLE litiges (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero              VARCHAR(20) NOT NULL UNIQUE,
  billet_id           UUID REFERENCES billets(id),
  trajet_id           UUID REFERENCES trajets(id),
  voyageur_id         UUID NOT NULL REFERENCES voyageurs(id),
  agence_id           UUID NOT NULL REFERENCES agences(id),
  ouvert_par          VARCHAR(20) NOT NULL CHECK (ouvert_par IN (
                        'voyageur', 'admin'
                      )),
  niveau              INTEGER DEFAULT 1 CHECK (niveau BETWEEN 1 AND 3),
  motif               VARCHAR(100) NOT NULL,
  description         TEXT NOT NULL,
  statut              VARCHAR(30) DEFAULT 'ouvert' CHECK (statut IN (
                        'ouvert', 'en_cours', 'resolu',
                        'cloture', 'escalade'
                      )),
  reponse_agence      TEXT,
  reponse_agence_le   TIMESTAMP,
  decision            TEXT,
  decide_par          UUID REFERENCES membres_admin(id),
  decide_le           TIMESTAMP,
  cree_le             TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 24 — AVIS
-- ═══════════════════════════════════════════════════

CREATE TABLE avis (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trajet_id       UUID NOT NULL REFERENCES trajets(id),
  voyageur_id     UUID NOT NULL REFERENCES voyageurs(id),
  agence_id       UUID NOT NULL REFERENCES agences(id),
  chauffeur_id    UUID REFERENCES chauffeurs(id),
  note_globale    DECIMAL(2,1) NOT NULL CHECK (note_globale BETWEEN 1 AND 5),
  note_service    DECIMAL(2,1) CHECK (note_service BETWEEN 1 AND 5),
  note_conduite   DECIMAL(2,1) CHECK (note_conduite BETWEEN 1 AND 5),
  note_horaires   DECIMAL(2,1) CHECK (note_horaires BETWEEN 1 AND 5),
  note_confort    DECIMAL(2,1) CHECK (note_confort BETWEEN 1 AND 5),
  commentaire     TEXT,
  statut          VARCHAR(20) DEFAULT 'visible' CHECK (statut IN (
                    'visible', 'signale', 'supprime'
                  )),
  signale_par     UUID REFERENCES voyageurs(id),
  signale_le      TIMESTAMP,
  cree_le         TIMESTAMP DEFAULT NOW(),
  UNIQUE (trajet_id, voyageur_id)
);

-- ═══════════════════════════════════════════════════
-- TABLE 25 — JEGO POINTS HISTORIQUE
-- ═══════════════════════════════════════════════════

CREATE TABLE jego_points (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  voyageur_id UUID NOT NULL REFERENCES voyageurs(id),
  points      INTEGER NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN (
                'gain', 'depense'
              )),
  motif       VARCHAR(100),
  billet_id   UUID REFERENCES billets(id),
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 26 — ALERTES PRIX
-- ═══════════════════════════════════════════════════

CREATE TABLE alertes_prix (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  voyageur_id     UUID NOT NULL REFERENCES voyageurs(id),
  ville_depart    VARCHAR(100) NOT NULL,
  ville_arrivee   VARCHAR(100) NOT NULL,
  prix_cible      INTEGER NOT NULL,
  statut          VARCHAR(20) DEFAULT 'active' CHECK (statut IN (
                    'active', 'declenchee', 'annulee'
                  )),
  declenchee_le   TIMESTAMP,
  cree_le         TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 27 — TÂCHES
-- ═══════════════════════════════════════════════════

CREATE TABLE taches (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branche         VARCHAR(50) NOT NULL,
  type_duree      VARCHAR(20) NOT NULL CHECK (type_duree IN (
                    'court', 'moyen', 'long'
                  )),
  origine         VARCHAR(20) NOT NULL CHECK (origine IN (
                    'automatique', 'manuelle'
                  )),
  titre           VARCHAR(200) NOT NULL,
  description     TEXT,
  priorite        VARCHAR(20) DEFAULT 'normale' CHECK (priorite IN (
                    'rouge', 'orange', 'verte'
                  )),
  statut          VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                    'en_attente', 'assignee', 'en_cours',
                    'bloquee', 'terminee'
                  )),
  assigne_a       UUID REFERENCES membres_admin(id),
  cree_par        UUID REFERENCES membres_admin(id),
  reference_type  VARCHAR(50),
  reference_id    UUID,
  bloquage_motif  TEXT,
  assigne_le      TIMESTAMP,
  termine_le      TIMESTAMP,
  cree_le         TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le   TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 28 — DEMANDES CRÉATION MEMBRE
-- ═══════════════════════════════════════════════════

CREATE TABLE demandes_creation_membre (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demandeur_id      UUID NOT NULL REFERENCES membres_admin(id),
  valideur_n1_id    UUID REFERENCES membres_admin(id),
  nom               VARCHAR(100) NOT NULL,
  prenom            VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL,
  poste             VARCHAR(100) NOT NULL,
  niveau            INTEGER NOT NULL CHECK (niveau BETWEEN 1 AND 4),
  branche           VARCHAR(50) NOT NULL,
  justification     TEXT NOT NULL,
  date_prise_poste  DATE,
  statut            VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                      'en_attente', 'valide_n1',
                      'valide_n0', 'refuse'
                    )),
  commentaire_n1    TEXT,
  commentaire_n0    TEXT,
  traite_le         TIMESTAMP,
  cree_le           TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 29 — DEMANDES NOUVELLE BRANCHE
-- ═══════════════════════════════════════════════════

CREATE TABLE demandes_nouvelle_branche (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demandeur_id    UUID NOT NULL REFERENCES membres_admin(id),
  valideur_n1_id  UUID REFERENCES membres_admin(id),
  nom_branche     VARCHAR(100) NOT NULL,
  justification   TEXT NOT NULL,
  statut          VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                    'en_attente', 'valide_n1',
                    'valide_n0', 'refuse'
                  )),
  commentaire_n1  TEXT,
  commentaire_n0  TEXT,
  traite_le       TIMESTAMP,
  cree_le         TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 30 — URGENCES
-- ═══════════════════════════════════════════════════

CREATE TABLE urgences (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  declarant_id  UUID NOT NULL REFERENCES membres_admin(id),
  concerne_id   UUID NOT NULL REFERENCES membres_admin(id),
  motif         TEXT NOT NULL,
  date_debut    TIMESTAMP NOT NULL DEFAULT NOW(),
  date_fin      TIMESTAMP NOT NULL,
  statut        VARCHAR(20) DEFAULT 'active' CHECK (statut IN (
                  'active', 'expiree', 'annulee'
                )),
  valide_par    UUID REFERENCES membres_admin(id),
  cree_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 31 — HISTORIQUE MODIFICATIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE historique_modifications (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entite_type     VARCHAR(20) NOT NULL CHECK (entite_type IN (
                    'voyageur', 'agence', 'chauffeur', 'membre_admin'
                  )),
  entite_id       UUID NOT NULL,
  champ_modifie   VARCHAR(100) NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  statut          VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
                    'en_attente', 'approuve', 'refuse'
                  )),
  demande_par     UUID,
  approuve_par    UUID,
  approuve_le     TIMESTAMP,
  cree_le         TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 32 — SESSIONS ET TOKENS
-- ═══════════════════════════════════════════════════

CREATE TABLE sessions (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  utilisateur_type  VARCHAR(20) NOT NULL CHECK (utilisateur_type IN (
                      'voyageur', 'agence', 'chauffeur', 'membre_admin'
                    )),
  utilisateur_id    UUID NOT NULL,
  token             TEXT NOT NULL UNIQUE,
  refresh_token     TEXT UNIQUE,
  appareil          VARCHAR(100),
  ip_address        VARCHAR(50),
  actif             BOOLEAN DEFAULT TRUE,
  expire_le         TIMESTAMP NOT NULL,
  cree_le           TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 33 — CODES DOUBLE AUTHENTIFICATION
-- ═══════════════════════════════════════════════════

CREATE TABLE codes_auth (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  membre_id   UUID NOT NULL REFERENCES membres_admin(id),
  code        VARCHAR(10) NOT NULL,
  utilise     BOOLEAN DEFAULT FALSE,
  expire_le   TIMESTAMP NOT NULL,
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 34 — LOGS SYSTÈME
-- ═══════════════════════════════════════════════════

CREATE TABLE logs_systeme (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  acteur_type VARCHAR(20) CHECK (acteur_type IN (
                'voyageur', 'agence', 'chauffeur',
                'membre_admin', 'systeme'
              )),
  acteur_id   UUID,
  action      VARCHAR(100) NOT NULL,
  details     JSONB,
  ip_address  VARCHAR(50),
  est_urgence BOOLEAN DEFAULT FALSE,
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 35 — JOURNAL DE BORD
-- ═══════════════════════════════════════════════════

CREATE TABLE journal_bord (
  id                        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date_rapport              DATE NOT NULL UNIQUE,
  billets_vendus            INTEGER DEFAULT 0,
  nouveaux_clients          INTEGER DEFAULT 0,
  litiges_traites           INTEGER DEFAULT 0,
  remboursements            INTEGER DEFAULT 0,
  revenu_net_jego           INTEGER DEFAULT 0,
  agences_alerte_programme  INTEGER DEFAULT 0,
  litiges_en_attente        INTEGER DEFAULT 0,
  connexions_suspectes      INTEGER DEFAULT 0,
  genere_le                 TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 36 — RAPPORTS MENSUELS AGENCE
-- ═══════════════════════════════════════════════════

CREATE TABLE rapports_mensuels (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agence_id             UUID NOT NULL REFERENCES agences(id),
  mois                  INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee                 INTEGER NOT NULL,
  total_voyages         INTEGER DEFAULT 0,
  total_billets_vendus  INTEGER DEFAULT 0,
  taux_remplissage      DECIMAL(5,2) DEFAULT 0,
  total_revenus         INTEGER DEFAULT 0,
  note_moyenne          DECIMAL(3,2) DEFAULT 0,
  total_retards         INTEGER DEFAULT 0,
  total_annulations     INTEGER DEFAULT 0,
  total_no_show         INTEGER DEFAULT 0,
  genere_le             TIMESTAMP DEFAULT NOW(),
  UNIQUE (agence_id, mois, annee)
);

-- ═══════════════════════════════════════════════════
-- TABLE 37 — DOSSIERS RH
-- ═══════════════════════════════════════════════════

CREATE TABLE dossiers_rh (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  membre_id           UUID NOT NULL REFERENCES membres_admin(id) UNIQUE,
  date_naissance      DATE,
  adresse             VARCHAR(255),
  telephone_perso     VARCHAR(20),
  salaire             INTEGER,
  type_contrat        VARCHAR(50),
  date_debut_contrat  DATE,
  date_fin_contrat    DATE,
  notes_evaluation    TEXT,
  documents_url       TEXT[],
  cree_le             TIMESTAMP DEFAULT NOW(),
  mis_a_jour_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 38 — ABSENCES
-- ═══════════════════════════════════════════════════

CREATE TABLE absences (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  membre_id     UUID NOT NULL REFERENCES membres_admin(id),
  type_absence  VARCHAR(50) CHECK (type_absence IN (
                  'maladie', 'conge', 'autre'
                )),
  date_debut    DATE NOT NULL,
  date_fin      DATE,
  motif         TEXT,
  declare_par   UUID NOT NULL REFERENCES membres_admin(id),
  cree_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 39 — EXPORTS DONNÉES CLIENT
-- ═══════════════════════════════════════════════════

CREATE TABLE exports_donnees (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  voyageur_id UUID NOT NULL REFERENCES voyageurs(id),
  statut      VARCHAR(20) DEFAULT 'en_cours' CHECK (statut IN (
                'en_cours', 'pret', 'expire'
              )),
  fichier_url VARCHAR(255),
  expire_le   TIMESTAMP,
  cree_le     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- TABLE 40 — HISTORIQUE PERMISSIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE historique_permissions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action        VARCHAR(20) NOT NULL CHECK (action IN (
                  'assignee', 'retiree'
                )),
  role_id       UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  fait_par      UUID NOT NULL REFERENCES membres_admin(id),
  cree_le       TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════

CREATE INDEX idx_billets_voyageur ON billets(voyageur_id);
CREATE INDEX idx_billets_trajet ON billets(trajet_id);
CREATE INDEX idx_trajets_date ON trajets(date_depart);
CREATE INDEX idx_trajets_ligne ON trajets(ligne_id);
CREATE INDEX idx_trajets_statut ON trajets(statut);
CREATE INDEX idx_soft_locks_expiry ON soft_locks(expire_le);
CREATE INDEX idx_notifications_destinataire ON notifications(destinataire_id);
CREATE INDEX idx_signalements_trajet ON signalements(trajet_id);
CREATE INDEX idx_logs_acteur ON logs_systeme(acteur_id);
CREATE INDEX idx_taches_statut ON taches(statut);
CREATE INDEX idx_taches_assigne ON taches(assigne_a);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_utilisateur ON sessions(utilisateur_id);
CREATE INDEX idx_membres_nom ON membres_admin(nom, prenom);
CREATE INDEX idx_membres_branche ON membres_admin(branche);
CREATE INDEX idx_absences_membre ON absences(membre_id);
CREATE INDEX idx_dossiers_rh_membre ON dossiers_rh(membre_id);
CREATE INDEX idx_historique_permissions_role ON historique_permissions(role_id);
CREATE INDEX idx_historique_permissions_permission ON historique_permissions(permission_id);