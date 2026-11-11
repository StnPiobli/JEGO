import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/format_date.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/style_jego.dart';
import '../config/api_service.dart';
import '../widgets/champ_telephone.dart';
import '../widgets/drapeau_jego.dart';
import '../config/wallet_store.dart';
import 'connexion_inscription.dart';
import 'ecran_a_venir.dart';
import 'ecran_a_propos.dart';
import 'ecran_centre_aide.dart';
import 'ecran_mes_avis.dart';
import 'ecran_nous_contacter.dart';
import 'ecran_preferences_voyage.dart';
import 'wallet.dart';
import '../widgets/bouton_info.dart';
import '../config/photo_profil.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';

/// Ecran Profil voyageur. Reagit a l'etat de connexion et a la langue.
class EcranProfil extends StatelessWidget {
  const EcranProfil({super.key});

  /// Solde réel de points JEGO, tenu par le serveur.
  static int get pointsJego => Session.pointsFidelite;

  /// Fonds d'avatar JEGO proposes (degrades). Index stocke dans Session.
  static List<List<Color>> fondsAvatar = [
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
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 100),
      child: Column(
        children: [
          EnteteJego(
            titre: Strings.t('profil_titre'),
          ),
          const Spacer(),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: JegoTheme.vert.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.person_rounded,
                size: 52, color: JegoTheme.vert),
          ).animate().scale(
              begin: const Offset(0.6, 0.6),
              duration: 500.ms,
              curve: Curves.easeOutBack),
          const SizedBox(height: 20),
          Text(
            Strings.t('profil_non_connecte_titre'),
            style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 18,
                fontWeight: FontWeight.w800),
          ).animate(delay: 120.ms).fadeIn(),
          const SizedBox(height: 8),
          Text(
            Strings.t('profil_non_connecte_texte'),
            textAlign: TextAlign.center,
            style: TextStyle(
                color: JegoTheme.texteSecondaire,
                fontSize: 13.5,
                height: 1.4),
          ).animate(delay: 180.ms).fadeIn(),
          const SizedBox(height: 24),
          BoutonTactile(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                    builder: (_) => EcranConnexionInscription()),
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
  /// Message d'echec affiche DANS la feuille photo.
  String? _erreurPhoto;

  void _changerPhoto() {
    _erreurPhoto = null;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: JegoTheme.fondCarte,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, majFeuille) => SafeArea(
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
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 16,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                if (_erreurPhoto != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: JegoTheme.danger.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                      border:
                          Border.all(color: JegoTheme.danger.withOpacity(0.35)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.error_outline_rounded,
                            size: 18, color: JegoTheme.danger),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _erreurPhoto!,
                            style: TextStyle(
                                color: JegoTheme.danger,
                                fontSize: 12.5,
                                height: 1.35,
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                _optionPhoto(
                  icone: Icons.photo_library_rounded,
                  libelle: Strings.t('profil_photo_galerie'),
                  onTap: () => _prendrePhoto(ctx, majFeuille, ImageSource.gallery),
                ),
                if (PhotoProfil.appareilDisponible) ...[
                  const SizedBox(height: 8),
                  _optionPhoto(
                    icone: Icons.photo_camera_rounded,
                    libelle: Strings.t('profil_photo_appareil'),
                    onTap: () =>
                        _prendrePhoto(ctx, majFeuille, ImageSource.camera),
                  ),
                ],
                if (PhotoProfil.image.value != null) ...[
                  const SizedBox(height: 8),
                  _optionPhoto(
                    icone: Icons.delete_outline_rounded,
                    libelle: Strings.t('profil_photo_retirer'),
                    onTap: () async {
                      await PhotoProfil.retirer();
                      if (ctx.mounted) Navigator.of(ctx).pop();
                    },
                  ),
                ],
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    Strings.t('profil_photo_fond'),
                    style: TextStyle(
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
      ),
    );
  }

  Widget _optionPhoto({
    required IconData icone,
    required String libelle,
    required VoidCallback onTap,
  }) {
    return BoutonTactile(
      onTap: onTap,
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
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  /// Galerie ou appareil photo. Une feuille refermee sans choisir n'est
  /// pas une erreur : on ne dit quelque chose que si la selection a
  /// echoue pour de bon.
  Future<void> _prendrePhoto(BuildContext feuille,
      void Function(VoidCallback) majFeuille, ImageSource source) async {
    majFeuille(() => _erreurPhoto = null);
    try {
      final choisie = await PhotoProfil.choisir(source);
      if (!feuille.mounted) return;
      if (choisie) Navigator.of(feuille).pop();
    } catch (e) {
      if (!feuille.mounted) return;
      // La cause exacte, pas un message passe-partout : « verifiez vos
      // reglages » n'aide personne quand le vrai probleme est ailleurs.
      majFeuille(() =>
          _erreurPhoto = '${Strings.t('profil_photo_echec')}\n\n$e');
    }
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
      builder: (ctx) => _FeuilleEditInfos(),
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
                child: Icon(Icons.logout_rounded,
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
                style: TextStyle(
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
                            style: TextStyle(
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
                  MaterialPageRoute(builder: (_) => EcranWallet()),
                ),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
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
                          color: JegoTheme.fondCarte.withOpacity(0.16),
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
                titre: Strings.t('mes_informations'),
                icone: Icons.badge_outlined,
                enfants: [
                  _ligneAction(
                    icone: Icons.person_outline_rounded,
                    libelle: Strings.t('infos_personnelles'),
                    onTap: _modifierInfos,
                  ),
                  _ligneAction(
                    icone: Icons.tune_rounded,
                    libelle: Strings.t('preferences_voyage'),
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EcranPreferencesVoyage())),
                  ),
                ],
              ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 14),

              // ---- Mes activites ----
              _bloc(
                titre: Strings.t('mes_activites'),
                icone: Icons.local_activity_outlined,
                enfants: [
                  _ligneAction(
                    icone: Icons.rate_review_outlined,
                    libelle: Strings.t('mes_avis_titre'),
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EcranMesAvis())),
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
                    libelle: Strings.t('aide_titre'),
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EcranCentreAide())),
                  ),
                  _ligneAction(
                    icone: Icons.chat_bubble_outline_rounded,
                    libelle: Strings.t('contact_titre'),
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EcranNousContacter())),
                  ),
                  _ligneAction(
                    icone: Icons.info_outline_rounded,
                    libelle: Strings.t('a_propos'),
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EcranAPropos())),
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
                    Icon(Icons.logout_rounded,
                        color: JegoTheme.danger, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      Strings.t('profil_deconnexion'),
                      style: TextStyle(
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
                decoration: BoxDecoration(
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
                  ValueListenableBuilder<Uint8List?>(
                    valueListenable: PhotoProfil.image,
                    builder: (context, photo, _) => Container(
                      width: 112,
                      height: 112,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: photo == null
                            ? LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: fond,
                              )
                            : null,
                        image: photo == null
                            ? null
                            : DecorationImage(
                                image: MemoryImage(photo),
                                fit: BoxFit.cover,
                              ),
                        shape: BoxShape.circle,
                        border: Border.all(color: JegoTheme.fond, width: 4),
                        boxShadow: JegoTheme.ombreDouce,
                      ),
                      // Les initiales ne servent que faute de photo.
                      child: photo != null
                          ? null
                          : Text(
                              _initiales,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 40,
                                  fontWeight: FontWeight.w800),
                            ),
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
                        child: Icon(Icons.photo_camera_rounded,
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
              style: TextStyle(
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
                    Icon(Icons.verified_rounded,
                        size: 14, color: JegoTheme.vert),
                    const SizedBox(width: 5),
                    Text(
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
                      Icon(Icons.stars_rounded,
                          size: 14, color: JegoTheme.etoile),
                      const SizedBox(width: 4),
                      Text(
                        '${_fmtPoints(EcranProfil.pointsJego)} ${Strings.t('profil_points')}',
                        style: TextStyle(
                            color: JegoTheme.texteSecondaire,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600),
                      ),
                      BoutonInfo(
                        taille: 13,
                        titre: Strings.t('info_points_titre'),
                        texte: Strings.t('info_points_texte'),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        width: 3,
                        height: 3,
                        decoration: BoxDecoration(
                            color: JegoTheme.texteTernaire,
                            shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${billets.length} ${Strings.t('profil_voyages_court')}',
                        style: TextStyle(
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
                style: TextStyle(
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
                style: TextStyle(
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
                  Divider(
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
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600)),
            ),
            Icon(Icons.chevron_right_rounded,
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
// FEUILLE D'EDITION DU PROFIL
//
// Tout est modifiable d'emblee : l'ancienne version ouvrait un champ a
// la fois derriere un stylo, et cocher ce stylo ressemblait a « valider
// ce champ » alors que rien n'etait enregistre.
//
// L'enregistrement passe par le serveur (PUT /api/voyageurs/profil).
// Auparavant la feuille ecrivait dans `Session` et se refermait : la
// modification ne partait pas, et ne survivait meme pas au redemarrage.
//
// Le mot de passe a sa propre route, qui verifie l'ancien mot de passe
// cote serveur. Le controle se faisait ici, contre un champ jamais
// renseigne a la connexion — il ne s'executait donc jamais.
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

  // Le pays vient du numero stocke : un numero francais ouvrait la
  // fiche avec le drapeau camerounais et le mauvais indicatif.
  Pays _pays = PaysTelephone.separer(Session.telephone ?? '').$1;
  late final TextEditingController _tel = TextEditingController(
      text: PaysTelephone.grouper(
          PaysTelephone.separer(Session.telephone ?? '').$2));

  final TextEditingController _ancienMdp = TextEditingController();
  final TextEditingController _mdp = TextEditingController();
  final TextEditingController _mdpConfirme = TextEditingController();

  bool _sectionMdp = false;
  bool _envoi = false;

  /// `null` tant que le serveur n'a pas repondu. On n'affiche alors ni
  /// le bouton ni la note : mieux vaut ne rien montrer une fraction de
  /// seconde que proposer un changement impossible, ou l'inverse.
  bool? _aMotDePasse;

  /// Erreurs posees sous le champ concerne. Le serveur sait des choses
  /// que l'application ignore (email deja pris, nom change il y a moins
  /// de six mois) : ses refus doivent atterrir au bon endroit, pas dans
  /// un message general que personne ne relie a son champ.
  final Map<String, String> _erreurs = {};
  String? _erreurGenerale;

  @override
  void initState() {
    super.initState();
    // Le bouton d'enregistrement s'active des qu'une valeur bouge.
    for (final c in [_prenom, _nom, _email, _tel, _ancienMdp, _mdp,
        _mdpConfirme]) {
      c.addListener(_surSaisie);
    }
    _lireProfil();
  }

  /// Demande au serveur si ce compte possede un mot de passe. En cas
  /// d'echec on suppose que oui : le serveur refusera proprement, ce qui
  /// vaut mieux que priver quelqu'un de la fonction sur un incident
  /// reseau.
  Future<void> _lireProfil() async {
    try {
      final v = await ApiService.monProfil();
      if (!mounted) return;
      setState(() => _aMotDePasse = v['a_mot_de_passe'] != false);
    } catch (_) {
      if (!mounted) return;
      setState(() => _aMotDePasse = true);
    }
  }

  void _surSaisie() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    for (final c in [_prenom, _nom, _email, _tel, _ancienMdp, _mdp,
        _mdpConfirme]) {
      c.removeListener(_surSaisie);
      c.dispose();
    }
    super.dispose();
  }

  // ── Etat de la saisie ────────────────────────────────────────────

  String get _telCanonique => PaysTelephone.composer(_pays, _tel.text);

  bool get _infosModifiees =>
      _prenom.text.trim() != (Session.prenom ?? '') ||
      _nom.text.trim() != (Session.nom ?? '') ||
      _email.text.trim() != (Session.email ?? '') ||
      _telCanonique != (Session.telephone ?? '');

  bool get _mdpRempli =>
      _ancienMdp.text.isNotEmpty ||
      _mdp.text.isNotEmpty ||
      _mdpConfirme.text.isNotEmpty;

  bool get _peutEnregistrer =>
      !_envoi && (_infosModifiees || _mdpRempli);

  // ── Verifications faites sur l'appareil ──────────────────────────
  //
  // Elles evitent un aller-retour reseau pour des fautes evidentes.
  // Elles ne remplacent pas le serveur : unicite, anciennete du dernier
  // changement de nom et mot de passe actuel restent de son ressort.

  bool _verifier() {
    _erreurs.clear();
    _erreurGenerale = null;

    if (_prenom.text.trim().isEmpty) {
      _erreurs['prenom'] = Strings.t('profil_champ_vide');
    }
    if (_nom.text.trim().isEmpty) {
      _erreurs['nom'] = Strings.t('profil_champ_vide');
    }
    final email = _email.text.trim();
    if (email.isEmpty) {
      _erreurs['email'] = Strings.t('profil_champ_vide');
    } else if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      _erreurs['email'] = Strings.t('profil_email_invalide');
    }
    if (!PaysTelephone.valide(_pays, _tel.text)) {
      _erreurs['tel'] = Strings.t('profil_tel_invalide');
    }

    if (_mdpRempli) {
      if (_ancienMdp.text.isEmpty) {
        _erreurs['ancien_mdp'] = Strings.t('mdp_ancien_requis');
      }
      if (!_mdpRobuste(_mdp.text)) {
        _erreurs['mdp'] = Strings.t('mdp_faible');
      }
      if (_mdp.text != _mdpConfirme.text) {
        _erreurs['mdp_confirme'] = Strings.t('mdp_non_identique');
      }
    }

    setState(() {});
    return _erreurs.isEmpty;
  }

  bool _mdpRobuste(String m) =>
      m.length >= 8 &&
      RegExp(r'[A-Za-z]').hasMatch(m) &&
      RegExp(r'\d').hasMatch(m);

  /// Range un refus du serveur sous le champ qu'il concerne.
  void _placerErreurServeur(String message) {
    final m = message.toLowerCase();
    if (m.contains('email')) {
      _erreurs['email'] = message;
    } else if (m.contains('numéro') || m.contains('numero')) {
      _erreurs['tel'] = message;
    } else if (m.contains('nom')) {
      _erreurs['nom'] = message;
    } else {
      _erreurGenerale = message;
    }
  }

  // ── Enregistrement ───────────────────────────────────────────────

  Future<void> _enregistrer() async {
    if (!_verifier()) return;
    setState(() => _envoi = true);

    try {
      if (_infosModifiees) {
        // On n'envoie que ce qui a change : le serveur limite le
        // changement de nom a une fois par semestre, reexpedier un nom
        // identique n'a pas a declencher ce refus.
        final champs = <String, dynamic>{};
        if (_prenom.text.trim() != (Session.prenom ?? '')) {
          champs['prenom'] = _prenom.text.trim();
        }
        if (_nom.text.trim() != (Session.nom ?? '')) {
          champs['nom'] = _nom.text.trim();
        }
        if (_email.text.trim() != (Session.email ?? '')) {
          champs['email'] = _email.text.trim();
        }
        if (_telCanonique != (Session.telephone ?? '')) {
          champs['telephone'] = _telCanonique;
        }

        final v = await ApiService.modifierProfil(champs);
        // Le serveur renvoie le profil retenu : c'est lui qui fait foi,
        // pas ce que l'on croit avoir envoye.
        Session.majProfil(
          pNom: '${v['nom'] ?? Session.nom ?? ''}',
          pPrenom: '${v['prenom'] ?? Session.prenom ?? ''}',
          pEmail: '${v['email'] ?? Session.email ?? ''}',
          pTelephone: '${v['telephone'] ?? Session.telephone ?? ''}',
        );
      }

      if (_mdpRempli) {
        await ApiService.changerMotDePasse(
          ancien: _ancienMdp.text,
          nouveau: _mdp.text,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() {
        _envoi = false;
        // Un refus sur le mot de passe ne doit pas se ranger sous le
        // champ « nom » au pretexte que le message contient ce mot.
        if (_mdpRempli && e.message.toLowerCase().contains('mot de passe')) {
          _erreurs['ancien_mdp'] = e.message;
        } else {
          _placerErreurServeur(e.message);
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _envoi = false;
        _erreurGenerale = Strings.t('erreur_reseau');
      });
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────

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
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: JegoTheme.bordCarte,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  Strings.t('profil_modifier_titre'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 16,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  Strings.t('profil_sous_titre'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: JegoTheme.texteSecondaire,
                      fontSize: 12,
                      height: 1.35),
                ),
                const SizedBox(height: 16),

                if (_erreurGenerale != null) ...[
                  _bandeauErreur(_erreurGenerale!),
                  const SizedBox(height: 12),
                ],

                _champ(
                  cle: 'prenom',
                  ctrl: _prenom,
                  libelle: Strings.t('champ_prenom'),
                  icone: Icons.badge_rounded,
                  capitalisation: TextCapitalization.words,
                ),
                const SizedBox(height: 10),
                _champ(
                  cle: 'nom',
                  ctrl: _nom,
                  libelle: Strings.t('champ_nom'),
                  icone: Icons.person_rounded,
                  capitalisation: TextCapitalization.words,
                ),
                // La regle des six mois est annoncee ici, pas
                // decouverte au refus du serveur : la personne peut
                // encore renoncer avant d'y toucher.
                const SizedBox(height: 8),
                _note(Strings.t('profil_regle_nom')),
                const SizedBox(height: 10),
                _champTelephone(),
                const SizedBox(height: 10),
                _champ(
                  cle: 'email',
                  ctrl: _email,
                  libelle: Strings.t('champ_email'),
                  icone: Icons.mail_rounded,
                  clavier: TextInputType.emailAddress,
                ),

                const SizedBox(height: 18),
                _sectionMotDePasse(),

                const SizedBox(height: 20),
                _boutonEnregistrer(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _bandeauErreur(String texte) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: JegoTheme.danger.withOpacity(0.10),
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: Border.all(color: JegoTheme.danger.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline_rounded,
              size: 17, color: JegoTheme.danger),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              texte,
              style: TextStyle(
                  color: JegoTheme.danger,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  /// Note explicative sous un groupe de champs.
  Widget _note(String texte) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.info_outline_rounded,
            size: 14, color: JegoTheme.texteTernaire),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            texte,
            style: TextStyle(
                color: JegoTheme.texteTernaire,
                fontSize: 11.5,
                height: 1.35,
                fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }

  Widget _sousErreur(String? texte) {
    if (texte == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 5, left: 6),
      child: Text(
        texte,
        style: TextStyle(
            color: JegoTheme.danger,
            fontSize: 11.5,
            fontWeight: FontWeight.w600),
      ),
    );
  }

  /// Cadre commun a tous les champs. Le filet devient rouge quand le
  /// champ porte une erreur : la couleur dit lequel avant meme de lire.
  BoxDecoration _cadre(String cle) {
    final enErreur = _erreurs[cle] != null;
    return BoxDecoration(
      color: JegoTheme.champ,
      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      border: Border.all(
        color: enErreur
            ? JegoTheme.danger.withOpacity(0.55)
            : JegoTheme.bordCarte,
        width: 1,
      ),
    );
  }

  Widget _champ({
    required String cle,
    required TextEditingController ctrl,
    required String libelle,
    required IconData icone,
    TextInputType clavier = TextInputType.text,
    TextCapitalization capitalisation = TextCapitalization.none,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: _cadre(cle),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Icon(icone, size: 18, color: JegoTheme.vert),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: ctrl,
                  keyboardType: clavier,
                  textCapitalization: capitalisation,
                  enabled: !_envoi,
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 14,
                      fontWeight: FontWeight.w600),
                  cursorColor: JegoTheme.vert,
                  decoration: InputDecoration(
                    labelText: libelle,
                    labelStyle: TextStyle(
                        color: JegoTheme.texteTernaire, fontSize: 12.5),
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ),
        _sousErreur(_erreurs[cle]),
      ],
    );
  }

  Widget _champTelephone() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: _cadre('tel'),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Icon(Icons.phone_rounded, size: 18, color: JegoTheme.vert),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _tel,
                  keyboardType: TextInputType.phone,
                  enabled: !_envoi,
                  inputFormatters: [FormateurTelephone(_pays.longueur)],
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 14,
                      fontWeight: FontWeight.w600),
                  cursorColor: JegoTheme.vert,
                  decoration: InputDecoration(
                    labelText: Strings.t('champ_telephone'),
                    labelStyle: TextStyle(
                        color: JegoTheme.texteTernaire, fontSize: 12.5),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    // Le libelle reste en haut, sinon le prefixe ne
                    // s'affiche qu'une fois le champ actif.
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                    // Drapeau et indicatif en `prefix` : Material les pose
                    // sur la ligne de texte. Places a cote du champ, ils
                    // se centraient sur toute sa hauteur, libelle compris,
                    // et surmontaient le numero d'un demi-cran.
                    prefix: BoutonTactile(
                      onTap: _envoi ? null : _choisirIndicatif,
                      child: Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            DrapeauJego(_pays.code, largeur: 22),
                            const SizedBox(width: 6),
                            Text(
                              _pays.indicatif,
                              style: TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        _sousErreur(_erreurs['tel']),
      ],
    );
  }

  Widget _sectionMotDePasse() {
    // Reponse pas encore arrivee.
    if (_aMotDePasse == null) return const SizedBox.shrink();

    // Compte Google : on l'explique au lieu d'offrir un bouton qui ne
    // pourrait que echouer.
    if (_aMotDePasse == false) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
        decoration: BoxDecoration(
          color: JegoTheme.champ,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          border: Border.all(color: JegoTheme.bordCarte, width: 1),
        ),
        child: Row(
          children: [
            Icon(Icons.verified_user_outlined,
                size: 18, color: JegoTheme.texteTernaire),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                Strings.t('profil_compte_google'),
                style: TextStyle(
                    color: JegoTheme.texteSecondaire,
                    fontSize: 12,
                    height: 1.35,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
    }

    if (!_sectionMdp) {
      return BoutonTactile(
        onTap: () => setState(() => _sectionMdp = true),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
            border: Border.all(color: JegoTheme.bordCarte, width: 1),
          ),
          child: Row(
            children: [
              Icon(Icons.lock_rounded, size: 18, color: JegoTheme.vert),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  Strings.t('profil_changer_mdp'),
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700),
                ),
              ),
              Icon(Icons.chevron_right_rounded,
                  size: 20, color: JegoTheme.texteTernaire),
            ],
          ),
        ),
      );
    }

    final m = _mdp.text;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(Icons.lock_rounded, size: 17, color: JegoTheme.vert),
            const SizedBox(width: 8),
            Text(
              Strings.t('profil_mot_de_passe'),
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 13,
                  fontWeight: FontWeight.w800),
            ),
            const Spacer(),
            BoutonTactile(
              onTap: () => setState(() {
                _sectionMdp = false;
                _ancienMdp.clear();
                _mdp.clear();
                _mdpConfirme.clear();
                _erreurs.remove('ancien_mdp');
                _erreurs.remove('mdp');
                _erreurs.remove('mdp_confirme');
              }),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Text(
                  Strings.t('annuler'),
                  style: TextStyle(
                      color: JegoTheme.texteSecondaire,
                      fontSize: 12,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _champMdp('ancien_mdp', _ancienMdp, Strings.t('profil_ancien_mdp'),
            Icons.lock_clock_rounded),
        const SizedBox(height: 10),
        _champMdp('mdp', _mdp, Strings.t('profil_nouveau_mdp'),
            Icons.lock_rounded),
        const SizedBox(height: 10),
        _champMdp('mdp_confirme', _mdpConfirme, Strings.t('mdp_confirmer'),
            Icons.lock_outline_rounded),
        const SizedBox(height: 10),
        _regleMdp(Strings.t('mdp_regle_longueur'), m.length >= 8),
        _regleMdp(Strings.t('mdp_regle_lettre'),
            RegExp(r'[A-Za-z]').hasMatch(m)),
        _regleMdp(Strings.t('mdp_regle_chiffre'), RegExp(r'\d').hasMatch(m)),
        _regleMdp(Strings.t('mdp_regle_identique'),
            m.isNotEmpty && m == _mdpConfirme.text),
      ],
    );
  }

  Widget _champMdp(String cle, TextEditingController ctrl, String libelle,
      IconData icone) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: _cadre(cle),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Icon(icone, size: 18, color: JegoTheme.vert),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: ctrl,
                  obscureText: true,
                  enabled: !_envoi,
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 14,
                      fontWeight: FontWeight.w600),
                  cursorColor: JegoTheme.vert,
                  decoration: InputDecoration(
                    labelText: libelle,
                    labelStyle: TextStyle(
                        color: JegoTheme.texteTernaire, fontSize: 12.5),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ),
        _sousErreur(_erreurs[cle]),
      ],
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

  /// Le bouton dit ce qui va se passer : gris tant que rien n'a bouge,
  /// vert des qu'il y a quelque chose a enregistrer. L'ancienne version
  /// restait toujours active et ouvrait une confirmation, meme quand
  /// elle n'avait rien a enregistrer.
  Widget _boutonEnregistrer() {
    final actif = _peutEnregistrer;
    return BoutonTactile(
      onTap: actif ? _enregistrer : null,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: actif ? JegoTheme.vert : JegoTheme.champ,
          borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
          boxShadow: actif ? JegoTheme.ombreVerte : null,
        ),
        child: _envoi
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    Strings.t('profil_enregistrement'),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w800),
                  ),
                ],
              )
            : Text(
                actif
                    ? Strings.t('profil_enregistrer')
                    : Strings.t('profil_rien_change'),
                style: TextStyle(
                    color: actif ? Colors.white : JegoTheme.texteTernaire,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800),
              ),
      ),
    );
  }

  void _choisirIndicatif() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => FeuilleJego(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              Strings.t('choisir_indicatif'),
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 15,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            ...PaysTelephone.liste.map((p) {
              final actif = p.indicatif == _pays.indicatif;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: BoutonTactile(
                  onTap: () {
                    setState(() => _pays = p);
                    Navigator.of(ctx).pop();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 13),
                    decoration: BoxDecoration(
                      color: actif
                          ? JegoTheme.vert.withOpacity(0.10)
                          : JegoTheme.champ,
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                      border: Border.all(
                        color: actif
                            ? JegoTheme.vert.withOpacity(0.45)
                            : Colors.transparent,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        DrapeauJego(p.code, largeur: 26),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            p.nom,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: JegoTheme.texte,
                                fontSize: 14,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                        Text(
                          p.indicatif,
                          style: TextStyle(
                              color: actif
                                  ? JegoTheme.vert
                                  : JegoTheme.texteSecondaire,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800),
                        ),
                        if (actif) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.check_rounded,
                              size: 17, color: JegoTheme.vert),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
