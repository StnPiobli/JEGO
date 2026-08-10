import 'api.dart';
import 'session_chauffeur.dart';

/// Trajets réellement assignés au chauffeur connecté.
///
/// Les données proviennent de la table `trajets` côté serveur,
/// filtrées par chauffeur : plus aucun trajet n'est fabriqué dans
/// l'application. L'interface publique (`tous`, `prochain`,
/// `historique`, `dateHeure`…) est conservée à l'identique pour que
/// les écrans chauffeur existants continuent de fonctionner sans
/// modification.
class TrajetChauffeur {
  /// Trajets chargés depuis le serveur.
  static List<Map<String, dynamic>> tous = [];

  static bool chargement = false;
  static String? erreur;

  /// Charge (ou recharge) les trajets du chauffeur connecté.
  static Future<void> charger() async {
    final token = SessionChauffeur.token;
    if (token == null) {
      tous = [];
      erreur = 'Session expirée. Reconnectez-vous.';
      return;
    }

    chargement = true;
    erreur = null;
    try {
      final brut = await ApiService.trajetsChauffeur(token);
      tous = brut.map<Map<String, dynamic>>(_convertir).toList()
        ..sort((a, b) => dateHeure(a).compareTo(dateHeure(b)));
      // Le serveur fait foi sur ce qui est terminé.
      _termines
        ..clear()
        ..addAll(tous
            .where((t) => t['statut'] == 'termine')
            .map((t) => '${t['reference']}'));
    } on ErreurApi catch (e) {
      erreur = e.message;
      tous = [];
    } finally {
      chargement = false;
    }
  }

  /// Traduit un trajet du serveur vers la forme attendue par les
  /// écrans chauffeur déjà en place.
  static Map<String, dynamic> _convertir(Map<String, dynamic> t) {
    final date = DateTime.tryParse('${t['date_depart']}') ?? DateTime.now();

    String heure(dynamic v) {
      if (v == null) return '--:--';
      final s = v.toString();
      return s.length >= 5 ? s.substring(0, 5) : s;
    }

    final arrets = ((t['arrets'] as List?) ?? [])
        .map((a) => a is Map ? '${a['nom_affiche'] ?? a['ville'] ?? ''}' : '$a')
        .where((a) => a.isNotEmpty)
        .toList();

    return {
      // Identifiant serveur : indispensable pour déclarer départ,
      // arrivée et passages aux arrêts.
      'id': t['id'],
      'date': DateTime(date.year, date.month, date.day),
      'ville_depart': t['depart_affiche'] ?? '',
      'ville_arrivee': t['arrivee_affiche'] ?? '',
      'point_depart': t['lieu_embarquement'] ?? t['depart_affiche'] ?? '',
      'point_arrivee': t['arrivee_affiche'] ?? '',
      'arrets': arrets,
      'heure_depart': heure(t['heure_depart']),
      'heure_arrivee': heure(t['heure_arrivee_estimee']),
      'bus': t['nom_bus'] ?? '',
      'capacite': int.tryParse('${t['capacite'] ?? 0}') ?? 0,
      'places_reservees': int.tryParse('${t['places_reservees'] ?? 0}') ?? 0,
      'statut': t['statut'] ?? 'programme',
      'reference': '${t['numero'] ?? t['id']}',
    };
  }

  static final Set<String> _termines = {};
  static void marquerTermine(String reference) => _termines.add(reference);
  static bool estTermine(String reference) => _termines.contains(reference);

  /// Retard cumulé en minutes, par référence de trajet. Chaque nouveau
  /// signalement s'ajoute au précédent — le message envoyé montre
  /// toujours le total, pas seulement le dernier ajout.
  static final Map<String, int> _retardsCumules = {};
  static int retardCumule(String reference) => _retardsCumules[reference] ?? 0;
  static int ajouterRetard(String reference, int minutes) {
    final total = (_retardsCumules[reference] ?? 0) + minutes;
    _retardsCumules[reference] = total;
    return total;
  }

  /// Nombre de billets scannés, par référence de trajet.
  static final Map<String, int> _billetsScannes = {};
  static int billetsScannes(String reference) => _billetsScannes[reference] ?? 0;
  static void incrementerScan(String reference) {
    _billetsScannes[reference] = (_billetsScannes[reference] ?? 0) + 1;
  }

  /// Identifiant serveur d'un trajet, à partir de sa référence.
  static String? idDepuisReference(String reference) {
    for (final t in tous) {
      if ('${t['reference']}' == reference) return '${t['id']}';
    }
    return null;
  }

  static DateTime dateHeure(Map<String, dynamic> t) {
    final d = t['date'] as DateTime? ?? DateTime.now();
    final brut = '${t['heure_depart'] ?? '00:00'}';
    final h = brut.split(':');
    final heures = h.isNotEmpty ? int.tryParse(h[0]) ?? 0 : 0;
    final minutes = h.length > 1 ? int.tryParse(h[1]) ?? 0 : 0;
    return DateTime(d.year, d.month, d.day, heures, minutes);
  }

  static Map<String, dynamic>? get prochain {
    final maintenant = DateTime.now();
    final futurs = tous.where((t) {
      if (_termines.contains(t['reference'])) return false;
      return dateHeure(t).isAfter(maintenant) ||
          _memeJour(dateHeure(t), maintenant);
    }).toList()
      ..sort((a, b) => dateHeure(a).compareTo(dateHeure(b)));
    return futurs.isEmpty ? null : futurs.first;
  }

  static bool _memeJour(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static Map<String, dynamic>? trajetDuJour(DateTime jour) {
    for (final t in tous) {
      final d = t['date'] as DateTime?;
      if (d == null) continue;
      if (d.year == jour.year && d.month == jour.month && d.day == jour.day) {
        return t;
      }
    }
    return null;
  }

  static List<Map<String, dynamic>> get historique {
    final maintenant = DateTime.now();
    final passes = tous.where((t) {
      return _termines.contains(t['reference']) ||
          dateHeure(t).isBefore(maintenant);
    }).toList()
      ..sort((a, b) => dateHeure(b).compareTo(dateHeure(a)));
    return passes;
  }
}
