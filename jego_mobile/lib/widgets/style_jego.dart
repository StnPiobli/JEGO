import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/theme_jego.dart';

/// Grammaire visuelle commune, extraite de l'ecran d'accueil.
///
/// L'accueil avait sa propre esthetique (fond degrade, pastilles rondes,
/// grand titre) pendant que les autres ecrans posaient un titre nu sur un
/// aplat uni. Ces briques rendent cette ecriture disponible partout, sans
/// embarquer la scene animee de l'accueil : sur un ecran de liste, un
/// soleil qui respire et un bus qui roule sous le contenu coutent trois
/// AnimationController et rendent la lecture penible.

/// Fond degrade fixe — le ciel de l'accueil, sans rien qui bouge.
///
/// Se pose en fond de page, derriere le contenu : le haut de l'ecran
/// respire, le bas rejoint le fond uni sans rupture visible.
class FondDegrade extends StatelessWidget {
  final double hauteur;

  const FondDegrade({super.key, this.hauteur = 300});

  @override
  Widget build(BuildContext context) {
    final sombre = modeSombre.value;
    return IgnorePointer(
      child: SizedBox(
        height: hauteur,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.hardEdge,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: sombre
                      ? [
                          const Color(0xFF0F1B16),
                          const Color(0xFF0C1512),
                          JegoTheme.fond,
                        ]
                      : [
                          const Color(0xFFE9F6EE),
                          const Color(0xFFF6FAF6),
                          JegoTheme.fond,
                        ],
                  stops: const [0.0, 0.65, 1.0],
                ),
              ),
            ),
            // Halo vert diffus, en echo au soleil de l'accueil mais fixe :
            // il donne du relief au haut de page sans animation.
            Positioned(
              top: -hauteur * 0.28,
              right: -hauteur * 0.18,
              child: Container(
                width: hauteur * 0.9,
                height: hauteur * 0.9,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      JegoTheme.vert.withOpacity(sombre ? 0.16 : 0.13),
                      JegoTheme.vert.withOpacity(0.0),
                    ],
                    stops: const [0.0, 1.0],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pastille ronde de l'accueil : une icone sur une carte circulaire.
class PastilleJego extends StatelessWidget {
  final IconData icone;
  final VoidCallback? onTap;
  final String? etiquette;

  const PastilleJego(this.icone, {super.key, this.onTap, this.etiquette});

  @override
  Widget build(BuildContext context) {
    final pastille = Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte.withOpacity(0.85),
        shape: BoxShape.circle,
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Icon(icone, size: 20, color: JegoTheme.texte),
    );
    if (onTap == null) return pastille;
    return Semantics(
      button: true,
      label: etiquette,
      child: BoutonTactile(onTap: onTap, child: pastille),
    );
  }
}

/// En-tete de page, dans l'ecriture de l'accueil : une barre discrete
/// (pastille de navigation, mot-logo, actions) puis le grand titre.
///
/// [onOuvrirMenu] pose le hamburger, [retour] pose la fleche de retour ;
/// les deux ensemble n'auraient pas de sens, la fleche l'emporte.
class EnteteJego extends StatelessWidget {
  final String? titre;
  final String? sousTitre;
  final VoidCallback? onOuvrirMenu;
  final bool retour;
  final List<Widget> actions;

  /// Action posee a droite du grand titre. Une pastille de plus dans la
  /// barre du haut la ferait deborder sur les petits ecrans.
  final Widget? actionTitre;

  const EnteteJego({
    super.key,
    this.titre,
    this.sousTitre,
    this.onOuvrirMenu,
    this.retour = false,
    this.actions = const [],
    this.actionTitre,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (retour)
              PastilleJego(
                Icons.arrow_back_rounded,
                etiquette: 'Retour',
                onTap: () => Navigator.of(context).maybePop(),
              )
            else if (onOuvrirMenu != null)
              PastilleJego(
                Icons.menu_rounded,
                etiquette: 'Menu',
                onTap: onOuvrirMenu,
              ),
            if (retour || onOuvrirMenu != null) const SizedBox(width: 12),
            Text(
              'JEGO',
              style: TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                letterSpacing: 2,
                color: JegoTheme.texte,
              ),
            ),
            const Spacer(),
            ...actions,
          ],
        ).animate().fadeIn(duration: 450.ms),
        if (titre != null) ...[
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  titre!,
                  style: TextStyle(
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                    color: JegoTheme.texte,
                    height: 1.15,
                  ),
                ),
              ),
              if (actionTitre != null) ...[
                const SizedBox(width: 12),
                actionTitre!,
              ],
            ],
          )
              .animate(delay: 80.ms)
              .fadeIn(duration: 500.ms)
              .slideY(begin: 0.25, curve: Curves.easeOutCubic),
        ],
        if (sousTitre != null) ...[
          const SizedBox(height: 6),
          Text(
            sousTitre!,
            style: TextStyle(
              fontSize: 13.5,
              height: 1.4,
              fontWeight: FontWeight.w600,
              color: JegoTheme.texteSecondaire,
            ),
          ).animate(delay: 140.ms).fadeIn(duration: 500.ms),
        ],
      ],
    );
  }
}

/// Carte de contenu : la recette exacte de la carte de recherche de
/// l'accueil (fond, filet, coins tres arrondis, ombre douce).
class CarteJego extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double rayon;
  final VoidCallback? onTap;
  final Color? bordure;

  const CarteJego({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin,
    this.rayon = JegoTheme.rGrand,
    this.onTap,
    this.bordure,
  });

  @override
  Widget build(BuildContext context) {
    final carte = Container(
      padding: padding,
      margin: margin,
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(rayon),
        border: Border.all(color: bordure ?? JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: child,
    );
    if (onTap == null) return carte;
    return BoutonTactile(onTap: onTap, child: carte);
  }
}

/// Feuille basse commune (calendrier, choix d'indicatif, listes).
///
/// L'ombre suit le theme : celle qui etait ecrite en dur, noire a 14 %,
/// ne se voyait pas sur fond sombre et la feuille flottait sans relief.
class FeuilleJego extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const FeuilleJego({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(18, 12, 18, 18),
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(10, 0, 10, 10),
        padding: padding,
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rGrand),
          border: Border.all(color: JegoTheme.bordCarte, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(modeSombre.value ? 0.5 : 0.14),
              blurRadius: 30,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: JegoTheme.bordCarte,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Flexible(child: child),
          ],
        ),
      ),
    );
  }
}

/// Page dans l'ecriture de l'accueil : fond degrade fixe, contenu qui
/// defile par-dessus, place laissee en bas pour la barre de navigation.
class PageJego extends StatelessWidget {
  final Widget enfant;
  final double hauteurFond;

  const PageJego({
    super.key,
    required this.enfant,
    this.hauteurFond = 300,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: FondDegrade(hauteur: hauteurFond),
        ),
        SafeArea(bottom: false, child: enfant),
      ],
    );
  }
}

/// Page secondaire dans l'ecriture de l'accueil : fond degrade fixe,
/// en-tete a pastilles, grand titre, puis le contenu.
///
/// Remplace le couple `Scaffold` + `AppBar` transparente qui donnait a
/// ces ecrans un aplat uni et un titre nu, sans rapport avec l'accueil.
class EcranJego extends StatelessWidget {
  final String titre;
  final String? sousTitre;
  final Widget corps;
  final Widget? flottant;
  final List<Widget> actions;
  final bool retour;
  final VoidCallback? onOuvrirMenu;
  final double hauteurFond;

  const EcranJego({
    super.key,
    required this.titre,
    required this.corps,
    this.sousTitre,
    this.flottant,
    this.actions = const [],
    this.retour = true,
    this.onOuvrirMenu,
    this.hauteurFond = 280,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      floatingActionButton: flottant,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: FondDegrade(hauteur: hauteurFond),
          ),
          SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 10),
                  child: EnteteJego(
                    titre: titre,
                    sousTitre: sousTitre,
                    retour: retour,
                    onOuvrirMenu: onOuvrirMenu,
                    actions: actions,
                  ),
                ),
                Expanded(child: corps),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
