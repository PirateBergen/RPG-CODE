# Suite de la campagne

## À rappeler quand on cherche la prochaine amélioration

- Reprendre le combat du **Roi**, boss final, pour en faire une rencontre aboutie : phases, rythme, attaques annoncées, possibilités de réponse et mise en scène. Demande du joueur du 8 novembre 2026. La conception détaillée est volontairement reportée.
- En attendant, le Roi et le Balrog sont des world boss : deux actions par tour, niveau du groupe +6, résistance à l’hypnose et préparation des spéciales selon les règles communes. Le Roi reçoit environ 20 % de PV supplémentaires et 10 % de dégâts supplémentaires par rapport à son profil world boss standard.

## Épée du Balrog

Implémentée dans la version 20261109.20 : découverte partagée après retour de victoire, récupération unique par Greg pour Greg ou Bibi, poids 15, équipement et transferts, sauvegarde. Bonus évolutif : Force = bonus de l’épée d’armurerie au niveau de Greg +2 ; Défense +1, puis +2 au niveau 10, +3 au niveau 20. Les statistiques de base ne sont pas modifiées.

Contre le Roi : lueur bleutée partagée à l’entrée du combat si équipée ; une attaque physique de Greg réussie réduit de 15 % la prochaine attaque du Roi, 25 % sur critique. Le meilleur effet est conservé sans cumul, puis consommé.

## Audit du 9 novembre — suite

Corrigé en 20261109.23 : annulation des animations et délais après nettoyage ou retour de combat ; attaques propres au PNJ Elo ; tests de l'ancienne intervention remplacés par les états et PV MJ actuels ; aperçus des 9 pouvoirs alliés avec arrêt manuel, sans écriture de partie.

Chantiers distincts restant à concevoir : garantir les champs calculés des fiches sans supprimer les éditions manuelles voulues ; mesurer et réduire les échanges sur la racine complète pour les longues campagnes ; concevoir les phases du Roi final. Ces points ne sont pas annoncés comme corrigés.

## Réseau — 10 novembre

Les contrôles automatiques sans effet utilisent les abonnements locaux avant de solliciter une transaction : huit éditions ordinaires passent de 16 à 0 lectures REST de la racine dans le scénario de test. Les modifications effectives restent recalculées sur la base serveur. Les écritures simples utilisent une réponse sans recopie, et la sauvegarde réutilise les archives de son instantané complet unique. La séparation structurelle des sauvegardes et de la partie active reste à concevoir ; les actions complexes utilisent toujours une transaction globale avec contrôle de version.

## Découpage progressif — raccourcis

Première extraction de game.js et ui.js : raccourcis et aide dans shortcuts.js, fonctions déplacées sans changement. Installation du clavier conservée à sa position de démarrage ; chargement et cache vérifiés. Les fenêtres et les mécanismes de jeu restent leurs propres responsables.

## Priorités CSS — 10 novembre

114 priorités redondantes retirées (479 → 365), sans ajouter de spécificité artificielle. Styles calculés identiques dans 30 configurations contrôlées. Les priorités non couvertes ou nécessaires à la visibilité, aux interactions et aux transitions restent conservées. Voir STYLES-PRIORITES-2026-11-10.md.

## Menus — regroupement des styles

51 blocs dispersés regroupés en 33 blocs de base ; 20 priorités dupliquées retirées, total 345. Comparaison finale identique sur 35 configurations de menus. Adaptations mobiles, restrictions de rôle et exception du menu Action conservées. Voir MENUS-STYLES-2026-11-10.md.

## Fiches et inventaire — styles

Bases, jauges, animations, formulaire et adaptations mobiles regroupés. Onze styles fixes retirés du HTML/JS et centralisés dans le CSS ; valeurs effectives et coordonnées des champs conservées. Comparaison identique sur 30 configurations. Voir FICHES-STYLES-2026-11-10.md.

## Prochaine étape après l’événement de l’Antre

Reprendre le nettoyage des styles de l’écran de combat : regrouper HUD, panneaux d’attaques, initiative, états et notifications ; retirer les doublons après comparaison avant/après sur ordinateur et mobile. Les menus, fiches et inventaires ont déjà été traités.

Événement de l’Antre implémenté : première défaite collective world boss → antre.jpg, une seule fois dans l’état de partie sauvegardé. PV maximum pour Greg, Pika, Elo et Bibi ; marque narrative uniquement ; toute sortie, dont trou.jpg, termine cet état. Cinématique partagée et sauvegarde/reconnexion couvertes par les tests. Voir ANTRE-PREMIERE-DEFAITE-2026-11-10.md.

## Don de la Gardienne — Immortalité quantique

Acquis une fois à la sortie de l’Antre, affiché comme état permanent dans les fiches et conservé dans la sauvegarde. Les KO restent possibles ; à la fin de tout combat, seuls les bénéficiaires KO retrouvent leurs PV maximum. Sans le don, une mort ordinaire reste un KO au retour. La Gardienne en tant que PNJ sera ajoutée ultérieurement. Voir IMMORTALITE-QUANTIQUE-2026-11-10.md. La reprise prévue du nettoyage concerne toujours les styles de combat.
