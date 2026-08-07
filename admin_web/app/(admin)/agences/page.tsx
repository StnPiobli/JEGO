"use client";

// BRANCHÉ SUR LE VRAI BACKEND pour la file de validation :
//   GET /api/admin/agences-en-attente, PUT /api/admin/agences/:id/valider,
//   PUT /api/admin/agences/:id/refuser.
//
// PRÊT À BRANCHER (aucune route backend n'existe encore) :
//   GET  /api/admin/agences?statut=actif|refuse   → listes validées / refusées
//   GET  /api/admin/agences/:id/documents         → pièces envoyées
//   POST /api/admin/agences/:id/demande-pieces    body { pieces }
//   POST /api/admin/agences/:id/message           body { texte }
//   POST /api/admin/agences/:id/rappel
//   PUT  /api/admin/agences/:id/desactiver

import { useEffect, useState } from "react";
import { Panel, BtnMini, Badge, Toast } from "@/components/ui";
import TypeToConfirm from "@/components/TypeToConfirm";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type Agence = {
  id: number | string; nom: string; email: string; telephone: string;
  adresse: string; ville: string; registre_commerce: string; cree_le: string;
};

type AgenceEtat = Agence & { statut: "validee" | "refusee"; aJour?: boolean; motif?: string };

type DocumentAgence = { nom: string; statut: "Vérifié" | "À vérifier"; url?: string };



function avecIndicatif(tel: string): string {
  const nettoye = tel.trim();
  return nettoye.startsWith("+") ? nettoye : `+237 ${nettoye}`;
}


export default function AgencesPage() {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [selection, setSelection] = useState<Agence | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [piecesDemandees, setPiecesDemandees] = useState("");
  const [afficherDemandePieces, setAfficherDemandePieces] = useState(false);
  const [afficherMessage, setAfficherMessage] = useState(false);
  const [messageTexte, setMessageTexte] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [etats, setEtats] = useState<AgenceEtat[]>([]);
  const [documents, setDocuments] = useState<DocumentAgence[]>([]);
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
      setAgences(data.agences || []);
      setSelection((data.agences || [])[0] || null);
      // BRANCHEMENT : listes validées / refusées
      // const actives = await apiFetch("/api/admin/agences?statut=actif");
      // const refusees = await apiFetch("/api/admin/agences?statut=refuse");
      // setEtats([...(actives.agences || []), ...(refusees.agences || [])]);
      setEtats([]);
    } catch (err) {
      setAgences([]);
      setSelection(null);
      setEtats([]);
      setErreur(err instanceof Error ? err.message : "Impossible de charger les agences.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function valider(id: number | string) {
    setActionEnCours(true);
    try {
      await apiFetch(`/api/admin/agences/${id}/valider`, { method: "PUT" });
      await charger();
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
      await apiFetch(`/api/admin/agences/${id}/refuser`, { method: "PUT", body: JSON.stringify({ motif: motifRefus }) });
      setMotifRefus("");
      await charger();
      notifier("Agence refusée");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur de refus");
    } finally {
      setActionEnCours(false);
    }
  }

  async function demanderPieces() {
    if (!piecesDemandees.trim()) { setErreur("Précise les pièces demandées"); return; }
    try {
      // BRANCHEMENT :
      // await apiFetch(`/api/admin/agences/${selection?.id}/demande-pieces`, {
      //   method: "POST", body: JSON.stringify({ pieces: piecesDemandees }),
      // });
      notifier(`Demande envoyée : ${piecesDemandees}`);
      setPiecesDemandees("");
      setAfficherDemandePieces(false);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  async function envoyerMessage() {
    if (!messageTexte.trim()) return;
    try {
      // BRANCHEMENT :
      // await apiFetch(`/api/admin/agences/${detailEtat?.id ?? selection?.id}/message`, {
      //   method: "POST", body: JSON.stringify({ texte: messageTexte }),
      // });
      notifier("Message envoyé");
      setMessageTexte("");
      setAfficherMessage(false);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  async function envoyerRappel(id: number | string, nom: string) {
    try {
      // BRANCHEMENT : await apiFetch(`/api/admin/agences/${id}/rappel`, { method: "POST" });
      void id;
      notifier(`Rappel email envoyé à ${nom}`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  async function desactiver(id: number | string) {
    try {
      // BRANCHEMENT : await apiFetch(`/api/admin/agences/${id}/desactiver`, { method: "PUT" });
      setEtats((prev) => prev.map((a) => (a.id === id ? { ...a, statut: "refusee" as const, motif: "Désactivée manuellement par l'admin" } : a)));
      notifier("Agence désactivée");
      setDetailEtat(null);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la désactivation");
    }
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
        <HistoriqueButton label="Historique des validations" entrees={[]} />
      </div>

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
                {documents.map((d) => (
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
                    {!a.aJour && <BtnMini onClick={() => envoyerRappel(a.id, a.nom)}>📧 Rappel</BtnMini>}
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
            {documents.map((d) => (
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
                Aucun système de stockage de fichiers n&apos;est encore branché côté backend :
                le document envoyé par l&apos;agence n&apos;est pas consultable ici pour l&apos;instant.
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
