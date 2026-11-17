# Invocation libre en combat

Le menu Alliés du MJ propose désormais « Invoquer librement » et « Donner l’invocation libre » dans tous les combats. L’autorisation permet au joueur choisi de poser le pion via Action → Alliés. Aucun dé, pouvoir, dégât, soin ou action de combat n’est déclenché. Les pouvoirs existants restent réservés aux world boss, et le duo Hel/Nidhogg au Roi.

Le pion est partagé ; déplacement et croix de retrait sont réservés au MJ. La croix n’existe pas dans le document des joueurs. Les transactions contrôlent le rôle, la révision de session et l’identifiant du combat. Une autorisation libre ne peut pas lancer un pouvoir. Une alliance rompue interdit l’invocation.

Les pions de combat sont sauvegardés avec leur identifiant de combat et retirés à son issue. Les pions hors combat restent conservés séparément. Aucun accès aux données de production n’a été nécessaire pour les essais.

Vérifications : tests/combat-free-allies.cjs (huit contrôles de règles) et tests/firebase-combat-free-allies.cjs (émulateur local, deux MJ et trois joueurs : pose, permissions, déplacement, retrait, autorisation joueur, absence d’effet automatique, sauvegarde et sortie de combat). Le second test se lance séparément avec l’émulateur sur 127.0.0.1:9005.
