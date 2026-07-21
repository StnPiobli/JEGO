import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import 'connexion_inscription.dart';
import 'conditions_utilisation.dart';

/// Ecran Profil voyageur. Reagit a l'etat de connexion (Session.connecte).
/// Non connecte -> invitation a se connecter. Connecte -> carte points JEGO,
/// stats, informations, parametres, deconnexion.
class EcranProfil extends StatelessWidget {
  const EcranProfil({super.key});

  /// Points JEGO en demo. Au branchement : viendra du backend (solde reel).
  static const int pointsDemo = 1200;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        bottom: false,
        child: ValueListenableBuilder<bool>(
          valueListenable: Session.connecte,
          builder: (context, connecte, _) {
            if (!connecte) return const _ProfilNonConnecte();
            return const _ProfilConnecte();
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// ETAT NON CONNECTE
// ---------------------------------------------------------------------------
class _ProfilNonConnecte extends StatelessWidget {
  const _ProfilNonConnecte();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 100),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 8, top: 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                Strings.t('profil_titre'),
                style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
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
                color: JegoTheme.texteSecondaire, fontSize: 13.5, height: 1.4),
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
// ETAT CONNECTE
// ---------------------------------------------------------------------------
class _ProfilConnecte extends StatelessWidget {
  const _ProfilConnecte();

  String get _initiales {
    final p = (Session.prenom ?? '').trim();
    final n = (Session.nom ?? '').trim();
    final a = p.isNotEmpty ? p[0] : '';
    final b = n.isNotEmpty ? n[0] : '';
    final r = '$a$b'.toUpperCase();
    return r.isEmpty ? 'JG' : r;
  }

  void _deconnexion(BuildContext context) {
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
              Text(
                Strings.t('profil_deconnexion'),
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w800),
              ),
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
                        child: Text(
                          Strings.t('annuler'),
                          style: const TextStyle(
                              color: JegoTheme.texte,
                              fontWeight: FontWeight.w700),
                        ),
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
                        child: Text(
                          Strings.t('profil_deconnexion'),
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800),
                        ),
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

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 110),
      children: [
        Text(
          Strings.t('profil_titre'),
          style: const TextStyle(
            color: JegoTheme.texte,
            fontSize: 24,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 16),

        // ---- Photo + nom + carte points JEGO ----
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: JegoTheme.fondCarte,
            borderRadius: BorderRadius.circular(JegoTheme.rGrand),
            border: Border.all(color: JegoTheme.bordCarte, width: 1),
            boxShadow: JegoTheme.ombreDouce,
          ),
          child: Column(
            children: [
              // Photo (initiales) au centre
              Container(
                width: 80,
                height: 80,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [JegoTheme.vertVif, JegoTheme.vert],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: JegoTheme.ombreVerte,
                ),
                child: Text(
                  _initiales,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                nomComplet.isEmpty ? 'JEGO' : nomComplet,
                style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 14),
              // Carte points JEGO (dore premium)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF7E7BE), Color(0xFFEFD79A)],
                  ),
                  borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.55),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.stars_rounded,
                          color: Color(0xFFC79218), size: 24),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${EcranProfil.pointsDemo}',
                          style: const TextStyle(
                            color: Color(0xFF7A5A12),
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            height: 1,
                          ),
                        ),
                        Text(
                          Strings.t('profil_points'),
                          style: const TextStyle(
                            color: Color(0xFF9A7420),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                Strings.t('profil_pts_expli'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 11),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 450.ms).slideY(begin: 0.12),

        const SizedBox(height: 14),

        // ---- Stats (voyages, note donnee) ----
        ValueListenableBuilder<List<Map<String, dynamic>>>(
          valueListenable: BilletsStore.billets,
          builder: (context, billets, _) {
            return Row(
              children: [
                Expanded(
                  child: _statCarte(
                    icone: Icons.confirmation_number_rounded,
                    valeur: '${billets.length}',
                    libelle: Strings.t('profil_voyages'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCarte(
                    icone: Icons.star_rounded,
                    valeur: billets.isEmpty ? '\u2013' : '4.5',
                    libelle: Strings.t('profil_note_moyenne'),
                    couleurIcone: JegoTheme.etoile,
                  ),
                ),
              ],
            );
          },
        ).animate(delay: 120.ms).fadeIn().slideY(begin: 0.12),

        const SizedBox(height: 14),

        // ---- Mes informations ----
        _bloc(
          titre: Strings.t('profil_infos'),
          enfants: [
            _ligneInfo(Icons.phone_rounded, Strings.t('profil_telephone'),
                Session.telephone ?? '\u2013'),
            _ligneInfo(Icons.mail_rounded, Strings.t('profil_email'),
                Session.email ?? '\u2013'),
          ],
        ).animate(delay: 180.ms).fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 14),

        // ---- Parametres / actions ----
        _bloc(
          titre: Strings.t('profil_parametres'),
          enfants: [
            _ligneAction(
              context,
              icone: Icons.language_rounded,
              libelle: Strings.t('profil_langue'),
              valeur: langueCourante.value == 'en'
                  ? Strings.t('langue_en')
                  : Strings.t('langue_fr'),
              onTap: () => _choisirLangue(context),
            ),
            _ligneAction(
              context,
              icone: Icons.history_rounded,
              libelle: Strings.t('profil_historique'),
              onTap: () {
                // A construire : ecran historique detaille
              },
            ),
            _ligneAction(
              context,
              icone: Icons.credit_card_rounded,
              libelle: Strings.t('profil_moyens_paiement'),
              onTap: () {
                // A construire : moyens de paiement Mobile Money
              },
            ),
            _ligneAction(
              context,
              icone: Icons.help_outline_rounded,
              libelle: Strings.t('profil_aide'),
              onTap: () {
                // A construire : ecran aide / support
              },
            ),
            _ligneAction(
              context,
              icone: Icons.description_rounded,
              libelle: Strings.t('profil_conditions'),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (_) => const EcranConditionsUtilisation()),
                );
              },
              dernier: true,
            ),
          ],
        ).animate(delay: 240.ms).fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 14),

        // ---- Deconnexion ----
        BoutonTactile(
          onTap: () => _deconnexion(context),
          child: Container(
            width: double.infinity,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: JegoTheme.danger.withOpacity(0.08),
              borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
              border: Border.all(
                  color: JegoTheme.danger.withOpacity(0.25), width: 1),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.logout_rounded,
                    color: JegoTheme.danger, size: 19),
                const SizedBox(width: 8),
                Text(
                  Strings.t('profil_deconnexion'),
                  style: const TextStyle(
                    color: JegoTheme.danger,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ).animate(delay: 300.ms).fadeIn(),

        const SizedBox(height: 16),
        Center(
          child: Text(
            Strings.t('support_tel'),
            style: const TextStyle(
                color: JegoTheme.texteTernaire, fontSize: 11.5),
          ),
        ),
      ],
    );
  }

  void _choisirLangue(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: JegoTheme.fondCarte,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
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
              _optionLangue(ctx, 'fr', Strings.t('langue_fr')),
              const SizedBox(height: 8),
              _optionLangue(ctx, 'en', Strings.t('langue_en')),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _optionLangue(BuildContext ctx, String code, String libelle) {
    final actif = langueCourante.value == code;
    return BoutonTactile(
      onTap: () {
        langueCourante.value = code;
        Navigator.of(ctx).pop();
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: actif ? JegoTheme.vert.withOpacity(0.1) : JegoTheme.champ,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          border: actif
              ? Border.all(color: JegoTheme.vert.withOpacity(0.4), width: 1)
              : null,
        ),
        child: Row(
          children: [
            Text(
              libelle,
              style: TextStyle(
                color: actif ? JegoTheme.vert : JegoTheme.texte,
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            if (actif)
              const Icon(Icons.check_circle_rounded,
                  color: JegoTheme.vert, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _statCarte({
    required IconData icone,
    required String valeur,
    required String libelle,
    Color couleurIcone = JegoTheme.vert,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icone, size: 22, color: couleurIcone),
          const SizedBox(height: 10),
          Text(
            valeur,
            style: const TextStyle(
              color: JegoTheme.texte,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            libelle,
            style: const TextStyle(
                color: JegoTheme.texteSecondaire, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _bloc({required String titre, required List<Widget> enfants}) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Text(
              titre,
              style: const TextStyle(
                color: JegoTheme.texteSecondaire,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          ...enfants,
          const SizedBox(height: 6),
        ],
      ),
    );
  }

  Widget _ligneInfo(IconData icone, String libelle, String valeur) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(icone, size: 18, color: JegoTheme.texteSecondaire),
          const SizedBox(width: 12),
          Text(
            libelle,
            style: const TextStyle(
                color: JegoTheme.texteSecondaire, fontSize: 13),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              valeur,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: JegoTheme.texte,
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _ligneAction(
    BuildContext context, {
    required IconData icone,
    required String libelle,
    String? valeur,
    required VoidCallback onTap,
    bool dernier = false,
  }) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        color: Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            Icon(icone, size: 19, color: JegoTheme.vert),
            const SizedBox(width: 12),
            Text(
              libelle,
              style: const TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14,
                  fontWeight: FontWeight.w600),
            ),
            const Spacer(),
            if (valeur != null)
              Text(
                valeur,
                style: const TextStyle(
                    color: JegoTheme.texteSecondaire, fontSize: 13),
              ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded,
                color: JegoTheme.texteTernaire, size: 22),
          ],
        ),
      ),
    );
  }
}