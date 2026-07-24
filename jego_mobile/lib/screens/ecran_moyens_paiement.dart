import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// DEMO : liste et ajout en memoire seulement. Aucun vrai numero
/// Mobile Money n'est enregistre ni valide -- au branchement, ceci
/// consommera une vraie API de gestion des moyens de paiement.
class EcranMoyensPaiement extends StatefulWidget {
  const EcranMoyensPaiement({super.key});

  @override
  State<EcranMoyensPaiement> createState() => _EcranMoyensPaiementState();
}

class _EcranMoyensPaiementState extends State<EcranMoyensPaiement> {
  final List<Map<String, String>> _moyens = [
    {'operateur': 'MTN Mobile Money', 'numero': '6XX XX XX XX'},
  ];

  void _ajouter() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.add_card_rounded, color: JegoTheme.vert, size: 30),
              const SizedBox(height: 10),
              const Text('Ajouter un numero',
                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              Container(
                decoration: BoxDecoration(
                  color: JegoTheme.champ,
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                ),
                child: TextField(
                  controller: ctrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: 'Numero Mobile Money',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              BoutonTactile(
                onTap: () {
                  if (ctrl.text.trim().isEmpty) return;
                  setState(() => _moyens.add(
                      {'operateur': 'Mobile Money', 'numero': ctrl.text.trim()}));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Moyens de paiement',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          ..._moyens.map((m) => Container(
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
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: JegoTheme.vert.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.smartphone_rounded,
                          color: JegoTheme.vert, size: 19),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(m['operateur']!,
                              style: const TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700)),
                          Text(m['numero']!,
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
                  Text('Ajouter un moyen de paiement',
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