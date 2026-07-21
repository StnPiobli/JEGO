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
  // Mot de passe : en demo on garde juste une valeur locale pour l'affichage
  // masque. Au branchement, ne JAMAIS stocker le mot de passe en clair ici.
  static String motDePasse = '';
  // Index du fond d'avatar JEGO choisi (0 = degrade vert par defaut).
  static int fondAvatar = 0;
  // Date d'inscription (demo). Au branchement : vient du backend.
  static DateTime membreDepuis = DateTime(2025, 3, 12);

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