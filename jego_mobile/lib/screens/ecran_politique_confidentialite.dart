import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

class EcranPolitiqueConfidentialite extends StatelessWidget {
  const EcranPolitiqueConfidentialite({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Politique de confidentialite',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          _section('Donnees collectees',
              'JEGO collecte votre nom, telephone, email et l\'historique de vos trajets afin de gerer vos reservations et vous contacter en cas de besoin.'),
          _section('Utilisation des donnees',
              'Vos donnees servent uniquement au fonctionnement de la plateforme (reservation, paiement, notifications de voyage) -- jamais revendues a des tiers.'),
          _section('Position pendant le trajet',
              'Si vous l\'autorisez, votre position peut etre utilisee pour ameliorer le suivi de trajet -- desactivable a tout moment dans Confidentialite.'),
          _section('Conservation',
              'Vos donnees sont conservees le temps de votre utilisation du service, puis supprimees sur demande.'),
          const SizedBox(height: 8),
          Text('Derniere mise a jour : juillet 2026 -- version provisoire.',
              style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _section(String titre, String texte) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titre,
              style: const TextStyle(
                  color: JegoTheme.texte, fontSize: 14.5, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(texte,
              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }
}