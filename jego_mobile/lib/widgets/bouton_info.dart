import 'package:flutter/material.dart';

import '../config/theme_jego.dart';
import '../l10n/strings.dart';

/// Petit « i » qui explique un concept en une phrase claire.
///
/// Posé à côté des notions qu'un voyageur ne peut pas deviner : billet
/// flexible, siège premium, choix automatique, portefeuille, points.
/// Une option payante qu'on ne comprend pas ne se vend pas — et pire,
/// elle inquiète.
class BoutonInfo extends StatelessWidget {
  /// Titre de l'explication.
  final String titre;

  /// Le texte, en français simple. Deux ou trois phrases au plus.
  final String texte;

  final double taille;

  const BoutonInfo({
    super.key,
    required this.titre,
    required this.texte,
    this.taille = 16,
  });

  void _ouvrir(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(14),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rGrand),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline_rounded,
                    size: 20, color: JegoTheme.vert),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(titre,
                      style: TextStyle(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                          color: JegoTheme.texte)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(texte,
                style: TextStyle(
                    fontSize: 13.5,
                    height: 1.45,
                    color: JegoTheme.texteSecondaire)),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: BoutonTactile(
                onTap: () => Navigator.of(ctx).pop(),
                child: Container(
                  height: 46,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.champ,
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  ),
                  child: Text(Strings.t('act_fermer'),
                      style: TextStyle(
                          color: JegoTheme.texte,
                          fontWeight: FontWeight.w700)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _ouvrir(context),
      // Zone tactile élargie : un « i » de 16 pixels serait trop petit
      // pour un pouce.
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Icon(Icons.info_outline_rounded,
            size: taille, color: JegoTheme.texteTernaire),
      ),
    );
  }
}
