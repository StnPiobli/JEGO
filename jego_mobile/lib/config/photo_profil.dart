import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Photo de profil du voyageur.
///
/// Conservée sur l'appareil, en base64, dans les préférences locales :
/// elle survit à la fermeture de l'application et ne change que quand
/// la personne la change. Le serveur n'a pas de champ pour l'accueillir
/// — le jour où il en aura un (Cloudinary, prévu au cahier des
/// charges), c'est cette classe qui l'enverra, le reste de l'interface
/// n'aura pas à bouger.
class PhotoProfil {
  static const _cle = 'photo_profil_base64';

  /// Côté long maximum. Une photo de profil s'affiche dans un cercle de
  /// 88 pixels : au-delà de 512 on stocke du détail que personne ne
  /// verra, et les préférences locales ne sont pas faites pour porter
  /// des mégaoctets.
  static const double _cote = 512;
  static const int _qualite = 80;

  /// Les octets de l'image, ou null si aucune photo n'a été choisie.
  static final ValueNotifier<Uint8List?> image =
      ValueNotifier<Uint8List?>(null);

  static final ImagePicker _selecteur = ImagePicker();

  /// L'appareil photo n'a pas de sens partout : sur un navigateur de
  /// bureau, il n'y a rien à ouvrir.
  static bool get appareilDisponible => !kIsWeb;

  static Future<void> restaurer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encode = prefs.getString(_cle);
      if (encode == null || encode.isEmpty) return;
      image.value = base64Decode(encode);
    } catch (_) {
      // Donnée illisible : on repart sans photo plutôt que de planter
      // au démarrage pour un avatar.
      image.value = null;
    }
  }

  /// Ouvre la galerie ou l'appareil photo. Renvoie false si la personne
  /// a refermé sans choisir — ce n'est pas une erreur, il n'y a rien à
  /// lui signaler.
  static Future<bool> choisir(ImageSource source) async {
    final fichier = await _selecteur.pickImage(
      source: source,
      maxWidth: _cote,
      maxHeight: _cote,
      imageQuality: _qualite,
    );
    if (fichier == null) return false;

    final octets = await fichier.readAsBytes();
    image.value = octets;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cle, base64Encode(octets));
    return true;
  }

  static Future<void> retirer() async {
    image.value = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cle);
  }
}
