import 'dart:async';
import 'package:flutter/material.dart';
import '../theme.dart';
import 'ecran_billet.dart';

class EcranPaiement extends StatefulWidget {
  final bool attributionAutomatique;
  final String? numeroSiege;
  final bool siegePremium;
  final int secondesRestantesInitiales;

  const EcranPaiement({
    super.key,
    required this.attributionAutomatique,
    this.numeroSiege,
    this.siegePremium = false,
    this.secondesRestantesInitiales = 300,
  });

  @override
  State<EcranPaiement> createState() => _EcranPaiementState();
}

enum _OptionPoints { aucune, reduction, gratuit }

class _EcranPaiementState extends State<EcranPaiement> {
  static const int _prixAgence = 6000;
  static const int _pourcentageCommission = 7;
  static const int _fraisBagage = 1000;
  static const int _pointsDisponibles = 1200;

  static const int _palierReduction = 500;
  static const int _montantReduction = 500;
  static const int _palierGratuit = 1000;

  bool _bagageSupplementaire = false;
  bool _billetFlexible = false;
  _OptionPoints _optionPoints = _OptionPoints.aucune;
  String? _operateurChoisi;

  bool get _estGratuit => _optionPoints == _OptionPoints.gratuit && _gratuiteDisponible;

  int get _commission => (_prixAgence * _pourcentageCommission / 100).round();
  int get _supplementFlexible => _billetFlexible ? (_prixAgence * 0.10).round() : 0;

  int get _margeJego {
    int marge = _commission + _supplementFlexible;
    if (_bagageSupplementaire) marge += _fraisBagage;
    return marge;
  }

  bool get _gratuiteDisponible =>
      _pointsDisponibles >= _palierGratuit && !widget.siegePremium && !_billetFlexible;

  // Le billet est offert, mais le bagage supplementaire reste toujours payant
  int get _total {
    if (_estGratuit) {
      return _bagageSupplementaire ? _fraisBagage : 0;
    }
    int total = _prixAgence + _margeJego;
    if (_optionPoints == _OptionPoints.reduction) total -= _montantReduction;
    return total;
  }

  late int _secondesRestantes;
  Timer? _minuteur;
  bool _demandeConfirmation = false;
  int _secondesConfirmation = 5;
  Timer? _minuteurConfirmation;
  bool _tempsEcoule = false;

  @override
  void initState() {
    super.initState();
    _secondesRestantes = widget.secondesRestantesInitiales;
    _demarrerMinuteur();
  }

  @override
  void dispose() {
    _minuteur?.cancel();
    _minuteurConfirmation?.cancel();
    super.dispose();
  }

  void _demarrerMinuteur() {
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
          _demandeConfirmation = false;
          _tempsEcoule = true;
        }
      });
    });
  }

  void _confirmerPresence() {
    _minuteurConfirmation?.cancel();
    setState(() {
      _demandeConfirmation = false;
      _secondesRestantes = 300;
    });
    _demarrerMinuteur();
  }

  String get _tempsFormate {
    final minutes = _secondesRestantes ~/ 60;
    final secondes = _secondesRestantes % 60;
    return '${minutes.toString().padLeft(1, '0')}:${secondes.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_tempsEcoule) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer_off_rounded, size: 48, color: Colors.black26),
                  const SizedBox(height: 16),
                  const Text('Temps écoulé', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                  const SizedBox(height: 6),
                  Text(
                    'Votre siège a été libéré. Recommencez votre réservation.',
                    style: TextStyle(fontSize: 13, color: Colors.black.withOpacity(0.55)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: JegoColors.vertMoyen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                    child: const Text('Retour à l\'accueil'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
        title: const Text('Paiement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Container(
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
                      Text(
                        'Siège réservé — $_tempsFormate restantes',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: JegoColors.vertFonce),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.black12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            children: [
                              _LigneRecap(label: 'Douala → Yaoundé', valeur: '15 juil. 2026 · 08h00'),
                              _LigneRecap(
                                label: 'Siège',
                                valeur: widget.attributionAutomatique
                                    ? 'Attribué après paiement'
                                    : (widget.numeroSiege ?? '—'),
                              ),
                              const Divider(height: 20),
                              // Cas gratuit : billet offert affiche EN PREMIER,
                              // puis les supplements ensuite avec la mention (supplement)
                              if (_estGratuit) ...[
                                _LigneRecap(label: 'Billet offert (points)', valeur: 'Gratuit'),
                                if (_bagageSupplementaire)
                                  _LigneRecap(label: 'Bagage supplémentaire (supplément)', valeur: '$_fraisBagage FCFA'),
                              ] else ...[
                                _LigneRecap(label: 'Prix agence', valeur: '$_prixAgence FCFA'),
                                _LigneRecap(label: 'Commission JEGO', valeur: '$_commission FCFA'),
                                if (_supplementFlexible > 0)
                                  _LigneRecap(label: 'Supplément flexible', valeur: '$_supplementFlexible FCFA'),
                                if (_bagageSupplementaire)
                                  _LigneRecap(label: 'Bagage supplémentaire', valeur: '$_fraisBagage FCFA'),
                                if (_optionPoints == _OptionPoints.reduction)
                                  _LigneRecap(label: 'Réduction points JEGO', valeur: '-$_montantReduction FCFA'),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        _OptionBasculable(
                          icone: Icons.work_outline_rounded,
                          titre: 'Bagage supplémentaire',
                          sousTitre: '+$_fraisBagage FCFA',
                          valeur: _bagageSupplementaire,
                          onChange: (v) => setState(() => _bagageSupplementaire = v),
                        ),
                        const SizedBox(height: 10),
                        _OptionBasculable(
                          icone: Icons.refresh_rounded,
                          titre: 'Billet flexible',
                          sousTitre: _estGratuit
                              ? 'Indisponible avec un billet gratuit'
                              : '+10% du prix agence — annulation remboursée jusqu\'à 80%',
                          valeur: _billetFlexible,
                          onChange: _estGratuit
                              ? null
                              : (v) => setState(() => _billetFlexible = v),
                        ),
                        const SizedBox(height: 16),

                        Text('JEGO Points ($_pointsDisponibles pts disponibles)', style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6))),
                        const SizedBox(height: 8),

                        _OptionPointsWidget(
                          titre: 'Réduction de $_montantReduction FCFA',
                          sousTitre: '$_palierReduction points',
                          disponible: _pointsDisponibles >= _palierReduction,
                          selectionne: _optionPoints == _OptionPoints.reduction,
                          onTap: () => setState(() {
                            _optionPoints = _optionPoints == _OptionPoints.reduction ? _OptionPoints.aucune : _OptionPoints.reduction;
                          }),
                        ),
                        const SizedBox(height: 8),
                        _OptionPointsWidget(
                          titre: 'Billet standard gratuit',
                          sousTitre: _gratuiteDisponible
                              ? '$_palierGratuit points'
                              : (widget.siegePremium
                                  ? '$_palierGratuit points — indisponible (siège premium)'
                                  : (_billetFlexible
                                      ? '$_palierGratuit points — indisponible (billet flexible)'
                                      : '$_palierGratuit points — solde insuffisant')),
                          disponible: _pointsDisponibles >= _palierGratuit && !widget.siegePremium,
                          selectionne: _optionPoints == _OptionPoints.gratuit,
                          onTap: () => setState(() {
                            final activation = _optionPoints != _OptionPoints.gratuit;
                            _optionPoints = activation ? _OptionPoints.gratuit : _OptionPoints.aucune;
                            // Selectionner "gratuit" ferme "flexible" (et non l'inverse) :
                            // la gratuite est prioritaire, elle desactive le flexible incompatible
                            if (activation) _billetFlexible = false;
                          }),
                        ),

                        const SizedBox(height: 20),
                        Text('Moyen de paiement', style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6))),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _ChoixOperateur(
                                nom: 'MTN MoMo',
                                selectionne: _operateurChoisi == 'mtn',
                                desactive: _total == 0,
                                onTap: () => setState(() => _operateurChoisi = 'mtn'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _ChoixOperateur(
                                nom: 'Orange Money',
                                selectionne: _operateurChoisi == 'orange',
                                desactive: _total == 0,
                                onTap: () => setState(() => _operateurChoisi = 'orange'),
                              ),
                            ),
                          ],
                        ),
                        if (_total == 0)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              'Aucun paiement requis pour un billet gratuit',
                              style: TextStyle(fontSize: 11, color: Colors.black.withOpacity(0.45)),
                            ),
                          ),
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total', style: TextStyle(fontSize: 13, color: Colors.black.withOpacity(0.55))),
                          Text(
                            _total == 0 ? 'Gratuit' : '$_total FCFA',
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: JegoColors.vertFonce),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: JegoColors.vertMoyen,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: (_total > 0 && _operateurChoisi == null)
                              ? null
                              : () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => EcranBillet(
                                        numeroBillet: 'JG-20260715-A${(1000 + (100 * _total) % 8999).toInt()}',
                                        numeroSiege: widget.numeroSiege,
                                        attributionAutomatique: widget.attributionAutomatique,
                                        depart: 'Douala',
                                        arrivee: 'Yaoundé',
                                        date: '15 juil. 2026',
                                        heure: '08h00',
                                        nomAgence: 'Touristique Express',
                                        montantPaye: _total,
                                      ),
                                    ),
                                  );
                                },
                          child: Text(
                            _total == 0 ? 'Confirmer (gratuit)' : 'Payer $_total FCFA',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                          ),
                        ),
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

class _LigneRecap extends StatelessWidget {
  final String label;
  final String valeur;

  const _LigneRecap({required this.label, required this.valeur});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.black.withOpacity(0.55))),
          Text(valeur, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _OptionBasculable extends StatelessWidget {
  final IconData icone;
  final String titre;
  final String sousTitre;
  final bool valeur;
  final ValueChanged<bool>? onChange;

  const _OptionBasculable({
    required this.icone,
    required this.titre,
    required this.sousTitre,
    required this.valeur,
    required this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    final desactive = onChange == null;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black12),
        borderRadius: BorderRadius.circular(12),
        color: desactive ? Colors.black.withOpacity(0.02) : Colors.white,
      ),
      child: Row(
        children: [
          Icon(icone, size: 20, color: desactive ? Colors.black26 : JegoColors.vertMoyen),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titre, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: desactive ? Colors.black38 : Colors.black87)),
                Text(sousTitre, style: TextStyle(fontSize: 11, color: Colors.black.withOpacity(0.5))),
              ],
            ),
          ),
          Switch(value: valeur && !desactive, onChanged: onChange, activeColor: JegoColors.vertMoyen),
        ],
      ),
    );
  }
}

class _OptionPointsWidget extends StatelessWidget {
  final String titre;
  final String sousTitre;
  final bool disponible;
  final bool selectionne;
  final VoidCallback onTap;

  const _OptionPointsWidget({
    required this.titre,
    required this.sousTitre,
    required this.disponible,
    required this.selectionne,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: disponible ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selectionne ? const Color(0xFFFAEEDA) : (disponible ? Colors.white : Colors.black.withOpacity(0.02)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selectionne ? const Color(0xFFBA7517) : Colors.black12, width: selectionne ? 2 : 1),
        ),
        child: Row(
          children: [
            Icon(
              selectionne ? Icons.check_circle_rounded : Icons.star_outline_rounded,
              size: 18,
              color: disponible ? (selectionne ? const Color(0xFFBA7517) : Colors.black45) : Colors.black26,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titre, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: disponible ? Colors.black87 : Colors.black38)),
                  Text(sousTitre, style: TextStyle(fontSize: 11, color: disponible ? Colors.black.withOpacity(0.5) : Colors.black26)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChoixOperateur extends StatelessWidget {
  final String nom;
  final bool selectionne;
  final bool desactive;
  final VoidCallback onTap;

  const _ChoixOperateur({
    required this.nom,
    required this.selectionne,
    required this.onTap,
    this.desactive = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: desactive ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: desactive
              ? Colors.black.withOpacity(0.02)
              : (selectionne ? JegoColors.vertTresClair : Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: desactive ? Colors.black12 : (selectionne ? JegoColors.vertMoyen : Colors.black12),
            width: selectionne && !desactive ? 2 : 1,
          ),
        ),
        child: Center(
          child: Text(
            nom,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: desactive ? Colors.black26 : (selectionne ? JegoColors.vertFonce : Colors.black54),
            ),
          ),
        ),
      ),
    );
  }
}