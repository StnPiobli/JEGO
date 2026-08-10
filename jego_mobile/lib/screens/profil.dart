import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/format_date.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/champ_telephone.dart';
import '../config/wallet_store.dart';
import 'connexion_inscription.dart';
import 'ecran_a_venir.dart';
import 'ecran_a_propos.dart';
import 'ecran_adresses.dart';
import 'ecran_centre_aide.dart';
import 'ecran_mes_avis.dart';
import 'ecran_moyens_paiement.dart';
import 'ecran_nous_contacter.dart';
import 'ecran_preferences_voyage.dart';
import 'wallet.dart';

/// Ecran Profil voyageur. Reagit a l'etat de connexion et a la langue.
class EcranProfil extends StatelessWidget {
  const EcranProfil({super.key});

  /// Solde réel de points JEGO, tenu par le serveur.
  static int get pointsJego => Session.pointsFidelite;

  /// Fonds d'avatar JEGO proposes (degrades). Index stocke dans Session.
  static const List<List<Color>> fondsAvatar = [
    [JegoTheme.vertVif, JegoTheme.vert],
    [Color(0xFF4A90D9), Color(0xFF2C5FA8)],
    [Color(0xFFE6B84C), Color(0xFFCB8E1E)],
    [Color(0xFFE07A5F), Color(0xFFC44536)],
    [Color(0xFF9B72CF), Color(0xFF6F4BA8)],
    [Color(0xFF14201A), Color(0xFF2C3E36)],
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        bottom: false,
        child: ValueListenableBuilder<String>(
          valueListenable: langueCourante,
          builder: (context, langue, _) {
            return ValueListenableBuilder<bool>(
              valueListenable: Session.connecte,
              builder: (context, connecte, __) {
                return connecte ? _ProfilConnecte() : _ProfilNonConnecte();
              },
            );
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// NON CONNECTE
// ---------------------------------------------------------------------------
class _ProfilNonConnecte extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 100),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              Strings.t('profil_titre'),
              style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 24,
                  fontWeight: FontWeight.w800),
            ),
          ),
          const Spacer(),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: JegoTheme.vert.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.person_rounded,
                size: 52, color: JegoTheme.vert),
          ).animate().scale(
              begin: const Offset(0.6, 0.6),
              duration: 500.ms,
              curve: Curves.easeOutBack),
          const SizedBox(height: 20),
          Text(
            Strings.t('profil_non_connecte_titre'),
            style: const TextStyle(
                color: JegoTheme.texte,
                fontSize: 18,
                fontWeight: FontWeight.w800),
          ).animate(delay: 120.ms).fadeIn(),
          const SizedBox(height: 8),
          Text(
            Strings.t('profil_non_connecte_texte'),
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: JegoTheme.texteSecondaire,
                fontSize: 13.5,
                height: 1.4),
          ).animate(delay: 180.ms).fadeIn(),
          const SizedBox(height: 24),
          BoutonTactile(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                    builder: (_) => const EcranConnexionInscription()),
              );
            },
            child: Container(
              width: double.infinity,
              height: 54,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: JegoTheme.vert,
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                boxShadow: JegoTheme.ombreVerte,
              ),
              child: Text(
                Strings.t('profil_se_connecter'),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800),
              ),
            ),
          ).animate(delay: 240.ms).fadeIn().slideY(begin: 0.2),
          const Spacer(flex: 2),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// CONNECTE
// ---------------------------------------------------------------------------
class _ProfilConnecte extends StatefulWidget {
  @override
  State<_ProfilConnecte> createState() => _ProfilConnecteState();
}

class _ProfilConnecteState extends State<_ProfilConnecte> {
  String get _initiales {
    final p = (Session.prenom ?? '').trim();
    final n = (Session.nom ?? '').trim();
    final a = p.isNotEmpty ? p[0] : '';
    final b = n.isNotEmpty ? n[0] : '';
    final r = '$a$b'.toUpperCase();
    return r.isEmpty ? 'JG' : r;
  }

  String _fmtPoints(int p) {
    final s = p.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  // -------- Photo de profil : galerie / appareil / fond JEGO --------
  void _changerPhoto() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: JegoTheme.fondCarte,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: JegoTheme.bordCarte,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  Strings.t('profil_photo_titre'),
                  style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 16,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                _optionPhoto(
                  icone: Icons.photo_library_rounded,
                  libelle: Strings.t('profil_photo_galerie'),
                ),
                const SizedBox(height: 8),
                _optionPhoto(
                  icone: Icons.photo_camera_rounded,
                  libelle: Strings.t('profil_photo_appareil'),
                ),
                const SizedBox(height: 8),
                Text(
                  Strings.t('profil_photo_bientot'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: JegoTheme.texteTernaire, fontSize: 11),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    Strings.t('profil_photo_fond'),
                    style: const TextStyle(
                        color: JegoTheme.texteSecondaire,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children:
                      List.generate(EcranProfil.fondsAvatar.length, (i) {
                    final actif = Session.fondAvatar == i;
                    return BoutonTactile(
                      onTap: () {
                        Session.fondAvatar = i;
                        Navigator.of(ctx).pop();
                        setState(() {});
                      },
                      child: Container(
                        width: 54,
                        height: 54,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: EcranProfil.fondsAvatar[i],
                          ),
                          shape: BoxShape.circle,
                          border: actif
                              ? Border.all(
                                  color: JegoTheme.texte, width: 2.5)
                              : null,
                        ),
                        child: actif
                            ? const Icon(Icons.check_rounded,
                                color: Colors.white, size: 22)
                            : null,
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _optionPhoto({required IconData icone, required String libelle}) {
    return Opacity(
      opacity: 0.45,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: JegoTheme.champ,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        ),
        child: Row(
          children: [
            Icon(icone, size: 20, color: JegoTheme.texteSecondaire),
            const SizedBox(width: 12),
            Text(
              libelle,
              style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  // -------- Modification des infos --------
  Future<void> _modifierInfos() async {
    final resultat = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: JegoTheme.fondCarte,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _FeuilleEditInfos(),
    );
    if (resultat == true && mounted) setState(() {});
  }

  void _ouvrirAVenir(String titre) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => EcranAVenir(titre: titre)),
    );
  }

  void _deconnexion() {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: JegoTheme.danger.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.logout_rounded,
                    color: JegoTheme.danger, size: 28),
              ),
              const SizedBox(height: 12),
              Text(Strings.t('profil_deconnexion'),
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(
                Strings.t('profil_deconnexion_confirme'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: JegoTheme.texteSecondaire, fontSize: 12.5),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('annuler'),
                            style: const TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        Session.fermer();
                        Navigator.of(ctx).pop();
                      },
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.danger,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('profil_deconnexion'),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nomComplet =
        '${Session.prenom ?? ''} ${Session.nom ?? ''}'.trim();
    final fond = EcranProfil.fondsAvatar[
        Session.fondAvatar.clamp(0, EcranProfil.fondsAvatar.length - 1)];

    return ListView(
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 110),
      children: [
        _enTete(nomComplet, fond),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 0),
          child: Column(
            children: [
              const SizedBox(height: 10),

              // ---- Wallet JEGO ----
              BoutonTactile(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const EcranWallet()),
                ),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [JegoTheme.vert, JegoTheme.vertVif],
                    ),
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.16),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                            Icons.account_balance_wallet_rounded,
                            color: Colors.white,
                            size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Portefeuille JEGO',
                              style: TextStyle(
                                  color: Colors.white.withOpacity(0.9),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            ValueListenableBuilder<int>(
                              valueListenable: WalletStore.solde,
                              builder: (context, solde, _) => Text(
                                '$solde FCFA',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded,
                          color: Colors.white, size: 22),
                    ],
                  ),
                ),
              ).animate(delay: 180.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 14),

              // ---- Mes informations ----
              _bloc(
                titre: 'Mes informations',
                icone: Icons.badge_outlined,
                enfants: [
                  _ligneAction(
                    icone: Icons.person_outline_rounded,
                    libelle: 'Informations personnelles',
                    onTap: _modifierInfos,
                  ),
                  _ligneAction(
                    icone: Icons.credit_card_rounded,
                    libelle: Strings.t('profil_moyens_paiement'),
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranMoyensPaiement())),
                  ),
                  _ligneAction(
                    icone: Icons.location_on_outlined,
                    libelle: 'Adresses enregistrées',
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranAdresses())),
                  ),
                  _ligneAction(
                    icone: Icons.tune_rounded,
                    libelle: 'Préférences de voyage',
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranPreferencesVoyage())),
                  ),
                ],
              ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 14),

              // ---- Mes activites ----
              _bloc(
                titre: 'Mes activités',
                icone: Icons.local_activity_outlined,
                enfants: [
                  _ligneAction(
                    icone: Icons.rate_review_outlined,
                    libelle: 'Mes avis',
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranMesAvis())),
                  ),
                ],
              ).animate(delay: 260.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 14),

              // ---- Aide et support ----
              _bloc(
                titre: Strings.t('profil_aide'),
                icone: Icons.support_agent_rounded,
                enfants: [
                  _ligneAction(
                    icone: Icons.help_outline_rounded,
                    libelle: 'Centre d\'aide',
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranCentreAide())),
                  ),
                  _ligneAction(
                    icone: Icons.chat_bubble_outline_rounded,
                    libelle: 'Nous contacter',
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranNousContacter())),
                  ),
                  _ligneAction(
                    icone: Icons.info_outline_rounded,
                    libelle: 'À propos de JEGO',
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EcranAPropos())),
                  ),
                ],
              ).animate(delay: 320.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 22),

              // ---- Deconnexion : lien texte, pas un bouton plein ----
              BoutonTactile(
                onTap: _deconnexion,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.logout_rounded,
                        color: JegoTheme.danger, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      Strings.t('profil_deconnexion'),
                      style: const TextStyle(
                          color: JegoTheme.danger,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ).animate(delay: 380.ms).fadeIn(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _enTete(String nomComplet, List<Color> fond) {
    return SizedBox(
      height: 344,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: ClipPath(
              clipper: _VagueClipperProfil(),
              child: Container(
                height: 126,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [JegoTheme.texte, JegoTheme.vert],
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: -46,
                      right: -30,
                      child: _tacheDecorative(
                          140, Colors.white.withOpacity(0.07)),
                    ),
                    Positioned(
                      bottom: -60,
                      left: -30,
                      child: _tacheDecorative(
                          120, JegoTheme.vertVif.withOpacity(0.35)),
                    ),
                    Positioned(
                      top: 30,
                      left: 60,
                      child: _tacheDecorative(
                          50, Colors.white.withOpacity(0.05)),
                    ),
                  ],
                ),
              ),
            ).animate().fadeIn(duration: 300.ms),
          ),
          Positioned(
            top: 66,
            left: 0,
            right: 0,
            child: Center(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 112,
                    height: 112,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: fond,
                      ),
                      shape: BoxShape.circle,
                      border: Border.all(color: JegoTheme.fond, width: 4),
                      boxShadow: JegoTheme.ombreDouce,
                    ),
                    child: Text(
                      _initiales,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 40,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: BoutonTactile(
                      onTap: _changerPhoto,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: JegoTheme.fondCarte,
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: JegoTheme.bordCarte, width: 1.5),
                          boxShadow: JegoTheme.ombreDouce,
                        ),
                        child: const Icon(Icons.photo_camera_rounded,
                            size: 17, color: JegoTheme.vert),
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 450.ms).scale(
                begin: const Offset(0.85, 0.85), curve: Curves.easeOutBack),
          ),
          Positioned(
            top: 188,
            left: 0,
            right: 0,
            child: Text(
              nomComplet.isEmpty ? 'JEGO' : nomComplet,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 19,
                  fontWeight: FontWeight.w800),
            ).animate(delay: 100.ms).fadeIn(),
          ),
          if ((Session.email ?? '').isNotEmpty)
            Positioned(
              top: 214,
              left: 0,
              right: 0,
              child: Text(
                Session.email!,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: JegoTheme.texteSecondaire, fontSize: 12.5),
              ).animate(delay: 130.ms).fadeIn(),
            ),
          Positioned(
            top: 240,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: JegoTheme.vert.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified_rounded,
                        size: 14, color: JegoTheme.vert),
                    const SizedBox(width: 5),
                    const Text(
                      'Client vérifié',
                      style: TextStyle(
                          color: JegoTheme.vert,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ).animate(delay: 160.ms).fadeIn(),
          ),
          Positioned(
            top: 270,
            left: 0,
            right: 0,
            child: ValueListenableBuilder<List<Map<String, dynamic>>>(
              valueListenable: BilletsStore.billets,
              builder: (context, billets, _) {
                return Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.stars_rounded,
                          size: 14, color: JegoTheme.etoile),
                      const SizedBox(width: 4),
                      Text(
                        '${_fmtPoints(EcranProfil.pointsJego)} ${Strings.t('profil_points')}',
                        style: const TextStyle(
                            color: JegoTheme.texteSecondaire,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        width: 3,
                        height: 3,
                        decoration: const BoxDecoration(
                            color: JegoTheme.texteTernaire,
                            shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${billets.length} ${Strings.t('profil_voyages_court')}',
                        style: const TextStyle(
                            color: JegoTheme.texteSecondaire,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                );
              },
            ).animate(delay: 190.ms).fadeIn(),
          ),
          Positioned(
            top: 296,
            left: 0,
            right: 0,
            child: Center(
              child: Text(
                '${Strings.t('profil_membre_depuis')} ${FormatDate.moisAnnee(Session.membreDepuis)}',
                style: const TextStyle(
                    color: JegoTheme.texteTernaire,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600),
              ),
            ).animate(delay: 220.ms).fadeIn(),
          ),
        ],
      ),
    );
  }

  Widget _tacheDecorative(double taille, Color couleur) {
    return Container(
      width: taille,
      height: taille,
      decoration: BoxDecoration(shape: BoxShape.circle, color: couleur),
    );
  }

  Widget _bloc({
    required String titre,
    required IconData icone,
    required List<Widget> enfants,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Row(
            children: [
              Icon(icone, size: 14, color: JegoTheme.vert),
              const SizedBox(width: 6),
              Text(
                titre.toUpperCase(),
                style: const TextStyle(
                    color: JegoTheme.vert,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6),
              ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: JegoTheme.fondCarte,
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
            border: Border.all(color: JegoTheme.bordCarte, width: 1),
            boxShadow: JegoTheme.ombreDouce,
          ),
          child: Column(
            children: [
              for (var i = 0; i < enfants.length; i++) ...[
                enfants[i],
                if (i < enfants.length - 1)
                  const Divider(
                      height: 1,
                      indent: 16,
                      endIndent: 16,
                      color: JegoTheme.bordCarte),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _ligneAction({
    required IconData icone,
    required String libelle,
    required VoidCallback onTap,
  }) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        color: Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Icon(icone, size: 19, color: JegoTheme.texteSecondaire),
            const SizedBox(width: 12),
            Expanded(
              child: Text(libelle,
                  style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600)),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: JegoTheme.texteTernaire, size: 20),
          ],
        ),
      ),
    );
  }
}

class _VagueClipperProfil extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final chemin = Path();
    chemin.lineTo(0, size.height - 22);
    chemin.quadraticBezierTo(
        size.width / 2, size.height, size.width, size.height - 22);
    chemin.lineTo(size.width, 0);
    chemin.close();
    return chemin;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
// ---------------------------------------------------------------------------
// FEUILLE D'EDITION : champs pre-remplis, chacun avec son stylo,
// telephone avec indicatif, mot de passe (nouveau + confirmation robuste),
// aucun champ obligatoire, confirmation a la fin.
// ---------------------------------------------------------------------------
class _FeuilleEditInfos extends StatefulWidget {
  const _FeuilleEditInfos();

  @override
  State<_FeuilleEditInfos> createState() => _FeuilleEditInfosState();
}

class _FeuilleEditInfosState extends State<_FeuilleEditInfos> {
  late final TextEditingController _prenom =
      TextEditingController(text: Session.prenom ?? '');
  late final TextEditingController _nom =
      TextEditingController(text: Session.nom ?? '');
  late final TextEditingController _email =
      TextEditingController(text: Session.email ?? '');

  final TextEditingController _ancienMdp = TextEditingController();
  final TextEditingController _mdp = TextEditingController();
  final TextEditingController _mdpConfirme = TextEditingController();

  Pays _pays = PaysTelephone.cameroun;
  late final TextEditingController _tel =
      TextEditingController(text: Session.telephone ?? '');

  String? _champActif;
  String? _erreurMdp;

  @override
  void dispose() {
    _prenom.dispose();
    _nom.dispose();
    _email.dispose();
    _ancienMdp.dispose();
    _mdp.dispose();
    _mdpConfirme.dispose();
    _tel.dispose();
    super.dispose();
  }

  bool _mdpRobuste(String m) {
    if (m.length < 8) return false;
    final aLettre = RegExp(r'[A-Za-z]').hasMatch(m);
    final aChiffre = RegExp(r'\d').hasMatch(m);
    return aLettre && aChiffre;
  }

  void _confirmerEtEnregistrer() {
    final veutChangerMdp = _ancienMdp.text.isNotEmpty ||
        _mdp.text.isNotEmpty ||
        _mdpConfirme.text.isNotEmpty;
    if (veutChangerMdp) {
      if (_ancienMdp.text.isEmpty) {
        setState(() => _erreurMdp = Strings.t('mdp_ancien_requis'));
        return;
      }
      if (Session.motDePasse.isNotEmpty &&
          _ancienMdp.text != Session.motDePasse) {
        setState(() => _erreurMdp = Strings.t('mdp_ancien_faux'));
        return;
      }
      if (!_mdpRobuste(_mdp.text)) {
        setState(() => _erreurMdp = Strings.t('mdp_faible'));
        return;
      }
      if (_mdp.text != _mdpConfirme.text) {
        setState(() => _erreurMdp = Strings.t('mdp_non_identique'));
        return;
      }
    }

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.help_outline_rounded,
                  color: JegoTheme.vert, size: 30),
              const SizedBox(height: 10),
              Text(Strings.t('profil_confirmer_titre'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('annuler'),
                            style: const TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        if (_prenom.text.trim().isNotEmpty) {
                          Session.prenom = _prenom.text.trim();
                        }
                        if (_nom.text.trim().isNotEmpty) {
                          Session.nom = _nom.text.trim();
                        }
                        if (_tel.text.trim().isNotEmpty) {
                          Session.telephone = _tel.text.trim();
                        }
                        if (_email.text.trim().isNotEmpty) {
                          Session.email = _email.text.trim();
                        }
                        if (_mdp.text.isNotEmpty) {
                          Session.motDePasse = _mdp.text;
                        }
                        Navigator.of(ctx).pop();
                        Navigator.of(context).pop(true);
                      },
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.vert,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('appliquer'),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final basClavier = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: basClavier),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: JegoTheme.bordCarte,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  Strings.t('profil_modifier_titre'),
                  style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 16,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                _champEditable(
                  cle: 'prenom',
                  ctrl: _prenom,
                  libelle: Strings.t('champ_prenom'),
                  icone: Icons.badge_rounded,
                ),
                const SizedBox(height: 10),
                _champEditable(
                  cle: 'nom',
                  ctrl: _nom,
                  libelle: Strings.t('champ_nom'),
                  icone: Icons.person_rounded,
                ),
                const SizedBox(height: 10),
                _champTelephone(),
                const SizedBox(height: 10),
                _champEditable(
                  cle: 'email',
                  ctrl: _email,
                  libelle: Strings.t('champ_email'),
                  icone: Icons.mail_rounded,
                  clavier: TextInputType.emailAddress,
                ),
                const SizedBox(height: 10),
                _champMotDePasse(),
                if (_erreurMdp != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        _erreurMdp!,
                        style: const TextStyle(
                            color: JegoTheme.danger,
                            fontSize: 12,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                const SizedBox(height: 18),
                BoutonTactile(
                  onTap: _confirmerEtEnregistrer,
                  child: Container(
                    width: double.infinity,
                    height: 52,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: JegoTheme.vert,
                      borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                      boxShadow: JegoTheme.ombreVerte,
                    ),
                    child: Text(
                      Strings.t('profil_appliquer'),
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

  Widget _champEditable({
    required String cle,
    required TextEditingController ctrl,
    required String libelle,
    required IconData icone,
    TextInputType clavier = TextInputType.text,
  }) {
    final actif = _champActif == cle;
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: actif
            ? Border.all(color: JegoTheme.vert.withOpacity(0.5), width: 1)
            : null,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(icone, size: 18, color: JegoTheme.vert),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: ctrl,
              enabled: actif,
              keyboardType: clavier,
              style: TextStyle(
                color: actif ? JegoTheme.texte : JegoTheme.texteSecondaire,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              cursorColor: JegoTheme.vert,
              decoration: InputDecoration(
                labelText: libelle,
                labelStyle: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 12.5),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
          BoutonTactile(
            onTap: () {
              setState(() {
                _champActif = actif ? null : cle;
                _erreurMdp = null;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(
                actif ? Icons.check_rounded : Icons.edit_rounded,
                size: 17,
                color: JegoTheme.vert,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _champTelephone() {
    final actif = _champActif == 'tel';
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: actif
            ? Border.all(color: JegoTheme.vert.withOpacity(0.5), width: 1)
            : null,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          const Icon(Icons.phone_rounded, size: 18, color: JegoTheme.vert),
          const SizedBox(width: 10),
          BoutonTactile(
            onTap: actif ? _choisirIndicatif : null,
            child: Row(
              children: [
                Text(_pays.drapeau, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 4),
                Text(
                  _pays.indicatif,
                  style: TextStyle(
                    color: actif
                        ? JegoTheme.texte
                        : JegoTheme.texteSecondaire,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _tel,
              enabled: actif,
              keyboardType: TextInputType.phone,
              style: TextStyle(
                color: actif ? JegoTheme.texte : JegoTheme.texteSecondaire,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              cursorColor: JegoTheme.vert,
              decoration: InputDecoration(
                labelText: Strings.t('champ_telephone'),
                labelStyle: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 12.5),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
          BoutonTactile(
            onTap: () {
              setState(() {
                _champActif = actif ? null : 'tel';
                _erreurMdp = null;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(
                actif ? Icons.check_rounded : Icons.edit_rounded,
                size: 17,
                color: JegoTheme.vert,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _choisirIndicatif() {
    showModalBottomSheet(
      context: context,
      backgroundColor: JegoTheme.fondCarte,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: PaysTelephone.liste.map((p) {
                final actif = p.indicatif == _pays.indicatif;
                return BoutonTactile(
                  onTap: () {
                    setState(() => _pays = p);
                    Navigator.of(ctx).pop();
                  },
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: actif
                          ? JegoTheme.vert.withOpacity(0.1)
                          : JegoTheme.champ,
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                    ),
                    child: Row(
                      children: [
                        Text(p.drapeau,
                            style: const TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Text(p.nom,
                            style: TextStyle(
                                color: actif
                                    ? JegoTheme.vert
                                    : JegoTheme.texte,
                                fontSize: 14,
                                fontWeight: FontWeight.w700)),
                        const Spacer(),
                        Text(p.indicatif,
                            style: const TextStyle(
                                color: JegoTheme.texteSecondaire,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _boiteMdp(TextEditingController ctrl, String label, IconData icone) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(icone, size: 18, color: JegoTheme.vert),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: ctrl,
              obscureText: true,
              onChanged: (_) {
                setState(() {
                  if (_erreurMdp != null) _erreurMdp = null;
                });
              },
              style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14,
                  fontWeight: FontWeight.w600),
              cursorColor: JegoTheme.vert,
              decoration: InputDecoration(
                labelText: label,
                labelStyle: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 12.5),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _regleMdp(String texte, bool ok) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(
            ok ? Icons.check_circle_rounded : Icons.circle_outlined,
            size: 14,
            color: ok ? JegoTheme.vert : JegoTheme.texteTernaire,
          ),
          const SizedBox(width: 6),
          Text(
            texte,
            style: TextStyle(
              color: ok ? JegoTheme.vert : JegoTheme.texteTernaire,
              fontSize: 11,
              fontWeight: ok ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _champMotDePasse() {
    final actif = _champActif == 'mdp';
    final m = _mdp.text;
    final okLongueur = m.length >= 8;
    final okLettre = RegExp(r'[A-Za-z]').hasMatch(m);
    final okChiffre = RegExp(r'\d').hasMatch(m);
    final okIdentique =
        m.isNotEmpty && _mdp.text == _mdpConfirme.text;

    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
            border: actif
                ? Border.all(color: JegoTheme.vert.withOpacity(0.5), width: 1)
                : null,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              const Icon(Icons.lock_rounded,
                  size: 18, color: JegoTheme.vert),
              const SizedBox(width: 10),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text(
                    actif
                        ? Strings.t('profil_mot_de_passe')
                        : '${Strings.t('profil_mot_de_passe')} : \u2022\u2022\u2022\u2022\u2022\u2022',
                    style: TextStyle(
                        color: actif
                            ? JegoTheme.texte
                            : JegoTheme.texteSecondaire,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              BoutonTactile(
                onTap: () {
                  setState(() {
                    _champActif = actif ? null : 'mdp';
                    _erreurMdp = null;
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Icon(
                    actif ? Icons.check_rounded : Icons.edit_rounded,
                    size: 17,
                    color: JegoTheme.vert,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (actif) ...[
          const SizedBox(height: 10),
          _boiteMdp(_ancienMdp, Strings.t('profil_ancien_mdp'),
              Icons.lock_clock_rounded),
          const SizedBox(height: 10),
          _boiteMdp(_mdp, Strings.t('profil_nouveau_mdp'),
              Icons.lock_rounded),
          const SizedBox(height: 10),
          _boiteMdp(_mdpConfirme, Strings.t('mdp_confirmer'),
              Icons.lock_outline_rounded),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _regleMdp(Strings.t('mdp_regle_longueur'), okLongueur),
                _regleMdp(Strings.t('mdp_regle_lettre'), okLettre),
                _regleMdp(Strings.t('mdp_regle_chiffre'), okChiffre),
                _regleMdp(Strings.t('mdp_regle_identique'), okIdentique),
              ],
            ),
          ),
        ],
      ],
    );
  }
}