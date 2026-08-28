import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../config/format_date.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../config/nature_trajet.dart';

/// Ticket JEGO : rendu billet reel (encoches laterales + ligne perforee),
/// villes en grand, dates lisibles, toutes les infos + frais souscrits,
/// numero de reservation, QR agrandissable, icone bus.
class BilletCarre extends StatelessWidget {
  final String? etiquette;
  final String villeDepart;
  final String villeArrivee;
  final String date;
  final Map<String, dynamic> offre;
  final List<String> sieges;
  final bool auto;
  final bool detaille; // affiche frais + toutes infos (onglet Billets)
  final VoidCallback? onTelecharger;
  final VoidCallback? onPartager;
  final bool chargementPdf;

  const BilletCarre({
    super.key,
    this.etiquette,
    required this.villeDepart,
    required this.villeArrivee,
    required this.date,
    required this.offre,
    required this.sieges,
    this.auto = false,
    this.detaille = false,
    this.onTelecharger,
    this.onPartager,
    this.chargementPdf = false,
  });

  @override
  Widget build(BuildContext context) {
    final codeQr = offre['code_qr'] ?? '${offre['id']}-${sieges.join('')}';
    final numResa = offre['num_resa'] ?? '';

    return PhysicalShape(
      clipper: _TicketClipper(),
      color: JegoTheme.fondCarte,
      elevation: 0,
      shadowColor: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          boxShadow: JegoTheme.ombreDouce,
        ),
        child: ClipPath(
          clipper: _TicketClipper(),
          child: Container(
            color: JegoTheme.fondCarte,
            child: Column(
              children: [
                // --- Partie haute ---
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: JegoTheme.vert,
                              borderRadius:
                                  BorderRadius.circular(JegoTheme.rPetit),
                            ),
                            child: const Icon(
                                Icons.directions_bus_rounded,
                                color: Colors.white,
                                size: 20),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'JEGO',
                            style: TextStyle(
                              color: JegoTheme.texte,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const Spacer(),
                          if (etiquette != null)
                            Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: JegoTheme.vert.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(
                                    JegoTheme.rGrand),
                              ),
                              child: Text(
                                etiquette!,
                                style: TextStyle(
                                    color: JegoTheme.vert,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800),
                              ),
                            ),
                          if (onTelecharger != null || onPartager != null)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (onTelecharger != null)
                                  GestureDetector(
                                    onTap:
                                        chargementPdf ? null : onTelecharger,
                                    child: Container(
                                      width: 30,
                                      height: 30,
                                      margin: const EdgeInsets.only(left: 6),
                                      decoration: BoxDecoration(
                                        color: JegoTheme.vert
                                            .withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: chargementPdf
                                          ? Padding(
                                              padding: EdgeInsets.all(7),
                                              child:
                                                  CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: JegoTheme.vert,
                                              ),
                                            )
                                          : Icon(
                                              Icons.picture_as_pdf_rounded,
                                              size: 15,
                                              color: JegoTheme.vert,
                                            ),
                                    ),
                                  ),
                                if (onPartager != null)
                                  GestureDetector(
                                    onTap: chargementPdf ? null : onPartager,
                                    child: Container(
                                      width: 30,
                                      height: 30,
                                      margin: const EdgeInsets.only(left: 6),
                                      decoration: BoxDecoration(
                                        color: JegoTheme.champ,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: JegoTheme.bordCarte),
                                      ),
                                      child: Icon(
                                        Icons.ios_share_rounded,
                                        size: 14,
                                        color: JegoTheme.texteSecondaire,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.calendar_month_rounded,
                              size: 15, color: JegoTheme.texteSecondaire),
                          const SizedBox(width: 6),
                          Text(
                            FormatDate.lisible(date),
                            style: TextStyle(
                                color: JegoTheme.texteSecondaire,
                                fontSize: 13,
                                fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(villeDepart,
                                    style: TextStyle(
                                        color: JegoTheme.texte,
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800)),
                                Text(
                                  '${offre['point_depart']} · ${offre['heure_depart']}',
                                  style: TextStyle(
                                      color: JegoTheme.texteTernaire,
                                      fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8),
                            child: Icon(Icons.directions_bus_rounded,
                                color: JegoTheme.vert, size: 22),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(villeArrivee,
                                    style: TextStyle(
                                        color: JegoTheme.texte,
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800)),
                                Text(
                                  '${offre['point_arrivee']} · ${offre['heure_arrivee']}',
                                  style: TextStyle(
                                      color: JegoTheme.texteTernaire,
                                      fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // --- Ligne perforee ---
                _LignePointillee(),
                // --- Partie basse : QR + infos ---
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () => _agrandirQr(context, codeQr),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(
                                    JegoTheme.rPetit),
                                border: Border.all(
                                    color: JegoTheme.bordCarte, width: 1),
                              ),
                              child: Column(
                                children: [
                                  // VRAI QR code, réellement scannable
                                  // par le chauffeur : il encode la
                                  // chaîne signée par le serveur.
                                  QrImageView(
                                    data: '$codeQr',
                                    version: QrVersions.auto,
                                    size: 84,
                                    backgroundColor: Colors.white,
                                    eyeStyle: const QrEyeStyle(
                                        eyeShape: QrEyeShape.square,
                                        color: Colors.black),
                                    dataModuleStyle: const QrDataModuleStyle(
                                        dataModuleShape:
                                            QrDataModuleShape.square,
                                        color: Colors.black),
                                    errorCorrectionLevel: QrErrorCorrectLevel.M,
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                          Icons.zoom_out_map_rounded,
                                          size: 11,
                                          color:
                                              JegoTheme.texteTernaire),
                                      const SizedBox(width: 3),
                                      Text(
                                        Strings.t('billet_agrandir'),
                                        style: TextStyle(
                                            color:
                                                JegoTheme.texteTernaire,
                                            fontSize: 9.5),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                               _info(Strings.t('billet_agence'),
                                    '${offre['nom_agence']}'),
                                const SizedBox(height: 6),
                                _info(Strings.t('confirm_sieges'),
                                    sieges.join(', '),
                                    icone: Icons.event_seat_rounded),
                                if (auto)
                                  Padding(
                                    padding:
                                        const EdgeInsets.only(top: 2),
                                    child: Text(
                                      Strings.t('confirm_auto_revele'),
                                      style: TextStyle(
                                          color:
                                              JegoTheme.texteTernaire,
                                          fontSize: 10),
                                    ),
                                  ),
                                if (offre['total_personnes'] != null &&
                                    (offre['total_personnes'] as int) >
                                        1) ...[
                                  const SizedBox(height: 6),
                                  _info(
                                      '${Strings.t('billet_personne')} ${offre['personne']}/${offre['total_personnes']}',
                                      '',
                                      icone: Icons.person_rounded),
                                ],
                                if (offre['flexible'] == true) ...[
                                  const SizedBox(height: 6),
                                  _info(
                                      Strings.t('opt_billet_flexible'),
                                      '',
                                      icone: Icons
                                          .published_with_changes_rounded),
                                ],
                                if (offre['cadeau'] == true) ...[
                                  const SizedBox(height: 6),
                                  _info(
                                      '${Strings.t('billet_offert_a')} ${offre['cadeau_nom']}',
                                      '',
                                      icone: Icons.card_giftcard_rounded),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Numero de reservation
                      if (numResa.toString().isNotEmpty) ...[
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
                            children: [
                              Icon(Icons.confirmation_number_rounded,
                                  size: 16,
                                  color: JegoTheme.texteSecondaire),
                              const SizedBox(width: 8),
                              Text(
                                Strings.t('billet_num_resa'),
                                style: TextStyle(
                                    color: JegoTheme.texteSecondaire,
                                    fontSize: 11.5),
                              ),
                              const Spacer(),
                              SelectableText(
                                '$numResa',
                                style: TextStyle(
                                    color: JegoTheme.texte,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1),
                              ),
                            ],
                          ),
                        ),
                      ],
                      // Equipements du trajet (onglet Billets detaille)
                      if (detaille) ...[
                        const SizedBox(height: 12),
                        _blocEquipements(),
                      ],
                      // Frais souscrits (onglet Billets detaille)
                      if (detaille) ...[
                        const SizedBox(height: 12),
                        _blocFrais(),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _info(String libelle, String valeur, {IconData? icone}) {
    return Row(
      children: [
        if (icone != null) ...[
          Icon(icone, size: 14, color: JegoTheme.vert),
          const SizedBox(width: 5),
        ],
        Flexible(
          child: Text(
            valeur.isEmpty ? libelle : '$libelle $valeur',
            style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 12.5,
                fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  IconData _iconeEq(String eq) {
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

  String _libEq(String eq) {
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

  Widget _blocEquipements() {
    final eqs = (offre['equipements'] as List?) ?? [];
    final cat = NatureTrajet.etiquettes(offre).join(' · ');
    final arrets = (offre['arrets_liste'] as List?) ?? [];
    if (eqs.isEmpty && cat.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            Strings.t('billet_infos_trajet'),
            style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 12.5,
                fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          if (cat.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Icon(Icons.style_rounded,
                      size: 14, color: JegoTheme.vert),
                  const SizedBox(width: 6),
                  Text('${Strings.t('categorie')} : $cat',
                      style: TextStyle(
                          color: JegoTheme.texteSecondaire,
                          fontSize: 12)),
                ],
              ),
            ),
          if (arrets.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.alt_route_rounded,
                      size: 14, color: JegoTheme.vert),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                        '${Strings.t('arrets_label')} ${arrets.join(', ')}',
                        style: TextStyle(
                            color: JegoTheme.texteSecondaire,
                            fontSize: 12)),
                  ),
                ],
              ),
            ),
          if (eqs.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: eqs.map<Widget>((e) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: JegoTheme.fondCarte,
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                    border:
                        Border.all(color: JegoTheme.bordCarte, width: 1),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_iconeEq('$e'), size: 13, color: JegoTheme.vert),
                      const SizedBox(width: 5),
                      Text(_libEq('$e'),
                          style: TextStyle(
                              color: JegoTheme.texteSecondaire,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _blocFrais() {
    final frais = (offre['frais'] as List?) ?? [];
    if (frais.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            Strings.t('billet_frais_titre'),
            style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 12.5,
                fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          ...frais.map((f) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Icon(Icons.check_circle_rounded,
                        size: 13, color: JegoTheme.vert),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text('${f['libelle']}',
                          style: TextStyle(
                              color: JegoTheme.texteSecondaire,
                              fontSize: 12)),
                    ),
                    Text('${f['montant']}',
                        style: TextStyle(
                            color: JegoTheme.texte,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                  ],
                ),
              )),
          Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Divider(height: 1, color: JegoTheme.bordCarte),
          ),
          Row(
            children: [
              Text(Strings.t('total'),
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 13,
                      fontWeight: FontWeight.w800)),
              const Spacer(),
              Text('${offre['total'] ?? ''} FCFA',
                  style: TextStyle(
                      color: JegoTheme.vert,
                      fontSize: 14,
                      fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    );
  }

  void _agrandirQr(BuildContext context, String code) {
    // RAPPEL : sur telephone, monter la luminosite ici (screen_brightness).
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.85),
      builder: (ctx) => GestureDetector(
        onTap: () => Navigator.of(ctx).pop(),
        child: Container(
          alignment: Alignment.center,
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(JegoTheme.rGrand),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                QrImageView(
                  data: code,
                  version: QrVersions.auto,
                  size: 260,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square, color: Colors.black),
                  dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: Colors.black),
                  // Correction haute : un écran rayé ou peu lumineux
                  // reste lisible par le scanner du chauffeur.
                  errorCorrectionLevel: QrErrorCorrectLevel.H,
                ),
                const SizedBox(height: 16),
                // Couleurs fixes : le cadre est blanc en permanence,
                // les gris du theme sombre y seraient illisibles.
                Text(Strings.t('billet_qr_presenter'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: Color(0xFF444B47), fontSize: 13)),
                const SizedBox(height: 8),
                Text(Strings.t('billet_fermer'),
                    style: const TextStyle(
                        color: Color(0xFF8A918C), fontSize: 11)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Decoupe le ticket : deux encoches laterales au niveau de la perforation.
class _TicketClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    const r = JegoTheme.rGrand;
    const encoche = 12.0;
    final yPerfo = size.height * 0.52;
    final path = Path();
    path.moveTo(r, 0);
    path.lineTo(size.width - r, 0);
    path.arcToPoint(Offset(size.width, r),
        radius: const Radius.circular(r));
    path.lineTo(size.width, yPerfo - encoche);
    path.arcToPoint(Offset(size.width, yPerfo + encoche),
        radius: const Radius.circular(encoche), clockwise: false);
    path.lineTo(size.width, size.height - r);
    path.arcToPoint(Offset(size.width - r, size.height),
        radius: const Radius.circular(r));
    path.lineTo(r, size.height);
    path.arcToPoint(Offset(0, size.height - r),
        radius: const Radius.circular(r));
    path.lineTo(0, yPerfo + encoche);
    path.arcToPoint(Offset(0, yPerfo - encoche),
        radius: const Radius.circular(encoche), clockwise: false);
    path.lineTo(0, r);
    path.arcToPoint(const Offset(r, 0), radius: const Radius.circular(r));
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

class _LignePointillee extends StatelessWidget {
  const _LignePointillee();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: LayoutBuilder(
        builder: (context, c) {
          final n = (c.maxWidth / 12).floor();
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(
              n,
              (_) => Container(
                width: 6,
                height: 1.5,
                color: JegoTheme.bordCarte,
              ),
            ),
          );
        },
      ),
    );
  }
}

