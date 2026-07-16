import 'package:flutter/material.dart';
import 'theme.dart';
import 'ecrans/ecran_principal.dart';

void main() {
  runApp(const JegoApp());
}

class JegoApp extends StatelessWidget {
  const JegoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JEGO',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: JegoColors.vertMoyen),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: const EcranPrincipal(),
    );
  }
}