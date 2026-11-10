# Premier passage dans l’Antre

## Règle

La première défaite collective dans un combat contenant un world boss envoie le groupe dans `antre.jpg`, et non dans `trou.jpg` (le Passage). Bibi fait partie des combattants : si elle peut encore continuer, la défaite collective n’est pas déclenchée.

L’issue et la consommation de l’événement sont scellées ensemble par le moteur. Plusieurs MJ ne peuvent pas produire deux consommations. La première défaite forcée par le bouton MJ applique également cette règle, ce qui permet de la tester dans l’essai local.

À l’arrivée, Greg, Pika, Elo et Bibi récupèrent leurs PV maximum et leurs pions reprennent un affichage normal. Une petite marque « ✧ Mort » indique seulement leur état narratif ; aucune classe KO ni restriction d’action n’est ajoutée par cette marque. Les inventaires, notes, caractéristiques et dons restent conservés.

Le premier changement vers n’importe quelle autre carte met fin à cet état, y compris un déplacement vers le Passage. La marque disparaît avec une courte lueur dorée. Revenir ensuite dans l’Antre ne la fait pas réapparaître. Les défaites suivantes suivent la règle ordinaire de retour, sans cette réanimation.

## Présentation

Après l’animation habituelle de défaite : écran sombre, petites mouches lumineuses bleues et texte « Votre histoire ne s’achève pas ici… ». Un souffle grave discret est synthétisé localement, réglé sur le volume des effets. La scène de l’Antre est révélée progressivement. Ce passage dure environ six secondes et ne nécessite aucun clic.

Les sons, éléments et rappels différés sont arrêtés lors d’un nettoyage ou d’un chargement. Une option de mouvement réduit est prévue. L’Antre reste visible si la nuit extérieure était active, sans changer durablement les réglages jour/nuit. Un éventuel trajet en bateau est terminé pour afficher les pions du groupe.

## Sauvegarde et réseau

La progression de l’événement est conservée dans l’état sauvegardé de la partie, dans `game.antreAfterlife`. Charger une sauvegarde prise dans l’Antre rétablit les marques sans rejouer le passage. Une nouvelle partie repart sans événement consommé. Le mode test utilise son état et ses sauvegardes isolés.

La décision et la réanimation sont effectuées côté coordinateur MJ, sous contrôle de version de la base. L’animation ne modifie ni les PV ni les données de campagne. Un retour de secours est prévu si le MJ se reconnecte après la cinématique.

## Vérifications

- Tests déterministes : premier world boss, boss secondaire, absence de déclenchement sur ennemi ordinaire, victoire et fuite, Bibi encore vivante, issue scellée une seule fois, défaites suivantes.
- Parcours Firebase local dans cinq sessions dont deux MJ : animation unique, retour à l’Antre et PV maximum, mouvements possibles, scène visible, bateau quitté, notes et objets conservés, sauvegarde, chargement, reconnexion, sortie par le Passage, retour sans marque et seconde défaite ordinaire.
- Régressions des retours de combat, de Jörmungandr/Thor, des sauvegardes de combat et de la fuite world boss.
- Contrôle Edge : badges narratifs sans KO, texte sur petit écran, fin et annulation de cinématique, absence de rappel tardif, mouvement réduit et fermeture des contextes audio.

Ces tests utilisent un émulateur local et des sessions DOM simulées pour le multijoueur. Edge vérifie des parcours ciblés ; aucune écoute humaine ni campagne complète sur plusieurs appareils physiques n’est revendiquée.

## Reprise du nettoyage

Après cet événement : reprendre les styles de l’écran de combat (HUD, attaques, initiative, états et notifications), avec comparaison avant/après sur ordinateur et mobile. Cette étape reste notée dans `ROADMAP.md`.
