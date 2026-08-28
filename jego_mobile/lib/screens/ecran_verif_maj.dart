import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

/// DEMO : ne verifie rien reellement, aucun serveur de mise a jour
/// n'existe encore -- simule juste un court delai puis affiche "a jour".
class EcranVerifMaj extends StatefulWidget {
  const EcranVerifMaj({super.key});

  @override
  State<EcranVerifMaj> createState() => _EcranVerifMajState();
}

class _EcranVerifMajState extends State<EcranVerifMaj> {
  bool _enCours = false;
  bool _verifie = false;

  Future<void> _verifier() async {
    setState(() => _enCours = true);
    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    setState(() {
      _enCours = false;
      _verifie = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: JegoTheme.texte),
        title: Text(Strings.t('mises_a_jour'),
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                color: JegoTheme.vert.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: _enCours
                  ? Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator(
                          strokeWidth: 2.4, color: JegoTheme.vert),
                    )
                  : Icon(
                      _verifie ? Icons.check_circle_rounded : Icons.system_update_rounded,
                      color: JegoTheme.vert,
                      size: 34,
                    ),
            ),
            const SizedBox(height: 18),
            Text(
              _verifie ? 'JEGO est a jour' : 'Version 1.0.0',
              style: TextStyle(
                  color: JegoTheme.texte, fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              _verifie
                  ? 'Aucune mise a jour disponible.'
                  : 'Verifiez si une nouvelle version est disponible.',
              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5),
            ),
            const SizedBox(height: 20),
            if (!_verifie)
              BoutonTactile(
                onTap: _enCours ? null : _verifier,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                  ),
                  child: Text(Strings.t('verifier_maintenant'),
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}