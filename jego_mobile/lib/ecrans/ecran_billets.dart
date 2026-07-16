import 'package:flutter/material.dart';
import '../theme.dart';

class EcranBillets extends StatelessWidget {
  const EcranBillets({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              const Center(
                child: Text('Mes billets', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.confirmation_number_outlined, size: 56, color: Colors.black.withOpacity(0.2)),
                      const SizedBox(height: 12),
                      Text(
                        'Vous n\'avez pas encore de billet',
                        style: TextStyle(fontSize: 13, color: Colors.black.withOpacity(0.5)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}