'use client';

import { useEffect } from 'react';
import { useLangue } from '../lib/langue';

const EXACT: Record<string, string> = {
  'Espace agence': 'Agency space',
  'Accueil': 'Home',
  'Trajets': 'Trips',
  'Flotte': 'Fleet',
  'Chauffeurs': 'Drivers',
  'Reservations': 'Bookings',
  'Paiements': 'Payments',
  'Statistiques': 'Statistics',
  'Incidents': 'Incidents',
  'Litiges': 'Disputes',
  'Discussion': 'Messages',
  'Profil agence': 'Agency profile',
  'Se deconnecter': 'Sign out',
  'Replier': 'Collapse',
  'Deplier': 'Expand',
  'Tout marquer comme lu': 'Mark all as read',
  'Nouveau litige': 'New dispute',
  'Programme incomplet': 'Incomplete schedule',
  'Versement en attente': 'Pending payout',
  'Un dossier est en cours de traitement par JEGO.': 'A case is currently being reviewed by JEGO.',
  'La programmation est sous le seuil de 14 jours.': 'The schedule is below the 14-day threshold.',
  'Un versement reste bloque dans l’escrow.': 'A payout remains locked in escrow.',
  'Il y a 8 min': '8 min ago',
  'Il y a 35 min': '35 min ago',
  'Il y a 1 h': '1 hour ago',
  'Connexion': 'Login',
  'Mot de passe': 'Password',
  'Mot de passe oublie ?': 'Forgot password?',
  'Se connecter': 'Sign in',
  'Nouvelle agence ?': 'New agency?',
  'Demander une inscription': 'Request signup',
  'Demande d’inscription': 'Signup request',
  "Demande d'inscription": 'Signup request',
  'Nom de l’agence': 'Agency name',
  "Nom de l'agence": 'Agency name',
  'Mail officiel de l’agence': 'Official agency email',
  "Mail officiel de l'agence": 'Official agency email',
  'Mail personnel ou telephone du directeur': 'Director personal email or phone',
  'Annuler': 'Cancel',
  'Envoyer la demande': 'Send request',
  'Demande envoyee': 'Request sent',
  'Fermer': 'Close',
  'Dashboard': 'Dashboard',
  'Bienvenue dans l’espace JEGO.': 'Welcome to the JEGO space.',
  'Langue': 'Language',
  "Trajets aujourd'hui": "Today's trips",
  'Bus dans la flotte': 'Buses in the fleet',
  'En service': 'In service',
  'vs hier': 'vs yesterday',
  'Acceder': 'Open',
  'Ma flotte': 'My fleet',
  'Top destinations': 'Top destinations',
  'Les lignes les plus sollicitees actuellement.': 'The most requested routes right now.',
  'Planifier et suivre les trajets de programmation.': 'Plan and monitor scheduled trips.',
  'Gerer tes bus et leur configuration.': 'Manage your buses and their configuration.',
  'Gere tes bus, leur configuration et leurs equipements.': 'Manage your buses, configuration and equipment.',
  'Gere tes trajets programmes et maintiens ton horizon a jour.': 'Manage scheduled trips and keep your planning horizon up to date.',
  '+ Nouveau bus': '+ New bus',
  'Modifier': 'Edit',
  'Supprimer': 'Delete',
  'Supprimer ce bus ?': 'Delete this bus?',
  'Confirmer': 'Confirm',
  'Nouveau bus': 'New bus',
  'Modifier un bus': 'Edit bus',
  'Retour flotte': 'Back to fleet',
  'Nom du bus': 'Bus name',
  'Disposition': 'Layout',
  'Nombre de rangees': 'Number of rows',
  'Equipements': 'Equipment',
  'Climatisation': 'Air conditioning',
  'Prises USB': 'USB ports',
  'Sieges inclinables': 'Reclining seats',
  'Supplement premium': 'Premium surcharge',
  'Creer le bus': 'Create bus',
  'Mettre a jour le bus': 'Update bus',
  'Enregistrement...': 'Saving...',
  'Plan des sieges': 'Seat map',
  'places au total': 'total seats',
  'Toilettes': 'Restroom',
  'Abime': 'Damaged',
  'Gate': 'Legroom',
  'Premium': 'Premium',
  'Chauffeurs': 'Drivers',
  '+ Nouveau chauffeur': '+ New driver',
  'Cree des comptes chauffeur et suis leurs acces.': 'Create driver accounts and manage their access.',
  'Trier :': 'Sort:',
  'Filtrer :': 'Filter:',
  'Par activite': 'By activity',
  'Alphabetique': 'Alphabetical',
  'Plus recent': 'Newest',
  'Plus ancien': 'Oldest',
  'Tous': 'All',
  'Actifs': 'Active',
  'Desactives': 'Disabled',
  'Actif': 'Active',
  'Desactive': 'Disabled',
  'Aucun chauffeur pour ce filtre.': 'No driver matches this filter.',
  'Voir les acces et missions →': 'View access and assignments →',
  'Chauffeur cree': 'Driver created',
  'Nouveau chauffeur': 'New driver',
  'Prenom': 'First name',
  'Nom': 'Last name',
  'Telephone': 'Phone',
  'Creation...': 'Creating...',
  'Creer et envoyer': 'Create and send',
  'Identifiant': 'Username',
  'Email d’envoi': 'Delivery email',
  "Email d'envoi": 'Delivery email',
  'Statut': 'Status',
  'Desactiver le chauffeur': 'Disable driver',
  'Activer le chauffeur': 'Enable driver',
  'Missions assignees': 'Assigned trips',
  'Aucune mission a venir.': 'No upcoming assignment.',
  'Discussion avec JEGO': 'Chat with JEGO',
  'Tu peux joindre des captures, photos, PDF ou autres documents pour JEGO.': 'You can attach screenshots, photos, PDFs or other documents for JEGO.',
  'Ecris ton message...': 'Write your message...',
  'Ajouter des fichiers': 'Add files',
  'Envoyer': 'Send',
  'Incidents / Litiges': 'Incidents / Disputes',
  'Les incidents sont regroupes par numero de voyage. Clique sur un groupe pour afficher les details.': 'Incidents are grouped by trip number. Click a group to display the details.',
  'Type': 'Type',
  'Ouvert': 'Open',
  'En cours': 'In progress',
  'Resolu': 'Resolved',
  'Retard': 'Delay',
  'Panne': 'Breakdown',
  'Accident': 'Accident',
  'Fraude': 'Fraud',
  'Autre': 'Other',
  'Aucun incident ne correspond a cette date et a ces filtres.': 'No incident matches this date and these filters.',
  'Voyage': 'Trip',
  'depart': 'departure',
  'Litiges non resolus': 'Unresolved disputes',
  "Litiges qui viennent d'etre resolus": 'Recently resolved disputes',
  'du plus ancien au plus recent': 'oldest first',
  'du plus recent au plus ancien': 'newest first',
  'Situation au jour J': 'Day-J situation',
  'En cours de traitement': 'In progress',
  'Resolus (30 jours)': 'Resolved (30 days)',
  'Ajouter des documents supplementaires': 'Add supporting documents',
  'Images, PDF, DOC, DOCX ou TXT.': 'Images, PDF, DOC, DOCX or TXT.',
  'Commentaire pour JEGO...': 'Comment for JEGO...',
  'Envoyer a JEGO': 'Send to JEGO',
  'Verdict JEGO': 'JEGO decision',
  'En votre faveur': 'In your favor',
  "En faveur de l'opposition": 'In favor of the claimant',
  'Contester la decision': 'Appeal the decision',
  'Contestation': 'Appeal',
  'Contestation deja envoyee': 'Appeal already submitted',
  'Ajouter des fichiers (facultatif)': 'Add files (optional)',
  'Envoyer la contestation': 'Submit appeal',
  'Decision favorable : aucune contestation necessaire.': 'Favorable decision: no appeal is needed.',
  'Aucun litige non resolu pour ces filtres.': 'No unresolved dispute matches these filters.',
  'Aucun litige resolu dans cette periode.': 'No resolved dispute in this period.',
  'Montant concerne :': 'Amount involved:',
  'Profil agence': 'Agency profile',
  'Acces protege au profil agence': 'Protected access to the agency profile',
  'Contact destinataire': 'Recipient contact',
  'Mode demonstration': 'Demo mode',
  "Renvoyer le code d'acces": 'Resend access code',
  "Entrer le code d'acces": 'Enter access code',
  'Ouvrir le profil agence': 'Open agency profile',
  'Informations generales': 'General information',
  'Toutes les informations se modifient dans un seul formulaire.': 'All information can be edited in one form.',
  "Refermer l'espace": 'Close profile area',
  'Telephone agence': 'Agency phone',
  'Email agence': 'Agency email',
  'Adresse': 'Address',
  'Description publique': 'Public description',
  'Email personnel du directeur': 'Director personal email',
  'Contact secondaire de verification': 'Secondary verification contact',
  'Mode de reception': 'Reception method',
  'Numero / reference': 'Number / reference',
  'Titulaire / beneficiaire': 'Account holder / beneficiary',
  'Instructions': 'Instructions',
  'Resume des changements': 'Change summary',
  'Enregistrer toutes les modifications': 'Save all changes',
  'Validation': 'Validation',
  'Ecrire "modifier"': 'Type "modify"',
  'Valider': 'Validate',
  'Paiements': 'Payments',
  'Total ce jour': 'Total today',
  'Argent genere': 'Revenue generated',
  'En attente (escrow)': 'Pending (escrow)',
  'Par trajet, en temps reel.': 'By trip, in real time.',
  'Aucun versement ce jour.': 'No payout today.',
  'Cette vue ne montre jamais la marge JEGO ni le prix exact paye par le client.': 'This view never shows JEGO margin or the exact amount paid by the customer.',
  'Reservations': 'Bookings',
  'Facade complete -- aucune route backend pour lister les reservations d’une agence n’existe.': 'Interface only — no backend route currently lists agency bookings.',
  "Facade complete -- aucune route backend pour lister les reservations d'une agence n'existe.": 'Interface only — no backend route currently lists agency bookings.',
  'Aucun trajet programme ce jour-la.': 'No trip scheduled on this date.',
  'Embarques': 'Boarded',
  'Places': 'Seats',
  'Remplissage': 'Occupancy',
  'Statistiques': 'Statistics',
  'Vue d’ensemble de ton activite.': 'Overview of your activity.',
  "Vue d'ensemble de ton activite.": 'Overview of your activity.',
  'Chiffre d’affaires': 'Revenue',
  "Chiffre d'affaires": 'Revenue',
  'Taux de remplissage': 'Occupancy rate',
  'Note moyenne': 'Average rating',
  'Variation sur la semaine precedente': 'Change vs previous week',
  'Evolution du chiffre d’affaires (semaine precedente)': 'Revenue trend (previous week)',
  "Evolution du chiffre d'affaires (semaine precedente)": 'Revenue trend (previous week)',
  'Telecharger un rapport (PDF)': 'Download a report (PDF)',
  'Rapports detailles de 4 pages, chacun limite a sa periode precedente complete.': 'Detailed 4-page reports, each limited to its complete previous period.',
  'Hebdomadaire': 'Weekly',
  'Mensuel': 'Monthly',
  'Annuel': 'Yearly',
  'Trajets': 'Trips',
  'Nouveau trajet': 'New trip',
  'Programmation des trajets': 'Trip scheduling',
  'Date de depart': 'Departure date',
  'Heure de depart': 'Departure time',
  'Ville de depart': 'Departure city',
  'Ville d’arrivee': 'Arrival city',
  "Ville d'arrivee": 'Arrival city',
  'Choisir...': 'Choose...',
  'Choisir un bus...': 'Choose a bus...',
  'Choisir un chauffeur...': 'Choose a driver...',
  'Prix du billet (FCFA)': 'Ticket price (FCFA)',
  'Tarifs additionnels': 'Additional fares',
  'Prix bagage': 'Baggage price',
  'Aucun trajet ce jour-la.': 'No trip on this date.',
  'Signaler ou actualiser un retard': 'Report or update a delay',
  'Minutes de retard': 'Delay in minutes',
  'Le compteur continuera ensuite a evoluer automatiquement.': 'The counter will then continue updating automatically.',
  'Arreter ce trajet ?': 'Stop this trip?',
  'Ville de l’arret...': 'Stop location...',
  "Ville de l'arret...": 'Stop location...',
  'ARRETER': 'STOP',
  'Disponible': 'Available',
  'Vendu en ligne': 'Sold online',
  'Vendu en physique': 'Sold in person',
  'Reserve (verrou 5 min)': 'Reserved (5-minute lock)',
  'Indisponible': 'Unavailable',
  'Vendre un siege au hasard': 'Sell a random seat',
  'Ecran en facade': 'Interface only',
  'Places vendues': 'Seats sold',
  'siege premium': 'premium seat',
  'Un seul billet a la fois. Renseigne les infos du client.': 'One ticket at a time. Enter the customer details.',
  'Nom du client': 'Customer name',
  'Email (pour la confirmation)': 'Email (for confirmation)',
  'Vendre': 'Sell',
  'Siege vendu': 'Seat sold',
  'Retour a la liste': 'Back to list',
  'Membre depuis': 'Member since',
  'Bus :': 'Bus:',
  'Aucun': 'None',
  'Façade uniquement': 'Interface only',
  'Facade uniquement': 'Interface only',
  'Standard': 'Standard',
  'Mixte': 'Mixed',
  'Programmes': 'Scheduled',
  'Termines': 'Completed',
  'Annules': 'Cancelled',
  'En retard': 'Delayed',

  'Categorie': 'Category',
  'Chauffeur': 'Driver',
  'Il recevra ses identifiants par email automatiquement.': 'The driver will automatically receive login details by email.',
  'Inclinables': 'Reclining seats',
  'Mixte (premium au choix)': 'Mixed (optional premium seats)',
  'VIP (tous premium)': 'VIP (all premium)',
  '(optionnel)': '(optional)',
  'Motif facultatif de la contestation...': 'Optional appeal reason...',
  'Le message et les documents sont facultatifs. Tu peux envoyer la contestation sans piece jointe. Une seule contestation est autorisee.': 'The message and documents are optional. You may submit the appeal without an attachment. Only one appeal is allowed.',
  "Une seule contestation est autorisee pour une decision defavorable. Aucun nouvel envoi n'est possible.": 'Only one appeal is allowed for an unfavorable decision. No further submission is possible.',
  'Probleme moteur signale avant le depart.': 'Engine issue reported before departure.',
  'Depart retarde pendant la verification technique.': 'Departure delayed during the technical inspection.',
  'Climatisation faible signalee dans le dernier rang.': 'Weak air conditioning reported in the last row.',
  'Retard lie au trafic a la sortie de Yaounde.': 'Delay caused by traffic when leaving Yaounde.',
  'Tentative de faux embarquement detectee et bloquee.': 'Fraudulent boarding attempt detected and blocked.',
  'Une question, un souci ? Ecris-nous directement et joins des images ou des documents.': 'Have a question or an issue? Message us directly and attach images or documents.',
  'Facade complete -- aucun chat/support reel branche. Reponse simulee ci-dessous.': 'Interface only — no real chat or support is connected. The response below is simulated.',
  "Bonjour ! Comment pouvons-nous t'aider aujourd'hui ? Tu peux aussi nous envoyer des images et des documents si besoin.": 'Hello! How can we help you today? You can also send us images and documents if needed.',
  'Pieces jointes envoyees.': 'Attachments sent.',
  'Merci pour ton message, un conseiller JEGO te repondra bientot.': 'Thank you for your message. A JEGO adviser will reply soon.',
  'sera retire de la liste de la flotte dans cette facade.': 'will be removed from the fleet list in this interface.',
  'Verses': 'Paid',
  'Verse': 'Paid',
  'En attente': 'Pending',
  'Siege': 'Seat',
  'Passager': 'Passenger',
  'Dupliquer ce trajet': 'Duplicate this trip',
  'Dupliquer': 'Duplicate',
  'Creer le trajet': 'Create trip',
  'Ville de depart, ville d’arrivee et prix sont obligatoires.': 'Departure city, arrival city and price are required.',
  "Ville de depart, ville d'arrivee et prix sont obligatoires.": 'Departure city, arrival city and price are required.',
  'Choisis une ville pour chaque arret ajoute (ou retire les arrets vides).': 'Choose a city for each added stop, or remove empty stops.',
  'Creation non branchee pour l’instant (interface uniquement).': 'Creation is not connected yet (interface only).',
  "Creation non branchee pour l'instant (interface uniquement).": 'Creation is not connected yet (interface only).',
  'Point de depart': 'Departure point',
  'Point d’arrivee': 'Arrival point',
  "Point d'arrivee": 'Arrival point',
  'Ajouter un arret': 'Add a stop',
  'Arrets intermediaires': 'Intermediate stops',
  'Categorie du trajet': 'Trip category',
  'Prix bagage (FCFA)': 'Baggage price (FCFA)',
  'Supplement premium (FCFA)': 'Premium surcharge (FCFA)',
  'Heure d’arrivee estimee': 'Estimated arrival time',
  "Heure d'arrivee estimee": 'Estimated arrival time',
  'Heure limite de vente': 'Sales cutoff time',
  'Capacite de vente (%)': 'Sales capacity (%)',
  'Alerte : horizon de programmation sous le seuil (9 jours restants, minimum 14 requis)': 'Alert: scheduling horizon below threshold (9 days remaining, minimum 14 required)',
  'Facade uniquement -- les actions ne sont pas reliees au backend.': 'Interface only — actions are not connected to the backend.',
  'Aucune route backend "vendu en physique" n’existe encore. L’email de confirmation est simule, rien n’est reellement envoye.': 'No backend route for in-person sales exists yet. The confirmation email is simulated and nothing is actually sent.',
  "Aucune route backend \"vendu en physique\" n'existe encore. L'email de confirmation est simule, rien n'est reellement envoye.": 'No backend route for in-person sales exists yet. The confirmation email is simulated and nothing is actually sent.',
  'Vendre un siege au hasard': 'Sell a random seat',
  'Aucun email fourni -- confirmation non envoyee.': 'No email provided — confirmation not sent.',
  'Le code de validation sera envoye uniquement a ce contact.': 'The validation code will be sent only to this contact.',
  'Espace reserve aux agences partenaires JEGO.': 'Reserved for JEGO partner agencies.',
  'Accede a la gestion de tes trajets, ta flotte et tes chauffeurs.': 'Access the management of your trips, fleet and drivers.',
  'Le contact personnel du directeur recevra le code unique de securite a 8 chiffres.': 'The director personal contact will receive the unique 8-digit security code.',
  "JEGO utilisera le mail de l'agence et le contact du directeur pour finaliser l'inscription et transmettre le code de securite.": 'JEGO will use the agency email and director contact to complete registration and send the security code.',
  'Une seule contestation autorisee': 'Only one appeal allowed',
};

const REPLACEMENTS: Array<[string, string]> = [
  [' jours restants', ' days remaining'],
  [' jours', ' days'],
  [' jour', ' day'],
  [' dossier(s)', ' case(s)'],
  [' dossier', ' case'],
  [' litige(s)', ' dispute(s)'],
  [' litige', ' dispute'],
  [' voyage ', ' trip '],
  ['Voyage ', 'Trip '],
  ['Ouvert le ', 'Opened on '],
  ['Decision du ', 'Decision on '],
  ['Montant concerne', 'Amount involved'],
  ['Membre depuis ', 'Member since '],
  ['depart ', 'departure '],
  ['places au total', 'total seats'],
  ['place(s)', 'seat(s)'],
  ['Places vendues', 'Seats sold'],
  ['Semaine precedente', 'Previous week'],
  ['semaine precedente', 'previous week'],
  ['Mois precedent', 'Previous month'],
  ['mois precedent', 'previous month'],
  ['Annee precedente', 'Previous year'],
  ['annee precedente', 'previous year'],
  ['30 derniers jours', 'last 30 days'],
  ['les plus recents d’abord', 'newest first'],
  ["les plus recents d'abord", 'newest first'],
  ['du plus ancien au plus recent', 'oldest first'],
  ['du plus recent au plus ancien', 'newest first'],
  ['En cours de traitement par JEGO', 'Under review by JEGO'],
  ['Resolu', 'Resolved'],
  ['Ouvert', 'Open'],
  ['En cours', 'In progress'],
  ['Retard', 'Delay'],
  ['Panne', 'Breakdown'],
  ['Fraude', 'Fraud'],
  ['Autre', 'Other'],
  ['Annuler', 'Cancel'],
  ['Confirmer', 'Confirm'],
  ['Modifier', 'Edit'],
  ['Supprimer', 'Delete'],
  ['Fermer', 'Close'],
  ['Envoyer', 'Send'],
  ['Ajouter', 'Add'],
  ['Nouveau', 'New'],
  ['Nouvelle', 'New'],
  ['Statut', 'Status'],
  ['Type', 'Type'],
  ['Tous', 'All'],
  ['Aucun', 'No'],
  ['Aucune', 'No'],
  ['aujourd’hui', 'today'],
  ["aujourd'hui", 'today'],
  ['hier', 'yesterday'],
  ['Lun', 'Mon'],
  ['Mar', 'Tue'],
  ['Mer', 'Wed'],
  ['Jeu', 'Thu'],
  ['Ven', 'Fri'],
  ['Sam', 'Sat'],
  ['Dim', 'Sun'],
  ['Jan', 'Jan'],
  ['Fev', 'Feb'],
  ['Avr', 'Apr'],
  ['Mai', 'May'],
  ['Juin', 'Jun'],
  ['Juil', 'Jul'],
  ['Aou', 'Aug'],
  ['Sep', 'Sep'],
  ['Oct', 'Oct'],
  ['Nov', 'Nov'],
  ['Dec', 'Dec'],
];

const ATTRIBUTES = ['placeholder', 'title', 'aria-label'];
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function translateValue(value: string) {
  const leading = value.match(/^\s*/)?.[0] || '';
  const trailing = value.match(/\s*$/)?.[0] || '';
  const core = value.trim();
  if (!core) return value;
  let translated = EXACT[core] || core;
  if (translated === core) {
    for (const [from, to] of REPLACEMENTS) translated = translated.split(from).join(to);
  }
  return `${leading}${translated}${trailing}`;
}

function processNode(root: Node, english: boolean) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script, style, code, pre, [data-no-translate]')) continue;
    const current = node.nodeValue || '';
    if (!originalText.has(node)) originalText.set(node, current);
    let original = originalText.get(node) || '';
    const translatedOriginal = translateValue(original);

    if (english) {
      if (current !== original && current !== translatedOriginal) {
        original = current;
        originalText.set(node, original);
      }
      const nextValue = translateValue(original);
      if (current !== nextValue) node.nodeValue = nextValue;
    } else if (current === translatedOriginal) {
      if (current !== original) node.nodeValue = original;
    } else if (current !== original) {
      originalText.set(node, current);
    }
  }

  const elements: Element[] = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(document.querySelectorAll('*'));
  for (const element of elements) {
    if (element.closest('script, style, code, pre, [data-no-translate]')) continue;
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = new Map();
      originalAttributes.set(element, saved);
    }
    for (const attribute of ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (current == null) continue;
      if (!saved.has(attribute)) saved.set(attribute, current);
      let original = saved.get(attribute) || '';
      const translatedOriginal = translateValue(original);
      if (english) {
        if (current !== original && current !== translatedOriginal) {
          original = current;
          saved.set(attribute, original);
        }
        const nextValue = translateValue(original);
        if (current !== nextValue) element.setAttribute(attribute, nextValue);
      } else if (current === translatedOriginal) {
        if (current !== original) element.setAttribute(attribute, original);
      } else if (current !== original) {
        saved.set(attribute, current);
      }
    }
  }
}

export default function SiteLanguageTranslator() {
  const langue = useLangue();

  useEffect(() => {
    let scheduled = false;
    const apply = () => {
      scheduled = false;
      processNode(document.body, langue === 'en');
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };

    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
    return () => observer.disconnect();
  }, [langue]);

  return null;
}
