import 'package:flutter/material.dart';

/// Etat partage des notifications (compteur cloche + liste).
/// Sera remplace par les vraies notifs du backend au branchement.
class NotifsStore {
  static final ValueNotifier<List<Map<String, dynamic>>> liste =
      ValueNotifier<List<Map<String, dynamic>>>([
    {
      'id': 1,
      'type': 'meteo',
      'temp': 18,
      'ville': 'Bafoussam',
      'quand': 'Il y a 2 h',
      'lue': false,
    },
    {
      'id': 2,
      'type': 'rappel',
      'titre_cle': 'notif_rappel_titre',
      'texte_cle': 'notif_rappel_texte',
      'quand': 'Hier',
      'lue': false,
    },
    {
      'id': 3,
      'type': 'confirmation',
      'titre_cle': 'notif_confirm_titre',
      'texte_cle': 'notif_confirm_texte',
      'quand': 'Il y a 3 j',
      'lue': false,
    },
  ]);

  /// Nombre de notifications non lues (pour le badge de la cloche).
  static int get nonLues =>
      liste.value.where((n) => n['lue'] != true).length;

  static void marquerToutesLues() {
    final maj = liste.value
        .map((n) => {...n, 'lue': true})
        .toList();
    liste.value = maj;
  }

  static void supprimer(int id) {
    liste.value = liste.value.where((n) => n['id'] != id).toList();
  }

  static void toutSupprimer() {
    liste.value = [];
  }
}