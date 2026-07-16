import 'package:flutter/material.dart';
import '../theme.dart';
import 'ecran_resultats.dart';

class EcranRecherche extends StatefulWidget {
  const EcranRecherche({super.key});

  @override
  State<EcranRecherche> createState() => _EcranRechercheState();
}

class _EcranRechercheState extends State<EcranRecherche> {
  final TextEditingController _depart = TextEditingController();
  final TextEditingController _arrivee = TextEditingController();
  DateTime? _dateChoisie;

  @override
  void dispose() {
    _depart.dispose();
    _arrivee.dispose();
    super.dispose();
  }

  void _rechercher() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => EcranResultats(
          depart: _depart.text.isEmpty ? 'Douala' : _depart.text,
          arrivee: _arrivee.text.isEmpty ? 'Yaoundé' : _arrivee.text,
          date: _dateChoisie == null
              ? 'Date non précisée'
              : '${_dateChoisie!.day}/${_dateChoisie!.month}/${_dateChoisie!.year}',
        ),
      ),
    );
  }

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
              Image.asset('assets/images/jego_logo.png', width: 44),
              const SizedBox(height: 24),
              const Text(
                'Où voyagez-vous ?',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Cherchez librement, connectez-vous seulement pour réserver',
                style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.5)),
              ),
              const SizedBox(height: 24),

              _ChampRecherche(
                icone: Icons.trip_origin,
                iconeCouleur: JegoColors.vertMoyen,
                controller: _depart,
                placeholder: 'Ville de départ',
              ),
              const SizedBox(height: 10),
              _ChampRecherche(
                icone: Icons.location_on,
                iconeCouleur: const Color(0xFFD85A30),
                controller: _arrivee,
                placeholder: 'Ville d\'arrivée',
              ),
              const SizedBox(height: 10),

              GestureDetector(
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                  );
                  if (date != null) setState(() => _dateChoisie = date);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.black12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 18, color: Colors.black45),
                      const SizedBox(width: 10),
                      Text(
                        _dateChoisie == null
                            ? 'Choisir une date'
                            : '${_dateChoisie!.day}/${_dateChoisie!.month}/${_dateChoisie!.year}',
                        style: TextStyle(
                          fontSize: 14,
                          color: _dateChoisie == null ? Colors.black38 : Colors.black87,
                        ),
                      ),
                    ],
                  ),
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _rechercher,
                  child: const Text('Rechercher', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChampRecherche extends StatelessWidget {
  final IconData icone;
  final Color iconeCouleur;
  final TextEditingController controller;
  final String placeholder;

  const _ChampRecherche({
    required this.icone,
    required this.iconeCouleur,
    required this.controller,
    required this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icone, size: 18, color: iconeCouleur),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: placeholder,
                border: InputBorder.none,
                hintStyle: const TextStyle(fontSize: 14, color: Colors.black38),
              ),
            ),
          ),
        ],
      ),
    );
  }
}