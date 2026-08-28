import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/format_date.dart';
import '../config/notifs_store.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import 'apres_voyage.dart';

/// Espace Notifications : suppression une par une (glisser) ou tout d'un coup.
/// A l'ouverture, tout est marque comme lu (le badge cloche disparait).
class EcranNotifications extends StatefulWidget {
  const EcranNotifications({super.key});

  @override
  State<EcranNotifications> createState() => _EcranNotificationsState();
}

class _EcranNotificationsState extends State<EcranNotifications> {
  @override
  void initState() {
    super.initState();
    // On relit d'abord le serveur : sans cela l'écran afficherait la
    // liste de la dernière visite. Puis on marque comme lues, ce qui
    // fait disparaître la pastille de la cloche.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await NotifsStore.charger();
      await NotifsStore.marquerToutesLues();
    });
  }

  void _confirmerToutSupprimer() {
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
              Text(
                Strings.t('notif_tout_suppr_titre'),
                style: const TextStyle(
                    fontSize: 15.5, fontWeight: FontWeight.w800),
              ),
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
                        child: Text(
                          Strings.t('annuler'),
                          style: TextStyle(
                              color: JegoTheme.texte,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        NotifsStore.toutSupprimer();
                        Navigator.of(ctx).pop();
                        setState(() {});
                      },
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.danger,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(
                          Strings.t('supprimer'),
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800),
                        ),
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

  /// Ouvre la notation du voyage concerné.
  ///
  /// La notification ne transporte pas le billet : elle vient du
  /// serveur, qui n'y met que du texte. On retrouve donc le billet par
  /// son numéro, cité dans le contenu, et à défaut le voyage le plus
  /// récent — celui dont l'arrivée vient d'être déclarée.
  void _ouvrirNotation(Map<String, dynamic> n) {
    final billets = BilletsStore.billets.value;
    if (billets.isEmpty) return;

    final contenu = '${n['contenu'] ?? ''}';
    final billetActuel = billets.firstWhere(
      (b) => contenu.contains('${b['numero'] ?? ''}'),
      orElse: () => billets.first,
    );
    Navigator.of(context).push(
      MaterialPageRoute(
          builder: (_) => EcranApresVoyage(billet: billetActuel)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: ValueListenableBuilder<List<Map<String, dynamic>>>(
          valueListenable: NotifsStore.liste,
          builder: (context, notifs, _) {
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
                  child: Row(
                    children: [
                      BoutonTactile(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: JegoTheme.fondCarte,
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: JegoTheme.bordCarte, width: 1),
                          ),
                          child: Icon(Icons.close_rounded,
                              size: 20, color: JegoTheme.texte),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        Strings.t('nav_notifications'),
                        style: TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      if (notifs.isNotEmpty)
                        BoutonTactile(
                          onTap: _confirmerToutSupprimer,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: JegoTheme.danger.withOpacity(0.08),
                              borderRadius:
                                  BorderRadius.circular(JegoTheme.rGrand),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.delete_sweep_rounded,
                                    size: 15, color: JegoTheme.danger),
                                const SizedBox(width: 4),
                                Text(
                                  Strings.t('tout_effacer'),
                                  style: TextStyle(
                                    color: JegoTheme.danger,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: notifs.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.notifications_off_rounded,
                                  size: 44,
                                  color: JegoTheme.texteTernaire),
                              const SizedBox(height: 10),
                              Text(
                                Strings.t('notif_vide'),
                                style: TextStyle(
                                    color: JegoTheme.texteSecondaire),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding:
                              const EdgeInsets.fromLTRB(18, 6, 18, 100),
                          itemCount: notifs.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, i) {
                            final n = notifs[i];
                            return Dismissible(
                              key: ValueKey(n['id']),
                              direction: DismissDirection.endToStart,
                              onDismissed: (_) =>
                                  NotifsStore.supprimer('${n['id']}'),
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding:
                                    const EdgeInsets.only(right: 20),
                                decoration: BoxDecoration(
                                  color: JegoTheme.danger,
                                  borderRadius: BorderRadius.circular(
                                      JegoTheme.rMoyen),
                                ),
                                child: const Icon(Icons.delete_rounded,
                                    color: Colors.white),
                              ),
                              child: _carteNotif(n),
                            )
                                .animate(delay: (i * 320).ms)
                                .fadeIn(duration: 550.ms)
                                .slideY(
                                    begin: 0.4,
                                    duration: 550.ms,
                                    curve: Curves.easeOutCubic);
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

  /// Icône selon le type renvoyé par le serveur. Chaque type vient
  /// d'un vrai évènement : un billet payé, un remboursement traité, un
  /// chauffeur qui déclare son arrivée.
  IconData _iconeType(String type) {
    switch (type) {
      case 'confirmation_billet':
      case 'confirmation_groupe':
        return Icons.confirmation_number_rounded;
      case 'billet_cadeau_recu':
        return Icons.card_giftcard_rounded;
      case 'remboursement':
        return Icons.savings_rounded;
      case 'litige_reponse':
      case 'litige_decision':
        return Icons.gavel_rounded;
      case 'arrivee_declaree':
        return Icons.flag_rounded;
      case 'retard':
        return Icons.schedule_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  /// Ancienneté en clair. Le serveur renvoie une date ; « il y a 2 h »
  /// se lit mieux qu'un horodatage.
  String _depuis(dynamic quand) {
    final d = DateTime.tryParse('$quand')?.toLocal();
    if (d == null) return '';
    final ecart = DateTime.now().difference(d);
    if (ecart.inMinutes < 1) return "À l'instant";
    if (ecart.inMinutes < 60) return 'Il y a ${ecart.inMinutes} min';
    if (ecart.inHours < 24) return 'Il y a ${ecart.inHours} h';
    if (ecart.inDays == 1) return 'Hier';
    if (ecart.inDays < 7) return 'Il y a ${ecart.inDays} j';
    return FormatDate.lisible(d.toIso8601String().split('T').first);
  }

  Widget _carteNotif(Map<String, dynamic> n) {
    // Une arrivée déclarée mène à la notation du voyage : la carte est
    // alors cliquable et se distingue par sa bordure verte.
    final estArrivee = n['type'] == 'arrivee_declaree';
    final icone = _iconeType('${n['type']}');
    final titre = '${n['titre'] ?? ''}';
    final texte = '${n['contenu'] ?? ''}';

    final carte = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(
            color: estArrivee
                ? JegoTheme.vert.withOpacity(0.3)
                : JegoTheme.bordCarte,
            width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: JegoTheme.vert.withOpacity(0.1),
              borderRadius: BorderRadius.circular(JegoTheme.rPetit),
            ),
            child: Icon(icone, color: JegoTheme.vert, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titre,
                  style: TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  texte,
                  style: TextStyle(
                    color: JegoTheme.texteSecondaire,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _depuis(n['cree_le']),
                  style: TextStyle(
                    color: JegoTheme.texteTernaire,
                    fontSize: 10.5,
                  ),
                ),
                if (estArrivee) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Toucher pour noter →',
                    style: TextStyle(
                      color: JegoTheme.vert,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );

    if (!estArrivee) return carte;

    return GestureDetector(
      onTap: () => _ouvrirNotation(n),
      child: carte,
    );
  }
}