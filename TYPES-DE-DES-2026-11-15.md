# Choix du type de dé — version 20261115.5

Cliquer sur un dé de la barre ouvre **Quel type de jet ?**. Aucun résultat n’est tiré avant le choix. Annuler ne lance rien.

- **Jet de Chance** : utilise le dé cliqué (D4 à D100) avec le bonus de Chance du personnage, selon la règle bornée déjà utilisée dans les combats recalibrés. Jusqu’à +2 ; équipement et bonus temporaires du combat pris en compte une seule fois. Le 1 naturel et le maximum naturel restent inchangés ; un bonus ne peut pas fabriquer un critique. Le résultat ne décide pas automatiquement d’un succès narratif : le MJ reste l’arbitre.
- **Initiative · D12** : enregistre le véritable jet d’initiative du combat, avec ses bonus existants. Il utilise toujours D12, même si l’on a cliqué sur D20. Disponible seulement pendant la phase d’initiative, pour un participant qui n’a pas encore lancé. Greg et Bibi partagent l’initiative de Greg. Un combat dont l’ordre est déjà établi ne peut pas être réordonné avec cette commande.
- **Jet libre** : conserve le lancer ordinaire, sans bonus de Chance ajouté automatiquement.

Le joueur lance pour son personnage. Le MJ choisit **Lancer pour** : MJ pour un jet libre, ou un personnage pour son jet de Chance ou son initiative. Choisir Bibi pour une initiative indique de passer par Greg ; le MJ peut lancer un jet de Chance pour Bibi.

Les jets de Chance sont calculés par le coordinateur MJ à partir de la fiche enregistrée, jamais à partir d’un bonus envoyé par le joueur. Le résultat partagé conserve le dé naturel, le bonus et le total. Animation et journal portent la mention **Chance**, par exemple `8 + 2 = 10`. Le journal de session reçoit aussi cette entrée. Les critiques et échecs naturels conservent les conséquences habituelles des jets libres sur les jauges.

Un jet de Chance ne consomme pas de tour de combat et ne modifie ni l’ordre ni la séquence d’initiative. Les attaques et réactions guidées gardent leurs propres boutons : elles ne passent pas par ce sélecteur. Les jets de statistiques de la fiche et les commandes directes de dés MJ existantes restent inchangés.

La fenêtre se ferme si le combat, le compte ou la révision de session change. Un double clic pendant la confirmation ne crée pas un second lancer depuis ce sélecteur. Les demandes confirmées ne sont pas rejouées et ne sont pas mises en attente pour être relancées après une déconnexion.

Validation : 44 suites unitaires, dont sept contrôles dédiés (tous les dés, critiques naturels, équipement/bonus temporaires, propriété du héros, bonus client ignoré, absence de cumul de statistiques, rejeu et sauvegarde). Cinq scénarios à cinq sessions sur l’émulateur Firebase officiel : même naturel/bonus/total partout, affichage Chance, choix du personnage par le MJ, initiative D12 réelle depuis D20 et ordre verrouillé en combat actif. Interface navigateur testée en 320×568, 390×844, 844×390 et 1440×900.

Aucune règle Firebase de production ni donnée de campagne n’est modifiée par cette publication. Le transport des demandes réutilise le type `dice` et les permissions déjà disponibles.
