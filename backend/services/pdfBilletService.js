const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// ═══════════════════════════════════════════════════
// GÉNÉRER LE PDF D'UN BILLET
// Retourne un Buffer (jamais écrit sur disque) — prêt à être joint
// directement à un email. Inclut un vrai QR code scannable, généré à
// partir du contenu signé déjà produit par utils/qr.js.
// ═══════════════════════════════════════════════════
async function genererPdfBillet(donnees) {
  const {
    numeroBillet, contenuQR, nomClient, depart, arrivee,
    dateDepart, heureDepart, siegeNumero, prixTotal
  } = donnees;

  const qrDataUrl = await QRCode.toDataURL(contenuQR, { width: 220, margin: 1 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#0B9E63').fontSize(22).text('JEGO', { align: 'left' });
    doc.fillColor('#141A14').fontSize(10).text('Billet de voyage', { align: 'left' });
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#E2E9E4').stroke();
    doc.moveDown(1);

    doc.fontSize(16).fillColor('#141A14').text(`${depart}  ->  ${arrivee}`);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#526258');
    doc.text(`Date : ${dateDepart}    Heure : ${heureDepart}`);
    doc.text(`Passager : ${nomClient}`);
    doc.text(`Siège : ${siegeNumero}`);
    doc.text(`Numéro de billet : ${numeroBillet}`);
    doc.moveDown(1.5);

    doc.fontSize(13).fillColor('#0B9E63').text(`Montant payé : ${prixTotal} FCFA`);
    doc.moveDown(1.5);

    const qrX = (doc.page.width - 150) / 2;
    doc.image(qrBuffer, qrX, doc.y, { width: 150 });
    doc.moveDown(9);
    doc.fontSize(8).fillColor('#8A968E').text('Présentez ce QR code au chauffeur avant l\'embarquement.', { align: 'center' });

    doc.end();
  });
}

module.exports = { genererPdfBillet };
