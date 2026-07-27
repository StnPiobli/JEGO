'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LANGUE_STORAGE_KEY, lireLangue, NAV_LABELS, type Langue } from '../lib/langue';
import SiteLanguageTranslator from './SiteLanguageTranslator';

const liens = [
  { href: '/accueil', key: 'accueil', icone: 'accueil' },
  { href: '/trajets', key: 'trajets', icone: 'trajets' },
  { href: '/flotte', key: 'flotte', icone: 'flotte' },
  { href: '/chauffeurs', key: 'chauffeurs', icone: 'chauffeurs' },
  { href: '/reservations', key: 'reservations', icone: 'reservations' },
  { href: '/paiements', key: 'paiements', icone: 'paiements' },
  { href: '/statistiques', key: 'statistiques', icone: 'statistiques' },
  { href: '/incidents', key: 'incidents', icone: 'incidents' },
  { href: '/litiges', key: 'litiges', icone: 'litiges' },
  { href: '/discussion', key: 'discussion', icone: 'discussion' },
] as const;

const notificationsInitiales = [
  { id: 'n1', titre: 'Nouveau litige', texte: 'Un dossier est en cours de traitement par JEGO.', heure: 'Il y a 8 min', lu: false },
  { id: 'n2', titre: 'Programme incomplet', texte: 'La programmation est sous le seuil de 14 jours.', heure: 'Il y a 35 min', lu: false },
  { id: 'n3', titre: 'Versement en attente', texte: 'Un versement reste bloque dans l’escrow.', heure: 'Il y a 1 h', lu: false },
];

function Icone({ nom, className }: { nom: string; className?: string }) {
  const props = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, className };
  switch (nom) {
    case 'accueil': return <svg {...props}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></svg>;
    case 'trajets': return <svg {...props}><path d="M9 20 3 17V7l6 3m0 10 6-3m-6 3V10m6 7 6 3V10l-6-3m0 10V7m0 0L9 4" /></svg>;
    case 'flotte': return <svg {...props}><rect x="3" y="6" width="18" height="12" rx="3" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="16.5" cy="18" r="1.5" /></svg>;
    case 'chauffeurs': return <svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>;
    case 'reservations': return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" /></svg>;
    case 'paiements': return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
    case 'statistiques': return <svg {...props}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="13" y="8" width="3" height="10" /><path d="M18 6v12h2V6z" /></svg>;
    case 'incidents': return <svg {...props}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case 'litiges': return <svg {...props}><path d="M8 3h8l4 4v14H4V3h4Z" /><path d="M8 11h8M8 15h6M8 7h4" /></svg>;
    case 'discussion': return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case 'profil': return <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6.5 19a5.5 5.5 0 0 1 11 0" /></svg>;
    default: return null;
  }
}

function BoutonLien({
  href,
  icone,
  label,
  actif,
  replie,
}: { href: string; icone: string; label: string; actif: boolean; replie: boolean }) {
  return (
    <Link
      href={href}
      title={replie ? label : undefined}
      className={`relative flex items-center ${replie ? 'justify-center px-0' : 'gap-2.5 px-3'} h-[28px] rounded-[14px] border overflow-hidden transition-colors duration-100 ${actif ? 'text-white bg-[linear-gradient(90deg,rgba(14,173,106,.38),rgba(14,173,106,.15))] border-[#28D588]/22 shadow-[0_10px_24px_rgba(7,94,58,0.14)]' : 'text-white/70 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
    >
      {actif && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#3DDB93]" />}
      <Icone nom={icone} className={`${actif ? 'text-[#D7FFE8]' : 'text-white/66'} shrink-0`} />
      {!replie && <span className="text-[10px] font-semibold leading-none truncate">{label}</span>}
    </Link>
  );
}

export default function LayoutAgence({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const [replie, setReplie] = useState(false);
  const [notificationsOuvertes, setNotificationsOuvertes] = useState(false);
  const [notifications, setNotifications] = useState(notificationsInitiales);
  const [langue, setLangue] = useState<Langue>('fr');

  useEffect(() => {
    setLangue(lireLangue());
    const sync = () => setLangue(lireLangue());
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUE_STORAGE_KEY) sync();
    };
    window.addEventListener('jego-lang-change', sync as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('jego-lang-change', sync as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const labels = NAV_LABELS[langue];
  const nombreNonLues = notifications.filter((n) => !n.lu).length;

  const profilActif = useMemo(
    () => chemin === '/profil' || chemin?.startsWith('/profil/'),
    [chemin],
  );

  function marquerToutCommeLu() {
    setNotifications((liste) => liste.map((n) => ({ ...n, lu: true })));
  }

  return (
    <>
      <SiteLanguageTranslator />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,173,106,0.07),_transparent_22%),linear-gradient(180deg,#F8F8F5_0%,#EEF1EC_100%)] text-[#14201A]">
      <aside className={`fixed left-3 top-3 bottom-3 z-40 rounded-[26px] border border-white/20 bg-[linear-gradient(180deg,rgba(7,24,19,0.98)_0%,rgba(10,29,23,0.97)_52%,rgba(11,21,18,0.98)_100%)] backdrop-blur-[10px] shadow-[0_24px_60px_rgba(4,20,16,0.18)] transition-none ${replie ? 'w-[74px]' : 'w-[244px]'}`}>
        <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(61,219,147,.16) 0, transparent 28%), repeating-radial-gradient(circle at 90% 10%, rgba(255,255,255,.13) 0 1px, transparent 1px 28px)' }} />

        <div className="relative h-full flex flex-col px-3 py-3 overflow-hidden">
          <div className={`${replie ? 'text-center' : 'px-2'} mb-2`}>
            <p className="text-[18px] font-black tracking-tight text-white">{replie ? 'J' : 'JEGO'}</p>
            {!replie && <p className="text-white/66 text-[10px] mt-0.5">Espace agence</p>}
          </div>

          <div className="h-px bg-white/10 mb-2" />

          <nav className="flex-1 min-h-0 overflow-hidden pr-1 space-y-0.5">
            {liens.map((l) => {
              const actif = chemin === l.href || chemin?.startsWith(l.href + '/');
              return <BoutonLien key={l.href} href={l.href} icone={l.icone} label={labels[l.key]} actif={!!actif} replie={replie} />;
            })}
          </nav>

          <div className="pt-1.5 mt-1.5 border-t border-white/10 space-y-0.5">
            <BoutonLien href="/profil" icone="profil" label={labels.profil} actif={profilActif} replie={replie} />

            <button onClick={() => setReplie(!replie)} className={`w-full flex items-center ${replie ? 'justify-center' : 'gap-2.5 px-3'} h-[28px] rounded-[14px] text-white/66 hover:bg-white/[0.05] hover:text-white transition-colors`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${replie ? 'rotate-180' : ''}`}><path d="M15 18l-6-6 6-6" /></svg>
              {!replie && <span className="text-[10px] font-semibold">{replie ? labels.expand : labels.collapse}</span>}
            </button>

            <div className={`flex items-center ${replie ? 'justify-center' : 'gap-2.5 px-2'} h-11`} title={labels.logout}>
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full border border-white/15 bg-[#030A08] flex items-center justify-center text-white text-[13px] font-semibold">N</div>
                <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-[#18D27E] border-2 border-[#061A14]" />
              </div>
              {!replie && <span className="text-white/72 text-[10px] font-semibold">{labels.logout}</span>}
            </div>
          </div>
        </div>
      </aside>

      <main className={`transition-none ${replie ? 'pl-[98px]' : 'pl-[276px]'} pr-5 py-5`}>
        <div className="agency-ui min-h-[calc(100vh-48px)] rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,.90),rgba(248,249,246,.95))] backdrop-blur-[8px] border border-white/70 shadow-[0_20px_70px_rgba(26,48,40,0.08)] px-6 py-6 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.20]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(180deg, black, transparent 88%)' }} />
          <div className="relative z-[1] pr-12">{children}</div>
        </div>
      </main>

      <div className="fixed top-7 right-8 z-50">
        <button
          type="button"
          onClick={() => setNotificationsOuvertes((v) => !v)}
          className="relative w-10 h-10 rounded-full bg-white border border-[#E4EAE5] shadow-[0_10px_28px_rgba(20,32,26,0.10)] flex items-center justify-center text-[#14201A]"
          aria-label={labels.notifications}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          {nombreNonLues > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#D9534F] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">{nombreNonLues}</span>}
        </button>

        {notificationsOuvertes && (
          <div className="absolute right-0 mt-3 w-[330px] rounded-[22px] bg-white border border-[#E4EAE5] shadow-[0_24px_60px_rgba(20,32,26,0.18)] p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-[14px] font-extrabold text-[#14201A]">{labels.notifications}</p>
                <p className="text-[10px] text-[#8B9890]">{nombreNonLues} non lue(s)</p>
              </div>
              <button onClick={marquerToutCommeLu} className="text-[10px] font-bold text-[#0B9E63]">Tout marquer comme lu</button>
            </div>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => setNotifications((liste) => liste.map((n) => n.id === notification.id ? { ...n, lu: true } : n))}
                  className={`w-full text-left rounded-2xl border p-3 transition-colors ${notification.lu ? 'bg-[#FBFCFB] border-[#EEF1EE]' : 'bg-[#F6FBF8] border-[#DDEEE5]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-bold text-[#14201A]">{notification.titre}</p>
                      <p className="text-[10px] text-[#64746C] mt-1 leading-relaxed">{notification.texte}</p>
                    </div>
                    {!notification.lu && <span className="w-2.5 h-2.5 rounded-full bg-[#0B9E63] mt-1 shrink-0" />}
                  </div>
                  <p className="text-[9px] text-[#8B9890] mt-2">{notification.heure}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
