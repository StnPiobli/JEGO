import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

/// Calendrier JEGO premium en panneau bas.
/// Taper un jour selectionne ET ferme. Annee via molette defilante.
Future<DateTime?> choisirDateJego(
  BuildContext context, {
  DateTime? initiale,
  required DateTime premiere,
  required DateTime derniere,
}) {
  return showModalBottomSheet<DateTime>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) => _CalendrierJego(
      initiale: initiale ?? premiere,
      premiere: DateTime(premiere.year, premiere.month, premiere.day),
      derniere: DateTime(derniere.year, derniere.month, derniere.day),
    ),
  );
}

class _CalendrierJego extends StatefulWidget {
  final DateTime initiale;
  final DateTime premiere;
  final DateTime derniere;

  const _CalendrierJego({
    required this.initiale,
    required this.premiere,
    required this.derniere,
  });

  @override
  State<_CalendrierJego> createState() => _CalendrierJegoState();
}

class _CalendrierJegoState extends State<_CalendrierJego> {
  late DateTime _mois;

  @override
  void initState() {
    super.initState();
    _mois = DateTime(widget.initiale.year, widget.initiale.month, 1);
  }

  bool get _peutReculer => DateTime(_mois.year, _mois.month - 1, 1).isAfter(
      DateTime(widget.premiere.year, widget.premiere.month, 0));

  bool get _peutAvancer => DateTime(_mois.year, _mois.month + 1, 1)
      .isBefore(DateTime(widget.derniere.year, widget.derniere.month + 1, 1));

  bool _selectionnable(DateTime jour) {
    return !jour.isBefore(widget.premiere) && !jour.isAfter(widget.derniere);
  }

  Future<void> _choisirAnnee() async {
    final anneeMin = widget.premiere.year;
    final anneeMax = widget.derniere.year;
    final annees = [for (var a = anneeMin; a <= anneeMax; a++) a];
    var indexInitial = annees.indexOf(_mois.year);
    if (indexInitial < 0) indexInitial = 0;

    final choisie = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        int selection = annees[indexInitial];
        final ctrl =
            FixedExtentScrollController(initialItem: indexInitial);
        return SafeArea(
          child: Container(
            margin: const EdgeInsets.fromLTRB(10, 0, 10, 10),
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              borderRadius: BorderRadius.circular(JegoTheme.rGrand),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: JegoTheme.bordCarte,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Text(
                  Strings.t('choisir_annee'),
                  style: TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 180,
                  child: Stack(
                    children: [
                      // Bande de selection centrale
                      Center(
                        child: Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: JegoTheme.vert.withOpacity(0.1),
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rPetit),
                          ),
                        ),
                      ),
                      ListWheelScrollView.useDelegate(
                        controller: ctrl,
                        itemExtent: 44,
                        perspective: 0.003,
                        diameterRatio: 1.6,
                        physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (i) =>
                            selection = annees[i],
                        childDelegate: ListWheelChildBuilderDelegate(
                          childCount: annees.length,
                          builder: (context, i) => Center(
                            child: Text(
                              '${annees[i]}',
                              style: TextStyle(
                                color: JegoTheme.texte,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                BoutonTactile(
                  onTap: () => Navigator.of(ctx).pop(selection),
                  child: Container(
                    width: double.infinity,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: JegoTheme.vert,
                      borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    ),
                    child: Text(
                      Strings.t('valider'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (choisie != null) {
      setState(() {
        var nouveau = DateTime(choisie, _mois.month, 1);
        if (nouveau.isBefore(
            DateTime(widget.premiere.year, widget.premiere.month, 1))) {
          nouveau =
              DateTime(widget.premiere.year, widget.premiere.month, 1);
        } else if (nouveau.isAfter(
            DateTime(widget.derniere.year, widget.derniere.month, 1))) {
          nouveau =
              DateTime(widget.derniere.year, widget.derniere.month, 1);
        }
        _mois = nouveau;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final langue = langueCourante.value == 'en' ? 'en' : 'fr';
    String nomMois;
    try {
      nomMois = DateFormat('MMMM yyyy', langue).format(_mois);
    } catch (_) {
      nomMois = DateFormat('MMMM yyyy').format(_mois);
    }
    final joursSemaine = langue == 'en'
        ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        : ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    final premierJour = DateTime(_mois.year, _mois.month, 1);
    final decalage = premierJour.weekday - 1;
    final nbJours = DateTime(_mois.year, _mois.month + 1, 0).day;
    final aujourdHui = DateTime.now();
    final ceJour =
        DateTime(aujourdHui.year, aujourdHui.month, aujourdHui.day);

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(10, 0, 10, 10),
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rGrand),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF14201A).withOpacity(0.14),
              blurRadius: 30,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: JegoTheme.bordCarte,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Row(
              children: [
                BoutonTactile(
                  onTap: _choisirAnnee,
                  child: Row(
                    children: [
                      Text(
                        nomMois[0].toUpperCase() + nomMois.substring(1),
                        style: TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.keyboard_arrow_down_rounded,
                          size: 20, color: JegoTheme.vert),
                    ],
                  ),
                ),
                const Spacer(),
                _fleche(Icons.chevron_left_rounded, _peutReculer, () {
                  setState(() =>
                      _mois = DateTime(_mois.year, _mois.month - 1, 1));
                }),
                const SizedBox(width: 8),
                _fleche(Icons.chevron_right_rounded, _peutAvancer, () {
                  setState(() =>
                      _mois = DateTime(_mois.year, _mois.month + 1, 1));
                }),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: joursSemaine
                  .map((j) => Expanded(
                        child: Center(
                          child: Text(
                            j,
                            style: TextStyle(
                              color: JegoTheme.texteTernaire,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 6),
            SizedBox(
              height: 6 * 44,
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate:
                    const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisExtent: 44,
                ),
                itemCount: decalage + nbJours,
                itemBuilder: (context, i) {
                  if (i < decalage) return const SizedBox();
                  final numJour = i - decalage + 1;
                  final jour = DateTime(_mois.year, _mois.month, numJour);
                  final actif = _selectionnable(jour);
                  final estAujourdHui = jour == ceJour;
                  final estInitiale =
                      jour.year == widget.initiale.year &&
                          jour.month == widget.initiale.month &&
                          jour.day == widget.initiale.day;

                  return Center(
                    child: GestureDetector(
                      onTap: actif
                          ? () => Navigator.of(context).pop(jour)
                          : null,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        width: 38,
                        height: 38,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: estInitiale
                              ? JegoTheme.vert
                              : Colors.transparent,
                          shape: BoxShape.circle,
                          border: estAujourdHui && !estInitiale
                              ? Border.all(
                                  color: JegoTheme.vert, width: 1.2)
                              : null,
                        ),
                        child: Text(
                          '$numJour',
                          style: TextStyle(
                            color: estInitiale
                                ? Colors.white
                                : actif
                                    ? JegoTheme.texte
                                    : JegoTheme.bordCarte,
                            fontSize: 14,
                            fontWeight: estInitiale || estAujourdHui
                                ? FontWeight.w800
                                : FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fleche(IconData icone, bool actif, VoidCallback onTap) {
    return BoutonTactile(
      onTap: actif ? onTap : null,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: actif ? JegoTheme.vert.withOpacity(0.1) : JegoTheme.champ,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icone,
          size: 20,
          color: actif ? JegoTheme.vert : JegoTheme.bordCarte,
        ),
      ),
    );
  }
}