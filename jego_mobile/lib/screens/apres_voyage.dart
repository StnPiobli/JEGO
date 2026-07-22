import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/theme_jego.dart';
import '../widgets/dialogues_voyage.dart';

class _CritereNotation {
  final String id;
  final String libelle;
  final IconData icone;
  const _CritereNotation(this.id, this.libelle, this.icone);
}

const _criteresNotation = <_CritereNotation>[
  _CritereNotation('service', 'Service à bord', Icons.room_service_rounded),
  _CritereNotation('conduite', 'Conduite', Icons.speed_rounded),
  _CritereNotation(
      'horaires', 'Respect des horaires', Icons.schedule_rounded),
  _CritereNotation(
      'confort', 'Confort', Icons.airline_seat_recline_extra_rounded),
];

/// Ecran "Apres le voyage" : notation par critere + commentaire (section 6.8).
/// L'option "signaler une fausse arrivee" (dialogue partagee avec l'ecran
/// Pendant le voyage) est mise en avant tout en haut, avant le formulaire,
/// puisque cet ecran est accessible directement depuis une notification ou
/// une banniere sans etre passe par l'autre ecran au prealable.
/// La notation est definitive : ecrite sur le billet via BilletsStore des
/// l'envoi, pour ne plus jamais pouvoir etre renvoyee.
class EcranApresVoyage extends StatefulWidget {
  final Map<String, dynamic> billet;
  const EcranApresVoyage({super.key, required this.billet});

  @override
  State<EcranApresVoyage> createState() => _EcranApresVoyageState();
}

class _EcranApresVoyageState extends State<EcranApresVoyage> {
  final Map<String, int> _notes = {
    for (final c in _criteresNotation) c.id: 0,
  };
  final TextEditingController _commentaire = TextEditingController();
  late bool _envoye;
  late bool _fausseArriveeSignalee;

  bool get _pret => _notes.values.every((n) => n > 0);

  @override
  void initState() {
    super.initState();
    _envoye = widget.billet['note_envoyee'] == true;
    _fausseArriveeSignalee = widget.billet['fausse_arrivee_signalee'] == true;
  }

  @override
  void dispose() {
    _commentaire.dispose();
    super.dispose();
  }

  void _envoyer() {
    if (!_pret) return;
    final noteMoyenne =
        _notes.values.reduce((a, b) => a + b) / _notes.length;
    BilletsStore.mettreAJour('${widget.billet['id']}', {
      'note_envoyee': true,
      'note_moyenne_envoyee': noteMoyenne,
      'commentaire_envoye': _commentaire.text.trim(),
    });
    setState(() => _envoye = true);
  }

  Future<void> _signalerFausseArrivee() async {
    final confirme =
        await confirmerFausseArrivee(context, '${widget.billet['id']}');
    if (confirme) {
      setState(() => _fausseArriveeSignalee = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final noteMoyenneAffichee = widget.billet['note_moyenne_envoyee'] is num
        ? (widget.billet['note_moyenne_envoyee'] as num).toDouble()
        : (_notes.values.isEmpty
            ? 0.0
            : _notes.values.reduce((a, b) => a + b) / _notes.length);

    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _EnTeteNotation(
              villeDepart: '${widget.billet['ville_depart']}',
              villeArrivee: '${widget.billet['ville_arrivee']}',
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (!_envoye && !_fausseArriveeSignalee) ...[
                  BoutonTactile(
                    onTap: _signalerFausseArrivee,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: JegoTheme.danger.withOpacity(0.09),
                        borderRadius:
                            BorderRadius.circular(JegoTheme.rGrand),
                        border: Border.all(
                            color: JegoTheme.danger.withOpacity(0.35),
                            width: 1.4),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: JegoTheme.danger.withOpacity(0.14),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.report_rounded,
                                color: JegoTheme.danger, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Le trajet n\'est pas terminé pour vous ?',
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: JegoTheme.texte,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Signalez une fausse arrivée avant de noter',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: JegoTheme.danger,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded,
                              color: JegoTheme.danger, size: 20),
                        ],
                      ),
                    ),
                  ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.08),
                  const SizedBox(height: 20),
                ],
                if (_envoye)
                  _CarteMerci(noteMoyenne: noteMoyenneAffichee)
                      .animate()
                      .fadeIn(duration: 350.ms)
                      .scale(
                          begin: const Offset(0.92, 0.92),
                          curve: Curves.easeOutBack)
                else if (_fausseArriveeSignalee)
                  _CarteBloquee().animate().fadeIn(duration: 350.ms)
                else ...[
                  const Text(
                    'Notez votre voyage',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: JegoTheme.texte,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Votre note alimente le score public de l\'agence.',
                    style: TextStyle(
                        fontSize: 12, color: JegoTheme.texteSecondaire),
                  ),
                  const SizedBox(height: 16),
                  ...List.generate(_criteresNotation.length, (i) {
                    final c = _criteresNotation[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _LigneNotation(
                        critere: c,
                        note: _notes[c.id]!,
                        onNote: (n) => setState(() => _notes[c.id] = n),
                      ),
                    ).animate(delay: (i * 60).ms).fadeIn(duration: 300.ms);
                  }),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: JegoTheme.fondCarte,
                      borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                      border: Border.all(color: JegoTheme.bordCarte),
                    ),
                    child: TextField(
                      controller: _commentaire,
                      maxLines: 4,
                      style: const TextStyle(
                          color: JegoTheme.texte, fontSize: 13.5),
                      decoration: const InputDecoration(
                        hintText:
                            'Un commentaire à partager (optionnel)',
                        hintStyle:
                            TextStyle(color: JegoTheme.texteTernaire),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.all(14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  BoutonTactile(
                    onTap: _pret ? _envoyer : null,
                    child: Container(
                      width: double.infinity,
                      height: 50,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _pret
                            ? JegoTheme.vert
                            : JegoTheme.texteTernaire.withOpacity(0.3),
                        borderRadius:
                            BorderRadius.circular(JegoTheme.rPetit),
                      ),
                      child: const Text(
                        'Envoyer mon avis',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 14.5),
                      ),
                    ),
                  ),
                  if (!_pret) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Notez les 4 critères pour envoyer votre avis.',
                      style: TextStyle(
                          fontSize: 11.5, color: JegoTheme.texteTernaire),
                    ),
                  ],
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _CarteBloquee extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte),
      ),
      child: Row(
        children: [
          const Icon(Icons.hourglass_top_rounded,
              color: JegoTheme.texteTernaire, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Signalement transmis. La notation est suspendue le temps de la vérification.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: JegoTheme.texte,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EnTeteNotation extends StatelessWidget {
  final String villeDepart;
  final String villeArrivee;
  const _EnTeteNotation({
    required this.villeDepart,
    required this.villeArrivee,
  });

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: _VagueClipperNotation(),
      child: Container(
        height: 152,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [JegoTheme.vert, JegoTheme.vertVif],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.16),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.arrow_back_rounded,
                        color: Colors.white, size: 20),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Comment s\'est passé\nvotre trajet ?',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$villeDepart → $villeArrivee',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _VagueClipperNotation extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final chemin = Path();
    chemin.lineTo(0, size.height - 26);
    chemin.quadraticBezierTo(
        size.width / 2, size.height, size.width, size.height - 26);
    chemin.lineTo(size.width, 0);
    chemin.close();
    return chemin;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

class _LigneNotation extends StatelessWidget {
  final _CritereNotation critere;
  final int note;
  final ValueChanged<int> onNote;
  const _LigneNotation({
    required this.critere,
    required this.note,
    required this.onNote,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: Border.all(color: JegoTheme.bordCarte),
      ),
      child: Row(
        children: [
          Icon(critere.icone, size: 18, color: JegoTheme.vert),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              critere.libelle,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: JegoTheme.texte,
              ),
            ),
          ),
          Row(
            children: List.generate(5, (i) {
              final valeur = i + 1;
              final rempli = valeur <= note;
              return GestureDetector(
                onTap: () => onNote(valeur),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: Icon(
                    rempli ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 22,
                    color: rempli
                        ? JegoTheme.etoile
                        : JegoTheme.texteTernaire,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _CarteMerci extends StatelessWidget {
  final double noteMoyenne;
  const _CarteMerci({required this.noteMoyenne});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
        border: Border.all(color: JegoTheme.bordCarte),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: JegoTheme.vert.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_rounded,
                color: JegoTheme.vert, size: 32),
          ),
          const SizedBox(height: 16),
          const Text(
            'Merci pour votre avis',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: JegoTheme.texte,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Note moyenne envoyée : ${noteMoyenne.toStringAsFixed(1)} / 5',
            style: TextStyle(
                fontSize: 13, color: JegoTheme.texteSecondaire),
          ),
        ],
      ),
    );
  }
}