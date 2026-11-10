# Séparation des sauvegardes — version 20261110.21

Version appliquée au projet après autorisation de l’utilisateur. Base : version 20261110.20, commit 1f75c85. La campagne n’est pas migrée par le déploiement des fichiers : le MJ choisit le moment avec le bouton dédié.

La préparation ne migre pas automatiquement la campagne. Après publication, le MJ dispose d’un bouton « Optimiser les données de la partie » dans le menu des fiches. Tous les écrans devront avoir été rechargés avec une version compatible. Le bouton synchronise les fiches et les notes, prend le verrou de session, attend les accusés de réception, puis déplace atomiquement l’état courant sous une branche active. Les sauvegardes restent à leur adresse actuelle. Les anciens clients ne peuvent plus écrire dans l’ancienne partie ; les nouveaux écrans sont rechargés. L’essai local utilise toujours sa propre base locale.

Deux structures sont prises en charge : ancienne partie non migrée et nouvelle partie. La version des fichiers de sauvegarde ne change pas. Les anciens comptes, héros attribués, inventaires, notes, tokens, cartes, événements et combats sont copiés dans l’état actif. Les présences de connexion et les accusés de réception sont recréés pour éviter les faux clients connectés après le déplacement. Une copie de transition des rôles/profils reste à l’ancienne adresse, inaccessible en écriture avec les anciennes règles ; seule l’identité active fait autorité après migration.

## Mesures locales sur les transactions réelles

| Scénario synthétique | Avant (octets JSON REST/action) | Après |
|---|---:|---:|
| Deux sauvegardes avec 150 000 caractères supplémentaires chacune | 926 511 | 13 848 |
| Deux sauvegardes avec 1 000 000 de caractères supplémentaires chacune | 6 026 511 | 13 848 |

Les requêtes de combat ne transportent plus les archives. La sauvegarde effectue intentionnellement une lecture de l’état actif et une lecture distincte des archives, sous verrou, pour conserver la dernière sauvegarde et la précédente. Corps JSON REST uniquement, hors compression, en-têtes, SDK/WebSocket et médias ; ce n’est pas une mesure du trafic Internet réel ou d’une facture Firebase.

## Validation réalisée dans la copie

- Les 38 suites générales passent sur la version intégrée.
- Migration réelle dans l’émulateur avec quatre écrans JSDOM : refus d’une ancienne version, conservation des notes en cours de saisie, migration atomique, héros attribués conservés et reconnexion.
- Permissions : accès aux notes d’un autre héros refusé ; archives refusées aux joueurs ; anciennes écritures MJ à la racine ou dans l’ancienne carte refusées ; Greg peut écrire ses notes et celles de Bibi, Elo ne peut pas écrire celles de Bibi.
- Tour de combat et résurrection partagée après migration ; archives inchangées par ces actions ; sauvegarde actuelle et précédente conservées ; restauration puis reconnexion ; essai local sans écriture de campagne.
- Deux transactions concurrentes gardent les deux modifications après résolution d’un conflit provoqué, dans les deux profils de mesure migrés.
- Les douze scénarios de lisibilité/ciblage/permissions de combat passent sur cinq écrans simulés avec la structure ancienne compatible ; le test réseau existant passe également.
- Contrôles Edge des menus d’initiative et de résurrection : 390 et 1440 pixels. Médias et navigation réelle entre pages non vérifiés sur plusieurs appareils physiques ; les tests JSDOM recréent les écrans après restauration.

## Ordre d’application

1. Appliquer les fichiers ci-joints au projet, intégrer le test et exécuter les vérifications finales.
2. Déployer les règles compatibles avec les deux structures avant le nouveau client, puis publier et vérifier les fichiers réellement servis.
3. Utiliser une seule fois le bouton MJ au moment choisi. La migration refuse les anciens écrans, une action en cours ou un éditeur de notes non validé. Les notes dans une fiche ouverte sont enregistrées avant de prendre l’instantané.

La modification des permissions a d’abord été refusée par le contrôle automatique. Une copie isolée a été développée et testée, puis l’utilisateur a autorisé explicitement l’application et la publication après explication. Les validations en émulateur ne remplacent pas une observation sur les appareils physiques après activation.
