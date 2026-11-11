import 'package:flutter/material.dart';
import '../config/api.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/style_jego.dart';

/// Changer son mot de passe. Le serveur vérifie l'ancien : l'écran ne
/// contrôle que ce qui se voit (longueur, lettre, chiffre, confirmation).
class EcranMotDePasse extends StatefulWidget {
  const EcranMotDePasse({super.key});

  @override
  State<EcranMotDePasse> createState() => _EcranMotDePasseState();
}

class _EcranMotDePasseState extends State<EcranMotDePasse> {
  final _ancien = TextEditingController();
  final _nouveau = TextEditingController();
  final _confirme = TextEditingController();
  bool _envoi = false;
  bool _fait = false;
  String? _erreurAncien;
  String? _erreurGenerale;

  @override
  void initState() {
    super.initState();
    for (final c in [_ancien, _nouveau, _confirme]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final c in [_ancien, _nouveau, _confirme]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _longueur => _nouveau.text.length >= 8;
  bool get _lettre => RegExp(r'[A-Za-z]').hasMatch(_nouveau.text);
  bool get _chiffre => RegExp(r'\d').hasMatch(_nouveau.text);
  bool get _identique =>
      _nouveau.text.isNotEmpty && _nouveau.text == _confirme.text;
  bool get _pret =>
      _ancien.text.isNotEmpty && _longueur && _lettre && _chiffre && _identique;

  Future<void> _enregistrer() async {
    if (!_pret || _envoi) return;
    setState(() {
      _envoi = true;
      _erreurAncien = null;
      _erreurGenerale = null;
    });
    try {
      await ApiService.changerMotDePasse(
          ancien: _ancien.text, nouveau: _nouveau.text);
      if (mounted) setState(() => _fait = true);
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.message.toLowerCase().contains('mot de passe')) {
          _erreurAncien = e.message;
        } else {
          _erreurGenerale = e.message;
        }
      });
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return EcranJego(
      titre: Strings.t('profil_changer_mdp'),
      corps: _fait ? _confirmation() : _formulaire(),
    );
  }

  Widget _confirmation() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_rounded, color: JegoTheme.vert, size: 56),
            const SizedBox(height: 14),
            Text('Mot de passe changé',
                style: TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 17,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 18),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: JegoTheme.vert,
                foregroundColor: Colors.white,
              ),
              child: const Text('Retour'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _formulaire() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 40),
      children: [
        CarteJego(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _champ(_ancien, Strings.t('profil_ancien_mdp'), _erreurAncien),
              const SizedBox(height: 12),
              _champ(_nouveau, Strings.t('profil_nouveau_mdp'), null),
              const SizedBox(height: 12),
              _champ(_confirme, Strings.t('mdp_confirmer'), null),
              const SizedBox(height: 12),
              _regle(Strings.t('mdp_regle_longueur'), _longueur),
              _regle(Strings.t('mdp_regle_lettre'), _lettre),
              _regle(Strings.t('mdp_regle_chiffre'), _chiffre),
              _regle(Strings.t('mdp_regle_identique'), _identique),
              if (_erreurGenerale != null) ...[
                const SizedBox(height: 10),
                Text(_erreurGenerale!,
                    style: TextStyle(
                        color: JegoTheme.danger,
                        fontSize: 12,
                        fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _pret && !_envoi ? _enregistrer : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: JegoTheme.vert,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
                ),
                child: Text(_envoi ? 'Enregistrement…' : 'Changer le mot de passe',
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _champ(TextEditingController c, String libelle, String? erreur) {
    return TextField(
      controller: c,
      obscureText: true,
      enabled: !_envoi,
      decoration: InputDecoration(
        labelText: libelle,
        errorText: erreur,
        filled: true,
        fillColor: JegoTheme.champ,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
        ),
      ),
    );
  }

  Widget _regle(String texte, bool ok) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(ok ? Icons.check_circle_rounded : Icons.circle_outlined,
              size: 14, color: ok ? JegoTheme.vert : JegoTheme.texteTernaire),
          const SizedBox(width: 6),
          Text(texte,
              style: TextStyle(
                  color: ok ? JegoTheme.vert : JegoTheme.texteTernaire,
                  fontSize: 11.5,
                  fontWeight: ok ? FontWeight.w700 : FontWeight.w500)),
        ],
      ),
    );
  }
}
