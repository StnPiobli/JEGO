import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../config/trajet_chauffeur.dart';

/// Vue semaine complete. Le titre "date debut — date fin" est cliquable
/// pour choisir n'importe quelle semaine via un calendrier ; chaque jour
/// avec trajet est depliable pour voir les infos minimum necessaires.
class EcranEmploiDuTempsChauffeur extends StatefulWidget {
  const EcranEmploiDuTempsChauffeur({super.key});

  @override
  State<EcranEmploiDuTempsChauffeur> createState() => _EcranEmploiDuTempsChauffeurState();
}

class _EcranEmploiDuTempsChauffeurState extends State<EcranEmploiDuTempsChauffeur> {
  late DateTime _debutSemaine = _lundiDe(DateTime.now());
  final Set<String> _ouverts = {};

  DateTime _lundiDe(DateTime d) => DateTime(d.year, d.month, d.day).subtract(Duration(days: d.weekday - 1));

  String _dateLisible(DateTime d) {
    const mois = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aout', 'sep', 'oct', 'nov', 'dec'];
    return '${d.day} ${mois[d.month - 1]} ${d.year}';
  }

  bool _estAujourdhui(DateTime d) {
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month && d.day == n.day;
  }

  Future<void> _choisirSemaine() async {
    final choisi = await showDatePicker(
      context: context,
      initialDate: _debutSemaine,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: 'Choisir une semaine',
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: JegoTheme.vert)),
        child: child!,
      ),
    );
    if (choisi != null) setState(() => _debutSemaine = _lundiDe(choisi));
  }

  @override
  Widget build(BuildContext context) {
    const joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    final finSemaine = _debutSemaine.add(const Duration(days: 6));

    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Mon emploi du temps',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Row(
              children: [
                BoutonTactile(
                  onTap: () => setState(() => _debutSemaine = _debutSemaine.subtract(const Duration(days: 7))),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        color: JegoTheme.fondCarte, shape: BoxShape.circle, border: Border.all(color: JegoTheme.bordCarte)),
                    child: const Icon(Icons.chevron_left_rounded, size: 20, color: JegoTheme.texte),
                  ),
                ),
                Expanded(
                  child: BoutonTactile(
                    onTap: _choisirSemaine,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${_dateLisible(_debutSemaine)} — ${_dateLisible(finSemaine)}',
                            style: const TextStyle(
                                color: JegoTheme.texte, fontSize: 13.5, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.edit_calendar_rounded, size: 15, color: JegoTheme.vert),
                        ],
                      ),
                    ),
                  ),
                ),
                BoutonTactile(
                  onTap: () => setState(() => _debutSemaine = _debutSemaine.add(const Duration(days: 7))),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        color: JegoTheme.fondCarte, shape: BoxShape.circle, border: Border.all(color: JegoTheme.bordCarte)),
                    child: const Icon(Icons.chevron_right_rounded, size: 20, color: JegoTheme.texte),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
              itemCount: 7,
              itemBuilder: (context, i) {
                final jour = _debutSemaine.add(Duration(days: i));
                final trajet = TrajetChauffeur.trajetDuJour(jour);
                final aujourdhui = _estAujourdhui(jour);
                final cle = '${jour.year}-${jour.month}-${jour.day}';
                final ouvert = _ouverts.contains(cle);
                final arrets = trajet == null ? <String>[] : (trajet['arrets'] as List).cast<String>();

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: aujourdhui ? JegoTheme.vert.withOpacity(0.06) : JegoTheme.fondCarte,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    border: Border.all(color: aujourdhui ? JegoTheme.vert.withOpacity(0.3) : JegoTheme.bordCarte),
                  ),
                  child: Column(
                    children: [
                      BoutonTactile(
                        onTap: trajet == null
                            ? null
                            : () => setState(() {
                                  ouvert ? _ouverts.remove(cle) : _ouverts.add(cle);
                                }),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 56,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(joursSemaine[i],
                                        style: TextStyle(
                                            color: aujourdhui ? JegoTheme.vert : JegoTheme.texteSecondaire,
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700)),
                                    Text('${jour.day}',
                                        style: TextStyle(
                                            color: aujourdhui ? JegoTheme.vert : JegoTheme.texte,
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: trajet == null
                                    ? Text('Aucun trajet',
                                        style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 12.5))
                                    : Row(
                                        children: [
                                          const Icon(Icons.directions_bus_rounded, size: 15, color: JegoTheme.vert),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text('${trajet['ville_depart']} → ${trajet['ville_arrivee']}',
                                                style: const TextStyle(
                                                    color: JegoTheme.texte,
                                                    fontSize: 12.5,
                                                    fontWeight: FontWeight.w700)),
                                          ),
                                        ],
                                      ),
                              ),
                              if (trajet != null)
                                Icon(ouvert ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                                    size: 20, color: JegoTheme.texteTernaire),
                            ],
                          ),
                        ),
                      ),
                      if (ouvert && trajet != null)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                          child: Column(
                            children: [
                              const Divider(height: 1, color: JegoTheme.bordCarte),
                              const SizedBox(height: 10),
                              _ligne('Depart', '${trajet['heure_depart']} · ${trajet['point_depart']}'),
                              _ligne('Arrivee prevue', '${trajet['heure_arrivee']} · ${trajet['point_arrivee']}'),
                              if (arrets.isNotEmpty) _ligne('Arrets', arrets.join(', ')),
                              _ligne('Bus', '${trajet['bus']} · ${trajet['capacite']} places'),
                              _ligne('Reference', '${trajet['reference']}'),
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

  Widget _ligne(String libelle, String valeur) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(libelle, style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
          ),
          Expanded(
            child: Text(valeur,
                style: const TextStyle(color: JegoTheme.texte, fontSize: 12.5, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}