# Diagnostic réseau — 14 novembre 2026

Version mesurée : 20261114.5. Aucun code du jeu, règle d'accès ou état de campagne en ligne n'a été modifié.

## Protocole et limites

Quatre écrans JSDOM exécutent les vrais scripts contre l'émulateur Realtime Database local sur 127.0.0.1:9005, avec les règles du projet. Identités et données sont fictives. Deux structures sont comparées : ancienne racine comprenant les archives et partie active séparée sous active. Chaque profil contient deux archives enrichies de 150 000 ou de 1 000 000 de caractères chacune.

Parcours : repos, changement de carte, attaque de Greg résolue par le MJ, sauvegarde avec accusés de réception, destruction et recréation des quatre clients. La reconnexion intervient après sauvegarde : la nouvelle sauvegarde courante ne contient pas le remplissage synthétique, tandis que la précédente le conserve.

Les mesures restent distinctes :

- **REST** : octets UTF-8 envoyés et réponses JSON complètes. La sonde clone les réponses, y compris celles que le jeu annulerait après confirmation. Ces résultats décrivent les corps produits par le serveur, pas les octets réellement téléchargés par un navigateur qui annule une réponse.
- **SDK** : compteurs internes Firebase de caractères de messages JSON, pas d'octets réseau. Une collection de compteurs partagée n'est comptée qu'une fois. Ce mécanisme dépend de la version du SDK des tests.
- **Callbacks** : octets JSON remis aux abonnements on, par chemin et client. Ils représentent du travail applicatif, avec chevauchements possibles ; ne pas les additionner au transport. Les lectures once et traitements internes ne sont pas tous représentés.

Compression, en-têtes, TLS, médias, latence Internet et facturation Firebase ne sont pas mesurés. Aucune conclusion de temps de réponse réel n'est déduite.

## Corps JSON REST

Somme des corps envoyés et des réponses complètes, en octets, pour quatre écrans :

| Parcours | Ancienne structure, archives de 150 000 caractères | Structure séparée, mêmes archives | Ancienne structure, archives de 1 000 000 de caractères | Structure séparée, mêmes archives |
|---|---:|---:|---:|---:|
| Repos de 10 secondes simulées | 0 | 0 | 0 | 0 |
| Changement de carte et conséquences | 912 567 | 6 276 | 6 012 567 | 6 276 |
| Attaque de Greg et résolution | 922 770 | 16 479 | 6 022 770 | 16 479 |
| Sauvegarde, partie REST seulement | 153 137 | 153 137 | 1 003 137 | 1 003 137 |
| Recréation des quatre clients, REST seulement | 623 593 | 12 027 | 4 023 539 | 11 067 |

Les petites variations de reconnexion dépendent des présences, horodatages et requêtes de maintenance. Ce tableau n'inclut pas le SDK : sauvegarde et reconnexion ne doivent pas être évaluées avec le REST seul.

## Conclusions et priorités

1. **La séparation déjà programmée fonctionne dans ces tests.** Les grosses archives ne font pas grossir les transactions de carte ou d'attaque sous active. Leur volume REST reste inférieur à 50 000 octets par parcours. Cela ne prouve pas que la vraie campagne est migrée : aucun état en ligne n'a été consulté.
2. **Aucun échange observé au repos pendant dix secondes simulées.** Les maintenances espacées d'une minute ou davantage et les connexions instables ne sont pas couvertes par ce constat.
3. **Le démarrage du MJ charge encore les archives.** Après la sauvegarde du grand profil, le callback saves reçoit 1 003 078 octets de JSON sans ouverture du menu. Il provient de trimSaveHistory dans reliability.js, qui charge et valide les archives pour conserver les deux sauvegardes. C'est un abonnement temporaire de maintenance. Les callbacks instrumentés des joueurs ne reçoivent pas les archives.
4. **Plusieurs modules retraitent combat.** L'attaque observée déclenche quatre callbacks de valeur combat chez le MJ et trois chez chaque joueur, soit 45 253 octets cumulés de travail sur cette branche. Cela ne prouve pas autant de téléchargements : le SDK peut mutualiser les écoutes d'un même chemin.
5. **La sauvegarde conserve volontairement la précédente.** Le grand profil envoie un corps REST de 1 003 137 octets et reçoit environ deux millions de caractères par le SDK pendant ce parcours. Supprimer cette conservation ne serait pas une optimisation acceptable.

Prochaine optimisation proposée : limiter les lectures d'archives au démarrage quand aucun nettoyage n'est nécessaire, avec des tests sur les anciens formats, les archives invalides et les opérations concurrentes. Ensuite, partager l'instantané de combat pour réduire les traitements répétés ; tout gain réseau devra être mesuré séparément.

## Reproduction et validation

Avec uniquement l'émulateur local démarré :

```powershell
$env:FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9005'
node tests/firebase-network-profile.cjs
node tests/firebase-network-efficiency.cjs
```

Les quatre profils, l'attaque, la sauvegarde et la recréation des écrans réussissent. Les invariants valident la stabilité des volumes migrés et l'absence d'archives dans les callbacks joueurs. Le contrôle réseau existant passe également : conflit concurrent résolu sans perte et absence de relecture de racine lors de huit éditions ordinaires.

Données : reports/network-profile-2026-11-14.json. Le rapport brut contient des métriques et chemins synthétiques, sans jeton ni contenu de campagne. Les outils locaux sont dans _site, ignoré et exclu de la publication.
