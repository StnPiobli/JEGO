import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../config/billets_store.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';

/// Scanner camera reel (mobile_scanner). Verifie le code lu contre les
/// VRAIES reservations de l'app (BilletsStore) -- si tu scannes le QR
/// d'un billet reellement reserve dans l'app, il est reconnu. Marque le
/// billet comme "embarque" pour empecher un deuxieme scan valide.
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

  void _onDetection(BarcodeCapture capture) {
    if (_traitementEnCours) return;
    final valeurs = capture.barcodes.map((b) => b.rawValue).whereType<String>();
    if (valeurs.isEmpty) return;

    final code = valeurs.first;
    _traitementEnCours = true;
    _controleur.stop();

    _verifierEtAfficher(code);
  }

  void _verifierEtAfficher(String code) {
    final billets = BilletsStore.billets.value;
    Map<String, dynamic>? trouve;
    for (final b in billets) {
      if ('${b['code_qr']}' == code || '${b['num_resa']}' == code) {
        trouve = b;
        break;
      }
    }

    late Color couleur;
    late IconData icone;
    late String titre;
    late String sousTitre;

    if (trouve == null) {
      couleur = JegoTheme.danger;
      icone = Icons.cancel_rounded;
      titre = 'Billet non reconnu';
      sousTitre = 'Refuse l\'acces a bord.';
    } else if (trouve['annule'] == true) {
      couleur = JegoTheme.danger;
      icone = Icons.cancel_rounded;
      titre = 'Billet annule';
      sousTitre = 'Ce billet a ete annule, refuse l\'acces.';
    } else if (trouve['embarque'] == true) {
      couleur = const Color(0xFFE6B84C);
      icone = Icons.error_rounded;
      titre = 'Billet deja utilise';
      sousTitre = 'Ce passager est deja monte.';
    } else {
      BilletsStore.mettreAJour('${trouve['id']}', {'embarque': true});
      widget.onScanValide?.call();
      final sieges = (trouve['sieges'] as List?)?.join(', ') ?? '';
      final nomPassager = trouve['cadeau'] == true
          ? '${trouve['cadeau_nom']}'
          : '${Session.prenom ?? ''} ${Session.nom ?? ''}'.trim();
      couleur = JegoTheme.vert;
      icone = Icons.check_circle_rounded;
      titre = 'Billet valide';
      sousTitre = sieges.isEmpty ? nomPassager : '$nomPassager — Siege $sieges';
    }

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
                child: const Text('Scanner un autre billet',
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
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Scanner un billet', style: TextStyle(color: Colors.white)),
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