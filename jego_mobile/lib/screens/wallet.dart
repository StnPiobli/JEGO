import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/wallet_store.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

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
      final d = DateTime.parse(iso);
      const mois = [
        'jan', 'fev', 'mar', 'avr', 'mai', 'juin',
        'juil', 'aout', 'sep', 'oct', 'nov', 'dec'
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
      body: CustomScrollView(
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
                                  color: JegoTheme.vert.withOpacity(0.1),
                                  borderRadius:
                                      BorderRadius.circular(JegoTheme.rPetit),
                                ),
                                child: Icon(Icons.arrow_downward_rounded,
                                    color: JegoTheme.vert, size: 20),
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
                                    '+${_fmt(int.tryParse('${m['montant']}') ?? 0)} FCFA',
                                    style: TextStyle(
                                        color: JegoTheme.vert,
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
                        ).animate(delay: (i * 60).ms).fadeIn(duration: 300.ms);
                      }),
                    );
                  },
                ),
              ]),
            ),
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
            child: const Icon(Icons.shield_rounded,
                color: Colors.white, size: 18),
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

  Widget _enTeteCarte() {
    return ClipPath(
      clipper: _VagueClipperWallet(),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [JegoTheme.texte, JegoTheme.vert, JegoTheme.vertVif],
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -40,
              right: -40,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: JegoTheme.fondCarte.withOpacity(0.06),
                ),
              ),
            ),
            Positioned(
              bottom: 10,
              left: -30,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: JegoTheme.vertVif.withOpacity(0.25),
                ),
              ),
            ),
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Builder(
                      builder: (context) => GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: JegoTheme.fondCarte.withOpacity(0.16),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.arrow_back_rounded,
                              color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(9),
                          decoration: BoxDecoration(
                            color: JegoTheme.fondCarte.withOpacity(0.16),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                              Icons.account_balance_wallet_rounded,
                              color: Colors.white,
                              size: 18),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          Strings.t('wallet_total_rembourse'),
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
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
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 34,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: JegoTheme.fondCarte.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.account_balance_wallet_rounded,
                              size: 13, color: Colors.white),
                          const SizedBox(width: 6),
                          const Text(
                            'Portefeuille JEGO',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 350.ms);
  }
}

class _VagueClipperWallet extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final chemin = Path();
    chemin.lineTo(0, size.height - 30);
    chemin.quadraticBezierTo(
        size.width / 2, size.height, size.width, size.height - 30);
    chemin.lineTo(size.width, 0);
    chemin.close();
    return chemin;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}