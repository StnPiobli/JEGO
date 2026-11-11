import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
