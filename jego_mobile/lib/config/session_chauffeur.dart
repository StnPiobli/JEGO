import 'package:flutter/material.dart';

/// Session du chauffeur connecte. DEMO : les identifiants sont acceptes
/// sans verification reelle (meme principe que Session voyageur) --
/// au branchement, les comptes chauffeur sont crees UNIQUEMENT par
/// l'agence, jamais par auto-inscription (regle du cahier des charges).
class SessionChauffeur {
  static final ValueNotifier<bool> connecte = ValueNotifier<bool>(false);
  static String? nom;
  static String? agence;

  static void connecter({required String nom, required String agence}) {
    SessionChauffeur.nom = nom;
    SessionChauffeur.agence = agence;
    connecte.value = true;
  }

  static void fermer() {
    connecte.value = false;
    nom = null;
    agence = null;
  }
}