import 'package:flutter/material.dart';
import '../theme.dart';

class EcranConnexionFormulaire extends StatefulWidget {
  const EcranConnexionFormulaire({super.key});

  @override
  State<EcranConnexionFormulaire> createState() => _EcranConnexionFormulaireState();
}

class _EcranConnexionFormulaireState extends State<EcranConnexionFormulaire> {
  final _telephone = TextEditingController();
  final _motDePasse = TextEditingController();
  bool _motDePasseVisible = false;

  @override
  void dispose() {
    _telephone.dispose();
    _motDePasse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              Center(
                child: Image.asset('assets/images/jego_logo.png', width: 70),
              ),
              const SizedBox(height: 24),
              const Text(
                'Content de vous revoir',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Connectez-vous à votre compte',
                style: TextStyle(fontSize: 13, color: Colors.black.withOpacity(0.55)),
              ),
              const SizedBox(height: 28),

              Text('Téléphone', style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6))),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.black12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TextField(
                  controller: _telephone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: '6XX XXX XXX',
                    hintStyle: TextStyle(fontSize: 14, color: Colors.black38),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Text('Mot de passe', style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6))),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.black12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TextField(
                  controller: _motDePasse,
                  obscureText: !_motDePasseVisible,
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    hintStyle: const TextStyle(fontSize: 14, color: Colors.black38),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _motDePasseVisible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 20,
                        color: Colors.black38,
                      ),
                      onPressed: () => setState(() => _motDePasseVisible = !_motDePasseVisible),
                    ),
                  ),
                ),
              ),

              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {},
                  child: Text(
                    'Mot de passe oublié ?',
                    style: TextStyle(fontSize: 12, color: JegoColors.vertFonce, fontWeight: FontWeight.w500),
                  ),
                ),
              ),

              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: JegoColors.vertMoyen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {},
                  child: const Text('Se connecter', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}