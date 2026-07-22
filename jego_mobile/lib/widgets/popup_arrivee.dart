import 'package:flutter/material.dart';
import '../config/billets_store.dart';
import '../config/theme_jego.dart';
import 'dialogues_voyage.dart';

/// Popup central affiche au moment ou l'arrivee est declaree, avec le choix
/// direct entre noter le voyage ou signaler une fausse arrivee. Remplace
/// l'ancienne banniere qui glissait depuis le haut : plus visible, et evite
/// a l'utilisateur de devoir chercher l'action ailleurs.
void afficherPopupArrivee({
  required Map<String, dynamic> billet,
  required VoidCallback onNoter,
}) {
  final context = SoftLock.navKey.currentContext;
  if (context == null) return;

  showDialog(
    context: context,
    barrierDismissible: true,
    builder: (dialogContext) => _PopupArrivee(
      billet: billet,
      onNoter: () {
        Navigator.of(dialogContext).pop();
        onNoter();
      },
    ),
  );
}

class _PopupArrivee extends StatelessWidget {
  final Map<String, dynamic> billet;
  final VoidCallback onNoter;

  const _PopupArrivee({required this.billet, required this.onNoter});

  Future<void> _signaler(BuildContext dialogContext) async {
    Navigator.of(dialogContext).pop();
    final context = SoftLock.navKey.currentContext;
    if (context == null) return;
    await confirmerFausseArrivee(context, '${billet['id']}');
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rGrand + 4),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.18),
              blurRadius: 32,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 92,
              height: 92,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  _confetti(-34, -30, JegoTheme.etoile, 7),
                  _confetti(30, -34, JegoTheme.vertVif, 5),
                  _confetti(-38, 20, JegoTheme.vert, 5),
                  _confetti(34, 26, JegoTheme.etoile, 6),
                  _confetti(0, -42, JegoTheme.vertVif, 4),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: JegoTheme.vert.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                  ),
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [JegoTheme.vert, JegoTheme.vertVif],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_rounded,
                        color: Colors.white, size: 30),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Trajet terminé 🎉',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: JegoTheme.texte,
              ),
            ),
            const SizedBox(height: 10),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: const TextStyle(
                  fontSize: 14,
                  color: JegoTheme.texte,
                  height: 1.4,
                ),
                children: [
                  const TextSpan(text: 'Votre trajet '),
                  TextSpan(
                    text: '${billet['ville_depart']}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, color: JegoTheme.vert),
                  ),
                  const TextSpan(text: ' → '),
                  TextSpan(
                    text: '${billet['ville_arrivee']}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, color: JegoTheme.vert),
                  ),
                  const TextSpan(text: ' est terminé.'),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Avez-vous passé un bon voyage ?',
              style: TextStyle(
                fontSize: 13,
                color: JegoTheme.texteSecondaire,
              ),
            ),
            const SizedBox(height: 24),
            BoutonTactile(
              onTap: onNoter,
              child: Container(
                width: double.infinity,
                height: 50,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [JegoTheme.vert, JegoTheme.vertVif],
                  ),
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.star_rounded, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text('Noter mon voyage',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 14.5)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            BoutonTactile(
              onTap: () => _signaler(context),
              child: Container(
                width: double.infinity,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: JegoTheme.danger.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                  border:
                      Border.all(color: JegoTheme.danger.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.report_rounded,
                        color: JegoTheme.danger, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'Signaler une fausse arrivée',
                      style: TextStyle(
                          color: JegoTheme.danger,
                          fontWeight: FontWeight.w700,
                          fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _confetti(double dx, double dy, Color couleur, double taille) {
    return Positioned(
      left: 46 + dx,
      top: 46 + dy,
      child: Container(
        width: taille,
        height: taille,
        decoration: BoxDecoration(color: couleur, shape: BoxShape.circle),
      ),
    );
  }
}