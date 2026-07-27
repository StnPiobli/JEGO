"use client";

// ⚠️ DEMO — authentification factice. À remplacer par un vrai appel API
// (identifiant + mot de passe, puis code de vérification envoyé par email).

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-900 bg-[radial-gradient(circle_at_15%_20%,rgba(111,190,148,.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(111,190,148,.10),transparent_40%)]">
      <div className="w-[380px] bg-paper rounded-[18px] shadow-card p-8 relative">
        <div className="w-10 h-10 rounded-[11px] bg-green-500 text-white flex items-center justify-center font-display font-bold text-lg -rotate-3 mb-4">
          J
        </div>

        {step === 1 && (
          <>
            <h2 className="font-display text-lg mb-0.5">Connexion Super Admin</h2>
            <p className="text-ink-soft text-xs mb-6">
              admin.jego.cm — accès séparé de l&apos;interface équipe
            </p>
            <div className="mb-3.5">
              <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                Identifiant
              </label>
              <input
                defaultValue="s.piobli"
                className="w-full px-3 py-2.5 rounded-lg border border-line bg-white text-sm"
              />
            </div>
            <div className="mb-3.5">
              <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                defaultValue="••••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-line bg-white text-sm"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-[10px] bg-green-700 hover:bg-green-900 text-white font-semibold text-sm transition-colors"
            >
              Continuer
            </button>
            <div className="text-[11px] text-ink-soft text-center mt-4">
              Session loggée avec heure et IP à chaque connexion
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-lg mb-0.5">Code de vérification</h2>
            <p className="text-ink-soft text-xs mb-6">
              Un code a été envoyé à s.piobli@jego.cm
            </p>
            <div className="flex gap-2 mb-4">
              {["4", "1", "9", "2", "7", "0"].map((d, i) => (
                <input
                  key={i}
                  maxLength={1}
                  defaultValue={d}
                  className="w-[42px] h-12 text-center font-mono text-lg rounded-lg border border-line"
                />
              ))}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 rounded-[10px] bg-green-700 hover:bg-green-900 text-white font-semibold text-sm transition-colors"
            >
              Valider et accéder au tableau de bord
            </button>
            <div className="text-[11px] text-ink-soft text-center mt-4 leading-relaxed">
              Le compte Super Admin ne sert qu&apos;aux actions stratégiques — pour l&apos;instant,
              tant que l&apos;équipe admin n&apos;existe pas, il gère aussi le quotidien.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
