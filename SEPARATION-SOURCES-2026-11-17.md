# Séparation des sources — version 20261117.1

## Résultat

Les 41 scripts JavaScript et la feuille de styles sont désormais assemblés à partir de **208 fichiers sources** rangés dans six familles : campagne, moteur, interface, présentation, synchronisation et infrastructure. Les six gros fichiers historiques ont été décomposés par responsabilité ; les modules déjà spécialisés sont conservés comme unités distinctes.

Les données de campagne ont été sorties du mélange historique de `config.js` : personnages, ennemis, attaques, alliés, objets, lieux, musiques, dialogues, runes et autres événements. Les calculs de progression, équipement, poids, équilibre et dégâts sont rangés dans le moteur. Les règles propres aux personnages actuels et les exceptions narratives sont identifiées dans le dossier de campagne.

Les panneaux de combat, choix des cibles, menus, fiches, fenêtres d’authentification, journaux, présentations des attaques et sons sont également regroupés par fonction. Les styles sont séparés en 23 fragments dont l’ordre de cascade reste explicite.

## Conservation du jeu en cours

L’assemblage reproduit exactement le corps des fichiers de la version `56c872704692c07749c6379bb627b489f31ca13b`, après normalisation des fins de ligne. Le seul ajout commun est un commentaire indiquant leur origine. Le service worker change uniquement son numéro de cache ; `index.html` change uniquement `GAME_V`.

Les fonctions, constantes, valeurs de règles, ordre d’exécution, abonnements Firebase, chemins de données, formats de sauvegarde, clés d’archives, identifiants, interfaces et références de médias sont conservés. Il n’y a ni import dynamique ni nouveau fichier à charger par le navigateur. Aucun appel au stockage réel d’une campagne n’est effectué par les outils de séparation.

Le rapport `reports/source-separation-2026-11-17.json` donne les empreintes avant/après de chaque point d’entrée. Les 41 fichiers de règles/interface/styles hors cache sont identiques ; la différence du service worker est limitée à la version de cache.

## Maintenance et publication

Les sources à modifier sont dans `src/`, et la table d’assemblage dans `src/source-map.json`. `node tools/build-source.cjs` régénère les fichiers publics ; `--check` détecte une désynchronisation sans écrire.

La publication vérifie cette correspondance avant de préparer le site. Le contrôle est aussi ajouté au workflow de publication et à une nouvelle suite de tests. Il refuse les sources manquantes, oubliées ou en double, les sorties invalides et les chemins hors du dossier autorisé. Les sources et outils restent exclus du paquet publié.

Les tests existants peuvent continuer à utiliser les anciens noms de fichiers. Cette compatibilité évite de changer simultanément la structure du code et les conditions de son exécution.

Une enveloppe historique `DOMContentLoaded` est conservée par deux fragments d’ouverture/fermeture `.jsfrag` explicites. Les sources assemblées à l’intérieur gardent exactement leur portée et leur cycle d’initialisation. Les autres sources JavaScript sont syntaxiquement complètes ; il n’y a pas d’extraction de fonctions vers un nouveau contexte d’exécution.

Validation : **45 suites unitaires**, dont sept contrôles d’architecture ; **21 scénarios multijoueurs locaux à cinq sessions** (neuf sur sauvegarde/rechargement, sept sur réactions, cinq sur les types de dés) ; trois suites navigateur sur quatre tailles d’écran chacune pour les dés, réactions et menus Action. Les tests n’accèdent qu’à l’émulateur Firebase local.

## Limite de cette étape

Cette séparation prépare le créateur de campagnes sans introduire celui-ci. Les anciens identifiants restent utilisés par les règles et les écrans de cette campagne. Une prochaine évolution devra définir une description de campagne, son choix à l’accueil, son stockage séparé et ses outils d’édition. Le dossier de campagne rend ce contenu repérable ; son simple duplicata n’est pas encore un bouton « Créer une campagne ».
