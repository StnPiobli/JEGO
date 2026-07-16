import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';
import 'ecran_paiement.dart';

enum StatutSiege { libre, premium, pris, indisponible }

class _Siege {
  final String numero;
  final StatutSiege statut;
  const _Siege(this.numero, this.statut);
}

class EcranPlanBus extends StatefulWidget {
  const EcranPlanBus({super.key});

  @override
  State<EcranPlanBus> createState() => _EcranPlanBusState();
}

class _EcranPlanBusState extends State<EcranPlanBus> {
  final List<List<_Siege?>> _rangees = List.generate(8, (r) {
    final rangee = r + 1;
    final premium = rangee <= 2;
    return [
      _Siege('${rangee}A', premium ? StatutSiege.premium : StatutSiege.libre),
      _Siege('${rangee}B', premium ? StatutSiege.premium : StatutSiege.libre),
      null,
      _Siege('${rangee}C', premium ? StatutSiege.premium : StatutSiege.libre),
      _Siege('${rangee}D', premium ? StatutSiege.premium : StatutSiege.libre),
    ];
  });

  String? _siegeSelectionne;
  bool _siegeSelectionneEstPremium = false;
  bool _attributionAutomatique = false;
  Timer? _minuteur;
  int _secondesRestantes = 5;
  bool _demandeConfirmation = false;
  int _secondesConfirmation = 5;
  Timer? _minuteurConfirmation;

  @override
  void dispose() {
    _minuteur?.cancel();
    _minuteurConfirmation?.cancel();
    super.dispose();
  }

  void _demarrerMinuteur() {
    setState(() {
      _secondesRestantes = 5;
      _demandeConfirmation = false;
    });
    _minuteur?.cancel();
    _minuteur = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_secondesRestantes > 0) {
          _secondesRestantes--;
        } else {
          timer.cancel();
          _declencherDemandeConfirmation();
        }
      });
    });
  }

  void _declencherDemandeConfirmation() {
    setState(() {
      _demandeConfirmation = true;
      _secondesConfirmation = 5;
    });
    _minuteurConfirmation?.cancel();
    _minuteurConfirmation = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_secondesConfirmation > 0) {
          _secondesConfirmation--;
        } else {
          timer.cancel();
          _siegeSelectionne = null;
          _attributionAutomatique = false;
          _demandeConfirmation = false;
        }
      });
    });
  }

  void _confirmerPresence() {
    _minuteurConfirmation?.cancel();
    setState(() => _demandeConfirmation = false);
    _demarrerMinuteur();
  }

  void _selectionnerSiege(String numero, StatutSiege statut) {
    if (statut == StatutSiege.pris || statut == StatutSiege.indisponible) return;

    if (_siegeSelectionne == numero) {
      _annulerSelection();
      return;
    }

    setState(() {
      _siegeSelectionne = numero;
      _siegeSelectionneEstPremium = statut == StatutSiege.premium;
      _attributionAutomatique = false;
    });
    _demarrerMinuteur();
  }

  void _annulerSelection() {
    _minuteur?.cancel();
    _minuteurConfirmation?.cancel();
    setState(() {
      _siegeSelectionne = null;
      _attributionAutomatique = false;
      _demandeConfirmation = false;
    });
  }

  void _selectionAutomatique() {
    if (_siegeSelectionne != null) return;

    final siegesStandardLibres = <String>[];
    for (final rangee in _rangees) {
      for (final siege in rangee) {
        if (siege != null && siege.statut == StatutSiege.libre) {
          siegesStandardLibres.add(siege.numero);
        }
      }
    }
    if (siegesStandardLibres.isEmpty) return;
    final choisi = siegesStandardLibres[Random().nextInt(siegesStandardLibres.length)];
    setState(() {
      _siegeSelectionne = choisi;
      _siegeSelectionneEstPremium = false; // choix auto = jamais premium
      _attributionAutomatique = true;
    });
    _demarrerMinuteur();

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => EcranPaiement(
          attributionAutomatique: true,
          siegePremium: false,
          secondesRestantesInitiales: _secondesRestantes,
        ),
      ),
    );
  }

  String get _tempsFormate {
    final minutes = _secondesRestantes ~/ 60;
    final secondes = _secondesRestantes % 60;
    return '${minutes.toString().padLeft(1, '0')}:${secondes.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
        title: const Text('Choisir un siège', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                SizedBox(
                  height: 50,
                  child: _siegeSelectionne == null
                      ? const SizedBox.shrink()
                      : Container(
                          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: JegoColors.vertTresClair,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.timer_outlined, size: 18, color: JegoColors.vertFonce),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Siège réservé — $_tempsFormate restantes',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: JegoColors.vertFonce),
                                ),
                              ),
                              GestureDetector(
                                onTap: _annulerSelection,
                                child: Text(
                                  'Annuler',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JegoColors.vertFonce.withOpacity(0.7)),
                                ),
                              ),
                            ],
                          ),
                        ),
                ),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _Legende(couleur: Colors.black12, texte: 'Libre'),
                      const SizedBox(width: 14),
                      _Legende(couleur: const Color(0xFFF0997B), texte: 'Premium'),
                      const SizedBox(width: 14),
                      _Legende(couleur: Colors.black26, texte: 'Pris'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: [
                        Text('DEVANT', style: TextStyle(fontSize: 9, color: Colors.black.withOpacity(0.3), letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        Container(
                          width: 130,
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.black12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.block_rounded, size: 13, color: Colors.black26),
                              const SizedBox(width: 5),
                              Text('Chauffeur', style: TextStyle(fontSize: 10, color: Colors.black.withOpacity(0.4), fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        ..._rangees.map((rangee) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 5),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: rangee.map((siege) {
                                if (siege == null) return const SizedBox(width: 24);
                                final cache = _attributionAutomatique;
                                return Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  child: _CarreSiege(
                                    siege: siege,
                                    selectionne: !cache && _siegeSelectionne == siege.numero,
                                    onTap: cache ? null : () => _selectionnerSiege(siege.numero, siege.statut),
                                  ),
                                );
                              }).toList(),
                            ),
                          );
                        }),
                        const SizedBox(height: 8),
                        Text('ARRIÈRE', style: TextStyle(fontSize: 9, color: Colors.black.withOpacity(0.3), letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),

                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: Colors.black.withOpacity(0.06))),
                  ),
                  child: Column(
                    children: [
                      if (_siegeSelectionne == null)
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: _selectionAutomatique,
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.black.withOpacity(0.4),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                            ),
                            icon: const Icon(Icons.shuffle_rounded, size: 14),
                            label: const Text('Choix automatique', style: TextStyle(fontSize: 11)),
                          ),
                        ),
                      if (_siegeSelectionne == null) const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _siegeSelectionne == null
                                      ? 'Aucun siège'
                                      : (_attributionAutomatique ? 'Place attribuée' : 'Siège $_siegeSelectionne'),
                                  style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.55)),
                                ),
                                Text(
                                  _attributionAutomatique ? '4 000 FCFA' : '6 420 FCFA',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: JegoColors.vertFonce),
                                ),
                              ],
                            ),
                          ),
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: _siegeSelectionne == null
                                  ? null
                                  : () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (context) => EcranPaiement(
                                            attributionAutomatique: _attributionAutomatique,
                                            numeroSiege: _siegeSelectionne,
                                            siegePremium: _siegeSelectionneEstPremium,
                                            secondesRestantesInitiales: _secondesRestantes,
                                          ),
                                        ),
                                      );
                                    },
                              borderRadius: BorderRadius.circular(26),
                              child: Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: _siegeSelectionne == null ? Colors.black12 : JegoColors.vertMoyen,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.arrow_forward_rounded,
                                  color: _siegeSelectionne == null ? Colors.black38 : Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (_demandeConfirmation)
              Container(
                color: Colors.black.withOpacity(0.5),
                child: Center(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 40),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.help_outline_rounded, size: 36, color: JegoColors.vertMoyen),
                        const SizedBox(height: 12),
                        const Text('Êtes-vous toujours là ?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                        const SizedBox(height: 6),
                        Text(
                          'Votre siège sera libéré dans $_secondesConfirmation s',
                          style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.55)),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: JegoColors.vertMoyen,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _confirmerPresence,
                            child: const Text('Oui, je suis là', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Legende extends StatelessWidget {
  final Color couleur;
  final String texte;

  const _Legende({required this.couleur, required this.texte});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: couleur, borderRadius: BorderRadius.circular(3))),
        const SizedBox(width: 6),
        Text(texte, style: TextStyle(fontSize: 11, color: Colors.black.withOpacity(0.6))),
      ],
    );
  }
}

class _CarreSiege extends StatelessWidget {
  final _Siege siege;
  final bool selectionne;
  final VoidCallback? onTap;

  const _CarreSiege({required this.siege, required this.selectionne, required this.onTap});

  @override
  Widget build(BuildContext context) {
    Color fond;
    Color texte;
    if (selectionne) {
      fond = JegoColors.vertMoyen;
      texte = Colors.white;
    } else {
      switch (siege.statut) {
        case StatutSiege.premium:
          fond = const Color(0xFFF5C4B3);
          texte = const Color(0xFF712B13);
          break;
        case StatutSiege.pris:
        case StatutSiege.indisponible:
          fond = Colors.black12;
          texte = Colors.black26;
          break;
        case StatutSiege.libre:
          fond = Colors.white;
          texte = Colors.black87;
          break;
      }
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: fond,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selectionne ? JegoColors.vertFonce : Colors.black12),
        ),
        child: Text(
          siege.numero,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: texte),
        ),
      ),
    );
  }
}