import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

class Pays {
  final String nom;
  final String indicatif;
  final String drapeau;
  final int longueur;
  const Pays(this.nom, this.indicatif, this.drapeau, this.longueur);
}

class PaysTelephone {
  static const cameroun = Pays('Cameroun', '+237', '🇨🇲', 9);
  static const liste = [
    cameroun,
    Pays('Nigeria', '+234', '🇳🇬', 10),
    Pays('Tchad', '+235', '🇹🇩', 8),
    Pays('Gabon', '+241', '🇬🇦', 9),
    Pays('Côte d\'Ivoire', '+225', '🇨🇮', 10),
    Pays('France', '+33', '🇫🇷', 9),
  ];

  /// Format valide selon le pays. Cameroun : 9 chiffres commencant par 6 ou 2.
  static bool valide(Pays pays, String numero) {
    final n = numero.replaceAll(RegExp(r'\D'), '');
    if (n.length != pays.longueur) return false;
    if (pays.indicatif == '+237' &&
        !(n.startsWith('6') || n.startsWith('2'))) {
      return false;
    }
    return true;
  }
}

/// Champ telephone avec selecteur d'indicatif pays.
class ChampTelephone extends StatelessWidget {
  final TextEditingController controller;
  final Pays pays;
  final ValueChanged<Pays> onPays;
  final String libelle;
  final ValueChanged<String>? onChange;

  const ChampTelephone({
    super.key,
    required this.controller,
    required this.pays,
    required this.onPays,
    required this.libelle,
    this.onChange,
  });

  void _ouvrirListe(BuildContext context) {
    // Popup compact ancre pres du champ, ne prend pas tout l'ecran.
    final overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox;
    final box = context.findRenderObject() as RenderBox;
    final position = RelativeRect.fromRect(
      Rect.fromPoints(
        box.localToGlobal(Offset.zero, ancestor: overlay),
        box.localToGlobal(box.size.bottomLeft(Offset.zero),
            ancestor: overlay),
      ),
      Offset.zero & overlay.size,
    );

    showMenu<Pays>(
      context: context,
      position: position,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
      ),
      constraints: const BoxConstraints(maxHeight: 280, maxWidth: 220),
      items: PaysTelephone.liste.map((p) {
        final actif = p.indicatif == pays.indicatif;
        return PopupMenuItem<Pays>(
          value: p,
          height: 44,
          child: Row(
            children: [
              Text(p.drapeau, style: const TextStyle(fontSize: 17)),
              const SizedBox(width: 10),
              Text(
                p.indicatif,
                style: TextStyle(
                  color: actif ? JegoTheme.vert : JegoTheme.texte,
                  fontSize: 13.5,
                  fontWeight: actif ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (actif)
                const Icon(Icons.check_rounded,
                    size: 16, color: JegoTheme.vert),
            ],
          ),
        );
      }).toList(),
    ).then((choisi) {
      if (choisi != null) onPays(choisi);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      child: Row(
        children: [
          BoutonTactile(
            onTap: () => _ouvrirListe(context),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(pays.drapeau, style: const TextStyle(fontSize: 17)),
                  const SizedBox(width: 5),
                  Text(
                    pays.indicatif,
                    style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Icon(Icons.keyboard_arrow_down_rounded,
                      size: 17, color: JegoTheme.texteTernaire),
                ],
              ),
            ),
          ),
          Container(width: 1, height: 26, color: JegoTheme.bordCarte),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              onChanged: onChange,
              style:
                  const TextStyle(color: JegoTheme.texte, fontSize: 14),
              cursorColor: JegoTheme.vert,
              decoration: InputDecoration(
                hintText: libelle,
                hintStyle: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 13.5),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}