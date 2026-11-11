import 'package:intl/intl.dart';
import '../l10n/strings.dart';

/// Convertit '2025-07-12' -> '12 juillet 2025' (ou anglais).
class FormatDate {
  /// '12 mars 2025' -> 'mars 2025' pour "Membre depuis".
  static String moisAnnee(DateTime d) {
    final langue = langueCourante.value == 'en' ? 'en' : 'fr';
    try {
      return DateFormat('MMMM yyyy', langue).format(d);
    } catch (_) {
      return DateFormat('MMMM yyyy').format(d);
    }
  }

  /// '2026-11-25' (ou un horodatage complet) -> '25/11/2026', pour les
  /// endroits serrés. Une valeur illisible est rendue telle quelle.
  static String courte(String iso) {
    if (iso.isEmpty) return '';
    try {
      final d = iso.contains('T') ? DateTime.parse(iso).toLocal() : DateTime.parse(iso);
      return DateFormat('dd/MM/yyyy').format(d);
    } catch (_) {
      return iso;
    }
  }

  static String lisible(String iso) {
    if (iso.isEmpty) return '';
    try {
      // Heure locale : un instant serveur en UTC (« …T23:30:00Z ») tombe
      // sinon la veille au Cameroun.
      final d = DateTime.parse(iso).toLocal();
      final langue = langueCourante.value == 'en' ? 'en' : 'fr';
      return DateFormat('d MMMM yyyy', langue).format(d);
    } catch (_) {
      return iso;
    }
  }
}