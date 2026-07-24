// Implementation mobile/desktop : pas de "telechargement silencieux"
// possible sans permissions systeme supplementaires -- on ouvre le
// partage natif, qui propose "Enregistrer dans Fichiers" comme option
// parmi d'autres. Utilise seulement quand dart.library.html est absent
// (donc jamais sur le web -- voir pdf_telechargement.dart).
import 'dart:typed_data';
import 'package:printing/printing.dart';

Future<void> telechargerPdfImpl(Uint8List bytes, String nomFichier) async {
  await Printing.sharePdf(bytes: bytes, filename: nomFichier);
}