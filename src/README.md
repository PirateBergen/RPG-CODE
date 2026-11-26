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

Les fiches de brouillon acceptent désormais `race`, `class`, `alignment`, `customInfo` (30 couples intitulé/contenu maximum), et `appearance` (portrait et vue en pied facultatifs). Ces champs sont absents de la définition historique tant qu’ils ne sont pas fournis : aucune donnée active n’est migrée. Race et classe sont libres ; l’alignement propose les neuf choix classiques sans bonus mécanique. `character-profile.js` décode uniquement les fichiers locaux PNG/JPEG/WebP, limite leur taille, les réduit sans recadrage et les encode en JPEG (fond sombre pour la transparence). Deux images indépendantes de 400 000 caractères maximum sont intégrées par personnage ; le portrait historique reste conservé séparément. Les images des fiches voyagent dans le format de brouillon avec `media: references-and-portraits` ; les anciens fichiers `references` restent acceptés, les autres médias ne sont toujours pas embarqués. La limite totale d’export reste 8 Mo. Aucun accès réseau n’est ajouté. En cas de quota local atteint, la fiche reste exportable et l’ancien enregistrement n’est pas effacé.

`interface/editor/locations.js` prépare les décors indépendants via le champ facultatif `locations` : identifiant stable `lieu-…`, nom (120 caractères), type, description et notes MJ (5 000 caractères chacune), 200 lieux maximum. Création, modification et suppression sont appliquées au brouillon seulement après validation de la fiche ; Échap/Annuler ne modifient rien. L’enregistrement et le format d’échange existants conservent ces lieux. Les notes restent dans le fichier destiné au créateur/MJ, pas dans le résumé visible de la bibliothèque ; le brouillon complet n’est pas un document pour les joueurs. Aucune visibilité multijoueur n’est implémentée ici. Les anciennes tables `world.names` et `world.music` ne sont pas transformées : les cartes du modèle sont présentées séparément en lecture seule. L’édition des cartes, les musiques, les connexions entre lieux et les rencontres sont des étapes ultérieures.

Chaque lieu peut désormais porter un `background` JPEG embarqué (1 200 000 caractères maximum). Le convertisseur local partagé `readDraftImage` garde les proportions, accepte PNG/JPEG/WebP de 10 Mo maximum et réduit les fonds à 1 920 pixels au plus ; les portraits gardent leur réglage précédent (900 pixels). Une génération de fenêtre et un numéro de sélection empêchent une lecture tardive de remplacer une sélection plus récente ou un autre lieu. Retirer/remplacer un fond reste en attente jusqu’à « Appliquer au lieu » puis l’enregistrement du brouillon. L’aperçu du lieu, accessible depuis sa fiche ou sa carte dans l’atelier, montre le fond en entier avec titre et description, jamais les notes MJ. Échap ferme seulement l’aperçu du dessus. Les anciens lieux sans fond restent valides et la définition historique reste inchangée. L’export annonce `references-and-images` quand des fonds sont embarqués et accepte toujours les deux marqueurs précédents ; plafond total inchangé à 8 Mo. Aucun écran de jeu ni chemin de carte historique n’est modifié : l’aperçu est propre au créateur, en attendant le lancement de nouvelles campagnes.

## Capacités du brouillon et essais visuels

Chaque personnage peut avoir une liste facultative `abilities`, indépendante du catalogue historique `attacks`. `engine/campaigns/abilities.js` valide les identifiants, catégories normale/spéciale, dé, statistique, cible, fourchette de puissance, recharge, utilisations et effet secondaire (réduction/augmentation des dégâts en pourcentage, poison en PV/tour ou étourdissement). L’effet porte une durée en tours. Le nombre de capacités n’a pas de plafond arbitraire ; les limites de stockage du navigateur et d’export (8 Mo) s’appliquent. Les champs inconnus sont exclus. Les définitions actives sans `abilities` ne reçoivent aucun champ ajouté ni aucune migration.

`interface/editor/abilities.js` fournit les deux listes par personnage et les fenêtres de création/modification/test. Neuf animations CSS isolées de l’interface de jeu sont disponibles : entaille, projectile, flammes, givre, éclair, halo de soin, bouclier, brume et nuée. Couleur et intensité sont personnalisables. Les spéciales peuvent embarquer une image PNG transparente (JPEG également accepté à l’import), réduite à 1 200 pixels/600 000 caractères maximum. Le lecteur partagé conserve désormais la transparence uniquement lorsqu’elle est demandée pour une spéciale ; portraits et fonds gardent leur comportement précédent. Les images de spéciales entraînent le marqueur d’échange `references-and-images`.

Le test visuel montre un décor du brouillon s’il existe, deux cibles fictives, l’effet et l’image éventuelle ; il est silencieux et n’écrit aucune donnée de combat. Le bouton Rejouer remplace l’animation précédente ; fermer l’aperçu nettoie les éléments, le minuteur et le rappel. Les réglages de mouvement réduit sont respectés. Échap ferme la fenêtre supérieure, sans appliquer la fiche. Les règles sont préparées comme contenu : leur résolution en combat, les sons et la conversion des attaques historiques restent des étapes futures. Les capacités historiques des modèles sont conservées et signalées en lecture seule. Tests : `campaign-drafts.cjs`, `campaign-editor-browser.cjs` et son parcours `editor-abilities-browser.cjs`.

Les capacités acceptent maintenant deux champs facultatifs : `announcement` (`auto`, `custom` ou `none`, texte jusqu’à 1 000 caractères) et `progression` (paliers à niveaux distincts de 2 à 1 000). Sans champ d’annonce, l’aperçu utilise « Personnage lance Attaque ! ». Les repères `{personnage}` et `{attaque}` du texte personnalisé sont remplacés littéralement et affichés avec `textContent` ; un texte personnalisé vide utilise l’annonce automatique. L’annonce reste visible après la fin de l’animation jusqu’à fermeture du test, et n’est pas incluse dans les éléments animés nettoyés après 2,4 secondes.

Chaque palier donne une puissance minimum/maximum absolue et une intensité visuelle. `resolveCampaignAbilityLevel` retient le dernier palier atteint sans cumul et sans modifier la définition d’origine. Dé, statistique associée, effets en pourcentage, durée, recharge et utilisations restent inchangés. Le niveau de comparaison (1 à 1 000) est propre à l’aperçu, n’est pas enregistré comme niveau réel du héros et ne change aucune progression de partie. Les statistiques du héros ne sont pas automatiquement augmentées dans cette étape ; leur courbe de progression reste à préparer séparément. Les anciens brouillons sans palier gardent leur puissance fixe. L’interface compacte l’annonce et la comparaison, avec disposition dédiée aux écrans bas en paysage. Les deux nouveaux champs sont conservés dans l’enregistrement et l’export/import.
