import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/session.dart';
import '../config/format_date.dart';
import '../config/pdf_billet.dart';
import '../config/pdf_telechargement.dart';
import '../config/remboursement.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/billet_qr.dart';
import '../config/pdf_partage.dart';
import '../config/api.dart';
import '../config/wallet_store.dart';
import 'pendant_voyage.dart';

class EcranBillets extends StatefulWidget {
  const EcranBillets({super.key});

  @override
  State<EcranBillets> createState() => _EcranBilletsState();
}

class _EcranBilletsState extends State<EcranBillets> {
  int _section = 0; // 0 = valides, 1 = passes

  @override
  void initState() {
    super.initState();
    // Les billets affichés viennent du serveur : on les charge à
    // l'ouverture de l'onglet pour refléter l'état réel du compte.
    if (Session.connecte.value) BilletsStore.charger();
  }

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
                        style: TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      BoutonTactile(
                        onTap: _recupererBillet,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 9),
                          decoration: BoxDecoration(
                            color: JegoTheme.vert.withOpacity(0.1),
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rGrand),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.download_rounded,
                                  size: 15, color: JegoTheme.vert),
                              const SizedBox(width: 5),
                              Text(
                                Strings.t('billet_recuperer'),
                                style: TextStyle(
                                    color: JegoTheme.vert,
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w800),
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
            style: TextStyle(color: JegoTheme.texteSecondaire),
          ),
        ],
      ),
    );
  }

  /// Recuperation d'un billet sur cet appareil : numero + telephone du
  /// compte, verifies par le serveur. Le billet et son QR viennent de
  /// la base -- plus rien n'est fabrique localement.
  void _recupererBillet() {
    final cNumero = TextEditingController();
    final erreur = ValueNotifier<String?>(null);
    final enCours = ValueNotifier<bool>(false);

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: JegoTheme.fondCarte,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.download_rounded, color: JegoTheme.vert, size: 32),
              const SizedBox(height: 10),
              Text(Strings.t('recup_titre'),
                  style: const TextStyle(
                      fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(Strings.t('recup_texte'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 12.5)),
              const SizedBox(height: 14),
              _champRecup(cNumero, Strings.t('recup_champ_numero'),
                  'BIL-XXXXX-XXXXX', erreur,
                  majuscules: true),
              ValueListenableBuilder<String?>(
                valueListenable: erreur,
                builder: (context, err, _) => err == null
                    ? const SizedBox(height: 14)
                    : Padding(
                        padding: const EdgeInsets.only(top: 8, bottom: 6),
                        child: Text(err,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: JegoTheme.danger,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ),
              ),
              ValueListenableBuilder<bool>(
                valueListenable: enCours,
                builder: (context, charge, _) => BoutonTactile(
                  onTap: charge
                      ? null
                      : () async {
                          final numero = cNumero.text.trim();
                          if (numero.isEmpty) {
                            erreur.value = Strings.t('recup_invalide');
                            return;
                          }
                          enCours.value = true;
                          erreur.value = null;
                          try {
                            final brut = await ApiService.recupererBillet(
                                numero: numero);
                            BilletsStore.ajouterDepuisServeur(brut);
                            if (ctx.mounted) Navigator.of(ctx).pop();
                          } on ErreurApi catch (e) {
                            erreur.value = e.message;
                          } finally {
                            enCours.value = false;
                          }
                        },
                  child: Container(
                    width: double.infinity,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: charge
                          ? JegoTheme.vert.withOpacity(0.5)
                          : JegoTheme.vert,
                      borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                    ),
                    child: charge
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text(Strings.t('recup_bouton'),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(Strings.t('recup_note'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: JegoTheme.texteTernaire, fontSize: 10.5)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _champRecup(TextEditingController c, String libelle, String indice,
      ValueNotifier<String?> erreur,
      {bool majuscules = false, TextInputType? clavier}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(libelle,
            style: TextStyle(
                color: JegoTheme.texteSecondaire,
                fontSize: 11.5,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 5),
        Container(
          decoration: BoxDecoration(
            color: JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          ),
          child: TextField(
            controller: c,
            keyboardType: clavier,
            textCapitalization: majuscules
                ? TextCapitalization.characters
                : TextCapitalization.none,
            onChanged: (_) => erreur.value = null,
            style: TextStyle(
                color: JegoTheme.texte,
                fontSize: 14.5,
                fontWeight: FontWeight.w700),
            cursorColor: JegoTheme.vert,
            decoration: InputDecoration(
              hintText: indice,
              hintStyle: TextStyle(color: JegoTheme.texteTernaire),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            ),
          ),
        ),
      ],
    );
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
    final nbAnnules = widget.billets.where((b) => b['annule'] == true).length;

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
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                '${premier['ville_depart']} → ${premier['ville_arrivee']}',
                                style: TextStyle(
                                  color: JegoTheme.texte,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            if (nbAnnules > 0) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: JegoTheme.danger.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(
                                      JegoTheme.rGrand),
                                ),
                                child: Text(
                                  n > 1
                                      ? '$nbAnnules/$n annulé(s)'
                                      : 'Annulé',
                                  style: TextStyle(
                                      color: JegoTheme.danger,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${FormatDate.lisible(premier['date'])} · ${premier['heure_depart']}${n > 1 ? ' · $n ${Strings.t('billet_billets')}' : ''}',
                          style: TextStyle(
                              color: JegoTheme.texteSecondaire,
                              fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _ouvert ? 0.5 : 0,
                    duration: const Duration(milliseconds: 250),
                    child: Icon(Icons.keyboard_arrow_down_rounded,
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
                      Divider(
                          height: 1, color: JegoTheme.bordCarte),
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            // Suivre le trajet : c'est l'ecran d'ou l'on
                            // signale un exces de vitesse, une conduite
                            // dangereuse, une fausse arrivee. Reserve aux
                            // trajets a venir ou en cours.
                            if (!widget.estPasse) ...[
                              BoutonTactile(
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => EcranPendantVoyage(
                                        billet: widget.billets.first),
                                  ),
                                ),
                                child: Container(
                                  width: double.infinity,
                                  height: 48,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(colors: [
                                      JegoTheme.vert,
                                      JegoTheme.vertVif
                                    ]),
                                    borderRadius: BorderRadius.circular(
                                        JegoTheme.rPetit),
                                  ),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.navigation_rounded,
                                          size: 17, color: Colors.white),
                                      const SizedBox(width: 8),
                                      Text(
                                        Strings.t('billet_suivre_trajet'),
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13.5),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],
                            ...widget.billets.map((b) => Padding(
                                  padding:
                                      const EdgeInsets.only(bottom: 12),
                                  child: _CarteBilletAvecAction(
                                    billet: b,
                                    estPasse: widget.estPasse,
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
                                      Icon(Icons.delete_rounded,
                                          size: 16,
                                          color: JegoTheme.danger),
                                      const SizedBox(width: 6),
                                      Text(
                                        Strings.t('billet_supprimer_trajet'),
                                        style: TextStyle(
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
              Icon(Icons.delete_sweep_rounded,
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
                            style: TextStyle(
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

/// Un billet individuel + ses actions propres (annuler, telecharger,
/// partager), en dessous. Telecharger/Partager restent disponibles meme
/// pour un billet passe ou annule (c'est un recu, toujours consultable).
class _CarteBilletAvecAction extends StatefulWidget {
  final Map<String, dynamic> billet;
  final bool estPasse;

  const _CarteBilletAvecAction({
    required this.billet,
    required this.estPasse,
  });

  @override
  State<_CarteBilletAvecAction> createState() =>
      _CarteBilletAvecActionState();
}

class _CarteBilletAvecActionState extends State<_CarteBilletAvecAction> {
  bool _enCoursPdf = false;

  String _fmt(int montant) {
    final s = montant.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  DateTime? _dateDepart() {
    try {
      final d = DateTime.parse(widget.billet['date'] as String);
      final parts = '${widget.billet['heure_depart']}'.split(':');
      return DateTime(
          d.year, d.month, d.day, int.parse(parts[0]), int.parse(parts[1]));
    } catch (_) {
      return null;
    }
  }

  Future<void> _telecharger() async {
    if (_enCoursPdf) return;
    setState(() => _enCoursPdf = true);
    try {
      final bytes = await genererPdfBillet(widget.billet);
      await telechargerPdf(bytes, 'Billet_${widget.billet['num_resa'] ?? ''}.pdf');
    } finally {
      if (mounted) setState(() => _enCoursPdf = false);
    }
  }

  /// Partage reel : la feuille du systeme, avec le billet en piece
  /// jointe. `Printing.sharePdf` ne sait pas faire sur le web et
  /// retombait sur un telechargement -- les deux boutons faisaient
  /// alors exactement la meme chose.
  Future<void> _partager() async {
    if (_enCoursPdf) return;
    setState(() => _enCoursPdf = true);
    try {
      final bytes = await genererPdfBillet(widget.billet);
      final partage = await partagerPdf(
        bytes,
        'Billet_${widget.billet['num_resa'] ?? ''}.pdf',
      );
      if (!partage && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(Strings.t('partage_indisponible')),
            behavior: SnackBarBehavior.floating,
            backgroundColor: JegoTheme.texte,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _enCoursPdf = false);
    }
  }

  Future<void> _confirmerAnnulation(BuildContext context) async {
    final depart = _dateDepart();
    if (depart == null) return;
    final flexible = widget.billet['flexible'] == true;
    final prix = (widget.billet['total'] as num?)?.toInt() ?? 0;

    final rembourse = calculerRemboursement(
      flexible: flexible,
      prix: prix,
      depart: depart,
    );

    final numeros = (widget.billet['sieges'] as List?)?.join(', ') ?? '';

    final confirme = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: JegoTheme.fondCarte,
            borderRadius: BorderRadius.circular(JegoTheme.rGrand),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.18),
                blurRadius: 28,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: JegoTheme.danger.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.event_busy_rounded,
                    color: JegoTheme.danger, size: 28),
              ),
              const SizedBox(height: 14),
              Text(
                numeros.isEmpty
                    ? 'Annuler ce billet ?'
                    : 'Annuler le siège $numeros ?',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 15.5, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      JegoTheme.vert.withOpacity(0.08),
                      JegoTheme.vertVif.withOpacity(0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                  border:
                      Border.all(color: JegoTheme.vert.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(Strings.t('montant_paye'),
                            style: TextStyle(
                                fontSize: 12.5,
                                color: JegoTheme.texteSecondaire)),
                        Text('${_fmt(prix)} FCFA',
                            style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: JegoTheme.texte)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Divider(height: 1, color: JegoTheme.bordCarte),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.account_balance_wallet_rounded,
                                size: 15, color: JegoTheme.vert),
                            const SizedBox(width: 5),
                            Text(Strings.t('vers_portefeuille'),
                                style: TextStyle(
                                    fontSize: 12.5,
                                    color: JegoTheme.texteSecondaire)),
                          ],
                        ),
                        Text('${_fmt(rembourse)} FCFA',
                            style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: JegoTheme.vert)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(false),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('act_garder'),
                            style: TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(true),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [JegoTheme.danger, Color(0xFFB33A3A)],
                          ),
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('act_annuler'),
                            style: TextStyle(
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

    if (confirme != true) return;

    // L'annulation se faisait entierement en local : le billet passait
    // « annule » a l'ecran, le portefeuille se creditait en memoire, et
    // le serveur n'en savait rien. Le billet restait confirme en base,
    // le siege vendu, aucun remboursement enregistre.
    try {
      await ApiService.annulerBillet('${widget.billet['billet_id'] ?? widget.billet['id']}');
    } on ErreurApi catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: JegoTheme.danger,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
        ),
      );
      return;
    }

    // On relit l'etat reel plutot que de le supposer : c'est le serveur
    // qui decide du statut et du montant rembourse.
    await BilletsStore.charger();
    // L'annulation a pu declencher un remboursement : le registre le
    // montre sans qu'on ait a le recalculer ici.
    await WalletStore.charger();
  }

  @override
  Widget build(BuildContext context) {
    final annule = widget.billet['annule'] == true;

  return Column(
      children: [
        BilletCarre(
          villeDepart: widget.billet['ville_depart'],
          villeArrivee: widget.billet['ville_arrivee'],
          date: widget.billet['date'],
          offre: widget.billet,
          sieges: (widget.billet['sieges'] as List).map((s) => '$s').toList(),
          detaille: true,
          onTelecharger: _telecharger,
          onPartager: _partager,
          chargementPdf: _enCoursPdf,
        ),
        const SizedBox(height: 8),

        if (!widget.estPasse && !annule) ...[
          const SizedBox(height: 8),
          BoutonTactile(
            onTap: () => _confirmerAnnulation(context),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 11),
              decoration: BoxDecoration(
                color: JegoTheme.danger.withOpacity(0.06),
                borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                border: Border.all(color: JegoTheme.danger.withOpacity(0.25)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.event_busy_rounded,
                      size: 15, color: JegoTheme.danger),
                  const SizedBox(width: 7),
                  Text(
                    'Annuler ce billet',
                    style: TextStyle(
                        color: JegoTheme.danger,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ),
        ],
        if (annule) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(
              color: JegoTheme.champ,
              borderRadius: BorderRadius.circular(JegoTheme.rPetit),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle_rounded,
                    size: 14, color: JegoTheme.texteTernaire),
                const SizedBox(width: 6),
                Text(
                  'Billet annulé',
                  style: TextStyle(
                      color: JegoTheme.texteTernaire,
                      fontWeight: FontWeight.w600,
                      fontSize: 11.5),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}