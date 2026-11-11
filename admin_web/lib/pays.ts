// Tous les pays, pour l'indicatif téléphonique. Généré depuis la liste de
// l'application mobile (jego_mobile/lib/widgets/pays_liste.dart) : les
// trois espaces proposent exactement les mêmes pays.
//
// max / min : longueur du numéro national. Les îles du plan nord-américain
// ont leur indicatif complet (+1268…) ; « +1 » seul reste aux États-Unis
// et au Canada.

export type Pays = { nom: string; indicatif: string; code: string; max: number; min: number };

const TOUS: Pays[] = [
  { nom: "Afghanistan", indicatif: '+93', code: 'AF', max: 9, min: 9 },
  { nom: "Afrique du Sud", indicatif: '+27', code: 'ZA', max: 9, min: 9 },
  { nom: "Albanie", indicatif: '+355', code: 'AL', max: 9, min: 8 },
  { nom: "Algérie", indicatif: '+213', code: 'DZ', max: 9, min: 9 },
  { nom: "Allemagne", indicatif: '+49', code: 'DE', max: 11, min: 7 },
  { nom: "Andorre", indicatif: '+376', code: 'AD', max: 9, min: 6 },
  { nom: "Angola", indicatif: '+244', code: 'AO', max: 9, min: 9 },
  { nom: "Antigua-et-Barbuda", indicatif: '+1268', code: 'AG', max: 7, min: 7 },
  { nom: "Arabie saoudite", indicatif: '+966', code: 'SA', max: 9, min: 9 },
  { nom: "Argentine", indicatif: '+54', code: 'AR', max: 11, min: 10 },
  { nom: "Arménie", indicatif: '+374', code: 'AM', max: 8, min: 8 },
  { nom: "Australie", indicatif: '+61', code: 'AU', max: 9, min: 9 },
  { nom: "Autriche", indicatif: '+43', code: 'AT', max: 13, min: 7 },
  { nom: "Azerbaïdjan", indicatif: '+994', code: 'AZ', max: 9, min: 9 },
  { nom: "Bahamas", indicatif: '+1242', code: 'BS', max: 7, min: 7 },
  { nom: "Bahreïn", indicatif: '+973', code: 'BH', max: 8, min: 8 },
  { nom: "Bangladesh", indicatif: '+880', code: 'BD', max: 10, min: 10 },
  { nom: "Barbade", indicatif: '+1246', code: 'BB', max: 7, min: 7 },
  { nom: "Belgique", indicatif: '+32', code: 'BE', max: 9, min: 8 },
  { nom: "Belize", indicatif: '+501', code: 'BZ', max: 7, min: 7 },
  { nom: "Bénin", indicatif: '+229', code: 'BJ', max: 10, min: 8 },
  { nom: "Bhoutan", indicatif: '+975', code: 'BT', max: 8, min: 7 },
  { nom: "Biélorussie", indicatif: '+375', code: 'BY', max: 9, min: 9 },
  { nom: "Birmanie", indicatif: '+95', code: 'MM', max: 10, min: 7 },
  { nom: "Bolivie", indicatif: '+591', code: 'BO', max: 8, min: 8 },
  { nom: "Bosnie-Herzégovine", indicatif: '+387', code: 'BA', max: 9, min: 8 },
  { nom: "Botswana", indicatif: '+267', code: 'BW', max: 8, min: 7 },
  { nom: "Brésil", indicatif: '+55', code: 'BR', max: 11, min: 10 },
  { nom: "Brunei", indicatif: '+673', code: 'BN', max: 7, min: 7 },
  { nom: "Bulgarie", indicatif: '+359', code: 'BG', max: 9, min: 8 },
  { nom: "Burkina Faso", indicatif: '+226', code: 'BF', max: 8, min: 8 },
  { nom: "Burundi", indicatif: '+257', code: 'BI', max: 8, min: 8 },
  { nom: "Cambodge", indicatif: '+855', code: 'KH', max: 9, min: 8 },
  { nom: "Cameroun", indicatif: '+237', code: 'CM', max: 9, min: 9 },
  { nom: "Canada", indicatif: '+1', code: 'CA', max: 10, min: 10 },
  { nom: "Cap-Vert", indicatif: '+238', code: 'CV', max: 7, min: 7 },
  { nom: "Centrafrique", indicatif: '+236', code: 'CF', max: 8, min: 8 },
  { nom: "Chili", indicatif: '+56', code: 'CL', max: 9, min: 9 },
  { nom: "Chine", indicatif: '+86', code: 'CN', max: 11, min: 10 },
  { nom: "Chypre", indicatif: '+357', code: 'CY', max: 8, min: 8 },
  { nom: "Colombie", indicatif: '+57', code: 'CO', max: 10, min: 10 },
  { nom: "Comores", indicatif: '+269', code: 'KM', max: 7, min: 7 },
  { nom: "Congo", indicatif: '+242', code: 'CG', max: 9, min: 9 },
  { nom: "Congo (RDC)", indicatif: '+243', code: 'CD', max: 9, min: 9 },
  { nom: "Corée du Nord", indicatif: '+850', code: 'KP', max: 10, min: 8 },
  { nom: "Corée du Sud", indicatif: '+82', code: 'KR', max: 10, min: 9 },
  { nom: "Costa Rica", indicatif: '+506', code: 'CR', max: 8, min: 8 },
  { nom: "Côte d'Ivoire", indicatif: '+225', code: 'CI', max: 10, min: 10 },
  { nom: "Croatie", indicatif: '+385', code: 'HR', max: 9, min: 8 },
  { nom: "Cuba", indicatif: '+53', code: 'CU', max: 8, min: 8 },
  { nom: "Danemark", indicatif: '+45', code: 'DK', max: 8, min: 8 },
  { nom: "Djibouti", indicatif: '+253', code: 'DJ', max: 8, min: 8 },
  { nom: "Dominique", indicatif: '+1767', code: 'DM', max: 7, min: 7 },
  { nom: "Égypte", indicatif: '+20', code: 'EG', max: 10, min: 9 },
  { nom: "Émirats arabes unis", indicatif: '+971', code: 'AE', max: 9, min: 8 },
  { nom: "Équateur", indicatif: '+593', code: 'EC', max: 9, min: 8 },
  { nom: "Érythrée", indicatif: '+291', code: 'ER', max: 7, min: 7 },
  { nom: "Espagne", indicatif: '+34', code: 'ES', max: 9, min: 9 },
  { nom: "Estonie", indicatif: '+372', code: 'EE', max: 8, min: 7 },
  { nom: "Eswatini", indicatif: '+268', code: 'SZ', max: 8, min: 8 },
  { nom: "États-Unis", indicatif: '+1', code: 'US', max: 10, min: 10 },
  { nom: "Éthiopie", indicatif: '+251', code: 'ET', max: 9, min: 9 },
  { nom: "Fidji", indicatif: '+679', code: 'FJ', max: 7, min: 7 },
  { nom: "Finlande", indicatif: '+358', code: 'FI', max: 10, min: 6 },
  { nom: "France", indicatif: '+33', code: 'FR', max: 9, min: 9 },
  { nom: "Gabon", indicatif: '+241', code: 'GA', max: 9, min: 7 },
  { nom: "Gambie", indicatif: '+220', code: 'GM', max: 7, min: 7 },
  { nom: "Géorgie", indicatif: '+995', code: 'GE', max: 9, min: 9 },
  { nom: "Ghana", indicatif: '+233', code: 'GH', max: 9, min: 9 },
  { nom: "Grèce", indicatif: '+30', code: 'GR', max: 10, min: 10 },
  { nom: "Grenade", indicatif: '+1473', code: 'GD', max: 7, min: 7 },
  { nom: "Guatemala", indicatif: '+502', code: 'GT', max: 8, min: 8 },
  { nom: "Guinée", indicatif: '+224', code: 'GN', max: 9, min: 9 },
  { nom: "Guinée équatoriale", indicatif: '+240', code: 'GQ', max: 9, min: 9 },
  { nom: "Guinée-Bissau", indicatif: '+245', code: 'GW', max: 9, min: 7 },
  { nom: "Guyana", indicatif: '+592', code: 'GY', max: 7, min: 7 },
  { nom: "Haïti", indicatif: '+509', code: 'HT', max: 8, min: 8 },
  { nom: "Honduras", indicatif: '+504', code: 'HN', max: 8, min: 8 },
  { nom: "Hongrie", indicatif: '+36', code: 'HU', max: 9, min: 8 },
  { nom: "Inde", indicatif: '+91', code: 'IN', max: 10, min: 10 },
  { nom: "Indonésie", indicatif: '+62', code: 'ID', max: 12, min: 9 },
  { nom: "Irak", indicatif: '+964', code: 'IQ', max: 10, min: 10 },
  { nom: "Iran", indicatif: '+98', code: 'IR', max: 10, min: 10 },
  { nom: "Irlande", indicatif: '+353', code: 'IE', max: 9, min: 7 },
  { nom: "Islande", indicatif: '+354', code: 'IS', max: 7, min: 7 },
  { nom: "Israël", indicatif: '+972', code: 'IL', max: 9, min: 8 },
  { nom: "Italie", indicatif: '+39', code: 'IT', max: 11, min: 9 },
  { nom: "Jamaïque", indicatif: '+1876', code: 'JM', max: 7, min: 7 },
  { nom: "Japon", indicatif: '+81', code: 'JP', max: 10, min: 9 },
  { nom: "Jordanie", indicatif: '+962', code: 'JO', max: 9, min: 8 },
  { nom: "Kazakhstan", indicatif: '+7', code: 'KZ', max: 10, min: 10 },
  { nom: "Kenya", indicatif: '+254', code: 'KE', max: 9, min: 9 },
  { nom: "Kirghizistan", indicatif: '+996', code: 'KG', max: 9, min: 9 },
  { nom: "Kiribati", indicatif: '+686', code: 'KI', max: 8, min: 5 },
  { nom: "Koweït", indicatif: '+965', code: 'KW', max: 8, min: 8 },
  { nom: "Laos", indicatif: '+856', code: 'LA', max: 10, min: 8 },
  { nom: "Lesotho", indicatif: '+266', code: 'LS', max: 8, min: 8 },
  { nom: "Lettonie", indicatif: '+371', code: 'LV', max: 8, min: 8 },
  { nom: "Liban", indicatif: '+961', code: 'LB', max: 8, min: 7 },
  { nom: "Liberia", indicatif: '+231', code: 'LR', max: 9, min: 7 },
  { nom: "Libye", indicatif: '+218', code: 'LY', max: 9, min: 9 },
  { nom: "Liechtenstein", indicatif: '+423', code: 'LI', max: 9, min: 7 },
  { nom: "Lituanie", indicatif: '+370', code: 'LT', max: 8, min: 8 },
  { nom: "Luxembourg", indicatif: '+352', code: 'LU', max: 11, min: 6 },
  { nom: "Macédoine du Nord", indicatif: '+389', code: 'MK', max: 8, min: 8 },
  { nom: "Madagascar", indicatif: '+261', code: 'MG', max: 9, min: 9 },
  { nom: "Malaisie", indicatif: '+60', code: 'MY', max: 10, min: 9 },
  { nom: "Malawi", indicatif: '+265', code: 'MW', max: 9, min: 7 },
  { nom: "Maldives", indicatif: '+960', code: 'MV', max: 7, min: 7 },
  { nom: "Mali", indicatif: '+223', code: 'ML', max: 8, min: 8 },
  { nom: "Malte", indicatif: '+356', code: 'MT', max: 8, min: 8 },
  { nom: "Maroc", indicatif: '+212', code: 'MA', max: 9, min: 9 },
  { nom: "Maurice", indicatif: '+230', code: 'MU', max: 8, min: 7 },
  { nom: "Mauritanie", indicatif: '+222', code: 'MR', max: 8, min: 8 },
  { nom: "Mexique", indicatif: '+52', code: 'MX', max: 10, min: 10 },
  { nom: "Moldavie", indicatif: '+373', code: 'MD', max: 8, min: 8 },
  { nom: "Monaco", indicatif: '+377', code: 'MC', max: 9, min: 8 },
  { nom: "Mongolie", indicatif: '+976', code: 'MN', max: 8, min: 8 },
  { nom: "Monténégro", indicatif: '+382', code: 'ME', max: 9, min: 8 },
  { nom: "Mozambique", indicatif: '+258', code: 'MZ', max: 9, min: 8 },
  { nom: "Namibie", indicatif: '+264', code: 'NA', max: 9, min: 8 },
  { nom: "Népal", indicatif: '+977', code: 'NP', max: 10, min: 8 },
  { nom: "Nicaragua", indicatif: '+505', code: 'NI', max: 8, min: 8 },
  { nom: "Niger", indicatif: '+227', code: 'NE', max: 8, min: 8 },
  { nom: "Nigeria", indicatif: '+234', code: 'NG', max: 10, min: 8 },
  { nom: "Norvège", indicatif: '+47', code: 'NO', max: 8, min: 8 },
  { nom: "Nouvelle-Zélande", indicatif: '+64', code: 'NZ', max: 10, min: 8 },
  { nom: "Oman", indicatif: '+968', code: 'OM', max: 8, min: 8 },
  { nom: "Ouganda", indicatif: '+256', code: 'UG', max: 9, min: 9 },
  { nom: "Ouzbékistan", indicatif: '+998', code: 'UZ', max: 9, min: 9 },
  { nom: "Pakistan", indicatif: '+92', code: 'PK', max: 10, min: 10 },
  { nom: "Palestine", indicatif: '+970', code: 'PS', max: 9, min: 8 },
  { nom: "Panama", indicatif: '+507', code: 'PA', max: 8, min: 7 },
  { nom: "Papouasie-Nouvelle-Guinée", indicatif: '+675', code: 'PG', max: 8, min: 7 },
  { nom: "Paraguay", indicatif: '+595', code: 'PY', max: 9, min: 9 },
  { nom: "Pays-Bas", indicatif: '+31', code: 'NL', max: 9, min: 9 },
  { nom: "Pérou", indicatif: '+51', code: 'PE', max: 9, min: 8 },
  { nom: "Philippines", indicatif: '+63', code: 'PH', max: 10, min: 10 },
  { nom: "Pologne", indicatif: '+48', code: 'PL', max: 9, min: 9 },
  { nom: "Portugal", indicatif: '+351', code: 'PT', max: 9, min: 9 },
  { nom: "Qatar", indicatif: '+974', code: 'QA', max: 8, min: 8 },
  { nom: "République dominicaine", indicatif: '+1809', code: 'DO', max: 7, min: 7 },
  { nom: "République tchèque", indicatif: '+420', code: 'CZ', max: 9, min: 9 },
  { nom: "Roumanie", indicatif: '+40', code: 'RO', max: 9, min: 9 },
  { nom: "Royaume-Uni", indicatif: '+44', code: 'GB', max: 10, min: 10 },
  { nom: "Russie", indicatif: '+7', code: 'RU', max: 10, min: 10 },
  { nom: "Rwanda", indicatif: '+250', code: 'RW', max: 9, min: 9 },
  { nom: "Saint-Kitts-et-Nevis", indicatif: '+1869', code: 'KN', max: 7, min: 7 },
  { nom: "Saint-Marin", indicatif: '+378', code: 'SM', max: 10, min: 6 },
  { nom: "Saint-Vincent-et-les-Grenadines", indicatif: '+1784', code: 'VC', max: 7, min: 7 },
  { nom: "Sainte-Lucie", indicatif: '+1758', code: 'LC', max: 7, min: 7 },
  { nom: "Salomon", indicatif: '+677', code: 'SB', max: 7, min: 5 },
  { nom: "Salvador", indicatif: '+503', code: 'SV', max: 8, min: 8 },
  { nom: "Samoa", indicatif: '+685', code: 'WS', max: 7, min: 5 },
  { nom: "São Tomé-et-Principe", indicatif: '+239', code: 'ST', max: 7, min: 7 },
  { nom: "Sénégal", indicatif: '+221', code: 'SN', max: 9, min: 9 },
  { nom: "Serbie", indicatif: '+381', code: 'RS', max: 10, min: 8 },
  { nom: "Seychelles", indicatif: '+248', code: 'SC', max: 7, min: 7 },
  { nom: "Sierra Leone", indicatif: '+232', code: 'SL', max: 8, min: 8 },
  { nom: "Singapour", indicatif: '+65', code: 'SG', max: 8, min: 8 },
  { nom: "Slovaquie", indicatif: '+421', code: 'SK', max: 9, min: 9 },
  { nom: "Slovénie", indicatif: '+386', code: 'SI', max: 8, min: 8 },
  { nom: "Somalie", indicatif: '+252', code: 'SO', max: 9, min: 7 },
  { nom: "Soudan", indicatif: '+249', code: 'SD', max: 9, min: 9 },
  { nom: "Soudan du Sud", indicatif: '+211', code: 'SS', max: 9, min: 9 },
  { nom: "Sri Lanka", indicatif: '+94', code: 'LK', max: 9, min: 9 },
  { nom: "Suède", indicatif: '+46', code: 'SE', max: 9, min: 7 },
  { nom: "Suisse", indicatif: '+41', code: 'CH', max: 9, min: 9 },
  { nom: "Suriname", indicatif: '+597', code: 'SR', max: 7, min: 6 },
  { nom: "Syrie", indicatif: '+963', code: 'SY', max: 9, min: 8 },
  { nom: "Tadjikistan", indicatif: '+992', code: 'TJ', max: 9, min: 9 },
  { nom: "Taïwan", indicatif: '+886', code: 'TW', max: 9, min: 8 },
  { nom: "Tanzanie", indicatif: '+255', code: 'TZ', max: 9, min: 9 },
  { nom: "Tchad", indicatif: '+235', code: 'TD', max: 8, min: 8 },
  { nom: "Thaïlande", indicatif: '+66', code: 'TH', max: 9, min: 8 },
  { nom: "Timor oriental", indicatif: '+670', code: 'TL', max: 8, min: 7 },
  { nom: "Togo", indicatif: '+228', code: 'TG', max: 8, min: 8 },
  { nom: "Tonga", indicatif: '+676', code: 'TO', max: 7, min: 5 },
  { nom: "Trinité-et-Tobago", indicatif: '+1868', code: 'TT', max: 7, min: 7 },
  { nom: "Tunisie", indicatif: '+216', code: 'TN', max: 8, min: 8 },
  { nom: "Turkménistan", indicatif: '+993', code: 'TM', max: 8, min: 8 },
  { nom: "Turquie", indicatif: '+90', code: 'TR', max: 10, min: 10 },
  { nom: "Tuvalu", indicatif: '+688', code: 'TV', max: 6, min: 5 },
  { nom: "Ukraine", indicatif: '+380', code: 'UA', max: 9, min: 9 },
  { nom: "Uruguay", indicatif: '+598', code: 'UY', max: 8, min: 8 },
  { nom: "Vanuatu", indicatif: '+678', code: 'VU', max: 7, min: 5 },
  { nom: "Vatican", indicatif: '+379', code: 'VA', max: 10, min: 6 },
  { nom: "Venezuela", indicatif: '+58', code: 'VE', max: 10, min: 10 },
  { nom: "Viêt Nam", indicatif: '+84', code: 'VN', max: 10, min: 9 },
  { nom: "Yémen", indicatif: '+967', code: 'YE', max: 9, min: 9 },
  { nom: "Zambie", indicatif: '+260', code: 'ZM', max: 9, min: 9 },
  { nom: "Zimbabwe", indicatif: '+263', code: 'ZW', max: 9, min: 9 },
];

// Minuscules sans accents, pour trier et pour chercher.
export function sansAccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Tous les pays par ordre alphabétique (accents ignorés). */
export const PAYS: Pays[] = [...TOUS].sort((a, b) => sansAccent(a.nom).localeCompare(sansAccent(b.nom)));

export const CAMEROUN: Pays = PAYS.find((p) => p.code === 'CM')!;

// Indicatif partagé : le pays retenu quand on relit un numéro stocké.
const PRINCIPAL: Record<string, string> = { '+1': 'US', '+7': 'RU' };

// Indicatifs les plus longs d'abord (sinon « +235 » serait avalé par
// « +23 »), puis le pays principal à indicatif égal.
const PAR_INDICATIF: Pays[] = [...PAYS].sort((a, b) => {
  const l = b.indicatif.length - a.indicatif.length;
  if (l !== 0) return l;
  return (PRINCIPAL[a.indicatif] === a.code ? 0 : 1) - (PRINCIPAL[b.indicatif] === b.code ? 0 : 1);
});

/**
 * Sépare un numéro stocké (« +237653535353 », « 00237… », « 237… ») en
 * pays et numéro national. Sans indicatif reconnu : Cameroun.
 */
export function separerTelephone(valeur: string): { pays: Pays; numero: string } {
  let n = (valeur || '').replace(/[^\d+]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2);
  // Sans « + », un numéro de la longueur d'un numéro camerounais est
  // camerounais : « 678 787 878 » ne doit pas se lire Vanuatu (+678).
  if (!n.startsWith('+') && n.length <= CAMEROUN.max) return { pays: CAMEROUN, numero: n };
  for (const p of PAR_INDICATIF) {
    const chiffres = p.indicatif.slice(1);
    for (const prefixe of ['+' + chiffres, chiffres]) {
      if (!n.startsWith(prefixe)) continue;
      const reste = n.slice(prefixe.length);
      // « 237… » sans + peut être un vrai début de numéro : on ne coupe
      // que si la longueur restante colle au pays.
      if (prefixe.startsWith('+') || (reste.length >= p.min && reste.length <= p.max)) {
        return { pays: p, numero: reste };
      }
    }
  }
  return { pays: CAMEROUN, numero: n.replace(/\+/g, '') };
}

/** Numéro national en groupes lisibles : 6 53 53 53 53. */
export function grouperNumero(local: string): string {
  const n = local.replace(/\D/g, '');
  if (n.length < 3) return n;
  const morceaux: string[] = [];
  let i = 0;
  if (n.length % 2 === 1) { morceaux.push(n.slice(0, 1)); i = 1; }
  for (; i < n.length; i += 2) morceaux.push(n.slice(i, i + 2));
  return morceaux.join(' ');
}

/** Petite image du drapeau (≈ 1 Ko). */
export function urlDrapeau(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}
