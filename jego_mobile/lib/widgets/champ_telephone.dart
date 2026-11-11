import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import 'drapeau_jego.dart';
import 'style_jego.dart';

part 'pays_liste.dart';

class Pays {
  final String nom;
  final String indicatif;

  /// Code ISO, utilise pour dessiner le drapeau. Les emoji drapeaux ne
  /// se composent pas partout : voir [DrapeauJego].
  final String code;

  /// Longueur maximale du numéro national (sert aussi à espacer la saisie).
  final int longueur;

  /// Longueur minimale : certains pays mélangent plusieurs formats.
  final int longueurMin;

  const Pays(this.nom, this.indicatif, this.code, this.longueur, [int? min])
      : longueurMin = min ?? longueur;
}

class PaysTelephone {
  /// Tous les pays, par ordre alphabétique (accents ignorés : « Égypte »
  /// se range avec les E, pas après Z).
  static final List<Pays> liste = [..._tousLesPays]
    ..sort((a, b) => sansAccent(a.nom).compareTo(sansAccent(b.nom)));

  static final Pays cameroun = liste.firstWhere((p) => p.code == 'CM');

  /// Minuscules sans accents, pour trier et pour chercher.
  static String sansAccent(String s) {
    const avec = 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ';
    const sans = 'aaaaaaceeeeiiiinooooouuuuyyoa';
    final b = StringBuffer();
    for (final c in s.toLowerCase().split('')) {
      final i = avec.indexOf(c);
      b.write(i >= 0 ? sans[i] : c);
    }
    return b.toString();
  }

  /// Retire l'indicatif d'un numero saisi ou stocke, et rend le pays
  /// correspondant.
  ///
  /// Le champ affiche deja l'indicatif a gauche : si la valeur relue
  /// le contient encore, on lit « (+237) 237 6… ». Le meme numero
  /// pouvant etre stocke « +237… », « 237… » ou « 00237… », les trois
  /// formes sont reconnues. On essaie les indicatifs les plus longs
  /// d'abord, sans quoi « +235 » serait avale par « +23 ».
  static (Pays, String) separer(String valeur, {Pays? defaut}) {
    var n = valeur.replaceAll(RegExp(r'[^0-9+]'), '');
    if (n.startsWith('00')) n = '+${n.substring(2)}';

    // Sans « + », un numéro qui tient dans la longueur du pays retenu
    // est un numéro de CE pays : on ne devine rien. Sinon « 678 787 878 »
    // (mobile camerounais) se lisait Vanuatu (+678) et la saisie était
    // coupée à « 78 78 78 ». Seul un numéro plus long (indicatif collé)
    // ou commençant par « + » / « 00 » fait chercher le pays.
    final parDefaut = defaut ?? cameroun;
    if (!n.startsWith('+') && n.length <= parDefaut.longueur) {
      return (parDefaut, n);
    }

    // Indicatifs les plus longs d'abord ; à indicatif égal (+1, +7), le
    // pays principal d'abord.
    final tries = [...liste]
      ..sort((a, b) {
        final l = b.indicatif.length.compareTo(a.indicatif.length);
        if (l != 0) return l;
        final pa = _paysPrincipal[a.indicatif] == a.code ? 0 : 1;
        final pb = _paysPrincipal[b.indicatif] == b.code ? 0 : 1;
        return pa.compareTo(pb);
      });
    for (final p in tries) {
      final chiffres = p.indicatif.substring(1); // sans le +
      for (final prefixe in ['+$chiffres', chiffres]) {
        if (!n.startsWith(prefixe)) continue;
        final reste = n.substring(prefixe.length);
        // « 237… » sans + est ambigu : ce peut etre un vrai debut de
        // numero. On ne coupe que si la longueur restante colle.
        if (prefixe.startsWith('+') ||
            (reste.length >= p.longueurMin && reste.length <= p.longueur)) {
          return (p, reste);
        }
      }
    }
    return (defaut ?? cameroun, n.replaceAll('+', ''));
  }

  /// Numero canonique a stocker : indicatif + numero local, sans espace.
  ///
  /// Le champ affiche des groupes espaces ; ce sont ces espaces que la
  /// composition doit retirer, sans quoi ils partiraient en base.
  static String composer(Pays pays, String local) {
    final n = local.replaceAll(RegExp(r'\D'), '');
    return '${pays.indicatif}$n';
  }

  /// Numero local en groupes lisibles : 6 53 53 53 53.
  ///
  /// Une suite de chiffres ne se relit pas. On decoupe par paires ; si
  /// le compte est impair (Cameroun, neuf chiffres), le premier reste
  /// seul devant — c'est lui qui porte l'operateur. Un numero pair
  /// (Tchad, huit chiffres) se decoupe simplement 66 12 34 56, la
  /// regle du chiffre isole y produisait « 6 61 23 45 6 ».
  static String grouper(String local) {
    final n = local.replaceAll(RegExp(r'\D'), '');
    if (n.length < 3) return n;
    final morceaux = <String>[];
    var i = 0;
    if (n.length.isOdd) {
      morceaux.add(n.substring(0, 1));
      i = 1;
    }
    for (; i < n.length; i += 2) {
      morceaux.add(n.substring(i, i + 2 > n.length ? n.length : i + 2));
    }
    return morceaux.join(' ');
  }

  /// Numero complet, pret a lire : « +237 6 53 53 53 53 ».
  static String afficher(String valeur) {
    if (valeur.trim().isEmpty) return '';
    final (pays, local) = separer(valeur);
    if (local.isEmpty) return valeur;
    return '${pays.indicatif} ${grouper(local)}';
  }

  /// Format valide selon le pays. Cameroun : 9 chiffres commencant par 6 ou 2.
  static bool valide(Pays pays, String numero) {
    final n = numero.replaceAll(RegExp(r'\D'), '');
    if (n.length < pays.longueurMin || n.length > pays.longueur) return false;
    if (pays.indicatif == '+237' &&
        !(n.startsWith('6') || n.startsWith('2'))) {
      return false;
    }
    return true;
  }
}

/// Espace les chiffres pendant la frappe.
///
/// Le curseur est replace en comptant les CHIFFRES situes avant lui,
/// pas les caracteres : sinon, corriger un chiffre au milieu renvoyait
/// le curseur en fin de champ a chaque espace insere.
class FormateurTelephone extends TextInputFormatter {
  final int longueurMax;

  const FormateurTelephone(this.longueurMax);

  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue avant, TextEditingValue apres) {
    var chiffres = apres.text.replaceAll(RegExp(r'\D'), '');
    if (chiffres.length > longueurMax) {
      chiffres = chiffres.substring(0, longueurMax);
    }
    final texte = PaysTelephone.grouper(chiffres);

    final chiffresAvantCurseur = apres.text
        .substring(0, apres.selection.baseOffset.clamp(0, apres.text.length))
        .replaceAll(RegExp(r'\D'), '')
        .length;

    var position = texte.length;
    var vus = 0;
    for (var i = 0; i < texte.length; i++) {
      if (vus == chiffresAvantCurseur) {
        position = i;
        break;
      }
      if (texte[i] != ' ') vus++;
    }

    return TextEditingValue(
      text: texte,
      selection: TextSelection.collapsed(offset: position),
    );
  }
}

/// Champ telephone avec selecteur d'indicatif pays.
class ChampTelephone extends StatelessWidget {
  final TextEditingController controller;
  final Pays pays;
  final ValueChanged<Pays> onPays;
  final String libelle;
  final ValueChanged<String>? onChange;

  const ChampTelephone({
    super.key,
    required this.controller,
    required this.pays,
    required this.onPays,
    required this.libelle,
    this.onChange,
  });

  /// Choix de l'indicatif en feuille basse.
  ///
  /// Une seule carte, des lignes séparées par un filet : les six pays
  /// tiennent sur un téléphone. L'ancienne version empilait une boîte par
  /// pays dans la hauteur par défaut d'une feuille basse, et la liste
  /// débordait par le bas de l'écran. La hauteur est désormais bornée et
  /// la liste défile si l'on ajoute des pays.
  void _ouvrirListe(BuildContext context) {
    showModalBottomSheet<Pays>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      builder: (ctx) => _FeuillePays(actuel: pays),
    ).then((choisi) {
      if (choisi != null) onPays(choisi);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
      ),
      child: Row(
        children: [
          BoutonTactile(
            onTap: () => _ouvrirListe(context),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DrapeauJego(pays.code, largeur: 22),
                  const SizedBox(width: 6),
                  Text(
                    pays.indicatif,
                    style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Icon(Icons.keyboard_arrow_down_rounded,
                      size: 17, color: JegoTheme.texteTernaire),
                ],
              ),
            ),
          ),
          Container(width: 1, height: 26, color: JegoTheme.bordCarte),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              inputFormatters: [FormateurTelephone(pays.longueur)],
              // Coller « +237 6… » ou « 2376… » alors que l'indicatif
              // est deja affiche a gauche donnait « (+237) 237 6… ».
              onChanged: (v) {
                final (detecte, local) = PaysTelephone.separer(v, defaut: pays);
                final groupe = PaysTelephone.grouper(local);
                if (groupe != v) {
                  controller.value = TextEditingValue(
                    text: groupe,
                    selection:
                        TextSelection.collapsed(offset: groupe.length),
                  );
                  if (detecte.indicatif != pays.indicatif) onPays(detecte);
                }
                onChange?.call(local);
              },
              style:
                  TextStyle(color: JegoTheme.texte, fontSize: 14),
              cursorColor: JegoTheme.vert,
              decoration: InputDecoration(
                hintText: libelle,
                hintStyle: TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 13.5),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Liste des pays avec recherche (nom ou indicatif). Le pays en cours
/// est remonté en tête pour qu'on le retrouve sans chercher.
class _FeuillePays extends StatefulWidget {
  final Pays actuel;
  const _FeuillePays({required this.actuel});

  @override
  State<_FeuillePays> createState() => _FeuillePaysState();
}

class _FeuillePaysState extends State<_FeuillePays> {
  String _recherche = '';

  List<Pays> get _affiches {
    final q = PaysTelephone.sansAccent(_recherche.trim());
    final chiffres = q.replaceAll(RegExp(r'[^0-9]'), '');
    if (q.isEmpty) return PaysTelephone.liste;
    return PaysTelephone.liste.where((p) {
      if (PaysTelephone.sansAccent(p.nom).contains(q)) return true;
      return chiffres.isNotEmpty && p.indicatif.substring(1).startsWith(chiffres);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final liste = _affiches;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: FeuilleJego(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              Strings.t('choisir_indicatif'),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              onChanged: (v) => setState(() => _recherche = v),
              style: TextStyle(color: JegoTheme.texte, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Rechercher un pays ou un indicatif',
                hintStyle: TextStyle(color: JegoTheme.texteTernaire, fontSize: 13),
                prefixIcon: Icon(Icons.search_rounded, color: JegoTheme.texteTernaire),
                filled: true,
                fillColor: JegoTheme.champ,
                isDense: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Flexible(
              child: liste.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text('Aucun pays ne correspond.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: JegoTheme.texteSecondaire)),
                    )
                  : Container(
                      decoration: BoxDecoration(
                        color: JegoTheme.champ,
                        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: ListView.separated(
                        shrinkWrap: true,
                        padding: EdgeInsets.zero,
                        itemCount: liste.length,
                        separatorBuilder: (_, __) => Divider(
                          height: 1,
                          thickness: 1,
                          indent: 52,
                          color: JegoTheme.bordCarte,
                        ),
                        itemBuilder: (_, i) => _ligne(liste[i]),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ligne(Pays p) {
    // Le code ISO, pas l'indicatif : +1 est partagé par les États-Unis
    // et le Canada.
    final actif = p.code == widget.actuel.code;
    return InkWell(
      onTap: () => Navigator.of(context).pop(p),
      child: Container(
        color: actif ? JegoTheme.vert.withOpacity(0.08) : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        child: Row(
          children: [
            DrapeauJego(p.code, largeur: 24),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                p.nom,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14,
                  fontWeight: actif ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ),
            Text(
              p.indicatif,
              style: TextStyle(
                color: actif ? JegoTheme.vert : JegoTheme.texteSecondaire,
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(
              width: 26,
              child: actif
                  ? Icon(Icons.check_rounded, size: 18, color: JegoTheme.vert)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
