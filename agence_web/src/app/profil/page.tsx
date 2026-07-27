'use client';

import { useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { useLangue } from '../lib/langue';

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

  const [espaceDebloque, setEspaceDebloque] = useState(false);
  const [codeAcces, setCodeAcces] = useState(genererCode());
  const [codeAccesSaisi, setCodeAccesSaisi] = useState('');
  const [messageAcces, setMessageAcces] = useState('');

  const [nomAgence, setNomAgence] = useState('Finexs Voyages SARL');
  const [description, setDescription] = useState('Agence interurbaine specialiste des liaisons Douala, Yaounde, Kribi et Bafoussam.');
  const [telephoneAgence, setTelephoneAgence] = useState('+237 6 90 00 11 22');
  const [emailAgence, setEmailAgence] = useState('finexs.voyages@gmail.com');
  const [adresseAgence, setAdresseAgence] = useState('Douala, Akwa - Boulevard de la Liberte');
  const [contactDirecteur, setContactDirecteur] = useState('directeur.finexs@gmail.com');
  const [contactSecondaire, setContactSecondaire] = useState('+237 6 99 88 77 66');
  const [modeReception, setModeReception] = useState('Virement bancaire');
  const [numeroReception, setNumeroReception] = useState('+237 6 99 88 77 66');
  const [titulaireReception, setTitulaireReception] = useState('Finexs Voyages SARL');
  const [instructionsReception, setInstructionsReception] = useState('Verifier le numero avant tout virement et conserver la reference de paiement.');

  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [motValidation, setMotValidation] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  const resume = useMemo(
    () => [
      nomAgence,
      telephoneAgence,
      emailAgence,
      adresseAgence,
      `${modeReception} · ${numeroReception}`,
      titulaireReception,
    ],
    [nomAgence, telephoneAgence, emailAgence, adresseAgence, modeReception, numeroReception, titulaireReception],
  );

  function envoyerCodeAcces() {
    const nouveau = genererCode();
    setCodeAcces(nouveau);
    setMessageAcces(`${t.sent} (${t.demo.toLowerCase()} : ${nouveau}).`);
  }

  function debloquerEspace() {
    if (codeAccesSaisi !== codeAcces) {
      setMessageAcces(t.incorrect);
      return;
    }
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
          <h1 className="text-[28px] font-extrabold text-[#14201A] mb-1">{t.title}</h1>
          <p className="text-[13px] text-[#64746C]">{t.subtitle}</p>
        </div>

        {!espaceDebloque ? (
          <div className="bg-white rounded-3xl border border-[#E7ECE8] p-7 max-w-2xl shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
            <div className="w-14 h-14 rounded-full bg-[#14201A] text-white flex items-center justify-center text-2xl mb-4">🔐</div>
            <h2 className="text-[20px] font-extrabold text-[#14201A] mb-2">{t.protectedTitle}</h2>
            <p className="text-[12px] text-[#64746C] mb-5">{t.protectedText}</p>

            <div className="rounded-2xl bg-[#F8FAF8] border border-[#E7ECE8] p-4 mb-4">
              <p className="text-[11px] font-bold text-[#14201A]">{t.recipient}</p>
              <p className="text-[10px] text-[#64746C] mt-1">{contactDirecteur}</p>
              <p className="text-[10px] text-[#8A968F] mt-2">{t.demo} : <strong className="text-[#14201A] tracking-[0.2em]">{codeAcces}</strong></p>
              <button onClick={envoyerCodeAcces} className="mt-3 text-[10px] font-bold text-[#0B9E63]">{t.resend}</button>
            </div>

            <input
              inputMode="numeric"
              maxLength={8}
              value={codeAccesSaisi}
              onChange={(e) => setCodeAccesSaisi(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder={t.placeholderCode}
              className="w-full rounded-xl px-4 py-3 text-[13px] mb-4"
            />

            {messageAcces && <p className={`text-[11px] mb-4 ${messageAcces.includes('incorrect') || messageAcces.includes('Incorrect') ? 'text-[#D9534F]' : 'text-[#0B9E63]'}`}>{messageAcces}</p>}

            <button onClick={debloquerEspace} className="rounded-xl bg-[#0B9E63] text-white font-bold text-[12px] px-5 py-3">{t.open}</button>
          </div>
        ) : (
          <>
            {messageSucces && <div className="rounded-2xl p-3 mb-5 bg-[#0B9E63]/10 border border-[#0B9E63]/20 text-[11px] font-semibold text-[#0B9E63]">{messageSucces}</div>}

            <div className="bg-white rounded-3xl border border-[#E7ECE8] p-6 shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-[18px] font-extrabold text-[#14201A]">{t.general}</h2>
                  <p className="text-[11px] text-[#64746C]">{t.generalText}</p>
                </div>
                <button onClick={() => setEspaceDebloque(false)} className="rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-[11px] px-4 py-2.5">{t.closeArea}</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.agencyName}</label><input value={nomAgence} onChange={(e) => setNomAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.phone}</label><input value={telephoneAgence} onChange={(e) => setTelephoneAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.agencyEmail}</label><input type="email" value={emailAgence} onChange={(e) => setEmailAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.address}</label><input value={adresseAgence} onChange={(e) => setAdresseAgence(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div className="md:col-span-2"><label className="block text-[10px] text-[#64746C] mb-1">{t.description}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-[12px] resize-none" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.directorEmail}</label><input type="email" value={contactDirecteur} onChange={(e) => setContactDirecteur(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.secondaryContact}</label><input value={contactSecondaire} onChange={(e) => setContactSecondaire(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.receptionMode}</label><select value={modeReception} onChange={(e) => setModeReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]"><option>Orange Money</option><option>MTN MoMo</option><option>Virement bancaire</option><option>Cash agence</option></select></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.number}</label><input value={numeroReception} onChange={(e) => setNumeroReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.beneficiary}</label><input value={titulaireReception} onChange={(e) => setTitulaireReception(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[12px]" /></div>
                <div><label className="block text-[10px] text-[#64746C] mb-1">{t.instructions}</label><textarea value={instructionsReception} onChange={(e) => setInstructionsReception(e.target.value)} rows={3} className="w-full rounded-xl px-4 py-3 text-[12px] resize-none" /></div>
              </div>

              <div className="rounded-2xl bg-[#F8FAF8] border border-[#E7ECE8] p-4 mt-5">
                <p className="text-[11px] font-bold text-[#14201A] mb-2">{t.summary}</p>
                <div className="grid md:grid-cols-2 gap-2">{resume.map((ligne) => <p key={ligne} className="text-[10px] text-[#64746C]">• {ligne}</p>)}</div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setConfirmationOuverte(true)} className="rounded-xl bg-[#0B9E63] text-white font-bold text-[12px] px-5 py-3">{t.saveAll}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmationOuverte && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setConfirmationOuverte(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-7 max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-[#E6B84C]/18 flex items-center justify-center mx-auto mb-3 text-lg">✍️</div>
            <p className="text-center text-[16px] font-extrabold text-[#14201A] mb-1">{t.validationTitle}</p>
            <p className="text-center text-[11px] text-[#64746C] mb-4">{t.validationText}</p>
            <input value={motValidation} onChange={(e) => setMotValidation(e.target.value)} placeholder={t.validationLabel} className="w-full rounded-xl px-4 py-3 text-center text-[13px] font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationOuverte(false)} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-[11px] py-3">{t.cancel}</button>
              <button onClick={validerEnregistrement} disabled={motValidation.trim().toLowerCase() !== 'modifier'} className="flex-1 rounded-xl bg-[#0B9E63] disabled:opacity-40 text-white font-bold text-[11px] py-3">{t.validate}</button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
