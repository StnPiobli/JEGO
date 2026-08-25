import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Itinéraire d'un trajet, du départ au terminus.
///
/// Un seul composant pour les trois écrans chauffeur : l'accueil, le
/// calendrier et l'historique. Ils affichaient la même chose de trois
/// façons différentes, et l'alignement se réglait trois fois.
///
/// Les deux extrémités sont écrites plus grand : ce sont les points que
/// le chauffeur cherche en premier. Chaque ligne pose la pastille,
/// l'heure et le nom sur une bande de hauteur fixe — c'est ce qui les
/// aligne quelle que soit la taille du texte.
///
/// Si [etats] est fourni, la frise devient vivante : un point quitté
/// s'éteint, celui où le bus est à quai ressort en vert.
class ItineraireTrajet extends StatelessWidget {
  final List<dynamic> points;

  /// Feuille de route du serveur (`ordre`, `declare`, `depart_declare`).
  /// Vide : on n'affiche que le plan, sans état d'avancement.
  final List<Map<String, dynamic>> etats;
  final bool partiDeclare;
  final bool arriveDeclaree;

  const ItineraireTrajet({
    super.key,
    required this.points,
    this.etats = const [],
    this.partiDeclare = false,
    this.arriveDeclaree = false,
  });

  /// Hauteur de la bande sur laquelle pastille, heure et nom se centrent.
  static const double _bandeBorne = 26;
  static const double _bandeArret = 20;

  Map<String, dynamic>? _etatDe(int ordre) {
    for (final e in etats) {
      if ((int.tryParse('${e['ordre']}') ?? -1) == ordre) {
        return Map<String, dynamic>.from(e);
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (points.length < 2) return const SizedBox.shrink();
    final suivi = etats.isNotEmpty || partiDeclare || arriveDeclaree;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < points.length; i++)
          _point(points[i] as Map, i, suivi),
      ],
    );
  }

  Widget _point(Map p, int i, bool suivi) {
    final ordre = int.tryParse('${p['ordre']}') ?? i;
    final premier = i == 0;
    final dernier = i == points.length - 1;
    final borne = premier || dernier;
    final bande = borne ? _bandeBorne : _bandeArret;
    final etat = _etatDe(ordre);

    final quitte = !suivi
        ? false
        : premier
            ? partiDeclare
            : dernier
                ? arriveDeclaree
                : etat?['depart_declare'] == true;
    final aQuai = suivi && !quitte && !borne && etat?['declare'] == true;

    final couleur = quitte
        ? JegoTheme.texteTernaire
        : (aQuai || borne)
            ? JegoTheme.vert
            : JegoTheme.texteSecondaire;

    final montent = int.tryParse('${p['montent'] ?? 0}') ?? 0;
    final descendent = int.tryParse('${p['descendent'] ?? 0}') ?? 0;
    final mouvements = <String>[
      if (montent > 0) '$montent monte${montent > 1 ? 'nt' : ''}',
      if (descendent > 0) '$descendent descend${descendent > 1 ? 'ent' : ''}',
    ];

    final lieu = '${p['lieu'] ?? ''}';
    final sousTitres = <Widget>[
      if (lieu.isNotEmpty)
        Text(lieu,
            style: TextStyle(fontSize: 11.5, color: JegoTheme.texteSecondaire)),
      if (mouvements.isNotEmpty && !quitte)
        Text(mouvements.join(' · '),
            style: const TextStyle(
                fontSize: 11,
                color: JegoTheme.vert,
                fontWeight: FontWeight.w700)),
    ];

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Pastille centrée sur la bande, puis trait jusqu'au point suivant.
          Column(
            children: [
              SizedBox(
                height: bande,
                width: 16,
                child: Center(
                  child: Container(
                    width: borne ? 13 : 10,
                    height: borne ? 13 : 10,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: quitte || aQuai || borne
                          ? couleur
                          : Colors.transparent,
                      border:
                          Border.all(color: couleur, width: borne ? 2.2 : 1.7),
                    ),
                  ),
                ),
              ),
              if (!dernier)
                Expanded(
                  child: Container(
                    width: 1.6,
                    color:
                        quitte ? JegoTheme.texteTernaire : JegoTheme.bordCarte,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 52,
            height: bande,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('${p['heure']}',
                  style: TextStyle(
                    fontSize: borne ? 15 : 12.5,
                    fontWeight: FontWeight.w800,
                    color: quitte
                        ? JegoTheme.texteTernaire
                        : borne
                            ? JegoTheme.vert
                            : JegoTheme.texte,
                  )),
            ),
          ),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: dernier ? 0 : 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: bande,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                                '${p['ville'] ?? p['nom_affiche'] ?? ''}',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: borne ? 17 : 13,
                                  fontWeight: borne
                                      ? FontWeight.w800
                                      : FontWeight.w700,
                                  color: quitte
                                      ? JegoTheme.texteTernaire
                                      : JegoTheme.texte,
                                )),
                          ),
                          if (aQuai) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: JegoTheme.vert,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text('A quai',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800)),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  if (sousTitres.isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: sousTitres,
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
