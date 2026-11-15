# Nouvelle partie depuis le menu d'attente — 20261115.1

Le lancement attendait une réponse de chaque présence d'onglet enregistrée, même lorsqu'un autre onglet du même joueur répondait ou qu'une ancienne présence anonyme ne possédait aucun personnage. Cela pouvait produire « Un joueur ne répond pas » avec tous les joueurs présents dans le menu.

Pour une nouvelle partie uniquement, les participants attendus sont les comptes MJ et ceux liés aux héros actuellement réservés, plus le MJ initiateur. Une réponse positive d'un onglet de chaque compte participant suffit. Les anciennes présences sans personnage et les anciens comptes remplacés dans la réservation d'un héros ne bloquent plus cette réinitialisation.

Un compte participant sans réponse reste bloquant. Une réponse signalant un échec reste bloquante. Les sauvegardes, restaurations et migrations conservent leur attente de chaque onglet : les éventuelles fiches et notes à préserver doivent toujours être synchronisées. La nouvelle partie remplace intentionnellement l'état courant ; cette correction ne contourne ni le verrou de session, ni les règles serveur.

Contrôles : scénario réel des scripts sur émulateur, quatre écrans dans le menu d'attente, ancien onglet d'un joueur, présence anonyme abandonnée et ancien compte remplacé. Test d'un joueur participant réellement silencieux : refus sans modification partielle. Puis test du démarrage réussi après sa réponse, avec préservation des comptes, réservations et sauvegardes. Les deux structures de campagne sont couvertes. Les tests unitaires vérifient également que la sauvegarde continue d'attendre chaque onglet.

Après publication, tous les écrans doivent recharger la page pour utiliser le correctif. Aucune nouvelle partie n'a été déclenchée dans la campagne réelle pendant le développement.
