// Utilitaire d'appel au vrai backend Express (http://localhost:3000 par défaut).
// Le token JWT est stocké en localStorage après connexion (voir app/login/page.tsx).

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jego_admin_token");
}

export function setSession(token: string, membre: unknown) {
  localStorage.setItem("jego_admin_token", token);
  localStorage.setItem("jego_admin_membre", JSON.stringify(membre));
}

export function clearSession() {
  localStorage.removeItem("jego_admin_token");
  localStorage.removeItem("jego_admin_membre");
}

export type Membre = { id: string; nom: string; prenom: string; niveau: number | string };

export function getMembre(): Membre | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("jego_admin_membre");
  return raw ? JSON.parse(raw) : null;
}

/** Initiales du membre connecté, pour l'avatar de la barre latérale. */
export function initialesMembre(membre: Membre | null): string {
  if (!membre) return "?";
  const p = (membre.prenom || "").trim()[0] ?? "";
  const n = (membre.nom || "").trim()[0] ?? "";
  return (p + n).toUpperCase() || "?";
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
