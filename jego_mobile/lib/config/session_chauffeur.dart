import 'package:flutter/material.dart';

/// Session du chauffeur connecté.
///
/// Les comptes chauffeur sont créés UNIQUEMENT par l'agence, jamais
/// par auto-inscription. Le jeton et l'identifiant proviennent du
/// backend : plus aucun compte codé dans l'application.
class SessionChauffeur {
  static final ValueNotifier<bool> connecte = ValueNotifier<bool>(false);

  static String? token;
  static String? chauffeurId;
  static String? nom;
  static String? prenom;
  static String? telephone;
  static String? agence;

  static void connecter({
    required String nom,
    String? prenom,
    String? agence,
    String? token,
    String? chauffeurId,
    String? telephone,
  }) {
    SessionChauffeur.nom = nom;
    SessionChauffeur.prenom = prenom;
    SessionChauffeur.agence = agence;
    SessionChauffeur.token = token;
    SessionChauffeur.chauffeurId = chauffeurId;
    SessionChauffeur.telephone = telephone;
    connecte.value = true;
  }

  static void fermer() {
    connecte.value = false;
    token = null;
    chauffeurId = null;
    nom = null;
    prenom = null;
    telephone = null;
    agence = null;
  }
}
