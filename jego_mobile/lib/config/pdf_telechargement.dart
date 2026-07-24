// Point d'entree unique : choisit l'implementation web ou mobile/desktop
// au moment de la compilation, selon que dart:html est disponible.
import 'dart:typed_data';

import 'pdf_download_stub.dart'
    if (dart.library.html) 'pdf_download_web.dart' as impl;

/// Telecharge le PDF : vrai telechargement de fichier sur le web (aucun
/// dialogue), partage natif avec option "Enregistrer" sur mobile/desktop.
Future<void> telechargerPdf(Uint8List bytes, String nomFichier) {
  return impl.telechargerPdfImpl(bytes, nomFichier);
}