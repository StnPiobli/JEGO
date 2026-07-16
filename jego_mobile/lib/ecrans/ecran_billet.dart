import 'package:flutter/material.dart';
import '../theme.dart';

class EcranBillet extends StatelessWidget {
  final String numeroBillet;
  final String? numeroSiege; // null si attribution automatique
  final bool attributionAutomatique;
  final String depart;
  final String arrivee;
  final String date;
  final String heure;
  final String nomAgence;
  final int montantPaye;

  const EcranBillet({
    super.key,
    required this.numeroBillet,
    this.numeroSiege,
    required this.attributionAutomatique,
    required this.depart,
    required this.arrivee,
    required this.date,
    required this.heure,
    required this.nomAgence,
    required this.montantPaye,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.white,
              elevation: 0,
              foregroundColor: Colors.black87,
              automaticallyImplyLeading: false,
              title: const Text('Billet confirmé', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
              centerTitle: true,
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                child: Column(
                  children: [
                    // Bandeau de confirmation
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: JegoColors.vertTresClair,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.check_rounded, size: 32, color: JegoColors.vertFonce),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Envoyé par email et disponible hors-ligne',
                      style: TextStyle(fontSize: 12, color: Colors.black45),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),

                    // Carte billet
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [JegoColors.vertFonce, JegoColors.vertMoyen],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: JegoColors.vertMoyen.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('JEGO', style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.85), fontWeight: FontWeight.w600)),
                              Text(numeroBillet, style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.75))),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '$depart → $arrivee',
                            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$date · $heure',
                            style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.85)),
                          ),

                          const SizedBox(height: 20),
                          Center(
                            child: Container(
                              width: 150,
                              height: 150,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(Icons.qr_code_2_rounded, size: 120, color: JegoColors.vertFonce),
                            ),
                          ),
                          const SizedBox(height: 16),

                          Container(
                            padding: const EdgeInsets.only(top: 12),
                            decoration: BoxDecoration(
                              border: Border(top: BorderSide(color: Colors.white.withOpacity(0.25))),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  attributionAutomatique
                                      ? 'Place attribuée automatiquement'
                                      : 'Siège $numeroSiege',
                                  style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.9)),
                                ),
                                Text(
                                  montantPaye == 0 ? 'Gratuit' : '$montantPaye FCFA',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),
                    Text(nomAgence, style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.5))),

                    const SizedBox(height: 24),

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Partage du billet (à venir)')),
                              );
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.black87,
                              side: const BorderSide(color: Colors.black26),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.share_outlined, size: 18),
                            label: const Text('Partager', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(context).popUntil((route) => route.isFirst);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.black87,
                              side: const BorderSide(color: Colors.black26),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.confirmation_number_outlined, size: 18),
                            label: const Text('Mes billets', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}