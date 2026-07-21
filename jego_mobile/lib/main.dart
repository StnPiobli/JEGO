import 'package:flutter/material.dart';
import 'config/billets_store.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'config/theme_jego.dart';
import 'l10n/strings.dart';
import 'screens/navigation_principale.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr');
  await initializeDateFormatting('en');
  runApp(const JegoApp());
}

class JegoApp extends StatelessWidget {
  const JegoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: langueCourante,
      builder: (context, langue, _) {
        return MaterialApp(
          title: 'JEGO',
          debugShowCheckedModeBanner: false,
          navigatorKey: SoftLock.navKey,
          theme: JegoTheme.theme(),
          home: const NavigationPrincipale(),
        );
      },
    );
  }
}