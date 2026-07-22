import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/barre_nav_verre.dart';
import '../widgets/panneau_parametres.dart';
import 'accueil_recherche.dart';
import 'billets.dart';
import 'profil.dart';

class NavigationPrincipale extends StatefulWidget {
  const NavigationPrincipale({super.key});
  @override
  State<NavigationPrincipale> createState() => _NavigationPrincipaleState();
}

class _NavigationPrincipaleState extends State<NavigationPrincipale> {
  int _index = 0;
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    // Ecoute la langue : quand elle change, on reconstruit avec une cle
    // differente pour forcer les 3 ecrans a se rebatir avec les nouveaux textes.
    return ValueListenableBuilder<String>(
      valueListenable: langueCourante,
      builder: (context, langue, _) {
        return Scaffold(
          key: _scaffoldKey,
          backgroundColor: JegoTheme.fond,
          extendBody: true,
          drawer: const PanneauParametres(),
          body: IndexedStack(
            key: ValueKey(langue), // change de cle => reconstruit les enfants
            index: _index,
            children: [
              EcranAccueilRecherche(
                onOuvrirMenu: () => _scaffoldKey.currentState?.openDrawer(),
              ),
              EcranBillets(),
              EcranProfil(),
            ],
          ),
          bottomNavigationBar: BarreNavVerre(
            index: _index,
            onChange: (i) => setState(() => _index = i),
            icones: const [
              Icons.home_rounded,
              Icons.confirmation_number_rounded,
              Icons.person_rounded,
            ],
          ),
        );
      },
    );
  }
}