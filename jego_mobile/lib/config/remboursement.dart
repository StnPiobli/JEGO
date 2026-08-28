/// Remboursement en cas d'annulation par le client.
///
/// Bareme du cahier des charges §16, identique a celui applique par le
/// serveur dans annulationController.js :
///
///   Billet flexible, annule plus de 24 h avant le depart : 80 %
///   Billet flexible, annule moins de 24 h avant          : 50 %
///   Billet standard, quelle que soit l'avance            :  0 %
///
/// Le bareme precedent annoncait 100 %, 30 %, 20 % et 10 % selon
/// l'avance. Le serveur n'a jamais rien verse de tel : quelqu'un
/// annulait un billet standard sur la promesse de 20 %, confirmait, et
/// ne recevait rien. Une promesse d'argent non tenue est ce qui coute
/// le plus cher a une clientele mefiante.
///
/// L'arrondi va TOUJOURS vers le bas : JEGO garde la fraction, jamais
/// l'inverse.
int calculerRemboursement({
  required bool flexible,
  required int prix,
  required DateTime depart,
}) {
  final delta = depart.difference(DateTime.now());
  if (delta.isNegative) return 0; // depart deja passe
  if (!flexible) return 0;

  final pourcentage = delta >= const Duration(hours: 24) ? 80 : 50;
  return (prix * pourcentage) ~/ 100;
}
