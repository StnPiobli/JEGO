import 'package:flutter/material.dart';

/// Etat de session du voyageur. En mode demo, tout est local.
/// Au branchement : stocker ici le JWT retourne par le backend.
class Session {
  static final ValueNotifier<bool> connecte = ValueNotifier<bool>(false);

  static String? token;
  static String? nom;
  static String? prenom;
  static String? telephone;
  static String? email;

  static void ouvrir({
    required String pNom,
    required String pPrenom,
    required String pTelephone,
    required String pEmail,
    String? pToken,
  }) {
    nom = pNom;
    prenom = pPrenom;
    telephone = pTelephone;
    email = pEmail;
    token = pToken;
    connecte.value = true;
  }

  static void fermer() {
    token = null;
    nom = null;
    prenom = null;
    telephone = null;
    email = null;
    connecte.value = false;
  }
}