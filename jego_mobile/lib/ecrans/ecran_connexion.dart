import 'package:flutter/material.dart';
import '../theme.dart';
import 'ecran_inscription.dart';
import 'ecran_connexion_formulaire.dart';

class EcranConnexion extends StatelessWidget {
  const EcranConnexion({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoColors.vertProfond,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                ),
              ),
              const SizedBox(height: 12),
              Image.asset('assets/images/jego_logo.png', width: 80),
              const SizedBox(height: 8),
              Text(
                'Voyagez malin',
                style: TextStyle(fontSize: 13, color: JegoColors.vertTresClair),
              ),
              const SizedBox(height: 8),
              const Text(
                'Encore une étape avant de réserver',
                style: TextStyle(fontSize: 13, color: Colors.white70),
              ),

              const Spacer(),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: JegoColors.vertMoyen,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => const EcranInscription()),
                          );
                        },
                        child: const Text('Créer un compte', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: JegoColors.vertFonce,
                          side: BorderSide(color: JegoColors.vertMoyen, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => const EcranConnexionFormulaire()),
                          );
                        },
                        child: const Text('Se connecter', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                    ),

                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(child: Divider(color: Colors.black.withOpacity(0.15))),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Text('ou', style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.4))),
                        ),
                        Expanded(child: Divider(color: Colors.black.withOpacity(0.15))),
                      ],
                    ),
                    const SizedBox(height: 16),

                    _BoutonSocial(
                      texte: 'Continuer avec Google',
                      icone: Icons.g_mobiledata_rounded,
                      onTap: () {},
                    ),
                    const SizedBox(height: 10),
                    _BoutonSocial(
                      texte: 'Continuer avec Apple',
                      icone: Icons.apple_rounded,
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _BoutonSocial extends StatelessWidget {
  final String texte;
  final IconData icone;
  final VoidCallback onTap;

  const _BoutonSocial({required this.texte, required this.icone, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.black87,
          side: const BorderSide(color: Colors.black26),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: onTap,
        icon: Icon(icone, size: 20),
        label: Text(texte, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
      ),
    );
  }
}