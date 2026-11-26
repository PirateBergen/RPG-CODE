# La Prophétie des Mouches

Ce dossier contient les sources propres à la campagne actuelle :

- `characters/` : personnages, statistiques de départ, attaques, identités et compatibilité historique.
- `enemies/` : bestiaire, attaques, spéciales, faiblesses, catégories et sélection rapide.
- `allies/` : catalogue et capacités des alliés.
- `items/` : objets et contenu des boutiques.
- `world/` : noms des lieux, musiques, état local de l’univers et contrats de recherche.
- `events/` : introduction, livres, runes, visions, folie, cimetière, Antre, Oregon et épée du Balrog.
- `rules/` : exceptions narratives et actions liées aux héros ou alliés de cette histoire.
- `presentation/` : cinématiques, images, sons et effets particuliers.
- `theme/` : styles spécifiques à l’ambiance et aux événements de la campagne.

Les références d’images et de sons conservent leurs valeurs existantes. Aucun fichier média, identifiant de personnage ou contenu de sauvegarde n’est renommé.

Ce dossier est relié aux fichiers publics par `src/source-map.json`. Le copier ne crée pas encore une campagne jouable indépendante : le sélecteur, le contrat de campagne et l’éditeur feront partie de la prochaine étape du projet.

`definition.js` décrit l’identité de cette campagne et ses héros/compagnon, avec leurs identifiants et portraits existants. La référence active reste fixée à cette campagne ; aucune partie ni archive ne change de chemin.

La fiche rattache également les catalogues existants de `world/locations-and-music.js`, `enemies/stats.js` et `enemies/categories.js`. Les règles particulières, attaques et déroulements narratifs restent dans leurs fichiers actuels ; aucun nom de carte ni valeur de combat n’est modifié.

Les fichiers d’attaques des personnages et ennemis, le catalogue de boutiques et celui des alliés alimentent la fiche active. Ils conservent leurs données et identifiants historiques ; les anciennes variables sont fournies par l’adaptateur partagé. Les résolutions de combat et les exceptions narratives restent inchangées.

`story` rattache les textes et réglages d’événements existants. `rules/adapters.js` garde les effets de Hel et de l’épée du Balrog dans cette histoire ; leurs permissions, formules et états sauvegardés ne changent pas. Les correctifs de contenu historiques propres aux personnages sont séparés du calcul partagé du poids d’inventaire.

Les statistiques de départ et statistiques principales sont rattachées aux personnages de la fiche. Greg et Bibi continuent de partager un tour ; Pika conserve son identifiant historique `ju`. L’échange de brouillons ne constitue pas encore l’export complet de cette histoire jouable et ne contient aucune progression de partie.
