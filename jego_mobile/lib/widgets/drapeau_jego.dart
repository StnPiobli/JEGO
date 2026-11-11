import 'package:flutter/material.dart';

/// Drapeaux dessines, au gabarit iOS : rectangle a coins arrondis, filet
/// discret, proportions 3:2.
///
/// Les emoji drapeaux (🇨🇲) ne sont pas peints partout de la meme facon :
/// ils reposent sur une ligature de deux lettres indicatrices, que le
/// moteur de rendu web de Flutter et beaucoup de plateformes ne
/// composent pas — on lit alors « CM » dans une boite. Six pays, six
/// drapeaux a bandes : les dessiner coute moins qu'une dependance et
/// rend pareil sur tous les appareils.
class DrapeauJego extends StatelessWidget {
  /// Code ISO du pays. Six sont dessines (CM, NG, TD, GA, CI, FR), les
  /// autres viennent en image (voir le cas par defaut).
  final String code;
  final double largeur;

  const DrapeauJego(this.code, {super.key, this.largeur = 24});

  double get _hauteur => largeur * 2 / 3;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(3),
      child: SizedBox(
        width: largeur,
        height: _hauteur,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _dessin(),
            // Filet interieur : sans lui, un drapeau a bande blanche
            // (France, Nigeria) se dissout dans un fond clair.
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                border: Border.all(
                  color: const Color(0x1A000000),
                  width: 0.8,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dessin() {
    switch (code.toUpperCase()) {
      case 'CM': // Cameroun — vert, rouge, jaune, etoile jaune centree
        return Stack(
          fit: StackFit.expand,
          children: [
            _bandes(const [
              Color(0xFF007A5E),
              Color(0xFFCE1126),
              Color(0xFFFCD116),
            ]),
            Center(
              child: Text(
                '★',
                style: TextStyle(
                  fontSize: _hauteur * 0.55,
                  height: 1,
                  color: const Color(0xFFFCD116),
                ),
              ),
            ),
          ],
        );
      case 'NG': // Nigeria
        return _bandes(const [
          Color(0xFF008751),
          Color(0xFFFFFFFF),
          Color(0xFF008751),
        ]);
      case 'TD': // Tchad
        return _bandes(const [
          Color(0xFF002664),
          Color(0xFFFECB00),
          Color(0xFFC60C30),
        ]);
      case 'GA': // Gabon — bandes horizontales
        return _bandes(
          const [
            Color(0xFF009E60),
            Color(0xFFFCD116),
            Color(0xFF3A75C4),
          ],
          horizontal: true,
        );
      case 'CI': // Cote d'Ivoire
        return _bandes(const [
          Color(0xFFF77F00),
          Color(0xFFFFFFFF),
          Color(0xFF009E60),
        ]);
      case 'FR': // France
        return _bandes(const [
          Color(0xFF002395),
          Color(0xFFFFFFFF),
          Color(0xFFED2939),
        ]);
      default:
        // Les autres pays : petite image (≈ 1 Ko) du service public
        // flagcdn. Sans réseau, le code du pays la remplace.
        return Image.network(
          'https://flagcdn.com/w40/${code.toLowerCase()}.png',
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _code(),
        );
    }
  }

  /// Repli sans image : le code du pays sur fond gris.
  Widget _code() {
    return ColoredBox(
      color: const Color(0xFFD7DEDA),
      child: Center(
        child: Text(
          code.toUpperCase(),
          style: TextStyle(
            fontSize: _hauteur * 0.5,
            height: 1,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF64746C),
          ),
        ),
      ),
    );
  }

  Widget _bandes(List<Color> couleurs, {bool horizontal = false}) {
    final parts = couleurs
        .map((c) => Expanded(child: ColoredBox(color: c)))
        .toList();
    // `stretch` est indispensable : un ColoredBox sans enfant n'a aucune
    // hauteur propre, et l'alignement par defaut (centre) le reduisait a
    // une bande de zero pixel. Le drapeau ne montrait alors que l'etoile.
    return horizontal
        ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: parts)
        : Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: parts);
  }
}
