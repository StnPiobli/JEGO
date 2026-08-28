import 'package:flutter/material.dart';

import 'api_service.dart';
import 'session.dart';

/// Notifications du voyageur, telles que le serveur les connaît.
///
/// Cette liste était inventée : trois entrées écrites en dur, dont une
/// météo qui n'a jamais existé côté serveur. Les vraies notifications
/// étaient pourtant déjà écrites en base par le reste de l'application
/// — billet confirmé, remboursement, réponse à un litige, arrivée
/// déclarée par le chauffeur. Il ne manquait qu'une route pour les lire.
class NotifsStore {
  static final ValueNotifier<List<Map<String, dynamic>>> liste =
      ValueNotifier<List<Map<String, dynamic>>>([]);

  static final ValueNotifier<bool> chargement = ValueNotifier<bool>(false);
  static String? erreur;

  /// Nombre de notifications non lues, pour la pastille de la cloche.
  static int get nonLues => liste.value.where((n) => n['lu'] != true).length;

  static Future<void> charger() async {
    // Un visiteur non connecté n'a pas de notifications : on ne
    // sollicite pas le serveur pour se faire refuser.
    if (Session.token == null) {
      liste.value = [];
      erreur = null;
      return;
    }
    chargement.value = true;
    erreur = null;
    try {
      liste.value = await ApiService.mesNotifications();
    } on ErreurApi catch (e) {
      erreur = e.message;
      liste.value = [];
    } finally {
      chargement.value = false;
    }
  }

  /// Vide la liste à la déconnexion : les notifications d'un compte ne
  /// doivent jamais rester visibles pour la personne qui se connecte
  /// ensuite.
  static void vider() {
    liste.value = [];
    erreur = null;
  }

  static Future<void> marquerToutesLues() async {
    // L'affichage change tout de suite, sans attendre le serveur : la
    // pastille doit disparaître au moment où l'écran s'ouvre.
    liste.value = liste.value.map((n) => {...n, 'lu': true}).toList();
    try {
      await ApiService.marquerNotificationsLues();
    } on ErreurApi {
      // Sans réseau, elles seront relues non lues au prochain
      // chargement — rien n'est perdu.
    }
  }

  static Future<void> supprimer(String id) async {
    final avant = liste.value;
    liste.value = liste.value.where((n) => '${n['id']}' != id).toList();
    try {
      await ApiService.supprimerNotification(id: id);
    } on ErreurApi {
      liste.value = avant; // le serveur a refusé : on remet la ligne
    }
  }

  static Future<void> toutSupprimer() async {
    final avant = liste.value;
    liste.value = [];
    try {
      await ApiService.supprimerNotification();
    } on ErreurApi {
      liste.value = avant;
    }
  }
}
