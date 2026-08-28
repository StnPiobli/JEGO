import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';

/// Connexion par compte Google.
///
/// L'identifiant client n'est pas un secret : il est inscrit dans
/// l'application et Google le publie dans chaque requête. Le secret,
/// lui, ne sert qu'au flux par code d'autorisation, que nous
/// n'utilisons pas — le serveur vérifie le jeton avec les clés
/// publiques de Google.
///
/// Sur Android on déclare cet identifiant comme `serverClientId` : le
/// jeton reçu porte alors ce destinataire, celui-là même que le serveur
/// attend. Sur le web c'est le `clientId` classique.
class AuthGoogle {
  static const String clientIdWeb =
      '214921758066-nvav0ampr6g6bmanep91lfde884bv6js.apps.googleusercontent.com';

  static bool _prete = false;

  static Future<void> preparer() async {
    if (_prete) return;
    await GoogleSignIn.instance.initialize(
      clientId: kIsWeb ? clientIdWeb : null,
      serverClientId: kIsWeb ? null : clientIdWeb,
    );
    _prete = true;
  }

  /// Google interdit de déclencher sa connexion depuis un bouton maison
  /// sur le web : il impose le sien, qu'il dessine lui-même. Ailleurs,
  /// notre bouton peut lancer le flux directement.
  static bool get boutonMaisonPossible =>
      GoogleSignIn.instance.supportsAuthenticate();

  /// Ouvre le sélecteur de compte et renvoie le jeton d'identité.
  /// C'est ce jeton, et lui seul, que le serveur sait vérifier.
  static Future<String?> demarrer() async {
    await preparer();
    final compte = await GoogleSignIn.instance.authenticate();
    return compte.authentication.idToken;
  }

  /// Propose les comptes déjà connectés, sans rien demander à taper :
  /// les sessions Google du navigateur sur le web, les comptes de
  /// l'appareil sur Android. À appeler à l'ouverture de l'écran.
  ///
  /// Selon la plateforme, la connexion revient ici ou par le flux
  /// d'événements — c'est pourquoi on écoute les deux.
  static Future<void> proposerComptesConnus() async {
    await preparer();
    try {
      await GoogleSignIn.instance.attemptLightweightAuthentication();
    } catch (_) {
      // Aucun compte disponible, ou le voyageur a refusé l'invite :
      // il reste le bouton.
    }
  }

  /// Le bouton dessiné par Google, sur le web, signe l'utilisateur sans
  /// passer par `demarrer()`. On écoute donc aussi ce flux.
  static Stream<GoogleSignInAuthenticationEvent> get evenements =>
      GoogleSignIn.instance.authenticationEvents;

  static Future<void> deconnecter() async {
    if (!_prete) return;
    await GoogleSignIn.instance.signOut();
  }
}
