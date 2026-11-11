// Implementation web du partage. N'est compile QUE sur le web (voir
// pdf_partage.dart, qui choisit ce fichier par import conditionnel).
import 'dart:html' as html;
import 'dart:typed_data';

/// Ouvre la feuille de partage du systeme avec le PDF en piece jointe
/// (API Web Share : iMessage, WhatsApp, Mail sur Safari iOS et Chrome
/// Android).
///
/// Renvoie false quand le navigateur refuse de partager, SANS rien
/// telecharger : l'ancien repli telechargeait le PDF en silence, et le
/// bouton « Partager » faisait alors la meme chose que « Telecharger ».
/// Les deux cas de refus :
///   - page hors connexion securisee (http://192.168…) : les navigateurs
///     n'exposent le partage qu'en https ;
///   - partage demande trop longtemps apres l'appui (geste perdu).
/// Un partage que la personne annule elle-meme renvoie true -- annuler,
/// c'est avoir choisi.
Future<bool> partagerPdfImpl(Uint8List bytes, String nomFichier) async {
  if (html.window.isSecureContext != true) return false;
  final fichier = html.File([bytes], nomFichier, {'type': 'application/pdf'});
  try {
    await html.window.navigator.share({
      'files': [fichier],
      'title': nomFichier,
    });
    return true;
  } catch (e) {
    if (e.toString().contains('AbortError')) return true;
    return false;
  }
}
