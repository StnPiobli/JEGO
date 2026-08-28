import 'package:flutter/material.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../screens/conditions_utilisation.dart';
import '../screens/ecran_confidentialite.dart';
import '../screens/ecran_politique_confidentialite.dart';
import '../screens/ecran_securite.dart';
import '../screens/ecran_theme.dart';
import '../screens/ecran_verif_maj.dart';

/// Panneau lateral (Drawer), ouvert via le hamburger de l'accueil.
/// Reprend l'interface "Parametres" de la maquette fournie. Seuls Langue
/// et les interrupteurs de notifications sont reellement fonctionnels ;
/// le reste (Securite, Confidentialite, Theme, Devise, Unites, CGU,
/// Politique, Mises a jour) est visuel pour l'instant, aucun ecran derriere.
class PanneauParametres extends StatefulWidget {
  const PanneauParametres({super.key});

  @override
  State<PanneauParametres> createState() => _PanneauParametresState();
}

class _PanneauParametresState extends State<PanneauParametres> {

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: JegoTheme.fond,
      width: MediaQuery.of(context).size.width * 0.86,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 4),
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
                      child: Icon(Icons.close_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    Strings.t('param_titre'),
                    style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
                children: [
                  _titreSection(Strings.t('param_compte')),
                  _carteSection([
                    _ligne(Icons.lock_outline_rounded,
                        Strings.t('param_securite'), onTap: () {
                      Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => EcranSecurite()));
                    }),
                    _ligne(Icons.shield_outlined,
                        Strings.t('param_confidentialite'), onTap: () {
                      Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => EcranConfidentialite()));
                    }),
                  ]),
                  const SizedBox(height: 22),
                  _titreSection(Strings.t('param_preferences')),
                  _carteSection([
                    _ligneLangue(),
                    // La valeur affichée suit le réglage réel : elle
                    // annonçait « Clair » en dur, même une fois le
                    // sombre choisi.
                    _ligneValeur(
                        Icons.dark_mode_outlined,
                        Strings.t('param_theme'),
                        Strings.t('theme_' + (modeTheme.value == 'systeme' ? 'systeme' : (modeSombre.value ? 'sombre' : 'clair'))),
                        onTap: () async {
                      await Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => EcranTheme()));
                      if (mounted) setState(() {});
                    }),
                  ]),
                  const SizedBox(height: 22),
                  _titreSection(Strings.t('param_autres')),
                  _carteSection([
                    _ligne(Icons.info_outline_rounded, Strings.t('cgu_titre'),
                        onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) =>
                                EcranConditionsUtilisation()),
                      );
                    }),
                    _ligne(Icons.description_outlined,
                        Strings.t('param_politique_confidentialite'), onTap: () {
                      Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => EcranPolitiqueConfidentialite()));
                    }),
                    _ligneValeur(Icons.refresh_rounded,
                        Strings.t('param_verifier_maj'), 'v1.0.0', onTap: () {
                      Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => EcranVerifMaj()));
                    }),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _titreSection(String titre) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        titre,
        style: TextStyle(
          color: JegoTheme.vert,
          fontSize: 13,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _carteSection(List<Widget> lignes) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte),
      ),
      child: Column(
        children: [
          for (var i = 0; i < lignes.length; i++) ...[
            lignes[i],
            if (i < lignes.length - 1)
              Divider(height: 1, color: JegoTheme.bordCarte),
          ],
        ],
      ),
    );
  }

  Widget _ligne(IconData icone, String libelle, {VoidCallback? onTap}) {
    return BoutonTactile(
      onTap: onTap ?? () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Icon(icone, size: 19, color: JegoTheme.texteSecondaire),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                libelle,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: JegoTheme.texte,
                ),
              ),
            ),
            Icon(Icons.chevron_right_rounded,
                size: 18, color: JegoTheme.texteTernaire),
          ],
        ),
      ),
    );
  }

  Widget _ligneValeur(IconData icone, String libelle, String valeur,
      {VoidCallback? onTap}) {
    return BoutonTactile(
      onTap: onTap ?? () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Icon(icone, size: 19, color: JegoTheme.texteSecondaire),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                libelle,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: JegoTheme.texte,
                ),
              ),
            ),
            Text(
              valeur,
              style: TextStyle(
                fontSize: 12.5,
                color: JegoTheme.texteSecondaire,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right_rounded,
                size: 18, color: JegoTheme.texteTernaire),
          ],
        ),
      ),
    );
  }

  /// Ligne Langue : ouvre un Dialog centre coherent avec le style JEGO
  /// (au lieu du PopupMenuButton Material generique, mal positionne et
  /// hors palette).
  Widget _ligneLangue() {
    return BoutonTactile(
      onTap: _choisirLangue,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Icon(Icons.language_rounded,
                size: 19, color: JegoTheme.texteSecondaire),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                Strings.t('profil_langue'),
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: JegoTheme.texte,
                ),
              ),
            ),
            Text(
              langueCourante.value == 'fr'
                  ? Strings.t('langue_fr')
                  : Strings.t('langue_en'),
              style: TextStyle(
                fontSize: 12.5,
                color: JegoTheme.texteSecondaire,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right_rounded,
                size: 18, color: JegoTheme.texteTernaire),
          ],
        ),
      ),
    );
  }

  Future<void> _choisirLangue() async {
    final code = await showDialog<String>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.language_rounded,
                  color: JegoTheme.vert, size: 32),
              const SizedBox(height: 10),
              Text(
                Strings.t('param_choisir_langue'),
                style: const TextStyle(
                    fontSize: 15.5, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              _optionLangue(ctx, 'fr', Strings.t('langue_fr')),
              const SizedBox(height: 8),
              _optionLangue(ctx, 'en', Strings.t('langue_en')),
            ],
          ),
        ),
      ),
    );

    if (code != null) {
      setState(() => langueCourante.value = code);
    }
  }

  Widget _optionLangue(BuildContext dialogContext, String code, String libelle) {
    final actif = langueCourante.value == code;
    return BoutonTactile(
      onTap: () => Navigator.of(dialogContext).pop(code),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: actif ? JegoTheme.vert.withOpacity(0.08) : JegoTheme.champ,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          border: Border.all(
              color: actif ? JegoTheme.vert : JegoTheme.bordCarte,
              width: actif ? 1.4 : 1),
        ),
        child: Row(
          children: [
            Icon(
              actif ? Icons.check_circle_rounded : Icons.circle_outlined,
              size: 20,
              color: actif ? JegoTheme.vert : JegoTheme.texteTernaire,
            ),
            const SizedBox(width: 12),
            Text(
              libelle,
              style: TextStyle(
                fontSize: 14,
                fontWeight: actif ? FontWeight.w800 : FontWeight.w600,
                color: JegoTheme.texte,
              ),
            ),
          ],
        ),
      ),
    );
  }

}