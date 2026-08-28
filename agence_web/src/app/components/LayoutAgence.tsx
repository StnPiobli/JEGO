'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LANGUE_STORAGE_KEY, lireLangue, NAV_LABELS, type Langue } from '../lib/langue';
import SiteLanguageTranslator from './SiteLanguageTranslator';
import { ThemeToggle } from './ui';
import { getAgenceLocale, onboardingComplet, clearSession, apiFetch } from '../lib/api';
import BoutonRemonter from './BoutonRemonter';

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
  { href: '/avis', key: 'avis', icone: 'avis' },
] as const;

type Notification = { id: string; titre: string; texte: string; heure: string; lien?: string; lu: boolean };
const notificationsInitiales: Notification[] = [];

function Icone({ nom, className }: { nom: string; className?: string }) {
  const props = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, className };
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
    case 'avis': return <svg {...props}><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
    case 'profil': return <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6.5 19a5.5 5.5 0 0 1 11 0" /></svg>;
    default: return null;
  }
}

function BoutonLien({
  href, icone, label, actif, replie, badge,
}: { href: string; icone: string; label: string; actif: boolean; replie: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      title={replie ? label : undefined}
      className={`flex items-center gap-2.5 ${replie ? 'justify-center px-0' : 'px-2.5'} py-2 rounded-lg text-[13px] mb-0.5 transition-colors ${
        actif ? 'bg-white/10 text-white font-semibold' : 'text-white/78 hover:bg-white/5'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${actif ? 'bg-green-300' : 'bg-white/30'}`} />
      <Icone nom={icone} className="shrink-0" />
      {!replie && <span className="truncate flex-1">{label}</span>}
      {!!badge && badge > 0 && (
        <span className={`shrink-0 text-[10px] font-bold bg-red text-white rounded-full ${replie ? 'absolute -mt-4 ml-3' : ''} px-1.5 py-0.5 min-w-[16px] text-center`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function LayoutAgence({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const [replie, setReplie] = useState(false);
  const [notificationsOuvertes, setNotificationsOuvertes] = useState(false);
  const [notifications, setNotifications] = useState(notificationsInitiales);
  const [langue, setLangue] = useState<Langue>('fr');
  const [nomAgenceConnectee, setNomAgenceConnectee] = useState('');
  const [messagesNonLus, setMessagesNonLus] = useState(0);

  useEffect(() => {
    const agence = getAgenceLocale();
    if (agence?.nom) setNomAgenceConnectee(agence.nom);
  }, []);

  useEffect(() => {
    apiFetch('/api/agences/notifications')
      .then((data) => {
        const liste: Notification[] = (data.notifications || []).map((n: { id: string; titre: string; texte: string; heure: string; lien?: string }) => ({
          ...n,
          lu: false,
        }));
        setNotifications(liste);
      })
      .catch(() => setNotifications([]));
  }, []);

  // Rafraîchi en tâche de fond (pas seulement au chargement de la
  // page) pour que le badge apparaisse dès qu'un message arrive et
  // disparaisse dès que la discussion est réellement ouverte et lue.
  useEffect(() => {
    let annule = false;
    function charger() {
      apiFetch('/api/messages/non-lus')
        .then((data) => { if (!annule) setMessagesNonLus(data.non_lus || 0); })
        .catch(() => { if (!annule) setMessagesNonLus(0); });
    }
    charger();
    const intervalle = window.setInterval(charger, 10000);
    window.addEventListener('jego-messages-lus', charger);
    return () => {
      annule = true;
      window.clearInterval(intervalle);
      window.removeEventListener('jego-messages-lus', charger);
    };
  }, [chemin]);

  // Garde-fou : LayoutAgence n'habille que les pages du dashboard complet
  // (accueil, trajets, flotte...). Si quelqu'un navigue directement dessus
  // (lien, favori) sans passer par la connexion, on le renvoie vers le bon
  // écran selon son vrai statut.
  useEffect(() => {
    const agence = getAgenceLocale();
    if (!agence) {
      router.replace('/');
      return;
    }
    if (agence.statut === 'en_attente') { router.replace('/en-attente'); return; }
    if (agence.statut === 'refuse') { router.replace('/rejete'); return; }
    // Consideree comme completee si le flag local est pose OU si l'agence
    // a deja ses infos en base (ville + telephone). Sans ce second cas,
    // une agence deja renseignee bouclait entre /accueil et
    // /completer-profil.
    const complete = onboardingComplet(agence.id) || !!(agence.ville && agence.telephone);
    if (!complete) { router.replace('/completer-profil'); return; }
  }, [router]);

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
            <div className="h-screen overflow-hidden bg-off-white">
        <div className="grid grid-cols-[auto_1fr] h-screen">
          <aside className={`bg-green-900 px-3 py-6 flex flex-col sticky top-0 h-screen overflow-y-auto transition-[width] ${replie ? 'w-[70px]' : 'w-[220px]'}`}>
            <div className={`${replie ? 'text-center' : 'px-1.5'} mb-5 flex items-center gap-2.5`}>
              <div className="w-[30px] h-[30px] rounded-[8px] bg-green-300 flex items-center justify-center text-green-900 font-display font-bold text-sm -rotate-3 shrink-0">J</div>
              {!replie && (
                <div>
                  <div className="font-display font-bold text-[15px] text-on-dark">JEGO</div>
                  <div className="text-[9.5px] text-green-300 uppercase tracking-wider">Espace agence</div>
                </div>
              )}
            </div>

            <nav className="flex-1 min-h-0 overflow-y-auto">
              {liens.map((l) => {
                const actif = chemin === l.href || chemin?.startsWith(l.href + '/');
                return <BoutonLien key={l.href} href={l.href} icone={l.icone} label={labels[l.key]} actif={!!actif} replie={replie} badge={l.key === 'discussion' ? messagesNonLus : undefined} />;
              })}
            </nav>

            <div className="pt-3 mt-2 border-t border-white/10 space-y-0.5">
              <BoutonLien href="/profil" icone="profil" label={labels.profil} actif={profilActif} replie={replie} />

              <button onClick={() => setReplie(!replie)} className={`w-full flex items-center ${replie ? 'justify-center' : 'gap-2.5 px-2.5'} py-2 rounded-lg text-white/66 hover:bg-white/5 hover:text-white transition-colors`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={replie ? 'rotate-180' : ''}><path d="M15 18l-6-6 6-6" /></svg>
                {!replie && <span className="text-[11px] font-semibold">{labels.collapse}</span>}
              </button>

              <div className="pt-2">
                <ThemeToggle />
              </div>

              <button
                onClick={() => { clearSession(); router.push('/'); }}
                className={`w-full flex items-center ${replie ? 'justify-center' : 'gap-2.5 px-1.5'} pt-2 hover:opacity-80 transition-opacity`}
                title={labels.logout}
              >
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {nomAgenceConnectee ? nomAgenceConnectee.charAt(0).toUpperCase() : '?'}
                </div>
                {!replie && (
                  <div className="text-[12.5px] text-left">
                    <b className="block text-[13px] text-on-dark">{nomAgenceConnectee || '…'}</b>
                    <span className="text-white/50 text-[11px] underline">{labels.logout}</span>
                  </div>
                )}
              </button>
            </div>
          </aside>

          <main className="px-10 py-7 pb-16 relative overflow-y-auto min-h-0">
            {children}
            <BoutonRemonter />
          </main>
        </div>
      </div>
    </>
  );
}
