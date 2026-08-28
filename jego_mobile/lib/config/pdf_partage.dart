// Point d'entree unique du partage : choisit l'implementation web ou
// mobile au moment de la compilation.
import 'dart:typed_data';

import 'pdf_partage_stub.dart'
    if (dart.library.html) 'pdf_partage_web.dart' as impl;

/// Ouvre la feuille de partage du systeme avec le billet en piece
/// jointe. Renvoie false si le navigateur ne sait pas partager de
/// fichier : le PDF a alors ete telecharge a la place.
Future<bool> partagerPdf(Uint8List bytes, String nomFichier) {
  return impl.partagerPdfImpl(bytes, nomFichier);
}
