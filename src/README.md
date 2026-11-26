# Sources du jeu

Les fichiers de ce dossier sont les sources à modifier. Les fichiers JavaScript et `style.css` à la racine sont des **assemblages générés**, conservés pour la compatibilité du jeu, des sauvegardes, des outils de test et des caches déjà déployés.

| Dossier | Responsabilité |
|---|---|
| `campaigns/prophetie-des-mouches/` | Personnages, bestiaire, capacités, objets, dialogues, événements et présentations propres à cette campagne. |
| `engine/` | Calculs, progression, inventaire, résolution des actions, tours, effets et règles communes. |
| `interface/` | Menus, fiches, panneaux MJ/joueur, choix des cibles et des dés, styles d’interface. |
| `presentation/` | Animations, dés, audio, effets visuels et gestion de leur durée de vie. |
| `runtime/` | Coordination des sessions, synchronisation des personnages/cartes et échanges d’actions. |
| `platform/` | Connexion Firebase, accès, sauvegardes, fiabilité réseau, tests locaux et service worker. |

`source-map.json` décrit explicitement les fragments de chaque fichier public et leur ordre d’assemblage. Les fragments sont des scripts classiques partageant les variables existantes : ce ne sont pas encore des modules ES à charger indépendamment. L’assemblage conserve intégralement l’ordre du code et des styles, y compris les surcharges CSS.

Deux petits fichiers `runtime/session/bootstrap.open.jsfrag` et `bootstrap.close.jsfrag` conservent l’enveloppe historique d’initialisation `DOMContentLoaded`. Les fonctions et abonnements assemblés entre eux gardent leur portée locale d’origine. Cette enveloppe explicite évite de changer la portée des variables pendant le rangement ; les autres sources JavaScript sont syntaxiquement complètes.

## Modifier le jeu

1. Repérer le fichier source dans `source-map.json`, puis modifier celui-ci.
2. Exécuter `node tools/build-source.cjs` depuis la racine.
3. Vérifier avec `node tools/build-source.cjs --check` et les tests adaptés.
4. Pour publier, mettre à jour `GAME_V` dans `index.html` et `CACHE` dans `src/platform/service-worker.js`, réassembler et suivre `PUBLICATION.md`.

La publication refuse des assemblages désynchronisés. Les sources ne sont pas copiées sur le site : le navigateur continue de charger les mêmes fichiers publics et les médias conservent leurs URL.

## Ajouter ou déplacer une source

Ajouter son chemin relatif dans la liste du fichier public concerné. Une source JavaScript/CSS doit apparaître exactement une fois dans le manifeste. Les sources oubliées, utilisées deux fois, absentes ou situées hors de `src/` sont refusées.

Les gros fichiers historiques `config.js`, `game.js`, `ui.js`, `combat.js`, `combat-core.js` et `utils.js` sont décomposés par responsabilité. Les modules déjà spécialisés gardent chacun leur propre fichier source dans le dossier correspondant.

## Préparation des futures campagnes

Le dossier de campagne regroupe le contenu actuel et les exceptions narratives identifiées. Cette organisation n’installe ni bibliothèque de campagnes, ni éditeur, ni nouveaux chemins de sauvegarde. Le futur créateur devra définir le contrat de description d’une campagne et remplacer progressivement les dépendances restantes aux identifiants des héros et événements actuels.

Le HTML d’accueil, les médias existants et les chemins de stockage restent compatibles avec la campagne en cours. Le travail de séparation ne lance aucune migration de partie.

La première frontière de contenu est maintenant explicite : `engine/campaigns/definition.js` valide une description sans accès au stockage ; `campaigns/prophetie-des-mouches/definition.js` fournit la campagne active historique. Le moteur construit sa liste de combattants depuis cette fiche. Les statistiques, actions narratives et autres dépendances aux héros restent à découpler progressivement. Aucun sélecteur de campagne ni nouvel espace de sauvegarde n’est activé par cette étape.

La fiche active décrit aussi les catalogues de lieux/musiques et le bestiaire de base. `engine/campaigns/catalogs.js` vérifie leur forme sans accès à la partie ; `legacy-catalogs.js` conserve les anciens noms publics utilisés par le jeu. Les fichiers de campagne fournissent les valeurs historiques. Les clés de cartes, les noms vides, les associations manquantes, les PV et les catégories ne sont pas corrigés ou réinterprétés pendant cette séparation. La référence de comparaison est `reports/campaign-catalogs-baseline-2026-11-26.json`.

Les catalogues d’attaques (héros, spéciales et ennemis), de boutiques et d’alliés sont également rattachés à la fiche. `engine/campaigns/content-catalogs.js` copie les descriptions sérialisables et contrôle leurs références minimales ; il conserve tous les champs particuliers. Les anciens noms publics restent disponibles. Les règles narratives et pouvoirs spécifiques ne sont pas généralisés par cette étape. Comparaison complète avec `reports/campaign-actions-baseline-2026-11-26.json`, y compris textes, nombres et métadonnées.

Les textes d’introduction, visions, dialogues des runes, choix de malédiction et paramètres du cimetière sont maintenant dans `story`. Les branchements de règles exécutables restent du code de confiance séparé : `engine/campaigns/rules.js` définit les points communs, et `campaigns/prophetie-des-mouches/rules/adapters.js` raccorde la marque de Hel et les bonus de l’épée. Le contenu sérialisable ne peut pas fournir de fonctions. Les PV maximum et bonus d’équipement sont comparés à `reports/campaign-story-rules-baseline-2026-11-26.json`. Les autres mécaniques narratives restent à découpler progressivement.

## Vers le créateur partagé

- Une définition de campagne décrit son contenu et ses statistiques de départ ; elle ne contient ni comptes, ni permissions, ni progression de partie.
- Les brouillons du créateur devront vivre dans un espace local distinct et être modifiés par copie, sans écrire dans la partie active.
- Les parties jouées devront avoir des espaces et permissions distincts par MJ/groupe avant toute ouverture publique multijoueur. Aucun changement de stockage de la Prophétie n’est activé ici.
- `engine/campaigns/draft-format.js` prépare uniquement un échange JSON versionné de brouillons avec références aux médias. Ce n’est pas une archive complète jouable : les médias, règles compatibles et éléments narratifs restants devront être pris en charge pour l’export/import final.
- Les statistiques de départ et le partage de tour héros/compagnon utilisent la fiche ; leur comportement historique est comparé à `reports/campaign-characters-baseline-2026-11-26.json`. Les autres dépendances narratives du moteur restent à isoler.

L’objectif confirmé est un site commun permettant à plusieurs MJ de créer et jouer leurs campagnes. Deux échanges finaux distincts sont prévus : une campagne réutilisable avec ses médias et règles compatibles, et une sauvegarde de partie avec sa progression. Le format de brouillon actuel ne remplace aucun de ces deux exports complets. Le premier éditeur peut être développé en espace local séparé ; le lancement public de parties multiples attend l’isolation des espaces et des permissions par groupe.

## Premier atelier local

`campagnes.html` est une entrée autonome : elle charge uniquement le catalogue `config.js` et `campaign-editor.js`, sans Firebase, authentification ni démarrage du jeu. Sa politique de sécurité interdit les connexions. Le formulaire modifie le titre et la description ; les autres catalogues sont conservés par copie. Il peut créer un brouillon minimal, copier le modèle historique sans progression, importer et exporter le format de brouillon existant. Les médias ne sont pas inclus.

`platform/storage/draft-store.js` utilise exclusivement `rpg-campaign-editor:v1:draft:<identifiant-local>`. L’identifiant local est distinct de celui du contenu : deux imports de la même campagne restent deux brouillons. Les révisions empêchent un onglet ancien d’écraser un enregistrement plus récent ; les entrées illisibles sont conservées. Les brouillons restent propres au navigateur, sans compte ni synchronisation. Les sauvegardes de partie ne sont pas lues ou écrites. Aucun bouton de lancement ou remplacement de campagne n’est proposé. Vérification dédiée : `node tests/campaign-editor-browser.cjs`.

L’atelier privilégie maintenant une campagne neuve ; copier le modèle historique est une option repliée. `interface/editor/characters.js` permet d’ajouter des héros, de modifier noms, sept statistiques de départ et statistique principale, et de retirer des héros indépendants en conservant au moins un héros. L’application d’une fiche garde son identifiant, portrait, type et propriétaire éventuel. Une annulation n’ajoute pas de héros. Les personnages liés à des attaques, compagnons, événements ou règles narratives ne sont pas supprimables avant l’édition de ces dépendances. Les valeurs proposées pour les nouveaux héros sont des points de départ personnalisables, sans promesse d’équilibrage ni lancement de partie. Les modèles copiés et les anciens brouillons sans statistiques restent ouvrables ; les catalogues non édités sont conservés. Les médias restent une étape ultérieure.
