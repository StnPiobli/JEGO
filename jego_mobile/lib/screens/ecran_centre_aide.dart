import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

class EcranCentreAide extends StatelessWidget {
  const EcranCentreAide({super.key});

  static const _faq = [
    ('Comment annuler un billet ?',
        'Va dans Billets > ouvre ton trajet > "Annuler ce billet". Le remboursement (s\'il y en a un) part automatiquement dans ton portefeuille JEGO.'),
    ('Comment fonctionne le portefeuille JEGO ?',
        'Il se remplit uniquement via les remboursements d\'annulation et sert a payer tes prochains achats dans l\'app.'),
    ('Le paiement a echoue, que faire ?',
        'Verifie ton solde Mobile Money et reessaie. Si le probleme persiste, contacte le support.'),
    ('Comment modifier mes informations ?',
        'Profil > Mes informations > Informations personnelles, chaque champ a son propre stylo d\'edition.'),
    ('Comment recuperer un billet avec un code ?',
        'Onglet Billets > bouton "Recuperer" en haut a droite > entre ton code JEGO-XXXXXX.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Centre d\'aide',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: _faq.map((q) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
              border: Border.all(color: JegoTheme.bordCarte),
              boxShadow: JegoTheme.ombreDouce,
            ),
            child: Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                iconColor: JegoTheme.vert,
                collapsedIconColor: JegoTheme.texteTernaire,
                title: Text(q.$1,
                    style: const TextStyle(
                        color: JegoTheme.texte, fontSize: 13.5, fontWeight: FontWeight.w700)),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(q.$2,
                      style: TextStyle(
                          color: JegoTheme.texteSecondaire, fontSize: 12.5, height: 1.5)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}