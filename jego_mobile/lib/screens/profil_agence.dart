import 'package:flutter/material.dart';
import '../config/donnees_demo.dart';
import '../l10n/strings.dart';

/// Profil de l'agence : note generale, notes par critere,
/// commentaires moderes, badge Certifiee JEGO.
class EcranProfilAgence extends StatelessWidget {
  final int agenceId;
  const EcranProfilAgence({super.key, required this.agenceId});

  @override
  Widget build(BuildContext context) {
    final agence = DonneesDemo.agences[agenceId];

    if (agence == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Agence introuvable')),
      );
    }

    final commentaires = (agence['commentaires'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(title: Text('${agence['nom']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // En-tete : note generale + badge certifie
          Row(
            children: [
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 32),
                  const SizedBox(width: 4),
                  Text(
                    '${agence['note_generale']}',
                    style: const TextStyle(
                        fontSize: 32, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const Spacer(),
              if (agence['certifiee'] == true)
                Chip(
                  avatar: const Icon(Icons.verified,
                      color: Colors.green, size: 18),
                  label: Text(Strings.t('agence_certifiee')),
                ),
            ],
          ),
          const SizedBox(height: 24),
          // Notes par critere
          _LigneCritere(
              libelle: Strings.t('critere_service'),
              note: agence['note_service']),
          _LigneCritere(
              libelle: Strings.t('critere_conduite'),
              note: agence['note_conduite']),
          _LigneCritere(
              libelle: Strings.t('critere_horaires'),
              note: agence['note_horaires']),
          _LigneCritere(
              libelle: Strings.t('critere_confort'),
              note: agence['note_confort']),
          const SizedBox(height: 24),
          Text(
            Strings.t('commentaires_titre'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ...commentaires.map((c) => Card(
                child: ListTile(
                  title: Row(
                    children: [
                      Text('${c['auteur']}',
                          style:
                              const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(width: 8),
                      ...List.generate(
                        c['note'] as int,
                        (_) => const Icon(Icons.star,
                            size: 14, color: Colors.amber),
                      ),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('${c['texte']}'),
                  ),
                  trailing: Text(
                    '${c['date']}',
                    style: TextStyle(
                        fontSize: 11, color: Colors.grey.shade600),
                  ),
                ),
              )),
          const SizedBox(height: 24),
          Center(
            child: Text(
              Strings.t('support_tel'),
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _LigneCritere extends StatelessWidget {
  final String libelle;
  final dynamic note;
  const _LigneCritere({required this.libelle, required this.note});

  @override
  Widget build(BuildContext context) {
    final valeur = (note as num).toDouble();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(width: 150, child: Text(libelle)),
          Expanded(
            child: LinearProgressIndicator(
              value: valeur / 5,
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 8),
          Text('$valeur'),
        ],
      ),
    );
  }
}