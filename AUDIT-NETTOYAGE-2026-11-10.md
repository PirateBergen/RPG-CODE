# Passe de nettoyage — 10 novembre 2026

## Changements effectués

- Suppression de 14 fonctions sans appel dans les scripts et commandes HTML du jeu : anciens accès MJ et menu joueur, ancien affichage PV, ancien cache de sauvegarde, ancienne fiche MJ, anciens enregistrements de jauges, ancien lecteur d’allié, zoom désactivé, anciennes fonctions de volume, suppression d’élément wanted, suppression générique de nœud et ancien scanner d’images.
- Suppression du moteur de prévision, réécriture et interception des attaques de l’ancien menu Intervenir. Les commandes retirées sont désormais refusées, aussi pour le MJ. Les attaques utilisent le chemin normal et les états/PV MJ actuels. La migration nettoyant les anciennes préparations reste en place.
- Suppression des styles du menu séparé d’invocation hors combat, remplacé par le menu Alliés.
- Suppression de deux gestionnaires globaux qui rendaient le focus à la page après les clics, y compris sur les boutons, listes et textes éditables. Un test Edge reproduit ce parcours avec les vrais gestionnaires du jeu.
- Tests renforcés : toutes les anciennes commandes sont refusées pour MJ et joueur ; les tests ne se servent plus de fonctions mortes comme délimiteurs de source.

## Portée des contrôles

Inspection des 34 fichiers JavaScript à la racine, des commandes HTML et du style. Analyse syntaxique des scripts, références des fonctions supprimées, clés d’objet en double et identifiants HTML en double. Aucun doublon de clé ou d’identifiant trouvé dans cette analyse.

Les suppressions ne touchent ni aux images/sons ni aux sauvegardes de campagne. Les scénarios Firebase utilisent un émulateur local, avec des sessions DOM distinctes ; les sons y sont simulés. Les contrôles Edge couvrent des parcours ciblés, pas une campagne complète avec plusieurs appareils physiques. La réussite des tests ne prouve pas l’absence de tout bug.

Les wrappers encore testés et les migrations d’anciennes sauvegardes sont conservés. L’absence d’appel détecté dans une recherche textuelle ne justifie pas à elle seule la suppression d’une API de compatibilité.

## Améliorations recommandées

1. **Poursuivre le découpage de game.js et ui.js** : déplacer ensuite les contrôles de carte et les menus en modules cohérents. Le premier découpage des raccourcis est déjà fait ; il reste beaucoup de responsabilités mêlées.
2. **Réduire les conflits de style** : la feuille contient encore 479 occurrences de `!important`. Consolider composant par composant, avec comparaison visuelle, avant de supprimer les anciennes règles. Une purge automatique risquerait les styles dynamiques.
3. **Séparer les archives de la partie active** : les écritures complexes utilisent encore une transaction sur la racine qui contient les sauvegardes. Les optimisations récentes réduisent des lectures inutiles, sans résoudre cette structure.
4. **Tracer les conséquences des malédictions** : les anciennes pertes de caractéristiques ou d’objet ne sont pas toutes enregistrées comme effets réversibles. Une bénédiction efface les jauges, la roue et l’effet actif, mais ne doit pas inventer les valeurs précédentes. Un journal d’effets permettrait une restauration précise à l’avenir.
5. **Durcir les données calculées** : les éditions manuelles voulues par le MJ doivent rester possibles, tout en distinguant les données libres des calculs du moteur. Cela nécessite une conception de permissions, pas une suppression de fonctions.
6. **Optimiser les médias séparément** : une image peu référencée peut être utilisée via les menus ou les sauvegardes. Aucun média n’est supprimé sur la seule base d’une recherche de nom.

Le combat final du Roi reste un chantier de conception distinct, déjà conservé dans la feuille de route.
