import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

/// Conditions d'utilisation — contenu placeholder, sera remplace par le
/// texte juridique definitif de JEGO.
class EcranConditionsUtilisation extends StatelessWidget {
  const EcranConditionsUtilisation({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              child: Row(
                children: [
                  BoutonTactile(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    Strings.t('cgu_titre'),
                    style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius:
                          BorderRadius.circular(JegoTheme.rMoyen),
                      border:
                          Border.all(color: JegoTheme.bordCarte, width: 1),
                      boxShadow: JegoTheme.ombreDouce,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _section('1. ${Strings.t('cgu_s1_titre')}',
                            Strings.t('cgu_s1_texte')),
                        _section('2. ${Strings.t('cgu_s2_titre')}',
                            Strings.t('cgu_s2_texte')),
                        _section('3. ${Strings.t('cgu_s3_titre')}',
                            Strings.t('cgu_s3_texte')),
                        _section('4. ${Strings.t('cgu_s4_titre')}',
                            Strings.t('cgu_s4_texte')),
                        _section('5. ${Strings.t('cgu_s5_titre')}',
                            Strings.t('cgu_s5_texte')),
                        const SizedBox(height: 8),
                        Text(
                          Strings.t('cgu_maj'),
                          style: const TextStyle(
                            color: JegoTheme.texteTernaire,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String titre, String texte) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titre,
            style: const TextStyle(
              color: JegoTheme.texte,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            texte,
            style: const TextStyle(
              color: JegoTheme.texteSecondaire,
              fontSize: 12.5,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}