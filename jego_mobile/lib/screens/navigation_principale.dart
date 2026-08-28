import 'dart:async';
import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/barre_nav_verre.dart';
import '../widgets/panneau_parametres.dart';
import 'accueil_recherche.dart';
import 'billets.dart';
import 'profil.dart';
import '../config/session.dart';
import '../config/notifs_store.dart';
import '../config/billets_store.dart';
import '../config/wallet_store.dart';

class NavigationPrincipale extends StatefulWidget {
  const NavigationPrincipale({super.key});
  @override
  State<NavigationPrincipale> createState() => _NavigationPrincipaleState();
}

class _NavigationPrincipaleState extends State<NavigationPrincipale>
    with WidgetsBindingObserver {
  int _index = 0;
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  Timer? _sondeGlobale;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Rafraichissement global : meme sans etre sur « Suivre le trajet »,
    // l'app doit remarquer qu'un trajet vient d'arriver (popup) ou qu'une
    // notification est tombee. Sans push temps reel, on interroge
    // regulierement tant que l'app est au premier plan.
    _sondeGlobale = Timer.periodic(const Duration(seconds: 15), (_) {
      if (Session.token == null) return;
      BilletsStore.charger();
      NotifsStore.charger();
    });
  }

  @override
  void dispose() {
    _sondeGlobale?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Retour au premier plan : les notifications ont pu arriver pendant
  /// l'absence (billet confirme, retard annonce, remboursement). Sans
  /// cette relecture, la pastille de la cloche restait figee sur l'etat
  /// du dernier chargement -- souvent celui de la connexion.
  @override
  void didChangeAppLifecycleState(AppLifecycleState etat) {
    if (etat != AppLifecycleState.resumed) return;
    if (Session.token == null) return;
    NotifsStore.charger();
    BilletsStore.charger();
    WalletStore.charger();
  }

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
          drawer: PanneauParametres(),
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