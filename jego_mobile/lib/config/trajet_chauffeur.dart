/// Trajets assignes au chauffeur, sur plusieurs semaines. Fixes en dur
/// faute de backend qui assignerait reellement les trajets -- au
/// branchement, ceci viendra de la table trajets/affectations cote
/// serveur, filtree par chauffeur connecte.
class TrajetChauffeur {
  static final List<Map<String, dynamic>> tous = _genererTrajets();

  static final Set<String> _termines = {};
  static void marquerTermine(String reference) => _termines.add(reference);
  static bool estTermine(String reference) => _termines.contains(reference);

  /// Retard cumule en minutes, par reference de trajet. Chaque nouveau
  /// signalement s'ajoute au precedent -- le message envoye montre
  /// toujours le total, pas seulement le dernier ajout.
  static final Map<String, int> _retardsCumules = {};
  static int retardCumule(String reference) => _retardsCumules[reference] ?? 0;
  static int ajouterRetard(String reference, int minutes) {
    final total = (_retardsCumules[reference] ?? 0) + minutes;
    _retardsCumules[reference] = total;
    return total;
  }

  /// Nombre de billets scannes, par reference de trajet -- persiste
  /// meme apres que le trajet soit marque termine (visible dans
  /// l'historique), contrairement a un simple compteur local d'ecran.
  static final Map<String, int> _billetsScannes = {};
  static int billetsScannes(String reference) => _billetsScannes[reference] ?? 0;
  static void incrementerScan(String reference) {
    _billetsScannes[reference] = (_billetsScannes[reference] ?? 0) + 1;
  }

  static List<Map<String, dynamic>> _genererTrajets() {
    final aujourdhui = DateTime.now();
    final debut = DateTime(aujourdhui.year, aujourdhui.month, aujourdhui.day);

    const decalagesJours = [
      0, 2, 5, 7, 9, 12, 14, 16, 19, 21, 23, 26, 28, 30,
      33, 35, 37, 40, 42, 44, 47, 49, 51, 54,
    ];
    const villes = [
      ['Douala', 'Yaounde', 'Gare routiere Bonaberi', 'Gare routiere Mvan', ['Loum']],
      ['Yaounde', 'Douala', 'Gare routiere Mvan', 'Gare routiere Bonaberi', ['Loum']],
      ['Douala', 'Bafoussam', 'Gare routiere Bonaberi', 'Gare routiere Centrale', ['Nkongsamba']],
      ['Bafoussam', 'Douala', 'Gare routiere Centrale', 'Gare routiere Bonaberi', ['Nkongsamba']],
    ];
    const heuresDepart = ['06:30', '07:00', '09:15', '14:00', '16:30'];
    const dureesHeures = [4, 5, 3, 6];
    const bus = ['Confort 01', 'Confort 02', 'Express 03'];
    const capacites = [40, 32, 29];

    return List.generate(decalagesJours.length, (i) {
      final date = debut.add(Duration(days: decalagesJours[i]));
      final couple = villes[i % villes.length];
      final capacite = capacites[i % capacites.length];
      final hd = heuresDepart[i % heuresDepart.length].split(':');
      final depart = DateTime(date.year, date.month, date.day, int.parse(hd[0]), int.parse(hd[1]));
      final arrivee = depart.add(Duration(hours: dureesHeures[i % dureesHeures.length]));
      return {
        'date': date,
        'ville_depart': couple[0],
        'ville_arrivee': couple[1],
        'point_depart': couple[2],
        'point_arrivee': couple[3],
        'arrets': couple[4],
        'heure_depart': heuresDepart[i % heuresDepart.length],
        'heure_arrivee':
            '${arrivee.hour.toString().padLeft(2, '0')}:${arrivee.minute.toString().padLeft(2, '0')}',
        'bus': bus[i % bus.length],
        'capacite': capacite,
        'places_reservees': (capacite * 0.7).round() + (i % 4),
        'reference':
            'TRJ-${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}-${(i + 1).toString().padLeft(3, '0')}',
      };
    });
  }

  static DateTime dateHeure(Map<String, dynamic> t) {
    final d = t['date'] as DateTime;
    final h = (t['heure_depart'] as String).split(':');
    return DateTime(d.year, d.month, d.day, int.parse(h[0]), int.parse(h[1]));
  }

  static Map<String, dynamic>? get prochain {
    final maintenant = DateTime.now();
    final futurs = tous.where((t) {
      if (_termines.contains(t['reference'])) return false;
      return dateHeure(t).isAfter(maintenant) || _memeJour(dateHeure(t), maintenant);
    }).toList()
      ..sort((a, b) => dateHeure(a).compareTo(dateHeure(b)));
    return futurs.isEmpty ? null : futurs.first;
  }

  static bool _memeJour(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static Map<String, dynamic>? trajetDuJour(DateTime jour) {
    for (final t in tous) {
      final d = t['date'] as DateTime;
      if (d.year == jour.year && d.month == jour.month && d.day == jour.day) {
        return t;
      }
    }
    return null;
  }

  static List<Map<String, dynamic>> get historique {
    final maintenant = DateTime.now();
    final passes = tous.where((t) {
      return _termines.contains(t['reference']) || dateHeure(t).isBefore(maintenant);
    }).toList()
      ..sort((a, b) => dateHeure(b).compareTo(dateHeure(a)));
    return passes;
  }
}