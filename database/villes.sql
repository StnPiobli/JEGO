-- ═══════════════════════════════════════════════════
-- JEGO — Table des villes (structure propre + 50 villes)
-- code        : technique, minuscules sans accent (stocké partout)
-- nom_affiche : joli nom avec accents (affiché au client)
-- abreviations: pour l'autocomplétion progressive
-- ═══════════════════════════════════════════════════

-- On supprime l'ancienne table villes et on la recrée proprement
DROP TABLE IF EXISTS villes CASCADE;

CREATE TABLE villes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  nom_affiche VARCHAR(100) NOT NULL,
  abreviations TEXT[] DEFAULT '{}',
  region VARCHAR(50),
  pays VARCHAR(50) DEFAULT 'Cameroun',
  actif BOOLEAN DEFAULT true,
  cree_le TIMESTAMP DEFAULT NOW()
);

-- Index pour accélérer la recherche par code
CREATE INDEX idx_villes_code ON villes(code);

-- ── Insertion des 50 principales villes du Cameroun ──
INSERT INTO villes (code, nom_affiche, abreviations, region) VALUES
('douala',      'Douala',       '{dla,dou}',        'Littoral'),
('yaounde',     'Yaoundé',      '{yde,yao}',        'Centre'),
('bafoussam',   'Bafoussam',    '{baf,bafou}',      'Ouest'),
('bamenda',     'Bamenda',      '{bda,bam}',        'Nord-Ouest'),
('garoua',      'Garoua',       '{gar,garo}',       'Nord'),
('maroua',      'Maroua',       '{mar,maro}',       'Extrême-Nord'),
('ngaoundere',  'Ngaoundéré',   '{nga,ngaou}',      'Adamaoua'),
('bertoua',     'Bertoua',      '{ber,berto}',      'Est'),
('buea',        'Buea',         '{bue,bua}',        'Sud-Ouest'),
('ebolowa',     'Ebolowa',      '{ebo,ebol}',       'Sud'),
('kribi',       'Kribi',        '{kri,krib}',       'Sud'),
('limbe',       'Limbé',        '{lim,limb}',       'Sud-Ouest'),
('edea',        'Edéa',         '{ede,edea}',       'Littoral'),
('kumba',       'Kumba',        '{kum,kumb}',       'Sud-Ouest'),
('nkongsamba',  'Nkongsamba',   '{nko,nkong}',      'Littoral'),
('dschang',     'Dschang',      '{dsc,dsch}',       'Ouest'),
('foumban',     'Foumban',      '{fou,foum}',       'Ouest'),
('mbouda',      'Mbouda',       '{mbo,mboud}',      'Ouest'),
('bafia',       'Bafia',        '{bafi,bfa}',       'Centre'),
('mbalmayo',    'Mbalmayo',     '{mba,mbal}',       'Centre'),
('sangmelima',  'Sangmélima',   '{san,sang}',       'Sud'),
('kumbo',       'Kumbo',        '{kmb,kumbo}',      'Nord-Ouest'),
('wum',         'Wum',          '{wum}',            'Nord-Ouest'),
('mamfe',       'Mamfé',        '{mam,mamf}',       'Sud-Ouest'),
('tiko',        'Tiko',         '{tik,tiko}',       'Sud-Ouest'),
('mutengene',   'Mutengene',    '{mut,mute}',       'Sud-Ouest'),
('bali',        'Bali',         '{bali}',           'Nord-Ouest'),
('bandjoun',    'Bandjoun',     '{ban,bandj}',      'Ouest'),
('bangangte',   'Bangangté',    '{bang,bgt}',       'Ouest'),
('melong',      'Melong',       '{mel,melo}',       'Littoral'),
('loum',        'Loum',         '{lou,loum}',       'Littoral'),
('mbanga',      'Mbanga',       '{mbg,mbang}',      'Littoral'),
('penja',       'Penja',        '{pen,penj}',       'Littoral'),
('manjo',       'Manjo',        '{man,manj}',       'Littoral'),
('eseka',       'Éséka',        '{ese,esek}',       'Centre'),
('akonolinga',  'Akonolinga',   '{ako,akon}',       'Centre'),
('obala',       'Obala',        '{oba,obal}',       'Centre'),
('mfou',        'Mfou',         '{mfo,mfou}',       'Centre'),
('monatele',    'Monatélé',     '{mon,mona}',       'Centre'),
('guider',      'Guider',       '{gui,guid}',       'Nord'),
('garoua-boulai','Garoua-Boulaï','{gbl,garbou}',    'Est'),
('batouri',     'Batouri',      '{bat,bato}',       'Est'),
('abong-mbang', 'Abong-Mbang',  '{abo,abong}',      'Est'),
('kousseri',    'Kousséri',     '{kou,kous}',       'Extrême-Nord'),
('kaele',       'Kaélé',        '{kae,kael}',       'Extrême-Nord'),
('mokolo',      'Mokolo',       '{mok,moko}',       'Extrême-Nord'),
('yagoua',      'Yagoua',       '{yag,yago}',       'Extrême-Nord'),
('tibati',      'Tibati',       '{tib,tiba}',       'Adamaoua'),
('meiganga',    'Meiganga',     '{mei,meig}',       'Adamaoua'),
('banyo',       'Banyo',        '{bny,bany}',       'Adamaoua');

-- Vérification du nombre de villes insérées
SELECT COUNT(*) AS nombre_villes FROM villes;