import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../config/api.dart';
import '../config/session_chauffeur.dart';
import '../config/theme_jego.dart';
import '../config/scan_hors_ligne.dart';
import '../l10n/strings.dart';

/// Scanner caméra réel (mobile_scanner).
///
/// Le code lu est envoyé au backend, qui vérifie la signature
/// cryptographique du QR, son appartenance au trajet du chauffeur et
/// le double passage.
///
/// HORS LIGNE : dans beaucoup de zones la connexion est intermittente.
/// Si le serveur est injoignable, le QR est validé localement grâce à
/// sa structure signée, le passager peut monter, et le scan est mis en
/// file d'attente pour être synchronisé dès le retour du réseau.
class EcranScanBillet extends StatefulWidget {
  final VoidCallback? onScanValide;
  const EcranScanBillet({super.key, this.onScanValide});

  @override
  State<EcranScanBillet> createState() => _EcranScanBilletState();
}

class _EcranScanBilletState extends State<EcranScanBillet> {
  final MobileScannerController _controleur = MobileScannerController();
  bool _traitementEnCours = false;

  @override
  void dispose() {
    _controleur.dispose();
    super.dispose();
  }

  Future<void> _onDetection(BarcodeCapture capture) async {
    if (_traitementEnCours) return;
    final valeurs = capture.barcodes.map((b) => b.rawValue).whereType<String>();
    if (valeurs.isEmpty) return;

    final code = valeurs.first;
    _traitementEnCours = true;
    await _controleur.stop();

    await _verifierEtAfficher(code);
  }

  Future<void> _verifierEtAfficher(String code) async {
    late Color couleur;
    late IconData icone;
    late String titre;
    late String sousTitre;

    final token = SessionChauffeur.token;

    if (token == null) {
      couleur = JegoTheme.danger;
      icone = Icons.cancel_rounded;
      titre = 'Session expirée';
      sousTitre = 'Reconnectez-vous pour scanner les billets.';
    } else {
      try {
        final rep = await ApiService.scannerBillet(contenuQr: code, token: token);
        final codeHttp = rep['code_http'] as int? ?? 0;

        if (codeHttp == 200 && rep['valide'] == true) {
          widget.onScanValide?.call();
          final b = rep['billet'] ?? {};
          couleur = JegoTheme.vert;
          icone = Icons.check_circle_rounded;
          titre = 'Billet valide';
          final passager = '${b['nom_passager'] ?? ''}'.trim();
          final siege = '${b['siege'] ?? b['siege_numero'] ?? ''}'.trim();
          sousTitre = [
            if (passager.isNotEmpty) passager,
            if (siege.isNotEmpty) 'Siège $siege',
          ].join(' — ');
          if (sousTitre.isEmpty) sousTitre = 'Laissez monter le passager.';
        } else if (codeHttp == 409) {
          couleur = const Color(0xFFE6B84C);
          icone = Icons.error_rounded;
          titre = 'Billet déjà utilisé';
          sousTitre = '${rep['error'] ?? 'Ce passager est déjà monté.'}';
        } else {
          couleur = JegoTheme.danger;
          icone = Icons.cancel_rounded;
          titre = 'Billet refusé';
          sousTitre = '${rep['error'] ?? 'Refusez l\'accès à bord.'}';
        }
      } catch (_) {
        // Serveur injoignable : on bascule en vérification hors ligne.
        final horsLigne = ScanHorsLigne.verifierStructure(code);
        if (horsLigne.valide && await ScanHorsLigne.dejaScanneLocalement(code)) {
          // Même sans réseau, un billet déjà scanné sur cet appareil
          // pendant ce trajet doit être signalé.
          couleur = const Color(0xFFE6B84C);
          icone = Icons.error_rounded;
          titre = 'Billet déjà scanné';
          sousTitre = 'Ce billet a déjà été présenté sur ce trajet.';
        } else if (horsLigne.valide) {
          await ScanHorsLigne.mettreEnAttente(code);
          widget.onScanValide?.call();
          couleur = JegoTheme.vert;
          icone = Icons.wifi_off_rounded;
          titre = 'Billet valide (hors ligne)';
          sousTitre =
              'Réseau indisponible. Le billet est conforme, laissez monter le passager. '
              'Le scan sera synchronisé au retour du réseau.';
        } else {
          couleur = JegoTheme.danger;
          icone = Icons.cancel_rounded;
          titre = 'Billet non reconnu';
          sousTitre = 'Ce code n\'est pas un billet JEGO. Refusez l\'accès.';
        }
      }
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rGrand),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: couleur.withOpacity(0.12), shape: BoxShape.circle),
              child: Icon(icone, color: couleur, size: 36),
            ),
            const SizedBox(height: 16),
            Text(titre,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(sousTitre,
                textAlign: TextAlign.center,
                style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13.5)),
            const SizedBox(height: 20),
            BoutonTactile(
              onTap: () {
                Navigator.of(ctx).pop();
                setState(() => _traitementEnCours = false);
                _controleur.start();
              },
              child: Container(
                width: double.infinity,
                height: 50,
                alignment: Alignment.center,
                decoration:
                    BoxDecoration(color: JegoTheme.vert, borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
                child: Text(Strings.t('scanner_autre_billet'),
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        iconTheme: IconThemeData(color: JegoTheme.fondCarte),
        title: Text(Strings.t('scanner_billet'), style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: Colors.white),
            onPressed: () => _controleur.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _controleur, onDetect: _onDetection),
          Center(
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: JegoTheme.vertVif, width: 3),
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
          Positioned(
            bottom: 30,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
              ),
              child: const Text(
                'Vise le QR code du billet du voyageur',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}