import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Préférences de voyage, réellement appliquées à la recherche.
///
/// L'écran affichait quatre interrupteurs et prévenait lui-même qu'ils
/// n'étaient « pas encore appliqués automatiquement » — un réglage qui
/// annonce son propre inutilité. Les trois qui restent pré-cochent
/// maintenant les filtres correspondants à chaque nouvelle recherche.
///
/// « Préférer les sièges côté fenêtre » a été retiré : la place se
/// choisit sur le plan du bus, pas par un filtre de recherche, et
/// aucun trajet ne se laisse écarter parce qu'il manque une fenêtre.
class PreferencesVoyage {
  static const _cleClim = 'pref_toujours_clim';
  static const _cleNuit = 'pref_trajets_nuit';
  static const _cleWifi = 'pref_toujours_wifi';

  /// Notifiés pour que l'écran de recherche se réaligne dès qu'une
  /// préférence change, sans attendre une réouverture.
  static final ValueNotifier<bool> clim = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> nuit = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> wifi = ValueNotifier<bool>(false);

  static Future<void> restaurer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      clim.value = prefs.getBool(_cleClim) ?? false;
      nuit.value = prefs.getBool(_cleNuit) ?? false;
      wifi.value = prefs.getBool(_cleWifi) ?? false;
    } catch (_) {
      // Stockage indisponible : on reste sur « aucune préférence »,
      // ce qui n'écarte aucun trajet.
    }
  }

  static Future<void> definirClim(bool v) => _ecrire(_cleClim, clim, v);
  static Future<void> definirNuit(bool v) => _ecrire(_cleNuit, nuit, v);
  static Future<void> definirWifi(bool v) => _ecrire(_cleWifi, wifi, v);

  static Future<void> _ecrire(
      String cle, ValueNotifier<bool> notif, bool valeur) async {
    notif.value = valeur;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(cle, valeur);
  }

  /// Équipements à pré-cocher dans les filtres de recherche.
  static Set<String> get equipements => {
        if (clim.value) 'clim',
        if (wifi.value) 'wifi',
      };

  /// Catégories à pré-cocher. « nuit » est une étiquette calculée, pas
  /// une valeur stockée : le filtrage se fait à l'affichage des
  /// résultats (voir NatureTrajet.correspondAuFiltre).
  static Set<String> get categories => {
        if (nuit.value) 'nuit',
      };
}
