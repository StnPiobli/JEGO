import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

import 'session.dart';

/// ═══════════════════════════════════════════════════════════════
/// COUCHE API JEGO — appels réels vers le backend
///
/// Aucune donnée fictive ici. Chaque méthode parle au vrai serveur
/// et convertit la réponse dans EXACTEMENT la forme attendue par les
/// écrans existants, pour que le branchement ne change rien au
/// visuel déjà validé.
///
/// L'adresse du serveur dépend de la plateforme :
///   - émulateur Android : 10.0.2.2 (alias de la machine hôte)
///   - navigateur / iOS / bureau : localhost
/// En production, renseigner ApiConfig.baseUrlProduction.
/// ═══════════════════════════════════════════════════════════════

class ApiConfig {
  /// Adresse du serveur en production. Laisser vide tant que le
  /// serveur n'est pas déployé : l'app utilisera alors l'adresse
  /// locale de développement.
  static const String baseUrlProduction = '';

  /// Port du serveur Node (voir backend/.env)
  static const int port = 3000;

  static String get baseUrl {
    if (baseUrlProduction.isNotEmpty) return baseUrlProduction;
    if (kIsWeb) return 'http://localhost:$port';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:$port';
    } catch (_) {
      // Platform indisponible (web) : on retombe sur localhost
    }
    return 'http://localhost:$port';
  }

  // ── Routes (miroir de backend/server.js) ──
  static String get rechercheTrajets => '$baseUrl/api/recherche/trajets';
  static String get villesAutocompletion => '$baseUrl/api/villes/autocompletion';
  static String get inscription => '$baseUrl/api/voyageurs/inscription';
  static String get connexion => '$baseUrl/api/voyageurs/connexion';
  static String get profil => '$baseUrl/api/voyageurs/profil';
  static String get historique => '$baseUrl/api/voyageurs/historique';
  static String get verrou => '$baseUrl/api/reservations/verrou';
  static String get payer => '$baseUrl/api/reservations/payer';
  static String get scanner => '$baseUrl/api/reservations/scanner';
  static String get avis => '$baseUrl/api/avis';
  static String get litiges => '$baseUrl/api/litiges';
  static String get denonciations => '$baseUrl/api/denonciations';
  static String get signalements => '$baseUrl/api/signalements';
  static String get connexionChauffeur => '$baseUrl/api/chauffeurs/connexion';
  static String get mesTrajetsChauffeur => '$baseUrl/api/chauffeurs/mes-trajets';
  static String planTrajet(String trajetId) =>
      '$baseUrl/api/reservations/trajets/$trajetId/plan';
  static String agence(String id) => '$baseUrl/api/agences/$id';
  static String avisAgence(String id) => '$baseUrl/api/avis/agences/$id';
}

/// Erreur renvoyée par le backend, avec le message exact à afficher
/// sous le champ concerné (jamais de snackbar).
class ErreurApi implements Exception {
  final String message;
  final int? statut;
  ErreurApi(this.message, [this.statut]);
  @override
  String toString() => message;
}

class ApiService {
  static const Duration _delai = Duration(seconds: 20);

  static Map<String, String> _entetes({bool authentifie = false, String? cleIdempotence}) {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (authentifie && Session.token != null) {
      h['Authorization'] = 'Bearer ${Session.token}';
    }
    if (cleIdempotence != null) {
      h['Idempotency-Key'] = cleIdempotence;
    }
    return h;
  }

  /// Décode la réponse et lève une ErreurApi porteuse du message
  /// exact du backend, pour affichage sous le champ concerné.
  static dynamic _traiter(http.Response r) {
    dynamic corps;
    try {
      corps = jsonDecode(utf8.decode(r.bodyBytes));
    } catch (_) {
      corps = null;
    }
    if (r.statusCode >= 200 && r.statusCode < 300) return corps;

    final message = (corps is Map && corps['error'] != null)
        ? corps['error'].toString()
        : 'Une erreur est survenue (code ${r.statusCode})';
    throw ErreurApi(message, r.statusCode);
  }

  static Future<dynamic> _get(String url, {bool authentifie = false}) async {
    try {
      final r = await http
          .get(Uri.parse(url), headers: _entetes(authentifie: authentifie))
          .timeout(_delai);
      return _traiter(r);
    } on ErreurApi {
      rethrow;
    } catch (e) {
      throw ErreurApi('Connexion au serveur impossible. Vérifiez votre réseau.');
    }
  }

  static Future<dynamic> _post(String url, Map<String, dynamic> corps,
      {bool authentifie = false, String? cleIdempotence}) async {
    try {
      final r = await http
          .post(Uri.parse(url),
              headers: _entetes(authentifie: authentifie, cleIdempotence: cleIdempotence),
              body: jsonEncode(corps))
          .timeout(_delai);
      return _traiter(r);
    } on ErreurApi {
      rethrow;
    } catch (e) {
      throw ErreurApi('Connexion au serveur impossible. Vérifiez votre réseau.');
    }
  }

  static Future<dynamic> _put(String url, Map<String, dynamic> corps,
      {bool authentifie = true}) async {
    try {
      final r = await http
          .put(Uri.parse(url), headers: _entetes(authentifie: authentifie), body: jsonEncode(corps))
          .timeout(_delai);
      return _traiter(r);
    } on ErreurApi {
      rethrow;
    } catch (e) {
      throw ErreurApi('Connexion au serveur impossible. Vérifiez votre réseau.');
    }
  }

  // ═══════════════════════════════════════════════════
  // AUTHENTIFICATION VOYAGEUR
  // ═══════════════════════════════════════════════════

  /// Le backend attend le TÉLÉPHONE, pas l'email.
  static Future<void> connecter({
    required String telephone,
    required String motDePasse,
  }) async {
    final rep = await _post(ApiConfig.connexion, {
      'telephone': telephone,
      'mot_de_passe': motDePasse,
    });
    final v = rep['voyageur'] ?? {};
    Session.ouvrir(
      pNom: (v['nom'] ?? '').toString(),
      pPrenom: (v['prenom'] ?? '').toString(),
      pTelephone: (v['telephone'] ?? telephone).toString(),
      pEmail: (v['email'] ?? '').toString(),
      pToken: rep['token']?.toString(),
    );
    if (v['id'] != null) Session.voyageurId = v['id'].toString();
    if (v['points_fidelite'] != null) {
      Session.pointsFidelite = int.tryParse('${v['points_fidelite']}') ?? 0;
    }
  }

  static Future<void> inscrire({
    required String nom,
    required String prenom,
    required String dateNaissance, // AAAA-MM-JJ
    required String lieuNaissance,
    required String telephone,
    required String email,
    required String motDePasse,
    String? contactUrgence,
  }) async {
    await _post(ApiConfig.inscription, {
      'nom': nom,
      'prenom': prenom,
      'date_naissance': dateNaissance,
      'lieu_naissance': lieuNaissance,
      'telephone': telephone,
      'email': email,
      'mot_de_passe': motDePasse,
      if (contactUrgence != null && contactUrgence.isNotEmpty)
        'contact_urgence': contactUrgence,
    });
    // Inscription réussie : on enchaîne sur la connexion pour obtenir
    // le jeton, l'utilisateur n'a pas à ressaisir ses identifiants.
    await connecter(telephone: telephone, motDePasse: motDePasse);
  }

  static Future<Map<String, dynamic>> monProfil() async {
    final rep = await _get(ApiConfig.profil, authentifie: true);
    return Map<String, dynamic>.from(rep['voyageur'] ?? rep);
  }

  // ═══════════════════════════════════════════════════
  // RECHERCHE DE TRAJETS
  //
  // Convertit la réponse backend vers la forme exacte utilisée par
  // les écrans (mêmes clés que les anciennes offres locales), afin
  // que l'affichage reste identique.
  // ═══════════════════════════════════════════════════
  static Future<List<Map<String, dynamic>>> rechercherTrajets({
    required String villeDepart,
    required String villeArrivee,
    required String date, // AAAA-MM-JJ
  }) async {
    final url = Uri.parse(ApiConfig.rechercheTrajets).replace(queryParameters: {
      'ville_depart': villeDepart,
      'ville_arrivee': villeArrivee,
      'date_depart': date,
    }).toString();

    final rep = await _get(url);
    final trajets = (rep['trajets'] as List?) ?? [];
    return trajets.map<Map<String, dynamic>>((t) => _versOffre(t)).toList();
  }

  /// Traduction backend -> forme attendue par l'interface.
  static Map<String, dynamic> _versOffre(dynamic t) {
    final arrets = (t['arrets_restants'] as List?) ?? [];

    final equipements = <String>[];
    if (t['climatisation'] == true) equipements.add('clim');
    if (t['prises_usb'] == true) equipements.add('usb');
    if (t['wifi'] == true) equipements.add('wifi');
    if (t['toilettes'] == true) equipements.add('toilettes');
    if (t['sieges_inclinables'] == true) equipements.add('inclinable');

    String heure(dynamic v) {
      if (v == null) return '--:--';
      final s = v.toString();
      return s.length >= 5 ? s.substring(0, 5) : s;
    }

    String categorie(dynamic v) {
      final s = (v ?? 'standard').toString().toLowerCase();
      if (s == 'vip') return 'VIP';
      return s[0].toUpperCase() + s.substring(1);
    }

    return {
      'id': t['id'],
      'trajet_id': t['id'],
      'heure_depart': heure(t['heure_depart']),
      'heure_arrivee': heure(t['heure_arrivee_estimee']),
      'nom_agence': t['nom_agence'] ?? '',
      'agence_id': t['agence_id'],
      'note_moyenne': double.tryParse('${t['note_moyenne'] ?? 0}') ?? 0.0,
      'nombre_avis': int.tryParse('${t['nombre_avis'] ?? 0}') ?? 0,
      'badge_certifie': t['badge_certifie'] == true,
      'prix': int.tryParse('${t['prix'] ?? 0}') ?? 0,
      'categorie': categorie(t['categorie']),
      'nombre_arrets': arrets.length,
      'arrets_liste': arrets.map((a) => '${a['ville'] ?? ''}').toList(),
      'equipements': equipements,
      'places_disponibles': int.tryParse('${t['places_disponibles'] ?? 0}') ?? 0,
      'point_depart': t['lieu_embarquement'] ?? t['depart_affiche'] ?? '',
      'point_arrivee': t['arrivee_affiche'] ?? '',
      'depart_affiche': t['depart_affiche'] ?? '',
      'arrivee_affiche': t['arrivee_affiche'] ?? '',
      'nom_bus': t['nom_bus'] ?? '',
      'disposition': t['disposition'] ?? '2+2',
      // Ordres de segment : indispensables pour réserver le bon tronçon
      'ordre_depart': int.tryParse('${t['ordre_depart'] ?? 0}') ?? 0,
      'ordre_arrivee': int.tryParse('${t['ordre_arrivee'] ?? 1}') ?? 1,
      'est_direct': t['est_direct'] == true,
    };
  }

  // ═══════════════════════════════════════════════════
  // VILLES (autocomplétion réelle)
  // ═══════════════════════════════════════════════════
  static Future<List<Map<String, dynamic>>> chercherVilles(String saisie) async {
    if (saisie.trim().isEmpty) return [];
    final url = Uri.parse(ApiConfig.villesAutocompletion)
        .replace(queryParameters: {'q': saisie.trim()}).toString();
    final rep = await _get(url);
    final villes = (rep['villes'] as List?) ?? [];
    return villes.map<Map<String, dynamic>>((v) => {
          'code': v['code'],
          'nom': v['nom_affiche'] ?? v['code'],
          'region': v['region'] ?? '',
        }).toList();
  }

  // ═══════════════════════════════════════════════════
  // PLAN DU BUS ET SIÈGES
  // ═══════════════════════════════════════════════════
  static Future<Map<String, dynamic>> planTrajet(String trajetId) async {
    final rep = await _get(ApiConfig.planTrajet(trajetId));
    return Map<String, dynamic>.from(rep);
  }

  /// Verrouille un siège sur un segment précis (soft lock).
  static Future<Map<String, dynamic>> verrouillerSiege({
    required String trajetId,
    required String siegeId,
    int ordreDepart = 0,
    int ordreArrivee = 1,
  }) async {
    final rep = await _post(
      ApiConfig.verrou,
      {
        'trajet_id': trajetId,
        'siege_id': siegeId,
        'point_embarquement_ordre': ordreDepart,
        'point_debarquement_ordre': ordreArrivee,
      },
      authentifie: true,
    );
    return Map<String, dynamic>.from(rep);
  }

  // ═══════════════════════════════════════════════════
  // PAIEMENT
  //
  // La clé d'idempotence est générée UNE fois au moment où le
  // voyageur appuie sur « Payer » et réutilisée telle quelle en cas
  // de nouvel essai : un double-clic ou une reprise réseau ne crée
  // jamais un second billet ni un second débit.
  // ═══════════════════════════════════════════════════
  static Future<Map<String, dynamic>> payer({
    required String trajetId,
    required String siegeId,
    required String operateur, // mtn_momo | orange_money
    required String cleIdempotence,
    int ordreDepart = 0,
    int ordreArrivee = 1,
    bool siegePremium = false,
    int supplementBagage = 0,
    bool billetFlexible = false,
    bool estCadeau = false,
    String? destinataireTel,
    String? destinataireEmail,
    bool utiliserReduction = false,
    bool utiliserGratuit = false,
  }) async {
    final rep = await _post(
      ApiConfig.payer,
      {
        'trajet_id': trajetId,
        'siege_id': siegeId,
        'operateur': operateur,
        'point_embarquement_ordre': ordreDepart,
        'point_debarquement_ordre': ordreArrivee,
        'est_premium_choisi': siegePremium,
        'supplement_bagage': supplementBagage,
        'est_flexible': billetFlexible,
        'est_cadeau': estCadeau,
        if (destinataireTel != null) 'destinataire_tel': destinataireTel,
        if (destinataireEmail != null) 'destinataire_email': destinataireEmail,
        'utiliser_reduction': utiliserReduction,
        'utiliser_gratuit': utiliserGratuit,
      },
      authentifie: true,
      cleIdempotence: cleIdempotence,
    );
    return Map<String, dynamic>.from(rep);
  }

  // ═══════════════════════════════════════════════════
  // BILLETS / HISTORIQUE
  // ═══════════════════════════════════════════════════
  static Future<List<Map<String, dynamic>>> mesBillets() async {
    final rep = await _get(ApiConfig.historique, authentifie: true);
    final liste = (rep['voyages'] ?? rep['billets'] ?? rep['historique']) as List? ?? [];
    return liste.map<Map<String, dynamic>>((b) => Map<String, dynamic>.from(b)).toList();
  }

  static Future<void> annulerBillet(String billetId) async {
    await _put('${ApiConfig.baseUrl}/api/annulations/billets/$billetId/annuler', {});
  }

  // ═══════════════════════════════════════════════════
  // AGENCE (profil public + avis)
  // ═══════════════════════════════════════════════════
  static Future<Map<String, dynamic>> profilAgence(String agenceId) async {
    final rep = await _get(ApiConfig.agence(agenceId));
    return Map<String, dynamic>.from(rep['agence'] ?? rep);
  }

  static Future<Map<String, dynamic>> avisDeLAgence(String agenceId) async {
    final rep = await _get(ApiConfig.avisAgence(agenceId));
    return Map<String, dynamic>.from(rep);
  }

  // ═══════════════════════════════════════════════════
  // APRÈS VOYAGE : notation, signalement, dénonciation
  // ═══════════════════════════════════════════════════
  static Future<void> noterVoyage({
    required String trajetId,
    required int noteService,
    required int noteConduite,
    required int noteHoraires,
    required int noteConfort,
    String? commentaire,
  }) async {
    await _post(
      ApiConfig.avis,
      {
        'trajet_id': trajetId,
        'note_service': noteService,
        'note_conduite': noteConduite,
        'note_horaires': noteHoraires,
        'note_confort': noteConfort,
        if (commentaire != null && commentaire.isNotEmpty) 'commentaire': commentaire,
      },
      authentifie: true,
    );
  }

  static Future<Map<String, dynamic>> signaler({
    required String trajetId,
    required String categorie,
    String? commentaire,
  }) async {
    final rep = await _post(
      ApiConfig.signalements,
      {
        'trajet_id': trajetId,
        'categorie': categorie,
        if (commentaire != null && commentaire.isNotEmpty) 'commentaire': commentaire,
      },
      authentifie: true,
    );
    return Map<String, dynamic>.from(rep);
  }

  /// Billets réellement dénonçables (voyage effectué, délai non écoulé).
  static Future<List<Map<String, dynamic>>> billetsDenoncables() async {
    final rep = await _get('${ApiConfig.denonciations}/billets-denoncables', authentifie: true);
    final liste = (rep['billets'] as List?) ?? [];
    return liste.map<Map<String, dynamic>>((b) => Map<String, dynamic>.from(b)).toList();
  }

  static Future<void> denoncer({
    required String billetId,
    required String categorie,
    required String raison,
  }) async {
    await _post(
      ApiConfig.denonciations,
      {'billet_id': billetId, 'categorie': categorie, 'raison': raison},
      authentifie: true,
    );
  }

  static Future<void> ouvrirLitige({
    required String billetId,
    required String motif,
    required String description,
  }) async {
    await _post(
      ApiConfig.litiges,
      {'billet_id': billetId, 'motif': motif, 'description': description},
      authentifie: true,
    );
  }

  // ═══════════════════════════════════════════════════
  // ESPACE CHAUFFEUR
  // ═══════════════════════════════════════════════════
  /// L'identifiant est indifféremment le numéro de téléphone — dans
  /// n'importe quelle écriture, `678787823` comme `+237 678787823` —
  /// ou l'adresse email du chauffeur.
  static Future<Map<String, dynamic>> connecterChauffeur({
    required String identifiant,
    required String motDePasse,
  }) async {
    final rep = await _post(ApiConfig.connexionChauffeur, {
      'identifiant': identifiant,
      'mot_de_passe': motDePasse,
    });
    return Map<String, dynamic>.from(rep);
  }

  static Future<List<Map<String, dynamic>>> trajetsChauffeur(String token) async {
    final r = await http.get(
      Uri.parse(ApiConfig.mesTrajetsChauffeur),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
    ).timeout(_delai);
    final rep = _traiter(r);
    final liste = (rep['trajets'] as List?) ?? [];
    return liste.map<Map<String, dynamic>>((t) => Map<String, dynamic>.from(t)).toList();
  }

  /// Scan d'un billet par le chauffeur. Le backend vérifie la
  /// signature du QR, l'appartenance au trajet et le double passage.
  static Future<Map<String, dynamic>> scannerBillet({
    required String contenuQr,
    required String token,
  }) async {
    final r = await http
        .post(Uri.parse(ApiConfig.scanner),
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
            body: jsonEncode({'contenu_qr': contenuQr}))
        .timeout(_delai);
    // 409 = déjà scanné : ce n'est pas une panne, c'est une réponse
    // métier que l'écran de scan doit afficher telle quelle.
    dynamic corps;
    try {
      corps = jsonDecode(utf8.decode(r.bodyBytes));
    } catch (_) {
      corps = null;
    }
    if (corps is Map) {
      return {
        ...Map<String, dynamic>.from(corps),
        'code_http': r.statusCode,
      };
    }
    throw ErreurApi('Réponse illisible du serveur', r.statusCode);
  }

  static Future<void> declarerDepart(String trajetId, String token) async {
    final r = await http.put(
      Uri.parse('${ApiConfig.baseUrl}/api/chauffeurs/trajets/$trajetId/depart'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
    ).timeout(_delai);
    _traiter(r);
  }

  static Future<void> declarerArrivee(String trajetId, String token) async {
    final r = await http.put(
      Uri.parse('${ApiConfig.baseUrl}/api/chauffeurs/trajets/$trajetId/arrivee'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
    ).timeout(_delai);
    _traiter(r);
  }

  /// Feuille de route : tous les points de la ligne, déclarés ou non.
  static Future<List<Map<String, dynamic>>> arretsTrajet(
      String trajetId, String token) async {
    final r = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/chauffeurs/trajets/$trajetId/arrets'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
    ).timeout(_delai);
    final rep = _traiter(r);
    final liste = (rep['arrets'] as List?) ?? [];
    return liste.map<Map<String, dynamic>>((a) => Map<String, dynamic>.from(a)).toList();
  }

  static Future<Map<String, dynamic>> declarerArretIntermediaire({
    required String trajetId,
    required int ordre,
    required String token,
  }) async {
    final r = await http
        .put(Uri.parse('${ApiConfig.baseUrl}/api/chauffeurs/trajets/$trajetId/arret'),
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
            body: jsonEncode({'ordre': ordre}))
        .timeout(_delai);
    return Map<String, dynamic>.from(_traiter(r));
  }

  /// Déclare que le bus repart d'un arrêt. Ferme l'embarquement à ce
  /// point : plus de vente, plus de scan.
  static Future<Map<String, dynamic>> declarerDepartArret({
    required String trajetId,
    required int ordre,
    required String token,
  }) async {
    final r = await http
        .put(Uri.parse('${ApiConfig.baseUrl}/api/chauffeurs/trajets/$trajetId/arret/depart'),
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
            body: jsonEncode({'ordre': ordre}))
        .timeout(_delai);
    return Map<String, dynamic>.from(_traiter(r));
  }

  static Future<void> changerMotDePasseChauffeur({
    required String motDePasseActuel,
    required String nouveauMotDePasse,
    required String token,
  }) async {
    final r = await http
        .put(Uri.parse('${ApiConfig.baseUrl}/api/chauffeurs/mon-mot-de-passe'),
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
            body: jsonEncode({
              'mot_de_passe_actuel': motDePasseActuel,
              'nouveau_mot_de_passe': nouveauMotDePasse,
            }))
        .timeout(_delai);
    _traiter(r);
  }
}
