import 'package:flutter/material.dart';
import '../l10n/strings.dart';

class EcranProfil extends StatelessWidget {
  const EcranProfil({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text(Strings.t('profil_bientot'))),
    );
  }
}