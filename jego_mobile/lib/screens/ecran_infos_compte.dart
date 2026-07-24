import 'package:flutter/material.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';

/// Recap en lecture seule des infos du compte. La vraie edition se fait
/// deja via la feuille dediee dans Profil (_FeuilleEditInfos) -- cet
/// ecran ne duplique pas ce mecanisme, il renvoie dessus.
class EcranInfosCompte extends StatelessWidget {
  const EcranInfosCompte({super.key});

  @override
  Widget build(BuildContext context) {
    final nomComplet = '${Session.prenom ?? ''} ${Session.nom ?? ''}'.trim();
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: JegoTheme.texte),
        title: const Text('Informations du compte',
            style: TextStyle(color: JegoTheme.texte, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte,
              borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
              border: Border.all(color: JegoTheme.bordCarte),
              boxShadow: JegoTheme.ombreDouce,
            ),
            child: Column(
              children: [
                _ligne(Icons.badge_rounded, 'Nom complet',
                    nomComplet.isEmpty ? '-' : nomComplet),
                const Divider(height: 1, color: JegoTheme.bordCarte),
                _ligne(Icons.phone_rounded, 'Telephone', Session.telephone ?? '-'),
                const Divider(height: 1, color: JegoTheme.bordCarte),
                _ligne(Icons.mail_rounded, 'Email', Session.email ?? '-'),
                const Divider(height: 1, color: JegoTheme.bordCarte),
                _ligne(Icons.lock_rounded, 'Mot de passe', '••••••••'),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Pour modifier ces informations, retourne dans Profil > Mes informations > Informations personnelles.',
            style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5),
          ),
        ],
      ),
    );
  }

  Widget _ligne(IconData icone, String libelle, String valeur) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icone, size: 18, color: JegoTheme.vert),
          const SizedBox(width: 12),
          Text(libelle,
              style: const TextStyle(color: JegoTheme.texteSecondaire, fontSize: 13)),
          const Spacer(),
          Flexible(
            child: Text(valeur,
                textAlign: TextAlign.right,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: JegoTheme.texte, fontSize: 13.5, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}