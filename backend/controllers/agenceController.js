const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const { lireMultipart } = require('../utils/multipart');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');
const { envoyerEmailDirect } = require('../services/notificationService');

// ═══════════════════════════════════════════════════
// INSCRIPTION D'UNE AGENCE
// ═══════════════════════════════════════════════════
async function inscription(req, res) {
  try {
    const {
      nom, email, telephone, adresse, ville,
      registre_commerce, mot_de_passe
    } = req.body;

    // Vérifier les champs obligatoires
    if (!nom || !email || !telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Nom, email, téléphone et mot de passe sont obligatoires' });
    }

    // Vérifier si l'email existe déjà
    const emailExiste = await pool.query('SELECT id FROM agences WHERE email = $1', [email]);
    if (emailExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Vérifier si le téléphone existe déjà
    const telExiste = await pool.query('SELECT id FROM agences WHERE telephone = $1', [telephone]);
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Chiffrer le mot de passe
    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    // Créer l'agence (statut en_attente par défaut)
    const resultat = await pool.query(
      `INSERT INTO agences
        (nom, email, telephone, adresse, ville, registre_commerce, mot_de_passe)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nom, email, telephone, ville, statut, badge_certifie`,
      [nom, email, telephone, adresse, ville, registre_commerce, motDePasseChiffre]
    );

    const agence = resultat.rows[0];

    res.status(201).json({
      message: 'Inscription réussie. Votre agence est en attente de validation par JEGO.',
      agence
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONNEXION D'UNE AGENCE
// ═══════════════════════════════════════════════════
async function connexion(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Chercher l'agence
    const resultat = await pool.query('SELECT * FROM agences WHERE email = $1', [email]);

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const agence = resultat.rows[0];

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(mot_de_passe, agence.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer un token
    const token = genererToken({ id: agence.id, type: 'agence' });

    res.json({
      message: 'Connexion réussie',
      agence: {
        id: agence.id,
        nom: agence.nom,
        email: agence.email,
        telephone: agence.telephone,
        ville: agence.ville,
        statut: agence.statut,
        badge_certifie: agence.badge_certifie
      },
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VOIR SON PROFIL (route protégée)
// ═══════════════════════════════════════════════════
async function monProfil(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT id, nom, email, telephone, adresse, ville,
              registre_commerce, logo_url, badge_certifie, statut,
              langue, cree_le, description, contact_directeur,
              telephone_secondaire, mode_reception, numero_reception,
              titulaire_reception, instructions_reception
       FROM agences WHERE id = $1`,
      [agenceId]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    res.json({ agence: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// ═══════════════════════════════════════════════════
// TÉLÉVERSER UN DOCUMENT (côté agence)
// L'agence envoie ses pièces depuis son espace ; l'admin les consulte
// ensuite sur la fiche de l'agence.
// ═══════════════════════════════════════════════════
const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads', 'agences');
const TYPES_MIME_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

async function televerserDocument(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;

    let resultat;
    try {
      resultat = await lireMultipart(req, TAILLE_MAX_OCTETS);
    } catch (err) {
      if (err.message === 'TAILLE_DEPASSEE') {
        return res.status(413).json({ error: 'Fichier trop lourd (8 Mo maximum)' });
      }
      return res.status(400).json({ error: err.message });
    }

    const { champs, fichier } = resultat;
    if (!fichier || !fichier.donnees || fichier.donnees.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    if (!TYPES_MIME_AUTORISES.includes(fichier.type)) {
      return res.status(400).json({
        error: 'Format non accepté. Envoie un PDF ou une image (JPEG, PNG, WebP).'
      });
    }
    const typeDocument = (champs.type_document || '').trim();
    if (!typeDocument) {
      return res.status(400).json({ error: 'Précise de quel document il s\'agit' });
    }

    // Nom de stockage aléatoire : le nom d'origine n'est jamais utilisé
    // pour construire un chemin, ce qui évite toute remontée d'arborescence.
    const extensions = {
      'application/pdf': '.pdf', 'image/jpeg': '.jpg',
      'image/png': '.png', 'image/webp': '.webp'
    };
    const nomStocke = crypto.randomBytes(16).toString('hex') + extensions[fichier.type];

    fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
    fs.writeFileSync(path.join(DOSSIER_UPLOADS, nomStocke), fichier.donnees);

    const enregistre = await pool.query(
      `INSERT INTO documents_agence
        (agence_id, type_document, nom_fichier, fichier_stocke, taille_octets, type_mime)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type_document, nom_fichier, taille_octets, statut, televerse_le`,
      [agenceId, typeDocument, fichier.nom, nomStocke, fichier.donnees.length, fichier.type]
    );

    res.status(201).json({ message: 'Document envoyé', document: enregistre.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MES DOCUMENTS (côté agence)
// ═══════════════════════════════════════════════════
async function mesDocuments(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const documents = await pool.query(
      `SELECT id, type_document, nom_fichier, taille_octets, statut, televerse_le
       FROM documents_agence WHERE agence_id = $1 ORDER BY televerse_le DESC`,
      [req.utilisateur.id]
    );
    const demandes = await pool.query(
      `SELECT id, pieces, statut, cree_le FROM demandes_pieces
       WHERE agence_id = $1 AND statut = 'ouverte' ORDER BY cree_le DESC`,
      [req.utilisateur.id]
    );
    res.json({ documents: documents.rows, demandes_ouvertes: demandes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// SUPPRIMER UN DE MES DOCUMENTS (côté agence)
// Impossible une fois qu'un admin l'a vérifié : sinon une agence pourrait
// faire disparaître une pièce déjà contrôlée.
// ═══════════════════════════════════════════════════
async function supprimerMonDocument(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const doc = await pool.query(
      `SELECT id, fichier_stocke, statut FROM documents_agence
       WHERE id = $1 AND agence_id = $2`,
      [req.params.id, req.utilisateur.id]
    );
    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Document introuvable' });
    }
    if (doc.rows[0].statut === 'verifie') {
      return res.status(403).json({ error: 'Ce document a déjà été vérifié par JEGO et ne peut plus être retiré' });
    }

    const chemin = path.join(DOSSIER_UPLOADS, path.basename(doc.rows[0].fichier_stocke));
    if (fs.existsSync(chemin)) fs.unlinkSync(chemin);
    await pool.query(`DELETE FROM documents_agence WHERE id = $1`, [req.params.id]);

    res.json({ message: 'Document retiré' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// NOTIFICATIONS — sidebar agence
// Trois sources réelles : litiges ouverts sans réponse, programme sous
// le seuil d'alerte (réutilise la même logique que la relance email
// quotidienne), versements escrow bloqués au-delà du délai normal de 6h.
// ═══════════════════════════════════════════════════
function formatRelatif(date) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `Il y a ${heures} h`;
  return `Il y a ${Math.floor(heures / 24)} j`;
}

async function mesNotifications(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const notifications = [];

    const litiges = await pool.query(
      `SELECT id, numero, motif, cree_le FROM litiges
       WHERE agence_id = $1 AND statut = 'ouvert' AND reponse_agence IS NULL
       ORDER BY cree_le DESC`,
      [agenceId]
    );
    litiges.rows.forEach((l) => {
      notifications.push({
        id: `litige-${l.id}`,
        titre: 'Nouveau litige',
        texte: `${l.numero} — ${l.motif}`,
        heure: formatRelatif(l.cree_le),
        lien: '/litiges',
      });
    });

    const { calculerHorizon } = require('../services/programmationService');
    const horizon = await calculerHorizon(agenceId);
    if (horizon && !horizon.conforme) {
      notifications.push({
        id: 'programme',
        titre: 'Programme incomplet',
        texte: horizon.message,
        heure: '',
        lien: '/trajets',
      });
    }

    const versements = await pool.query(
      `SELECT COUNT(*) AS nb FROM escrow e
       JOIN billets b ON b.id = e.billet_id
       JOIN trajets t ON t.id = b.trajet_id
       WHERE t.agence_id = $1 AND e.statut = 'retenu'
         AND t.statut = 'termine' AND t.versement_escrow_le IS NOT NULL
         AND t.versement_escrow_le < NOW()`,
      [agenceId]
    );
    const nbVersements = parseInt(versements.rows[0].nb);
    if (nbVersements > 0) {
      notifications.push({
        id: 'versements',
        titre: 'Versement en attente',
        texte: `${nbVersements} versement(s) resté(s) bloqué(s) dans l'escrow au-delà du délai normal`,
        heure: '',
        lien: '/paiements',
      });
    }

    res.json({ notifications });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// TABLEAU DE BORD — écran d'accueil agence
// Trajets aujourd'hui (+ comparaison réelle avec hier), bus actifs,
// top destinations sur les 30 derniers jours.
// ═══════════════════════════════════════════════════
async function tableauDeBord(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const trajetsAuj = await pool.query(
      `SELECT COUNT(*) AS nb FROM trajets WHERE agence_id = $1 AND date_depart = CURRENT_DATE AND statut != 'annule'`,
      [agenceId]
    );
    const trajetsHier = await pool.query(
      `SELECT COUNT(*) AS nb FROM trajets WHERE agence_id = $1 AND date_depart = CURRENT_DATE - INTERVAL '1 day' AND statut != 'annule'`,
      [agenceId]
    );
    const bus = await pool.query(
      `SELECT COUNT(*) AS nb FROM bus WHERE agence_id = $1 AND statut != 'inactif'`,
      [agenceId]
    );
    const destinations = await pool.query(
      `SELECT vd.nom_affiche || ' -> ' || va.nom_affiche AS route, COUNT(b.id) AS nb
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       WHERE t.agence_id = $1 AND b.statut IN ('confirme', 'utilise')
         AND t.date_depart >= NOW() - INTERVAL '30 days'
       GROUP BY vd.nom_affiche, va.nom_affiche
       ORDER BY nb DESC LIMIT 3`,
      [agenceId]
    );

    const nbAuj = parseInt(trajetsAuj.rows[0].nb);
    const nbHier = parseInt(trajetsHier.rows[0].nb);
    const variationTrajets = nbHier > 0 ? Math.round(((nbAuj - nbHier) / nbHier) * 1000) / 10 : null;

    res.json({
      trajetsAujourdhui: nbAuj,
      trajetsHier: nbHier,
      variationTrajets,
      busActifs: parseInt(bus.rows[0].nb),
      topDestinations: destinations.rows.map((d) => ({ nom: d.route, reservations: parseInt(d.nb) })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODIFIER LE PROFIL (agence)
// Tous les champs sont optionnels à la marge (COALESCE) — seuls ceux
// envoyés sont mis à jour, le reste reste inchangé.
// ═══════════════════════════════════════════════════
async function modifierProfil(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const {
      nom, email, telephone, adresse, description,
      contact_directeur, telephone_secondaire,
      mode_reception, numero_reception, titulaire_reception, instructions_reception
    } = req.body;

    const resultat = await pool.query(
      `UPDATE agences SET
        nom = COALESCE($1, nom),
        email = COALESCE($2, email),
        telephone = COALESCE($3, telephone),
        adresse = COALESCE($4, adresse),
        description = COALESCE($5, description),
        contact_directeur = COALESCE($6, contact_directeur),
        telephone_secondaire = COALESCE($7, telephone_secondaire),
        mode_reception = COALESCE($8, mode_reception),
        numero_reception = COALESCE($9, numero_reception),
        titulaire_reception = COALESCE($10, titulaire_reception),
        instructions_reception = COALESCE($11, instructions_reception),
        mis_a_jour_le = NOW()
       WHERE id = $12
       RETURNING id, nom, email, telephone, adresse, description,
                 contact_directeur, telephone_secondaire, mode_reception,
                 numero_reception, titulaire_reception, instructions_reception`,
      [nom, email, telephone, adresse, description, contact_directeur,
       telephone_secondaire, mode_reception, numero_reception,
       titulaire_reception, instructions_reception, agenceId]
    );

    res.json({ message: 'Profil mis à jour', agence: resultat.rows[0] });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet email ou ce téléphone est déjà utilisé par une autre agence.' });
    }
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// ENVOYER UN CODE D'ACCÈS AU PROFIL (par email, au directeur)
// Un nouveau code écrase et invalide automatiquement le précédent —
// l'ancien code, s'il existait, n'est plus vérifiable nulle part.
// ═══════════════════════════════════════════════════
async function envoyerCodeAcces(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const agence = await pool.query('SELECT contact_directeur FROM agences WHERE id = $1', [agenceId]);
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }
    const emailDirecteur = agence.rows[0].contact_directeur;
    if (!emailDirecteur) {
      return res.status(400).json({ error: 'Aucun email de directeur enregistré pour l\'instant.' });
    }

    const code = String(crypto.randomInt(10000000, 99999999));
    const expiration = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `UPDATE agences SET code_acces_profil = $1, code_acces_expiration = $2, code_acces_utilise = false WHERE id = $3`,
      [code, expiration, agenceId]
    );

    const envoye = await envoyerEmailDirect(
      emailDirecteur,
      'Code d\'accès au profil JEGO',
      `Votre code d'accès temporaire est : ${code}\n\nValable 5 minutes, à usage unique. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`
    );

    if (!envoye) {
      return res.status(500).json({ error: 'Échec de l\'envoi de l\'email. Vérifie l\'email du directeur, ou réessaie.' });
    }

    res.json({ message: `Code envoyé à ${emailDirecteur}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VÉRIFIER LE CODE D'ACCÈS AU PROFIL
// ═══════════════════════════════════════════════════
async function verifierCodeAcces(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code requis' });
    }

    const resultat = await pool.query(
      'SELECT code_acces_profil, code_acces_expiration, code_acces_utilise FROM agences WHERE id = $1',
      [agenceId]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }
    const a = resultat.rows[0];

    if (!a.code_acces_profil || a.code_acces_utilise) {
      return res.status(400).json({ valide: false, error: 'Aucun code actif — demande-en un nouveau.' });
    }
    if (new Date() > new Date(a.code_acces_expiration)) {
      return res.status(400).json({ valide: false, error: 'Code expiré — demande-en un nouveau.' });
    }
    if (code !== a.code_acces_profil) {
      return res.status(401).json({ valide: false, error: 'Code incorrect.' });
    }

    await pool.query('UPDATE agences SET code_acces_utilise = true WHERE id = $1', [agenceId]);

    res.json({ valide: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CHANGER LE MOT DE PASSE (agence)
// L'ancien mot de passe est obligatoire pour confirmer.
// ═══════════════════════════════════════════════════
async function changerMotDePasseAgence(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return res.status(400).json({ error: 'Ancien et nouveau mot de passe requis' });
    }
    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
    }

    const resultat = await pool.query('SELECT mot_de_passe FROM agences WHERE id = $1', [agenceId]);
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    const valide = await bcrypt.compare(ancien_mot_de_passe, resultat.rows[0].mot_de_passe);
    if (!valide) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    }

    const nouveauHash = await bcrypt.hash(nouveau_mot_de_passe, 10);
    await pool.query(
      'UPDATE agences SET mot_de_passe = $1, mis_a_jour_le = NOW() WHERE id = $2',
      [nouveauHash, agenceId]
    );

    res.json({ message: 'Mot de passe mis à jour' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// TÉLÉVERSER LE LOGO (agence)
// Réutilise le même mécanisme multipart que televerserDocument, dans
// un sous-dossier séparé — ce n'est pas un document officiel.
// ═══════════════════════════════════════════════════
const DOSSIER_LOGOS = path.join(__dirname, '..', 'uploads', 'agences', 'logos');
const TYPES_MIME_LOGO = ['image/jpeg', 'image/png', 'image/webp'];

async function televerserLogo(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    let resultat;
    try {
      resultat = await lireMultipart(req, TAILLE_MAX_OCTETS);
    } catch (err) {
      if (err.message === 'TAILLE_DEPASSEE') {
        return res.status(413).json({ error: 'Image trop lourde (8 Mo maximum)' });
      }
      return res.status(400).json({ error: err.message });
    }

    const { fichier } = resultat;
    if (!fichier || !fichier.donnees || fichier.donnees.length === 0) {
      return res.status(400).json({ error: 'Aucune image reçue' });
    }
    if (!TYPES_MIME_LOGO.includes(fichier.type)) {
      return res.status(400).json({ error: 'Format non accepté. Envoie une image JPEG, PNG ou WebP.' });
    }

    const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const nomStocke = crypto.randomBytes(16).toString('hex') + extensions[fichier.type];

    fs.mkdirSync(DOSSIER_LOGOS, { recursive: true });
    fs.writeFileSync(path.join(DOSSIER_LOGOS, nomStocke), fichier.donnees);

    const logoUrl = `/uploads/agences/logos/${nomStocke}`;
    await pool.query('UPDATE agences SET logo_url = $1, mis_a_jour_le = NOW() WHERE id = $2', [logoUrl, agenceId]);

    res.json({ message: 'Logo mis à jour', logo_url: logoUrl });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { inscription, connexion, monProfil, televerserDocument, mesDocuments, supprimerMonDocument, mesNotifications, tableauDeBord, modifierProfil, changerMotDePasseAgence, televerserLogo, envoyerCodeAcces, verifierCodeAcces };