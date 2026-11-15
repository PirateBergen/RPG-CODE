# Réactions aux attaques annoncées — version 20261115.4

## Utilisation

Lorsqu’un world boss prépare sa spéciale, le MJ dispose de **Faire réagir les joueurs**, dans le panneau de l’ennemi et dans un rappel à droite de l’écran. Aucun événement ni jet n’est imposé automatiquement : le MJ choisit de l’ouvrir après les déclarations des joueurs.

1. Choisir les personnages qui doivent lancer : Greg, Pika, Elo et/ou Bibi si vivants. Greg contrôle aussi le jet de Bibi.
2. Choisir D6, D12 ou D20, le seuil (de 2 au maximum du dé) et la réduction proposée sur réussite. Réglage initial : D12, seuil 8, réduction 50 %. Raccourcis : 20 %, protection 25 %, abri 50 %, évitement 100 % ; toute valeur entière de 0 à 100 reste possible.
3. **Ouvrir les jets des joueurs** ouvre une fenêtre partagée. Chaque joueur peut lancer une seule fois pour ses personnages sélectionnés. Le MJ peut lancer à la place d’un joueur absent. Les autres participants consultent les résultats.
4. Le résultat propose la réduction choisie sur réussite, 0 % sur échec. Le 1 naturel échoue ; la Chance aide les autres jets selon les règles de combat existantes. Ces jets ne changent ni l’initiative, ni les jauges de critique, ni l’action ordinaire du personnage.
5. Le MJ peut **Appliquer cette décision** avec un pourcentage pour chaque personnage, même sans jet. Cette décision a priorité sur la proposition du dé. **Valider les protections** exige un jet ou une décision MJ pour chaque personnage encore vivant.
6. Déclencher ensuite la spéciale avec le bouton habituel de l’ennemi, à son tour et une fois sa préparation terminée. Valider les protections ne déclenche pas l’attaque automatiquement.

Le bouton **Modifier les protections** rouvre les décisions avant la frappe, sans relancer les dés. La spéciale est à nouveau bloquée jusqu’à la validation. **Fermer la fenêtre** la masque seulement ; le rappel permet de la rouvrir. **Annuler les réactions et retirer leurs protections** supprime explicitement l’événement : le combat conserve son attaque préparée, qui peut alors être lancée sans cette protection.

## Application des effets

La protection est attachée à l’annonce précise de cette spéciale et à chaque personnage. Une attaque ordinaire ou celle d’un autre ennemi ne la consomme pas. Si une attaque à cible unique vise un autre personnage, la protection n’est pas transférée à cette autre cible. John Pork conserve ses règles d’interception ; il n’est pas un joueur qui lance un dé.

Le pourcentage de réaction réduit les dégâts de l’attaque avant les protections habituelles et l’armure, avec arrondi entier. Les réductions se multiplient : une réaction à 25 % puis une protection à 20 % laissent 60 % des dégâts avant armure, sous réserve des arrondis. Les autres protections ne sont ni effacées ni remplacées.

Un évitement validé à **100 % annule les dégâts et les effets secondaires** de cette attaque pour ce personnage. Une protection partielle réduit les dégâts ; elle n’annule pas automatiquement un étourdissement ou une malédiction. Le journal détaille la réduction de réaction et les dégâts finaux réellement appliqués.

L’attaque annoncée reste bloquée tant que son événement attend la décision du MJ ; les autres tours et attaques peuvent continuer. Une annonce sans événement de réaction conserve le fonctionnement habituel. La protection disparaît avec la résolution de la spéciale, l’annulation de l’événement, la disparition de l’ennemi ou la fin du combat. Un ancien bouton ne peut pas modifier une nouvelle annonce.

Pour une réduction générale sur plusieurs rounds, le menu **Intervenir** reste disponible : **Protégé** réduit les dégâts reçus, **Affaibli** réduit les dégâts infligés, côté joueur ou ennemi, en points ou en pourcentage. Les réactions ajoutent un réglage réservé à une attaque précise.

## Fiabilité et validation

L’état de l’événement, les jets et les décisions sont sauvegardés dans le combat. Une reconnexion ne permet pas de relancer un dé. Les transactions du MJ revalident le combat, l’annonce et la révision de session. Les joueurs ne peuvent ni choisir leur résultat, ni changer le seuil ou leur protection.

Le transport des jets réutilise la requête de dé partagée `initiative`, avec un identifiant de réaction et un chemin de résolution distinct. Une requête de réaction ne touche jamais aux jets d’initiative. Cela utilise les permissions Firebase déjà déployées : aucune extension des droits des joueurs ni modification des règles de production n’est nécessaire.

Validation : 43 suites unitaires, dont neuf contrôles de réactions ; sept scénarios avec cinq sessions et l’émulateur Firebase officiel ; cinq scénarios de non-régression des world boss ; navigateur aux dimensions 320×568, 390×844, 844×390 et 1440×900. Contrôles : choix des lanceurs, doubles clics, usurpation, reconnexion, sauvegarde, décisions MJ, application réelle des pourcentages, annulation des effets secondaires, fermeture et réouverture. Les tests utilisent exclusivement des parties locales synthétiques.

Cette publication ajoute les réactions ; elle ne change pas les coefficients de difficulté de la version 20261115.3. Le durcissement des boss et les phases propres à chaque world boss pourront être mesurés avec ce mécanisme disponible.
