# Publication du jeu

Chaque envoi sur `main` prépare puis publie une version identifiée par le commit et le numéro `GAME_V`. Le workflow **Publication vérifiée du jeu** ne réussit que lorsque le site public sert la version attendue et les mêmes octets pour les scripts, styles et ressources essentielles contrôlées.

Les fichiers de jeu et médias sont copiés dans `_site`. Les comptes, règles Firebase, outils, tests et dossiers cachés ne font pas partie de ce paquet. `release.json` décrit les empreintes et tailles des fichiers publics, sans donnée de campagne.

Avant publication : incrémenter ensemble `GAME_V` dans `index.html` et le cache de `sw.js`, lancer les tests adaptés au changement, puis envoyer le commit. Le contrôle refuse les versions page/cache différentes et les scripts essentiels manquants.

Vérification locale sans publication :

```
node tests/release.cjs
node tools/release.cjs _site
node tools/verify-release.cjs https://piratebergen.github.io/RPG-CODE/ _site/release.json --wait=240
```

`--all` vérifie également tous les médias : contrôle plus lourd, à réserver à une validation complète. Par défaut les fichiers essentiels et les ressources récentes critiques sont comparés.

Le dossier de sortie doit être vide ou neuf : cela empêche un fichier retiré du jeu de rester dans une publication ultérieure.

Un échec après l’envoi signifie **publication non confirmée**, pas absence certaine d’envoi. Lire l’étape en échec et vérifier le site avant une relance. Ne pas annoncer une mise en ligne sur la seule réussite du transfert. Les données Firebase ne sont jamais restaurées ou modifiées par cette procédure.

Pour republier une version connue : utiliser **Run workflow** sur `main` après un revert explicite du changement de jeu concerné et une nouvelle version de cache, puis attendre la confirmation finale. Ne pas forcer l’historique Git et ne pas restaurer de sauvegarde de campagne pour corriger l’hébergement.
