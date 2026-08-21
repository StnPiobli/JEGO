const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// ═══════════════════════════════════════════════════
// GÉNÉRER LE PDF D'UN BILLET
// Retourne un Buffer (jamais écrit sur disque) — prêt à être joint
// directement à un email. Inclut un vrai QR code scannable, généré à
// partir du contenu signé déjà produit par utils/qr.js, un filigrane
// JEGO en fond, et le détail complet des options prises.
// ═══════════════════════════════════════════════════
async function genererPdfBillet(donnees) {
  const {
    numeroBillet, contenuQR, nomClient, depart, arrivee, arrets,
    dateDepart, heureDepart, siegeNumero, siegePremium, bagageQuantite,
    prixTotal
  } = donnees;

  const qrDataUrl = await QRCode.toDataURL(contenuQR, { width: 260, margin: 1 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 28 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Filigrane JEGO en fond, avant tout le reste du contenu.
    doc.save();
    doc.opacity(0.06);
    doc.fillColor('#0B9E63');
    doc.fontSize(90);
    doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.text('JEGO', 0, doc.page.height / 2 - 50, { width: doc.page.width, align: 'center' });
    doc.restore();
    // save()/restore() ne couvrent que l'état graphique (couleur,
    // rotation, opacité) -- jamais la position du curseur de texte.
    // Le filigrane l'a déplacée au milieu de la page ; sans ce reset,
    // tout le contenu réel s'empilerait à partir de là et déborderait
    // sur une deuxième page.
    doc.x = doc.page.margins.left;
    doc.y = doc.page.margins.top;

    doc.fillColor('#0B9E63').fontSize(20).text('JEGO', { align: 'left' });
    doc.fillColor('#141A14').fontSize(9).text('Billet de voyage', { align: 'left' });
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#E2E9E4').stroke();
    doc.moveDown(0.6);

    doc.fontSize(15).fillColor('#141A14').text(`${depart}  vers  ${arrivee}`);
    if (arrets && arrets.length > 0) {
      doc.fontSize(8.5).fillColor('#526258').text(`Arrêt(s) : ${arrets.join(', ')}`);
    }
    doc.moveDown(0.3);

    doc.fontSize(9.5).fillColor('#526258');
    doc.text(`Date : ${dateDepart}    Heure : ${heureDepart}`);
    doc.text(`Passager : ${nomClient}`);
    doc.text(`Siège : ${siegeNumero}${siegePremium ? ' (premium)' : ''}`);
    doc.text(`Numéro de billet : ${numeroBillet}`);
    doc.moveDown(0.5);

    doc.fontSize(8.5).fillColor('#141A14').text('Options prises :');
    doc.fontSize(8.5).fillColor('#526258');
    doc.text(`  •  Siège premium : ${siegePremium ? 'Oui' : 'Non'}`);
    doc.text(`  •  Bagage supplémentaire : ${bagageQuantite > 0 ? `Oui (x${bagageQuantite})` : 'Non'}`);
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#0B9E63').text(`Montant payé : ${prixTotal} FCFA`);
    doc.moveDown(0.7);

    // QR code avec cadre blanc pour la lisibilité, position calculée
    // explicitement (une image ne fait pas avancer doc.y toute seule,
    // contrairement à doc.text -- il faut le faire à la main pour ne
    // jamais chevaucher le texte qui suit). Taille et espacements
    // resserrés pour garantir que tout le billet tienne sur une seule
    // page A5, y compris la légende sous le QR.
    const qrTaille = 130;
    const qrX = (doc.page.width - qrTaille) / 2;
    const qrY = doc.y;
    const cadre = 8;
    doc.roundedRect(qrX - cadre, qrY - cadre, qrTaille + cadre * 2, qrTaille + cadre * 2, 6)
      .fillColor('#FFFFFF').fill();
    doc.image(qrBuffer, qrX, qrY, { width: qrTaille });

    doc.y = qrY + qrTaille + cadre * 2 + 8;
    doc.fontSize(7.5).fillColor('#8A968E')
      .text('Présentez ce QR code au chauffeur avant l\'embarquement.', doc.page.margins.left, doc.y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center'
      });

    doc.end();
  });
}

module.exports = { genererPdfBillet };
