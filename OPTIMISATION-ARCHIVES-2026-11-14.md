# Lecture des archives au démarrage — version 20261114.6

## Changement

La maintenance du MJ commence par une lecture authentifiée des seuls noms des archives, avec le paramètre REST shallow. Quand les clés sont déjà current et previous, elle ne charge pas le contenu et ne réécrit rien. Les autres noms, dont les anciens dossiers imbriqués, passent toujours par la transaction existante : validation, classement, conservation des deux copies valides les plus récentes et réévaluation en cas de concurrence.

Le mode d'essai local utilise sa base locale, sans requête REST de campagne. Une erreur de permission, une réponse malformée, une déconnexion ou un délai de quinze secondes interrompt la maintenance sans suppression. Le rôle, l'identité et la session sont revérifiés après les attentes. Le délai couvre aussi une récupération de jeton qui ne répond pas.

Les archives déjà nommées current/previous restent validées à leur utilisation. La sauvegarde et l'import choisissent désormais explicitement la dernière copie valide à conserver ; le chargement automatique choisit également une copie valide. Une copie invalide ne remplace donc pas la bonne sauvegarde précédente et ne provoque aucun nettoyage aveugle au démarrage. Le chargement explicite d'une copie invalide reste refusé avant modification de la partie.

Les règles Firebase, les formats de fichiers de sauvegarde et la structure des données de campagne ne changent pas. La publication ne migre pas automatiquement une campagne ancienne.

## Mesures locales

Même protocole à quatre clients et deux tailles d'archives que le diagnostic précédent. Les valeurs suivantes concernent la structure séparée sous active :

| Recréation des quatre clients | Avant | Après |
|---|---:|---:|
| Données du callback saves chez le MJ, petit profil | 153 078 octets | Aucun callback de contenu |
| Données du callback saves chez le MJ, grand profil | 1 003 078 octets | Aucun callback de contenu |
| Réponse REST du contrôle des noms | Aucune | 32 octets |
| Caractères de messages SDK reçus, petit profil | 272 319 | 115 393 |
| Caractères de messages SDK reçus, grand profil | 1 122 315 | 107 975 |

La lecture des noms ajoute une requête REST légère. Les autres lectures de démarrage subsistent. Les compteurs SDK mesurent des caractères JSON, pas des octets facturés ; les octets de callbacks représentent du traitement applicatif. Ne pas additionner ces unités. Les variations hors archives dépendent des présences et tâches de maintenance. Compression, en-têtes, médias et latence Internet ne sont pas mesurés.

Le grand profil reçoit environ 90 % de caractères SDK en moins à la reconnexion. Les archives ne sont toujours pas transmises aux callbacks instrumentés des joueurs. La partie en ligne n'a pas été utilisée pour les mesures.

Rapports : reports/network-profile-2026-11-14.json et reports/network-profile-2026-11-14-optimized.json. Le profil optimisé vérifie aussi que le contrôle REST renvoie moins de 128 octets et qu'aucun contenu saves n'arrive dans les callbacks au démarrage des profils canoniques.

## Vérifications

- Onze scénarios unitaires ciblés : noms normaux, absence d'archives, anciens noms, données invalides, refus serveur, déconnexion, délai pendant le jeton, rôle, session, déclenchements simultanés et sauvegarde concurrente.
- Tests de persistance : copie courante invalide, conservation de la dernière précédente valide et chargement automatique de la dernière copie valide. Le jeu d'essai de base contient maintenant une véritable archive complète pour tester la conservation de deux versions.
- Émulateur local : lecture authentifiée, accès joueur refusé, anciens dossiers, copie invalide, concurrence et sauvegarde après corruption sans perdre la bonne précédente.
- Émulateur de migration : comptes, héros, notes, combat, sauvegarde, restauration, reconnexion et essai isolé.
- Contrôle réseau existant : transactions concurrentes résolues sans perte et confirmations de sauvegarde conservées.

Référence du paramètre shallow : [documentation Firebase](https://firebase.google.com/docs/database/rest/retrieve-data#shallow).
