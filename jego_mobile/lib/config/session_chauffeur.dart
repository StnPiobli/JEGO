import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Session du chauffeur connecté.
///
/// Les comptes chauffeur sont créés UNIQUEMENT par l'agence, jamais
/// par auto-inscription. Le jeton et l'identifiant proviennent du
/// backend : plus aucun compte codé dans l'application.
///
/// La session est conservée sur l'appareil : recharger la page ne
/// déconnecte plus le chauffeur, exactement comme pour le voyageur.
/// Au-delà de [inactiviteMax] sans venir, on redemande la connexion.
class SessionChauffeur {
  static final ValueNotifier<bool> connecte = ValueNotifier<bool>(false);

  static String? token;
  static String? chauffeurId;
  static String? nom;
  static String? prenom;
  static String? telephone;
  static String? agence;

  static const _cleToken = 'chauffeur_token';
  static const _cleId = 'chauffeur_id';
  static const _cleNom = 'chauffeur_nom';
  static const _clePrenom = 'chauffeur_prenom';
  static const _cleTel = 'chauffeur_telephone';
  static const _cleAgence = 'chauffeur_agence';
  static const _cleActivite = 'chauffeur_derniere_activite';

  static const Duration inactiviteMax = Duration(days: 30);

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
    _enregistrer();
  }

  static Future<void> _enregistrer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cleToken, token ?? '');
      await prefs.setString(_cleId, chauffeurId ?? '');
      await prefs.setString(_cleNom, nom ?? '');
      await prefs.setString(_clePrenom, prenom ?? '');
      await prefs.setString(_cleTel, telephone ?? '');
      await prefs.setString(_cleAgence, agence ?? '');
      await prefs.setInt(
          _cleActivite, DateTime.now().millisecondsSinceEpoch);
    } catch (_) {
      // Stockage indisponible : la session vaut pour l'onglet courant.
    }
  }

  /// Rouvre la session enregistrée si elle est encore valable. À
  /// appeler avant le premier écran.
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
      chauffeurId = _vide(prefs.getString(_cleId));
      nom = prefs.getString(_cleNom);
      prenom = prefs.getString(_clePrenom);
      telephone = prefs.getString(_cleTel);
      agence = prefs.getString(_cleAgence);
      connecte.value = true;

      // On note le passage : c'est ce qui repousse l'échéance.
      await prefs.setInt(
          _cleActivite, DateTime.now().millisecondsSinceEpoch);
    } catch (_) {
      // Rien de restaurable : on démarre déconnecté, sans bruit.
    }
  }

  static String? _vide(String? v) => (v == null || v.isEmpty) ? null : v;

  static Future<void> _effacer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      for (final c in [
        _cleToken, _cleId, _cleNom, _clePrenom, _cleTel, _cleAgence,
        _cleActivite
      ]) {
        await prefs.remove(c);
      }
    } catch (_) {}
  }

  static void fermer() {
    connecte.value = false;
    token = null;
    chauffeurId = null;
    nom = null;
    prenom = null;
    telephone = null;
    agence = null;
    _effacer();
  }
}
