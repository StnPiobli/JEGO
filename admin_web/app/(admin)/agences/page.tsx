"use client";

// ✅ Validation en attente branchée sur le vrai backend (repli démo si injoignable).
// ⚠️ TOUT LE RESTE EST DÉMO : statut "à jour", rappel email, demande de pièces,
// documents, message, réactivation/désactivation — aucune route backend
// correspondante n'existe. IDs affichés = IDs réels quand branché, factices sinon.

import { useEffect, useState } from "react";
import { Panel, BtnMini, Badge, ToastDemo } from "@/components/ui";
import TypeToConfirm from "@/components/TypeToConfirm";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type Agence = {
  id: number | string; nom: string; email: string; telephone: string;
  adresse: string; ville: string; registre_commerce: string; cree_le: string;
};

type AgenceEtat = Agence & { statut: "validee" | "refusee"; aJour?: boolean; motif?: string };

const demoAgences: Agence[] = [
  { id: "demo-1", nom: "Voyages Étoile du Sud", email: "contact@etoiledusud.cm", telephone: "+237 6 99 xx xx 21", adresse: "Carrefour Marché B", ville: "Bafoussam", registre_commerce: "RC/BAF/2024/B/0451", cree_le: new Date().toISOString() },
  { id: "demo-2", nom: "Rapid'Bus Cameroun", email: "info@rapidbus.cm", telephone: "+237 6 71 xx xx 09", adresse: "Rond-point Commercial", ville: "Bamenda", registre_commerce: "RC/BDA/2024/B/0198", cree_le: new Date().toISOString() },
];

const documentsDemo = [
  { nom: "Registre de commerce", statut: "Vérifié" as const },
  { nom: "Assurance flotte", statut: "Vérifié" as const },
  { nom: "Autorisation de transport", statut: "À vérifier" as const },
];

function avecIndicatif(tel: string): string {
  const nettoye = tel.trim();
  return nettoye.startsWith("+") ? nettoye : `+237 ${nettoye}`;
}

const etatsInitiaux: AgenceEtat[] = [
  { id: 101, nom: "Touristique Express", email: "contact@touristiqueexpress.cm", telephone: "+237 6 77 xx xx 01", adresse: "Akwa, Rue de la Joie", ville: "Douala", registre_commerce: "RC/DLA/2022/B/0087", cree_le: "2024-03-12", statut: "validee", aJour: true },
  { id: 102, nom: "Nuit Express", email: "contact@nuitexpress.cm", telephone: "+237 6 90 xx xx 14", adresse: "Bastos, Av. Kennedy", ville: "Yaoundé", registre_commerce: "RC/YAO/2023/B/0212", cree_le: "2024-06-02", statut: "validee", aJour: true },
  { id: 103, nom: "Général Voyages", email: "contact@generalvoyages.cm", telephone: "+237 6 55 xx xx 33", adresse: "Bonanjo, Bd de la Liberté", ville: "Douala", registre_commerce: "RC/DLA/2023/B/0301", cree_le: "2024-01-20", statut: "validee", aJour: false },
  { id: 104, nom: "TransCam Rapide", email: "contact@transcam.cm", telephone: "+237 6 80 xx xx 45", adresse: "Centre-ville", ville: "Garoua", registre_commerce: "RC/GAR/2024/B/0055", cree_le: "2025-05-01", statut: "refusee", motif: "Registre de commerce expiré" },
  { id: 105, nom: "Bus 237", email: "contact@bus237.cm", telephone: "+237 6 60 xx xx 12", adresse: "Bonabéri", ville: "Douala", registre_commerce: "RC/DLA/2024/B/0410", cree_le: "2025-08-14", statut: "refusee", motif: "Assurance flotte manquante" },
];

export default function AgencesPage() {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [selection, setSelection] = useState<Agence | null>(null);
  const [chargement, setChargement] = useState(true);
  const [modeDemo, setModeDemo] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [piecesDemandees, setPiecesDemandees] = useState("");
  const [afficherDemandePieces, setAfficherDemandePieces] = useState(false);
  const [afficherMessage, setAfficherMessage] = useState(false);
  const [messageTexte, setMessageTexte] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [etats, setEtats] = useState(etatsInitiaux);
  const [detailEtat, setDetailEtat] = useState<AgenceEtat | null>(null);
  const [documentOuvert, setDocumentOuvert] = useState<string | null>(null);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/admin/agences-en-attente");
      setAgences(data.agences);
      setSelection(data.agences[0] || null);
      setModeDemo(false);
    } catch {
      setAgences(demoAgences);
      setSelection(demoAgences[0]);
      setModeDemo(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function valider(id: number | string) {
    setActionEnCours(true);
    try {
      if (modeDemo) {
        setAgences((prev: Agence[]) => prev.filter((a) => a.id !== id));
        setSelection(null);
      } else {
        await apiFetch(`/api/admin/agences/${id}/valider`, { method: "PUT" });
        await charger();
      }
      notifier("Agence validée");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de validation");
    } finally {
      setActionEnCours(false);
    }
  }

  async function refuser(id: number | string) {
    if (!motifRefus.trim()) { setErreur("Le motif de refus est obligatoire"); return; }
    setActionEnCours(true);
    try {
      if (modeDemo) {
        setAgences((prev: Agence[]) => prev.filter((a) => a.id !== id));
        setSelection(null);
        setMotifRefus("");
      } else {
        await apiFetch(`/api/admin/agences/${id}/refuser`, { method: "PUT", body: JSON.stringify({ motif: motifRefus }) });
        setMotifRefus("");
        await charger();
      }
      notifier("Agence refusée");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de refus");
    } finally {
      setActionEnCours(false);
    }
  }

  function demanderPieces() {
    if (!piecesDemandees.trim()) { setErreur("Précise les pièces demandées"); return; }
    notifier(`Demande envoyée (démo) : ${piecesDemandees}`);
    setPiecesDemandees("");
    setAfficherDemandePieces(false);
  }

  function envoyerMessage() {
    if (!messageTexte.trim()) return;
    notifier("Message envoyé (démo) — aucune messagerie réelle n'existe encore côté backend");
    setMessageTexte("");
    setAfficherMessage(false);
  }

  function envoyerRappel(nom: string) {
    notifier(`Rappel email envoyé à ${nom} (démo)`);
  }

  function desactiver(id: number | string) {
    setEtats((prev) => prev.map((a) => (a.id === id ? { ...a, statut: "refusee" as const, motif: "Désactivée manuellement par l'admin" } : a)));
    notifier("Agence désactivée (démo)");
    setDetailEtat(null);
  }

  const validees = etats.filter((a) => a.statut === "validee");
  const refusees = etats.filter((a) => a.statut === "refusee");

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Agences</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">{agences.length} agence(s) en attente de validation</div>
        </div>
        <HistoriqueButton
          label="Historique des validations"
          entrees={[
            { heure: "09:14", action: "Agence validée — Voyages Étoile du Sud", auteur: "s.piobli" },
            { heure: "hier 16:02", action: "Agence refusée — Bus 237", auteur: "s.piobli" },
            { heure: "hier 11:20", action: "Demande de pièces envoyée — Rapid'Bus Cameroun", auteur: "s.piobli" },
          ]}
        />
      </div>

      {modeDemo && <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2 mb-4">Mode démo — backend injoignable, données factices</div>}
      {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

      {!chargement && agences.length > 0 && (
        <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-6">
          <Panel title="Dossiers en attente">
            <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
              <tbody>
                {agences.map((a) => (
                  <tr key={a.id} onClick={() => setSelection(a)} className={`border-t border-line first:border-t-0 cursor-pointer hover:bg-green-500/5 ${selection?.id === a.id ? "bg-green-500/10" : ""}`}>
                    <td className="px-[18px] py-3 text-[13px]">
                      <span className="font-mono text-[10.5px] text-ink-soft">#{a.id}</span> <b>{a.nom}</b><br />
                      <span className="text-ink-soft text-[11.5px]">{a.ville} · inscrite le {new Date(a.cree_le).toLocaleDateString("fr-FR")}</span><br />
                      <span className="text-ink-soft text-[11.5px] font-mono">{avecIndicatif(a.telephone)} · {a.email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          </Panel>

          {selection && (
            <Panel title={`Dossier — ${selection.nom}`}>
              <div className="px-[18px] py-4">
                <div className="kv"><span>ID</span><span className="font-mono font-semibold">#{selection.id}</span></div>
                <div className="kv"><span>Email</span><span className="font-semibold">{selection.email}</span></div>
                <div className="kv"><span>Téléphone</span><span className="font-semibold">{avecIndicatif(selection.telephone)}</span></div>
                <div className="kv"><span>Adresse</span><span className="font-semibold">{selection.adresse}</span></div>
                <div className="kv"><span>Ville</span><span className="font-semibold">{selection.ville}</span></div>
                <div className="kv"><span>Registre de commerce</span><span className="font-mono font-semibold">{selection.registre_commerce}</span></div>

                <div className="font-display text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft mt-4 mb-2">
                  Documents envoyés
                </div>
                {documentsDemo.map((d) => (
                  <div key={d.nom} className="border border-line rounded-lg px-3.5 py-2.5 flex justify-between items-center mb-2 text-[12.5px]">
                    <span>📄 {d.nom}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge color={d.statut === "Vérifié" ? "green" : "amber"}>{d.statut}</Badge>
                      <BtnMini onClick={() => setDocumentOuvert(d.nom)}>Ouvrir</BtnMini>
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <BtnMini variant="primary" onClick={() => !actionEnCours && valider(selection.id)}>✅ Valider l&apos;agence</BtnMini>
                  <BtnMini onClick={() => setAfficherDemandePieces((v) => !v)}>📎 Demande de pièces complémentaires</BtnMini>
                </div>

                {afficherDemandePieces && (
                  <div className="mt-3 pt-3 border-t border-dashed border-line">
                    <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Quelles pièces ?</label>
                    <textarea value={piecesDemandees} onChange={(e) => setPiecesDemandees(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm mb-2" rows={2} placeholder="Ex : assurance flotte à jour, autorisation de transport…" />
                    <BtnMini variant="primary" onClick={demanderPieces}>Envoyer la demande</BtnMini>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-dashed border-line">
                  <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Motif de refus (obligatoire pour refuser)</label>
                  <textarea value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm mb-2" rows={2} />
                  <BtnMini variant="danger" onClick={() => !actionEnCours && refuser(selection.id)}>Refuser</BtnMini>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Panel title={`Agences validées (${validees.length})`}>
          <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
            <tbody>
              {validees.map((a) => (
                <tr key={a.id} className="border-t border-line first:border-t-0 hover:bg-green-500/5 cursor-pointer" onClick={() => setDetailEtat(a)}>
                  <td className="px-[18px] py-2.5 text-[13px]">
                    <span className="font-mono text-[10.5px] text-ink-soft">#{a.id}</span> <b>{a.nom}</b><br />
                    <span className="text-ink-soft text-[11.5px]">{a.ville}</span><br />
                    <span className="text-ink-soft text-[11px] font-mono">{avecIndicatif(a.telephone)} · {a.email}</span>
                  </td>
                  <td className="px-[18px] py-2.5"><Badge color={a.aJour ? "green" : "amber"}>{a.aJour ? "À jour" : "En retard sur son programme"}</Badge></td>
                  <td className="px-[18px] py-2.5" onClick={(e) => e.stopPropagation()}>
                    {!a.aJour && <BtnMini onClick={() => envoyerRappel(a.nom)}>📧 Rappel</BtnMini>}
                    <TypeToConfirm
                      titre={`Désactiver ${a.nom} ?`}
                      message="L'agence sera immédiatement retirée de l'app (ses trajets disparaissent) et sera déconnectée de son espace agence avec le message « Vous avez été déconnecté par JEGO »."
                      mot="désactiver"
                      danger
                      onConfirm={() => desactiver(a.id)}
                      trigger={(open) => <BtnMini variant="danger" onClick={open}>Désactiver</BtnMini>}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </Panel>
        <Panel title={`Agences refusées (${refusees.length})`}>
          <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
            <tbody>
              {refusees.map((a) => (
                <tr key={a.id} className="border-t border-line first:border-t-0 hover:bg-green-500/5 cursor-pointer" onClick={() => setDetailEtat(a)}>
                  <td className="px-[18px] py-2.5 text-[13px]">
                    <span className="font-mono text-[10.5px] text-ink-soft">#{a.id}</span> <b>{a.nom}</b><br />
                    <span className="text-ink-soft text-[11.5px]">{a.ville}</span><br />
                    <span className="text-ink-soft text-[11px] font-mono">{avecIndicatif(a.telephone)} · {a.email}</span>
                  </td>
                  <td className="px-[18px] py-2.5 text-[12.5px] text-red">{a.motif}</td>
                  <td className="px-[18px] py-2.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-ink-soft italic">Doit refaire une demande d&apos;inscription</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </Panel>
      </div>

      {detailEtat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setDetailEtat(null)}>
          <div className="bg-paper rounded-2xl shadow-card p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-display text-[15px] font-semibold">{detailEtat.nom}</h3>
              <button onClick={() => setDetailEtat(null)} className="text-ink-soft text-xs">✕</button>
            </div>
            <div className="kv"><span>ID</span><span className="font-mono font-semibold">#{detailEtat.id}</span></div>
            <div className="kv"><span>Email</span><span className="font-semibold">{detailEtat.email}</span></div>
            <div className="kv"><span>Téléphone</span><span className="font-semibold">{avecIndicatif(detailEtat.telephone)}</span></div>
            <div className="kv"><span>Adresse</span><span className="font-semibold">{detailEtat.adresse}</span></div>
            <div className="kv"><span>Ville</span><span className="font-semibold">{detailEtat.ville}</span></div>
            <div className="kv"><span>Registre de commerce</span><span className="font-mono font-semibold">{detailEtat.registre_commerce}</span></div>
            <div className="kv"><span>Inscrite le</span><span className="font-semibold">{new Date(detailEtat.cree_le).toLocaleDateString("fr-FR")}</span></div>

            <div className="font-display text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft mt-3 mb-2">Documents</div>
            {documentsDemo.map((d) => (
              <div key={d.nom} className="border border-line rounded-lg px-3 py-2 flex justify-between items-center mb-1.5 text-[12px]">
                <span>📄 {d.nom}</span>
                <div className="flex items-center gap-1.5">
                  <Badge color={d.statut === "Vérifié" ? "green" : "amber"}>{d.statut}</Badge>
                  <BtnMini onClick={() => setDocumentOuvert(d.nom)}>Ouvrir</BtnMini>
                </div>
              </div>
            ))}

            {afficherMessage ? (
              <div className="mt-3 pt-3 border-t border-dashed border-line">
                <textarea value={messageTexte} onChange={(e) => setMessageTexte(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm mb-2" rows={3} placeholder="Ton message à l'agence…" />
                <BtnMini variant="primary" onClick={envoyerMessage}>Envoyer</BtnMini>
                <BtnMini onClick={() => setAfficherMessage(false)}>Annuler</BtnMini>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-1.5">
                <BtnMini onClick={() => setAfficherMessage(true)}>💬 Message</BtnMini>
                {detailEtat.statut === "validee" ? (
                  <TypeToConfirm
                    titre={`Désactiver ${detailEtat.nom} ?`}
                    message="L'agence sera immédiatement retirée de l'app (ses trajets disparaissent) et sera déconnectée de son espace agence avec le message « Vous avez été déconnecté par JEGO »."
                    mot="désactiver"
                    danger
                    onConfirm={() => desactiver(detailEtat.id)}
                    trigger={(open) => <BtnMini variant="danger" onClick={open}>Désactiver</BtnMini>}
                  />
                ) : (
                  <span className="text-[11.5px] text-ink-soft italic self-center">Doit refaire une demande d&apos;inscription — pas de réactivation directe</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {documentOuvert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setDocumentOuvert(null)}>
          <div className="bg-paper rounded-2xl shadow-card p-6 w-[440px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-display text-[15px] font-semibold">📄 {documentOuvert}</h3>
              <button onClick={() => setDocumentOuvert(null)} className="text-ink-soft text-xs">✕</button>
            </div>
            <div className="border-2 border-dashed border-line rounded-xl h-[260px] flex items-center justify-center text-center px-6">
              <div className="text-ink-soft text-[12.5px]">
                Aperçu factice — démo uniquement.<br />
                Aucun système de stockage/upload de fichiers n&apos;existe encore côté backend ;
                le vrai document PDF/image de l&apos;agence n&apos;est pas accessible ici pour l&apos;instant.
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastDemo message={toast} />
    </div>
  );
}
