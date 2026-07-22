import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Ecran generique "bientot disponible", utilise pour les liens du profil
/// qui n'ont pas encore d'ecran reel derriere (Favoris, Avis, Aide, Moyens
/// de paiement, etc.). Evite les liens morts silencieux sans pretendre que
/// la fonctionnalite existe deja.
class EcranAVenir extends StatelessWidget {
  final String titre;
  const EcranAVenir({super.key, required this.titre});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          titre,
          style: const TextStyle(
              color: JegoTheme.texte, fontWeight: FontWeight.w800),
        ),
        iconTheme: const IconThemeData(color: JegoTheme.texte),
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: JegoTheme.vert.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.hourglass_top_rounded,
                  color: JegoTheme.vert, size: 32),
            ),
            const SizedBox(height: 16),
            const Text(
              'Bientôt disponible',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: JegoTheme.texte),
            ),
          ],
        ),
      ),
    );
  }
}