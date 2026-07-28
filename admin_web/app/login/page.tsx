"use client";

// ✅ BRANCHÉ SUR LE VRAI BACKEND — POST /api/admin/connexion
// ⚠️ Pas de double authentification par code ici : ton backend actuel
// (adminController.js) ne l'implémente pas encore. Le v4.0 la prévoit,
// mais tant que la route n'existe pas côté serveur, l'ajouter côté
// frontend ne ferait que mentir sur l'état réel du système.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const data = await apiFetch("/api/admin/connexion", {
        method: "POST",
        body: JSON.stringify({ email, mot_de_passe: motDePasse }),
      });
      setSession(data.token, data.membre);
      router.push("/dashboard");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-900 bg-[radial-gradient(circle_at_15%_20%,rgba(111,190,148,.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(111,190,148,.10),transparent_40%)]">
      <form onSubmit={handleSubmit} className="w-[380px] bg-paper rounded-[18px] shadow-card p-8 relative">
        <div className="w-10 h-10 rounded-[11px] bg-green-500 text-white flex items-center justify-center font-display font-bold text-lg -rotate-3 mb-4">
          J
        </div>
        <h2 className="font-display text-lg mb-0.5">Connexion Admin</h2>
        <p className="text-ink-soft text-xs mb-6">
          admin.jego.cm — email + mot de passe (double authentification pas encore implémentée côté serveur)
        </p>

        <div className="mb-3.5">
          <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@jego.cm"
            className="w-full px-3 py-2.5 rounded-lg border border-line bg-white text-sm"
          />
        </div>
        <div className="mb-3.5">
          <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
            Mot de passe
          </label>
          <input
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-line bg-white text-sm"
          />
        </div>

        {erreur && (
          <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-3.5">{erreur}</div>
        )}

        <button
          type="submit"
          disabled={chargement}
          className="w-full py-2.5 rounded-[10px] bg-green-700 hover:bg-green-900 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
        >
          {chargement ? "Connexion…" : "Se connecter"}
        </button>
        <div className="text-[11px] text-ink-soft text-center mt-4">
          Nécessite que le backend tourne sur {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}
        </div>
      </form>
    </div>
  );
}
