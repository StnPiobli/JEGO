import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Identité visuelle JEGO, en clair et en sombre.
///
/// Les couleurs ne sont plus des constantes : elles se lisent à
/// l'exécution selon [modeSombre]. C'est ce qui permet de basculer sans
/// redémarrer — au prix de ne plus pouvoir écrire `const` devant les
/// widgets qui les utilisent.
///
/// Le sombre n'est pas un simple inversement : le fond reste verdâtre
/// pour garder l'identité, et le vert est éclairci, car le vert profond
/// du mode clair devient illisible sur fond noir.
/// Préférence choisie : « clair », « sombre » ou « systeme ».
final ValueNotifier<String> modeTheme = ValueNotifier<String>('clair');

/// Thème réellement appliqué. En mode « systeme », il suit la
/// luminosité déclarée par l'appareil et change avec elle, sans que
/// l'utilisateur ait à revenir dans les réglages.
final ValueNotifier<bool> modeSombre = ValueNotifier<bool>(false);

/// Recalcule le thème appliqué. À appeler au démarrage, à chaque choix,
/// et chaque fois que l'appareil bascule.
void recalculerTheme() {
  if (modeTheme.value == 'systeme') {
    modeSombre.value =
        PlatformDispatcher.instance.platformBrightness == Brightness.dark;
  } else {
    modeSombre.value = modeTheme.value == 'sombre';
  }
}

class JegoTheme {
  static bool get _n => modeSombre.value;

  // Couleurs principales
  // Le vert sombre reste assez profond pour qu'un texte blanc y soit
  // lisible : c'est ce qui permet de garder tels quels les libellés
  // blancs déjà posés sur les boutons verts.
  static Color get vert => _n ? const Color(0xFF13A86D) : const Color(0xFF0B9E63);
  static Color get vertVif => _n ? const Color(0xFF2BE092) : const Color(0xFF10C070);
  static Color get surVert => const Color(0xFFFFFFFF);
  static Color get fond => _n ? const Color(0xFF0E1512) : const Color(0xFFEEF1EE);
  static Color get fondCarte => _n ? const Color(0xFF16201B) : const Color(0xFFFFFFFF);
  static Color get bordCarte => _n ? const Color(0xFF243029) : const Color(0xFFE7ECE8);
  static Color get texte => _n ? const Color(0xFFEAF1EC) : const Color(0xFF14201A);
  static Color get texteSecondaire => _n ? const Color(0xFFA0AEA6) : const Color(0xFF64746C);
  static Color get texteTernaire => _n ? const Color(0xFF6C7A73) : const Color(0xFF9AA69F);
  static Color get champ => _n ? const Color(0xFF1D2823) : const Color(0xFFF1F4F1);
  static Color get etoile => const Color(0xFFF2A93B);
  static Color get danger => _n ? const Color(0xFFE9736F) : const Color(0xFFD9534F);

  /// Blanc en clair, sombre en sombre. Remplace les `Colors.white`
  /// écrits en dur qui, eux, ne suivaient aucun thème : sur fond noir
  /// ils donnaient des cartes blanches avec du texte blanc dessus.
  static Color get surface => fondCarte;

  /// Couleur d'un texte ou d'une icône posée sur un aplat vert.
  static Color get surAccent => surVert;

  // Verre dépoli
  static Color get verre =>
      (_n ? const Color(0xFF16201B) : Colors.white).withOpacity(_n ? 0.55 : 0.65);
  static Color get verreBord =>
      (_n ? const Color(0xFF2C3A33) : Colors.white).withOpacity(0.9);

  // Rayons — coins TOUJOURS arrondis
  static const double rPetit = 14;
  static const double rMoyen = 20;
  static const double rGrand = 28;

  // Ombre douce premium
  static List<BoxShadow> get ombreDouce => [
    BoxShadow(
      // L'ombre doit se voir : noire sur clair, plus dense sur sombre.
      color: Colors.black.withOpacity(_n ? 0.35 : 0.06),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  static List<BoxShadow> get ombreVerte => [
    BoxShadow(
      color: vert.withOpacity(0.30),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  static ThemeData theme() {
    final base = ThemeData(
        brightness: _n ? Brightness.dark : Brightness.light, useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: fond,
      colorScheme: (_n ? ColorScheme.dark : ColorScheme.light)(
        primary: vert,
        onPrimary: surVert,
        surface: fondCarte,
        onSurface: texte,
      ),
      textTheme: GoogleFonts.manropeTextTheme(base.textTheme).apply(
        bodyColor: texte,
        displayColor: texte,
      ),
      splashFactory: InkSparkle.splashFactory,
    );
  }
}

/// Panneau en verre depoli (glassmorphism clair).
class PanneauVerre extends StatelessWidget {
  final Widget child;
  final double rayon;
  final EdgeInsetsGeometry padding;
  final double flou;

  const PanneauVerre({
    super.key,
    required this.child,
    this.rayon = JegoTheme.rMoyen,
    this.padding = const EdgeInsets.all(16),
    this.flou = 16,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(rayon),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: flou, sigmaY: flou),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: JegoTheme.verre,
            borderRadius: BorderRadius.circular(rayon),
            border: Border.all(color: JegoTheme.verreBord, width: 0.8),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Bouton avec retour tactile (compression au press).
class BoutonTactile extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  const BoutonTactile({super.key, required this.child, this.onTap});

  @override
  State<BoutonTactile> createState() => _BoutonTactileState();
}

class _BoutonTactileState extends State<BoutonTactile> {
  bool _presse = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _presse = true),
      onTapUp: (_) => setState(() => _presse = false),
      onTapCancel: () => setState(() => _presse = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _presse ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 110),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}