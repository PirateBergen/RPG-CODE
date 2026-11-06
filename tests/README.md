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
