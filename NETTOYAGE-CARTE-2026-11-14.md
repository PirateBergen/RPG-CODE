# Découpage des contrôles de carte — 14 novembre 2026

Version locale 20261114.3, non publiée pendant cette passe.

## Périmètre

Les contrôles de carte ont été extraits de game.js vers map-controls.js : changement de carte du MJ, sélection et déplacement des pions, écriture des positions, déplacement de caméra à la souris et au tactile. Environ 180 lignes quittent le fichier principal.

Le nouveau fichier est chargé après game.js et avant les adaptations de session. Il figure dans le cache de la nouvelle version. Les raccourcis clavier restent installés par game.js. Les règles d'exploration et les écritures partagées restent dans leurs modules existants.

Les corps du changement de carte et des gestionnaires déplacés ont été comparés au commit précédent : ils sont identiques. Aucun changement de règle, de présentation ou de donnée de campagne n'est prévu par ce découpage.

## Contrôles

- 39 suites locales réussies.
- Dix scénarios dédiés : grille avec zoom, propriété des pions, KO, surcharge, déconnexion, lecture du personnage arrivée après relâchement, suivi de Bibi, positions des monstres en combat, souris, tactile, caméra et changement de carte réservé au MJ avec ambiance personnalisée.
- Edge : glisser natif à la souris sur un écran de 1000 px et événements tactiles du navigateur sur un écran de 390 px ; positions sur la grille, navigation de caméra et absence d'erreur de script vérifiées.
- Chargement unique, ordre des scripts, syntaxe combinée et présence dans le cache vérifiés.

Ces contrôles utilisent des écritures simulées et ne modifient aucune partie en ligne. Ils ne constituent pas un essai de campagne complet sur plusieurs appareils physiques.

## Suite

Le menu Action des joueurs reste un prochain groupe cohérent à extraire de game.js. Le nettoyage supplémentaire des styles et les mesures réseau en campagne restent séparés.
