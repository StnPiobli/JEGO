import 'package:flutter/material.dart';

import '../config/theme_jego.dart';
import '../config/verrou_biometrique.dart';
import '../l10n/strings.dart';
import '../widgets/ecran_toggles_generique.dart';

/// Sécurité. Le déverrouillage biométrique n'apparaît que si l'appareil
/// sait réellement le faire — sur un navigateur, il n'y a rien à
/// proposer, et un interrupteur inerte laisserait croire à une
/// protection qui n'existe pas.
class EcranSecurite extends StatefulWidget {
  const EcranSecurite({super.key});

  @override
  State<EcranSecurite> createState() => _EcranSecuriteState();
}

class _EcranSecuriteState extends State<EcranSecurite> {
  bool? _disponible;
  bool _actif = false;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    final dispo = await VerrouBiometrique.disponible();
    final actif = await VerrouBiometrique.actif();
    if (!mounted) return;
    setState(() {
      _disponible = dispo;
      _actif = actif;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_disponible == null) {
      return Scaffold(
        backgroundColor: JegoTheme.fond,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: IconThemeData(color: JegoTheme.texte),
          title: Text(Strings.t('securite'),
              style: TextStyle(
                  color: JegoTheme.texte, fontWeight: FontWeight.w800)),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return EcranTogglesGenerique(
      titre: Strings.t('securite'),
      icone: Icons.lock_outline_rounded,
      description: _disponible!
          ? Strings.t('securite_intro')
          : Strings.t('securite_indisponible'),
      items: [
        if (_disponible!)
          ItemToggleGenerique(
            Icons.fingerprint_rounded,
            Strings.t('verrou_biometrique'),
            valeurInitiale: _actif,
            onBascule: (v) async {
              await VerrouBiometrique.definir(v);
              _actif = v;
            },
          ),
      ],
    );
  }
}
