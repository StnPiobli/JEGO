import 'package:flutter/material.dart';

import 'api.dart';
import 'session.dart';

/// Portefeuille JEGO : le registre des remboursements du voyageur, tel
/// que le serveur le connait.
///
/// Le solde etait tenu en memoire, credite localement a l'annulation
/// d'un billet, et repartait a zero a chaque redemarrage. Il ne
/// correspondait a aucune somme reelle. Il est desormais calcule par le
/// serveur comme le total des remboursements traites -- un registre,
/// pas un nombre stocke quelque part qui pourrait deriver du reel.
///
/// Aucun debit n'existe : rien, dans le paiement, ne consomme encore ce
/// solde. L'ecran le presente donc comme un total rembourse, pas comme
/// un credit depensable.
class WalletStore {
  static final ValueNotifier<int> solde = ValueNotifier<int>(0);
  static final ValueNotifier<List<Map<String, dynamic>>> historique =
      ValueNotifier<List<Map<String, dynamic>>>([]);

  static final ValueNotifier<bool> chargement = ValueNotifier<bool>(false);
  static final ValueNotifier<String?> erreur = ValueNotifier<String?>(null);

  static Future<void> charger() async {
    // Sans session, le serveur refuserait : on n'appelle pas plutot que
    // de remonter « token manquant » a quelqu'un qui n'est pas connecte.
    if (Session.token == null) {
      vider();
      return;
    }
    chargement.value = true;
    erreur.value = null;
    try {
      final rep = await ApiService.monPortefeuille();
      solde.value = int.tryParse('${rep['solde'] ?? 0}') ?? 0;
      historique.value = ((rep['mouvements'] as List?) ?? [])
          .map<Map<String, dynamic>>((m) => Map<String, dynamic>.from(m))
          .toList();
    } on ErreurApi catch (e) {
      erreur.value = e.message;
      solde.value = 0;
      historique.value = [];
    } finally {
      chargement.value = false;
    }
  }

  /// Le portefeuille d'un compte ne doit jamais rester visible pour la
  /// personne qui se connecte ensuite.
  static void vider() {
    solde.value = 0;
    historique.value = [];
    erreur.value = null;
  }
}
