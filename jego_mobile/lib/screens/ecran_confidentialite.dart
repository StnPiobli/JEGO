import 'package:flutter/material.dart';
import '../widgets/ecran_toggles_generique.dart';

class EcranConfidentialite extends StatelessWidget {
  const EcranConfidentialite({super.key});

  @override
  Widget build(BuildContext context) {
    return const EcranTogglesGenerique(
      titre: 'Confidentialite',
      icone: Icons.privacy_tip_outlined,
      description:
          'Contrôle de ce que JEGO partage ou non. Ces réglages ne sont pas encore actifs.',
      items: [
        ItemToggleGenerique(Icons.location_on_outlined, 'Partager ma position pendant le trajet',
            valeurInitiale: true),
        ItemToggleGenerique(Icons.campaign_outlined, 'Autoriser les offres personnalisees'),
        ItemToggleGenerique(Icons.groups_outlined, 'Visibilite de mon avis avec mon nom',
            valeurInitiale: true),
      ],
    );
  }
}