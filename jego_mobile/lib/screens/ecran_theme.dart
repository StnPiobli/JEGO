import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/ecran_choix_generique.dart';

/// Choix du thème : clair, sombre, ou celui de l'appareil.
///
/// Le réglage s'applique aussitôt à toute l'application et survit à la
/// fermeture.
class EcranTheme extends StatelessWidget {
  const EcranTheme({super.key});

  /// Relit le choix au démarrage. Sans cela, l'application rouvrirait
  /// toujours en clair, quel que soit le réglage de la personne.
  static Future<void> restaurer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      modeTheme.value = prefs.getString('mode_theme') ?? 'clair';
    } catch (_) {
      // Stockage indisponible : on reste sur le réglage par défaut,
      // sans bloquer le démarrage pour une question d'affichage.
    }
    recalculerTheme();
  }

  /// Applique un mode ('clair' | 'sombre' | 'systeme'), l'enregistre et
  /// le repercute aussitot sur toute l'application. Partage par l'ecran
  /// de reglages et par la bascule rapide de l'espace chauffeur.
  static Future<void> definir(String valeur) async {
    modeTheme.value = valeur;
    recalculerTheme();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('mode_theme', valeur);
    } catch (_) {
      // Le theme s'applique quand meme pour cette session.
    }
  }

  @override
  Widget build(BuildContext context) {
    return EcranChoixGenerique(
      titre: Strings.t('theme'),
      icone: Icons.dark_mode_outlined,
      valeurInitiale: modeTheme.value,
      options: [
        OptionChoix('clair', Strings.t('theme_clair')),
        OptionChoix('sombre', Strings.t('theme_sombre')),
        OptionChoix('systeme', Strings.t('theme_systeme')),
      ],
      onChange: EcranTheme.definir,
    );
  }
}
