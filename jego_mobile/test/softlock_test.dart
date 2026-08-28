import 'package:flutter_test/flutter_test.dart';
import 'package:jego_mobile/config/billets_store.dart';

/// Le decompte doit suivre l'horloge, pas le nombre de tics recus.
/// Une application mise en arriere-plan ne recoit plus de tics : c'est
/// exactement la situation ou l'ancien compteur s'arretait.
void main() {
  tearDown(SoftLock.arreter);

  test('le temps passe meme sans un seul tic', () async {
    SoftLock.demarrer(3);
    expect(SoftLock.restant, 3);

    // Aucun appel a rafraichir() ici : on simule l'application en
    // arriere-plan, timers geles.
    await Future<void>.delayed(const Duration(seconds: 2));

    expect(SoftLock.restant, lessThanOrEqualTo(1),
        reason: 'deux secondes reelles doivent avoir ete decomptees');
  });

  test('rafraichir remet l affichage a l heure au reveil', () async {
    SoftLock.demarrer(3);
    expect(SoftLock.secondes.value, 3);

    await Future<void>.delayed(const Duration(seconds: 2));
    // L'affichage n'a pas bouge tant que personne ne l'a recalcule.
    expect(SoftLock.secondes.value, 3);

    SoftLock.rafraichir();
    expect(SoftLock.secondes.value, lessThanOrEqualTo(1));
  });

  test('une pause repousse la fin d autant', () async {
    SoftLock.demarrer(5);
    SoftLock.suspendre();
    await Future<void>.delayed(const Duration(seconds: 2));
    SoftLock.reprendre();

    // Les deux secondes de pause ne sont pas decomptees : la question
    // « toujours la ? » ne doit pas manger le temps de la personne.
    expect(SoftLock.restant, greaterThanOrEqualTo(4));
  });

  test('arreter remet tout a zero', () {
    SoftLock.demarrer(60);
    SoftLock.arreter();
    expect(SoftLock.actif.value, isFalse);
    expect(SoftLock.restant, 0);
  });
}
