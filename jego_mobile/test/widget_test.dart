import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jego_mobile/main.dart';

void main() {
  testWidgets('JEGO app demarre sans erreur', (WidgetTester tester) async {
    await tester.pumpWidget(const JegoApp());
    await tester.pump();
    expect(find.text('JEGO'), findsWidgets);

    // L'ecran de demarrage programme des minuteries (animation, passage
    // a l'ecran suivant). On retire l'appli puis on laisse le temps
    // s'ecouler : le test ne se termine plus avec une minuterie en attente.
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(minutes: 1));
  });
}
