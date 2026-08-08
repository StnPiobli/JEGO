"use client";

// ENTIÈREMENT BRANCHÉ SUR LE VRAI BACKEND.
//
// La désactivation d'une agence a des conséquences financières réelles :
//   - trajet pas encore effectué -> billet remboursé intégralement au
//     client (frais JEGO compris) et trajet annulé
//   - trajet déjà effectué ou en cours -> l'agence garde son argent
//   - l'agence est bloquée immédiatement, sans attendre l'expiration de
//     son token (30 jours)
// D'où la double confirmation par mot tapé sur ce bouton.

import { useEffect, useState } from "react";
import { Panel, BtnMini, Badge, Toast } from "@/components/ui";
import TypeToConfirm from "@/components/TypeToConfirm";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch, getToken } from "@/lib/api";

type Agence = {
  id: number | string; nom: string; email: string; telephone: string;
  adresse: string; ville: string; registre_commerce: string; cree_le: string;
};

type AgenceEtat = Agence & {
  statut: "actif" | "refuse" | "suspendu" | "en_attente";
  a_jour?: boolean | null;
  motif_desactivation?: string | null;
  dernier_trajet?: string | null;
  nb_documents?: string | number;
  demandes_ouvertes?: string | number;
};

type DocumentAgence = {
  id: string; type_document: string; nom_fichier: string;
  taille_octets: number; statut: "en_attente" | "verifie" | "refuse";
  televerse_le: string;
};



/** Les identifiants sont des UUID de 36 caractères : illisibles en entier et
 *  ils écrasent le nom de l'agence. Les 8 premiers suffisent à distinguer
 *  deux lignes ; l'identifiant complet reste accessible au survol. */
/** Traduit l'état du programme en phrase lisible. Un badge "en retard" sans
 *  précision oblige à aller chercher l'information ailleurs. */
function etatProgramme(a: AgenceEtat): { texte: string; alerte: boolean } {
  if (a.a_jour) return { texte: "À jour", alerte: false };
  if (!a.dernier_trajet) return { texte: "Aucun trajet publié", alerte: true };

  const dernier = new Date(a.dernier_trajet);
  const aujourdhui = new Date();
  dernier.setHours(0, 0, 0, 0);
  aujourdhui.setHours(0, 0, 0, 0);
  const jours = Math.round((dernier.getTime() - aujourdhui.getTime()) / 86400000);

  if (jours < 0) return { texte: `Programme épuisé depuis ${Math.abs(jours)} j`, alerte: true };
  if (jours === 0) return { texte: "Plus rien après aujourd'hui", alerte: true };
  return { texte: `Plus que ${jours} j de programme`, alerte: true };
}

function idCourt(id: number | string): string {
  return String(id).slice(0, 8);
}

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
  const [motifDesactivation, setMotifDesactivation] = useState("");

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
      const toutes = await apiFetch("/api/admin/agences");
      setEtats((toutes.agences || []).filter((a: AgenceEtat) => a.statut !== "en_attente"));
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

  // Les documents suivent l'agence consultée (dossier en attente ou fiche
  // ouverte depuis les listes validées/refusées).
  const agenceConsultee = detailEtat?.id ?? selection?.id ?? null;
  useEffect(() => {
    if (!agenceConsultee) { setDocuments([]); return; }
    let annule = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/admin/agences/${agenceConsultee}/documents`);
        if (!annule) setDocuments(res.documents || []);
      } catch {
        if (!annule) setDocuments([]);
      }
    })();
    return () => { annule = true; };
  }, [agenceConsultee]);

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
      await apiFetch(`/api/admin/agences/${detailEtat?.id ?? selection?.id}/demande-pieces`, {
        method: "POST", body: JSON.stringify({ pieces: piecesDemandees }),
      });
      notifier("Demande envoyée à l'agence (email + espace agence)");
      setPiecesDemandees("");
      setAfficherDemandePieces(false);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  async function envoyerMessage() {
    if (!messageTexte.trim()) return;
    try {
      await apiFetch(`/api/admin/agences/${detailEtat?.id ?? selection?.id}/message`, {
        method: "POST", body: JSON.stringify({ texte: messageTexte }),
      });
      notifier("Message envoyé");
      setMessageTexte("");
      setAfficherMessage(false);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  async function envoyerRappel(id: number | string, nom: string) {
    try {
      await apiFetch(`/api/admin/agences/${id}/rappel`, { method: "POST" });
      notifier(`Rappel envoyé à ${nom}`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  async function desactiver(id: number | string) {
    try {
      const res = await apiFetch(`/api/admin/agences/${id}/desactiver`, {
        method: "PUT",
        body: JSON.stringify({ motif: motifDesactivation.trim() || null }),
      });
      setMotifDesactivation("");
      await charger();
      notifier(
        res.billets_rembourses > 0
          ? `Agence désactivée — ${res.billets_rembourses} billet(s) remboursé(s) pour ${res.montant_rembourse} F`
          : "Agence désactivée — aucun billet à rembourser"
      );
      setDetailEtat(null);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la désactivation");
    }
  }

  async function statuerDocument(docId: string, statut: "verifie" | "refuse") {
    try {
      await apiFetch(`/api/admin/agences/${agenceConsultee}/documents/${docId}`, {
        method: "PUT", body: JSON.stringify({ statut }),
      });
      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, statut } : d)));
      notifier(statut === "verifie" ? "Document vérifié" : "Document refusé");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  const validees = etats.filter((a) => a.statut === "actif");
  // Une agence refusée à l'inscription et une agence désactivée après coup
  // n'ont pas la même histoire, mais toutes deux sont hors service.
  const refusees = etats.filter((a) => a.statut === "refuse" || a.statut === "suspendu");

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
                      <span className="font-mono text-[10.5px] text-ink-soft" title={String(a.id)}>#{idCourt(a.id)}</span> <b>{a.nom}</b><br />
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
                <div className="kv"><span>ID</span><span className="font-mono font-semibold" title={String(selection.id)}>#{idCourt(selection.id)}</span></div>
                <div className="kv"><span>Email</span><span className="font-semibold">{selection.email}</span></div>
                <div className="kv"><span>Téléphone</span><span className="font-semibold">{avecIndicatif(selection.telephone)}</span></div>
                <div className="kv"><span>Adresse</span><span className="font-semibold">{selection.adresse}</span></div>
                <div className="kv"><span>Ville</span><span className="font-semibold">{selection.ville}</span></div>
                <div className="kv"><span>Registre de commerce</span><span className="font-mono font-semibold">{selection.registre_commerce}</span></div>

                <div className="font-display text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft mt-4 mb-2">
                  Documents envoyés
                </div>
                {documents.length === 0 && (
                  <div className="text-[12px] text-ink-soft italic mb-2">
                    Aucun document envoyé. Utilise « Demande de pièces » pour en réclamer.
                  </div>
                )}
                {documents.map((d) => (
                  <div key={d.id} className="border border-line rounded-lg px-3.5 py-2.5 mb-2 text-[12.5px]">
                    <div className="flex justify-between items-center">
                      <span>📄 {d.type_document}</span>
                      <Badge color={d.statut === "verifie" ? "green" : d.statut === "refuse" ? "red" : "amber"}>
                        {d.statut === "verifie" ? "Vérifié" : d.statut === "refuse" ? "Refusé" : "À vérifier"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-ink-soft mt-0.5">
                      {d.nom_fichier} · {Math.round(d.taille_octets / 1024)} Ko · {new Date(d.televerse_le).toLocaleDateString("fr-FR")}
                    </div>
                    <div className="mt-1.5">
                      <BtnMini onClick={() => setDocumentOuvert(d.id)}>Ouvrir</BtnMini>
                      {d.statut !== "verifie" && <BtnMini variant="primary" onClick={() => statuerDocument(d.id, "verifie")}>Valider</BtnMini>}
                      {d.statut !== "refuse" && <BtnMini variant="danger" onClick={() => statuerDocument(d.id, "refuse")}>Refuser</BtnMini>}
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
                    <span className="font-mono text-[10.5px] text-ink-soft" title={String(a.id)}>#{idCourt(a.id)}</span> <b>{a.nom}</b><br />
                    <span className="text-ink-soft text-[11.5px]">{a.ville}</span><br />
                    <span className="text-ink-soft text-[11px] font-mono">{avecIndicatif(a.telephone)} · {a.email}</span>
                  </td>
                  <td className="px-[18px] py-2.5"><Badge color={a.a_jour ? "green" : "amber"}>{etatProgramme(a).texte}</Badge></td>
                  <td className="px-[18px] py-2.5" onClick={(e) => e.stopPropagation()}>
                    {!a.a_jour && <BtnMini onClick={() => envoyerRappel(a.id, a.nom)}>📧 Rappel</BtnMini>}
                    <TypeToConfirm
                      titre={`Désactiver ${a.nom} ?`}
                      message="Ses trajets à venir seront annulés et les billets déjà vendus dessus intégralement remboursés aux clients, frais JEGO compris. Les trajets déjà effectués restent payés à l'agence. L'agence est bloquée immédiatement et verra le motif à sa prochaine connexion."
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
                    <span className="font-mono text-[10.5px] text-ink-soft" title={String(a.id)}>#{idCourt(a.id)}</span> <b>{a.nom}</b><br />
                    <span className="text-ink-soft text-[11.5px]">{a.ville}</span><br />
                    <span className="text-ink-soft text-[11px] font-mono">{avecIndicatif(a.telephone)} · {a.email}</span>
                  </td>
                  <td className="px-[18px] py-2.5 text-[12.5px] text-red">{a.statut === "suspendu" ? (a.motif_desactivation || "Désactivée par JEGO") : "Inscription refusée"}</td>
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
            <div className="kv"><span>ID</span><span className="font-mono font-semibold" title={String(detailEtat.id)}>#{idCourt(detailEtat.id)}</span></div>
            <div className="kv"><span>Email</span><span className="font-semibold">{detailEtat.email}</span></div>
            <div className="kv"><span>Téléphone</span><span className="font-semibold">{avecIndicatif(detailEtat.telephone)}</span></div>
            <div className="kv"><span>Adresse</span><span className="font-semibold">{detailEtat.adresse}</span></div>
            <div className="kv"><span>Ville</span><span className="font-semibold">{detailEtat.ville}</span></div>
            <div className="kv"><span>Registre de commerce</span><span className="font-mono font-semibold">{detailEtat.registre_commerce}</span></div>
            <div className="kv"><span>Inscrite le</span><span className="font-semibold">{new Date(detailEtat.cree_le).toLocaleDateString("fr-FR")}</span></div>

            <div className="font-display text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft mt-3 mb-2">Documents</div>
            {documents.length === 0 && (
              <div className="text-[11.5px] text-ink-soft italic mb-1.5">Aucun document envoyé</div>
            )}
            {documents.map((d) => (
              <div key={d.id} className="border border-line rounded-lg px-3 py-2 flex justify-between items-center mb-1.5 text-[12px]">
                <span>📄 {d.type_document}</span>
                <div className="flex items-center gap-1.5">
                  <Badge color={d.statut === "verifie" ? "green" : d.statut === "refuse" ? "red" : "amber"}>
                    {d.statut === "verifie" ? "Vérifié" : d.statut === "refuse" ? "Refusé" : "À vérifier"}
                  </Badge>
                  <BtnMini onClick={() => setDocumentOuvert(d.id)}>Ouvrir</BtnMini>
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
              <div className="mt-4">
                {detailEtat.statut === "actif" && (
                  <input
                    value={motifDesactivation}
                    onChange={(e) => setMotifDesactivation(e.target.value)}
                    placeholder="Motif de désactivation (optionnel, visible par l'agence)"
                    className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-[12.5px] mb-2"
                  />
                )}
                <div className="flex flex-wrap gap-1.5">
                <BtnMini onClick={() => setAfficherMessage(true)}>💬 Message</BtnMini>
                {detailEtat.statut === "actif" ? (
                  <TypeToConfirm
                    titre={`Désactiver ${detailEtat.nom} ?`}
                    message="Ses trajets à venir seront annulés et les billets déjà vendus dessus intégralement remboursés aux clients, frais JEGO compris. Les trajets déjà effectués restent payés à l'agence. L'agence est bloquée immédiatement."
                    mot="désactiver"
                    danger
                    onConfirm={() => desactiver(detailEtat.id)}
                    trigger={(open) => <BtnMini variant="danger" onClick={open}>Désactiver</BtnMini>}
                  />
                ) : (
                  <span className="text-[11.5px] text-ink-soft italic self-center">Doit refaire une demande d&apos;inscription — pas de réactivation directe</span>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {documentOuvert && (() => {
        const doc = documents.find((d) => d.id === documentOuvert);
        if (!doc) return null;
        // Le fichier est servi par une route protégée : le token voyage en
        // paramètre car un <iframe> ne peut pas porter d'en-tête Authorization.
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/agences/${agenceConsultee}/documents/${doc.id}/fichier?token=${encodeURIComponent(getToken() || "")}`;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setDocumentOuvert(null)}>
            <div className="bg-paper rounded-2xl shadow-card p-6 w-[720px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-display text-[15px] font-semibold">📄 {doc.type_document}</h3>
                  <div className="text-[11.5px] text-ink-soft">{doc.nom_fichier} · {Math.round(doc.taille_octets / 1024)} Ko</div>
                </div>
                <button onClick={() => setDocumentOuvert(null)} className="text-ink-soft text-xs">✕</button>
              </div>
              <iframe src={url} className="w-full h-[62vh] rounded-xl border border-line" title={doc.nom_fichier} />
              <div className="mt-3 flex gap-1.5">
                <a href={url} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-green-500 text-green-700">
                  Ouvrir dans un onglet
                </a>
                {doc.statut !== "verifie" && <BtnMini variant="primary" onClick={() => statuerDocument(doc.id, "verifie")}>Valider</BtnMini>}
                {doc.statut !== "refuse" && <BtnMini variant="danger" onClick={() => statuerDocument(doc.id, "refuse")}>Refuser</BtnMini>}
              </div>
            </div>
          </div>
        );
      })()}

      <Toast message={toast} />
    </div>
  );
}
