import 'dart:async';
import 'package:flutter/material.dart';
import '../config/api.dart';
import '../config/session_chauffeur.dart';
import '../config/theme_jego.dart';
import '../config/trajet_chauffeur.dart';
import '../config/scan_hors_ligne.dart';
import 'ecran_emploi_du_temps_chauffeur.dart';
import 'ecran_historique_chauffeur.dart';
import 'ecran_scan_billet.dart';

/// Accueil chauffeur. Regles temporelles :
/// - Depart : impossible avant l'heure de depart programmee.
/// - Retard : s'ouvre 1h avant le depart (pour prevenir d'un retard
///   potentiel avant meme de partir), bloque une fois l'arrivee
///   declaree.
/// - Incident : impossible avant que le depart soit declare, bloque une
///   fois l'arrivee declaree.
/// - Scan : s'ouvre 1h avant le depart, se bloque des que le depart ou
///   l'arrivee sont declares.
/// - Une fois le depart declare, TOUTE la navigation (calendrier,
///   historique, deconnexion) est gelee -- seuls Retard, Incident et
///   Arrivee restent actifs, pour eviter toute manipulation du telephone
///   pendant la conduite.
/// - Des que l'arrivee est declaree, le trajet est marque termine et la
///   page bascule automatiquement sur le prochain trajet.
class EcranAccueilChauffeur extends StatefulWidget {
  const EcranAccueilChauffeur({super.key});

  @override
  State<EcranAccueilChauffeur> createState() => _EcranAccueilChauffeurState();
}

class _EcranAccueilChauffeurState extends State<EcranAccueilChauffeur> {
  bool _partiDeclare = false;
  bool _arriveDeclaree = false;
  Timer? _timerActualisation;

  @override
  void initState() {
    super.initState();
    _rafraichir();

    // Toutes les 30 s : on recharge les trajets depuis le serveur ET
    // on rafraîchit l'affichage, pour que les boutons se débloquent
    // à l'heure dite (départ, scan, retard) et que le nombre de
    // passagers suive les réservations réelles.
    _timerActualisation = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _rafraichir();
    });
  }

  /// Recharge les trajets réels du chauffeur, puis tente de
  /// synchroniser les scans faits hors ligne.
  Future<void> _rafraichir() async {
    await TrajetChauffeur.charger();
    if (!mounted) return;
    setState(() {});

    // Dès que le réseau revient, les billets scannés sans connexion
    // remontent au serveur.
    final bilan = await ScanHorsLigne.synchroniser();
    if (mounted && (bilan['envoyes'] ?? 0) > 0) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _timerActualisation?.cancel();
    super.dispose();
  }

  bool get _scanBloque => _partiDeclare || _arriveDeclaree;
  bool get _incidentBloque => !_partiDeclare || _arriveDeclaree;
  bool get _navigationGelee => _partiDeclare && !_arriveDeclaree;

  String get _initiales {
    final nom = SessionChauffeur.nom ?? '';
    return nom.isNotEmpty ? nom[0].toUpperCase() : 'C';
  }

  bool _peutDeclarerDepart(Map<String, dynamic>? trajet) {
    if (trajet == null || _partiDeclare) return false;
    return !DateTime.now().isBefore(TrajetChauffeur.dateHeure(trajet));
  }

  bool _peutScanner(Map<String, dynamic>? trajet) {
    if (trajet == null || _scanBloque) return false;
    return !DateTime.now().isBefore(TrajetChauffeur.dateHeure(trajet).subtract(const Duration(hours: 1)));
  }

  bool _peutSignalerRetard(Map<String, dynamic>? trajet) {
    if (trajet == null || _arriveDeclaree) return false;
    return !DateTime.now().isBefore(TrajetChauffeur.dateHeure(trajet).subtract(const Duration(hours: 1)));
  }

  bool _peutVoirReservations(Map<String, dynamic>? trajet) {
    if (trajet == null) return false;
    return !DateTime.now().isBefore(TrajetChauffeur.dateHeure(trajet).subtract(const Duration(hours: 1)));
  }

  String _formatMinutes(int total) {
    if (total < 60) return '$total minutes';
    final h = total ~/ 60;
    final m = total % 60;
    return m == 0 ? '${h}h' : '${h}h$m';
  }

  Future<void> _confirmer({
    required IconData icone,
    required Color couleur,
    required String titre,
    required String texte,
    required VoidCallback onConfirme,
  }) async {
    final confirme = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(color: couleur.withOpacity(0.1), shape: BoxShape.circle),
                child: Icon(icone, color: couleur, size: 28),
              ),
              const SizedBox(height: 14),
              Text(titre,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(texte,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(false),
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                            color: JegoTheme.champ, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                        child: const Text('Annuler',
                            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(true),
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        decoration:
                            BoxDecoration(color: couleur, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                        child: const Text('Confirmer',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (confirme == true) onConfirme();
  }

  /// Message d'erreur serveur affiché sous les actions du trajet.
  String? _erreurAction;

  void _declarerDepart() {
    final trajet = TrajetChauffeur.prochain;
    if (trajet == null) return;

    _confirmer(
      icone: Icons.rocket_launch_rounded,
      couleur: JegoTheme.vert,
      titre: 'Déclarer le départ ?',
      texte:
          'Le scan de billets et toute la navigation seront gelés jusqu\'à l\'arrivée.',
      onConfirme: () async {
        final token = SessionChauffeur.token;
        final trajetId = '${trajet['id']}';
        if (token == null) {
          setState(() => _erreurAction = 'Session expirée. Reconnectez-vous.');
          return;
        }
        try {
          // Le serveur fait foi : il refuse un départ déclaré trop tôt.
          await ApiService.declarerDepart(trajetId, token);
          if (!mounted) return;
          setState(() {
            _partiDeclare = true;
            _erreurAction = null;
          });
        } on ErreurApi catch (e) {
          if (!mounted) return;
          setState(() => _erreurAction = e.message);
        }
      },
    );
  }

  void _signalerRetard(Map<String, dynamic> trajet) {
    final ctrlMinutes = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                        color: const Color(0xFFE6B84C).withOpacity(0.12), shape: BoxShape.circle),
                    child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFE6B84C), size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text('Signaler un retard',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Le message sera envoye a l\'agence et a tous les voyageurs, deja a bord ou en attente.',
                  style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
              const SizedBox(height: 14),
              Text('Estimation du retard (minutes)',
                  style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
              const SizedBox(height: 6),
              Container(
                decoration:
                    BoxDecoration(color: JegoTheme.champ, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                child: TextField(
                  controller: ctrlMinutes,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Ex : 15',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                            color: JegoTheme.champ, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                        child: const Text('Annuler',
                            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        final minutes = int.tryParse(ctrlMinutes.text.trim());
                        if (minutes == null || minutes <= 0) return;
                        Navigator.of(ctx).pop();
                        final total = TrajetChauffeur.ajouterRetard('${trajet['reference']}', minutes);
                        _afficherEnvoi(
                          titre: 'Retard signale',
                          couleur: const Color(0xFFE6B84C),
                          contenu: RichText(
                            textAlign: TextAlign.center,
                            text: TextSpan(
                              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5, height: 1.4),
                              children: [
                                const TextSpan(
                                    text: 'Envoye a l\'agence et a tous les voyageurs :\n"Votre bus a actuellement un retard. Votre arrivee sera '),
                                TextSpan(
                                    text: 'retardee de ${_formatMinutes(total)}',
                                    style: const TextStyle(fontWeight: FontWeight.w800, color: JegoTheme.texte)),
                                const TextSpan(text: '."'),
                              ],
                            ),
                          ),
                        );
                      },
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                            color: const Color(0xFFE6B84C), borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                        child: const Text('Envoyer',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _signalerIncident() {
    final ctrlTexte = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration:
                        BoxDecoration(color: JegoTheme.danger.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.report_problem_rounded, color: JegoTheme.danger, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text('Signaler un incident',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Envoye uniquement a l\'agence, pas aux voyageurs.',
                  style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
              const SizedBox(height: 14),
              Container(
                decoration:
                    BoxDecoration(color: JegoTheme.champ, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                child: TextField(
                  controller: ctrlTexte,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Decris brievement ce qui se passe (panne, accident...)',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(14),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                            color: JegoTheme.champ, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                        child: const Text('Annuler',
                            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        if (ctrlTexte.text.trim().isEmpty) return;
                        Navigator.of(ctx).pop();
                        _afficherEnvoi(
                          titre: 'Incident signale',
                          couleur: JegoTheme.danger,
                          contenu: Text('Envoye a l\'agence uniquement :\n"${ctrlTexte.text.trim()}"',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
                        );
                      },
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                            color: JegoTheme.danger, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                        child: const Text('Envoyer',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _afficherEnvoi({required String titre, required Widget contenu, required Color couleur}) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(color: couleur.withOpacity(0.12), shape: BoxShape.circle),
                child: Icon(Icons.check_circle_rounded, color: couleur, size: 26),
              ),
              const SizedBox(height: 14),
              Text(titre, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              contenu,
              const SizedBox(height: 16),
              BoutonTactile(
                onTap: () => Navigator.of(ctx).pop(),
                child: Container(
                  width: double.infinity,
                  height: 46,
                  alignment: Alignment.center,
                  decoration:
                      BoxDecoration(color: couleur, borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                  child: const Text('OK', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _declarerArrivee(Map<String, dynamic> trajet) {
    _confirmer(
      icone: Icons.check_circle_rounded,
      couleur: JegoTheme.vert,
      titre: 'Déclarer l\'arrivée ?',
      texte:
          'Le trajet sera marqué terminé. Le prochain trajet s\'affichera automatiquement.',
      onConfirme: () async {
        final token = SessionChauffeur.token;
        final trajetId = '${trajet['id']}';
        if (token == null) {
          setState(() => _erreurAction = 'Session expirée. Reconnectez-vous.');
          return;
        }
        try {
          await ApiService.declarerArrivee(trajetId, token);
          TrajetChauffeur.marquerTermine('${trajet['reference']}');
          if (!mounted) return;
          setState(() {
            _arriveDeclaree = false;
            _partiDeclare = false;
            _erreurAction = null;
          });
          // On recharge : le trajet suivant devient le prochain.
          await _rafraichir();
        } on ErreurApi catch (e) {
          if (!mounted) return;
          setState(() => _erreurAction = e.message);
        }
      },
    );
  }

  /// Feuille de route : liste des points de la ligne, avec le nombre
  /// de passagers qui montent et descendent à chacun. Le chauffeur y
  /// déclare son passage aux arrêts intermédiaires — un passager qui
  /// descend en cours de route voit alors son billet clos à cet
  /// arrêt, sans attendre le terminus.
  Future<void> _ouvrirArrets(Map<String, dynamic> trajet) async {
    final token = SessionChauffeur.token;
    final trajetId = '${trajet['id']}';
    if (token == null) {
      setState(() => _erreurAction = 'Session expirée. Reconnectez-vous.');
      return;
    }

    List<Map<String, dynamic>> arrets;
    try {
      arrets = await ApiService.arretsTrajet(trajetId, token);
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() => _erreurAction = e.message);
      return;
    }
    if (!mounted) return;

    // Déclarée hors du builder : sinon elle serait remise à zéro à
    // chaque reconstruction et le message d'erreur ne s'afficherait
    // jamais.
    String? erreurLocale;

    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, majFeuille) {
          return Container(
            margin: const EdgeInsets.all(14),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              borderRadius: BorderRadius.circular(JegoTheme.rGrand),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Feuille de route',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(
                  'Déclarez votre passage à chaque arrêt. Le terminus se déclare avec le bouton « Declarer arrivee ».',
                  style: TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 12.5),
                ),
                const SizedBox(height: 14),
                ...arrets.map((a) {
                  final ordre = int.tryParse('${a['ordre']}') ?? 0;
                  final dernier = ordre == arrets.length - 1;
                  final declare = a['declare'] == true;
                  final montent = int.tryParse('${a['montent'] ?? 0}') ?? 0;
                  final descendent =
                      int.tryParse('${a['descendent'] ?? 0}') ?? 0;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: declare
                                ? JegoTheme.vert
                                : JegoTheme.fond,
                            shape: BoxShape.circle,
                            border: Border.all(color: JegoTheme.bordCarte),
                          ),
                          child: declare
                              ? const Icon(Icons.check_rounded,
                                  size: 16, color: Colors.white)
                              : Text('$ordre',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${a['nom_affiche'] ?? a['ville'] ?? ''}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14)),
                              Text(
                                '$montent montent · $descendent descendent',
                                style: TextStyle(
                                    color: JegoTheme.texteSecondaire,
                                    fontSize: 11.5),
                              ),
                            ],
                          ),
                        ),
                        if (ordre > 0 && !dernier && !declare)
                          BoutonTactile(
                            onTap: () async {
                              try {
                                await ApiService.declarerArretIntermediaire(
                                  trajetId: trajetId,
                                  ordre: ordre,
                                  token: token,
                                );
                                final frais = await ApiService.arretsTrajet(
                                    trajetId, token);
                                majFeuille(() {
                                  arrets = frais;
                                  erreurLocale = null;
                                });
                              } on ErreurApi catch (e) {
                                majFeuille(() => erreurLocale = e.message);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 7),
                              decoration: BoxDecoration(
                                color: JegoTheme.vert,
                                borderRadius: BorderRadius.circular(
                                    JegoTheme.rPetit),
                              ),
                              child: const Text('Arrivé',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800)),
                            ),
                          ),
                      ],
                    ),
                  );
                }),
                if (erreurLocale != null) ...[
                  const SizedBox(height: 4),
                  Text(erreurLocale!,
                      style: const TextStyle(
                          color: JegoTheme.danger, fontSize: 12)),
                ],
                const SizedBox(height: 6),
                BoutonTactile(
                  onTap: () => Navigator.of(ctx).pop(),
                  child: Container(
                    width: double.infinity,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: JegoTheme.fond,
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                      border: Border.all(color: JegoTheme.bordCarte),
                    ),
                    child: const Text('Fermer',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    if (mounted) _rafraichir();
  }

  void _scanner(Map<String, dynamic>? trajet) {
    if (!_peutScanner(trajet) || trajet == null) return;
    final reference = '${trajet['reference']}';
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EcranScanBillet(
            onScanValide: () => setState(() => TrajetChauffeur.incrementerScan(reference))),
      ),
    );
  }

  void _deconnexion() {
    if (_navigationGelee) return;
    _confirmer(
      icone: Icons.logout_rounded,
      couleur: JegoTheme.danger,
      titre: 'Se deconnecter ?',
      texte: '',
      onConfirme: () {
        SessionChauffeur.fermer();
        Navigator.of(context).pop();
      },
    );
  }

  bool _estAujourdhui(DateTime d) {
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month && d.day == n.day;
  }

  String _dateLisible(DateTime d) {
    const mois = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aout', 'sep', 'oct', 'nov', 'dec'];
    return '${d.day} ${mois[d.month - 1]} ${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final trajet = TrajetChauffeur.prochain;

    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [JegoTheme.vert, JegoTheme.vertVif]),
                    shape: BoxShape.circle,
                    border: Border.all(color: JegoTheme.fondCarte, width: 3),
                    boxShadow: JegoTheme.ombreDouce,
                  ),
                  alignment: Alignment.center,
                  child: Text(_initiales,
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bonjour, ${SessionChauffeur.nom ?? ''}',
                          style: const TextStyle(
                              color: JegoTheme.texte, fontSize: 18, fontWeight: FontWeight.w800)),
                      Text('Chauffeur — ${SessionChauffeur.agence ?? ''}',
                          style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                        decoration: BoxDecoration(
                          color: JegoTheme.vert.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.verified_rounded, size: 12, color: JegoTheme.vert),
                            const SizedBox(width: 4),
                            Text('Compte verifie',
                                style: TextStyle(color: JegoTheme.vert, fontSize: 10.5, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Opacity(
                  opacity: _navigationGelee ? 0.35 : 1,
                  child: BoutonTactile(
                    onTap: _navigationGelee
                        ? null
                        : () => Navigator.of(context)
                            .push(MaterialPageRoute(builder: (_) => const EcranEmploiDuTempsChauffeur())),
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      margin: const EdgeInsets.only(left: 6),
                      decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          shape: BoxShape.circle,
                          border: Border.all(color: JegoTheme.bordCarte)),
                      child: const Icon(Icons.calendar_month_rounded, size: 17, color: JegoTheme.texteSecondaire),
                    ),
                  ),
                ),
                Opacity(
                  opacity: _navigationGelee ? 0.35 : 1,
                  child: BoutonTactile(
                    onTap: _navigationGelee
                        ? null
                        : () => Navigator.of(context)
                            .push(MaterialPageRoute(builder: (_) => const EcranHistoriqueChauffeur())),
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      margin: const EdgeInsets.only(left: 6),
                      decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          shape: BoxShape.circle,
                          border: Border.all(color: JegoTheme.bordCarte)),
                      child: const Icon(Icons.history_rounded, size: 17, color: JegoTheme.texteSecondaire),
                    ),
                  ),
                ),
                Opacity(
                  opacity: _navigationGelee ? 0.35 : 1,
                  child: BoutonTactile(
                    onTap: _deconnexion,
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      margin: const EdgeInsets.only(left: 6),
                      decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          shape: BoxShape.circle,
                          border: Border.all(color: JegoTheme.bordCarte)),
                      child: const Icon(Icons.logout_rounded, size: 17, color: JegoTheme.texteSecondaire),
                    ),
                  ),
                ),
              ],
            ),
            if (_navigationGelee) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: JegoTheme.texte.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lock_rounded, size: 13, color: JegoTheme.texteSecondaire),
                    const SizedBox(width: 6),
                    Text('Navigation gelee pendant le trajet',
                        style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 11, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 18),
            if (trajet == null)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: JegoTheme.fondCarte,
                  borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                  border: Border.all(color: JegoTheme.bordCarte),
                ),
                child: Column(
                  children: [
                    Icon(Icons.event_busy_rounded, size: 30, color: JegoTheme.texteTernaire),
                    const SizedBox(height: 8),
                    Text('Aucun trajet a venir pour l\'instant.',
                        style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13)),
                  ],
                ),
              )
            else ...[
              _carteTrajet(trajet),
              const SizedBox(height: 10),
              _compteurScan(trajet),
            ],
            if (_erreurAction != null) ...[
              const SizedBox(height: 12),
              // Erreur affichée sous les actions, en petit texte rouge.
              Text(
                _erreurAction!,
                style: const TextStyle(
                    color: JegoTheme.danger, fontSize: 12.5),
              ),
            ],
            const SizedBox(height: 20),
            _grosBouton(
              icone: Icons.rocket_launch_rounded,
              libelle: _peutDeclarerDepart(trajet) || _partiDeclare
                  ? 'Declarer depart'
                  : 'Depart a ${trajet != null ? trajet['heure_depart'] : ''}',
              couleur: JegoTheme.vert,
              onTap: _peutDeclarerDepart(trajet) ? _declarerDepart : null,
              fait: _partiDeclare,
            ),
            const SizedBox(height: 12),
            _grosBouton(
              icone: Icons.warning_amber_rounded,
              libelle: 'Signaler retard',
              couleur: const Color(0xFFE6B84C),
              onTap: (trajet != null && _peutSignalerRetard(trajet)) ? () => _signalerRetard(trajet) : null,
            ),
            const SizedBox(height: 12),
            _grosBouton(
              icone: Icons.report_problem_rounded,
              libelle: 'Signaler incident',
              couleur: JegoTheme.danger,
              onTap: _incidentBloque ? null : _signalerIncident,
            ),
            const SizedBox(height: 12),
            _grosBouton(
              icone: Icons.alt_route_rounded,
              libelle: 'Feuille de route / arrêts',
              couleur: JegoTheme.texte,
              onTap: (_partiDeclare && trajet != null)
                  ? () => _ouvrirArrets(trajet)
                  : null,
            ),
            const SizedBox(height: 12),
            _grosBouton(
              icone: Icons.check_circle_rounded,
              libelle: 'Declarer arrivee',
              couleur: JegoTheme.vert,
              onTap: (_partiDeclare && !_arriveDeclaree && trajet != null)
                  ? () => _declarerArrivee(trajet)
                  : null,
              fait: _arriveDeclaree,
            ),
            const SizedBox(height: 12),
            _grosBouton(
              icone: Icons.qr_code_scanner_rounded,
              libelle: _peutScanner(trajet)
                  ? 'Scanner un billet'
                  : (_scanBloque ? 'Scanner (bloque)' : 'Scanner (ouvre 1h avant)'),
              couleur: JegoTheme.texte,
              onTap: _peutScanner(trajet) ? () => _scanner(trajet) : null,
            ),
            const SizedBox(height: 22),
            Text('MES PERFORMANCES',
                style: TextStyle(
                    color: JegoTheme.vert, fontSize: 11.5, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: JegoTheme.fondCarte,
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                border: Border.all(color: JegoTheme.bordCarte),
                boxShadow: JegoTheme.ombreDouce,
              ),
              child: Row(
                children: [
                  Expanded(child: _statPerformance(Icons.star_rounded, '—', 'Note moyenne')),
                  Container(width: 1, height: 36, color: JegoTheme.bordCarte),
                  Expanded(child: _statPerformance(Icons.check_circle_outline_rounded, '0', 'Trajets termines')),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: JegoTheme.danger.withOpacity(0.06),
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                border: Border.all(color: JegoTheme.danger.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.no_crash_rounded, color: JegoTheme.danger, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('Ne jamais utiliser cet ecran en conduisant.',
                        style: TextStyle(color: JegoTheme.danger, fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _compteurScan(Map<String, dynamic> trajet) {
    final visible = _peutVoirReservations(trajet);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: JegoTheme.vert.withOpacity(0.06),
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.vert.withOpacity(0.2)),
      ),
      child: visible
          ? Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _miniStat('${trajet['capacite']}', 'places'),
                _pointSepare(),
                _miniStat('${trajet['places_reservees']}', 'reservations'),
                _pointSepare(),
                _miniStat('${TrajetChauffeur.billetsScannes('${trajet['reference']}')}', 'scannes'),
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.schedule_rounded, size: 14, color: JegoTheme.texteTernaire),
                const SizedBox(width: 6),
                Text('${trajet['capacite']} places · reservations visibles 1h avant le depart',
                    style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 11.5)),
              ],
            ),
    );
  }

  Widget _pointSepare() => Container(
        width: 3,
        height: 3,
        decoration: const BoxDecoration(color: JegoTheme.texteTernaire, shape: BoxShape.circle),
      );

  Widget _miniStat(String valeur, String libelle) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(valeur, style: const TextStyle(color: JegoTheme.vert, fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(width: 4),
        Text(libelle, style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
      ],
    );
  }

  Widget _carteTrajet(Map<String, dynamic> trajet) {
    final date = trajet['date'] as DateTime;
    final arrets = (trajet['arrets'] as List).cast<String>();
    final retard = TrajetChauffeur.retardCumule('${trajet['reference']}');
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: JegoTheme.vert.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                ),
                child: Text(
                  _arriveDeclaree
                      ? 'TERMINE'
                      : _partiDeclare
                          ? 'EN COURS'
                          : 'A VENIR',
                  style: const TextStyle(
                      color: JegoTheme.vert, fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.4),
                ),
              ),
              if (retard > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6B84C).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                  ),
                  child: Text('Retard ${_formatMinutes(retard)}',
                      style: const TextStyle(
                          color: Color(0xFFE6B84C), fontSize: 10.5, fontWeight: FontWeight.w800)),
                ),
              ],
              const Spacer(),
              Text(_estAujourdhui(date) ? 'Aujourd\'hui' : _dateLisible(date),
                  style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${trajet['ville_depart']}',
                        style: const TextStyle(color: JegoTheme.texte, fontSize: 18, fontWeight: FontWeight.w800)),
                    Text('${trajet['point_depart']}',
                        style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 11)),
                  ],
                ),
              ),
              Column(
                children: [
                  Row(
                    children: List.generate(
                        4,
                        (_) => Container(
                              width: 4,
                              height: 1.6,
                              margin: const EdgeInsets.symmetric(horizontal: 1.5),
                              color: JegoTheme.bordCarte,
                            )),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(color: JegoTheme.texte, shape: BoxShape.circle),
                    child: const Icon(Icons.directions_bus_rounded, size: 15, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: List.generate(
                        4,
                        (_) => Container(
                              width: 4,
                              height: 1.6,
                              margin: const EdgeInsets.symmetric(horizontal: 1.5),
                              color: JegoTheme.bordCarte,
                            )),
                  ),
                ],
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${trajet['ville_arrivee']}',
                        textAlign: TextAlign.right,
                        style: const TextStyle(color: JegoTheme.texte, fontSize: 18, fontWeight: FontWeight.w800)),
                    Text('${trajet['point_arrivee']}',
                        textAlign: TextAlign.right,
                        style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          if (arrets.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.alt_route_rounded, size: 13, color: JegoTheme.texteTernaire),
                const SizedBox(width: 5),
                Text('Arrets : ${arrets.join(', ')}',
                    style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 11)),
              ],
            ),
          ],
          const SizedBox(height: 16),
          const Divider(height: 1, color: JegoTheme.bordCarte),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _infoTrajet(Icons.calendar_month_rounded, 'Depart', '${trajet['heure_depart']}'),
              ),
              Expanded(
                child: _infoTrajet(Icons.flag_circle_rounded, 'Arrivee prevue', '${trajet['heure_arrivee']}'),
              ),
              Expanded(
                child: _infoTrajet(Icons.confirmation_number_rounded, 'Reference', '${trajet['reference']}',
                    petit: true),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoTrajet(IconData icone, String libelle, String valeur, {bool petit = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icone, size: 13, color: JegoTheme.texteTernaire),
            const SizedBox(width: 4),
            Text(libelle, style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 10.5)),
          ],
        ),
        const SizedBox(height: 3),
        Text(valeur,
            style: TextStyle(
                color: JegoTheme.texte, fontSize: petit ? 10.5 : 13, fontWeight: FontWeight.w800)),
      ],
    );
  }

  Widget _statPerformance(IconData icone, String valeur, String libelle) {
    return Column(
      children: [
        Icon(icone, size: 18, color: JegoTheme.vert),
        const SizedBox(height: 6),
        Text(valeur, style: const TextStyle(color: JegoTheme.texte, fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 2),
        Text(libelle,
            textAlign: TextAlign.center,
            style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 10)),
      ],
    );
  }

  Widget _grosBouton({
    required IconData icone,
    required String libelle,
    required Color couleur,
    required VoidCallback? onTap,
    bool fait = false,
  }) {
    return Opacity(
      opacity: onTap == null && !fait ? 0.4 : 1,
      child: BoutonTactile(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: fait ? couleur.withOpacity(0.1) : couleur,
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
            border: fait ? Border.all(color: couleur, width: 1.4) : null,
            boxShadow: fait ? null : JegoTheme.ombreDouce,
          ),
          child: Row(
            children: [
              Icon(fait ? Icons.check_circle_rounded : icone,
                  color: fait ? couleur : Colors.white, size: 22),
              const SizedBox(width: 14),
              Text(fait ? '$libelle — Fait' : libelle,
                  style: TextStyle(
                      color: fait ? couleur : Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}