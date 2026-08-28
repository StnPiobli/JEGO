import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../widgets/popup_arrivee.dart';
import '../screens/apres_voyage.dart';
import 'billets_store.dart';
import 'session.dart';

/// Surveille l'arrivee des trajets du voyageur, PARTOUT dans l'app.
///
/// La popup « bonne arrivee / signaler une fausse arrivee » ne devait
/// plus dependre de l'ecran « Suivre le trajet » : des que le chauffeur
/// declare l'arrivee d'un trajet dont on a un billet, elle s'ouvre
/// par-dessus l'ecran courant, quel qu'il soit, via le navigateur
/// global. Une notification est deja creee cote serveur en parallele.
///
/// Chaque billet n'ouvre la popup qu'une fois : l'identifiant est
/// retenu sur l'appareil, pour ne pas la faire reapparaitre a chaque
/// rafraichissement ni au redemarrage.
class SurveillanceArrivee {
  static const _cleVus = 'arrivees_vues';
  static Set<String> _vus = {};
  static bool _demarree = false;
  static bool _enCours = false;

  /// A appeler une fois au demarrage : charge la memoire des arrivees
  /// deja montrees, puis se met a l'ecoute de la liste des billets.
  static Future<void> demarrer() async {
    if (_demarree) return;
    _demarree = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      _vus = (prefs.getStringList(_cleVus) ?? []).toSet();
    } catch (_) {
      _vus = {};
    }
    BilletsStore.billets.addListener(_verifier);
    _verifier();
  }

  static Future<void> _marquerVu(String id) async {
    _vus.add(id);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_cleVus, _vus.toList());
    } catch (_) {}
  }

  static void _verifier() {
    if (_enCours) return;
    // Un chauffeur connecte n'a pas a recevoir les popups d'arrivee de
    // ses billets voyageur.
    if (Session.token == null) return;

    for (final billet in BilletsStore.billets.value) {
      final id = '${billet['id']}';
      final statut = '${billet['statut_trajet'] ?? ''}';
      final arrive = statut == 'termine' || statut == 'arrive';
      if (!arrive) continue;
      if (_vus.contains(id)) continue;

      // On marque avant d'afficher : la liste peut se recharger pendant
      // que la popup est ouverte, il ne faut pas l'empiler deux fois.
      _enCours = true;
      _marquerVu(id);
      afficherPopupArrivee(
        billet: billet,
        onNoter: () {
          SoftLock.navKey.currentState?.push(
            MaterialPageRoute(
              builder: (_) => EcranApresVoyage(billet: billet),
            ),
          );
        },
      );
      _enCours = false;
      // Une seule popup a la fois : les autres arrivees s'afficheront au
      // prochain passage.
      break;
    }
  }
}
