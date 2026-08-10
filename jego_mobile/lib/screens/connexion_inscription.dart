import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../config/api.dart';
import '../config/session.dart';
import '../config/session_chauffeur.dart';
import '../config/theme_jego.dart';
import 'ecran_accueil_chauffeur.dart';
import '../l10n/strings.dart';
import '../widgets/champ_telephone.dart';
import '../widgets/selecteur_date.dart';
import 'conditions_utilisation.dart';

/// Connexion / Inscription premium.
/// Connexion : telephone OU email + boutons sociaux (Google/Facebook/Apple).
/// Inscription : 4 etapes (1-2-3-4), robustesse mdp en direct,
/// telephones avec indicatif pays et format valide, CGU cliquables et
/// obligatoires, erreurs en petit texte rouge sous les champs.
class EcranConnexionInscription extends StatefulWidget {
  final bool ouvrirInscription;
  const EcranConnexionInscription({super.key, this.ouvrirInscription = false});

  @override
  State<EcranConnexionInscription> createState() =>
      _EcranConnexionInscriptionState();
}

class _EcranConnexionInscriptionState
    extends State<EcranConnexionInscription> {
  late bool _modeInscription;

  @override
  void initState() {
    super.initState();
    _modeInscription = widget.ouvrirInscription;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
              child: Row(
                children: [
                  BoutonTactile(
                    onTap: () => Navigator.of(context).pop(false),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: const Icon(Icons.close_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    _modeInscription
                        ? Strings.t('auth_inscription')
                        : Strings.t('auth_connexion'),
                    style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 350),
                switchInCurve: Curves.easeOutCubic,
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween<Offset>(
                            begin: const Offset(0.04, 0),
                            end: Offset.zero)
                        .animate(anim),
                    child: child,
                  ),
                ),
                child: _modeInscription
                    ? _VueInscription(
                        key: const ValueKey('inscription'),
                        versConnexion: () =>
                            setState(() => _modeInscription = false),
                      )
                    : _VueConnexion(
                        key: const ValueKey('connexion'),
                        versInscription: () =>
                            setState(() => _modeInscription = true),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================== CONNEXION ===============================

class _VueConnexion extends StatefulWidget {
  final VoidCallback versInscription;
  const _VueConnexion({super.key, required this.versInscription});

  @override
  State<_VueConnexion> createState() => _VueConnexionState();
}

class _VueConnexionState extends State<_VueConnexion> {
  final _cIdentifiant = TextEditingController(); // telephone OU email
  final _cMdp = TextEditingController();
  bool _mdpVisible = false;
  bool _enCours = false;
  String? _erreur;

  @override
  void dispose() {
    _cIdentifiant.dispose();
    _cMdp.dispose();
    super.dispose();
  }

  /// Connexion réelle contre le backend.
  ///
  /// Le compte voyageur et le compte chauffeur s'authentifient tous
  /// deux par téléphone. On tente d'abord le compte voyageur ; si les
  /// identifiants n'y correspondent pas, on essaie le compte
  /// chauffeur avant de conclure à une erreur.
  Future<void> _connecter() async {
    if (_enCours) return;

    final id = _cIdentifiant.text.trim();
    if (id.isEmpty || _cMdp.text.isEmpty) {
      setState(() => _erreur = Strings.t('erreur_champs_requis'));
      return;
    }

    final estTel = RegExp(r'^\+?[0-9 ]{8,15}$').hasMatch(id);
    if (!estTel) {
      setState(() => _erreur =
          'Connectez-vous avec votre numéro de téléphone.');
      return;
    }

    setState(() {
      _erreur = null;
      _enCours = true;
    });

    try {
      await ApiService.connecter(telephone: id, motDePasse: _cMdp.text);
      if (!mounted) return;
      setState(() => _enCours = false);
      Navigator.of(context).pop(true);
      return;
    } on ErreurApi catch (eVoyageur) {
      // Identifiants inconnus côté voyageur : peut-être un chauffeur.
      try {
        final rep = await ApiService.connecterChauffeur(
          telephone: id,
          motDePasse: _cMdp.text,
        );
        final c = rep['chauffeur'] ?? {};
        SessionChauffeur.connecter(
          nom: (c['nom'] ?? '').toString(),
          prenom: (c['prenom'] ?? '').toString(),
          telephone: (c['telephone'] ?? id).toString(),
          token: rep['token']?.toString(),
          chauffeurId: c['id']?.toString(),
        );
        if (!mounted) return;
        setState(() => _enCours = false);
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const EcranAccueilChauffeur()),
        );
        return;
      } on ErreurApi catch (eChauffeur) {
        if (!mounted) return;
        setState(() {
          _enCours = false;
          // On affiche le message le plus parlant : un compte
          // désactivé doit être signalé comme tel, pas confondu
          // avec un mot de passe erroné.
          _erreur = eChauffeur.statut == 403
              ? eChauffeur.message
              : eVoyageur.message;
        });
      }
    }
  }

  /// La connexion par Google / Facebook / Apple n'est pas encore
  /// raccordée côté serveur. Tant qu'elle ne l'est pas, on le dit
  /// clairement au lieu d'ouvrir une session qui n'existe pas.
  void _connexionSociale(String fournisseur) {
    setState(() => _erreur =
        'La connexion $fournisseur arrive bientôt. Utilisez votre numéro de téléphone pour le moment.');
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Center(
          child: Container(
            width: 74,
            height: 74,
            decoration: BoxDecoration(
              color: JegoTheme.vert.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(
                  color: JegoTheme.vert.withOpacity(0.3), width: 1),
            ),
            child: const Icon(Icons.person_rounded,
                size: 36, color: JegoTheme.vert),
          ),
        ).animate().scale(
            begin: const Offset(0.7, 0.7),
            duration: 450.ms,
            curve: Curves.easeOutBack),
        const SizedBox(height: 10),
        Center(
          child: Text(
            Strings.t('connexion_bienvenue'),
            style: const TextStyle(
              color: JegoTheme.texte,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
        ).animate(delay: 100.ms).fadeIn(duration: 400.ms),
        const SizedBox(height: 4),
        Center(
          child: Text(
            Strings.t('connexion_sous_titre'),
            style: const TextStyle(
                color: JegoTheme.texteSecondaire, fontSize: 13),
          ),
        ).animate(delay: 160.ms).fadeIn(duration: 400.ms),
        const SizedBox(height: 24),
        _CarteFormulaire(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ChampJego(
                controller: _cIdentifiant,
                libelle: '${Strings.t('connexion_identifiant')} *',
                icone: Icons.alternate_email_rounded,
                clavier: TextInputType.emailAddress,
                onChange: (_) => setState(() => _erreur = null),
              ),
              const SizedBox(height: 10),
              ChampJego(
                controller: _cMdp,
                libelle: '${Strings.t('champ_mdp')} *',
                icone: Icons.lock_rounded,
                masque: !_mdpVisible,
                onChange: (_) => setState(() => _erreur = null),
                suffixe: BoutonTactile(
                  onTap: () =>
                      setState(() => _mdpVisible = !_mdpVisible),
                  child: Icon(
                    _mdpVisible
                        ? Icons.visibility_rounded
                        : Icons.visibility_off_rounded,
                    size: 19,
                    color: JegoTheme.texteTernaire,
                  ),
                ),
              ),
              if (_erreur != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6, left: 4),
                  child: Text(
                    _erreur!,
                    style: const TextStyle(
                      color: JegoTheme.danger,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: BoutonTactile(
                  onTap: () {
                    // Flux mot de passe oublie — a construire (SMS/email)
                  },
                  child: Text(
                    Strings.t('mdp_oublie'),
                    style: const TextStyle(
                      color: JegoTheme.vert,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ).animate(delay: 220.ms).fadeIn(duration: 450.ms).slideY(begin: 0.12),
        const SizedBox(height: 16),
        BoutonPrincipal(
          libelle: Strings.t('auth_connexion'),
          onTap: _connecter,
        ).animate(delay: 300.ms).fadeIn(duration: 450.ms).slideY(begin: 0.15),
        const SizedBox(height: 20),
        // ---- Connexion sociale (connecte OU cree le compte) ----
        Row(
          children: [
            const Expanded(
                child: Divider(color: JegoTheme.bordCarte, height: 1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                Strings.t('continuer_avec'),
                style: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 12),
              ),
            ),
            const Expanded(
                child: Divider(color: JegoTheme.bordCarte, height: 1)),
          ],
        ).animate(delay: 360.ms).fadeIn(duration: 400.ms),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _boutonSocial(
              onTap: () => _connexionSociale('google'),
              enfant: Image.network(
                'https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.0.0/google/google.png',
                width: 26,
                height: 26,
                errorBuilder: (context, error, stack) => const Text(
                  'G',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF4285F4),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            _boutonSocial(
              onTap: () => _connexionSociale('facebook'),
              enfant: const Icon(Icons.facebook,
                  size: 26, color: Color(0xFF1877F2)),
            ),
            const SizedBox(width: 14),
            _boutonSocial(
              onTap: () => _connexionSociale('apple'),
              enfant:
                  const Icon(Icons.apple, size: 26, color: Colors.black),
            ),
          ],
        ).animate(delay: 420.ms).fadeIn(duration: 450.ms).slideY(begin: 0.15),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              Strings.t('pas_de_compte'),
              style: const TextStyle(
                  color: JegoTheme.texteSecondaire, fontSize: 13),
            ),
            const SizedBox(width: 5),
            BoutonTactile(
              onTap: widget.versInscription,
              child: Text(
                Strings.t('creer_compte'),
                style: const TextStyle(
                  color: JegoTheme.vert,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ).animate(delay: 480.ms).fadeIn(duration: 400.ms),
      ],
    );
  }

  Widget _boutonSocial(
      {required VoidCallback onTap, required Widget enfant}) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        width: 58,
        height: 58,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: JegoTheme.bordCarte, width: 1),
          boxShadow: JegoTheme.ombreDouce,
        ),
        child: enfant,
      ),
    );
  }
}

// =============================== INSCRIPTION ===============================

class _VueInscription extends StatefulWidget {
  final VoidCallback versConnexion;
  const _VueInscription({super.key, required this.versConnexion});

  @override
  State<_VueInscription> createState() => _VueInscriptionState();
}

class _VueInscriptionState extends State<_VueInscription> {
  int _etape = 0; // 0..3
  bool _enCours = false;
  static const int nbEtapes = 4;

  // Etape 1 : identite
  final _cNom = TextEditingController();
  final _cPrenom = TextEditingController();
  DateTime? _dateNaissance;
  final _cLieuNaissance = TextEditingController();

  // Etape 2 : contact
  final _cTel = TextEditingController();
  final _cEmail = TextEditingController();
  Pays _paysTel = PaysTelephone.cameroun;

  // Etape 3 : securite
  final _cMdp = TextEditingController();
  final _cMdpConfirme = TextEditingController();
  bool _mdpVisible = false;

  // Etape 4 : urgence + CGU
  final _cUrgenceNom = TextEditingController();
  final _cUrgenceTel = TextEditingController();
  Pays _paysUrgence = PaysTelephone.cameroun;
  bool _cguAcceptees = false;

  String? _erreur;

  @override
  void dispose() {
    _cNom.dispose();
    _cPrenom.dispose();
    _cLieuNaissance.dispose();
    _cTel.dispose();
    _cEmail.dispose();
    _cMdp.dispose();
    _cMdpConfirme.dispose();
    _cUrgenceNom.dispose();
    _cUrgenceTel.dispose();
    super.dispose();
  }

  // ---- Robustesse du mot de passe ----
  bool get _mdp8 => _cMdp.text.length >= 8;
  bool get _mdpMaj => _cMdp.text.contains(RegExp(r'[A-Z]'));
  bool get _mdpMin => _cMdp.text.contains(RegExp(r'[a-z]'));
  bool get _mdpChiffre => _cMdp.text.contains(RegExp(r'[0-9]'));
  bool get _mdpSpecial =>
      _cMdp.text.contains(RegExp(r'[!@#\$%^&*(),.?":{}|<>_\-+=\[\]]'));
  bool get _mdpRobuste =>
      _mdp8 && _mdpMaj && _mdpMin && _mdpChiffre && _mdpSpecial;
  bool get _mdpIdentiques =>
      _cMdp.text.isNotEmpty && _cMdp.text == _cMdpConfirme.text;

  bool _etapeValide() {
    switch (_etape) {
      case 0:
        return _cNom.text.trim().isNotEmpty &&
            _cPrenom.text.trim().isNotEmpty &&
            _dateNaissance != null &&
            _cLieuNaissance.text.trim().isNotEmpty;
      case 1:
        return PaysTelephone.valide(_paysTel, _cTel.text) &&
            _cEmail.text.trim().isNotEmpty &&
            _cEmail.text.contains('@');
      case 2:
        return _mdpRobuste && _mdpIdentiques;
      case 3:
        return _cUrgenceNom.text.trim().isNotEmpty &&
            PaysTelephone.valide(_paysUrgence, _cUrgenceTel.text) &&
            _cguAcceptees;
      default:
        return false;
    }
  }

  String _messageErreur() {
    switch (_etape) {
      case 1:
        if (_cTel.text.trim().isNotEmpty &&
            !PaysTelephone.valide(_paysTel, _cTel.text)) {
          return Strings.t('erreur_tel_format');
        }
        if (_cEmail.text.trim().isNotEmpty &&
            !_cEmail.text.contains('@')) {
          return Strings.t('erreur_email');
        }
        return Strings.t('erreur_champs_requis');
      case 2:
        if (!_mdpRobuste) return Strings.t('erreur_mdp_faible');
        return Strings.t('erreur_mdp_differents');
      case 3:
        if (_cUrgenceTel.text.trim().isNotEmpty &&
            !PaysTelephone.valide(_paysUrgence, _cUrgenceTel.text)) {
          return Strings.t('erreur_tel_format');
        }
        if (_cUrgenceNom.text.trim().isEmpty ||
            _cUrgenceTel.text.trim().isEmpty) {
          return Strings.t('erreur_champs_requis');
        }
        return Strings.t('erreur_cgu');
      default:
        return Strings.t('erreur_champs_requis');
    }
  }

  Future<void> _suivant() async {
    if (_enCours) return;
    if (!_etapeValide()) {
      setState(() => _erreur = _messageErreur());
      return;
    }
    setState(() => _erreur = null);

    if (_etape < nbEtapes - 1) {
      setState(() => _etape++);
      return;
    }

    // Dernière étape : création réelle du compte côté serveur.
    final naissance = _dateNaissance;
    if (naissance == null) {
      setState(() {
        _etape = 0;
        _erreur = 'Renseignez votre date de naissance.';
      });
      return;
    }

    setState(() => _enCours = true);
    final telephone = '${_paysTel.indicatif}${_cTel.text.trim()}';

    try {
      await ApiService.inscrire(
        nom: _cNom.text.trim(),
        prenom: _cPrenom.text.trim(),
        dateNaissance:
            '${naissance.year.toString().padLeft(4, '0')}-${naissance.month.toString().padLeft(2, '0')}-${naissance.day.toString().padLeft(2, '0')}',
        lieuNaissance: _cLieuNaissance.text.trim(),
        telephone: telephone,
        email: _cEmail.text.trim(),
        motDePasse: _cMdp.text,
        contactUrgence: _cUrgenceTel.text.trim().isEmpty
            ? null
            : '${_paysUrgence.indicatif}${_cUrgenceTel.text.trim()}',
      );
      if (!mounted) return;
      setState(() => _enCours = false);
      Navigator.of(context).pop(true);
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() {
        _enCours = false;
        _erreur = e.message;
        // Un conflit (téléphone ou email déjà pris) concerne l'étape
        // des coordonnées : on y ramène l'utilisateur.
        if (e.statut == 409) _etape = 1;
      });
    }
  }

  void _precedent() {
    setState(() {
      _erreur = null;
      if (_etape > 0) _etape--;
    });
  }

  Future<void> _choisirDateNaissance() async {
    final choisie = await choisirDateJego(
      context,
      initiale: _dateNaissance ?? DateTime(2000),
      premiere: DateTime(1930),
      derniere: DateTime.now(),
    );
    if (choisie != null) setState(() => _dateNaissance = choisie);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ---- Indicateur d'etapes 1-2-3-4 ----
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 14, 28, 6),
          child: Row(
            children: List.generate(nbEtapes * 2 - 1, (i) {
              if (i.isOdd) {
                final fait = (i ~/ 2) < _etape;
                return Expanded(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: 2.5,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: fait ? JegoTheme.vert : JegoTheme.bordCarte,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }
              final numero = i ~/ 2;
              final fait = numero < _etape;
              final actif = numero == _etape;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOut,
                width: actif ? 34 : 28,
                height: actif ? 34 : 28,
                decoration: BoxDecoration(
                  color: fait || actif ? JegoTheme.vert : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: fait || actif
                        ? JegoTheme.vert
                        : JegoTheme.bordCarte,
                    width: 1.2,
                  ),
                  boxShadow: actif ? JegoTheme.ombreVerte : null,
                ),
                child: Center(
                  child: fait
                      ? const Icon(Icons.check_rounded,
                          size: 16, color: Colors.white)
                      : Text(
                          '${numero + 1}',
                          style: TextStyle(
                            color: actif
                                ? Colors.white
                                : JegoTheme.texteTernaire,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                ),
              );
            }),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 4, bottom: 2),
          child: Text(
            Strings.t('etape_${_etape + 1}_titre'),
            style: const TextStyle(
              color: JegoTheme.texte,
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Text(
          Strings.t('champs_obligatoires'),
          style: const TextStyle(
              color: JegoTheme.texteTernaire, fontSize: 11),
        ),
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 320),
            switchInCurve: Curves.easeOutCubic,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween<Offset>(
                        begin: const Offset(0.05, 0), end: Offset.zero)
                    .animate(anim),
                child: child,
              ),
            ),
            child: ListView(
              key: ValueKey(_etape),
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              children: [
                _CarteFormulaire(child: _contenuEtape()),
                if (_erreur != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8, left: 4),
                    child: Text(
                      _erreur!,
                      style: const TextStyle(
                        color: JegoTheme.danger,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        // ---- Boutons bas ----
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 8),
          child: Row(
            children: [
              if (_etape > 0)
                BoutonTactile(
                  onTap: _precedent,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 15),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius:
                          BorderRadius.circular(JegoTheme.rMoyen),
                      border: Border.all(
                          color: JegoTheme.bordCarte, width: 1),
                    ),
                    child: const Icon(Icons.arrow_back_rounded,
                        size: 20, color: JegoTheme.texte),
                  ),
                ),
              if (_etape > 0) const SizedBox(width: 10),
              Expanded(
                child: BoutonPrincipal(
                  libelle: _etape == nbEtapes - 1
                      ? Strings.t('creer_mon_compte')
                      : Strings.t('suivant'),
                  onTap: _suivant,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                Strings.t('deja_compte'),
                style: const TextStyle(
                    color: JegoTheme.texteSecondaire, fontSize: 13),
              ),
              const SizedBox(width: 5),
              BoutonTactile(
                onTap: widget.versConnexion,
                child: Text(
                  Strings.t('auth_connexion'),
                  style: const TextStyle(
                    color: JegoTheme.vert,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _contenuEtape() {
    switch (_etape) {
      case 0:
        return Column(
          children: [
            ChampJego(
              controller: _cNom,
              libelle: '${Strings.t('champ_nom')} *',
              icone: Icons.person_outline_rounded,
              onChange: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            ChampJego(
              controller: _cPrenom,
              libelle: '${Strings.t('champ_prenom')} *',
              icone: Icons.person_outline_rounded,
              onChange: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            BoutonTactile(
              onTap: _choisirDateNaissance,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: JegoTheme.champ,
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                ),
                child: Row(
                  children: [
                    Icon(Icons.cake_rounded,
                        size: 18,
                        color: _dateNaissance != null
                            ? JegoTheme.vert
                            : JegoTheme.texteTernaire),
                    const SizedBox(width: 10),
                    Text(
                      _dateNaissance == null
                          ? '${Strings.t('champ_date_naissance')} *'
                          : DateFormat('dd/MM/yyyy')
                              .format(_dateNaissance!),
                      style: TextStyle(
                        color: _dateNaissance != null
                            ? JegoTheme.texte
                            : JegoTheme.texteTernaire,
                        fontSize: 13.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            ChampJego(
              controller: _cLieuNaissance,
              libelle: '${Strings.t('champ_lieu_naissance')} *',
              icone: Icons.place_rounded,
              onChange: (_) => setState(() {}),
            ),
          ],
        );
      case 1:
        return Column(
          children: [
            ChampTelephone(
              controller: _cTel,
              pays: _paysTel,
              onPays: (p) => setState(() => _paysTel = p),
              libelle: '${Strings.t('champ_telephone')} *',
              onChange: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            ChampJego(
              controller: _cEmail,
              libelle: '${Strings.t('champ_email')} *',
              icone: Icons.mail_rounded,
              clavier: TextInputType.emailAddress,
              onChange: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.info_outline_rounded,
                    size: 14, color: JegoTheme.texteTernaire),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    Strings.t('info_un_numero'),
                    style: const TextStyle(
                        color: JegoTheme.texteTernaire, fontSize: 11.5),
                  ),
                ),
              ],
            ),
          ],
        );
      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ChampJego(
              controller: _cMdp,
              libelle: '${Strings.t('champ_mdp')} *',
              icone: Icons.lock_rounded,
              masque: !_mdpVisible,
              onChange: (_) => setState(() {}),
              suffixe: BoutonTactile(
                onTap: () => setState(() => _mdpVisible = !_mdpVisible),
                child: Icon(
                  _mdpVisible
                      ? Icons.visibility_rounded
                      : Icons.visibility_off_rounded,
                  size: 19,
                  color: JegoTheme.texteTernaire,
                ),
              ),
            ),
            const SizedBox(height: 12),
            _critere(_mdp8, Strings.t('mdp_c_8')),
            _critere(_mdpMaj, Strings.t('mdp_c_maj')),
            _critere(_mdpMin, Strings.t('mdp_c_min')),
            _critere(_mdpChiffre, Strings.t('mdp_c_chiffre')),
            _critere(_mdpSpecial, Strings.t('mdp_c_special')),
            const SizedBox(height: 12),
            ChampJego(
              controller: _cMdpConfirme,
              libelle: '${Strings.t('champ_mdp_confirme')} *',
              icone: Icons.lock_rounded,
              masque: !_mdpVisible,
              onChange: (_) => setState(() {}),
            ),
            if (_cMdpConfirme.text.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: _critere(
                    _mdpIdentiques, Strings.t('mdp_c_identiques')),
              ),
          ],
        );
      case 3:
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              Strings.t('urgence_explication'),
              style: const TextStyle(
                  color: JegoTheme.texteSecondaire, fontSize: 12.5),
            ),
            const SizedBox(height: 12),
            ChampJego(
              controller: _cUrgenceNom,
              libelle: '${Strings.t('urgence_nom')} *',
              icone: Icons.contact_emergency_rounded,
              onChange: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            ChampTelephone(
              controller: _cUrgenceTel,
              pays: _paysUrgence,
              onPays: (p) => setState(() => _paysUrgence = p),
              libelle: '${Strings.t('urgence_tel')} *',
              onChange: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BoutonTactile(
                  onTap: () =>
                      setState(() => _cguAcceptees = !_cguAcceptees),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color:
                          _cguAcceptees ? JegoTheme.vert : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _cguAcceptees
                            ? JegoTheme.vert
                            : JegoTheme.texteTernaire,
                        width: 1.4,
                      ),
                    ),
                    child: _cguAcceptees
                        ? const Icon(Icons.check_rounded,
                            size: 16, color: Colors.white)
                        : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        '${Strings.t('cgu_je_accepte')} ',
                        style: const TextStyle(
                            color: JegoTheme.texte, fontSize: 13),
                      ),
                      BoutonTactile(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  const EcranConditionsUtilisation(),
                            ),
                          );
                        },
                        child: Text(
                          Strings.t('cgu_lien'),
                          style: const TextStyle(
                            color: JegoTheme.vert,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            decoration: TextDecoration.underline,
                            decorationColor: JegoTheme.vert,
                          ),
                        ),
                      ),
                      const Text(
                        ' *',
                        style: TextStyle(
                            color: JegoTheme.danger,
                            fontSize: 13,
                            fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              Strings.t('declaration_honneur'),
              style: const TextStyle(
                  color: JegoTheme.texteTernaire, fontSize: 11),
            ),
          ],
        );
    }
  }

  Widget _critere(bool valide, String libelle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              color: valide ? JegoTheme.vert : JegoTheme.champ,
              shape: BoxShape.circle,
            ),
            child: valide
                ? const Icon(Icons.check_rounded,
                    size: 12, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 8),
          Text(
            libelle,
            style: TextStyle(
              color: valide ? JegoTheme.texte : JegoTheme.texteTernaire,
              fontSize: 12.5,
              fontWeight: valide ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// =============================== WIDGETS COMMUNS ===============================

class _CarteFormulaire extends StatelessWidget {
  final Widget child;
  const _CarteFormulaire({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: child,
    );
  }
}

class ChampJego extends StatelessWidget {
  final TextEditingController controller;
  final String libelle;
  final IconData icone;
  final TextInputType? clavier;
  final bool masque;
  final Widget? suffixe;
  final ValueChanged<String>? onChange;

  const ChampJego({
    super.key,
    required this.controller,
    required this.libelle,
    required this.icone,
    this.clavier,
    this.masque = false,
    this.suffixe,
    this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rPetit),
      ),
      child: TextField(
        controller: controller,
        keyboardType: clavier,
        obscureText: masque,
        onChanged: onChange,
        style: const TextStyle(color: JegoTheme.texte, fontSize: 14),
        cursorColor: JegoTheme.vert,
        decoration: InputDecoration(
          hintText: libelle,
          hintStyle: const TextStyle(
              color: JegoTheme.texteTernaire, fontSize: 13.5),
          prefixIcon: Icon(icone, size: 18, color: JegoTheme.vert),
          suffixIcon: suffixe == null
              ? null
              : Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: suffixe,
                ),
          suffixIconConstraints:
              const BoxConstraints(minWidth: 30, minHeight: 30),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        ),
      ),
    );
  }
}

class BoutonPrincipal extends StatelessWidget {
  final String libelle;
  final VoidCallback onTap;
  const BoutonPrincipal(
      {super.key, required this.libelle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        height: 54,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: JegoTheme.vert,
          borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
          boxShadow: JegoTheme.ombreVerte,
        ),
        child: Text(
          libelle,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
