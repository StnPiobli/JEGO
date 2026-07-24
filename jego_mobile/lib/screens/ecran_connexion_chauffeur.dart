import 'package:flutter/material.dart';
import '../config/session_chauffeur.dart';
import '../config/theme_jego.dart';
import 'ecran_accueil_chauffeur.dart';

/// DEMO : accepte n'importe quel identifiant/mot de passe -- au
/// branchement, verification reelle des identifiants crees par
/// l'agence (le chauffeur ne peut jamais s'inscrire lui-meme).
class EcranConnexionChauffeur extends StatefulWidget {
  const EcranConnexionChauffeur({super.key});

  @override
  State<EcranConnexionChauffeur> createState() => _EcranConnexionChauffeurState();
}

class _EcranConnexionChauffeurState extends State<EcranConnexionChauffeur> {
  final _ctrlIdentifiant = TextEditingController();
  final _ctrlMdp = TextEditingController();
  String? _erreur;

  void _connecter() {
    if (_ctrlIdentifiant.text.trim().isEmpty || _ctrlMdp.text.trim().isEmpty) {
      setState(() => _erreur = 'Entre ton identifiant et ton mot de passe.');
      return;
    }
    SessionChauffeur.connecter(nom: 'Paul', agence: 'Touristique Express');
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const EcranAccueilChauffeur()),
    );
  }

  @override
  void dispose() {
    _ctrlIdentifiant.dispose();
    _ctrlMdp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.texte,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [JegoTheme.vert, JegoTheme.vertVif]),
                  borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                ),
                child: const Icon(Icons.directions_bus_rounded, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 20),
              const Text('Espace Chauffeur',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text('Connecte-toi avec les identifiants fournis par ton agence.',
                  style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13)),
              const SizedBox(height: 32),
              _champ(_ctrlIdentifiant, 'Identifiant', Icons.person_outline_rounded),
              const SizedBox(height: 12),
              _champ(_ctrlMdp, 'Mot de passe', Icons.lock_outline_rounded, masque: true),
              if (_erreur != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(_erreur!,
                      style: const TextStyle(color: JegoTheme.danger, fontSize: 12.5)),
                ),
              const SizedBox(height: 22),
              BoutonTactile(
                onTap: _connecter,
                child: Container(
                  width: double.infinity,
                  height: 54,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: const Text('Se connecter',
                      style: TextStyle(color: Colors.white, fontSize: 15.5, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _champ(TextEditingController ctrl, String label, IconData icone, {bool masque = false}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: Border.all(color: Colors.white.withOpacity(0.15)),
      ),
      child: TextField(
        controller: ctrl,
        obscureText: masque,
        style: const TextStyle(color: Colors.white, fontSize: 14),
        cursorColor: JegoTheme.vertVif,
        decoration: InputDecoration(
          prefixIcon: Icon(icone, color: Colors.white.withOpacity(0.5), size: 19),
          labelText: label,
          labelStyle: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12.5),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }
}