import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Retient l'ecran ouvert pour y revenir apres un rechargement.
///
/// Sur le web, recharger l'onglet relance l'application : sans cela on
/// retombe sur l'accueil et il faut refaire toute la navigation. On
/// memorise donc le nom de la route affichee, et on la rouvre au
/// demarrage suivant.
class DernierePage {
  static const _cle = 'derniere_page';

  /// Routes memorisables. Une route absente d'ici n'est jamais
  /// restauree : mieux vaut l'accueil qu'un ecran rouvert sans le
  /// contexte qui allait avec.
  static const routes = <String>{
    '/litiges',
    '/securite',
    '/confidentialite',
    '/cgu',
    '/politique-confidentialite',
    '/theme',
  };

  static Future<void> memoriser(String? nom) async {
    final prefs = await SharedPreferences.getInstance();
    if (nom != null && routes.contains(nom)) {
      await prefs.setString(_cle, nom);
    } else {
      await prefs.remove(_cle);
    }
  }

  static Future<String?> lire() async {
    final prefs = await SharedPreferences.getInstance();
    final nom = prefs.getString(_cle);
    return (nom != null && routes.contains(nom)) ? nom : null;
  }
}

/// Note la route affichee a chaque navigation.
class ObservateurPage extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? precedente) {
    DernierePage.memoriser(route.settings.name);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? precedente) {
    DernierePage.memoriser(precedente?.settings.name);
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? precedente) {
    DernierePage.memoriser(precedente?.settings.name);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    DernierePage.memoriser(newRoute?.settings.name);
  }
}
