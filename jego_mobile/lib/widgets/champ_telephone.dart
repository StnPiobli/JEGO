import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import 'drapeau_jego.dart';
import 'style_jego.dart';

class Pays {
  final String nom;
  final String indicatif;

  /// Code ISO, utilise pour dessiner le drapeau. Les emoji drapeaux ne
  /// se composent pas partout : voir [DrapeauJego].
  final String code;
  final int longueur;
  const Pays(this.nom, this.indicatif, this.code, this.longueur);
}

class PaysTelephone {
  static const cameroun = Pays('Cameroun', '+237', 'CM', 9);
  static const liste = [
    cameroun,
    Pays('Nigeria', '+234', 'NG', 10),
    Pays('Tchad', '+235', 'TD', 8),
    Pays('Gabon', '+241', 'GA', 9),
    Pays('Côte d\'Ivoire', '+225', 'CI', 10),
    Pays('France', '+33', 'FR', 9),
  ];

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

    final tries = [...liste]
      ..sort((a, b) => b.indicatif.length.compareTo(a.indicatif.length));
    for (final p in tries) {
      final chiffres = p.indicatif.substring(1); // sans le +
      for (final prefixe in ['+$chiffres', chiffres]) {
        if (!n.startsWith(prefixe)) continue;
        final reste = n.substring(prefixe.length);
        // « 237… » sans + est ambigu : ce peut etre un vrai debut de
        // numero. On ne coupe que si la longueur restante colle.
        if (prefixe.startsWith('+') || reste.length == p.longueur) {
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
    if (n.length != pays.longueur) return false;
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

  /// Choix de l'indicatif en feuille basse, comme le calendrier.
  ///
  /// L'ancien `showMenu` etait peint en `Colors.white` en dur : en mode
  /// sombre, le menu restait blanc sous un texte presque blanc, illisible.
  /// Il n'affichait par ailleurs que le drapeau et l'indicatif, sans le
  /// nom du pays, et ses lignes de 44 px etaient serrees pour le pouce.
  void _ouvrirListe(BuildContext context) {
    showModalBottomSheet<Pays>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => FeuilleJego(
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
            ...PaysTelephone.liste.map((p) {
              final actif = p.indicatif == pays.indicatif;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: BoutonTactile(
                  onTap: () => Navigator.of(ctx).pop(p),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 13),
                    decoration: BoxDecoration(
                      color: actif
                          ? JegoTheme.vert.withOpacity(0.10)
                          : JegoTheme.champ,
                      borderRadius:
                          BorderRadius.circular(JegoTheme.rPetit),
                      border: Border.all(
                        color: actif
                            ? JegoTheme.vert.withOpacity(0.45)
                            : Colors.transparent,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        DrapeauJego(p.code, largeur: 26),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            p.nom,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: JegoTheme.texte,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          p.indicatif,
                          style: TextStyle(
                            color: actif
                                ? JegoTheme.vert
                                : JegoTheme.texteSecondaire,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (actif) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.check_rounded,
                              size: 17, color: JegoTheme.vert),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
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