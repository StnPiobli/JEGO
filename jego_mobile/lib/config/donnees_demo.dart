/// Donnees fictives pour developper le front sans backend.
class DonneesDemo {
  /// Offres ALLER (Douala -> Yaounde), points de depart/arrivee exacts.
  static const List<Map<String, dynamic>> offres = [
    {
      'id': 1,
      'heure_depart': '06:30',
      'heure_arrivee': '10:15',
      'nom_agence': 'Finexs Voyages',
      'agence_id': 1,
      'note_moyenne': 4.6,
      'prix': 6500,
      'categorie': 'VIP',
      'nombre_arrets': 0,
      'equipements': ['clim', 'usb', 'wifi'],
      'prix_siege_premium': 1500,
      'point_depart': 'Bonabéri',
      'point_arrivee': 'Mvan',
    },
    {
      'id': 2,
      'heure_depart': '07:00',
      'heure_arrivee': '11:30',
      'nom_agence': 'Général Express',
      'agence_id': 2,
      'note_moyenne': 4.1,
      'prix': 4000,
      'categorie': 'Standard',
      'nombre_arrets': 2,
      'arrets_liste': ['Edéa', 'Pouma'],
      'equipements': ['clim'],
      'prix_siege_premium': 1000,
      'point_depart': 'Akwa',
      'point_arrivee': 'Ekounou',
    },
    {
      'id': 3,
      'heure_depart': '09:00',
      'heure_arrivee': '12:40',
      'nom_agence': 'Touristique Express',
      'agence_id': 3,
      'note_moyenne': 4.4,
      'prix': 5500,
      'categorie': 'Express',
      'nombre_arrets': 0,
      'equipements': ['clim', 'usb', 'toilettes'],
      'prix_siege_premium': 1200,
      'point_depart': 'Ndokoti',
      'point_arrivee': 'Nsam',
    },
    {
      'id': 4,
      'heure_depart': '21:30',
      'heure_arrivee': '01:45',
      'nom_agence': 'Finexs Voyages',
      'agence_id': 1,
      'note_moyenne': 4.6,
      'prix': 7000,
      'categorie': 'Nuit',
      'nombre_arrets': 0,
      'equipements': ['clim', 'usb', 'wifi', 'inclinables'],
      'prix_siege_premium': 2000,
      'point_depart': 'Bonabéri',
      'point_arrivee': 'Mvan',
    },
  ];

  /// Offres RETOUR (Yaounde -> Douala).
  static const List<Map<String, dynamic>> offresRetour = [
    {
      'id': 101,
      'heure_depart': '07:30',
      'heure_arrivee': '11:10',
      'nom_agence': 'Finexs Voyages',
      'agence_id': 1,
      'note_moyenne': 4.6,
      'prix': 6500,
      'categorie': 'VIP',
      'nombre_arrets': 0,
      'equipements': ['clim', 'usb', 'wifi'],
      'prix_siege_premium': 1500,
      'point_depart': 'Mvan',
      'point_arrivee': 'Bonabéri',
    },
    {
      'id': 102,
      'heure_depart': '13:00',
      'heure_arrivee': '17:20',
      'nom_agence': 'Général Express',
      'agence_id': 2,
      'note_moyenne': 4.1,
      'prix': 4000,
      'categorie': 'Standard',
      'nombre_arrets': 1,
      'arrets_liste': ['Boumnyebel'],
      'equipements': ['clim'],
      'prix_siege_premium': 1000,
      'point_depart': 'Ekounou',
      'point_arrivee': 'Akwa',
    },
    {
      'id': 103,
      'heure_depart': '18:00',
      'heure_arrivee': '21:40',
      'nom_agence': 'Touristique Express',
      'agence_id': 3,
      'note_moyenne': 4.4,
      'prix': 5500,
      'categorie': 'Express',
      'nombre_arrets': 0,
      'equipements': ['clim', 'usb', 'toilettes'],
      'prix_siege_premium': 1200,
      'point_depart': 'Nsam',
      'point_arrivee': 'Ndokoti',
    },
  ];

  static const Map<int, Map<String, dynamic>> agences = {
    1: {
      'nom': 'Finexs Voyages',
      'certifiee': true,
      'note_generale': 4.6,
      'note_service': 4.7,
      'note_conduite': 4.5,
      'note_horaires': 4.4,
      'note_confort': 4.8,
      'commentaires': [
        {
          'auteur': 'Marie K.',
          'note': 5,
          'texte': 'Bus propre, départ à l\'heure, très satisfaite.',
          'date': '2026-07-02',
        },
        {
          'auteur': 'Jean-Paul N.',
          'note': 4,
          'texte': 'Bon voyage, la clim marchait bien. Petit retard de 20 min.',
          'date': '2026-06-28',
        },
        {
          'auteur': 'Aïcha B.',
          'note': 5,
          'texte': 'Le chauffeur conduisait prudemment, je recommande.',
          'date': '2026-06-15',
        },
      ],
    },
    2: {
      'nom': 'Général Express',
      'certifiee': true,
      'note_generale': 4.1,
      'note_service': 3.9,
      'note_conduite': 4.2,
      'note_horaires': 3.8,
      'note_confort': 4.0,
      'commentaires': [
        {
          'auteur': 'Serge M.',
          'note': 4,
          'texte': 'Correct pour le prix.',
          'date': '2026-07-05',
        },
      ],
    },
    3: {
      'nom': 'Touristique Express',
      'certifiee': false,
      'note_generale': 4.4,
      'note_service': 4.3,
      'note_conduite': 4.5,
      'note_horaires': 4.2,
      'note_confort': 4.5,
      'commentaires': [
        {
          'auteur': 'Florence T.',
          'note': 5,
          'texte': 'Très bon service à bord.',
          'date': '2026-06-30',
        },
      ],
    },
  };

  static List<Map<String, dynamic>> planSieges(int trajetId) {
    final sieges = <Map<String, dynamic>>[];
    var numero = 1;

    const statutsSpeciaux = {
      3: 'vendu_ligne',
      7: 'vendu_ligne',
      8: 'vendu_physique',
      12: 'vendu_physique',
      15: 'reserve',
      18: 'abime',
      22: 'vendu_ligne',
      27: 'toilette',
      31: 'vendu_ligne',
      36: 'vendu_physique',
    };

    for (var rangee = 0; rangee < 10; rangee++) {
      for (var col = 0; col < 4; col++) {
        final position = (col == 0 || col == 3) ? 'fenetre' : 'couloir';
        sieges.add({
          'numero': numero,
          'rangee': rangee,
          'colonne': col,
          'statut': statutsSpeciaux[numero] ?? 'disponible',
          'type': rangee < 2 ? 'premium' : 'standard',
          'position': position,
        });
        numero++;
      }
    }
    for (var col = 0; col < 5; col++) {
      final position =
          (col == 0 || col == 4) ? 'fenetre' : (col == 2 ? 'milieu' : 'couloir');
      sieges.add({
        'numero': numero,
        'rangee': 10,
        'colonne': col,
        'statut': statutsSpeciaux[numero] ?? 'disponible',
        'type': 'standard',
        'position': position,
      });
      numero++;
    }
    return sieges;
  }
}