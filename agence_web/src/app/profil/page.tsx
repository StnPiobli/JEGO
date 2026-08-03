'use client';

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { useLangue } from '../lib/langue';
import { apiFetch } from '../lib/api';
import TelephoneInput, { decomposerTelephone } from '../components/TelephoneInput';
import PasswordStrength, { evaluerMotDePasse } from '../components/PasswordStrength';

// ✅ Lecture BRANCHÉE — GET /api/agences/profil (repli démo si injoignable).
// ⚠️ Écriture reste DÉMO — aucune route PUT n'existe côté backend pour
// modifier le profil (seules inscription/connexion/profil-lecture existent).
// Le code de vérification par email reste également démo pour la même raison.

function genererCode() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export default function ProfilPage() {
  const langue = useLangue();
  const t = langue === 'en'
    ? {
        title: 'Agency profile',
        subtitle: 'One single form. Enter the access code once, then type "modify" to validate your changes.',
        protectedTitle: 'Protected access to the agency profile',
        protectedText: 'A director access code is required to open the full agency profile.',
        recipient: 'Recipient contact',
        demo: 'Demo mode',
        resend: 'Resend access code',
        placeholderCode: 'Enter the access code',
        incorrect: 'Incorrect access code.',
        sent: 'Access code resent to the director',
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
        secondaryContact: 'Secondary verification contact',
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
        subtitle: 'Un seul formulaire. Entre le code d’acces une fois, puis ecris "modifier" pour valider les changements.',
        protectedTitle: 'Acces protege au profil agence',
        protectedText: 'Un code reserve au directeur est necessaire pour ouvrir le profil agence complet.',
        recipient: 'Contact destinataire',
        demo: 'Mode demonstration',
        resend: "Renvoyer le code d'acces",
        placeholderCode: "Entrer le code d'acces",
        incorrect: "Code d'acces incorrect.",
        sent: "Code d'acces renvoye au directeur",
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
        secondaryContact: 'Contact secondaire de verification',
        receptionMode: 'Mode de reception',
        number: 'Numero / reference',
        beneficiary: 'Titulaire / beneficiaire',
        instructions: 'Instructions',
        summary: 'Resume des changements',
        saveAll: 'Enregistrer toutes les modifications',
        validationTitle: 'Validation',
        validationText: 'Pour valider toutes les modifications du profil, il suffit d’ecrire "modifier" ci-dessous.',
        validationLabel: 'Ecrire "modifier"',
        cancel: 'Annuler',
        validate: 'Valider',
      };

  const DUREE_CODE_MS = 5 * 60 * 1000;

  const [espaceDebloque, setEspaceDebloque] = useState(false);
  const [codeAcces, setCodeAcces] = useState(genererCode());
  const [codeExpiration, setCodeExpiration] = useState(() => Date.now() + DUREE_CODE_MS);
  const [codeUtilise, setCodeUtilise] = useState(false);
  const [codeAccesSaisi, setCodeAccesSaisi] = useState('');
  const [messageAcces, setMessageAcces] = useState('');
  const [photoProfil, setPhotoProfil] = useState<string | null>(null);

  const [nomAgence, setNomAgence] = useState('Finexs Voyages SARL');
  const [description, setDescription] = useState('Agence interurbaine specialiste des liaisons Douala, Yaounde, Kribi et Bafoussam.');
  const [telephoneAgence, setTelephoneAgence] = useState('6 90 00 11 22');
  const [indicatifAgence, setIndicatifAgence] = useState('+237');
  const [emailAgence, setEmailAgence] = useState('finexs.voyages@gmail.com');
  const [adresseAgence, setAdresseAgence] = useState('Douala, Akwa - Boulevard de la Liberte');
  const [contactDirecteur, setContactDirecteur] = useState('directeur.finexs@gmail.com');
  const [indicatifSecondaire, setIndicatifSecondaire] = useState('+237');
  const [contactSecondaire, setContactSecondaire] = useState('6 99 88 77 66');
  const [modeReception, setModeReception] = useState('Virement bancaire');
  const [numeroReception, setNumeroReception] = useState('+237 6 99 88 77 66');
  const [titulaireReception, setTitulaireReception] = useState('Finexs Voyages SARL');
  const [instructionsReception, setInstructionsReception] = useState('Verifier le numero avant tout virement et conserver la reference de paiement.');

  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [motValidation, setMotValidation] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [modeDemo, setModeDemo] = useState(false);
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [confirmationMdpOuverte, setConfirmationMdpOuverte] = useState(false);
  const [motConfirmationMdp, setMotConfirmationMdp] = useState('');
  const [messageMdpSucces, setMessageMdpSucces] = useState('');

  useEffect(() => {
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
        setModeDemo(false);
      })
      .catch(() => setModeDemo(true));
  }, []);

  const resume = useMemo(
    () => [
      nomAgence,
      `${indicatifAgence} ${telephoneAgence}`,
      emailAgence,
      adresseAgence,
      `${modeReception} · ${numeroReception}`,
      titulaireReception,
    ],
    [nomAgence, telephoneAgence, indicatifAgence, emailAgence, adresseAgence, modeReception, numeroReception, titulaireReception],
  );

  function envoyerCodeAcces() {
    const nouveau = genererCode();
    setCodeAcces(nouveau);
    setCodeExpiration(Date.now() + DUREE_CODE_MS);
    setCodeUtilise(false);
    setMessageAcces(`${t.sent} (${t.demo.toLowerCase()} : ${nouveau}, valable 5 min).`);
  }

  function debloquerEspace() {
    if (codeUtilise) {
      setMessageAcces("Ce code a déjà été utilisé — demande-en un nouveau.");
      return;
    }
    if (Date.now() > codeExpiration) {
      setMessageAcces('Code expiré (validité 5 minutes) — demande-en un nouveau.');
      return;
    }
    if (codeAccesSaisi !== codeAcces) {
      setMessageAcces(t.incorrect);
      return;
    }
    setCodeUtilise(true);
    setEspaceDebloque(true);
    setMessageAcces('');
  }

  function validerEnregistrement() {
    if (motValidation.trim().toLowerCase() !== 'modifier') return;
    setConfirmationOuverte(false);
    setMotValidation('');
    setMessageSucces(t.success);
    window.setTimeout(() => setMessageSucces(''), 2600);
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-extrabold text-ink mb-1">{t.title}</h1>
          {modeDemo && <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2 mb-2 inline-block">Mode démo — lecture réelle indisponible, valeurs d&apos;exemple affichées</div>}
          <p className="text-[13px] text-ink-soft">{t.subtitle}</p>
        </div>

        {!espaceDebloque ? (
          <div className="bg-paper rounded-3xl border border-line p-7 max-w-2xl shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
            <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center text-2xl mb-4">🔐</div>
            <h2 className="text-[20px] font-extrabold text-ink mb-2">{t.protectedTitle}</h2>
            <p className="text-[12px] text-ink-soft mb-5">{t.protectedText}</p>

            <div className="rounded-2xl bg-off-white border border-line p-4 mb-4">
              <p className="text-[11px] font-bold text-ink">{t.recipient}</p>
              <p className="text-[10px] text-ink-soft mt-1">{contactDirecteur}</p>
              <p className="text-[10px] text-ink-soft mt-2">{t.demo} : <strong className="text-ink tracking-[0.2em]">{codeAcces}</strong> — valable 5 min, usage unique</p>
              <button onClick={envoyerCodeAcces} className="mt-3 text-[10px] font-bold text-green-700">{t.resend}</button>
            </div>

            <input
              inputMode="numeric"
              maxLength={8}
              value={codeAccesSaisi}
              onChange={(e) => setCodeAccesSaisi(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder={t.placeholderCode}
              className="w-full rounded-xl px-4 py-3 text-[13px] mb-4"
            />

            {messageAcces && <p className={`text-[11px] mb-4 ${messageAcces.includes('incorrect') || messageAcces.includes('Incorrect') ? 'text-red' : 'text-green-700'}`}>{messageAcces}</p>}

            <button onClick={debloquerEspace} className="rounded-xl bg-green-700 text-white font-bold text-[12px] px-5 py-3">{t.open}</button>
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
                  {photoProfil ? <img src={photoProfil} alt="Logo agence" className="w-full h-full object-cover" /> : <span className="text-2xl text-ink-soft">🏢</span>}
                </div>
                <div>
                  <label className="rounded-xl bg-off-white border border-line text-ink font-bold text-[11px] px-4 py-2.5 cursor-pointer inline-block">
                    Changer la photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => setPhotoProfil(reader.result as string);
                      reader.readAsDataURL(f);
                    }} />
                  </label>
                  {photoProfil && (
                    <button type="button" onClick={() => setPhotoProfil(null)} className="ml-2 rounded-xl bg-red-bg text-red font-bold text-[11px] px-4 py-2.5">Retirer</button>
                  )}
                  <p className="text-[10px] text-ink-soft mt-1.5">⚠️ Démo — aucune route d&apos;upload n&apos;existe côté backend, l&apos;image reste locale à cette session</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.agencyName}</label><input value={nomAgence} onChange={(e) => setNomAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.phone}</label><TelephoneInput indicatif={indicatifAgence} numero={telephoneAgence} onChangeIndicatif={setIndicatifAgence} onChangeNumero={setTelephoneAgence} /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.agencyEmail}</label><input type="email" value={emailAgence} onChange={(e) => setEmailAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.address}</label><input value={adresseAgence} onChange={(e) => setAdresseAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div className="md:col-span-2"><label className="block text-[10px] text-ink-soft mb-1">{t.description}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-[12px] resize-none" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.directorEmail}</label><input type="email" value={contactDirecteur} onChange={(e) => setContactDirecteur(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.secondaryContact}</label><TelephoneInput indicatif={indicatifSecondaire} numero={contactSecondaire} onChangeIndicatif={setIndicatifSecondaire} onChangeNumero={setContactSecondaire} /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.receptionMode}</label><select value={modeReception} onChange={(e) => setModeReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]"><option>Orange Money</option><option>MTN MoMo</option><option>Virement bancaire</option><option>Cash agence</option></select></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.number}</label><input value={numeroReception} onChange={(e) => setNumeroReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.beneficiary}</label><input value={titulaireReception} onChange={(e) => setTitulaireReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-ink-soft mb-1">{t.instructions}</label><textarea value={instructionsReception} onChange={(e) => setInstructionsReception(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-[12px] resize-none" /></div>
              </div>

              <div className="rounded-2xl bg-paper border-2 border-ink p-5 mt-5 shadow-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔒</span>
                  <p className="text-[14px] font-extrabold text-ink">Changer le mot de passe</p>
                </div>
                <p className="text-[11px] text-amber bg-amber-bg rounded-lg px-2.5 py-1.5 mb-3 inline-block">⚠️ Démo — aucune route backend ne permet de modifier le mot de passe pour l&apos;instant.</p>
                <div className="grid md:grid-cols-2 gap-3">
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
                  disabled={!nouveauMdp || nouveauMdp !== confirmationMdp || evaluerMotDePasse(nouveauMdp).score < 2}
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
                onClick={() => {
                  setConfirmationMdpOuverte(false);
                  setMotConfirmationMdp('');
                  setNouveauMdp('');
                  setConfirmationMdp('');
                  setMessageMdpSucces('Mot de passe mis à jour (démo).');
                  window.setTimeout(() => setMessageMdpSucces(''), 2600);
                }}
                disabled={motConfirmationMdp.trim().toUpperCase() !== 'MODIFIER'}
                className="flex-1 rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[11px] py-3"
              >
                Confirmer
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
            <input value={motValidation} onChange={(e) => setMotValidation(e.target.value)} placeholder={t.validationLabel} className="w-full rounded-xl px-4 py-3 text-center text-[13px] font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationOuverte(false)} className="flex-1 rounded-xl bg-off-white text-ink font-bold text-[11px] py-3">{t.cancel}</button>
              <button onClick={validerEnregistrement} disabled={motValidation.trim().toLowerCase() !== 'modifier'} className="flex-1 rounded-xl bg-green-700 disabled:opacity-40 text-white font-bold text-[11px] py-3">{t.validate}</button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
