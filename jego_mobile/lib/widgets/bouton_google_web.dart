import 'package:flutter/material.dart';
import 'package:google_sign_in_web/web_only.dart' as google_web;

/// Sur le web, Google exige que la connexion parte d'un bouton qu'il
/// dessine lui-même. Impossible d'y brancher notre cercle blanc : ce
/// serait refusé.
Widget boutonGoogleDessineParGoogle() => google_web.renderButton();
