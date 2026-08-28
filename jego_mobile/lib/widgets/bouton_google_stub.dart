import 'package:flutter/material.dart';

/// Hors web, Google n'impose pas son bouton : le nôtre suffit, et cette
/// version n'a donc rien à dessiner.
Widget boutonGoogleDessineParGoogle() => const SizedBox.shrink();
