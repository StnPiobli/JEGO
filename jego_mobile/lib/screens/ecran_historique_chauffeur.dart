import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../config/trajet_chauffeur.dart';
import '../widgets/itineraire_trajet.dart';

class EcranHistoriqueChauffeur extends StatefulWidget {
  const EcranHistoriqueChauffeur({super.key});

  @override
  State<EcranHistoriqueChauffeur> createState() => _EcranHistoriqueChauffeurState();
}

class _EcranHistoriqueChauffeurState extends State<EcranHistoriqueChauffeur> {
  final Set<String> _ouverts = {};
  DateTimeRange? _plage;

  String _dateLisible(DateTime d) {
    const mois = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aout', 'sep', 'oct', 'nov', 'dec'];
    return '${d.day} ${mois[d.month - 1]} ${d.year}';
  }

  Future<void> _choisirPlage() async {
    final choisie = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: _plage,
      helpText: 'Filtrer par periode',
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: JegoTheme.vert)),
        child: child!,
      ),
    );
    if (choisie != null) setState(() => _plage = choisie);
  }

  @override
  Widget build(BuildContext context) {
    var historique = TrajetChauffeur.historique;
    if (_plage != null) {
      historique = historique.where((t) {
        final d = t['date'] as DateTime;
        return !d.isBefore(_plage!.start) && !d.isAfter(_plage!.end);
      }).toList();
    }

    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Historique de voyage',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 4),
            child: Row(
              children: [
                Expanded(
                  child: BoutonTactile(
                    onTap: _choisirPlage,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: JegoTheme.fondCarte,
                        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                        border: Border.all(color: JegoTheme.bordCarte),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.date_range_rounded, size: 16, color: JegoTheme.vert),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _plage == null
                                  ? 'Filtrer par periode'
                                  : '${_dateLisible(_plage!.start)} — ${_dateLisible(_plage!.end)}',
                              style: const TextStyle(
                                  color: JegoTheme.texte, fontSize: 12.5, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_plage != null)
                  BoutonTactile(
                    onTap: () => setState(() => _plage = null),
                    child: Container(
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          shape: BoxShape.circle,
                          border: Border.all(color: JegoTheme.bordCarte)),
                      child: const Icon(Icons.close_rounded, size: 16, color: JegoTheme.texteSecondaire),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: historique.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.history_rounded, size: 36, color: JegoTheme.texteTernaire),
                        const SizedBox(height: 10),
                        Text(
                            _plage == null
                                ? 'Aucun trajet effectue pour l\'instant.'
                                : 'Aucun trajet sur cette periode.',
                            style: TextStyle(color: JegoTheme.texteSecondaire)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(18),
                    itemCount: historique.length,
                    itemBuilder: (context, i) {
                      final t = historique[i];
                      final reference = '${t['reference']}';
                      final termine = TrajetChauffeur.estTermine(reference);
                      final retard = TrajetChauffeur.retardCumule(reference);
                      final scans = TrajetChauffeur.billetsScannes(reference);
                      final ouvert = _ouverts.contains(reference);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                          border: Border.all(color: JegoTheme.bordCarte),
                          boxShadow: JegoTheme.ombreDouce,
                        ),
                        child: Column(
                          children: [
                            BoutonTactile(
                              onTap: () => setState(() {
                                ouvert ? _ouverts.remove(reference) : _ouverts.add(reference);
                              }),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: (termine ? JegoTheme.vert : JegoTheme.texteTernaire)
                                            .withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        termine ? Icons.check_circle_rounded : Icons.history_rounded,
                                        color: termine ? JegoTheme.vert : JegoTheme.texteTernaire,
                                        size: 19,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('${t['ville_depart']} → ${t['ville_arrivee']}',
                                              style: const TextStyle(
                                                  color: JegoTheme.texte,
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w800)),
                                          Text('${_dateLisible(t['date'] as DateTime)} · ${t['heure_depart']}',
                                              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                    Icon(ouvert ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                                        color: JegoTheme.texteTernaire),
                                  ],
                                ),
                              ),
                            ),
                            if (ouvert)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                child: Column(
                                  children: [
                                    const Divider(height: 1, color: JegoTheme.bordCarte),
                                    const SizedBox(height: 10),
                                    // Itineraire complet : heures, lieux de
                                    // prise en charge et mouvements de
                                    // voyageurs, comme sur les deux autres
                                    // ecrans chauffeur.
                                    ItineraireTrajet(
                                        points:
                                            (t['itineraire'] as List?) ?? const []),
                                    const SizedBox(height: 10),
                                    _ligne('Bus', '${t['bus']}'),
                                    // Pas de rapport a la capacite : sur une
                                    // ligne a troncons, un meme siege sert a
                                    // plusieurs voyageurs successifs.
                                    _ligne('Passagers',
                                        '${t['places_reservees']} reservations'),
                                    _ligne('Billets scannes', '$scans',
                                        couleur: JegoTheme.vert),
                                    if (retard > 0)
                                      _ligne('Retard signale', '$retard minutes',
                                          couleur: const Color(0xFFE6B84C)),
                                    _ligne('Reference', reference),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _ligne(String libelle, String valeur, {Color? couleur}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(libelle, style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
          ),
          Expanded(
            child: Text(valeur,
                style: TextStyle(
                    color: couleur ?? JegoTheme.texte, fontSize: 12.5, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}