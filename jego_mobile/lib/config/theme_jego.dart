import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Identite visuelle JEGO — fond blanc premium.
/// Le mode sombre (gris/bleu/noir) sera ajoute plus tard via ce meme fichier.
class JegoTheme {
  // Couleurs principales
  static const Color vert = Color(0xFF0B9E63); // vert JEGO sur fond clair
  static const Color vertVif = Color(0xFF10C070); // accents lumineux
  static const Color surVert = Color(0xFFFFFFFF); // texte sur bouton vert
  static const Color fond = Color(0xFFEEF1EE); // gris vert tres leger
  static const Color fondCarte = Color(0xFFFFFFFF);
  static const Color bordCarte = Color(0xFFE7ECE8);
  static const Color texte = Color(0xFF14201A); // noir verdatre profond
  static const Color texteSecondaire = Color(0xFF64746C);
  static const Color texteTernaire = Color(0xFF9AA69F);
  static const Color champ = Color(0xFFF1F4F1);
  static const Color etoile = Color(0xFFF2A93B);
  static const Color danger = Color(0xFFD9534F);

  // Verre depoli (sur fond clair : blanc translucide)
  static Color verre = Colors.white.withOpacity(0.65);
  static Color verreBord = Colors.white.withOpacity(0.9);

  // Rayons — coins TOUJOURS arrondis
  static const double rPetit = 14;
  static const double rMoyen = 20;
  static const double rGrand = 28;

  // Ombre douce premium
  static List<BoxShadow> ombreDouce = [
    BoxShadow(
      color: const Color(0xFF14201A).withOpacity(0.06),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  static List<BoxShadow> ombreVerte = [
    BoxShadow(
      color: vert.withOpacity(0.30),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  static ThemeData theme() {
    final base = ThemeData(brightness: Brightness.light, useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: fond,
      colorScheme: ColorScheme.light(
        primary: vert,
        onPrimary: surVert,
        surface: fondCarte,
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