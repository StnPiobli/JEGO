import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jego_mobile/main.dart';

void main() {
  testWidgets('JEGO app demarre sans erreur', (WidgetTester tester) async {
    await tester.pumpWidget(const JegoApp());
    await tester.pump();
    expect(find.text('JEGO'), findsWidgets);
  });
}