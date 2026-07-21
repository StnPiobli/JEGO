import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/reservation.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/champ_telephone.dart';
import '../widgets/timer_softlock.dart';
import 'confirmation.dart';
class Operateur {
  final String nom;
  final String code;
  final Color couleur;
  final String initiales;
  const Operateur(this.nom, this.code, this.couleur, this.initiales);
}

const _operateurs = [
  Operateur('MTN MoMo', 'mtn', Color(0xFFFFCB05), 'MTN'),
  Operateur('Orange Money', 'orange', Color(0xFFFF6600), 'OM'),
  Operateur('Express Union', 'eu', Color(0xFF1A3E8C), 'EU'),
];

class EcranPaiement extends StatefulWidget {
  final Reservation reservation;
  const EcranPaiement({super.key, required this.reservation});

  @override
  State<EcranPaiement> createState() => _EcranPaiementState();
}

class _EcranPaiementState extends State<EcranPaiement> {
  Operateur? _operateur;
  final _cTel = TextEditingController();
  Pays _pays = PaysTelephone.cameroun;
  bool _erreur = false;

  String _etat = 'choix'; // choix | verification | echec
  Timer? _timer;

  @override
  void dispose() {
    _cTel.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _payer() {
    if (_operateur == null || !PaysTelephone.valide(_pays, _cTel.text)) {
      setState(() => _erreur = true);
      return;
    }
    setState(() {
      _erreur = false;
      _etat = 'verification';
    });
    // Pas de compte a rebours du soft-lock pendant la validation.
    SoftLock.suspendre();
    // DEMO : succes automatique apres 4 s.
    // Au branchement : on interroge le statut du paiement Mobile Money.
    _timer = Timer(const Duration(seconds: 4), () {
      if (mounted) _succes();
    });
  }

  void _succes() {
    // Paiement valide -> le siege est definitivement attribue,
    // le verrou n'a plus lieu d'etre.
    SoftLock.arreter();
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => EcranConfirmation(reservation: widget.reservation),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_etat == 'verification') return _vueVerification();
    if (_etat == 'echec') return _vueEchec();
    return _vueChoix();
  }

  Widget _vueChoix() {
    final r = widget.reservation;
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              child: Row(
                children: [
                  BoutonTactile(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                 const SizedBox(width: 14),
                  Text(
                    Strings.t('paiement_titre'),
                    style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  const TimerSoftLock(),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 6, 18, 20),
                children: [
                  // Montant a payer
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: JegoTheme.vert,
                      borderRadius:
                          BorderRadius.circular(JegoTheme.rMoyen),
                      boxShadow: JegoTheme.ombreVerte,
                    ),
                    child: Column(
                      children: [
                        Text(
                          Strings.t('paiement_montant'),
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.85),
                              fontSize: 12.5),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${r.total} FCFA',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1),
                  const SizedBox(height: 18),
                  Text(
                    Strings.t('paiement_choisir_op'),
                    style: const TextStyle(
                        color: JegoTheme.texte,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  ..._operateurs.map((op) {
                    final actif = _operateur?.code == op.code;
                    return BoutonTactile(
                      onTap: () => setState(() {
                        _operateur = op;
                        _erreur = false;
                      }),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rMoyen),
                          border: Border.all(
                            color: actif
                                ? JegoTheme.vert
                                : JegoTheme.bordCarte,
                            width: actif ? 1.5 : 1,
                          ),
                          boxShadow: JegoTheme.ombreDouce,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: op.couleur,
                                borderRadius: BorderRadius.circular(
                                    JegoTheme.rPetit),
                              ),
                              child: Text(
                                op.initiales,
                                style: TextStyle(
                                  color: op.code == 'mtn'
                                      ? Colors.black
                                      : Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                op.nom,
                                style: const TextStyle(
                                    color: JegoTheme.texte,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700),
                              ),
                            ),
                            Icon(
                              actif
                                  ? Icons.radio_button_checked_rounded
                                  : Icons
                                      .radio_button_unchecked_rounded,
                              color: actif
                                  ? JegoTheme.vert
                                  : JegoTheme.texteTernaire,
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  Text(
                    Strings.t('paiement_numero'),
                    style: const TextStyle(
                        color: JegoTheme.texte,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  ChampTelephone(
                    controller: _cTel,
                    pays: _pays,
                    onPays: (p) => setState(() => _pays = p),
                    libelle: Strings.t('paiement_numero_hint'),
                    onChange: (_) => setState(() => _erreur = false),
                  ),
                  if (_erreur)
                    Padding(
                      padding: const EdgeInsets.only(top: 6, left: 4),
                      child: Text(
                        Strings.t('paiement_erreur'),
                        style: const TextStyle(
                          color: JegoTheme.danger,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 16),
              child: BoutonTactile(
                onTap: _payer,
                child: Container(
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: Text(
                    '${Strings.t('paiement_payer')} ${r.total} FCFA',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _vueVerification() {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 90,
                  height: 90,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const SizedBox(
                        width: 90,
                        height: 90,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          color: JegoTheme.vert,
                        ),
                      ),
                      Icon(_operateur?.code == 'mtn'
                          ? Icons.phone_android_rounded
                          : Icons.smartphone_rounded,
                          color: JegoTheme.vert, size: 34),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                Text(
                  Strings.t('paiement_verif_titre'),
                  style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  Strings.t('paiement_verif_texte'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: JegoTheme.texteSecondaire,
                      fontSize: 13,
                      height: 1.5),
                ),
                const SizedBox(height: 24),
                BoutonTactile(
                  onTap: () {
                    _timer?.cancel();
                    SoftLock.reprendre();
                    setState(() => _etat = 'choix');
                  },
                  child: Text(
                    Strings.t('annuler'),
                    style: const TextStyle(
                        color: JegoTheme.texteSecondaire,
                        fontSize: 13,
                        fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _vueEchec() {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    color: JegoTheme.danger.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close_rounded,
                      color: JegoTheme.danger, size: 44),
                ),
                const SizedBox(height: 20),
                Text(
                  Strings.t('paiement_echec_titre'),
                  style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 18,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  Strings.t('paiement_echec_texte'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 13),
                ),
                const SizedBox(height: 24),
                BoutonTactile(
                  onTap: () => setState(() => _etat = 'choix'),
                  child: Container(
                    height: 52,
                    width: double.infinity,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: JegoTheme.vert,
                      borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                      boxShadow: JegoTheme.ombreVerte,
                    ),
                    child: Text(
                      Strings.t('reessayer'),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}