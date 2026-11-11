// Petit serveur statique pour tester le build web sur un telephone.
//
// Pourquoi node et pas `flutter run` : `flutter run -d web-server` sert
// un build de DEBUG (modules DDC) que Safari iOS ne demarre pas — page
// blanche. On sert donc `build/web`, produit par `flutter build web
// --release`, qui est du dart2js classique.
//
// Pourquoi node precisement : le pare-feu Windows a deja une regle
// « Allow » sur le profil Public pour node.exe. Un autre binaire
// (python, serve, …) serait bloque et demanderait des droits admin.
//
//   flutter build web --release
//   node servir_web.js
//
// Puis, depuis un telephone du meme reseau : http://<ip-du-pc>:8080
//
// HTTPS (port 8443) : le partage de fichiers et la camera ne marchent
// que sur une page securisee. Le meme build y est servi avec un
// certificat de test (certs_dev/, a creer une fois avec openssl, voir
// plus bas). Le telephone affiche un avertissement la premiere fois :
// « Continuer vers le site ». En https, l'appli appelle l'API sur la
// MEME adresse (contenu mixte interdit) : ce serveur relaie donc /api et
// /uploads vers le backend http://localhost:3000.
//
//   openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
//     -keyout certs_dev/cle.pem -out certs_dev/cert.pem -subj "/CN=JEGO dev"

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const PORT_HTTPS = 8443;
const BACKEND = { hote: 'localhost', port: 3000 };
const CERTS = path.join(__dirname, 'certs_dev');
const RACINE = path.join(__dirname, 'build', 'web');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.bin': 'application/octet-stream',
  '.map': 'application/json; charset=utf-8',
};

if (!fs.existsSync(path.join(RACINE, 'index.html'))) {
  console.error(`Rien a servir : ${RACINE} est vide.`);
  console.error('Lance d\'abord : flutter build web --release');
  process.exit(1);
}

// /api et /uploads partent au backend, tels quels (méthode, en-têtes,
// corps), et sa réponse revient telle quelle.
function relayer(req, res) {
  const vers = http.request(
    {
      host: BACKEND.hote,
      port: BACKEND.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND.hote}:${BACKEND.port}` },
    },
    (rep) => {
      res.writeHead(rep.statusCode || 502, rep.headers);
      rep.pipe(res);
    }
  );
  vers.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Serveur JEGO injoignable' }));
  });
  req.pipe(vers);
}

function traiter(req, res) {
  if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
    relayer(req, res);
    return;
  }
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (chemin === '/') chemin = '/index.html';

  // Un chemin ne doit jamais sortir de build/web.
  const cible = path.normalize(path.join(RACINE, chemin));
  if (!cible.startsWith(RACINE)) {
    res.writeHead(403).end('Interdit');
    return;
  }

  fs.readFile(cible, (err, contenu) => {
    if (err) {
      // Route inconnue : on rend index.html, la navigation est geree
      // cote Flutter.
      fs.readFile(path.join(RACINE, 'index.html'), (err2, index) => {
        if (err2) {
          res.writeHead(404).end('Introuvable');
          return;
        }
        res.writeHead(200, { 'Content-Type': TYPES['.html'] }).end(index);
      });
      return;
    }
    const type = TYPES[path.extname(cible).toLowerCase()] ||
      'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      // Build de dev : on ne veut pas d'un vieux bundle en cache sur le
      // telephone apres un nouveau `flutter build web`.
      'Cache-Control': 'no-store',
    }).end(contenu);
  });
}

const serveur = http.createServer(traiter);

serveur.listen(PORT, '0.0.0.0', () => {
  const adresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`JEGO web servi sur le port ${PORT}`);
  console.log(`  ici     : http://localhost:${PORT}`);
  for (const a of adresses) {
    console.log(`  reseau  : http://${a}:${PORT}`);
  }
});

// HTTPS, si le certificat de test existe.
const cle = path.join(CERTS, 'cle.pem');
const cert = path.join(CERTS, 'cert.pem');
if (fs.existsSync(cle) && fs.existsSync(cert)) {
  https
    .createServer({ key: fs.readFileSync(cle), cert: fs.readFileSync(cert) }, traiter)
    .listen(PORT_HTTPS, '0.0.0.0', () => {
      const adresses = Object.values(os.networkInterfaces())
        .flat()
        .filter((i) => i && i.family === 'IPv4' && !i.internal)
        .map((i) => i.address);
      console.log(`JEGO web en HTTPS sur le port ${PORT_HTTPS} (partage, camera)`);
      for (const a of adresses) {
        console.log(`  reseau  : https://${a}:${PORT_HTTPS}`);
      }
    });
} else {
  console.log(`Pas de HTTPS : certificat absent dans ${CERTS} (voir en tete du fichier).`);
}
