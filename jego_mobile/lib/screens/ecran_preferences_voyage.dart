import 'package:flutter/material.dart';
import '../config/preferences_voyage.dart';
import '../widgets/ecran_toggles_generique.dart';
import '../l10n/strings.dart';

/// Préférences de voyage. Chaque interrupteur pré-coche réellement le
/// filtre correspondant à la prochaine recherche, et le choix reste
/// enregistré sur l'appareil.
class EcranPreferencesVoyage extends StatelessWidget {
  const EcranPreferencesVoyage({super.key});

  @override
  Widget build(BuildContext context) {
    return EcranTogglesGenerique(
      titre: Strings.t('preferences_voyage'),
      icone: Icons.tune_rounded,
      description: Strings.t('preferences_voyage_intro'),
      items: [
        ItemToggleGenerique(
          Icons.ac_unit_rounded,
          Strings.t('pref_clim'),
          valeurInitiale: PreferencesVoyage.clim.value,
          onBascule: PreferencesVoyage.definirClim,
        ),
        ItemToggleGenerique(
          Icons.nights_stay_rounded,
          Strings.t('pref_nuit'),
          valeurInitiale: PreferencesVoyage.nuit.value,
          onBascule: PreferencesVoyage.definirNuit,
        ),
        ItemToggleGenerique(
          Icons.wifi_rounded,
          Strings.t('pref_wifi'),
          valeurInitiale: PreferencesVoyage.wifi.value,
          onBascule: PreferencesVoyage.definirWifi,
        ),
      ],
    );
  }
}
