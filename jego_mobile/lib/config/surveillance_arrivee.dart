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
    BilletsStore.billets.addListener(() => _verifier());
    _verifier();
  }

  static Future<void> _marquerVu(String id) async {
    _vus.add(id);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_cleVus, _vus.toList());
    } catch (_) {}
  }

  /// Au-dela de ce delai, une arrivee n'est plus une nouvelle : la
  /// popup sert a reagir a chaud, pas a rejouer l'historique. Sans
  /// cette borne, une memoire videe (navigation privee, donnees de
  /// site effacees, reinstallation) faisait resurgir la boite pour
  /// TOUS les anciens voyages a la connexion suivante.
  static const _fraicheur = Duration(days: 2);

  static bool _recent(Map<String, dynamic> billet) {
    try {
      final d = DateTime.parse('${billet['date']}');
      return DateTime.now().difference(d) <= _fraicheur;
    } catch (_) {
      // Date illisible : on s'abstient plutot que d'ouvrir une boite
      // sur un voyage dont on ignore l'anciennete.
      return false;
    }
  }

  static Future<void> _verifier() async {
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
      // Deja note : la question a recu sa reponse, la reposer est du
      // harcelement.
      if (billet['deja_note'] == true) continue;
      if (!_recent(billet)) continue;

      // On marque avant d'afficher : la liste peut se recharger pendant
      // que la popup est ouverte, il ne faut pas l'empiler deux fois.
      _enCours = true;
      await _marquerVu(id);
      // On ATTEND la fermeture. Auparavant `_enCours` retombait a faux
      // dans la foulee, si bien qu'un rechargement de la liste ouvrait
      // une seconde boite par-dessus la premiere : avec trois trajets
      // termines, il fallait fermer trois fois.
      await afficherPopupArrivee(
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
