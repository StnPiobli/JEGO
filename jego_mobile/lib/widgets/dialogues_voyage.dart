import 'package:flutter/material.dart';
import '../config/billets_store.dart';
import '../config/theme_jego.dart';

/// Boite de dialogue partagee "signaler une fausse arrivee", utilisee a la
/// fois depuis l'ecran Pendant le voyage (carte arrivee) et depuis l'ecran
/// de notation (accessible aussi via une notification), pour eviter deux
/// formulations differentes du meme geste. Renvoie true si confirme.
Future<bool> confirmerFausseArrivee(
    BuildContext context, String billetId) async {
  final confirme = await showDialog<bool>(
    context: context,
    builder: (ctx) => Dialog(
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.report_rounded,
                color: JegoTheme.danger, size: 32),
            const SizedBox(height: 10),
            const Text(
              'Signaler une fausse arrivée',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'L\'agence a déclaré ce trajet arrivé, mais vous êtes encore en route. Une fois signalé, vous ne pourrez plus noter ce trajet tant que ce n\'est pas vérifié.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: JegoTheme.texteSecondaire, fontSize: 12.5),
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
                      child: const Text('Annuler',
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
                        color: JegoTheme.danger,
                        borderRadius:
                            BorderRadius.circular(JegoTheme.rPetit),
                      ),
                      child: const Text('Signaler',
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

  if (confirme == true) {
    BilletsStore.mettreAJour(billetId, {'fausse_arrivee_signalee': true});
    return true;
  }
  return false;
}