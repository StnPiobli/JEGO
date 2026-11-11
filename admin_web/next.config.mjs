/** @type {import('next').NextConfig} */
const nextConfig = {
  // En dev, Next bloque ses scripts pour toute autre adresse que localhost :
  // sans ça, la page ouverte depuis le téléphone ne s'active pas (connexion
  // impossible). Réseau de la box et partage de connexion iPhone.
  allowedDevOrigins: ["192.168.*.*", "172.20.10.*"],
};
export default nextConfig;
