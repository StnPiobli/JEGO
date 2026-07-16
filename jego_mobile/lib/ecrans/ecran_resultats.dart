import 'package:flutter/material.dart';
import '../theme.dart';
import 'ecran_plan_bus.dart';

class EcranResultats extends StatelessWidget {
  final String depart;
  final String arrivee;
  final String date;

  const EcranResultats({
    super.key,
    required this.depart,
    required this.arrivee,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
        title: Text(
          '$depart → $arrivee',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            Text(date, style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.5))),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: [
                  _CarteTrajet(
                    heure: '08h00 → 12h30',
                    agence: 'Touristique Express',
                    note: '4.3',
                    prix: '6 420 FCFA',
                    onReserver: () => _allerVersPlanBus(context),
                  ),
                  const SizedBox(height: 10),
                  _CarteTrajet(
                    heure: '09h30 → 14h00',
                    agence: 'Voyages Cameroun Express',
                    note: null,
                    prix: '4 280 FCFA',
                    onReserver: () => _allerVersPlanBus(context),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _allerVersPlanBus(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const EcranPlanBus()),
    );
  }
}

class _CarteTrajet extends StatelessWidget {
  final String heure;
  final String agence;
  final String? note;
  final String prix;
  final VoidCallback onReserver;

  const _CarteTrajet({
    required this.heure,
    required this.agence,
    required this.note,
    required this.prix,
    required this.onReserver,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(heure, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              if (note != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: JegoColors.vertTresClair,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$note ★',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JegoColors.vertFonce),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(agence, style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.55))),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(prix, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: JegoColors.vertFonce)),
              const Spacer(),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: JegoColors.vertMoyen,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                ),
                onPressed: onReserver,
                child: const Text('Réserver', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}