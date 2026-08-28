import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../config/api.dart';
import '../config/session_chauffeur.dart';
import '../config/theme_jego.dart';
import 'ecran_accueil_chauffeur.dart';
import '../l10n/strings.dart';
import '../widgets/champ_telephone.dart';
import '../widgets/selecteur_date.dart';
import 'conditions_utilisation.dart';
import '../widgets/logos_sociaux.dart';
import '../config/auth_google.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../widgets/bouton_google_stub.dart'
    if (dart.library.js_interop) '../widgets/bouton_google_web.dart';

/// Connexion / Inscription premium.
/// Connexion : telephone OU email, ou compte Google.
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
                        color: JegoTheme.fondCarte,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: Icon(Icons.close_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    _modeInscription
                        ? Strings.t('auth_inscription')
                        : Strings.t('auth_connexion'),
                    style: TextStyle(
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
  StreamSubscription<GoogleSignInAuthenticationEvent>? _ecouteGoogle;

  /// Le bouton dessiné par Google est conservé tel quel. Le reconstruire
  /// à chaque `setState` — donc à chaque frappe dans un champ — lui
  /// faisait recréer son cadre et se redimensionner sans arrêt.
  Widget? _boutonGoogle;

  /// Vrai une fois Google initialisé. Sans cette attente, le bouton
  /// était dessiné une première fois avant l'initialisation, puis
  /// redessiné aussitôt après : un sursaut visible à l'ouverture.
  bool _googlePret = false;

  @override
  void initState() {
    super.initState();
    _preparerGoogle();
  }

  /// Google doit être initialisé avant de savoir s'il accepte notre
  /// bouton, et avant de pouvoir dessiner le sien sur le web.
  Future<void> _preparerGoogle() async {
    try {
      await AuthGoogle.preparer();
    } catch (_) {
      // Identifiant client absent ou mal formé : le bouton restera
      // inerte, le reste de l'écran continue de fonctionner.
      return;
    }
    if (!mounted) return;

    _googlePret = true;

    _ecouteGoogle = AuthGoogle.evenements.listen((evenement) {
      if (evenement is GoogleSignInAuthenticationEventSignIn) {
        final jeton = evenement.user.authentication.idToken;
        if (jeton != null) _terminerGoogle(jeton);
      }
    }, onError: (_) {});

    setState(() {});

    // Propose d'emblée les comptes déjà connus, pour éviter au voyageur
    // de retaper son adresse. S'il n'y en a aucun, rien ne s'affiche et
    // le bouton reste disponible.
    AuthGoogle.proposerComptesConnus();
  }

  @override
  void dispose() {
    _ecouteGoogle?.cancel();
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
    final estEmail = id.contains('@');
    if (!estTel && !estEmail) {
      setState(() => _erreur =
          'Entrez votre numéro de téléphone ou votre adresse email.');
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
          identifiant: id,
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
          MaterialPageRoute(builder: (_) => EcranAccueilChauffeur()),
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


  /// Mot de passe oublié, en deux temps : on demande un code, puis le
  /// nouveau mot de passe. Le serveur répond toujours la même chose à la
  /// première étape — savoir si un compte existe n'appartient à
  /// personne d'autre qu'à son propriétaire.
  Future<void> _motDePasseOublie() async {
    final ctrlId = TextEditingController(text: _cIdentifiant.text.trim());
    final ctrlCode = TextEditingController();
    final ctrlMdp = TextEditingController();
    bool codeDemande = false;
    bool mdpVisible = false;
    bool occupe = false;
    String? info;
    String? erreur;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, maj) {
          Future<void> demander() async {
            if (ctrlId.text.trim().isEmpty) {
              maj(() => erreur = 'Entrez votre numéro ou votre email.');
              return;
            }
            maj(() { occupe = true; erreur = null; });
            try {
              final m = await ApiService.demanderReinitialisation(ctrlId.text.trim());
              maj(() { occupe = false; codeDemande = true; info = m; });
            } on ErreurApi catch (e) {
              maj(() { occupe = false; erreur = e.message; });
            }
          }

          Future<void> valider() async {
            if (ctrlCode.text.trim().length < 4 || ctrlMdp.text.length < 8) {
              maj(() => erreur =
                  "Entrez le code reçu et un mot de passe d'au moins 8 caractères.");
              return;
            }
            maj(() { occupe = true; erreur = null; });
            try {
              await ApiService.reinitialiserMotDePasse(
                identifiant: ctrlId.text.trim(),
                code: ctrlCode.text.trim(),
                nouveauMotDePasse: ctrlMdp.text,
              );
              if (ctx.mounted) Navigator.of(ctx).pop();
              if (mounted) {
                setState(() {
                  _cIdentifiant.text = ctrlId.text.trim();
                  _cMdp.clear();
                  _erreur = null;
                });
              }
            } on ErreurApi catch (e) {
              maj(() { occupe = false; erreur = e.message; });
            }
          }

          return Dialog(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(Strings.t('mdp_oublie_titre'),
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    codeDemande
                        ? 'Entrez le code reçu par email, puis votre nouveau mot de passe.'
                        : 'Entrez votre numéro de téléphone ou votre email. Nous vous enverrons un code.',
                    style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: ctrlId,
                    enabled: !codeDemande,
                    decoration: InputDecoration(
                        labelText: Strings.t('tel_ou_email'),
                        border: OutlineInputBorder()),
                  ),
                  if (codeDemande) ...[
                    const SizedBox(height: 10),
                    TextField(
                      controller: ctrlCode,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                          labelText: Strings.t('code_recu'), border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: ctrlMdp,
                      obscureText: !mdpVisible,
                      decoration: InputDecoration(
                        labelText: Strings.t('nouveau_mdp'),
                        border: const OutlineInputBorder(),
                        // Voir ce qu'on tape évite de se tromper sur un
                        // mot de passe qu'on ne pourra pas relire.
                        suffixIcon: IconButton(
                          icon: Icon(mdpVisible
                              ? Icons.visibility_off_rounded
                              : Icons.visibility_rounded),
                          onPressed: () => maj(() => mdpVisible = !mdpVisible),
                          tooltip: mdpVisible ? 'Masquer' : 'Afficher',
                        ),
                      ),
                    ),
                  ],
                  if (info != null) ...[
                    const SizedBox(height: 8),
                    Text(info!,
                        style: TextStyle(
                            color: JegoTheme.vert, fontSize: 12)),
                  ],
                  if (erreur != null) ...[
                    const SizedBox(height: 8),
                    Text(erreur!,
                        style: TextStyle(
                            color: JegoTheme.danger, fontSize: 12)),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      BoutonTactile(
                        onTap: () => Navigator.of(ctx).pop(),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          child: Text(Strings.t('act_fermer'),
                              style: TextStyle(
                                  color: JegoTheme.texteSecondaire,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ),
                      const SizedBox(width: 6),
                      BoutonTactile(
                        onTap: occupe ? () {} : (codeDemande ? valider : demander),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 10),
                          decoration: BoxDecoration(
                            color: occupe
                                ? JegoTheme.texteTernaire
                                : JegoTheme.vert,
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rPetit),
                          ),
                          child: Text(
                              codeDemande ? 'Valider' : 'Envoyer le code',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// Connexion Google. Le jeton d'identité part au serveur, qui vérifie
  /// sa signature auprès de Google avant d'ouvrir quoi que ce soit.
  Future<void> _connexionGoogle() async {
    if (_enCours) return;
    setState(() {
      _erreur = null;
      _enCours = true;
    });
    try {
      // On ne traite pas le jeton ici : la connexion, qu'elle vienne de
      // ce bouton ou de celui que Google dessine sur le web, remonte par
      // le flux d'événements. Un seul chemin, donc un seul appel au
      // serveur.
      await AuthGoogle.demarrer();
    } on ErreurApi catch (e) {
      if (mounted) setState(() { _enCours = false; _erreur = e.message; });
    } catch (e) {
      // Le voyageur a fermé la fenêtre de Google, ou le compte a été
      // refusé : rien à signaler comme une panne.
      if (mounted) setState(() => _enCours = false);
    }
  }

  /// Envoie le jeton au serveur. S'il manque le numéro de téléphone —
  /// Google ne le donne jamais — on le demande avant de créer le compte,
  /// plutôt que de laisser un compte incomplet en base.
  Future<void> _terminerGoogle(String jeton, {String? telephone}) async {
    final aCompleter =
        await ApiService.connecterGoogle(jeton: jeton, telephone: telephone);

    if (!mounted) return;

    if (aCompleter == null) {
      setState(() => _enCours = false);
      Navigator.of(context).pop(true);
      return;
    }

    setState(() => _enCours = false);
    final saisi = await _demanderTelephone('${aCompleter['prenom'] ?? ''}');
    if (saisi == null || !mounted) return;

    setState(() => _enCours = true);
    try {
      await _terminerGoogle(jeton, telephone: saisi);
    } on ErreurApi catch (e) {
      if (mounted) setState(() { _enCours = false; _erreur = e.message; });
    }
  }

  Future<String?> _demanderTelephone(String prenom) {
    final ctrl = TextEditingController();
    Pays pays = PaysTelephone.cameroun;
    String? erreurLocale;

    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, maj) => Dialog(
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prenom.isEmpty ? 'Votre numéro' : 'Bienvenue $prenom',
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  "Il ne manque que votre numéro de téléphone : c'est lui qui identifie votre compte et qui sert au paiement.",
                  style: TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 12.5),
                ),
                const SizedBox(height: 14),
                ChampTelephone(
                  controller: ctrl,
                  pays: pays,
                  onPays: (p) => maj(() => pays = p),
                  libelle: Strings.t('champ_telephone'),
                ),
                if (erreurLocale != null) ...[
                  const SizedBox(height: 6),
                  Text(erreurLocale!,
                      style: TextStyle(
                          color: JegoTheme.danger, fontSize: 12)),
                ],
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        child: Text(Strings.t('act_annuler'),
                            style: TextStyle(
                                color: JegoTheme.texteSecondaire,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    BoutonTactile(
                      onTap: () {
                        final v = ctrl.text.trim();
                        if (v.length < pays.longueur) {
                          maj(() => erreurLocale =
                              'Entrez un numéro de téléphone valide.');
                          return;
                        }
                        Navigator.of(ctx).pop('${pays.indicatif}$v');
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 10),
                        decoration: BoxDecoration(
                          color: JegoTheme.vert,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('act_continuer'),
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
            child: Icon(Icons.person_rounded,
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
            style: TextStyle(
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
            style: TextStyle(
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
                    style: TextStyle(
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
                    _motDePasseOublie();
                  },
                  child: Text(
                    Strings.t('mdp_oublie'),
                    style: TextStyle(
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
            Expanded(
                child: Divider(color: JegoTheme.bordCarte, height: 1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                Strings.t('continuer_avec'),
                style: TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 12),
              ),
            ),
            Expanded(
                child: Divider(color: JegoTheme.bordCarte, height: 1)),
          ],
        ).animate(delay: 360.ms).fadeIn(duration: 400.ms),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Google interdit de lancer sa connexion depuis un bouton
            // maison sur le web : il impose le sien. Ailleurs, le nôtre
            // fait le travail.
            if (!_googlePret)
              // Place réservée, aux dimensions du bouton de Google, pour
              // que son apparition ne décale rien.
              const SizedBox(height: 44, width: 250)
            else if (AuthGoogle.boutonMaisonPossible)
              _boutonSocial(
                onTap: _connexionGoogle,
                enfant: LogoGoogle(taille: 26),
              )
            else
              (_boutonGoogle ??= boutonGoogleDessineParGoogle()),
          ],
        ).animate(delay: 420.ms).fadeIn(duration: 450.ms).slideY(begin: 0.15),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              Strings.t('pas_de_compte'),
              style: TextStyle(
                  color: JegoTheme.texteSecondaire, fontSize: 13),
            ),
            const SizedBox(width: 5),
            BoutonTactile(
              onTap: widget.versInscription,
              child: Text(
                Strings.t('creer_compte'),
                style: TextStyle(
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
          color: JegoTheme.fondCarte,
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
                  color: fait || actif ? JegoTheme.vert : JegoTheme.fondCarte,
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
            style: TextStyle(
              color: JegoTheme.texte,
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Text(
          Strings.t('champs_obligatoires'),
          style: TextStyle(
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
                      style: TextStyle(
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
                      color: JegoTheme.fondCarte,
                      borderRadius:
                          BorderRadius.circular(JegoTheme.rMoyen),
                      border: Border.all(
                          color: JegoTheme.bordCarte, width: 1),
                    ),
                    child: Icon(Icons.arrow_back_rounded,
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
                style: TextStyle(
                    color: JegoTheme.texteSecondaire, fontSize: 13),
              ),
              const SizedBox(width: 5),
              BoutonTactile(
                onTap: widget.versConnexion,
                child: Text(
                  Strings.t('auth_connexion'),
                  style: TextStyle(
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
                Icon(Icons.info_outline_rounded,
                    size: 14, color: JegoTheme.texteTernaire),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    Strings.t('info_un_numero'),
                    style: TextStyle(
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
              style: TextStyle(
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
                          _cguAcceptees ? JegoTheme.vert : JegoTheme.fondCarte,
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
                        style: TextStyle(
                            color: JegoTheme.texte, fontSize: 13),
                      ),
                      BoutonTactile(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  EcranConditionsUtilisation(),
                            ),
                          );
                        },
                        child: Text(
                          Strings.t('cgu_lien'),
                          style: TextStyle(
                            color: JegoTheme.vert,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            decoration: TextDecoration.underline,
                            decorationColor: JegoTheme.vert,
                          ),
                        ),
                      ),
                      Text(
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
              style: TextStyle(
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
        color: JegoTheme.fondCarte,
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
        style: TextStyle(color: JegoTheme.texte, fontSize: 14),
        cursorColor: JegoTheme.vert,
        decoration: InputDecoration(
          hintText: libelle,
          hintStyle: TextStyle(
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
