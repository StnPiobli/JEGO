'use client';
// Indicateur de robustesse progressive — réutilisé sur inscription et
// changement de mot de passe.

export function evaluerMotDePasse(mdp: string) {
  const criteres = [
    { label: 'Au moins 8 caractères', ok: mdp.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(mdp) },
    { label: 'Un chiffre', ok: /[0-9]/.test(mdp) },
    { label: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(mdp) },
  ];
  const score = criteres.filter((c) => c.ok).length;
  return { criteres, score };
}

export default function PasswordStrength({ mdp }: { mdp: string }) {
  if (!mdp) return null;
  const { criteres, score } = evaluerMotDePasse(mdp);
  const couleur = score <= 1 ? 'bg-red' : score === 2 ? 'bg-amber' : score === 3 ? 'bg-green-500' : 'bg-green-700';
  const label = score <= 1 ? 'Faible' : score === 2 ? 'Moyen' : score === 3 ? 'Bon' : 'Excellent';
  return (
    <div className="mt-1.5 mb-1">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? couleur : 'bg-line'}`} />
        ))}
      </div>
      <p className="text-[10.5px] font-semibold text-ink-soft mb-1">{label}</p>
      <ul className="text-[10px] text-ink-soft space-y-0.5">
        {criteres.map((c) => (
          <li key={c.label} className={c.ok ? 'text-green-700' : ''}>{c.ok ? '✓' : '○'} {c.label}</li>
        ))}
      </ul>
    </div>
  );
}
