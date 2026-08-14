'use client';

// BRANCHÉ SUR LE VRAI BACKEND, sans repli démo.
// GET/PUT /api/agences/profil, POST /api/agences/envoyer-code-acces
// (envoie un vrai code à usage unique par email au directeur, expire
// en 5 min, un nouveau code invalide automatiquement le précédent),
// POST /api/agences/verifier-code-acces, PUT /api/agences/mot-de-passe,
// POST /api/agences/logo.

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { useLangue } from '../lib/langue';
import { apiFetch, getToken } from '../lib/api';
import TelephoneInput, { decomposerTelephone } from '../components/TelephoneInput';
import PasswordStrength, { evaluerMotDePasse } from '../components/PasswordStrength';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProfilPage() {
  const langue = useLangue();
  const t = langue === 'en'
    ? {
        title: 'Agency profile',
        subtitle: 'One single form. Enter your agency password once, then type "modify" to validate your changes.',
        protectedTitle: 'Protected access to the agency profile',
        protectedText: 'Enter your agency account password to open the full agency profile.',
        placeholderPassword: 'Agency password',
        incorrect: 'Incorrect password.',
        open: 'Open agency profile',
        success: 'Agency profile updated successfully.',
        general: 'General information',
        generalText: 'All profile information can be edited from this single form.',
        closeArea: 'Close profile area',
        agencyName: 'Agency name',
        phone: 'Agency phone',
        agencyEmail: 'Agency email',
        address: 'Address',
        description: 'Public description',
        directorEmail: 'Director personal email',
        secondaryContact: 'Secondary contact',
        receptionMode: 'Reception mode',
        number: 'Number / reference',
        beneficiary: 'Beneficiary',
        instructions: 'Instructions',
        summary: 'Summary of changes',
        saveAll: 'Save all changes',
        validationTitle: 'Validation',
        validationText: 'To validate all profile changes, simply type "modify" below.',
        validationLabel: 'Type "modify"',
        cancel: 'Cancel',
        validate: 'Validate',
      }
    : {
        title: 'Profil agence',
        subtitle: 'Un seul formulaire. Entre le mot de passe de ton agence une fois, puis ecris "modifier" pour valider les changements.',
        protectedTitle: 'Acces protege au profil agence',
        protectedText: 'Entre le mot de passe de connexion de ton agence pour ouvrir le profil complet.',
        placeholderPassword: 'Mot de passe de l\u2019agence',
        incorrect: 'Mot de passe incorrect.',
        open: 'Ouvrir le profil agence',
        success: 'Profil agence mis a jour avec succes.',
        general: 'Informations generales',
        generalText: 'Toutes les informations se modifient dans un seul formulaire.',
        closeArea: "Refermer l'espace",
        agencyName: "Nom de l'agence",
        phone: 'Telephone agence',
        agencyEmail: 'Email agence',
        address: 'Adresse',
        description: 'Description publique',
        directorEmail: 'Email personnel du directeur',
        secondaryContact: 'Contact secondaire',
        receptionMode: 'Mode de reception',
        number: 'Numero / reference',
        beneficiary: 'Titulaire / beneficiaire',
        instructions: 'Instructions',
        summary: 'Resume des changements',
        saveAll: 'Enregistrer toutes les modifications',
        validationTitle: 'Validation',
        validationText: 'Pour valider toutes les modifications du profil, il suffit d\u2019ecrire "modifier" ci-dessous.',
        validationLabel: 'Ecrire "modifier"',
        cancel: 'Annuler',
        validate: 'Valider',
      };

  const [espaceDebloque, setEspaceDebloque] = useState(false);
  const [contactDirecteurActuel, setContactDirecteurActuel] = useState('');
  const [emailAmorcage, setEmailAmorcage] = useState('');
  const [envoiAmorcageEnCours, setEnvoiAmorcageEnCours] = useState(false);
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [messageAcces, setMessageAcces] = useState('');
  const [envoiCodeEnCours, setEnvoiCodeEnCours] = useState(false);
  const [verificationCodeEnCours, setVerificationCodeEnCours] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [envoiLogo, setEnvoiLogo] = useState(false);

  const [nomAgence, setNomAgence] = useState('');
  const [description, setDescription] = useState('');
  const [telephoneAgence, setTelephoneAgence] = useState('');
  const [indicatifAgence, setIndicatifAgence] = useState('+237');
  const [emailAgence, setEmailAgence] = useState('');
  const [adresseAgence, setAdresseAgence] = useState('');
  const [contactDirecteur, setContactDirecteur] = useState('');
  const [indicatifSecondaire, setIndicatifSecondaire] = useState('+237');
  const [contactSecondaire, setContactSecondaire] = useState('');
  const [modeReception, setModeReception] = useState('Orange Money');
  const [numeroReception, setNumeroReception] = useState('');
  const [titulaireReception, setTitulaireReception] = useState('');
  const [instructionsReception, setInstructionsReception] = useState('');

  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [motValidation, setMotValidation] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [erreur, setErreur] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [ancienMdp, setAncienMdp] = useState('');
  const [confirmationMdpOuverte, setConfirmationMdpOuverte] = useState(false);
  const [motConfirmationMdp, setMotConfirmationMdp] = useState('');
  const [messageMdpSucces, setMessageMdpSucces] = useState('');
  const [erreurMdp, setErreurMdp] = useState('');
  const [envoiMdp, setEnvoiMdp] = useState(false);

  function chargerProfil() {
    apiFetch('/api/agences/profil')
      .then((data) => {
        const a = data.agence;
        if (a.nom) setNomAgence(a.nom);
        if (a.email) setEmailAgence(a.email);
        if (a.telephone) {
          const d = decomposerTelephone(a.telephone);
          setIndicatifAgence(d.indicatif);
          setTelephoneAgence(d.numero);
        }
        if (a.adresse) setAdresseAgence(a.adresse);
        if (a.description) setDescription(a.description);
        if (a.contact_directeur) { setContactDirecteur(a.contact_directeur); setContactDirecteurActuel(a.contact_directeur); }
        if (a.telephone_secondaire) {
          const d = decomposerTelephone(a.telephone_secondaire);
          setIndicatifSecondaire(d.indicatif);
          setContactSecondaire(d.numero);
        }
        if (a.mode_reception) setModeReception(a.mode_reception);
        if (a.numero_reception) setNumeroReception(a.numero_reception);
        if (a.titulaire_reception) setTitulaireReception(a.titulaire_reception);
        if (a.instructions_reception) setInstructionsReception(a.instructions_reception);
        setLogoUrl(a.logo_url || null);
      })
      .catch(() => setErreur('Impossible de charger le profil.'));
  }

  useEffect(() => { chargerProfil(); }, []);

  const resume = useMemo(
    () => [
      nomAgence,
      `${indicatifAgence} ${telephoneAgence}`,
      emailAgence,
      adresseAgence,
      `${modeReception} · ${numeroReception || '—'}`,
      titulaireReception || '—',
    ],
    [nomAgence, telephoneAgence, indicatifAgence, emailAgence, adresseAgence, modeReception, numeroReception, titulaireReception],
  );

  async function enregistrerEmailAmorcage() {
    if (!emailAmorcage.trim()) return;
    setEnvoiAmorcageEnCours(true);
    setMessageAcces('');
    try {
      await apiFetch('/api/agences/profil', {
        method: 'PUT',
        body: JSON.stringify({ contact_directeur: emailAmorcage.trim() }),
      });
      setContactDirecteurActuel(emailAmorcage.trim());
      setContactDirecteur(emailAmorcage.trim());
      setEmailAmorcage('');
    } catch (err) {
      setMessageAcces(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setEnvoiAmorcageEnCours(false);
    }
  }

  async function demanderCode() {
    setEnvoiCodeEnCours(true);
    setMessageAcces('');
    try {
      await apiFetch('/api/agences/envoyer-code-acces', { method: 'POST' });
      setCodeEnvoye(true);
    } catch (err) {
      setMessageAcces(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code.');
    } finally {
      setEnvoiCodeEnCours(false);
    }
  }

  async function verifierCode() {
    if (!codeSaisi) return;
    setVerificationCodeEnCours(true);
    setMessageAcces('');
    try {
      await apiFetch('/api/agences/verifier-code-acces', {
        method: 'POST',
        body: JSON.stringify({ code: codeSaisi }),
      });
      setEspaceDebloque(true);
      setCodeSaisi('');
      setCodeEnvoye(false);
    } catch {
      setMessageAcces(t.incorrect);
    } finally {
      setVerificationCodeEnCours(false);
    }
  }

  async function envoyerLogo(fichier: File) {
    setEnvoiLogo(true);
    try {
      const formulaire = new FormData();
      formulaire.append('logo', fichier);
      const res = await fetch(`${API_BASE}/api/agences/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken() || ''}` },
        body: formulaire,
      });
      const corps = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
      if (!res.ok) throw new Error(corps.error || `Erreur HTTP ${res.status}`);
      setLogoUrl(corps.logo_url);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du logo.');
    } finally {
      setEnvoiLogo(false);
    }
  }

  async function validerEnregistrement() {
    if (motValidation.trim().toLowerCase() !== 'modifier') return;
    setEnregistrementEnCours(true);
    setErreur('');
    try {
      await apiFetch('/api/agences/profil', {
        method: 'PUT',
        body: JSON.stringify({
          nom: nomAgence,
          email: emailAgence,
          telephone: `${indicatifAgence} ${telephoneAgence}`.trim(),
          adresse: adresseAgence,
          description,
          contact_directeur: contactDirecteur,
          telephone_secondaire: `${indicatifSecondaire} ${contactSecondaire}`.trim(),
          mode_reception: modeReception,
          numero_reception: numeroReception,
          titulaire_reception: titulaireReception,
          instructions_reception: instructionsReception,
        }),
      });
      setConfirmationOuverte(false);
      setMotValidation('');
      setMessageSucces(t.success);
      window.setTimeout(() => setMessageSucces(''), 2600);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function confirmerChangementMdp() {
    if (motConfirmationMdp.trim().toUpperCase() !== 'MODIFIER') return;
    setEnvoiMdp(true);
    setErreurMdp('');
    try {
      await apiFetch('/api/agences/mot-de-passe', {
        method: 'PUT',
        body: JSON.stringify({ ancien_mot_de_passe: ancienMdp, nouveau_mot_de_passe: nouveauMdp }),
      });
      setConfirmationMdpOuverte(false);
      setMotConfirmationMdp('');
      setNouveauMdp('');
      setConfirmationMdp('');
      setAncienMdp('');
      setMessageMdpSucces('Mot de passe mis à jour.');
      window.setTimeout(() => setMessageMdpSucces(''), 2600);
    } catch (err) {
      setErreurMdp(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.');
    } finally {
      setEnvoiMdp(false);
    }
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-extrabold text-ink mb-1">{t.title}</h1>
          <p className="text-[13px] text-ink-soft">{t.subtitle}</p>
        </div>

        {erreur && <div className="rounded-2xl p-3 mb-5 bg-red/6 border border-red/20 text-[11px] font-semibold text-red">{erreur}</div>}

        {!espaceDebloque ? (
          <div className="bg-paper rounded-3xl border border-line p-7 max-w-2xl shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
            <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center text-2xl mb-4">🔐</div>
            <h2 className="text-[20px] font-extrabold text-ink mb-2">{t.protectedTitle}</h2>

            {!contactDirecteurActuel ? (
              <>
                <p className="text-[12px] text-ink-soft mb-5">Aucun email de directeur n&apos;est encore enregistré. Renseigne-le une première fois pour pouvoir recevoir les codes d&apos;accès.</p>
                <input
                  type="email"
                  value={emailAmorcage}
                  onChange={(e) => setEmailAmorcage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') enregistrerEmailAmorcage(); }}
                  placeholder="Email du directeur"
                  className="w-full rounded-xl px-4 py-3 text-[13px] mb-4 border border-line"
                />
                {messageAcces && <p className="text-[11px] mb-4 text-red">{messageAcces}</p>}
                <button onClick={enregistrerEmailAmorcage} disabled={!emailAmorcage.trim() || envoiAmorcageEnCours} className="rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[12px] px-5 py-3">
                  {envoiAmorcageEnCours ? '…' : 'Enregistrer cet email'}
                </button>
              </>
            ) : !codeEnvoye ? (
              <>
                <p className="text-[12px] text-ink-soft mb-5">{t.protectedText} Un code à usage unique sera envoyé à <strong>{contactDirecteurActuel}</strong>, valable 5 minutes.</p>
                {messageAcces && <p className="text-[11px] mb-4 text-red">{messageAcces}</p>}
                <button onClick={demanderCode} disabled={envoiCodeEnCours} className="rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[12px] px-5 py-3">
                  {envoiCodeEnCours ? '…' : 'Envoyer le code par email'}
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] text-ink-soft mb-5">Code envoyé à <strong>{contactDirecteurActuel}</strong>. Vérifie aussi les spams. Valable 5 minutes, à usage unique.</p>
                <input
                  value={codeSaisi}
                  onChange={(e) => setCodeSaisi(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') verifierCode(); }}
                  placeholder="Code à 8 chiffres"
                  inputMode="numeric"
                  className="w-full rounded-xl px-4 py-3 text-[13px] mb-4 border border-line text-center font-bold tracking-widest"
                />
                {messageAcces && <p className="text-[11px] mb-4 text-red">{messageAcces}</p>}
                <div className="flex gap-3">
                  <button onClick={verifierCode} disabled={!codeSaisi || verificationCodeEnCours} className="rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[12px] px-5 py-3">
                    {verificationCodeEnCours ? '…' : t.open}
                  </button>
                  <button onClick={() => { setCodeEnvoye(false); setCodeSaisi(''); setMessageAcces(''); }} className="rounded-xl bg-off-white border border-line text-ink font-bold text-[12px] px-5 py-3">
                    Renvoyer un code
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {messageSucces && <div className="rounded-2xl p-3 mb-5 bg-green-700/10 border border-green-700/20 text-[11px] font-semibold text-green-700">{messageSucces}</div>}
            {messageMdpSucces && <div className="rounded-2xl p-3 mb-5 bg-green-700/10 border border-green-700/20 text-[11px] font-semibold text-green-700">{messageMdpSucces}</div>}

            <div className="bg-paper rounded-3xl border border-line p-6 shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-[18px] font-extrabold text-ink">{t.general}</h2>
                  <p className="text-[11px] text-ink-soft">{t.generalText}</p>
                </div>
                <button onClick={() => setEspaceDebloque(false)} className="rounded-xl bg-off-white text-ink font-bold text-[11px] px-4 py-2.5">{t.closeArea}</button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-off-white border border-line overflow-hidden flex items-center justify-center shrink-0">
                  {logoUrl ? <img src={`${API_BASE}${logoUrl}`} alt="Logo agence" className="w-full h-full object-cover" /> : <span className="text-2xl text-ink-soft">🏢</span>}
                </div>
                <div>
                  <label className="rounded-xl bg-off-white border border-line text-ink font-bold text-[11px] px-4 py-2.5 cursor-pointer inline-block">
                    {envoiLogo ? 'Envoi…' : 'Changer la photo'}
                    <input type="file" accept="image/*" className="hidden" disabled={envoiLogo} onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) envoyerLogo(f);
                    }} />
                  </label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.agencyName}</label><input value={nomAgence} onChange={(e) => setNomAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.phone}</label><TelephoneInput indicatif={indicatifAgence} numero={telephoneAgence} onChangeIndicatif={setIndicatifAgence} onChangeNumero={setTelephoneAgence} /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.agencyEmail}</label><input type="email" value={emailAgence} onChange={(e) => setEmailAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.address}</label><input value={adresseAgence} onChange={(e) => setAdresseAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" /></div>
                <div className="md:col-span-2"><label className="block text-[10px] text-ink-soft mb-1">{t.description}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-[12px] resize-none border border-line" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.directorEmail}</label><input type="email" value={contactDirecteur} onChange={(e) => setContactDirecteur(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.secondaryContact}</label><TelephoneInput indicatif={indicatifSecondaire} numero={contactSecondaire} onChangeIndicatif={setIndicatifSecondaire} onChangeNumero={setContactSecondaire} /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.receptionMode}</label><select value={modeReception} onChange={(e) => setModeReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line"><option>Orange Money</option><option>MTN MoMo</option><option>Virement bancaire</option><option>Cash agence</option></select></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.number}</label><input value={numeroReception} onChange={(e) => setNumeroReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.beneficiary}</label><input value={titulaireReception} onChange={(e) => setTitulaireReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.instructions}</label><textarea value={instructionsReception} onChange={(e) => setInstructionsReception(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-[12px] resize-none border border-line" /></div>
              </div>

              <div className="rounded-2xl bg-paper border-2 border-ink p-5 mt-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔒</span>
                  <p className="text-[14px] font-extrabold text-ink">Changer le mot de passe</p>
                </div>
                {erreurMdp && <p className="text-[11px] text-red bg-red-bg rounded-lg px-2.5 py-1.5 mb-3 inline-block">{erreurMdp}</p>}
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">Mot de passe actuel</label>
                    <input type="password" value={ancienMdp} onChange={(e) => setAncienMdp(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">Nouveau mot de passe</label>
                    <input type="password" value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" />
                    <PasswordStrength mdp={nouveauMdp} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">Confirmer le mot de passe</label>
                    <input type="password" value={confirmationMdp} onChange={(e) => setConfirmationMdp(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px] border border-line" />
                    {confirmationMdp && nouveauMdp !== confirmationMdp && <p className="text-[10.5px] text-red mt-1">Les mots de passe ne correspondent pas</p>}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmationMdpOuverte(true)}
                  disabled={!ancienMdp || !nouveauMdp || nouveauMdp !== confirmationMdp || evaluerMotDePasse(nouveauMdp).score < 2}
                  className="mt-3 rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[12px] px-5 py-3"
                >
                  Mettre à jour le mot de passe
                </button>
              </div>

              <div className="rounded-2xl bg-off-white border border-line p-4 mt-5">
                <p className="text-[11px] font-bold text-ink mb-2">{t.summary}</p>
                <div className="grid md:grid-cols-2 gap-2">{resume.map((ligne) => <p key={ligne} className="text-[10px] text-ink-soft">• {ligne}</p>)}</div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setConfirmationOuverte(true)} className="rounded-xl bg-green-700 text-white font-bold text-[12px] px-5 py-3">{t.saveAll}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmationMdpOuverte && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-50" onClick={() => { setConfirmationMdpOuverte(false); setMotConfirmationMdp(''); }}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-sm w-full border border-line">
            <p className="text-center text-[16px] font-extrabold text-ink mb-1">Confirmer le changement</p>
            <p className="text-center text-[11px] text-ink-soft mb-4">Pour valider, écris <strong>MODIFIER</strong> ci-dessous.</p>
            <input value={motConfirmationMdp} onChange={(e) => setMotConfirmationMdp(e.target.value)} placeholder="MODIFIER" className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] text-center font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setConfirmationMdpOuverte(false); setMotConfirmationMdp(''); }} className="flex-1 rounded-xl bg-off-white border border-line text-ink font-bold text-[11px] py-3">Annuler</button>
              <button
                onClick={confirmerChangementMdp}
                disabled={motConfirmationMdp.trim().toUpperCase() !== 'MODIFIER' || envoiMdp}
                className="flex-1 rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[11px] py-3"
              >
                {envoiMdp ? '…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmationOuverte && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setConfirmationOuverte(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-3xl p-7 max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-amber/18 flex items-center justify-center mx-auto mb-3 text-lg">✍️</div>
            <p className="text-center text-[16px] font-extrabold text-ink mb-1">{t.validationTitle}</p>
            <p className="text-center text-[11px] text-ink-soft mb-4">{t.validationText}</p>
            <input value={motValidation} onChange={(e) => setMotValidation(e.target.value)} placeholder={t.validationLabel} className="w-full rounded-xl px-4 py-3 text-center text-[13px] font-bold mb-4 border border-line" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationOuverte(false)} className="flex-1 rounded-xl bg-off-white text-ink font-bold text-[11px] py-3">{t.cancel}</button>
              <button onClick={validerEnregistrement} disabled={motValidation.trim().toLowerCase() !== 'modifier' || enregistrementEnCours} className="flex-1 rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[11px] py-3">
                {enregistrementEnCours ? '…' : t.validate}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
