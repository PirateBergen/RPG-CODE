# Nettoyage des animations et des sons — 14 novembre 2026

Version 20261114.2.

## Changements

- Les présentations inscrivent leurs délais, intervalles, images, sons, images d'animation et écouteurs clavier dans une portée annulable commune. Le nettoyage global annule les portées actives, sans liste manuelle à maintenir pour chaque nouvel effet.
- Une portée annulée ne peut plus programmer de travail. La remplacer annule ses anciens rappels et ses écouteurs sans interrompre sa remplaçante.
- Endikaki, les effets courts de Pika, les spéciales des héros et celles des monstres utilisent ce mécanisme. Les voix des spéciales ordinaires sont désormais arrêtées aussi hors aperçu.
- L'essaim utilise la même portée pour son apparition et sa disparition. Un départ de la carte annule aussi le message différé et les variations de volume. Une relance pendant sa disparition repart avec une nouvelle portée.
- Les deux chemins de lecture des voix de pouvoir partagent une fonction, avec conservation de leurs fondus respectifs. Les voix des portraits sont arrêtées à leur fermeture ou remplacement.
- La fin de session partage sa présentation entre MJ et joueurs. Une relance retire l'ancien écouteur clavier ; un nettoyage avant les 3,7 secondes empêche l'apparition tardive des images.
- Les effets d'ambiance concernés sont arrêtés lors d'un changement effectif de carte. Une bénédiction encore en attente n'est pas jouée si sa carte a changé.

## Vérification

Les 38 suites locales ont réussi pendant cette passe. Après les derniers ajustements, les suites de présentation, cycle de vie, exploration et modules ont été repassées avec succès. Les tests ajoutés couvrent annulation et remplacement de portée, rappels tardifs, touches, essaim interrompu et relancé, spéciales des héros et monstres, Endikaki, voix de pouvoir, bénédiction en attente et fin de session répétée.

Les contrôles Edge ciblés passent pour la bénédiction, la transparence de la Gardienne, les images de fin de session et Endikaki sur trois tailles d'écran, avec vérification de l'ordre des sons. Ces tests locaux ne remplacent pas un essai complet sur plusieurs appareils connectés. Aucun déploiement ni changement de données de campagne n'a été effectué.

## Suite

Cette passe concerne les présentations ci-dessus. Le découpage général de game.js/ui.js, la consolidation supplémentaire des styles et les mesures réseau en campagne restent des chantiers séparés. D'autres effets anciens conservent leurs mécanismes spécifiques d'annulation.
