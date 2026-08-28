import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Déverrouillage de l'application par empreinte ou reconnaissance du
/// visage.
///
/// Le réglage n'est proposé que si l'appareil sait réellement le faire.
/// Un navigateur ne le sait pas : y afficher l'interrupteur reviendrait
/// à promettre une protection inexistante.
class VerrouBiometrique {
  static final LocalAuthentication _auth = LocalAuthentication();
  static const _cle = 'verrou_biometrique';

  /// Vrai si l'appareil dispose d'un capteur configuré. Toute erreur
  /// est traitée comme une absence : on ne propose jamais un verrou
  /// dont on n'est pas sûr.
  static Future<bool> disponible() async {
    if (kIsWeb) return false;
    try {
      if (!await _auth.isDeviceSupported()) return false;
      return (await _auth.getAvailableBiometrics()).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> actif() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_cle) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Activer exige de s'authentifier tout de suite. Sans cette
  /// vérification, quelqu'un pourrait activer le verrou sur le
  /// téléphone d'un autre et l'enfermer dehors.
  static Future<void> definir(bool valeur) async {
    if (valeur) {
      final ok = await demanderAuthentification(
        raison: "Confirmez votre identité pour activer le verrouillage.",
      );
      if (!ok) {
        throw Exception("Vérification refusée : le verrou n'a pas été activé.");
      }
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_cle, valeur);
  }

  static Future<bool> demanderAuthentification({required String raison}) async {
    if (kIsWeb) return true;
    try {
      return await _auth.authenticate(
        localizedReason: raison,
        // On refuse le repli sur le code de l'appareil : le réglage
        // annonce un verrou biométrique, pas un code à quatre chiffres.
        biometricOnly: true,
      );
    } catch (_) {
      return false;
    }
  }
}
