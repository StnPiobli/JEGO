import 'package:flutter/material.dart';
import '../config/api.dart';
import '../config/session.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/champ_telephone.dart';
import '../widgets/style_jego.dart';
import 'ecran_mot_de_passe.dart';

/// Mes informations : trois cartes indépendantes.
///
///   Identité      prénom, nom (un changement tous les 6 mois)
///   Coordonnées   téléphone, email
///   Sécurité      mot de passe, sur un écran à part
///
/// Chaque carte s'ouvre seule en modification et s'enregistre seule :
/// un nom refusé (règle des 6 mois) n'empêche plus de corriger son email.
/// Le serveur fait foi : ce qu'il renvoie est ce qui s'affiche.
class EcranMesInformations extends StatefulWidget {
  const EcranMesInformations({super.key});

  @override
  State<EcranMesInformations> createState() => _EcranMesInformationsState();
}

enum _Carte { identite, coordonnees }

class _EcranMesInformationsState extends State<EcranMesInformations> {
  Map<String, dynamic>? _profil;
  String? _erreurChargement;

  /// Carte ouverte en modification (une seule à la fois).
  _Carte? _enCours;
  bool _envoi = false;
  final Map<String, String> _erreurs = {};

  /// Carte qui vient d'être enregistrée : affiche « Enregistré » un instant.
  _Carte? _enregistree;

  final _prenom = TextEditingController();
  final _nom = TextEditingController();
  final _email = TextEditingController();
  final _tel = TextEditingController();
  Pays _pays = PaysTelephone.cameroun;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  @override
  void dispose() {
    for (final c in [_prenom, _nom, _email, _tel]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _charger() async {
    try {
      final p = await ApiService.monProfil();
      if (mounted) setState(() => _profil = p);
    } on ErreurApi catch (e) {
      if (mounted) setState(() => _erreurChargement = e.message);
    }
  }

  // ── Règle des 6 mois ───────────────────────────────────────────

  /// Date à partir de laquelle le nom pourra de nouveau changer, ou null
  /// s'il peut changer dès maintenant.
  DateTime? get _prochainChangementNom {
    final brut = _profil?['dernier_changement_nom'];
    if (brut == null) return null;
    final dernier = DateTime.tryParse('$brut');
    if (dernier == null) return null;
    final prochain = DateTime(dernier.year, dernier.month + 6, dernier.day);
    return prochain.isAfter(DateTime.now()) ? prochain : null;
  }

  /// « +237653535355 » se lit « +237 6 53 53 53 55 », comme à la saisie.
  String _telephoneLisible(String brut) {
    if (brut.isEmpty) return '';
    final (pays, local) = PaysTelephone.separer(brut);
    return '${pays.indicatif} ${PaysTelephone.grouper(local)}';
  }

  String _dateFr(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  // ── Ouverture / fermeture d'une carte ──────────────────────────

  void _ouvrir(_Carte carte) {
    final p = _profil ?? {};
    _erreurs.clear();
    if (carte == _Carte.identite) {
      _prenom.text = '${p['prenom'] ?? ''}';
      _nom.text = '${p['nom'] ?? ''}';
    } else {
      final (pays, local) = PaysTelephone.separer('${p['telephone'] ?? ''}');
      _pays = pays;
      _tel.text = PaysTelephone.grouper(local);
      _email.text = '${p['email'] ?? ''}';
    }
    setState(() {
      _enCours = carte;
      _enregistree = null;
    });
  }

  void _annuler() => setState(() {
        _enCours = null;
        _erreurs.clear();
      });

  // ── Enregistrement d'une carte ─────────────────────────────────

  Future<void> _enregistrer() async {
    final p = _profil ?? {};
    final carte = _enCours;
    if (carte == null) return;
    _erreurs.clear();
    final champs = <String, dynamic>{};

    if (carte == _Carte.identite) {
      final prenom = _prenom.text.trim();
      final nom = _nom.text.trim();
      if (prenom.isEmpty) _erreurs['prenom'] = Strings.t('profil_champ_vide');
      if (nom.isEmpty) _erreurs['nom'] = Strings.t('profil_champ_vide');
      // N'envoyer que ce qui change : renvoyer un nom identique
      // déclencherait pour rien la règle des 6 mois.
      if (prenom != '${p['prenom'] ?? ''}') champs['prenom'] = prenom;
      if (nom != '${p['nom'] ?? ''}') champs['nom'] = nom;
    } else {
      final email = _email.text.trim();
      if (email.isEmpty) {
        _erreurs['email'] = Strings.t('profil_champ_vide');
      } else if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
        _erreurs['email'] = Strings.t('profil_email_invalide');
      }
      if (!PaysTelephone.valide(_pays, _tel.text)) {
        _erreurs['tel'] = Strings.t('profil_tel_invalide');
      }
      final tel = PaysTelephone.composer(_pays, _tel.text);
      if (tel != '${p['telephone'] ?? ''}') champs['telephone'] = tel;
      if (email != '${p['email'] ?? ''}') champs['email'] = email;
    }

    if (_erreurs.isNotEmpty) {
      setState(() {});
      return;
    }
    if (champs.isEmpty) {
      _annuler();
      return;
    }

    setState(() => _envoi = true);
    try {
      final v = await ApiService.modifierProfil(champs);
      Session.majProfil(
        pNom: '${v['nom'] ?? p['nom'] ?? ''}',
        pPrenom: '${v['prenom'] ?? p['prenom'] ?? ''}',
        pEmail: '${v['email'] ?? p['email'] ?? ''}',
        pTelephone: '${v['telephone'] ?? p['telephone'] ?? ''}',
      );
      // Relit le profil : la date du dernier changement de nom en dépend.
      final frais = await ApiService.monProfil();
      if (!mounted) return;
      setState(() {
        _profil = frais;
        _enCours = null;
        _enregistree = carte;
      });
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && _enregistree == carte) setState(() => _enregistree = null);
      });
    } on ErreurApi catch (e) {
      if (!mounted) return;
      final m = e.message.toLowerCase();
      setState(() {
        if (m.contains('email')) {
          _erreurs['email'] = e.message;
        } else if (m.contains('numéro') || m.contains('numero')) {
          _erreurs['tel'] = e.message;
        } else if (carte == _Carte.identite) {
          _erreurs['nom'] = e.message;
        } else {
          _erreurs['general'] = e.message;
        }
      });
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return EcranJego(
      titre: 'Mes informations',
      corps: _corps(),
    );
  }

  Widget _corps() {
    if (_erreurChargement != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(_erreurChargement!,
              textAlign: TextAlign.center,
              style: TextStyle(color: JegoTheme.texteSecondaire)),
        ),
      );
    }
    if (_profil == null) {
      return Center(child: CircularProgressIndicator(color: JegoTheme.vert));
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 40),
      children: [
        _carteIdentite(),
        const SizedBox(height: 14),
        _carteCoordonnees(),
        const SizedBox(height: 14),
        _carteSecurite(),
      ],
    );
  }

  Widget _enTeteCarte(String titre, IconData icone, _Carte? carte) {
    final ouverte = carte != null && _enCours == carte;
    return Row(
      children: [
        Icon(icone, size: 18, color: JegoTheme.vert),
        const SizedBox(width: 8),
        Expanded(
          child: Text(titre,
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 15,
                  fontWeight: FontWeight.w800)),
        ),
        if (carte != null && _enregistree == carte)
          Row(children: [
            Icon(Icons.check_circle_rounded, size: 16, color: JegoTheme.vert),
            const SizedBox(width: 4),
            Text('Enregistré',
                style: TextStyle(
                    color: JegoTheme.vert,
                    fontSize: 12,
                    fontWeight: FontWeight.w800)),
          ])
        else if (carte != null && !ouverte && _enCours == null)
          BoutonTactile(
            onTap: () => _ouvrir(carte),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Text('Modifier',
                  style: TextStyle(
                      color: JegoTheme.vert,
                      fontSize: 13,
                      fontWeight: FontWeight.w800)),
            ),
          ),
      ],
    );
  }

  Widget _ligneLecture(String libelle, String valeur) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(libelle,
              style: TextStyle(
                  color: JegoTheme.texteTernaire,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(valeur.isEmpty ? '—' : valeur,
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _champ(String cle, TextEditingController ctrl, String libelle,
      {TextInputType clavier = TextInputType.text,
      TextCapitalization capitalisation = TextCapitalization.none}) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: ctrl,
            enabled: !_envoi,
            keyboardType: clavier,
            textCapitalization: capitalisation,
            style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 14.5,
                fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              labelText: libelle,
              filled: true,
              fillColor: JegoTheme.champ,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                borderSide: BorderSide(
                    color: _erreurs[cle] != null
                        ? JegoTheme.danger
                        : JegoTheme.bordCarte),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                borderSide: BorderSide(
                    color: _erreurs[cle] != null
                        ? JegoTheme.danger
                        : JegoTheme.bordCarte),
              ),
            ),
          ),
          _erreur(cle),
        ],
      ),
    );
  }

  Widget _erreur(String cle) {
    final e = _erreurs[cle];
    if (e == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 5, left: 4),
      child: Text(e,
          style: TextStyle(
              color: JegoTheme.danger,
              fontSize: 12,
              fontWeight: FontWeight.w600)),
    );
  }

  Widget _boutons() {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _envoi ? null : _annuler,
              style: OutlinedButton.styleFrom(
                foregroundColor: JegoTheme.texte,
                side: BorderSide(color: JegoTheme.bordCarte),
                minimumSize: const Size.fromHeight(46),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
              ),
              child: const Text('Annuler',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton(
              onPressed: _envoi ? null : _enregistrer,
              style: ElevatedButton.styleFrom(
                backgroundColor: JegoTheme.vert,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(46),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
              ),
              child: Text(_envoi ? 'Enregistrement…' : 'Enregistrer',
                  style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _note(String texte) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded,
              size: 14, color: JegoTheme.texteTernaire),
          const SizedBox(width: 6),
          Expanded(
            child: Text(texte,
                style: TextStyle(
                    color: JegoTheme.texteTernaire,
                    fontSize: 11.5,
                    height: 1.35)),
          ),
        ],
      ),
    );
  }

  Widget _carteIdentite() {
    final p = _profil!;
    final ouverte = _enCours == _Carte.identite;
    final prochain = _prochainChangementNom;
    return CarteJego(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _enTeteCarte('Identité', Icons.badge_rounded, _Carte.identite),
          if (!ouverte) ...[
            _ligneLecture(Strings.t('champ_prenom'), '${p['prenom'] ?? ''}'),
            _ligneLecture(Strings.t('champ_nom'), '${p['nom'] ?? ''}'),
          ] else ...[
            _champ('prenom', _prenom, Strings.t('champ_prenom'),
                capitalisation: TextCapitalization.words),
            _champ('nom', _nom, Strings.t('champ_nom'),
                capitalisation: TextCapitalization.words),
          ],
          _note(prochain == null
              ? 'Le nom ne peut être changé qu\'une fois tous les 6 mois.'
              : 'Nom changé récemment : prochain changement possible le ${_dateFr(prochain)}.'),
          if (ouverte) _boutons(),
        ],
      ),
    );
  }

  Widget _carteCoordonnees() {
    final p = _profil!;
    final ouverte = _enCours == _Carte.coordonnees;
    final emailVerifie = p['email_verifie'] == true;
    return CarteJego(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _enTeteCarte('Coordonnées', Icons.contact_phone_rounded, _Carte.coordonnees),
          if (!ouverte) ...[
            _ligneLecture(Strings.t('champ_telephone'), _telephoneLisible('${p['telephone'] ?? ''}')),
            _ligneLecture(
                Strings.t('champ_email'),
                '${p['email'] ?? ''}${'${p['email'] ?? ''}'.isEmpty ? '' : emailVerifie ? '  ✓ vérifié' : '  · non vérifié'}'),
          ] else ...[
            const SizedBox(height: 12),
            ChampTelephone(
              controller: _tel,
              pays: _pays,
              onPays: (pays) => setState(() => _pays = pays),
              libelle: Strings.t('champ_telephone'),
            ),
            _erreur('tel'),
            _champ('email', _email, Strings.t('champ_email'),
                clavier: TextInputType.emailAddress),
            _note('Un nouvel email devra être vérifié à nouveau.'),
            _erreur('general'),
            _boutons(),
          ],
        ],
      ),
    );
  }

  Widget _carteSecurite() {
    final p = _profil!;
    final aMotDePasse = p['a_mot_de_passe'] != false;
    return CarteJego(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _enTeteCarte('Sécurité', Icons.lock_rounded, null),
          const SizedBox(height: 10),
          if (!aMotDePasse)
            _note(Strings.t('profil_compte_google'))
          else
            BoutonTactile(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => const EcranMotDePasse())),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: JegoTheme.champ,
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  border: Border.all(color: JegoTheme.bordCarte),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(Strings.t('profil_changer_mdp'),
                          style: TextStyle(
                              color: JegoTheme.texte,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700)),
                    ),
                    Icon(Icons.chevron_right_rounded,
                        color: JegoTheme.texteTernaire),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
