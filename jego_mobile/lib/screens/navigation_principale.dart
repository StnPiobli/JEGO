import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../widgets/barre_nav_verre.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      extendBody: true,
      body: IndexedStack(
        index: _index,
        children: const [
          EcranAccueilRecherche(),
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
  }
}