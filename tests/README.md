# Vérifications RPG

Les tests access.cjs, persistence.cjs et combat.cjs utilisent Node sans dépendances.

Pour les présentations : npm install --prefix tests puis node tests/presentation.cjs.
Les tests firebase-combat.cjs et firebase-presentation.cjs exigent un émulateur Realtime Database local sur 127.0.0.1:9005. Ils utilisent uniquement le projet demo-rpg-combat et des comptes fictifs. Ne jamais les lancer contre la production.

Les présentations sont vérifiées dans cinq DOM JSDOM, pas dans cinq navigateurs graphiques. Le résultat de chaque dé est comparé, les créations de cinématiques sont vérifiées, et les minuteries sont accélérées. Les sons sont simulés ; leur audibilité dépend du navigateur, du volume et d'un premier clic sur le site.

Exploration : node tests/exploration.cjs. Pour le parcours complet, lancer tests/firebase-exploration.cjs avec l’émulateur Realtime Database sur 127.0.0.1:9005 (projet demo-rpg-exploration). Ce test exécute tous les scripts, avec deux MJ et trois joueurs, puis deux reconnexions supplémentaires. Les sons sont capturés par les appels play(), sans écoute réelle.

Fins de combat : node tests/combat-exit.cjs ; puis tests/firebase-combat-exit.cjs avec le même émulateur local (namespace demo-rpg-exit). Vérifie les cinq rôles, les animations et retours de boss, les KO collectifs, Bibi seule, un écran retardé et une reconnexion.

Malédictions et pouvoirs : node tests/character-effects.cjs ; tests/firebase-character-effects.cjs nécessite l’émulateur local sur 127.0.0.1:9005 (projet demo-rpg-effects). Les cinq sessions sont simulées ; les sons ne sont pas écoutés.

Redémarrage MJ : tests/firebase-session-view.cjs avec l’émulateur Realtime Database local. Le test crée une nouvelle partie dans la base isolée puis des documents neufs pour simuler le rechargement (JSDOM ne navigue pas). Vérifie cartes, PNJ, pions, introduction, commandes MJ et changements rapides de carte.

Équilibrage : node tests/mob-balance.cjs ; tests/firebase-mob-balance.cjs utilise la base locale sur 127.0.0.1:9005 et vérifie les cinq sessions, les aperçus de dégâts, les actions des world boss, l’annonce de leur spéciale et la conservation des métadonnées dans une sauvegarde.

Corrections du 9 novembre : tests/presentation-lifecycle.cjs vérifie l'annulation des présentations en attente et en cours, sans effet tardif. tests/firebase-mob-special-previews.cjs couvre aussi tous les pouvoirs alliés dans l'essai local (sons simulés). tests/firebase-combat-saves.cjs restaure les états et PV MJ actuels, sans l'ancien système de prévision.

Commande commune après installation des dépendances de tests : `node tests/run.cjs`. Pour les scénarios multijoueurs, démarrer uniquement l'émulateur local sur 127.0.0.1:9005 puis lancer `node tests/run.cjs --firebase`. Les données de production ne doivent jamais servir aux tests.

Documents attribués : `node tests/firebase-player-documents.cjs` avec la base émulée locale. Vérifie les destinataires, la consultation locale, le retrait, la sauvegarde, le menu Action en essai MJ et le texte de la spéciale de Pika.

Invocations hors combat : tests/firebase-exploration-summons.cjs couvre autorisation ponctuelle, animation partagée, pion localisé par carte, sauvegarde, déplacement MJ et suppression réservée au MJ. Les médias restent simulés.

John Pork et soins : tests/combat-health.cjs et tests/firebase-combat-health.cjs vérifient dégâts d’arrivée, interception mono-cible, zones, soins sur héros et invocation, Bibi KO, soins de groupe, expiration, sauvegarde et son d’entrée du Balrog. Les lectures audio restent simulées.

Stockage plein en partie test : `tests/firebase-test-storage.cjs` avec l’émulateur local vérifie l’alerte visible, le maintien en mémoire, l’absence de fausse confirmation, l’export de secours de l’état actuel (mode test), son décodage, l’échec de téléchargement et le retour du stockage. La campagne réelle reste inchangée.

## Nettoyage du 10 novembre

Le lanceur standard couvre les tests unitaires actifs. --firebase découvre tous les fichiers firebase-*.cjs et exige un émulateur local ; aucun ancien scénario d’interface ne peut rester oublié par une liste partielle. Utiliser --list pour afficher les scénarios sans les lancer. --browser lance les contrôles Edge des fenêtres, ressources, spéciales et tailles d’écran. L’affichage des interventions est désormais vérifié sur le panneau états/PV actuel, avec conservation de la saisie pendant les rafraîchissements.

Les anciens scénarios arbitration.cjs, firebase-arbitration.cjs et arbitration-dropdown-browser.cjs ont été remplacés : leur attente d’une attaque suspendue ne correspond plus au jeu. Les contrôles de compatibilité restent dans firebase-retired-actions.cjs et retired-combat-commands.cjs ; les états/PV et permissions dans gm-statuses.cjs et firebase-gm-statuses.cjs ; la reconnexion de l’interface dans firebase-reconnect-ui.cjs ; les fins de combat dans combat-exit.cjs et firebase-combat-exit.cjs. L’historique Git conserve les anciens scénarios.

Installation reproductible : npm ci --prefix tests. Puis node tests/run.cjs, ou dans l’émulateur node tests/run.cjs --firebase. Les navigateurs graphiques utilisent Edge installé sur Windows. RPG_LAYOUT_OUTPUT choisit le dossier des captures ; RPG_TEST_REPORT peut conserver le bilan du lanceur.
