import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Widget partage : liste a choix unique avec en-tete premium. Utilise
/// par Theme, Devise, Unites. Les options desactivees sont affichees
/// grisees avec un badge "Bientot disponible" -- honnete plutot que de
/// laisser croire qu'elles fonctionnent.
class OptionChoix {
  final String valeur;
  final String libelle;
  final bool disponible;
  const OptionChoix(this.valeur, this.libelle, {this.disponible = true});
}

class EcranChoixGenerique extends StatefulWidget {
  final String titre;
  final IconData icone;
  final List<OptionChoix> options;
  final String valeurInitiale;
  final ValueChanged<String>? onChange;

  const EcranChoixGenerique({
    super.key,
    required this.titre,
    required this.icone,
    required this.options,
    required this.valeurInitiale,
    this.onChange,
  });

  @override
  State<EcranChoixGenerique> createState() => _EcranChoixGeneriqueState();
}

class _EcranChoixGeneriqueState extends State<EcranChoixGenerique> {
  late String _choisi = widget.valeurInitiale;

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
        children: widget.options.map((o) {
          final actif = o.valeur == _choisi;
          return Opacity(
            opacity: o.disponible ? 1 : 0.5,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: BoutonTactile(
                onTap: o.disponible
                    ? () {
                        setState(() => _choisi = o.valeur);
                        widget.onChange?.call(o.valeur);
                      }
                    : () {},
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: actif ? JegoTheme.vert.withOpacity(0.08) : JegoTheme.fondCarte,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    border: Border.all(
                        color: actif ? JegoTheme.vert : JegoTheme.bordCarte,
                        width: actif ? 1.4 : 1),
                  ),
                  child: Row(
                    children: [
                      Icon(actif ? Icons.check_circle_rounded : Icons.circle_outlined,
                          size: 20, color: actif ? JegoTheme.vert : JegoTheme.texteTernaire),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(o.libelle,
                            style: TextStyle(
                                color: JegoTheme.texte,
                                fontSize: 14,
                                fontWeight: actif ? FontWeight.w800 : FontWeight.w600)),
                      ),
                      if (!o.disponible)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: JegoTheme.champ,
                            borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                          ),
                          child: Text('Bientot disponible',
                              style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 10)),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}