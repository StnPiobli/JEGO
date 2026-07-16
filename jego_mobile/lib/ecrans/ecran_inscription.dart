import 'package:flutter/material.dart';
import '../theme.dart';

class EcranInscription extends StatefulWidget {
  const EcranInscription({super.key});

  @override
  State<EcranInscription> createState() => _EcranInscriptionState();
}

class _EcranInscriptionState extends State<EcranInscription> {
  final _nom = TextEditingController();
  final _prenom = TextEditingController();
  final _lieuNaissance = TextEditingController();
  final _telephone = TextEditingController();
  final _email = TextEditingController();
  final _motDePasse = TextEditingController();
  final _contactUrgence = TextEditingController();

  DateTime? _dateNaissance;
  bool _conditionsAcceptees = false;
  bool _motDePasseVisible = false;

  @override
  void dispose() {
    _nom.dispose();
    _prenom.dispose();
    _lieuNaissance.dispose();
    _telephone.dispose();
    _email.dispose();
    _motDePasse.dispose();
    _contactUrgence.dispose();
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
        title: const Text('Créer un compte', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _ChampTexte(label: 'Nom', controller: _nom, placeholder: 'Dupont'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ChampTexte(label: 'Prénom', controller: _prenom, placeholder: 'Jean'),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              _LabelChamp(texte: 'Date de naissance'),
              GestureDetector(
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime(2000),
                    firstDate: DateTime(1930),
                    lastDate: DateTime.now(),
                  );
                  if (date != null) setState(() => _dateNaissance = date);
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.black12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _dateNaissance == null
                        ? 'Sélectionner une date'
                        : '${_dateNaissance!.day}/${_dateNaissance!.month}/${_dateNaissance!.year}',
                    style: TextStyle(
                      fontSize: 14,
                      color: _dateNaissance == null ? Colors.black38 : Colors.black87,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              _ChampTexte(label: 'Lieu de naissance', controller: _lieuNaissance, placeholder: 'Douala'),
              const SizedBox(height: 14),

              _ChampTexte(
                label: 'Téléphone',
                controller: _telephone,
                placeholder: '6XX XXX XXX',
                typeClavier: TextInputType.phone,
              ),
              const SizedBox(height: 14),

              _ChampTexte(
                label: 'Email',
                controller: _email,
                placeholder: 'jean@exemple.com',
                typeClavier: TextInputType.emailAddress,
              ),
              const SizedBox(height: 14),

              _LabelChamp(texte: 'Mot de passe'),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.black12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TextField(
                  controller: _motDePasse,
                  obscureText: !_motDePasseVisible,
                  decoration: InputDecoration(
                    hintText: '8 caractères minimum',
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
              const SizedBox(height: 14),

              _ChampTexte(
                label: 'Contact d\'urgence',
                controller: _contactUrgence,
                placeholder: '6XX XXX XXX',
                typeClavier: TextInputType.phone,
              ),
              const SizedBox(height: 18),

              GestureDetector(
                onTap: () => setState(() => _conditionsAcceptees = !_conditionsAcceptees),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _conditionsAcceptees,
                      activeColor: JegoColors.vertMoyen,
                      onChanged: (valeur) => setState(() => _conditionsAcceptees = valeur ?? false),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: Text(
                          'J\'accepte les conditions d\'utilisation et la politique de confidentialité',
                          style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: JegoColors.vertMoyen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _conditionsAcceptees ? () {} : null,
                  child: const Text('S\'inscrire', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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

class _LabelChamp extends StatelessWidget {
  final String texte;
  const _LabelChamp({required this.texte});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(texte, style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.6))),
    );
  }
}

class _ChampTexte extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String placeholder;
  final TextInputType? typeClavier;

  const _ChampTexte({
    required this.label,
    required this.controller,
    required this.placeholder,
    this.typeClavier,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _LabelChamp(texte: label),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.black12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            keyboardType: typeClavier,
            decoration: InputDecoration(
              hintText: placeholder,
              hintStyle: const TextStyle(fontSize: 14, color: Colors.black38),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}