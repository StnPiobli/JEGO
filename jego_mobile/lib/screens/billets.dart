import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/format_date.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/billet_qr.dart';
import 'pendant_voyage.dart';

class EcranBillets extends StatefulWidget {
  const EcranBillets({super.key});

  @override
  State<EcranBillets> createState() => _EcranBilletsState();
}

class _EcranBilletsState extends State<EcranBillets> {
  int _section = 0; // 0 = valides, 1 = passes

  List<List<Map<String, dynamic>>> _grouper(
      List<Map<String, dynamic>> billets) {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final b in billets) {
      map.putIfAbsent('${b['groupe']}', () => []).add(b);
    }
    final groupes = map.values.toList();
    groupes.sort((a, b) {
      final da = DateTime.tryParse(a.first['date'] ?? '') ?? DateTime(2100);
      final db = DateTime.tryParse(b.first['date'] ?? '') ?? DateTime(2100);
      return da.compareTo(db);
    });
    return groupes;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        bottom: false,
        child: ValueListenableBuilder<List<Map<String, dynamic>>>(
          valueListenable: BilletsStore.billets,
          builder: (context, tous, _) {
            final valides =
                tous.where((b) => !BilletsStore.estPasse(b)).toList();
            final passes =
                tous.where((b) => BilletsStore.estPasse(b)).toList();
            final liste = _section == 0 ? valides : passes;
            final groupes = _grouper(liste);

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
                  child: Row(
                    children: [
                      Text(
                        Strings.t('nav_billets'),
                        style: const TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      BoutonTactile(
                        onTap: () => _recupererBillet(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 9),
                          decoration: BoxDecoration(
                            color: JegoTheme.vert.withOpacity(0.1),
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rGrand),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.download_rounded,
                                  size: 15, color: JegoTheme.vert),
                              const SizedBox(width: 5),
                              Text(
                                Strings.t('billet_recuperer'),
                                style: const TextStyle(
                                  color: JegoTheme.vert,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 4, 18, 8),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: JegoTheme.champ,
                      borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    ),
                    child: Row(
                      children: [
                        _ongletBouton(
                            '${Strings.t('billets_valides')} (${_grouper(valides).length})',
                            0),
                        _ongletBouton(
                            '${Strings.t('billets_passes')} (${_grouper(passes).length})',
                            1),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: groupes.isEmpty
                      ? _vide()
                      : ListView.separated(
                          padding:
                              const EdgeInsets.fromLTRB(18, 6, 18, 100),
                          itemCount: groupes.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, i) {
                            return _GroupeBillet(
                              billets: groupes[i],
                              estPasse: _section == 1,
                              onSupprimer: () {
                                BilletsStore.supprimerGroupe(
                                    '${groupes[i].first['groupe']}');
                              },
                            )
                                .animate(delay: (i * 80).ms)
                                .fadeIn(duration: 400.ms)
                                .slideY(begin: 0.15);
                          },
                        ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _ongletBouton(String libelle, int valeur) {
    final actif = _section == valeur;
    return Expanded(
      child: BoutonTactile(
        onTap: () => setState(() => _section = valeur),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: actif ? JegoTheme.vert : Colors.transparent,
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen - 4),
          ),
          child: Center(
            child: Text(
              libelle,
              style: TextStyle(
                color: actif ? Colors.white : JegoTheme.texteSecondaire,
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _vide() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.confirmation_number_outlined,
              size: 48, color: JegoTheme.texteTernaire),
          const SizedBox(height: 12),
          Text(
            _section == 0
                ? Strings.t('billets_vide_titre')
                : Strings.t('billets_passes_vide'),
            style: const TextStyle(color: JegoTheme.texteSecondaire),
          ),
        ],
      ),
    );
  }

  void _recupererBillet(BuildContext context) {
    final ctrl = TextEditingController();
    final erreur = ValueNotifier<String?>(null);
    final regex = RegExp(r'^JEGO-[A-Z0-9]{6}$');

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.download_rounded,
                  color: JegoTheme.vert, size: 32),
              const SizedBox(height: 10),
              Text(Strings.t('recup_titre'),
                  style: const TextStyle(
                      fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(Strings.t('recup_texte'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 12.5)),
              const SizedBox(height: 14),
              Container(
                decoration: BoxDecoration(
                  color: JegoTheme.champ,
                  borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                ),
                child: TextField(
                  controller: ctrl,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: (_) => erreur.value = null,
                  style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1),
                  cursorColor: JegoTheme.vert,
                  decoration: const InputDecoration(
                    hintText: 'JEGO-XXXXXX',
                    hintStyle: TextStyle(color: JegoTheme.texteTernaire),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                        horizontal: 14, vertical: 14),
                  ),
                ),
              ),
              ValueListenableBuilder<String?>(
                valueListenable: erreur,
                builder: (context, err, _) => err == null
                    ? const SizedBox(height: 14)
                    : Padding(
                        padding:
                            const EdgeInsets.only(top: 8, bottom: 6),
                        child: Text(err,
                            style: const TextStyle(
                                color: JegoTheme.danger,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ),
              ),
              BoutonTactile(
                onTap: () {
                  final code = ctrl.text.trim().toUpperCase();
                  if (!regex.hasMatch(code)) {
                    erreur.value = Strings.t('recup_invalide');
                    return;
                  }
                  BilletsStore.ajouter(_billetRecupere(code));
                  Navigator.of(ctx).pop();
                },
                child: Container(
                  width: double.infinity,
                  height: 48,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  ),
                  child: Text(Strings.t('recup_bouton'),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800)),
                ),
              ),
              const SizedBox(height: 8),
              Text(Strings.t('recup_note'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: JegoTheme.texteTernaire, fontSize: 10.5)),
            ],
          ),
        ),
      ),
    );
  }

  Map<String, dynamic> _billetRecupere(String code) {
    return {
      'id': 'recup-$code',
      'groupe': 'recup-$code',
      'num_resa': code,
      'ville_depart': 'Douala',
      'ville_arrivee': 'Yaoundé',
      'point_depart': 'Bonabéri',
      'point_arrivee': 'Mvan',
      'heure_depart': '06:30',
      'heure_arrivee': '10:15',
      'date': DateTime.now()
          .add(const Duration(days: 3))
          .toIso8601String()
          .substring(0, 10),
      'nom_agence': 'Finexs Voyages',
      'categorie': 'VIP',
      'nombre_arrets': 0,
      'arrets_liste': null,
      'equipements': ['clim', 'usb', 'wifi'],
      'sieges': [14],
      'personne': 1,
      'total_personnes': 1,
      'flexible': false,
      'code_qr': '$code-JEGO',
      'frais': [
        {'libelle': 'Billet', 'montant': '6500 FCFA'},
      ],
      'total': 6500,
    };
  }
}

class _GroupeBillet extends StatefulWidget {
  final List<Map<String, dynamic>> billets;
  final bool estPasse;
  final VoidCallback onSupprimer;

  const _GroupeBillet({
    required this.billets,
    required this.estPasse,
    required this.onSupprimer,
  });

  @override
  State<_GroupeBillet> createState() => _GroupeBilletState();
}

class _GroupeBilletState extends State<_GroupeBillet> {
  bool _ouvert = false;

  @override
  Widget build(BuildContext context) {
    final premier = widget.billets.first;
    final n = widget.billets.length;

    return Container(
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        children: [
          BoutonTactile(
            onTap: () => setState(() => _ouvert = !_ouvert),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: widget.estPasse
                          ? JegoTheme.texteTernaire.withOpacity(0.15)
                          : JegoTheme.vert.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                    ),
                    child: Icon(Icons.directions_bus_rounded,
                        color: widget.estPasse
                            ? JegoTheme.texteTernaire
                            : JegoTheme.vert,
                        size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${premier['ville_depart']} → ${premier['ville_arrivee']}',
                          style: const TextStyle(
                            color: JegoTheme.texte,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${FormatDate.lisible(premier['date'])} · ${premier['heure_depart']}${n > 1 ? ' · $n ${Strings.t('billet_billets')}' : ''}',
                          style: const TextStyle(
                              color: JegoTheme.texteSecondaire,
                              fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _ouvert ? 0.5 : 0,
                    duration: const Duration(milliseconds: 250),
                    child: const Icon(Icons.keyboard_arrow_down_rounded,
                        color: JegoTheme.texteSecondaire),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            child: _ouvert
                ? Column(
                    children: [
                      const Divider(
                          height: 1, color: JegoTheme.bordCarte),
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            if (!widget.estPasse)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: BoutonTactile(
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => EcranPendantVoyage(
                                            billet: premier),
                                      ),
                                    );
                                  },
                                  child: Container(
                                    width: double.infinity,
                                    height: 48,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [
                                          JegoTheme.vert,
                                          JegoTheme.vertVif
                                        ],
                                      ),
                                      borderRadius: BorderRadius.circular(
                                          JegoTheme.rPetit),
                                    ),
                                    child: const Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.location_on_rounded,
                                            size: 17, color: Colors.white),
                                        SizedBox(width: 8),
                                        Text(
                                          'Suivre le trajet en direct',
                                          style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 13.5),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ...widget.billets.map((b) => Padding(
                                  padding:
                                      const EdgeInsets.only(bottom: 12),
                                  child: BilletCarre(
                                    villeDepart: b['ville_depart'],
                                    villeArrivee: b['ville_arrivee'],
                                    date: b['date'],
                                    offre: b,
                                    sieges:
                                        (b['sieges'] as List).cast<int>(),
                                    detaille: true,
                                  ),
                                )),
                            if (widget.estPasse)
                              BoutonTactile(
                                onTap: () => _confirmerSuppr(context),
                                child: Container(
                                  width: double.infinity,
                                  height: 46,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color:
                                        JegoTheme.danger.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(
                                        JegoTheme.rPetit),
                                  ),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.delete_rounded,
                                          size: 16,
                                          color: JegoTheme.danger),
                                      const SizedBox(width: 6),
                                      Text(
                                        Strings.t('billet_supprimer_trajet'),
                                        style: const TextStyle(
                                            color: JegoTheme.danger,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  )
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }

  void _confirmerSuppr(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.delete_sweep_rounded,
                  color: JegoTheme.danger, size: 32),
              const SizedBox(height: 10),
              Text(Strings.t('billet_suppr_titre'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('annuler'),
                            style: const TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        widget.onSupprimer();
                        Navigator.of(ctx).pop();
                      },
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.danger,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('supprimer'),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}