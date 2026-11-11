import 'package:flutter/material.dart';
import '../config/api.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/style_jego.dart';

/// Les avis laisses apres un voyage, tels que le serveur les a
/// enregistres. Un avis retire par la moderation reste liste, marque
/// comme tel.
class EcranMesAvis extends StatefulWidget {
  const EcranMesAvis({super.key});

  @override
  State<EcranMesAvis> createState() => _EcranMesAvisState();
}

class _EcranMesAvisState extends State<EcranMesAvis> {
  List<Map<String, dynamic>>? _avis;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final avis = await ApiService.mesAvis();
      if (mounted) setState(() => _avis = avis);
    } on ErreurApi catch (e) {
      if (mounted) setState(() => _erreur = e.message);
    }
  }

  String _date(String iso) {
    final p = iso.split('T').first.split('-');
    return p.length == 3 ? '${p[2]}/${p[1]}/${p[0]}' : iso;
  }

  @override
  Widget build(BuildContext context) {
    return EcranJego(
      titre: Strings.t('mes_avis_titre'),
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
    if (_avis == null) {
      return Center(child: CircularProgressIndicator(color: JegoTheme.vert));
    }
    if (_avis!.isEmpty) return _vide();
    return RefreshIndicator(
      onRefresh: _charger,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(18, 6, 18, 40),
        itemCount: _avis!.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _carte(_avis![i]),
      ),
    );
  }

  Widget _carte(Map<String, dynamic> a) {
    final note = double.tryParse('${a['note_globale']}') ?? 0;
    final retire = a['statut'] != 'visible';
    final commentaire = '${a['commentaire'] ?? ''}'.trim();
    return CarteJego(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${a['depart']} → ${a['arrivee']}',
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 14,
                      fontWeight: FontWeight.w800),
                ),
              ),
              Icon(Icons.star_rounded, color: JegoTheme.etoile, size: 18),
              const SizedBox(width: 3),
              Text(note.toStringAsFixed(1),
                  style: TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 14,
                      fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            [
              '${a['nom_agence']}',
              _date('${a['date_depart']}'),
              if ('${a['heure_depart'] ?? ''}'.isNotEmpty) '${a['heure_depart']}',
            ].join(' · '),
            style: TextStyle(color: JegoTheme.texteSecondaire, fontSize: 12),
          ),
          if ('${a['numero_trajet'] ?? ''}'.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              '${a['numero_trajet']}',
              style: TextStyle(
                  color: JegoTheme.texteTernaire,
                  fontSize: 11,
                  fontFamily: 'monospace'),
            ),
          ],
          if (commentaire.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(commentaire,
                style: TextStyle(
                    color: JegoTheme.texte, fontSize: 13, height: 1.4)),
          ],
          if (retire) ...[
            const SizedBox(height: 10),
            Text(
              Strings.t('mes_avis_retire'),
              style: TextStyle(
                  color: JegoTheme.danger,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700),
            ),
          ],
        ],
      ),
    );
  }

  Widget _vide() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                color: JegoTheme.etoile.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.star_outline_rounded,
                  color: JegoTheme.etoile, size: 34),
            ),
            const SizedBox(height: 16),
            Text(Strings.t('mes_avis_vide'),
                style: TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 16,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(
              'Les avis que tu laisses apres un voyage apparaitront ici.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: JegoTheme.texteSecondaire, fontSize: 13, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
