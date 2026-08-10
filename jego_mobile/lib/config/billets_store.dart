import 'package:flutter/material.dart';

import 'api.dart';

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

  /// Recharge les billets depuis le serveur.
  static Future<void> charger() async {
    chargement.value = true;
    erreur.value = null;
    try {
      final brut = await ApiService.mesBillets();
      billets.value = brut.map<Map<String, dynamic>>(_convertir).toList();
    } on ErreurApi catch (e) {
      erreur.value = e.message;
      billets.value = [];
    } finally {
      chargement.value = false;
    }
  }

  /// Vide la liste (déconnexion) : les billets d'un compte ne doivent
  /// jamais rester visibles pour le suivant.
  static void vider() {
    billets.value = [];
    erreur.value = null;
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
      'point_depart': b['depart'] ?? '',
      'point_arrivee': b['arrivee'] ?? '',
      'heure_depart': heure(b['heure_depart']),
      'heure_arrivee': heure(b['heure_arrivee_estimee']),
      'date': '${b['date_depart']}'.split('T').first,
      'nom_agence': b['nom_agence'] ?? '',
      'agence_id': '${b['agence_id']}',
      'categorie':
          categorie.isEmpty ? 'Standard' : '${categorie[0].toUpperCase()}${categorie.substring(1)}',
      'nombre_arrets': 0,
      'arrets_liste': null,
      'equipements': equipements,
      'sieges': [int.tryParse('${b['siege']}') ?? 0],
      'personne': 1,
      'total_personnes': 1,
      'flexible': b['est_flexible'] == true,
      'cadeau': b['est_cadeau'] == true,
      'recu_en_cadeau': b['recu_en_cadeau'] == true,
      // Le QR signé vient du serveur : il n'est jamais fabriqué ici.
      'code_qr': b['qr_code'] ?? '',
      'annule': '${b['statut']}' == 'annule',
      'utilise': '${b['statut']}' == 'utilise',
      'statut_trajet': b['statut_trajet'] ?? '',
      'deja_note': b['deja_note'] == true,
      'frais': frais,
      'total': total,
    };
  }

  static void ajouter(Map<String, dynamic> billet) {
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
class SoftLock {
  static final ValueNotifier<int> secondes = ValueNotifier<int>(0);
  static final ValueNotifier<bool> actif = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> suspendu = ValueNotifier<bool>(false);

  static final GlobalKey<NavigatorState> navKey =
      GlobalKey<NavigatorState>();

  static void demarrer([int duree = 5 * 60]) {
    secondes.value = duree;
    actif.value = true;
    suspendu.value = false;
  }

  static void suspendre() => suspendu.value = true;
  static void reprendre() => suspendu.value = false;

  static void arreter() {
    actif.value = false;
    suspendu.value = false;
  }

  static void relancer([int duree = 5 * 60]) {
    secondes.value = duree;
    suspendu.value = false;
  }
}