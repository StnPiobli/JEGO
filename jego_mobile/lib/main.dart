import 'package:flutter/material.dart';
import 'config/billets_store.dart';
import 'config/session.dart';
import 'config/session_chauffeur.dart';
import 'config/preferences_voyage.dart';
import 'config/photo_profil.dart';
import 'config/surveillance_arrivee.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'config/theme_jego.dart';
import 'l10n/strings.dart';
import 'screens/navigation_principale.dart';
import 'screens/ecran_accueil_chauffeur.dart';
import 'screens/ecran_theme.dart';
import 'widgets/bascule_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr');
  await initializeDateFormatting('en');
  // Le thème choisi est relu avant le premier affichage : sans cela
  // l'application s'ouvrirait en clair puis basculerait sous les yeux.
  await EcranTheme.restaurer();
  // La session enregistree est rouverte avant le premier ecran :
  // recharger la page ne doit pas deconnecter.
  await Session.restaurer();
  // La session chauffeur est rouverte de la meme facon : un chauffeur
  // qui recharge la page doit revenir dans son espace, pas sur l'app
  // voyageur.
  await SessionChauffeur.restaurer();
  await PreferencesVoyage.restaurer();
  await PhotoProfil.restaurer();
  // Surveillance des arrivees, active partout dans l'app.
  await SurveillanceArrivee.demarrer();
  runApp(JegoApp());
}

class JegoApp extends StatefulWidget {
  const JegoApp({super.key});

  @override
  State<JegoApp> createState() => _JegoAppState();
}

class _JegoAppState extends State<JegoApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// L'appareil bascule entre clair et sombre : en mode « systeme »,
  /// l'application suit sans qu'on ait à rouvrir les réglages.
  @override
  void didChangePlatformBrightness() {
    recalculerTheme();
  }

  @override
  Widget build(BuildContext context) {
    // Deux écouteurs imbriqués : la langue et le thème. Les couleurs se
    // lisant désormais à l'exécution, il faut reconstruire l'arbre pour
    // que le changement se voie partout.
    return ValueListenableBuilder<String>(
      valueListenable: langueCourante,
      builder: (context, langue, _) {
        return ValueListenableBuilder<bool>(
          valueListenable: modeSombre,
          builder: (context, sombre, __) => MaterialApp(
            title: 'JEGO',
            debugShowCheckedModeBanner: false,
            navigatorKey: SoftLock.navKey,
            theme: JegoTheme.theme(),
            // La clé porte le thème et la langue : en changer recrée
            // entièrement l'accueil. Sans elle, Flutter réutilise ce
            // qu'il juge inchangé — or les couleurs sont lues au moment
            // où chaque widget se construit, donc ce qui n'est pas
            // reconstruit garde l'ancien thème.
            //
            // La clé est posée ici et non sur MaterialApp : celui-ci
            // porte une GlobalKey de navigation, que recréer casserait.
            home: BasculeTheme(
              key: ValueKey('theme-$sombre-$langue'),
              // Un chauffeur dont la session est restauree rouvre
              // directement sur son espace.
              child: SessionChauffeur.connecte.value
                  ? EcranAccueilChauffeur()
                  : NavigationPrincipale(),
            ),
          ),
        );
      },
    );
  }
}
