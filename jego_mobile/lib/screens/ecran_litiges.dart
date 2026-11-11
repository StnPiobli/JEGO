import 'dart:async';

import 'package:flutter/material.dart';
import '../config/api.dart';
import '../config/session.dart';
import 'connexion_inscription.dart';
import '../config/theme_jego.dart';
import '../widgets/style_jego.dart';

/// Espace litige du voyageur.
///
/// Le client explique lui-meme, en texte libre : aucune liste de motifs
/// imposee. En echange, l'ecran previent noir sur blanc qu'un message
/// incomprehensible ne sera pas traite -- c'est ce texte que l'agence
/// puis l'admin liront pour trancher.
class EcranLitiges extends StatefulWidget {
  const EcranLitiges({super.key});

  @override
  State<EcranLitiges> createState() => _EcranLitigesState();
}

class _EcranLitigesState extends State<EcranLitiges> {
  List<Map<String, dynamic>> _litiges = [];
  bool _chargement = true;
  String? _erreur;
  Timer? _minuterie;

  @override
  void initState() {
    super.initState();
    _charger();
    // Sans push temps reel : la reponse de l'agence ou la decision de
    // JEGO apparait sans avoir a rouvrir l'ecran.
    _minuterie = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted && Session.token != null) _charger(silencieux: true);
    });
  }

  @override
  void dispose() {
    _minuterie?.cancel();
    super.dispose();
  }

  Future<void> _charger({bool silencieux = false}) async {
    setState(() {
      if (!silencieux) _chargement = true;
      _erreur = null;
    });
    // Ecran accessible depuis les parametres meme sans compte : sans
    // jeton, inutile d'appeler le serveur pour recolter un « token
    // manquant » incomprehensible pour le client.
    if (Session.token == null) {
      setState(() {
        _litiges = [];
        _erreur = 'Connectez-vous à votre compte pour voir vos litiges.';
        _chargement = false;
      });
      return;
    }
    try {
      final liste = await ApiService.mesLitiges();
      if (!mounted) return;
      setState(() {
        _litiges = liste;
        _chargement = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erreur = e is ErreurApi ? e.message : 'Chargement impossible';
        _chargement = false;
      });
    }
  }

  /// Billets sur lesquels un litige a un sens : le voyage a commence ou
  /// est termine. Ouvrir un litige sur un trajet pas encore parti n'a
  /// rien a reprocher a l'agence.
  ///
  /// Un trajet deja conteste disparait de la liste : on n'ouvre qu'un
  /// litige par trajet, autant ne pas le proposer une seconde fois.
  Future<List<Map<String, dynamic>>> _billetsEligibles() async {
    final billets = await ApiService.mesBillets();
    final dejaContestes = _litiges
        .map((l) => '${l['trajet_id'] ?? ''}')
        .where((n) => n.isNotEmpty)
        .toSet();
    return billets
        .where((b) => const {'en_cours', 'termine', 'incident'}
            .contains('${b['statut_trajet']}'))
        .where((b) => !dejaContestes.contains('${b['trajet_id'] ?? ''}'))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return EcranJego(
      titre: 'Litiges',
      // Sans compte, l'ecran n'invite qu'a se connecter : proposer
      // « Ouvrir un litige » ne menerait nulle part.
      flottant: Session.token == null
          ? null
          : FloatingActionButton.extended(
              backgroundColor: JegoTheme.vert,
              foregroundColor: JegoTheme.surVert,
              onPressed: _ouvrirFormulaire,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Ouvrir un litige',
                  style: TextStyle(fontWeight: FontWeight.w800)),
            ),
      corps: Session.token == null
          ? _inviteConnexion()
          : RefreshIndicator(
        onRefresh: _charger,
        child: _chargement
            ? const Center(child: CircularProgressIndicator())
            : _erreur != null
                ? _messageCentre(Icons.lock_outline_rounded, _erreur!)
                : _litiges.isEmpty
                    ? _messageCentre(Icons.gavel_rounded,
                        "Vous n'avez ouvert aucun litige.\nUtilisez le bouton ci-dessous si un voyage s'est mal passé.")
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                        itemCount: _litiges.length,
                        itemBuilder: (_, i) => _carte(_litiges[i]),
                      ),
      ),
    );
  }

  /// Sans compte, on n'affiche ni erreur technique ni liste vide : on
  /// explique pourquoi et on emmene directement a la connexion.
  Widget _inviteConnexion() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                  color: JegoTheme.vert.withOpacity(0.12),
                  shape: BoxShape.circle),
              child: Icon(Icons.lock_outline_rounded,
                  color: JegoTheme.vert, size: 34),
            ),
            const SizedBox(height: 16),
            Text('Connectez-vous',
                style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: JegoTheme.texte)),
            const SizedBox(height: 8),
            Text(
              'Vos litiges sont liés à votre compte et à vos billets. Connectez-vous pour les consulter ou en ouvrir un.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 13, height: 1.5, color: JegoTheme.texteSecondaire),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: JegoTheme.vert,
                  foregroundColor: JegoTheme.surVert,
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                ),
                onPressed: () async {
                  await Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => const EcranConnexionInscription()));
                  if (mounted && Session.token != null) _charger();
                },
                child: const Text('Se connecter',
                    style: TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageCentre(IconData icone, String texte) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(icone, size: 42, color: JegoTheme.texteTernaire),
        const SizedBox(height: 14),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 36),
          child: Text(texte,
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: JegoTheme.texteSecondaire, fontSize: 14, height: 1.5)),
        ),
      ],
    );
  }

  ({String libelle, Color couleur}) _statut(String? brut) {
    switch (brut) {
      case 'ouvert':
        return (libelle: 'En attente de réponse', couleur: JegoTheme.etoile);
      case 'en_cours':
        return (libelle: 'En cours de traitement', couleur: JegoTheme.etoile);
      case 'escalade':
        return (libelle: 'Escaladé à JEGO', couleur: JegoTheme.danger);
      case 'resolu':
        return (libelle: 'Résolu', couleur: JegoTheme.vert);
      case 'cloture':
        return (libelle: 'Clôturé', couleur: JegoTheme.texteSecondaire);
      default:
        return (libelle: '$brut', couleur: JegoTheme.texteSecondaire);
    }
  }

  Widget _carte(Map<String, dynamic> l) {
    final st = _statut('${l['statut']}');
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('${l['trajet'] ?? 'Trajet'}',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: JegoTheme.texte)),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: st.couleur.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Text(st.libelle,
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: st.couleur)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
              [
                '${l['date_trajet'] ?? ''}',
                '${l['heure_trajet'] ?? ''}',
              ].where((t) => t.isNotEmpty).join(' · '),
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: JegoTheme.texteSecondaire)),
          // Le titre annonce le troncon reellement paye (Douala ->
          // Bafoussam), pas la ligne entiere : la ligne complete ne
          // s'affiche que si elle differe, pour situer le voyage.
          if ('${l['ligne_complete'] ?? ''}'.isNotEmpty &&
              l['ligne_complete'] != l['trajet']) ...[
            const SizedBox(height: 2),
            Text("Ligne complète : ${l['ligne_complete']}",
                style:
                    TextStyle(fontSize: 11, color: JegoTheme.texteTernaire)),
          ],
          const SizedBox(height: 2),
          Text('${l['numero'] ?? ''}',
              style: TextStyle(fontSize: 11, color: JegoTheme.texteTernaire)),
          const SizedBox(height: 2),
          Text(
              "Litige ouvert le ${l['date_ouverture'] ?? '—'} à ${l['heure_ouverture'] ?? '—'}",
              style:
                  TextStyle(fontSize: 11, color: JegoTheme.texteTernaire)),
          const SizedBox(height: 10),
          Text('${l['description'] ?? ''}',
              style:
                  TextStyle(fontSize: 13, height: 1.4, color: JegoTheme.texte)),
          const SizedBox(height: 10),
          // Trois issues. Gagnant : vert, sans la raison — celle-ci est
          // ecrite pour le perdant, elle explique un refus. Perdant :
          // rouge, avec la raison. Sinon : investigation en cours.
          if (l['gagnant'] == 'voyageur')
            _encartColore('Décision : en votre faveur', null, JegoTheme.vert)
          else if (l['gagnant'] == 'agence')
            _encartColore('Litige perdu', '${l['decision'] ?? ''}',
                JegoTheme.danger)
          else
            _encartColore("Décision : en cours d'investigation",
                "JEGO n'a pas encore tranché ce litige.",
                JegoTheme.texteSecondaire),
        ],
      ),
    );
  }

  /// Encart colore selon l'issue : vert si le client a gagne, rouge
  /// s'il a perdu. Le texte est facultatif.
  Widget _encartColore(String titre, String? texte, Color couleur) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: couleur.withOpacity(0.10),
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        border: Border.all(color: couleur.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titre,
              style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w800, color: couleur)),
          if (texte != null && texte.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(texte,
                style: TextStyle(
                    fontSize: 13, height: 1.4, color: JegoTheme.texte)),
          ],
        ],
      ),
    );
  }

  Future<void> _ouvrirFormulaire() async {
    List<Map<String, dynamic>> billets;
    try {
      billets = await _billetsEligibles();
    } catch (e) {
      if (mounted) _toast('Impossible de charger vos billets');
      return;
    }
    if (!mounted) return;
    if (billets.isEmpty) {
      _toast("Aucun voyage concerné : un litige s'ouvre après le départ.");
      return;
    }

    final envoye = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormulaireLitige(billets: billets),
    );
    if (envoye == true && mounted) {
      _toast("Litige envoyé. L'agence doit répondre.");
      _charger();
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _FormulaireLitige extends StatefulWidget {
  const _FormulaireLitige({required this.billets});
  final List<Map<String, dynamic>> billets;

  @override
  State<_FormulaireLitige> createState() => _FormulaireLitigeState();
}

class _FormulaireLitigeState extends State<_FormulaireLitige> {
  String? _billetId;
  final _texte = TextEditingController();
  bool _envoi = false;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _billetId = '${widget.billets.first['billet_id']}';
  }

  @override
  void dispose() {
    _texte.dispose();
    super.dispose();
  }

  /// Heure a laquelle CE billet embarque : sur un troncon, le bus ne
  /// part pas a l'heure de depart de la ligne.
  String _heure(Map<String, dynamic> b) {
    final h = '${b['heure_troncon'] ?? b['heure_depart'] ?? ''}';
    return h.length >= 5 ? h.substring(0, 5) : h;
  }

  Future<void> _envoyer() async {
    final texte = _texte.text.trim();
    if (texte.length < 20) {
      setState(() => _erreur =
          "Expliquez en quelques phrases ce qui s'est passé (20 caractères minimum).");
      return;
    }
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    try {
      // Le client ecrit librement : l'objet vu par l'agence et l'admin
      // est le debut de son texte, pas une categorie imposee.
      final objet = texte.length <= 80 ? texte : '${texte.substring(0, 80)}...';
      await ApiService.ouvrirLitige(
          billetId: _billetId!, motif: objet, description: texte);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _envoi = false;
        _erreur = e is ErreurApi ? e.message : 'Envoi impossible';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                      color: JegoTheme.bordCarte,
                      borderRadius: BorderRadius.circular(3)),
                ),
              ),
              const SizedBox(height: 16),
              Text('Ouvrir un litige',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: JegoTheme.texte)),
              const SizedBox(height: 14),
              Text('Voyage concerné',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: JegoTheme.texteSecondaire)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: JegoTheme.champ,
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _billetId,
                    isExpanded: true,
                    dropdownColor: JegoTheme.fondCarte,
                    items: widget.billets
                        .map((b) => DropdownMenuItem(
                              value: '${b['billet_id']}',
                              child: Text(
                                '${b['depart']} → ${b['arrivee']} · ${b['date_depart']} · ${_heure(b)}',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontSize: 13, color: JegoTheme.texte),
                              ),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _billetId = v),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text("Expliquez ce qui s'est passé",
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: JegoTheme.texteSecondaire)),
              const SizedBox(height: 6),
              TextField(
                controller: _texte,
                maxLines: 6,
                maxLength: 1000,
                style: TextStyle(fontSize: 14, color: JegoTheme.texte),
                decoration: InputDecoration(
                  hintText:
                      "Racontez les faits : ce qui était prévu, ce qui s'est réellement passé, à quelle heure et où.",
                  hintStyle:
                      TextStyle(fontSize: 13, color: JegoTheme.texteTernaire),
                  filled: true,
                  fillColor: JegoTheme.champ,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                      borderSide: BorderSide.none),
                ),
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: JegoTheme.etoile.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline_rounded,
                        size: 18, color: JegoTheme.etoile),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Rédigez clairement votre plainte et ce que vous voulez obtenir. Tout message incompréhensible ne sera pas traité.',
                        style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            fontWeight: FontWeight.w600,
                            color: JegoTheme.texte),
                      ),
                    ),
                  ],
                ),
              ),
              if (_erreur != null) ...[
                const SizedBox(height: 10),
                Text(_erreur!,
                    style: TextStyle(fontSize: 12, color: JegoTheme.danger)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: JegoTheme.vert,
                    foregroundColor: JegoTheme.surVert,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                  ),
                  onPressed: _envoi ? null : _envoyer,
                  child: Text(_envoi ? 'Envoi…' : 'Envoyer',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
