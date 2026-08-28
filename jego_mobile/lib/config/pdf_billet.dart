import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'session.dart';

/// Genere le PDF premium du billet JEGO, sur le modele "carte de voyage"
/// fourni par l'utilisateur : carte trajet (avec filigrane JEGO repete) +
/// QR, carte details trajet, carte passager, carte paiement, carte infos
/// importantes, banniere de confiance, pied de page.
///
/// DONNEES DEMO SANS SOURCE REELLE (a corriger au branchement backend,
/// affichees normalement dans le PDF mais marquees ici explicitement) :
/// - "Piece d'identite" : aucune collecte reelle n'existe encore cote
///   inscription/profil -- affiche "Non renseignee" plutot qu'un faux
///   numero invente.
/// - "Methode de paiement" : fixee a "Mobile Money", aucun suivi reel
///   par transaction n'existe encore.
///
/// La fleche/separateur de trajet utilise "»" (U+00BB) et non "->"
/// (U+2192) : la police de base du PDF (Helvetica) ne supporte pas cette
/// fleche Unicode et l'affichait en glyphe manquant.
Future<Uint8List> genererPdfBillet(Map<String, dynamic> billet) async {
  final doc = pw.Document();

  final vert = PdfColor.fromInt(0xFF0B9E63);
  final vertVif = PdfColor.fromInt(0xFF10C97A);
  final vertFonce = PdfColor.fromInt(0xFF14201A);
  final gris = PdfColor.fromInt(0xFF64746C);
  final grisClair = PdfColor.fromInt(0xFFE7ECE8);

  final frais = (billet['frais'] as List?) ?? [];
  final sieges = (billet['sieges'] as List?)?.join(', ') ?? '';
  final totalPersonnes = billet['total_personnes'] ?? billet['personne'] ?? 1;

  // Le titulaire vient du billet quand il est connu (billet recupere
  // au nom d'un autre), sinon de la session pour ses propres billets.
  final passagerBillet =
      '${billet['passager_prenom'] ?? ''} ${billet['passager_nom'] ?? ''}'.trim();
  final nomPassager = passagerBillet.isNotEmpty
      ? passagerBillet
      : '${Session.prenom ?? ''} ${Session.nom ?? ''}'.trim();
  final telPassager =
      '${billet['passager_tel'] ?? ''}'.isNotEmpty
          ? '${billet['passager_tel']}'
          : (Session.telephone ?? '');
  final emailPassager =
      '${billet['passager_email'] ?? ''}'.isNotEmpty
          ? '${billet['passager_email']}'
          : (Session.email ?? '');

  String duree = '';
  int minutesTotal = 0;
  try {
    final dep = '${billet['heure_depart']}'.split(':');
    final arr = '${billet['heure_arrivee']}'.split(':');
    var mDep = int.parse(dep[0]) * 60 + int.parse(dep[1]);
    var mArr = int.parse(arr[0]) * 60 + int.parse(arr[1]);
    if (mArr < mDep) mArr += 24 * 60; // trajet passant minuit
    minutesTotal = mArr - mDep;
    duree =
        '${minutesTotal ~/ 60}h ${(minutesTotal % 60).toString().padLeft(2, '0')}min';
  } catch (_) {
    duree = '-';
  }

  // DEMO : aucune collecte de piece d'identite n'existe encore cote
  // inscription/profil.
  const pieceIdentite = 'Non renseignee';

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(28),
      build: (context) => [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text('JEGO',
                style: pw.TextStyle(
                    fontSize: 22,
                    fontWeight: pw.FontWeight.bold,
                    color: vertFonce)),
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text('VOTRE BILLET',
                    style: pw.TextStyle(
                        fontSize: 11,
                        fontWeight: pw.FontWeight.bold,
                        color: vert,
                        letterSpacing: 0.6)),
                pw.Text('Merci de voyager avec JEGO',
                    style: pw.TextStyle(fontSize: 8.5, color: gris)),
              ],
            ),
          ],
        ),
        pw.SizedBox(height: 12),
        pw.Divider(color: grisClair, height: 1),
        pw.SizedBox(height: 16),

        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Expanded(
              flex: 3,
              child: pw.Container(
                decoration: pw.BoxDecoration(
                  gradient: pw.LinearGradient(
                    colors: [vertFonce, vert, vertVif],
                    begin: pw.Alignment.topLeft,
                    end: pw.Alignment.bottomRight,
                  ),
                  borderRadius: pw.BorderRadius.circular(14),
                ),
                child: pw.ClipRRect(
                  horizontalRadius: 14,
                  verticalRadius: 14,
                  child: pw.Stack(
                    children: [
                      pw.Positioned.fill(
                        child: pw.Opacity(
                          opacity: 0.09,
                          child: pw.Wrap(
                            spacing: 14,
                            runSpacing: 18,
                            children: List.generate(
                              14,
                              (i) => pw.Transform.rotate(
                                angle: 0.4,
                                child: pw.Text(
                                  'JEGO',
                                  style: pw.TextStyle(
                                      fontSize: 16,
                                      fontWeight: pw.FontWeight.bold,
                                      color: PdfColors.white),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(20),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              '${billet['ville_depart']}  »  ${billet['ville_arrivee']}',
                              style: pw.TextStyle(
                                  color: PdfColors.white,
                                  fontSize: 19,
                                  fontWeight: pw.FontWeight.bold),
                            ),
                            pw.SizedBox(height: 12),
                            _ligneBlanche('${billet['date']}'),
                            _ligneBlanche('${billet['heure_depart']}'),
                            if (sieges.isNotEmpty)
                              _ligneBlanche('Siege $sieges'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            pw.SizedBox(width: 14),
            pw.Expanded(
              flex: 2,
              child: pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: PdfColors.white,
                  borderRadius: pw.BorderRadius.circular(14),
                  border: pw.Border.all(color: grisClair),
                ),
                child: pw.Column(
                  children: [
                    pw.Text('CODE DE RESERVATION',
                        textAlign: pw.TextAlign.center,
                        style: pw.TextStyle(
                            fontSize: 8,
                            fontWeight: pw.FontWeight.bold,
                            color: gris,
                            letterSpacing: 0.5)),
                    pw.SizedBox(height: 4),
                    pw.Text('${billet['num_resa'] ?? ''}',
                        textAlign: pw.TextAlign.center,
                        style: pw.TextStyle(
                            fontSize: 13,
                            fontWeight: pw.FontWeight.bold,
                            color: vert)),
                    pw.SizedBox(height: 10),
                    pw.BarcodeWidget(
                      barcode: pw.Barcode.qrCode(),
                      data:
                          '${billet['code_qr'] ?? billet['num_resa'] ?? ''}',
                      width: 88,
                      height: 88,
                      color: vertFonce,
                    ),
                    pw.SizedBox(height: 8),
                    pw.Text(
                      'Presentez ce QR code ou le code de reservation a l\'embarquement',
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(fontSize: 6.5, color: gris),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),

        pw.SizedBox(height: 16),

        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Expanded(
              child: _carte(
                titre: 'DETAILS DU TRAJET',
                vertFonce: vertFonce,
                vert: vert,
                grisClair: grisClair,
                enfant: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    _pointTrajet(
                        '${billet['ville_depart']}',
                        '${billet['point_depart'] ?? ''}',
                        '${billet['heure_depart']}',
                        vert,
                        estDepart: true),
                    pw.Padding(
                      padding: const pw.EdgeInsets.only(left: 3.5),
                      child: pw.Container(width: 1, height: 16, color: vert),
                    ),
                    _pointTrajet(
                        '${billet['ville_arrivee']}',
                        '${billet['point_arrivee'] ?? ''}',
                        '${billet['heure_arrivee']}',
                        vert,
                        estDepart: false),
                    pw.SizedBox(height: 6),
                    pw.Divider(color: grisClair, height: 1),
                    pw.SizedBox(height: 8),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        _mini('Duree', duree, gris, vertFonce),
                        _mini('Agence', '${billet['nom_agence']}', gris,
                            vertFonce),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            pw.SizedBox(width: 14),
            pw.Expanded(
              child: _carte(
                titre: 'PASSAGER',
                vertFonce: vertFonce,
                vert: vert,
                grisClair: grisClair,
                enfant: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    _ligne('Nom', nomPassager.isEmpty ? '-' : nomPassager,
                        gris, vertFonce, vert),
                    _ligne('Telephone',
                        telPassager.isEmpty ? '-' : telPassager, gris,
                        vertFonce, vert),
                    _ligne('Email',
                        emailPassager.isEmpty ? '-' : emailPassager, gris,
                        vertFonce, vert),
                    _ligne('Piece d\'identite', pieceIdentite, gris,
                        vertFonce, vert),
                    _ligne('Passagers', '$totalPersonnes', gris, vertFonce,
                        vert,
                        dernier: true),
                  ],
                ),
              ),
            ),
          ],
        ),

        pw.SizedBox(height: 14),

        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Expanded(
              child: _carte(
                titre: 'DETAILS DU PAIEMENT',
                vertFonce: vertFonce,
                vert: vert,
                grisClair: grisClair,
                enfant: pw.Column(
                  children: [
                    ...frais.map((f) => pw.Padding(
                          padding:
                              const pw.EdgeInsets.symmetric(vertical: 4),
                          child: pw.Row(
                            mainAxisAlignment:
                                pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('${f['libelle']}',
                                  style: pw.TextStyle(
                                      fontSize: 9.5, color: gris)),
                              pw.Text('${f['montant']}',
                                  style: pw.TextStyle(
                                      fontSize: 9.5, color: vertFonce)),
                            ],
                          ),
                        )),
                    pw.Divider(color: grisClair, height: 14),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('TOTAL PAYE',
                            style: pw.TextStyle(
                                fontSize: 10.5,
                                fontWeight: pw.FontWeight.bold,
                                color: vertFonce)),
                        pw.Text('${billet['total']} FCFA',
                            style: pw.TextStyle(
                                fontSize: 13,
                                fontWeight: pw.FontWeight.bold,
                                color: vert)),
                      ],
                    ),
                    pw.SizedBox(height: 8),
                    // DEMO : methode de paiement non tracee reellement
                    // par transaction -- valeur fixe en attendant le
                    // branchement backend.
                    _ligne('Methode', 'Mobile Money', gris, vertFonce,
                        vert),
                  ],
                ),
              ),
            ),
            pw.SizedBox(width: 14),
            pw.Expanded(
              child: _carte(
                titre: 'INFORMATIONS IMPORTANTES',
                vertFonce: vertFonce,
                vert: vert,
                grisClair: grisClair,
                enfant: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    _puce(
                        'Presentez ce billet (QR code ou code de reservation) a l\'embarquement.',
                        gris,
                        vert),
                    _puce(
                        'Arrivez a la gare au moins 30 minutes avant le depart.',
                        gris,
                        vert),
                    _puce('Ce billet est personnel et non transferable.',
                        gris, vert),
                    _puce(
                        'Besoin d\'aide ? Contactez-nous depuis l\'application.',
                        gris,
                        vert),
                  ],
                ),
              ),
            ),
          ],
        ),

        pw.SizedBox(height: 16),

        pw.Container(
          padding: const pw.EdgeInsets.all(16),
          decoration: pw.BoxDecoration(
            color: PdfColor.fromInt(0xFFE3F5EC),
            borderRadius: pw.BorderRadius.circular(12),
          ),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('Voyagez en toute confiance avec JEGO',
                  style: pw.TextStyle(
                      fontSize: 10.5,
                      fontWeight: pw.FontWeight.bold,
                      color: vertFonce)),
              pw.Text('Securite, fiabilite et confort a chaque trajet.',
                  style: pw.TextStyle(fontSize: 8.5, color: gris)),
            ],
          ),
        ),

        pw.SizedBox(height: 16),
        pw.Divider(color: grisClair, height: 1),
        pw.SizedBox(height: 10),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('Merci d\'avoir choisi JEGO. Bon voyage !',
                style: pw.TextStyle(fontSize: 8, color: gris)),
            pw.Row(
              children: [
                pw.Text('www.jego.cm',
                    style: pw.TextStyle(fontSize: 8, color: gris)),
                pw.SizedBox(width: 10),
                pw.Text('+237 6 90 12 34 56',
                    style: pw.TextStyle(fontSize: 8, color: gris)),
                pw.SizedBox(width: 10),
                pw.Text('support@jego.cm',
                    style: pw.TextStyle(fontSize: 8, color: gris)),
              ],
            ),
          ],
        ),
        pw.SizedBox(height: 6),
        pw.Center(
          child: pw.Text(
            'Ce document est un apercu de billet electronique. Ne pas modifier.',
            style: pw.TextStyle(
                fontSize: 7, color: PdfColor.fromInt(0xFFAAB3AD)),
          ),
        ),
      ],
    ),
  );

  return doc.save();
}

pw.Widget _carte({
  required String titre,
  required pw.Widget enfant,
  required PdfColor vertFonce,
  required PdfColor vert,
  required PdfColor grisClair,
}) {
  return pw.Container(
    padding: const pw.EdgeInsets.all(16),
    decoration: pw.BoxDecoration(
      color: PdfColors.white,
      borderRadius: pw.BorderRadius.circular(12),
      border: pw.Border.all(color: grisClair),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(titre,
            style: pw.TextStyle(
                fontSize: 9.5,
                fontWeight: pw.FontWeight.bold,
                color: vertFonce,
                letterSpacing: 0.5)),
        pw.SizedBox(height: 10),
        enfant,
      ],
    ),
  );
}

pw.Widget _pointTrajet(
    String ville, String point, String heure, PdfColor vert,
    {required bool estDepart}) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 10),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          width: 8,
          height: 8,
          margin: const pw.EdgeInsets.only(top: 3),
          decoration: pw.BoxDecoration(shape: pw.BoxShape.circle, color: vert),
        ),
        pw.SizedBox(width: 8),
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(ville,
                      style: pw.TextStyle(
                          fontSize: 10.5, fontWeight: pw.FontWeight.bold)),
                  pw.Text(heure, style: const pw.TextStyle(fontSize: 9.5)),
                ],
              ),
              if (point.isNotEmpty)
                pw.Text(point,
                    style: pw.TextStyle(
                        fontSize: 8, color: PdfColor.fromInt(0xFF64746C))),
            ],
          ),
        ),
      ],
    ),
  );
}

pw.Widget _mini(String libelle, String valeur, PdfColor gris, PdfColor fonce) {
  return pw.Column(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      pw.Text(libelle, style: pw.TextStyle(fontSize: 7.5, color: gris)),
      pw.Text(valeur,
          style: pw.TextStyle(
              fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: fonce)),
    ],
  );
}

pw.Widget _puce(String texte, PdfColor gris, PdfColor vert) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 7),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          width: 4,
          height: 4,
          margin: const pw.EdgeInsets.only(top: 3.5),
          decoration: pw.BoxDecoration(shape: pw.BoxShape.circle, color: vert),
        ),
        pw.SizedBox(width: 6),
        pw.Expanded(
          child: pw.Text(texte,
              style: pw.TextStyle(fontSize: 8, color: gris, height: 1.3)),
        ),
      ],
    ),
  );
}

pw.Widget _ligneBlanche(String texte) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 4),
    child: pw.Text(texte,
        style: const pw.TextStyle(color: PdfColors.white, fontSize: 10)),
  );
}

pw.Widget _ligne(String libelle, String valeur, PdfColor gris,
    PdfColor fonce, PdfColor accent,
    {bool dernier = false}) {
  return pw.Padding(
    padding: pw.EdgeInsets.only(bottom: dernier ? 0 : 8),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(libelle, style: pw.TextStyle(fontSize: 8, color: gris)),
        pw.Text(valeur,
            style: pw.TextStyle(
                fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: fonce)),
      ],
    ),
  );
}