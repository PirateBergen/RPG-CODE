# Suite de la campagne

## Retours de première session — 15 novembre 2026

Version 20261115.2 : bouton Action rendu accessible en haut à gauche, libellé intégré et zone tactile de 136 × 52 px ; panneau repositionné et testé avec les autres commandes visibles sur quatre tailles. Audit des statistiques dans BILAN-STATS-COMBAT-2026-11-15.md : absence de protection automatique par Défense, Charme non utilisé par le test d'hypnose et Chance sans influence générale sur les jets de combat. Rééquilibrage proposé mais non appliqué ; besoin du journal exporté pour analyser la session réellement jouée.

## Nouvelle partie depuis le menu — 15 novembre 2026

Version 20261115.1 : pour la réinitialisation seulement, synchronisation par compte participant plutôt que par ancien onglet. Les présences anonymes et anciens comptes dont le héros est désormais réservé à un autre compte ne bloquent plus le lancement. Refus maintenu pour un participant sans réponse ; attente par onglet maintenue pour sauvegarder/restaurer/migrer. Voir NOUVELLE-PARTIE-LOBBY-2026-11-15.md.

## Archives au démarrage — 14 novembre 2026

Version 20261114.6 : contrôle authentifié des seuls noms pour les archives current/previous ; maintien de la transaction de nettoyage pour les anciens noms. Validation au chargement et sélection de la dernière copie valide à conserver lors des sauvegardes/imports. Profil à quatre écrans : contrôle d'archives de 32 octets et environ 90 % de caractères SDK reçus en moins à la reconnexion dans le grand profil séparé. Voir OPTIMISATION-ARCHIVES-2026-11-14.md. Prochaine piste : partager l'instantané de combat entre les modules qui le retraitent.

## Diagnostic réseau — 14 novembre 2026

Quatre profils synthétiques sur quatre écrans et émulateur local : repos, carte, attaque, sauvegarde et reconnexion. La séparation des archives maintient les actions à environ 6,3 Ko et 16,5 Ko de corps REST dans les profils testés. La maintenance du démarrage MJ charge encore les archives ; plusieurs modules retraitent aussi la branche combat. Prochaine optimisation proposée : maintenance des archives à la reconnexion. Mesures et limites dans DIAGNOSTIC-RESEAU-2026-11-14.md et reports/network-profile-2026-11-14.json. Aucune modification du jeu publié ou de la campagne.

## Styles du menu Action — 14 novembre 2026

Version 20261114.5 : styles fixes des onglets, états, icône runique et bouton de fiche centralisés, onglet actif piloté par classe. Comparaison Edge sans écart sur quinze configurations à 320, 390 et 1000 px. Cette version regroupe également les extractions carte et menu Action précédentes. Voir NETTOYAGE-STYLES-ACTION-2026-11-14.md.

## Découpage du menu Action — 14 novembre 2026

Version locale 20261114.4 : 25 fonctions et environ 520 lignes extraites vers player-actions.js, avec corps conservés à l'identique. Documents, catalogue des alliés, autorisations, cris, runes et fiche couverts par douze scénarios d'interface et des contrôles Edge à 320, 390 et 1000 px. Voir NETTOYAGE-MENU-ACTION-2026-11-14.md. Les passes carte et menu restent locales ; suite possible : consolidation des styles.

## Découpage des contrôles de carte — 14 novembre 2026

Version locale 20261114.3 : contrôles de pions, caméra souris/tactile et changement de carte MJ extraits vers map-controls.js, sans modification de leurs gestionnaires. Chargement et cache adaptés ; 39 suites locales et contrôles Edge souris/tactile réussis. Voir NETTOYAGE-CARTE-2026-11-14.md. Prochain groupe possible : menu Action des joueurs.

## Nettoyage des animations — 14 novembre 2026

Version 20261114.2 : portées d'annulation communes pour les spéciales des héros/monstres, Pika, l'essaim, les voix de pouvoir et de portrait, et la fin de session. Délais, sons et écouteurs sont arrêtés ensemble ; relances et changements de carte couverts par des tests ciblés. Voir NETTOYAGE-ANIMATIONS-2026-11-14.md. Le découpage général des gros fichiers et les mesures réseau restent à poursuivre.

## À rappeler quand on cherche la prochaine amélioration

- Reprendre le combat du **Roi**, boss final, pour en faire une rencontre aboutie : phases, rythme, attaques annoncées, possibilités de réponse et mise en scène. Demande du joueur du 8 novembre 2026. La conception détaillée est volontairement reportée.
- En attendant, le Roi et le Balrog sont des world boss : deux actions par tour, niveau du groupe +6, résistance à l’hypnose et préparation des spéciales selon les règles communes. Le Roi reçoit environ 20 % de PV supplémentaires et 10 % de dégâts supplémentaires par rapport à son profil world boss standard.

## Épée du Balrog

Implémentée dans la version 20261109.20 : découverte partagée après retour de victoire, récupération unique par Greg pour Greg ou Bibi, poids 15, équipement et transferts, sauvegarde. Bonus évolutif : Force = bonus de l’épée d’armurerie au niveau de Greg +2 ; Défense +1, puis +2 au niveau 10, +3 au niveau 20. Les statistiques de base ne sont pas modifiées.

Contre le Roi : lueur bleutée partagée à l’entrée du combat si équipée ; une attaque physique de Greg réussie réduit de 15 % la prochaine attaque du Roi, 25 % sur critique. Le meilleur effet est conservé sans cumul, puis consommé.

## Audit du 9 novembre — suite

Corrigé en 20261109.23 : annulation des animations et délais après nettoyage ou retour de combat ; attaques propres au PNJ Elo ; tests de l'ancienne intervention remplacés par les états et PV MJ actuels ; aperçus des 9 pouvoirs alliés avec arrêt manuel, sans écriture de partie.

Chantiers distincts restant à concevoir : garantir les champs calculés des fiches sans supprimer les éditions manuelles voulues ; mesurer et réduire les échanges sur la racine complète pour les longues campagnes ; concevoir les phases du Roi final. Ces points ne sont pas annoncés comme corrigés.

## Réseau — 10 novembre

Les contrôles automatiques sans effet utilisent les abonnements locaux avant de solliciter une transaction : huit éditions ordinaires passent de 16 à 0 lectures REST de la racine dans le scénario de test. Les modifications effectives restent recalculées sur la base serveur. Les écritures simples utilisent une réponse sans recopie, et la sauvegarde réutilise les archives de son instantané complet unique. La séparation structurelle des sauvegardes et de la partie active reste à concevoir ; les actions complexes utilisent toujours une transaction globale avec contrôle de version.

## Découpage progressif — raccourcis

Première extraction de game.js et ui.js : raccourcis et aide dans shortcuts.js, fonctions déplacées sans changement. Installation du clavier conservée à sa position de démarrage ; chargement et cache vérifiés. Les fenêtres et les mécanismes de jeu restent leurs propres responsables.

## Priorités CSS — 10 novembre

114 priorités redondantes retirées (479 → 365), sans ajouter de spécificité artificielle. Styles calculés identiques dans 30 configurations contrôlées. Les priorités non couvertes ou nécessaires à la visibilité, aux interactions et aux transitions restent conservées. Voir STYLES-PRIORITES-2026-11-10.md.

## Menus — regroupement des styles

51 blocs dispersés regroupés en 33 blocs de base ; 20 priorités dupliquées retirées, total 345. Comparaison finale identique sur 35 configurations de menus. Adaptations mobiles, restrictions de rôle et exception du menu Action conservées. Voir MENUS-STYLES-2026-11-10.md.

## Fiches et inventaire — styles

Bases, jauges, animations, formulaire et adaptations mobiles regroupés. Onze styles fixes retirés du HTML/JS et centralisés dans le CSS ; valeurs effectives et coordonnées des champs conservées. Comparaison identique sur 30 configurations. Voir FICHES-STYLES-2026-11-10.md.

## Prochaine étape après l’événement de l’Antre

Reprendre le nettoyage des styles de l’écran de combat : regrouper HUD, panneaux d’attaques, initiative, états et notifications ; retirer les doublons après comparaison avant/après sur ordinateur et mobile. Les menus, fiches et inventaires ont déjà été traités.

Événement de l’Antre implémenté : première défaite collective world boss → antre.jpg, une seule fois dans l’état de partie sauvegardé. PV maximum pour Greg, Pika, Elo et Bibi ; marque narrative uniquement ; toute sortie, dont trou.jpg, termine cet état. Cinématique partagée et sauvegarde/reconnexion couvertes par les tests. Voir ANTRE-PREMIERE-DEFAITE-2026-11-10.md.

## Don de la Gardienne — Immortalité quantique

Acquis une fois à la sortie de l’Antre, affiché comme état permanent dans les fiches et conservé dans la sauvegarde. Les KO restent possibles ; à la fin de tout combat, seuls les bénéficiaires KO retrouvent leurs PV maximum. Sans le don, une mort ordinaire reste un KO au retour. La Gardienne en tant que PNJ sera ajoutée ultérieurement. Voir IMMORTALITE-QUANTIQUE-2026-11-10.md. La reprise prévue du nettoyage concerne toujours les styles de combat.

- Gardienne : portrait reçu et intégré au PNJ Autres et à son invocation ; ancien nom d’image conservé pour les sauvegardes.

## Nettoyage des styles de combat — terminé

Version 20261110.19 : bases HUD/attaques/états/initiative regroupées, 21 styles fixes d’initiative centralisés. Comparaison sans écart sur 30 configurations MJ/joueur et cinq tailles. Voir COMBAT-STYLES-2026-11-10.md. Prochaine passe possible : styles dynamiques des cartes d’initiative et panneaux de monstres ; mesures réseau des actions complexes restent un chantier distinct.

## États dynamiques du combat — nettoyés

Version 20261110.20 : treize assemblages de styles déplacés vers le CSS (initiative, recharges, spéciales MJ/joueurs et couleur des PV). Comparaison identique sur 36 configurations. Voir COMBAT-ETATS-STYLES-2026-11-10.md. Prochaine étape : mesurer le coût des échanges des actions complexes pour les campagnes longues, avant de modifier leur architecture.

## Séparation des sauvegardes — version 20261110.21

Adaptateur compatible avec les anciennes parties et les nouvelles parties sous active. Les archives restent sous saves. Bouton MJ « Optimiser les données de la partie » dans les fiches : migration volontaire, atomique, après synchronisation des fiches et contrôle des versions des écrans. Les notes ouvertes sont conservées ; les présences sont recréées. Le mode test reste local. Le déploiement du code ne migre pas la campagne : le MJ choisit le moment du déplacement.

Mesures synthétiques : 926 511 ou 6 026 511 octets JSON REST par action avant séparation, 13 848 après dans les mêmes profils migrés. Voir SEPARATION-SAUVÉGARDES-2026-11-10.md et tests/firebase-storage-migration.cjs. Suite : contrôler le comportement après activation réelle, puis mesurer les réponses aux transactions et les abonnements avant toute nouvelle optimisation.
