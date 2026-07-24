import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// DEMO : liste en memoire seulement, aucune vraie sauvegarde d'adresse
/// n'existe cote backend aujourd'hui.
class EcranAdresses extends StatefulWidget {
  const EcranAdresses({super.key});

  @override
  State<EcranAdresses> createState() => _EcranAdressesState();
}

class _EcranAdressesState extends State<EcranAdresses> {
  final List<Map<String, String>> _adresses = [];

  void _ajouter() {
    final ctrlLabel = TextEditingController();
    final ctrlAdresse = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.add_location_alt_rounded, color: JegoTheme.vert, size: 30),
              const SizedBox(height: 10),
              const Text('Ajouter une adresse',
                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              _champ(ctrlLabel, 'Nom (ex: Domicile, Travail)'),
              const SizedBox(height: 10),
              _champ(ctrlAdresse, 'Adresse'),
              const SizedBox(height: 16),
              BoutonTactile(
                onTap: () {
                  if (ctrlAdresse.text.trim().isEmpty) return;
                  setState(() => _adresses.add({
                        'label': ctrlLabel.text.trim().isEmpty
                            ? 'Adresse'
                            : ctrlLabel.text.trim(),
                        'adresse': ctrlAdresse.text.trim(),
                      }));
                  Navigator.of(ctx).pop();
                },
                child: Container(
                  width: double.infinity,
                  height: 48,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  ),
                  child: const Text('Ajouter',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _champ(TextEditingController ctrl, String hint) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      child: TextField(
        controller: ctrl,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Adresses enregistrees',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          if (_adresses.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 30),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.location_off_outlined, size: 36, color: JegoTheme.texteTernaire),
                    const SizedBox(height: 10),
                    Text('Aucune adresse enregistree.',
                        style: TextStyle(color: JegoTheme.texteSecondaire)),
                  ],
                ),
              ),
            ),
          ..._adresses.map((a) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: JegoTheme.fondCarte,
                  borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                  border: Border.all(color: JegoTheme.bordCarte),
                  boxShadow: JegoTheme.ombreDouce,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.location_on_rounded, color: JegoTheme.vert, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(a['label']!,
                              style: const TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700)),
                          Text(a['adresse']!,
                              style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 6),
          BoutonTactile(
            onTap: _ajouter,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 13),
              decoration: BoxDecoration(
                color: JegoTheme.vert.withOpacity(0.08),
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                border: Border.all(color: JegoTheme.vert.withOpacity(0.3)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_rounded, color: JegoTheme.vert, size: 18),
                  SizedBox(width: 6),
                  Text('Ajouter une adresse',
                      style: TextStyle(color: JegoTheme.vert, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}