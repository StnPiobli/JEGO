import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En dev, Next bloque ses scripts pour toute autre adresse que localhost :
  // sans ça, la page ouverte depuis le téléphone ne s'active pas (connexion
  // impossible). Réseau de la box et partage de connexion iPhone.
  allowedDevOrigins: ["192.168.*.*", "172.20.10.*"],
  // La page « Incidents » s'appelle desormais « Signalements ». On
  // redirige l'ancienne adresse : les liens et favoris deja poses
  // (notamment ceux ouverts depuis Trajets) continuent de marcher.
  async redirects() {
    return [
      { source: "/incidents", destination: "/signalements", permanent: false },
    ];
  },
};

export default nextConfig;
