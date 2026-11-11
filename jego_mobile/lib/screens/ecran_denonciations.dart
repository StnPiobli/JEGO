import 'package:flutter/material.dart';
import '../config/api.dart';
import '../config/format_date.dart';
import '../config/theme_jego.dart';
import '../widgets/style_jego.dart';

/// Espace dénonciation du voyageur.
///
/// Distinct du litige (argent bloqué) et du signalement (pendant le
/// trajet) : ici le voyageur rapporte des faits graves sur un voyage
/// effectué -- conduite dangereuse, bus en mauvais état, surcharge.
/// L'agence et JEGO sont prévenus en même temps ; l'agence peut se
/// défendre, seul JEGO tranche.
class EcranDenonciations extends StatefulWidget {
  const EcranDenonciations({super.key});

  @override
  State<EcranDenonciations> createState() => _EcranDenonciationsState();
}

/// Catégories acceptées par le serveur, dans ses propres codes.
const _categories = <String, String>{
  'conduite_dangereuse': 'Conduite dangereuse',
  'comportement_chauffeur': 'Comportement du chauffeur',
  'etat_du_bus': 'État du bus',
  'surcharge': 'Surcharge',
  'arret_non_respecte': 'Arrêt non respecté',
  'horaire_non_respecte': 'Horaire non respecté',
  'securite': 'Sécurité',
  'autre': 'Autre',
};

const _statuts = <String, String>{
  'ouverte': 'En attente de l\'agence',
  'observation_agence': 'L\'agence a répondu — JEGO instruit',
  'traitee': 'Faits retenus par JEGO',
  'classee': 'Classée sans suite',
};

class _EcranDenonciationsState extends State<EcranDenonciations> {
  List<Map<String, dynamic>>? _dossiers;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final d = await ApiService.mesDenonciations();
      if (mounted) setState(() => _dossiers = d);
    } on ErreurApi catch (e) {
      if (mounted) setState(() => _erreur = e.message);
    }
  }

  // La date du voyage arrive en UTC (« …-24T23:00:00Z » pour le 25) :
  // la convertir en heure locale, sinon elle s'affiche la veille.
  String _date(String iso) => FormatDate.courte(iso);

  Future<void> _nouvelle() async {
    final envoye = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _FeuilleNouvelle(),
    );
    if (envoye == true) _charger();
  }

  @override
  Widget build(BuildContext context) {
    return EcranJego(
      titre: 'Dénonciations',
      sousTitre: 'Des faits graves sur un voyage effectué',
      flottant: FloatingActionButton.extended(
        onPressed: _nouvelle,
        backgroundColor: JegoTheme.vert,
        icon: const Icon(Icons.report_rounded, color: Colors.white),
        label: const Text('Dénoncer un voyage',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
      ),
      corps: _corps(),
    );
  }

  Widget _corps() {
    if (_erreur != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(_erreur!,
              textAlign: TextAlign.center,
              style: TextStyle(color: JegoTheme.texteSecondaire)),
        ),
      );
    }
    if (_dossiers == null) {
      return Center(child: CircularProgressIndicator(color: JegoTheme.vert));
    }
    if (_dossiers!.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            'Aucune dénonciation. Si un voyage s\'est mal passé (conduite '
            'dangereuse, bus en mauvais état…), signalez-le ici : l\'agence '
            'et JEGO sont prévenus en même temps.',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: JegoTheme.texteSecondaire, fontSize: 13, height: 1.4),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _charger,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(18, 6, 18, 100),
        itemCount: _dossiers!.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _carte(_dossiers![i]),
      ),
    );
  }

  Widget _carte(Map<String, dynamic> d) {
    final statut = '${d['statut']}';
    final clos = statut == 'traitee' || statut == 'classee';
    final observation = '${d['observation_agence'] ?? ''}'.trim();
    final decision = '${d['decision'] ?? ''}'.trim();
    return CarteJego(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${d['depart']} → ${d['arrivee']}',
              style: TextStyle(
                  color: JegoTheme.texte,
                  fontSize: 14,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 3),
          Text(
            '${_categories[d['categorie']] ?? d['categorie']} · ${_date('${d['date_depart']}')} · ${d['numero']}',
            style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: (clos ? JegoTheme.texte : JegoTheme.vert).withOpacity(0.08),
              borderRadius: BorderRadius.circular(JegoTheme.rGrand),
            ),
            child: Text(_statuts[statut] ?? statut,
                style: TextStyle(
                    color: clos ? JegoTheme.texte : JegoTheme.vert,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 10),
          Text('${d['raison']}',
              style: TextStyle(color: JegoTheme.texte, fontSize: 13, height: 1.4)),
          if (observation.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('Réponse de l\'agence',
                style: TextStyle(
                    color: JegoTheme.texteSecondaire,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(observation,
                style: TextStyle(color: JegoTheme.texte, fontSize: 13, height: 1.4)),
          ],
          if (decision.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('Décision de JEGO',
                style: TextStyle(
                    color: JegoTheme.vert,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(decision,
                style: TextStyle(color: JegoTheme.texte, fontSize: 13, height: 1.4)),
          ],
        ],
      ),
    );
  }
}

/// Ouverture d'un dossier : un vrai billet, une catégorie, les faits.
class _FeuilleNouvelle extends StatefulWidget {
  const _FeuilleNouvelle();

  @override
  State<_FeuilleNouvelle> createState() => _FeuilleNouvelleState();
}

class _FeuilleNouvelleState extends State<_FeuilleNouvelle> {
  List<Map<String, dynamic>>? _billets;
  String? _billetId;
  String? _categorie;
  final _raison = TextEditingController();
  String? _erreur;
  bool _envoi = false;

  @override
  void initState() {
    super.initState();
    ApiService.billetsDenoncables().then((b) {
      if (mounted) {
        setState(() =>
            _billets = b.where((x) => x['deja_denonce'] != true).toList());
      }
    }).catchError((e) {
      if (mounted) {
        setState(() {
          _billets = [];
          _erreur = e is ErreurApi ? e.message : '$e';
        });
      }
    });
  }

  @override
  void dispose() {
    _raison.dispose();
    super.dispose();
  }

  bool get _pret =>
      _billetId != null && _categorie != null && _raison.text.trim().length >= 20;

  Future<void> _envoyer() async {
    if (!_pret || _envoi) return;
    setState(() {
      _envoi = true;
      _erreur = null;
    });
    try {
      await ApiService.denoncer(
        billetId: _billetId!,
        categorie: _categorie!,
        raison: _raison.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ErreurApi catch (e) {
      if (mounted) {
        setState(() {
          _envoi = false;
          _erreur = e.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final titre = TextStyle(
        color: JegoTheme.texte, fontSize: 13.5, fontWeight: FontWeight.w800);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: FeuilleJego(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Dénoncer un voyage',
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 18,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              Text('Quel voyage ?', style: titre),
              const SizedBox(height: 8),
              if (_billets == null)
                Center(child: CircularProgressIndicator(color: JegoTheme.vert))
              else if (_billets!.isEmpty)
                Text(
                  'Aucun voyage récent à dénoncer : seuls les voyages déjà partis, '
                  'dans les jours qui suivent l\'arrivée, peuvent l\'être.',
                  style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12.5),
                )
              else
                ..._billets!.map((b) {
                  final id = '${b['billet_id']}';
                  final actif = _billetId == id;
                  final date = FormatDate.courte('${b['date_depart']}');
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: CarteJego(
                      padding: const EdgeInsets.all(12),
                      bordure: actif ? JegoTheme.vert : null,
                      onTap: () => setState(() => _billetId = id),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${b['depart']} → ${b['arrivee']} · $date\n${b['nom_agence']}',
                              style: TextStyle(color: JegoTheme.texte, fontSize: 12.5),
                            ),
                          ),
                          Icon(
                            actif
                                ? Icons.radio_button_checked_rounded
                                : Icons.radio_button_unchecked_rounded,
                            color: actif ? JegoTheme.vert : JegoTheme.texteTernaire,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              const SizedBox(height: 10),
              Text('Que s\'est-il passé ?', style: titre),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.entries.map((c) {
                  final actif = _categorie == c.key;
                  return ChoiceChip(
                    label: Text(c.value),
                    selected: actif,
                    selectedColor: JegoTheme.vert.withOpacity(0.15),
                    onSelected: (_) => setState(() => _categorie = c.key),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              Text('Les faits (20 caractères minimum)', style: titre),
              const SizedBox(height: 8),
              TextField(
                controller: _raison,
                maxLines: 4,
                onChanged: (_) => setState(() {}),
                style: TextStyle(color: JegoTheme.texte, fontSize: 13.5),
                decoration: InputDecoration(
                  hintText: 'Ex. : le chauffeur téléphonait en doublant dans les virages après Edéa.',
                  hintStyle: TextStyle(color: JegoTheme.texteTernaire, fontSize: 12.5),
                  filled: true,
                  fillColor: JegoTheme.champ,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              if (_erreur != null) ...[
                const SizedBox(height: 8),
                Text(_erreur!,
                    style: TextStyle(
                        color: JegoTheme.danger,
                        fontSize: 12,
                        fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 14),
              BoutonTactile(
                onTap: _pret && !_envoi ? _envoyer : null,
                child: Container(
                  height: 50,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: _pret
                        ? JegoTheme.vert
                        : JegoTheme.texteTernaire.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  ),
                  child: Text(
                    _envoi ? 'Envoi…' : 'Envoyer à l\'agence et à JEGO',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5),
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
