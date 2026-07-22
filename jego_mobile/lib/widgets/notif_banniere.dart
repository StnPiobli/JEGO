import 'package:flutter/material.dart';
import '../config/billets_store.dart';
import '../config/theme_jego.dart';

/// Banniere de notification qui descend du haut de l'ecran et disparait
/// automatiquement apres quelques secondes (barre de progression visible).
/// Simule un push natif en attendant les vraies notifications push.
/// S'insere dans l'overlay racine via SoftLock.navKey, donc appelable
/// depuis n'importe quel ecran sans lui passer de BuildContext local.
class NotifBanniere {
  static OverlayEntry? _entreeActuelle;

  static void afficher({
    required String titre,
    required String texte,
    IconData icone = Icons.notifications_rounded,
    VoidCallback? onTap,
  }) {
    final overlayState = SoftLock.navKey.currentState?.overlay;
    if (overlayState == null) return;

    _entreeActuelle?.remove();

    late OverlayEntry entree;
    entree = OverlayEntry(
      builder: (context) => _BanniereWidget(
        titre: titre,
        texte: texte,
        icone: icone,
        onTap: onTap,
        onFerme: () {
          entree.remove();
          if (_entreeActuelle == entree) _entreeActuelle = null;
        },
      ),
    );
    _entreeActuelle = entree;
    overlayState.insert(entree);
  }
}

class _BanniereWidget extends StatefulWidget {
  final String titre;
  final String texte;
  final IconData icone;
  final VoidCallback? onTap;
  final VoidCallback onFerme;

  const _BanniereWidget({
    required this.titre,
    required this.texte,
    required this.icone,
    required this.onFerme,
    this.onTap,
  });

  @override
  State<_BanniereWidget> createState() => _BanniereWidgetState();
}

class _BanniereWidgetState extends State<_BanniereWidget>
    with TickerProviderStateMixin {
  static const Duration _dureeAffichage = Duration(seconds: 5);

  late final AnimationController _entree;
  late final AnimationController _duree;
  late final Animation<Offset> _position;
  late final Animation<double> _opacite;
  bool _fermetureLancee = false;

  @override
  void initState() {
    super.initState();
    _entree = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );
    _position = Tween<Offset>(
      begin: const Offset(0, -1.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _entree, curve: Curves.easeOutBack));
    _opacite = CurvedAnimation(
        parent: _entree, curve: const Interval(0, 0.6, curve: Curves.easeOut));
    _entree.forward();

    _duree = AnimationController(vsync: this, duration: _dureeAffichage)
      ..forward();
    _duree.addStatusListener((statut) {
      if (statut == AnimationStatus.completed) _fermer();
    });
  }

  Future<void> _fermer({VoidCallback? apresFermeture}) async {
    if (_fermetureLancee || !mounted) return;
    _fermetureLancee = true;
    _duree.stop();
    await _entree.reverse();
    widget.onFerme();
    apresFermeture?.call();
  }

  @override
  void dispose() {
    _entree.dispose();
    _duree.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: SlideTransition(
          position: _position,
          child: FadeTransition(
            opacity: _opacite,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: GestureDetector(
                onTap: () => _fermer(apresFermeture: widget.onTap),
                onVerticalDragEnd: (details) {
                  if ((details.primaryVelocity ?? 0) < 0) _fermer();
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: JegoTheme.fondCarte,
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.14),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: JegoTheme.vert,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'JEGO',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                                color: JegoTheme.texteTernaire,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '·  à l\'instant',
                              style: TextStyle(
                                fontSize: 10,
                                color: JegoTheme.texteTernaire,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    JegoTheme.vert,
                                    JegoTheme.vertVif
                                  ],
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(widget.icone,
                                  color: Colors.white, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.titre,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      color: JegoTheme.texte,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    widget.texte,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: JegoTheme.texteSecondaire,
                                      height: 1.35,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(3),
                          child: AnimatedBuilder(
                            animation: _duree,
                            builder: (context, _) => LinearProgressIndicator(
                              value: 1 - _duree.value,
                              minHeight: 3,
                              backgroundColor: JegoTheme.champ,
                              valueColor: const AlwaysStoppedAnimation(
                                  JegoTheme.vert),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}