// Implementation web du partage. N'est compile QUE sur le web (voir
// pdf_partage.dart, qui choisit ce fichier par import conditionnel).
import 'dart:html' as html;
import 'dart:typed_data';

import 'pdf_download_web.dart';

/// Ouvre la feuille de partage du systeme avec le PDF en piece jointe.
///
/// `Printing.sharePdf` ne sait pas partager sur le web : il retombe sur
/// un telechargement, ce qui donnait deux boutons faisant exactement la
/// meme chose. L'API Web Share, elle, ouvre la vraie feuille -- iMessage,
/// WhatsApp, Mail -- sur Safari iOS et Chrome Android.
///
/// Renvoie false uniquement si le navigateur ne sait pas partager de
/// fichier : le PDF est alors telecharge, faute de mieux. Un partage que
/// la personne annule elle-meme renvoie true, sans rien telecharger --
/// annuler, c'est avoir choisi.
Future<bool> partagerPdfImpl(Uint8List bytes, String nomFichier) async {
  final fichier = html.File([bytes], nomFichier, {'type': 'application/pdf'});
  try {
    await html.window.navigator.share({
      'files': [fichier],
      'title': nomFichier,
    });
    return true;
  } catch (e) {
    // AbortError : la feuille s'est bien ouverte, la personne a ferme.
    // Rien a corriger, et surtout pas de telechargement surprise.
    if (e.toString().contains('AbortError')) return true;
    await telechargerPdfImpl(bytes, nomFichier);
    return false;
  }
}
