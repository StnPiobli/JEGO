import 'package:flutter/material.dart';

/// Portefeuille JEGO : credite par les remboursements d'annulation,
/// utilisable uniquement pour payer d'autres achats dans l'application.
/// DEMO : solde en memoire seulement, jamais persiste. Au branchement,
/// le solde et l'historique viendront du backend (table wallet_transactions
/// ou equivalent), et le paiement pourra piocher dedans lors du checkout.
class WalletStore {
  static final ValueNotifier<int> solde = ValueNotifier<int>(0);
  static final ValueNotifier<List<Map<String, dynamic>>> historique =
      ValueNotifier<List<Map<String, dynamic>>>([]);

  static void crediter(int montant, String motif) {
    if (montant <= 0) return;
    solde.value += montant;
    historique.value = [
      {
        'montant': montant,
        'motif': motif,
        'date': DateTime.now().toIso8601String(),
      },
      ...historique.value,
    ];
  }
}