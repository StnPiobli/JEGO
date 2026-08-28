// Implementation mobile/desktop : la feuille de partage native sait
// deja joindre un fichier. Utilisee quand dart:html est absent.
import 'dart:typed_data';
import 'package:printing/printing.dart';

Future<bool> partagerPdfImpl(Uint8List bytes, String nomFichier) async {
  await Printing.sharePdf(bytes: bytes, filename: nomFichier);
  return true;
}
