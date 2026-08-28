import 'package:flutter/material.dart';

/// Logos des connexions sociales, dessinés localement.
///
/// Le G de Google était chargé depuis un CDN : sans réseau — le cas
/// courant au moment précis où l'on ouvre l'application — la requête
/// échouait et il ne restait qu'un « G » bleu sans rapport avec la
/// marque. Un logo ne doit dépendre de rien d'extérieur.

/// Le G de Google, d'après ses tracés vectoriels officiels.
///
/// Les quatre chemins de la marque ont été convertis en courbes de
/// Bézier — la seule primitive dont dispose Flutter pour ce genre de
/// forme. Une approximation par arcs de cercle ne convenait pas : les
/// extrémités du G sont coupées à des angles précis et son ouverture a
/// une forme qu'un arc régulier ne reproduit pas.
class LogoGoogle extends StatelessWidget {
  final double taille;
  const LogoGoogle({super.key, this.taille = 24});

  @override
  Widget build(BuildContext context) =>
      CustomPaint(size: Size.square(taille), painter: _PeintreGoogle());
}

class _PeintreGoogle extends CustomPainter {
  static const _bleu = Color(0xFF4285F4);
  static const _vert = Color(0xFF34A853);
  static const _jaune = Color(0xFFFBBC05);
  static const _rouge = Color(0xFFEA4335);

  @override
  void paint(Canvas canvas, Size size) {
    // Marge interne : les icônes Material voisines (Facebook, Apple)
    // laissent du vide autour de leur glyphe. Le tracé officiel, lui,
    // occupe toute sa boîte — sans marge il paraîtrait plus gros
    // qu'elles à taille déclarée égale.
    final marge = size.width * 0.08;
    final cote = size.width - marge * 2;

    canvas.save();
    canvas.translate(marge, marge);
    canvas.drawPath(_traceBleu(cote), Paint()..color = _bleu..isAntiAlias = true);
    canvas.drawPath(_traceVert(cote), Paint()..color = _vert..isAntiAlias = true);
    canvas.drawPath(_traceJaune(cote), Paint()..color = _jaune..isAntiAlias = true);
    canvas.drawPath(_traceRouge(cote), Paint()..color = _rouge..isAntiAlias = true);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;

  /// Tracé officiel de la portion bleu, rapporté à une boîte de côté [c].
  static Path _traceBleu(double c) {
    return Path()
      ..moveTo(0.98000 * c, 0.51136 * c)
      ..cubicTo(0.98000 * c, 0.47591 * c, 0.97682 * c, 0.44182 * c, 0.97091 * c, 0.40909 * c)
      ..lineTo(0.50000 * c, 0.40909 * c)
      ..lineTo(0.50000 * c, 0.60250 * c)
      ..lineTo(0.76909 * c, 0.60250 * c)
      ..cubicTo(0.75750 * c, 0.66500 * c, 0.72227 * c, 0.71796 * c, 0.66932 * c, 0.75341 * c)
      ..lineTo(0.66932 * c, 0.87886 * c)
      ..lineTo(0.83091 * c, 0.87886 * c)
      ..cubicTo(0.92546 * c, 0.79182 * c, 0.98000 * c, 0.66364 * c, 0.98000 * c, 0.51136 * c)
      ..close()
      ..close();
  }

  /// Tracé officiel de la portion vert, rapporté à une boîte de côté [c].
  static Path _traceVert(double c) {
    return Path()
      ..moveTo(0.50000 * c, 1.00000 * c)
      ..cubicTo(0.63500 * c, 1.00000 * c, 0.74818 * c, 0.95522 * c, 0.83091 * c, 0.87886 * c)
      ..lineTo(0.66932 * c, 0.75341 * c)
      ..cubicTo(0.62457 * c, 0.78341 * c, 0.56727 * c, 0.80113 * c, 0.50000 * c, 0.80113 * c)
      ..cubicTo(0.36978 * c, 0.80113 * c, 0.25954 * c, 0.71318 * c, 0.22022 * c, 0.59500 * c)
      ..lineTo(0.05318 * c, 0.59500 * c)
      ..lineTo(0.05318 * c, 0.72454 * c)
      ..cubicTo(0.13546 * c, 0.88796 * c, 0.30454 * c, 1.00000 * c, 0.50000 * c, 1.00000 * c)
      ..close()
      ..close();
  }

  /// Tracé officiel de la portion jaune, rapporté à une boîte de côté [c].
  static Path _traceJaune(double c) {
    return Path()
      ..moveTo(0.22022 * c, 0.59500 * c)
      ..cubicTo(0.21022 * c, 0.56500 * c, 0.20454 * c, 0.53296 * c, 0.20454 * c, 0.50000 * c)
      ..cubicTo(0.20454 * c, 0.46704 * c, 0.21023 * c, 0.43500 * c, 0.22023 * c, 0.40500 * c)
      ..lineTo(0.22023 * c, 0.27546 * c)
      ..lineTo(0.05318 * c, 0.27546 * c)
      ..cubicTo(0.01818 * c, 0.34513 * c, -0.00003 * c, 0.42203 * c, -0.00000 * c, 0.50000 * c)
      ..cubicTo(0.00000 * c, 0.58068 * c, 0.01932 * c, 0.65704 * c, 0.05318 * c, 0.72454 * c)
      ..lineTo(0.22022 * c, 0.59500 * c)
      ..close()
      ..close();
  }

  /// Tracé officiel de la portion rouge, rapporté à une boîte de côté [c].
  static Path _traceRouge(double c) {
    return Path()
      ..moveTo(0.50000 * c, 0.19886 * c)
      ..cubicTo(0.57341 * c, 0.19886 * c, 0.63932 * c, 0.22409 * c, 0.69114 * c, 0.27364 * c)
      ..lineTo(0.83454 * c, 0.13023 * c)
      ..cubicTo(0.74796 * c, 0.04954 * c, 0.63477 * c, 0.00000 * c, 0.50000 * c, 0.00000 * c)
      ..cubicTo(0.30454 * c, 0.00000 * c, 0.13546 * c, 0.11204 * c, 0.05318 * c, 0.27546 * c)
      ..lineTo(0.22022 * c, 0.40500 * c)
      ..cubicTo(0.25954 * c, 0.28682 * c, 0.36977 * c, 0.19886 * c, 0.50000 * c, 0.19886 * c)
      ..close()
      ..close();
  }
}
