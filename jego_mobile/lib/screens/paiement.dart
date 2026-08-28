import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/api.dart';
import '../config/billets_store.dart'; // SoftLock (verrou de siège)
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

/// Opérateurs réellement acceptés par le backend. Le code envoyé au
/// serveur est celui attendu par la table paiements ('mtn_momo',
/// 'orange_money'). Express Union n'est pas encore raccordé : tant
/// qu'il ne l'est pas, on ne le propose pas plutôt que de laisser un
/// paiement échouer après coup.
const _operateurs = [
  Operateur('MTN MoMo', 'mtn_momo', Color(0xFFFFCB05), 'MTN'),
  Operateur('Orange Money', 'orange_money', Color(0xFFFF6600), 'OM'),
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
  String? _messageEchec;

  /// Clé d'idempotence : générée UNE seule fois pour cette tentative
  /// de paiement et réutilisée telle quelle en cas de nouvel essai.
  /// Le backend garantit ainsi qu'un double appui, une reprise réseau
  /// ou un retry ne débitera jamais deux fois le voyageur.
  String? _cleIdempotence;

  @override
  void dispose() {
    _cTel.dispose();
    _timer?.cancel();
    super.dispose();
  }

  /// Paiement réel. Pour chaque siège retenu : on pose le verrou puis
  /// on paie. Le montant est calculé par le serveur, pas par
  /// l'application.
  Future<void> _payer() async {
    if (_operateur == null || !PaysTelephone.valide(_pays, _cTel.text)) {
      setState(() => _erreur = true);
      return;
    }

    final r = widget.reservation;
    final trajetId = '${r.offreAller['id']}';
    final ordreDepart = (r.offreAller['ordre_depart'] as int?) ?? 0;
    final ordreArrivee = (r.offreAller['ordre_arrivee'] as int?) ?? 1;

    // Sièges à payer, avec leur identifiant serveur.
    final sieges = <String>[];
    for (final numero in r.siegesAller) {
      final id = r.idSiegesAller[numero];
      if (id != null) sieges.add(id);
    }

    if (sieges.isEmpty) {
      setState(() {
        _etat = 'echec';
        _messageEchec =
            'Aucun siège sélectionné. Revenez en arrière pour choisir votre place.';
      });
      return;
    }

    // La clé ne change pas entre deux tentatives : c'est ce qui rend
    // le paiement rejouable sans risque de double débit.
    _cleIdempotence ??=
        'jego-${DateTime.now().millisecondsSinceEpoch}-$trajetId-${sieges.first}';

    setState(() {
      _erreur = false;
      _messageEchec = null;
      _etat = 'verification';
    });
    SoftLock.suspendre();

    try {
      for (var i = 0; i < sieges.length; i++) {
        final siegeId = sieges[i];

        // Verrou : si le siège vient d'être pris par quelqu'un
        // d'autre, on le sait ici, avant tout débit.
        await ApiService.verrouillerSiege(
          trajetId: trajetId,
          siegeId: siegeId,
          ordreDepart: ordreDepart,
          ordreArrivee: ordreArrivee,
        );

        final emis = await ApiService.payer(
          trajetId: trajetId,
          siegeId: siegeId,
          operateur: _operateur!.code,
          cleIdempotence: '${_cleIdempotence!}-$i',
          ordreDepart: ordreDepart,
          ordreArrivee: ordreArrivee,
          supplementBagage: i < r.bagagesAller.length ? r.bagagesAller[i] : 0,
          billetFlexible:
              i < r.flexibleAller.length ? r.flexibleAller[i] : false,
          estCadeau: i < r.cadeauAller.length ? r.cadeauAller[i] : false,
          destinataireTel:
              i < r.cadeauTelAller.length && r.cadeauTelAller[i].isNotEmpty
                  ? r.cadeauTelAller[i]
                  : null,
          utiliserReduction: r.pointsReduction > 0,
        );

        // Le numero et le QR viennent du serveur : ce sont eux qui
        // seront scannes a l'embarquement. Rien n'est fabrique ici.
        final billet = emis['billet'];
        if (billet is Map) {
          r.billetsEmis[r.siegesAller[i]] =
              Map<String, dynamic>.from(billet);
        }
      }

      if (!mounted) return;
      _succes();
    } on ErreurApi catch (e) {
      if (!mounted) return;
      SoftLock.reprendre();
      setState(() {
        _etat = 'echec';
        _messageEchec = e.message;
      });
    }
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
                        color: JegoTheme.fondCarte,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: Icon(Icons.arrow_back_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                 const SizedBox(width: 14),
                  Text(
                    Strings.t('paiement_titre'),
                    style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  TimerSoftLock(),
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
                    style: TextStyle(
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
                                style: TextStyle(
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
                    style: TextStyle(
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
                        style: TextStyle(
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
                      SizedBox(
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
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  Strings.t('paiement_verif_texte'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
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
                    style: TextStyle(
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
                  child: Icon(Icons.close_rounded,
                      color: JegoTheme.danger, size: 44),
                ),
                const SizedBox(height: 20),
                Text(
                  Strings.t('paiement_echec_titre'),
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 18,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  _messageEchec ?? Strings.t('paiement_echec_texte'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
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