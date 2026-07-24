import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/wallet_store.dart';
import '../config/theme_jego.dart';

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
  bool _masque = false;

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
                    const Icon(Icons.receipt_long_rounded,
                        size: 16, color: JegoTheme.vert),
                    const SizedBox(width: 6),
                    const Text(
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
                                'Aucun mouvement pour l\'instant.',
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
                                child: const Icon(Icons.arrow_downward_rounded,
                                    color: JegoTheme.vert, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Remboursement trajet',
                                      style: TextStyle(
                                          color: JegoTheme.texte,
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w800),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${m['motif']}'
                                          .replaceFirst('Annulation ', ''),
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
                                    '+${_fmt(m['montant'] as int)} FCFA',
                                    style: const TextStyle(
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
            decoration: const BoxDecoration(
              color: JegoTheme.vert,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.shield_rounded,
                color: Colors.white, size: 18),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Ce solde provient uniquement de vos remboursements et n\'est utilisable que pour vos paiements JEGO.',
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
        decoration: const BoxDecoration(
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
                  color: Colors.white.withOpacity(0.06),
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
                            color: Colors.white.withOpacity(0.16),
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
                            color: Colors.white.withOpacity(0.16),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                              Icons.account_balance_wallet_rounded,
                              color: Colors.white,
                              size: 18),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Solde disponible',
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 13,
                              fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => setState(() => _masque = !_masque),
                          child: Icon(
                            _masque
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                            color: Colors.white.withOpacity(0.75),
                            size: 17,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    ValueListenableBuilder<int>(
                      valueListenable: WalletStore.solde,
                      builder: (context, solde, _) => Text(
                        _masque ? '••••••' : '${_fmt(solde)} FCFA',
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
                        color: Colors.white.withOpacity(0.16),
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