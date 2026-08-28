import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'billets_store.dart';
import 'wallet_store.dart';
import 'auth_google.dart';
import 'notifs_store.dart';
import 'api_service.dart';

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

  // ═══════════════════════════════════════════════════
  // PERSISTANCE
  //
  // Sans elle, recharger la page suffisait a deconnecter : la session
  // ne vivait qu'en memoire. Le jeton est donc conserve sur l'appareil,
  // avec la date de derniere venue -- au-dela de [inactiviteMax], on
  // redemande la connexion.
  // ═══════════════════════════════════════════════════

  static const _cleToken = 'session_token';
  static const _cleNom = 'session_nom';
  static const _clePrenom = 'session_prenom';
  static const _cleTel = 'session_telephone';
  static const _cleEmail = 'session_email';
  static const _cleId = 'session_voyageur_id';
  static const _cleActivite = 'session_derniere_activite';

  /// Duree d'inactivite au-dela de laquelle la session tombe. Alignee
  /// sur la duree de vie du jeton cote serveur : garder plus longtemps
  /// une session dont le jeton est mort ne ferait qu'afficher une
  /// connexion qui n'en est plus une.
  static const Duration inactiviteMax = Duration(days: 30);

  static Future<void> _enregistrer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cleToken, token ?? '');
      await prefs.setString(_cleNom, nom ?? '');
      await prefs.setString(_clePrenom, prenom ?? '');
      await prefs.setString(_cleTel, telephone ?? '');
      await prefs.setString(_cleEmail, email ?? '');
      await prefs.setString(_cleId, voyageurId ?? '');
      await prefs.setInt(
          _cleActivite, DateTime.now().millisecondsSinceEpoch);
    } catch (_) {
      // Stockage indisponible (navigation privee) : la session reste
      // valable pour la duree de l'onglet, simplement pas au-dela.
    }
  }

  /// Note le passage de la personne. Appelee au demarrage : c'est ce
  /// qui repousse l'echeance d'inactivite.
  static Future<void> toucher() async {
    if (token == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(
          _cleActivite, DateTime.now().millisecondsSinceEpoch);
    } catch (_) {}
  }

  static Future<void> _effacer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      for (final c in [
        _cleToken,
        _cleNom,
        _clePrenom,
        _cleTel,
        _cleEmail,
        _cleId,
        _cleActivite
      ]) {
        await prefs.remove(c);
      }
    } catch (_) {}
  }

  /// Rouvre la session enregistree, si elle est encore valable.
  /// A appeler avant le premier ecran.
  static Future<void> restaurer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jeton = prefs.getString(_cleToken) ?? '';
      if (jeton.isEmpty) return;

      final derniere = prefs.getInt(_cleActivite);
      if (derniere != null) {
        final ecoule = DateTime.now().difference(
            DateTime.fromMillisecondsSinceEpoch(derniere));
        if (ecoule > inactiviteMax) {
          await _effacer();
          return;
        }
      }

      token = jeton;
      nom = prefs.getString(_cleNom);
      prenom = prefs.getString(_clePrenom);
      telephone = prefs.getString(_cleTel);
      email = prefs.getString(_cleEmail);
      final id = prefs.getString(_cleId) ?? '';
      voyageurId = id.isEmpty ? null : id;
      connecte.value = true;

      await toucher();
      NotifsStore.charger();
      BilletsStore.charger();
      WalletStore.charger();
    } catch (_) {
      // Rien de restaurable : on demarre deconnecte, sans bruit.
    }
  }

  /// Le serveur a refuse le jeton (expire, revoque). On ferme plutot
  /// que de laisser une session qui n'ouvre plus rien.
  static void jetonRefuse() {
    if (token == null) return;
    fermer();
  }

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
    // Les notifications du compte qui s'ouvre, pour que la pastille de
    // la cloche soit juste dès le premier écran.
    NotifsStore.charger();
    // Et ses billets : l'onglet Billets ne les chargeait qu'a sa
    // premiere construction. Apres une deconnexion puis une nouvelle
    // connexion, il restait vide -- les billets semblaient perdus.
    BilletsStore.charger();
    WalletStore.charger();
    _enregistrer();
  }

  static void fermer() {
    // Prevenir le serveur tant que le token existe encore (statistiques).
    if (token != null) ApiService.signalerDeconnexion();
    // Les billets du compte quitté ne doivent jamais rester visibles
    // pour la personne qui se connecte ensuite.
    BilletsStore.vider();
    NotifsStore.vider();
    WalletStore.vider();

    // On prévient aussi Google. Sans cela il continue de considérer la
    // personne comme connectée et la remet sur le même compte dès
    // l'écran suivant, sans jamais lui laisser en choisir un autre.
    AuthGoogle.deconnecter();
    token = null;
    voyageurId = null;
    pointsFidelite = 0;
    nom = null;
    prenom = null;
    telephone = null;
    email = null;
    connecte.value = false;
    _effacer();
  }
}