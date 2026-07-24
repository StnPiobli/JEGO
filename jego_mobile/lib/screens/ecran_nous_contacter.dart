import 'package:flutter/material.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';

/// DEMO : le message n'est envoye nulle part reellement -- juste une
/// confirmation visuelle. Au branchement, appel a une vraie API support
/// (ou envoi email via Resend, deja utilise ailleurs dans le projet).
class EcranNousContacter extends StatefulWidget {
  const EcranNousContacter({super.key});

  @override
  State<EcranNousContacter> createState() => _EcranNousContacterState();
}

class _EcranNousContacterState extends State<EcranNousContacter> {
  late final TextEditingController _email =
      TextEditingController(text: Session.email ?? '');
  final TextEditingController _message = TextEditingController();
  bool _envoye = false;

  void _envoyer() {
    if (_message.text.trim().isEmpty) return;
    setState(() => _envoye = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Nous contacter',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: _envoye
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
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
                      child: const Icon(Icons.check_circle_rounded,
                          color: JegoTheme.vert, size: 34),
                    ),
                    const SizedBox(height: 16),
                    const Text('Message envoye',
                        style: TextStyle(
                            color: JegoTheme.texte, fontSize: 16, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Text('On te repond au plus vite.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13)),
                  ],
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(18),
              children: [
                Text('Une question, un souci ? Ecris-nous directement.',
                    style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5)),
                const SizedBox(height: 16),
                _champ('Email', _email, TextInputType.emailAddress),
                const SizedBox(height: 12),
                _champ('Ton message', _message, TextInputType.multiline, lignes: 6),
                const SizedBox(height: 18),
                BoutonTactile(
                  onTap: _envoyer,
                  child: Container(
                    width: double.infinity,
                    height: 52,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: JegoTheme.vert,
                      borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                      boxShadow: JegoTheme.ombreVerte,
                    ),
                    child: const Text('Envoyer',
                        style: TextStyle(
                            color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text('Ou appelle-nous : +237 6 90 12 34 56',
                      style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 11.5)),
                ),
              ],
            ),
    );
  }

  Widget _champ(String label, TextEditingController ctrl, TextInputType type, {int lignes = 1}) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      child: TextField(
        controller: ctrl,
        keyboardType: type,
        maxLines: lignes,
        style: const TextStyle(color: JegoTheme.texte, fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: JegoTheme.texteTernaire, fontSize: 12.5),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(14),
        ),
      ),
    );
  }
}