import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/notifs_store.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

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
    // Marque comme lues des l'ouverture -> le compteur cloche disparait.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotifsStore.marquerToutesLues();
    });
  }

  static String _conseilVestimentaire(int temp) {
    if (temp <= 16) return Strings.t('vest_veste');
    if (temp <= 21) return Strings.t('vest_pull');
    if (temp >= 30) return Strings.t('vest_leger');
    return Strings.t('vest_normal');
  }

  static IconData _iconeMeteo(int temp) {
    if (temp <= 20) return Icons.cloud_rounded;
    if (temp >= 30) return Icons.wb_sunny_rounded;
    return Icons.wb_cloudy_rounded;
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
              const Icon(Icons.delete_sweep_rounded,
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
                          style: const TextStyle(
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
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: JegoTheme.bordCarte, width: 1),
                          ),
                          child: const Icon(Icons.close_rounded,
                              size: 20, color: JegoTheme.texte),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        Strings.t('nav_notifications'),
                        style: const TextStyle(
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
                                const Icon(Icons.delete_sweep_rounded,
                                    size: 15, color: JegoTheme.danger),
                                const SizedBox(width: 4),
                                Text(
                                  Strings.t('tout_effacer'),
                                  style: const TextStyle(
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
                                style: const TextStyle(
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
                                  NotifsStore.supprimer(n['id'] as int),
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

  Widget _carteNotif(Map<String, dynamic> n) {
    final estMeteo = n['type'] == 'meteo';
    final IconData icone;
    final String titre;
    final String texte;

    if (estMeteo) {
      final temp = n['temp'] as int;
      icone = _iconeMeteo(temp);
      titre = '${Strings.t('notif_meteo_titre')} ${n['ville']} : $temp°C';
      texte = _conseilVestimentaire(temp);
    } else {
      icone = n['type'] == 'rappel'
          ? Icons.alarm_rounded
          : Icons.check_circle_rounded;
      titre = Strings.t(n['titre_cle'] as String);
      texte = Strings.t(n['texte_cle'] as String);
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
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
                  style: const TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  texte,
                  style: const TextStyle(
                    color: JegoTheme.texteSecondaire,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '${n['quand']}',
                  style: const TextStyle(
                    color: JegoTheme.texteTernaire,
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}