import 'package:flutter/material.dart';

import 'billets_store.dart';

/// État de session du voyageur : jeton JWT et informations de
/// compte renvoyés par le backend à la connexion.
class Session {
  static final ValueNotifier<bool> connecte = ValueNotifier<bool>(false);

  static String? token;
  /// Identifiant du voyageur renvoyé par le backend (UUID).
  static String? voyageurId;
  /// Solde de points JEGO, rafraîchi depuis le backend.
  static int pointsFidelite = 0;
  static String? nom;
  static String? prenom;
  static String? telephone;
  static String? email;
  // Le mot de passe n'est JAMAIS conservé en clair : ce champ ne
  // sert qu'à l'affichage masqué le temps de la saisie.
  static String motDePasse = '';
  // Index du fond d'avatar JEGO choisi (0 = degrade vert par defaut).
  static int fondAvatar = 0;
  // Date d'inscription, renseignée depuis le profil serveur.
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
    // Les billets du compte quitté ne doivent jamais rester visibles
    // pour la personne qui se connecte ensuite.
    BilletsStore.vider();
    token = null;
    voyageurId = null;
    pointsFidelite = 0;
    nom = null;
    prenom = null;
    telephone = null;
    email = null;
    connecte.value = false;
  }
}