/// Villes desservies et abreviations locales reconnues.
class Villes {
  static const List<String> liste = [
    'Douala',
    'Yaoundé',
    'Bafoussam',
    'Bamenda',
    'Garoua',
    'Maroua',
    'Ngaoundéré',
    'Bertoua',
    'Buea',
    'Limbe',
    'Kribi',
    'Ebolowa',
    'Dschang',
    'Kumba',
    'Edéa',
  ];

  /// Abreviation (minuscule, sans accent) -> ville officielle
  static const Map<String, String> abreviations = {
    'dla': 'Douala',
    'dl': 'Douala',
    'yde': 'Yaoundé',
    'ydé': 'Yaoundé',
    'yao': 'Yaoundé',
    'baf': 'Bafoussam',
    'bda': 'Bamenda',
    'gra': 'Garoua',
    'mra': 'Maroua',
    'ngd': 'Ngaoundéré',
    'nga': 'Ngaoundéré',
    'bta': 'Bertoua',
    'kbi': 'Kribi',
  };

  /// Retourne les suggestions pour un texte saisi :
  /// abreviations exactes d'abord, puis correspondances par prefixe/contenu.
  static List<String> suggestions(String saisie) {
    final s = saisie.trim().toLowerCase();
    if (s.isEmpty) return liste;

    final resultats = <String>[];

    final abrege = abreviations[s];
    if (abrege != null) resultats.add(abrege);

    for (final v in liste) {
      final vNorm = _sansAccents(v.toLowerCase());
      final sNorm = _sansAccents(s);
      if (vNorm.startsWith(sNorm) && !resultats.contains(v)) {
        resultats.add(v);
      }
    }
    for (final v in liste) {
      final vNorm = _sansAccents(v.toLowerCase());
      final sNorm = _sansAccents(s);
      if (vNorm.contains(sNorm) && !resultats.contains(v)) {
        resultats.add(v);
      }
    }
    return resultats;
  }

  static String _sansAccents(String texte) {
    const avec = 'àâäéèêëîïôöùûüç';
    const sans = 'aaaeeeeiioouuuc';
    var r = texte;
    for (var i = 0; i < avec.length; i++) {
      r = r.replaceAll(avec[i], sans[i]);
    }
    return r;
  }
}