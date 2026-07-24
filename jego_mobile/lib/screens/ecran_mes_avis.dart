import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Etat vide honnete : il n'existe aujourd'hui aucun stockage reel des
/// avis soumis dans "Apres le voyage" (seul un flag "note_envoyee" est
/// garde sur le billet, pas le contenu de la notation). Construire une
/// vraie liste ici demanderait d'abord un vrai historique des avis --
/// pas fait ce soir, pour ne pas afficher de fausses donnees.
class EcranMesAvis extends StatelessWidget {
  const EcranMesAvis({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Mes avis',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 74,
                height: 74,
                decoration: BoxDecoration(
                  color: JegoTheme.etoile.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.star_outline_rounded,
                    color: JegoTheme.etoile, size: 34),
              ),
              const SizedBox(height: 16),
              const Text('Aucun avis pour l\'instant',
                  style: TextStyle(
                      color: JegoTheme.texte, fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(
                'Les avis que tu laisses apres un voyage apparaitront ici.',
                textAlign: TextAlign.center,
                style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13, height: 1.4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}