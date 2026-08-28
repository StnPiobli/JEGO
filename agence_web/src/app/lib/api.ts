// Utilitaire d'appel au vrai backend Express — identique à celui d'admin_web.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jego_agence_token");
}

export function setSession(token: string, agence: unknown) {
  localStorage.setItem("jego_agence_token", token);
  localStorage.setItem("jego_agence_profil", JSON.stringify(agence));
}

export function clearSession() {
  localStorage.removeItem("jego_agence_token");
  localStorage.removeItem("jego_agence_profil");
}

export function getAgenceLocale(): { id: number; nom: string; statut?: string; ville?: string | null; telephone?: string | null; motif_desactivation?: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("jego_agence_profil");
  return raw ? JSON.parse(raw) : null;
}

// Onboarding "compléter le profil" après première validation — suivi en
// local uniquement, aucune route backend ne permet de le tracer réellement.
export function onboardingComplet(agenceId: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`jego_agence_onboarding_complete_${agenceId}`) === "true";
}
export function marquerOnboardingComplet(agenceId: number) {
  localStorage.setItem(`jego_agence_onboarding_complete_${agenceId}`, "true");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
    throw new Error(body.error || `Erreur HTTP ${res.status}`);
  }
  return res.json();
}
