// Implementation web : declenche un vrai telechargement de fichier via le
// navigateur, sans dialogue d'impression. N'est compile QUE sur le web
// (voir pdf_telechargement.dart, qui choisit ce fichier via import
// conditionnel dart.library.html).
import 'dart:html' as html;
import 'dart:typed_data';

Future<void> telechargerPdfImpl(Uint8List bytes, String nomFichier) async {
  final blob = html.Blob([bytes], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  final ancre = html.AnchorElement(href: url)
    ..setAttribute('download', nomFichier)
    ..style.display = 'none';
  html.document.body?.append(ancre);
  ancre.click();
  ancre.remove();
  html.Url.revokeObjectUrl(url);
}