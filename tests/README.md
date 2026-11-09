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
