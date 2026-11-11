import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/wallet_store.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/style_jego.dart';

/// Ecran Portefeuille JEGO : solde credite par les remboursements
/// d'annulation, historique des mouvements. Volontairement SANS recharge,
/// transfert ni retrait -- le wallet ne sert qu'a payer dans l'app, jamais
/// a faire entrer ou sortir de l'argent frais (decision explicite).
class EcranWallet extends StatefulWidget {
  const EcranWallet({super.key});

  @override
  State<EcranWallet> createState() => _EcranWalletState();
}

class _EcranWalletState extends State<EcranWallet> {
  @override
  void initState() {
    super.initState();
    // Le solde vient du serveur : on le relit a chaque ouverture plutot
    // que d'afficher celui de la derniere visite.
    WalletStore.charger();
  }

  String _fmt(int montant) {
    final s = montant.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  String _dateLisible(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      const mois = [
        'jan',
        'fev',
        'mar',
        'avr',
        'mai',
        'juin',
        'juil',
        'aout',
        'sep',
        'oct',
        'nov',
        'dec'
      ];
      return '${d.day} ${mois[d.month - 1]} ${d.year}';
    } catch (_) {
      return iso;
    }
  }

  /// Le motif vient du serveur sous forme de code ('billet_flexible',
  /// 'retard_excessif', 'annulation_agence'). On le dit en francais
  /// plutot que d'exposer l'etiquette technique.
  String _libelleMotif(String code) {
    switch (code) {
      case 'achat_billet':
        return Strings.t('motif_achat_billet');
      case 'billet_flexible':
        return Strings.t('motif_billet_flexible');
      case 'retard_excessif':
        return Strings.t('motif_retard');
      case 'litige':
        return Strings.t('motif_litige');
      default:
        // Annulation par l'agence : le motif porte alors le code de
        // suppression choisi par l'agence, qui ne veut rien dire ici.
        return Strings.t('motif_annulation_agence');
    }
  }

  /// Le trajet concerne, et a defaut le numero du billet : sans l'un ni
  /// l'autre, un montant seul ne se rattache a rien.
  String _trajetEtReference(Map<String, dynamic> m) {
    final depart = '${m['depart'] ?? ''}';
    final arrivee = '${m['arrivee'] ?? ''}';
    final numero = '${m['numero_billet'] ?? ''}';
    if (depart.isNotEmpty && arrivee.isNotEmpty) {
      return numero.isEmpty
          ? '$depart → $arrivee'
          : '$depart → $arrivee · $numero';
    }
    return numero.isEmpty ? '${m['reference'] ?? ''}' : numero;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: FondDegrade(hauteur: 260),
          ),
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _enTeteCarte()),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 40),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _banniereSecurite(),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        Icon(Icons.receipt_long_rounded,
                            size: 16, color: JegoTheme.vert),
                        const SizedBox(width: 6),
                        Text(
                          'HISTORIQUE',
                          style: TextStyle(
                              color: JegoTheme.vert,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ValueListenableBuilder<List<Map<String, dynamic>>>(
                      valueListenable: WalletStore.historique,
                      builder: (context, mouvements, _) {
                        if (mouvements.isEmpty) {
                          return Container(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            decoration: BoxDecoration(
                              color: JegoTheme.fondCarte,
                              borderRadius:
                                  BorderRadius.circular(JegoTheme.rMoyen),
                              border: Border.all(color: JegoTheme.bordCarte),
                            ),
                            child: Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.inbox_rounded,
                                      size: 34, color: JegoTheme.texteTernaire),
                                  const SizedBox(height: 10),
                                  Text(
                                    Strings.t('wallet_aucun_mouvement'),
                                    style: TextStyle(
                                        color: JegoTheme.texteSecondaire),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return Column(
                          children: List.generate(mouvements.length, (i) {
                            final m = mouvements[i];
                            // Un debit est un billet paye avec le solde.
                            final debit = m['sens'] == 'debit';
                            final couleur =
                                debit ? JegoTheme.texte : JegoTheme.vert;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: JegoTheme.fondCarte,
                                borderRadius:
                                    BorderRadius.circular(JegoTheme.rMoyen),
                                border: Border.all(color: JegoTheme.bordCarte),
                                boxShadow: JegoTheme.ombreDouce,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: couleur.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(
                                          JegoTheme.rPetit),
                                    ),
                                    child: Icon(
                                        debit
                                            ? Icons.confirmation_number_rounded
                                            : Icons.arrow_downward_rounded,
                                        color: couleur,
                                        size: 20),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _libelleMotif('${m['motif']}'),
                                          style: TextStyle(
                                              color: JegoTheme.texte,
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w800),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _trajetEtReference(m),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                              color: JegoTheme.texteSecondaire,
                                              fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '${debit ? '−' : '+'}${_fmt(int.tryParse('${m['montant']}') ?? 0)} FCFA',
                                        style: TextStyle(
                                            color: couleur,
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w800),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _dateLisible('${m['date']}'),
                                        style: TextStyle(
                                            color: JegoTheme.texteTernaire,
                                            fontSize: 10.5),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            )
                                .animate(delay: (i * 60).ms)
                                .fadeIn(duration: 300.ms);
                          }),
                        );
                      },
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _banniereSecurite() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: JegoTheme.vert.withOpacity(0.06),
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.vert.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: JegoTheme.vert,
              shape: BoxShape.circle,
            ),
            child:
                const Icon(Icons.shield_rounded, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              Strings.t('info_portefeuille_texte'),
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  height: 1.3),
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn(duration: 300.ms);
  }

  /// En-tete commun, puis le solde dans une carte : le meme vert que
  /// partout, sans le bandeau en vague qui faisait de cette page une
  /// exception.
  Widget _enTeteCarte() {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            EnteteJego(titre: Strings.t('wallet_titre'), retour: true),
            const SizedBox(height: 18),
            CarteJego(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: JegoTheme.vert.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.account_balance_wallet_rounded,
                            color: JegoTheme.vert, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        Strings.t('wallet_total_rembourse'),
                        style: TextStyle(
                            color: JegoTheme.texteSecondaire,
                            fontSize: 13,
                            fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  ValueListenableBuilder<int>(
                    valueListenable: WalletStore.solde,
                    builder: (context, solde, _) => Text(
                      '${_fmt(solde)} FCFA',
                      style: TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5),
                    ),
                  ),
                ],
              ),
            ).animate(delay: 120.ms).fadeIn(duration: 350.ms),
          ],
        ),
      ),
    );
  }
}
