// ═══════════════════════════════════════════════════
// LECTURE D'UN ENVOI DE FICHIER (multipart/form-data)
//
// Écrit à la main plutôt qu'avec multer : une dépendance de moins à
// installer, et le besoin est simple (un seul fichier + quelques champs
// texte). Le fichier est entièrement lu en mémoire, ce qui est acceptable
// avec la limite de taille appliquée avant écriture disque.
// ═══════════════════════════════════════════════════

/**
 * Analyse un corps multipart/form-data.
 * Renvoie { champs: {...}, fichier: { nom, type, donnees } | null }
 */
function lireMultipart(req, tailleMaxOctets) {
  return new Promise((resolve, reject) => {
    const typeContenu = req.headers['content-type'] || '';
    if (!typeContenu.startsWith('multipart/form-data')) {
      return reject(new Error('Format attendu : multipart/form-data'));
    }

    const correspondance = typeContenu.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!correspondance) {
      return reject(new Error('Délimiteur multipart introuvable'));
    }
    const delimiteur = '--' + (correspondance[1] || correspondance[2]).trim();

    const morceaux = [];
    let total = 0;
    let depasse = false;

    req.on('data', (morceau) => {
      total += morceau.length;
      // On coupe dès le dépassement : inutile de charger en mémoire un
      // fichier qu'on refusera de toute façon.
      if (total > tailleMaxOctets) {
        depasse = true;
        req.destroy();
        return;
      }
      morceaux.push(morceau);
    });

    req.on('error', () => {
      if (depasse) return reject(new Error('TAILLE_DEPASSEE'));
      reject(new Error('Lecture du fichier interrompue'));
    });

    req.on('aborted', () => {
      if (depasse) return reject(new Error('TAILLE_DEPASSEE'));
      reject(new Error('Envoi interrompu'));
    });

    req.on('end', () => {
      if (depasse) return reject(new Error('TAILLE_DEPASSEE'));

      try {
        const corps = Buffer.concat(morceaux);
        const champs = {};
        let fichier = null;

        const sep = Buffer.from('\r\n' + delimiteur);
        // On préfixe pour que le premier bloc soit délimité comme les autres.
        const complet = Buffer.concat([Buffer.from('\r\n'), corps]);

        let position = 0;
        while (true) {
          const debut = complet.indexOf(sep, position);
          if (debut === -1) break;
          const apresDelim = debut + sep.length;

          // Fin du corps : le délimiteur est suivi de "--"
          if (complet.slice(apresDelim, apresDelim + 2).toString() === '--') break;

          const finEntetes = complet.indexOf('\r\n\r\n', apresDelim);
          if (finEntetes === -1) break;

          const entetes = complet.slice(apresDelim, finEntetes).toString('utf8');
          const debutContenu = finEntetes + 4;
          const finContenu = complet.indexOf(sep, debutContenu);
          if (finContenu === -1) break;

          const contenu = complet.slice(debutContenu, finContenu);

          const nomChamp = entetes.match(/name="([^"]*)"/i);
          const nomFichier = entetes.match(/filename="([^"]*)"/i);
          const typeMime = entetes.match(/Content-Type:\s*([^\r\n]+)/i);

          if (nomFichier && nomFichier[1]) {
            fichier = {
              nom: nomFichier[1],
              type: typeMime ? typeMime[1].trim() : 'application/octet-stream',
              donnees: contenu,
            };
          } else if (nomChamp) {
            champs[nomChamp[1]] = contenu.toString('utf8');
          }

          position = finContenu;
        }

        resolve({ champs, fichier });

      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { lireMultipart };
