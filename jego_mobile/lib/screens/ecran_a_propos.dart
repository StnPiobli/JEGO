import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

class EcranAPropos extends StatelessWidget {
  const EcranAPropos({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('A propos de JEGO',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Center(
            child: Column(
              children: [
                Container(
                  width: 74,
                  height: 74,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [JegoTheme.vert, JegoTheme.vertVif]),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: const Icon(Icons.directions_bus_rounded,
                      color: Colors.white, size: 34),
                ),
                const SizedBox(height: 12),
                const Text('JEGO',
                    style: TextStyle(
                        color: JegoTheme.texte, fontSize: 20, fontWeight: FontWeight.w800)),
                Text('Version 1.0.0',
                    style: TextStyle(color: JegoTheme.texteTernaire, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'JEGO est une plateforme de reservation de billets de bus interurbains au Cameroun. '
            'Elle met en relation les voyageurs et les agences de transport pour reserver, payer et suivre '
            'ses trajets directement depuis son telephone.',
            style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13, height: 1.6),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
              border: Border.all(color: JegoTheme.bordCarte),
            ),
            child: Column(
              children: [
                _ligneLien(Icons.language_rounded, 'Site web', 'www.jego.cm'),
                const Divider(height: 20, color: JegoTheme.bordCarte),
                _ligneLien(Icons.phone_rounded, 'Support', '+237 6 90 12 34 56'),
                const Divider(height: 20, color: JegoTheme.bordCarte),
                _ligneLien(Icons.mail_rounded, 'Email', 'support@jego.cm'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _ligneLien(IconData icone, String libelle, String valeur) {
    return Row(
      children: [
        Icon(icone, size: 18, color: JegoTheme.vert),
        const SizedBox(width: 12),
        Text(libelle, style: const TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13)),
        const Spacer(),
        Text(valeur,
            style: const TextStyle(
                color: JegoTheme.texte, fontSize: 13, fontWeight: FontWeight.w700)),
      ],
    );
  }
}