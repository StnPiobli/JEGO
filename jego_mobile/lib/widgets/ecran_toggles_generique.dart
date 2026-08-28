import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Liste de réglages on/off. Chaque item porte l'action à exécuter
/// quand on le bascule : sans elle, l'interrupteur ne serait qu'un
/// décor qui se remet à zéro en quittant l'écran.
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

  /// Exécutée à chaque bascule. Peut échouer : dans ce cas elle lève,
  /// et l'interrupteur revient à sa position d'avant plutôt que
  /// d'afficher un réglage que le serveur n'a pas retenu.
  final Future<void> Function(bool)? onBascule;

  const ItemToggleGenerique(this.icone, this.libelle,
      {this.valeurInitiale = false, this.onBascule});
}

class _EcranTogglesGeneriqueState extends State<EcranTogglesGenerique> {
  late final List<bool> _valeurs =
      widget.items.map((e) => e.valeurInitiale).toList();
  String? _erreur;

  /// L'affichage change tout de suite, puis on enregistre. Si le
  /// serveur refuse, l'interrupteur revient en arrière : mieux vaut
  /// montrer l'échec que laisser croire à un réglage appliqué.
  Future<void> _basculer(int i, bool valeur) async {
    final avant = _valeurs[i];
    setState(() {
      _valeurs[i] = valeur;
      _erreur = null;
    });
    final action = widget.items[i].onBascule;
    if (action == null) return;
    try {
      await action(valeur);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _valeurs[i] = avant;
        _erreur = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: JegoTheme.texte),
        title: Text(widget.titre,
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Text(widget.description,
              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
          if (_erreur != null) ...[
            const SizedBox(height: 8),
            Text(_erreur!,
                style: TextStyle(color: JegoTheme.danger, fontSize: 12)),
          ],
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
                              style: TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600)),
                        ),
                        Switch(
                          value: _valeurs[i],
                          activeColor: JegoTheme.vert,
                          onChanged: (v) => _basculer(i, v),
                        ),
                      ],
                    ),
                  ),
                  if (i < widget.items.length - 1)
                    Divider(height: 1, indent: 16, endIndent: 16, color: JegoTheme.bordCarte),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}