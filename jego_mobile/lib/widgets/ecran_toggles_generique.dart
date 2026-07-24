import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Widget partage : liste de reglages on/off avec en-tete premium.
/// Utilise par Securite, Confidentialite et Preferences de voyage.
/// DEMO : aucun de ces reglages n'est persiste ni connecte a un vrai
/// systeme (chiffrement, notifications push reelles, etc.) -- valeurs
/// locales uniquement, remises a zero a la fermeture de l'ecran.
class EcranTogglesGenerique extends StatefulWidget {
  final String titre;
  final IconData icone;
  final String description;
  final List<ItemToggleGenerique> items;

  const EcranTogglesGenerique({
    super.key,
    required this.titre,
    required this.icone,
    required this.description,
    required this.items,
  });

  @override
  State<EcranTogglesGenerique> createState() => _EcranTogglesGeneriqueState();
}

class ItemToggleGenerique {
  final IconData icone;
  final String libelle;
  final bool valeurInitiale;
  const ItemToggleGenerique(this.icone, this.libelle, {this.valeurInitiale = false});
}

class _EcranTogglesGeneriqueState extends State<EcranTogglesGenerique> {
  late final List<bool> _valeurs =
      widget.items.map((e) => e.valeurInitiale).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: Text(widget.titre,
            style: const TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Text(widget.description,
              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
              border: Border.all(color: JegoTheme.bordCarte),
              boxShadow: JegoTheme.ombreDouce,
            ),
            child: Column(
              children: [
                for (var i = 0; i < widget.items.length; i++) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: Row(
                      children: [
                        Icon(widget.items[i].icone, size: 19, color: JegoTheme.texteSecondaire),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(widget.items[i].libelle,
                              style: const TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600)),
                        ),
                        Switch(
                          value: _valeurs[i],
                          activeColor: JegoTheme.vert,
                          onChanged: (v) => setState(() => _valeurs[i] = v),
                        ),
                      ],
                    ),
                  ),
                  if (i < widget.items.length - 1)
                    const Divider(height: 1, indent: 16, endIndent: 16, color: JegoTheme.bordCarte),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}