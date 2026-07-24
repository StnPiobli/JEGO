/// Calcul du remboursement en cas d'annulation client, selon barème
/// flexible/standard a 4 paliers. Arrondi TOUJOURS vers le bas (JEGO
/// garde la fraction restante, jamais le client).
///
/// Flexible : >7j 100% | 7j->24h 80% | 24h->depart 50%
/// Standard : >7j 30%  | 7j->24h 20% | 24h->2h 10% | <2h 0%
int calculerRemboursement({
  required bool flexible,
  required int prix,
  required DateTime depart,
}) {
  final maintenant = DateTime.now();
  final delta = depart.difference(maintenant);
  if (delta.isNegative) return 0; // depart deja passe

  int pourcentage;
  if (flexible) {
    if (delta >= const Duration(days: 7)) {
      pourcentage = 100;
    } else if (delta >= const Duration(hours: 24)) {
      pourcentage = 80;
    } else {
      pourcentage = 50;
    }
  } else {
    if (delta >= const Duration(days: 7)) {
      pourcentage = 30;
    } else if (delta >= const Duration(hours: 24)) {
      pourcentage = 20;
    } else if (delta >= const Duration(hours: 2)) {
      pourcentage = 10;
    } else {
      pourcentage = 0;
    }
  }

  // Division entiere = arrondi vers le bas pour des valeurs positives.
  return (prix * pourcentage) ~/ 100;
}