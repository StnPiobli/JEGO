// Localisation approximative d'une adresse IP -> « Ville, Pays ».
// Best-effort : service public gratuit, jamais bloquant. Les IP privees
// (tests en local) ne se localisent pas -> renvoie null.
function estPrivee(ip) {
  if (!ip) return true;
  const n = ip.replace('::ffff:', '');
  return n === '127.0.0.1' || n === '::1' || n.startsWith('10.') ||
    n.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(n) ||
    n === 'localhost';
}

async function localiserIp(ip) {
  try {
    if (estPrivee(ip)) return null;
    const propre = String(ip).replace('::ffff:', '');
    const rep = await fetch(
      `http://ip-api.com/json/${propre}?fields=status,city,country`,
      { signal: AbortSignal.timeout(4000) }
    );
    const j = await rep.json();
    if (j.status !== 'success') return null;
    return [j.city, j.country].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

// L'IP reelle du client derriere le proxy / le tunnel Cloudflare.
function ipClient(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

module.exports = { localiserIp, ipClient, estPrivee };
