import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import 'connexion_inscription.dart';
import 'profil_agence.dart';
import 'selection_siege.dart';

/// Page Informations du voyage. Mode : 'simple' | 'aller' | 'retour'.
class EcranDetailTrajet extends StatelessWidget {
  final Map<String, dynamic> offre;
  final String mode;
  final int passagers;
  final String villeDepart;
  final String villeArrivee;
  final String date;
  final Map<String, dynamic>? offreAller;
  final String dateAller;

  const EcranDetailTrajet({
    super.key,
    required this.offre,
    required this.mode,
    required this.passagers,
    required this.villeDepart,
    required this.villeArrivee,
    required this.date,
    this.offreAller,
    this.dateAller = '',
  });

  String get _libelleBouton {
    switch (mode) {
      case 'aller':
        return Strings.t('reserver_retour');
      case 'retour':
        return Strings.t('reserver_trajets');
      default:
        return Strings.t('reserver');
    }
  }

  Future<void> _action(BuildContext context) async {
    if (mode == 'aller') {
      Navigator.of(context).pop('choisir_retour');
      return;
    }
    if (!Session.connecte.value) {
      final ok = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const EcranConnexionInscription()),
      );
      if (ok != true) return;
    }
    if (!context.mounted) return;
    if (mode == 'retour' && offreAller != null) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EcranSelectionSiege(
            offre: offreAller!,
            passagers: passagers,
            etiquette: Strings.t('resultats_aller'),
            offreSuivante: offre,
            villeDepart: villeArrivee,
            villeArrivee: villeDepart,
            dateAller: dateAller,
            dateRetour: date,
          ),
        ),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EcranSelectionSiege(
            offre: offre,
            passagers: passagers,
            villeDepart: villeDepart,
            villeArrivee: villeArrivee,
            dateAller: date,
          ),
        ),
      );
    }
  }

  IconData _iconeEquipement(String eq) {
    switch (eq) {
      case 'clim':
        return Icons.ac_unit_rounded;
      case 'toilettes':
        return Icons.wc_rounded;
      case 'usb':
        return Icons.usb_rounded;
      case 'wifi':
        return Icons.wifi_rounded;
      case 'inclinables':
        return Icons.airline_seat_recline_extra_rounded;
      default:
        return Icons.check_rounded;
    }
  }

  String _libelleEquipement(String eq) {
    switch (eq) {
      case 'clim':
        return Strings.t('eq_clim');
      case 'toilettes':
        return Strings.t('eq_toilettes');
      case 'usb':
        return Strings.t('eq_usb');
      case 'wifi':
        return Strings.t('eq_wifi');
      case 'inclinables':
        return Strings.t('eq_inclinables');
      default:
        return eq;
    }
  }

  @override
  Widget build(BuildContext context) {
    final equipements = (offre['equipements'] as List?) ?? [];
    final arrets = (offre['arrets_liste'] as List?) ?? [];
    final nbArrets = offre['nombre_arrets'] ?? 0;
    final prix = offre['prix'] as int;
    final prixPremium = offre['prix_siege_premium'] ?? 0;
    final total = prix * passagers;

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
                        border:
                            Border.all(color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    Strings.t('detail_titre'),
                    style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  if (mode != 'simple')
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: JegoTheme.vert.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                      ),
                      child: Text(
                        mode == 'aller'
                            ? Strings.t('resultats_aller')
                            : Strings.t('resultats_retour'),
                        style: const TextStyle(
                          color: JegoTheme.vert,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 6, 18, 20),
                children: [
                  if (mode == 'retour' && offreAller != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: JegoTheme.vert.withOpacity(0.08),
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                          border: Border.all(
                              color: JegoTheme.vert.withOpacity(0.3),
                              width: 0.8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle_rounded,
                                size: 16, color: JegoTheme.vert),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${Strings.t('voyage_aller_label')} $dateAller · ${offreAller!['heure_depart']}',
                                style: const TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(duration: 350.ms),
                  _carte(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _villePoint(villeDepart,
                                  '${offre['point_depart']}',
                                  CrossAxisAlignment.start),
                            ),
                            Column(
                              children: [
                                const Icon(Icons.arrow_forward_rounded,
                                    color: JegoTheme.vert, size: 20),
                                const SizedBox(height: 2),
                                Text(
                                  nbArrets == 0
                                      ? Strings.t('trajet_direct')
                                      : '$nbArrets ${Strings.t('arrets')}',
                                  style: const TextStyle(
                                      color: JegoTheme.texteTernaire,
                                      fontSize: 10.5),
                                ),
                              ],
                            ),
                            Expanded(
                              child: _villePoint(villeArrivee,
                                  '${offre['point_arrivee']}',
                                  CrossAxisAlignment.end),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: JegoTheme.champ,
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rPetit),
                          ),
                          child: Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              _infoMini(Icons.calendar_month_rounded, date),
                              _infoMini(Icons.schedule_rounded,
                                  '${offre['heure_depart']} → ${offre['heure_arrivee']}'),
                              _infoMini(Icons.style_rounded,
                                  '${offre['categorie']}'),
                            ],
                          ),
                        ),
                        if (arrets.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.alt_route_rounded,
                                  size: 15,
                                  color: JegoTheme.texteSecondaire),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${Strings.t('arrets_label')} ${arrets.join(', ')}',
                                  style: const TextStyle(
                                    color: JegoTheme.texteSecondaire,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1),
                  const SizedBox(height: 12),
                  _carte(
                    child: BoutonTactile(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => EcranProfilAgence(
                                agenceId: offre['agence_id'] as int),
                          ),
                        );
                      },
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
                            child: const Icon(Icons.directions_bus_rounded,
                                color: JegoTheme.vert, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${offre['nom_agence']}',
                                  style: const TextStyle(
                                    color: JegoTheme.texte,
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded,
                                        size: 15, color: JegoTheme.etoile),
                                    Text(
                                      ' ${offre['note_moyenne']} · ${Strings.t('voir_avis')}',
                                      style: const TextStyle(
                                          color: JegoTheme.texteSecondaire,
                                          fontSize: 12),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded,
                              color: JegoTheme.texteTernaire),
                        ],
                      ),
                    ),
                  )
                      .animate(delay: 120.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.1),
                  const SizedBox(height: 12),
                  if (equipements.isNotEmpty)
                    _carte(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _titreBloc(Strings.t('equipements')),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: equipements.map<Widget>((e) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: JegoTheme.champ,
                                  borderRadius: BorderRadius.circular(
                                      JegoTheme.rGrand),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(_iconeEquipement('$e'),
                                        size: 15, color: JegoTheme.vert),
                                    const SizedBox(width: 6),
                                    Text(
                                      _libelleEquipement('$e'),
                                      style: const TextStyle(
                                        color: JegoTheme.texteSecondaire,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    )
                        .animate(delay: 180.ms)
                        .fadeIn(duration: 400.ms)
                        .slideY(begin: 0.1),
                  const SizedBox(height: 12),
                  _carte(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _titreBloc(Strings.t('options_payantes')),
                        const SizedBox(height: 4),
                        _ligneOption(Icons.event_seat_rounded,
                            Strings.t('opt_siege_premium'),
                            '+$prixPremium FCFA'),
                        _ligneOption(
                            Icons.published_with_changes_rounded,
                            Strings.t('opt_billet_flexible'),
                            '+${(prix * 0.10).round()} FCFA'),
                        _ligneOption(Icons.luggage_rounded,
                            Strings.t('opt_bagage'),
                            Strings.t('opt_selon_agence')),
                        const SizedBox(height: 4),
                        Text(
                          Strings.t('options_note'),
                          style: const TextStyle(
                              color: JegoTheme.texteTernaire, fontSize: 11),
                        ),
                      ],
                    ),
                  )
                      .animate(delay: 240.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.1),
                  const SizedBox(height: 12),
                  _carte(
                    child: Column(
                      children: [
                        _lignePrix(
                            '${Strings.t('prix_billet')} × $passagers',
                            '${prix * passagers} FCFA',
                            gras: false),
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Divider(
                              height: 1, color: JegoTheme.bordCarte),
                        ),
                        _lignePrix(Strings.t('total'), '$total FCFA',
                            gras: true),
                      ],
                    ),
                  )
                      .animate(delay: 300.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.1),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 16),
              child: BoutonTactile(
                onTap: () => _action(context),
                child: Container(
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _libelleBouton,
                        style: const TextStyle(
                          color: JegoTheme.surVert,
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded,
                          color: JegoTheme.surVert, size: 20),
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

  Widget _carte({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: child,
    );
  }

  Widget _titreBloc(String texte) {
    return Text(
      texte,
      style: const TextStyle(
        color: JegoTheme.texte,
        fontSize: 13.5,
        fontWeight: FontWeight.w800,
      ),
    );
  }

  Widget _villePoint(
      String ville, String point, CrossAxisAlignment alignement) {
    return Column(
      crossAxisAlignment: alignement,
      children: [
        Text(
          ville,
          style: const TextStyle(
            color: JegoTheme.texte,
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.location_on_rounded,
                size: 12, color: JegoTheme.vert),
            const SizedBox(width: 2),
            Text(
              point,
              style: const TextStyle(
                color: JegoTheme.texteSecondaire,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _infoMini(IconData icone, String texte) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icone, size: 14, color: JegoTheme.texteSecondaire),
        const SizedBox(width: 4),
        Text(
          texte,
          style: const TextStyle(
            color: JegoTheme.texte,
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _ligneOption(IconData icone, String libelle, String prix) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icone, size: 17, color: JegoTheme.texteSecondaire),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              libelle,
              style:
                  const TextStyle(color: JegoTheme.texte, fontSize: 12.5),
            ),
          ),
          Text(
            prix,
            style: const TextStyle(
              color: JegoTheme.vert,
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _lignePrix(String libelle, String valeur, {required bool gras}) {
    return Row(
      children: [
        Text(
          libelle,
          style: TextStyle(
            color: gras ? JegoTheme.texte : JegoTheme.texteSecondaire,
            fontSize: gras ? 15 : 13,
            fontWeight: gras ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          valeur,
          style: TextStyle(
            color: gras ? JegoTheme.vert : JegoTheme.texte,
            fontSize: gras ? 17 : 13.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}