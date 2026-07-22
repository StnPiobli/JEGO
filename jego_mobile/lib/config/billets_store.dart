import 'package:flutter/material.dart';

/// Billets valides (apres paiement) + billet passe fictif pour la demo.
class BilletsStore {
  static final ValueNotifier<List<Map<String, dynamic>>> billets =
      ValueNotifier<List<Map<String, dynamic>>>([
    {
      'id': 'passe-demo-1',
      'groupe': 'passe-demo',
      'num_resa': 'JEGO-PA5T01',
      'ville_depart': 'Douala',
      'ville_arrivee': 'Kribi',
      'point_depart': 'Bonabéri',
      'point_arrivee': 'Centre',
      'heure_depart': '08:00',
      'heure_arrivee': '10:30',
      'date': '2026-06-15',
      'nom_agence': 'Finexs Voyages',
      'categorie': 'VIP',
      'nombre_arrets': 0,
      'arrets_liste': null,
      'equipements': ['clim', 'usb', 'wifi'],
      'sieges': [12],
      'personne': 1,
      'total_personnes': 1,
      'flexible': false,
      'code_qr': '99-12-JEGO',
      'frais': [
        {'libelle': 'Billet', 'montant': '6500 FCFA'},
      ],
      'total': 6500,
    },
  ]);

  static void ajouter(Map<String, dynamic> billet) {
    billets.value = [...billets.value, billet];
  }

  static void supprimer(String id) {
    billets.value = billets.value.where((b) => b['id'] != id).toList();
  }

  static void supprimerGroupe(String groupe) {
    billets.value =
        billets.value.where((b) => b['groupe'] != groupe).toList();
  }

  /// Fusionne des changements dans le billet identifie par [id].
  /// DEMO : persistance en memoire seulement. Le vrai backend fera
  /// la meme chose via une vraie API au branchement.
  static void mettreAJour(String id, Map<String, dynamic> changements) {
    billets.value = billets.value.map((b) {
      if (b['id'] == id) return {...b, ...changements};
      return b;
    }).toList();
  }

  /// True si la date du billet est passee.
  static bool estPasse(Map<String, dynamic> b) {
    try {
      final d = DateTime.parse(b['date'] as String);
      final finJour = DateTime(d.year, d.month, d.day, 23, 59);
      return finJour.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }
}

/// Etat du verrou de siege, visible pendant tout le tunnel.
class SoftLock {
  static final ValueNotifier<int> secondes = ValueNotifier<int>(0);
  static final ValueNotifier<bool> actif = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> suspendu = ValueNotifier<bool>(false);

  static final GlobalKey<NavigatorState> navKey =
      GlobalKey<NavigatorState>();

  static void demarrer([int duree = 5 * 60]) {
    secondes.value = duree;
    actif.value = true;
    suspendu.value = false;
  }

  static void suspendre() => suspendu.value = true;
  static void reprendre() => suspendu.value = false;

  static void arreter() {
    actif.value = false;
    suspendu.value = false;
  }

  static void relancer([int duree = 5 * 60]) {
    secondes.value = duree;
    suspendu.value = false;
  }
}