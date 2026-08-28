import 'package:flutter/material.dart';

import '../config/api.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/ecran_toggles_generique.dart';

/// Confidentialité. Le seul réglage restant agit réellement : il décide
/// si le prénom accompagne les avis laissés.
///
/// L'écran attend la réponse du serveur avant de s'afficher : montrer
/// un interrupteur avant de savoir sa position reviendrait à afficher
/// une valeur inventée.
class EcranConfidentialite extends StatefulWidget {
  const EcranConfidentialite({super.key});

  @override
  State<EcranConfidentialite> createState() => _EcranConfidentialiteState();
}

class _EcranConfidentialiteState extends State<EcranConfidentialite> {
  bool? _avecNom;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    // Ce réglage appartient à un compte : sans session, le serveur
    // refuse et renverrait « token manquant », ce qui n'apprend rien à
    // qui n'est pas connecté.
    if (Session.token == null) {
      setState(() => _erreur = Strings.t('connexion_requise'));
      return;
    }
    try {
      final profil = await ApiService.monProfil();
      if (!mounted) return;
      setState(() => _avecNom = profil['avis_avec_nom'] != false);
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() => _erreur = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_avecNom == null) {
      return Scaffold(
        backgroundColor: JegoTheme.fond,
        // Une barre avec retour : sans elle, un écran qui ne peut rien
        // charger enferme la personne dedans.
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: IconThemeData(color: JegoTheme.texte),
          title: Text(Strings.t('confidentialite'),
              style: TextStyle(
                  color: JegoTheme.texte, fontWeight: FontWeight.w800)),
        ),
        body: Center(
          child: _erreur == null
              ? const CircularProgressIndicator()
              : Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(_erreur!,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: JegoTheme.texteSecondaire)),
                ),
        ),
      );
    }

    return EcranTogglesGenerique(
      titre: Strings.t('confidentialite'),
      icone: Icons.privacy_tip_outlined,
      description: Strings.t('confidentialite_intro'),
      items: [
        ItemToggleGenerique(
          Icons.groups_outlined,
          Strings.t('avis_avec_nom'),
          valeurInitiale: _avecNom!,
          onBascule: (v) async {
            final profil = await ApiService.modifierProfil({'avis_avec_nom': v});
            // On retient ce que le serveur a réellement enregistré.
            _avecNom = profil['avis_avec_nom'] != false;
          },
        ),
      ],
    );
  }
}
