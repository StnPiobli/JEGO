import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/api.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

/// Fiche publique de l'agence, consultee par le voyageur :
/// note generale, notes par critere, commentaires moderes, badge Certifiee JEGO.
class EcranFicheAgence extends StatefulWidget {
  /// Identifiant serveur de l'agence (UUID).
  final String agenceId;
  const EcranFicheAgence({super.key, required this.agenceId});

  @override
  State<EcranFicheAgence> createState() => _EcranFicheAgenceState();
}

class _EcranFicheAgenceState extends State<EcranFicheAgence> {
  bool _chargement = true;
  String? _erreur;
  Map<String, dynamic> _agence = {};
  List<Map<String, dynamic>> _avis = [];

  @override
  void initState() {
    super.initState();
    _charger();
  }

  /// Charge la fiche et les avis réels. Les moyennes par critère sont
  /// recalculées à partir des avis effectivement déposés : aucune note
  /// n'est inventée, une agence sans avis affiche « Pas encore d'avis ».
  Future<void> _charger() async {
    setState(() {
      _chargement = true;
      _erreur = null;
    });
    try {
      final rep = await ApiService.avisDeLAgence(widget.agenceId);
      if (!mounted) return;
      setState(() {
        _agence = Map<String, dynamic>.from(rep['agence'] ?? {});
        _avis = ((rep['avis'] as List?) ?? [])
            .map<Map<String, dynamic>>((a) => Map<String, dynamic>.from(a))
            .toList();
        _chargement = false;
      });
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() {
        _erreur = e.message;
        _chargement = false;
      });
    }
  }

  /// Moyenne d'un critère sur les avis réellement déposés.
  double? _moyenne(String cle) {
    final valeurs = _avis
        .map((a) => double.tryParse('${a[cle]}'))
        .whereType<double>()
        .toList();
    if (valeurs.isEmpty) return null;
    return valeurs.reduce((a, b) => a + b) / valeurs.length;
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) {
      return Scaffold(
        backgroundColor: JegoTheme.fond,
        appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
        body: const Center(
          child: CircularProgressIndicator(color: JegoTheme.vert),
        ),
      );
    }

    if (_erreur != null) {
      return Scaffold(
        backgroundColor: JegoTheme.fond,
        appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _erreur!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: JegoTheme.texteSecondaire),
                ),
                const SizedBox(height: 14),
                TextButton(
                  onPressed: _charger,
                  child: const Text('Réessayer',
                      style: TextStyle(
                          color: JegoTheme.vert, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final agence = _agence;
    final commentaires = _avis
        .where((a) => '${a['commentaire'] ?? ''}'.trim().isNotEmpty)
        .map((a) => {
              'auteur': a['voyageur_prenom'] ?? 'Voyageur',
              'note': double.tryParse('${a['note_globale']}') ?? 0.0,
              'texte': a['commentaire'],
              'date': a['cree_le'],
            })
        .toList();
    final certifiee = agence['badge_certifie'] == true;
    final noteGenerale =
        double.tryParse('${agence['note_moyenne'] ?? 0}') ?? 0.0;

    final criteres = <_DonneeCritere>[
      _DonneeCritere(Icons.room_service_rounded, Strings.t('critere_service'),
          _moyenne('note_service') ?? 0),
      _DonneeCritere(Icons.speed_rounded, Strings.t('critere_conduite'),
          _moyenne('note_conduite') ?? 0),
      _DonneeCritere(Icons.schedule_rounded, Strings.t('critere_horaires'),
          _moyenne('note_horaires') ?? 0),
      _DonneeCritere(Icons.airline_seat_recline_extra_rounded,
          Strings.t('critere_confort'), _moyenne('note_confort') ?? 0),
    ];

    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _EnTeteAgence(
              nom: '${agence['nom']}',
              certifiee: certifiee,
              noteGenerale: noteGenerale,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 56, 20, 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                ...List.generate(criteres.length, (i) {
                  return _CritereLigne(donnee: criteres[i])
                      .animate(delay: (80 * i).ms)
                      .fadeIn(duration: 350.ms)
                      .slideX(begin: 0.05);
                }),
                const SizedBox(height: 20),
                Text(
                  '${Strings.t('commentaires_titre')} (${commentaires.length})',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: JegoTheme.texte,
                  ),
                ).animate().fadeIn(duration: 350.ms),
                const SizedBox(height: 12),
                ...commentaires.map((c) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _CarteCommentaire(
                        auteur: '${c['auteur']}',
                        note: c['note'] as int,
                        texte: '${c['texte']}',
                        date: '${c['date']}',
                      ),
                    )),
                const SizedBox(height: 24),
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.call_rounded,
                          size: 14, color: JegoTheme.texteTernaire),
                      const SizedBox(width: 6),
                      Text(
                        Strings.t('support_tel'),
                        style: TextStyle(
                          color: JegoTheme.texteTernaire,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _EnTeteAgence extends StatelessWidget {
  final String nom;
  final bool certifiee;
  final double noteGenerale;
  const _EnTeteAgence({
    required this.nom,
    required this.certifiee,
    required this.noteGenerale,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        ClipPath(
          clipper: _VagueClipper(),
          child: Container(
            height: 188,
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
                    Row(
                      children: [
                        _BoutonRondClair(
                          icone: Icons.arrow_back_rounded,
                          onTap: () => Navigator.of(context).pop(),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.16),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.directions_bus_rounded,
                              color: Colors.white, size: 20),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      nom,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        height: 1.15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ).animate().fadeIn(duration: 300.ms),
        Positioned(
          bottom: -44,
          left: 0,
          right: 0,
          child: Center(
            child: _SceauNote(note: noteGenerale, certifiee: certifiee)
                .animate()
                .scale(
                  delay: 150.ms,
                  duration: 380.ms,
                  curve: Curves.easeOutBack,
                  begin: const Offset(0.7, 0.7),
                ),
          ),
        ),
      ],
    );
  }
}

class _VagueClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final chemin = Path();
    chemin.lineTo(0, size.height - 34);
    chemin.quadraticBezierTo(
      size.width / 2,
      size.height,
      size.width,
      size.height - 34,
    );
    chemin.lineTo(size.width, 0);
    chemin.close();
    return chemin;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

class _BoutonRondClair extends StatelessWidget {
  final IconData icone;
  final VoidCallback onTap;
  const _BoutonRondClair({required this.icone, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.16),
          shape: BoxShape.circle,
        ),
        child: Icon(icone, color: Colors.white, size: 20),
      ),
    );
  }
}

class _SceauNote extends StatelessWidget {
  final double note;
  final bool certifiee;
  const _SceauNote({required this.note, required this.certifiee});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 118,
      height: 118,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 118,
            height: 118,
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              shape: BoxShape.circle,
              border: Border.all(
                  color: JegoTheme.vert.withOpacity(0.15), width: 3),
              boxShadow: JegoTheme.ombreDouce,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  note.toStringAsFixed(1),
                  style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: JegoTheme.texte,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (i) {
                    final plein = i < note.round();
                    return Icon(
                      plein ? Icons.star_rounded : Icons.star_outline_rounded,
                      size: 13,
                      color: JegoTheme.etoile,
                    );
                  }),
                ),
              ],
            ),
          ),
          if (certifiee)
            Positioned(
              right: -4,
              bottom: 2,
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: JegoTheme.fondCarte,
                  shape: BoxShape.circle,
                  boxShadow: JegoTheme.ombreDouce,
                ),
                child: const Icon(Icons.verified_rounded,
                    color: JegoTheme.vert, size: 22),
              ),
            ),
        ],
      ),
    );
  }
}

class _DonneeCritere {
  final IconData icone;
  final String libelle;
  final dynamic note;
  const _DonneeCritere(this.icone, this.libelle, this.note);
}

class _CritereLigne extends StatelessWidget {
  final _DonneeCritere donnee;
  const _CritereLigne({required this.donnee});

  @override
  Widget build(BuildContext context) {
    final valeur = (donnee.note as num).toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: JegoTheme.vert.withOpacity(0.10),
              borderRadius: BorderRadius.circular(JegoTheme.rPetit),
            ),
            child: Icon(donnee.icone, size: 18, color: JegoTheme.vert),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 104,
            child: Text(
              donnee.libelle,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: JegoTheme.texte,
              ),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Stack(
                children: [
                  Container(height: 8, color: JegoTheme.champ),
                  FractionallySizedBox(
                    widthFactor: (valeur / 5).clamp(0.0, 1.0),
                    child: Container(
                      height: 8,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [JegoTheme.vert, JegoTheme.vertVif],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 26,
            child: Text(
              '$valeur',
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: JegoTheme.texteSecondaire,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CarteCommentaire extends StatelessWidget {
  final String auteur;
  final int note;
  final String texte;
  final String date;
  const _CarteCommentaire({
    required this.auteur,
    required this.note,
    required this.texte,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
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
              _AvatarInitiales(nom: auteur),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      auteur,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: JegoTheme.texte,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: List.generate(
                        note,
                        (_) => const Icon(Icons.star_rounded,
                            size: 12, color: JegoTheme.etoile),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                date,
                style: TextStyle(
                  fontSize: 11,
                  color: JegoTheme.texteTernaire,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            texte,
            style: const TextStyle(
              fontSize: 13,
              color: JegoTheme.texte,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _AvatarInitiales extends StatelessWidget {
  final String nom;
  const _AvatarInitiales({required this.nom});

  static const List<Color> _palette = [
    JegoTheme.vert,
    JegoTheme.vertVif,
    Color(0xFF3D6FE0),
    Color(0xFFBA7517),
  ];

  @override
  Widget build(BuildContext context) {
    final parties =
        nom.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    final initiales = parties
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    final couleur = _palette[nom.hashCode.abs() % _palette.length];

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(color: couleur, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Text(
        initiales.isEmpty ? '?' : initiales,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}