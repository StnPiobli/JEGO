import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'session_chauffeur.dart';

/// ═══════════════════════════════════════════════════════════════
/// SCAN HORS LIGNE
///
/// Dans beaucoup de zones desservies, la connexion est intermittente
/// voire absente au moment de l'embarquement. Le chauffeur ne peut
/// pas rester bloqué devant la porte du bus parce que le réseau est
/// tombé.
///
/// Le QR JEGO est signé côté serveur (HMAC-SHA256) et a la forme :
///     JEGO|<numéro billet>|<trajet>|<siège>|<signature>
///
/// Hors ligne, l'application ne peut PAS recalculer la signature :
/// la clé secrète ne quitte jamais le serveur, et l'embarquer dans
/// l'application reviendrait à la publier — n'importe qui pourrait
/// alors fabriquer des billets valides. On vérifie donc uniquement
/// ce qui est vérifiable sans secret : la structure du code.
///
/// C'est un compromis assumé et volontairement dissymétrique :
///   - un code qui n'est pas un QR JEGO est rejeté immédiatement ;
///   - un QR JEGO bien formé laisse monter le passager, et le scan
///     part en file d'attente ;
///   - la vérification cryptographique réelle a lieu à la
///     synchronisation, dès le retour du réseau.
///
/// Le risque résiduel (un faux QR bien formé passe le temps d'un
/// trajet) est très inférieur au risque inverse : bloquer des
/// passagers légitimes à chaque coupure réseau. La fraude est de
/// toute façon détectée à la synchronisation et rattachée au trajet
/// et au chauffeur concernés.
/// ═══════════════════════════════════════════════════════════════

class ResultatHorsLigne {
  final bool valide;
  final String? numeroBillet;
  final String? motif;
  const ResultatHorsLigne(this.valide, {this.numeroBillet, this.motif});
}

class ScanHorsLigne {
  static const String _cleFile = 'jego_scans_en_attente';

  /// Vérifie ce qui est vérifiable sans le secret serveur : le
  /// préfixe JEGO, le nombre de segments et une signature non vide
  /// de longueur plausible.
  static ResultatHorsLigne verifierStructure(String code) {
    final parties = code.split('|');
    if (parties.length != 5) {
      return const ResultatHorsLigne(false, motif: 'Format inattendu');
    }
    if (parties[0] != 'JEGO') {
      return const ResultatHorsLigne(false, motif: 'Ce code ne vient pas de JEGO');
    }
    if (parties[1].isEmpty || parties[2].isEmpty || parties[3].isEmpty) {
      return const ResultatHorsLigne(false, motif: 'Billet incomplet');
    }
    final signature = parties[4];
    // La signature est un tronçon hexadécimal du HMAC-SHA256.
    if (signature.length < 8 || !RegExp(r'^[0-9a-fA-F]+$').hasMatch(signature)) {
      return const ResultatHorsLigne(false, motif: 'Signature absente ou illisible');
    }
    return ResultatHorsLigne(true, numeroBillet: parties[1]);
  }

  /// Empile un scan effectué hors ligne. Les doublons locaux sont
  /// écartés : un même billet scanné deux fois sans réseau ne crée
  /// qu'une entrée, et le second scan est signalé au chauffeur.
  static Future<bool> mettreEnAttente(String code) async {
    final prefs = await SharedPreferences.getInstance();
    final brut = prefs.getStringList(_cleFile) ?? <String>[];

    final deja = brut.any((e) {
      try {
        return jsonDecode(e)['contenu_qr'] == code;
      } catch (_) {
        return false;
      }
    });
    if (deja) return false;

    brut.add(jsonEncode({
      'contenu_qr': code,
      'scanne_le': DateTime.now().toIso8601String(),
      'chauffeur_id': SessionChauffeur.chauffeurId,
    }));
    await prefs.setStringList(_cleFile, brut);
    return true;
  }

  /// Nombre de scans encore à synchroniser (affiché au chauffeur).
  static Future<int> nombreEnAttente() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_cleFile) ?? const <String>[]).length;
  }

  /// Ce billet a-t-il déjà été scanné hors ligne sur cet appareil ?
  /// Permet de détecter un double passage même sans réseau.
  static Future<bool> dejaScanneLocalement(String code) async {
    final prefs = await SharedPreferences.getInstance();
    final brut = prefs.getStringList(_cleFile) ?? <String>[];
    return brut.any((e) {
      try {
        return jsonDecode(e)['contenu_qr'] == code;
      } catch (_) {
        return false;
      }
    });
  }

  /// Rejoue les scans en attente auprès du serveur.
  ///
  /// Un scan est retiré de la file dès que le serveur a rendu un
  /// verdict — y compris un refus : un billet invalide ou déjà
  /// scanné a été tranché, le garder en file le ferait rejouer
  /// indéfiniment. Seules les vraies pannes réseau conservent
  /// l'entrée pour un prochain essai.
  static Future<Map<String, int>> synchroniser() async {
    final token = SessionChauffeur.token;
    if (token == null) return {'envoyes': 0, 'refuses': 0, 'restants': 0};

    final prefs = await SharedPreferences.getInstance();
    final brut = prefs.getStringList(_cleFile) ?? <String>[];
    if (brut.isEmpty) return {'envoyes': 0, 'refuses': 0, 'restants': 0};

    final restants = <String>[];
    int envoyes = 0;
    int refuses = 0;

    for (final entree in brut) {
      String? code;
      try {
        code = jsonDecode(entree)['contenu_qr'] as String?;
      } catch (_) {
        continue; // entrée illisible : on l'abandonne
      }
      if (code == null) continue;

      try {
        final rep = await ApiService.scannerBillet(contenuQr: code, token: token);
        final http = rep['code_http'] as int? ?? 0;
        if (http == 200 && rep['valide'] == true) {
          envoyes++;
        } else {
          // Verdict rendu (refus, doublon…) : inutile de rejouer.
          refuses++;
        }
      } catch (_) {
        restants.add(entree); // réseau toujours absent
      }
    }

    await prefs.setStringList(_cleFile, restants);
    return {'envoyes': envoyes, 'refuses': refuses, 'restants': restants.length};
  }

  static Future<void> vider() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cleFile);
  }
}
