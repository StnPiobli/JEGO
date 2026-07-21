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

  static String lisible(String iso) {
    if (iso.isEmpty) return '';
    try {
      final d = DateTime.parse(iso);
      final langue = langueCourante.value == 'en' ? 'en' : 'fr';
      return DateFormat('d MMMM yyyy', langue).format(d);
    } catch (_) {
      return iso;
    }
  }
}