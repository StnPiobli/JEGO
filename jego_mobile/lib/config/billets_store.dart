import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'session.dart';

/// Billets réels du voyageur connecté.
///
/// La liste est alimentée par l'historique du serveur : elle ne
/// contient plus aucun billet fabriqué localement. Elle reste un
/// ValueNotifier pour que les écrans déjà en place continuent de se
/// rafraîchir automatiquement.
class BilletsStore {
  static final ValueNotifier<List<Map<String, dynamic>>> billets =
      ValueNotifier<List<Map<String, dynamic>>>([]);

  static final ValueNotifier<bool> chargement = ValueNotifier<bool>(false);
  static final ValueNotifier<String?> erreur = ValueNotifier<String?>(null);

  /// Numeros des billets recuperes sur cet appareil (BIL-XXXXX-XXXXX).
  /// Conserves a part : ils n'appartiennent pas forcement au compte
  /// connecte, donc l'historique du serveur ne les renvoie pas. Sans
  /// cette liste, un billet recupere disparaissait au premier
  /// rechargement.
  static const _cleRecuperes = 'billets_recuperes';

  static Future<Set<String>> _numerosRecuperes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return (prefs.getStringList(_cleRecuperes) ?? []).toSet();
    } catch (_) {
      return {};
    }
  }

  static Future<void> _memoriserRecupere(String numero) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final actuels = (prefs.getStringList(_cleRecuperes) ?? []).toSet()
        ..add(numero);
      await prefs.setStringList(_cleRecuperes, actuels.toList());
    } catch (_) {}
  }

  static Future<void> oublierRecupere(String numero) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final actuels = (prefs.getStringList(_cleRecuperes) ?? []).toSet()
        ..remove(numero);
      await prefs.setStringList(_cleRecuperes, actuels.toList());
    } catch (_) {}
  }

  /// Recharge les billets : ceux du compte connecte, PLUS les billets
  /// recuperes sur cet appareil. Ces derniers sont relus par leur
  /// numero (route publique) pour rester a jour et ne pas disparaitre.
  static Future<void> charger() async {
    chargement.value = true;
    erreur.value = null;

    final liste = <Map<String, dynamic>>[];
    final vus = <String>{};

    try {
      if (Session.token != null) {
        final brut = await ApiService.mesBillets();
        for (final b in brut) {
          final billet = _convertir(b);
          if (vus.add('${billet['id']}')) liste.add(billet);
        }
      }
    } on ErreurApi catch (e) {
      erreur.value = e.message;
    }

    // Billets recuperes : chacun relu par son numero. Un numero qui ne
    // repond plus (billet supprime cote serveur) est simplement ignore.
    for (final numero in await _numerosRecuperes()) {
      try {
        final brut = await ApiService.recupererBillet(numero: numero);
        if (brut.isEmpty) continue;
        final billet = _convertir(brut);
        if (vus.add('${billet['id']}')) liste.add(billet);
      } on ErreurApi {
        // Numero devenu invalide : on le laisse, l'utilisateur pourra
        // le retirer, mais on ne casse pas le chargement pour autant.
      }
    }

    billets.value = liste;
    chargement.value = false;
  }

  /// Vide la liste (déconnexion) : les billets du COMPTE ne doivent
  /// jamais rester visibles pour le suivant. Les billets recuperes sur
  /// cet appareil, eux, ne dependent d'aucun compte : on les recharge
  /// seuls, par leur numero.
  static void vider() {
    billets.value = [];
    erreur.value = null;
    _rechargerRecuperesSeuls();
  }

  static Future<void> _rechargerRecuperesSeuls() async {
    final liste = <Map<String, dynamic>>[];
    final vus = <String>{};
    for (final numero in await _numerosRecuperes()) {
      try {
        final brut = await ApiService.recupererBillet(numero: numero);
        if (brut.isEmpty) continue;
        final billet = _convertir(brut);
        if (vus.add('${billet['id']}')) liste.add(billet);
      } on ErreurApi {
        // Numero devenu invalide : ignore.
      }
    }
    billets.value = liste;
  }

  /// Traduit un billet du serveur vers la forme attendue par les
  /// écrans déjà en place.
  static Map<String, dynamic> _convertir(Map<String, dynamic> b) {
    String heure(dynamic v) {
      if (v == null) return '--:--';
      final s = v.toString();
      return s.length >= 5 ? s.substring(0, 5) : s;
    }

    final equipements = <String>[];
    if (b['climatisation'] == true) equipements.add('clim');
    if (b['prises_usb'] == true) equipements.add('usb');
    if (b['wifi'] == true) equipements.add('wifi');
    if (b['toilettes'] == true) equipements.add('toilettes');

    final total = int.tryParse('${b['prix_total_client'] ?? 0}') ?? 0;
    final bagage = int.tryParse('${b['supplement_bagage'] ?? 0}') ?? 0;

    final frais = <Map<String, String>>[
      {'libelle': 'Billet', 'montant': '${total - bagage} FCFA'},
      if (bagage > 0) {'libelle': 'Supplément bagage', 'montant': '$bagage FCFA'},
    ];

    final categorie = '${b['categorie'] ?? 'standard'}';

    return {
      'id': '${b['billet_id']}',
      'billet_id': '${b['billet_id']}',
      'trajet_id': '${b['trajet_id']}',
      'groupe': '${b['numero']}',
      'num_resa': '${b['numero']}',
      'ville_depart': b['depart'] ?? '',
      'ville_arrivee': b['arrivee'] ?? '',
      // Lieu de rendez-vous precis de l'arret d'embarquement, et non
      // le nom de la ville : c'est la qu'il faut se presenter.
      'point_depart': b['lieu_depart'] ?? b['depart'] ?? '',
      'point_arrivee': b['lieu_arrivee'] ?? b['arrivee'] ?? '',
      // Heures du troncon achete. Sur une ligne a arrets, le bus ne
      // passe pas a l'arret intermediaire a l'heure de depart de la
      // ligne : un Bafoussam -> Yaounde affichait 11h24 au lieu de
      // 17h23, soit six heures d'avance a la gare.
      'heure_depart': heure(b['heure_troncon'] ?? b['heure_depart']),
      'heure_arrivee':
          heure(b['heure_arrivee_troncon'] ?? b['heure_arrivee_estimee']),
      'date': '${b['date_depart']}'.split('T').first,
      'nom_agence': b['nom_agence'] ?? '',
      'agence_id': '${b['agence_id']}',
      'categorie':
          categorie.isEmpty ? 'Standard' : '${categorie[0].toUpperCase()}${categorie.substring(1)}',
      'nombre_arrets': int.tryParse('${b['nombre_arrets']}'),
      'arrets_liste': null,
      'equipements': equipements,
      'sieges': ['${b['siege']}'],
      'personne': 1,
      'total_personnes': 1,
      // Titulaire reel du billet : sur un billet recupere, ce n'est pas
      // forcement la personne connectee. Le PDF et l'affichage doivent
      // montrer ce nom-la, pas celui de la session.
      'passager_prenom': '${b['passager_prenom'] ?? ''}',
      'passager_nom': '${b['passager_nom'] ?? ''}',
      'passager_tel': '${b['passager_tel'] ?? ''}',
      'passager_email': '${b['passager_email'] ?? ''}',
      'flexible': b['est_flexible'] == true,
      'cadeau': b['est_cadeau'] == true,
      'recu_en_cadeau': b['recu_en_cadeau'] == true,
      // Le QR signé vient du serveur : il n'est jamais fabriqué ici.
      'code_qr': b['qr_code'] ?? '',
      'annule': '${b['statut']}' == 'annule',
      'utilise': '${b['statut']}' == 'utilise',
      'statut_trajet': b['statut_trajet'] ?? '',
      'arrets_declares': int.tryParse('${b['arrets_declares']}') ?? 0,
      'deja_note': b['deja_note'] == true,
      'frais': frais,
      'total': total,
    };
  }

  static void ajouter(Map<String, dynamic> billet) {
    billets.value = [...billets.value, billet];
  }

  /// Ajoute un billet renvoye par le serveur (recuperation sur un autre
  /// appareil). Passe par le meme convertisseur que l'historique, et
  /// evite le doublon si le billet est deja affiche.
  static void ajouterDepuisServeur(Map<String, dynamic> brut) {
    final billet = _convertir(brut);
    // Retenu durablement pour survivre aux rechargements et aux
    // redemarrages, meme sans compte connecte.
    _memoriserRecupere('${billet['num_resa']}');
    final existe = billets.value.any((b) => b['id'] == billet['id']);
    if (existe) return;
    billets.value = [...billets.value, billet];
  }

  static void supprimer(String id) {
    billets.value = billets.value.where((b) => b['id'] != id).toList();
  }

  static void supprimerGroupe(String groupe) {
    billets.value =
        billets.value.where((b) => b['groupe'] != groupe).toList();
  }

  /// Fusionne des changements dans le billet identifié par [id].
  /// Sert au rafraîchissement immédiat de l'affichage après une
  /// action ; la source de vérité reste le serveur, rechargé via
  /// [charger].
  static void mettreAJour(String id, Map<String, dynamic> changements) {
    billets.value = billets.value.map((b) {
      if (b['id'] == id) return {...b, ...changements};
      return b;
    }).toList();
  }

  /// True si la date du billet est passee, OU si le billet a ete annule
  /// (meme si le trajet est encore a venir : un billet annule ne doit
  /// plus apparaitre dans "Valides").
  static bool estPasse(Map<String, dynamic> b) {
    if (b['annule'] == true) return true;
    try {
      final d = DateTime.parse(b['date'] as String);
      final finJour = DateTime(d.year, d.month, d.day, 23, 59);
      return finJour.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }
}

/// Etat du verrou de siege, visible pendant tout le tunnel.
///
/// Le compte a rebours est ancre sur une heure de fin, pas decremente
/// seconde par seconde. Un decompte par tics s'arrete des que
/// l'application passe en arriere-plan : le systeme gele ses timers, et
/// cinq minutes annoncees pouvaient en durer trente. L'heure de fin,
/// elle, ne se met pas en pause.
class SoftLock {
  static final ValueNotifier<int> secondes = ValueNotifier<int>(0);
  static final ValueNotifier<bool> actif = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> suspendu = ValueNotifier<bool>(false);

  static final GlobalKey<NavigatorState> navKey =
      GlobalKey<NavigatorState>();

  /// Instant ou le verrou tombe. Seule reference du decompte.
  static DateTime? _fin;

  /// Instant ou la suspension a commence, pour decaler la fin d'autant
  /// au moment de reprendre.
  static DateTime? _debutSuspension;

  /// Secondes restantes reellement, calculees a la demande.
  static int get restant {
    final f = _fin;
    if (f == null) return 0;
    // Arrondi au superieur : inSeconds tronque, et cinq minutes
    // s'afficheraient 4:59 des la premiere milliseconde ecoulee.
    final ms = f.difference(DateTime.now()).inMilliseconds;
    return ms > 0 ? (ms / 1000).ceil() : 0;
  }

  /// Recalcule l'affichage depuis l'horloge. A appeler a chaque tic et
  /// au retour de l'arriere-plan.
  static void rafraichir() {
    if (!actif.value || suspendu.value) return;
    secondes.value = restant;
  }

  static void demarrer([int duree = 5 * 60]) {
    _fin = DateTime.now().add(Duration(seconds: duree));
    _debutSuspension = null;
    secondes.value = duree;
    actif.value = true;
    suspendu.value = false;
  }

  /// Met le decompte en pause (question « toujours la ? », paiement en
  /// cours). Le temps passe en pause ne doit pas etre decompte : on
  /// retient quand elle a commence pour repousser la fin au retour.
  static void suspendre() {
    if (suspendu.value) return;
    _debutSuspension = DateTime.now();
    suspendu.value = true;
  }

  static void reprendre() {
    final debut = _debutSuspension;
    if (debut != null && _fin != null) {
      _fin = _fin!.add(DateTime.now().difference(debut));
    }
    _debutSuspension = null;
    suspendu.value = false;
    rafraichir();
  }

  static void arreter() {
    _fin = null;
    _debutSuspension = null;
    actif.value = false;
    suspendu.value = false;
  }

  static void relancer([int duree = 5 * 60]) {
    _fin = DateTime.now().add(Duration(seconds: duree));
    _debutSuspension = null;
    secondes.value = duree;
    suspendu.value = false;
  }
}