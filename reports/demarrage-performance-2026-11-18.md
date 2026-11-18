# Démarrage et latence en combat

Problème signalé : latence au lancement et ralentissements pendant les combats/animations. Les corrections portent sur le travail réseau et les reconstructions de l’interface ; aucune règle de combat ou donnée de campagne n’est modifiée.

## Corrections

- Un seul lancement peut être en attente par écran MJ. Le bouton Continuer affiche « Ouverture… » et reste désactivé jusqu’à la réponse. Il est rétabli après un échec. Une réponse liée à une ancienne identité, révision ou transition locale ne lance pas l’écran.
- Un déplacement de pion ne relit plus sa fiche. Les statistiques sont actualisées par les abonnements aux personnages déjà existants, avec les données reçues, sans lecture supplémentaire. Les appels explicites à updateTokenStats sans données restent disponibles.
- Le panneau des adversaires utilise directement l’instantané du combat reçu. Il conserve son contenu si seuls les tours courants ou les journaux changent, plutôt que de supprimer les boutons et de relire chaque adversaire. Les changements de PV, d’attaques, de phases, de round ou de rôle entraînent toujours son actualisation ; les disponibilités des actions restent recalculées. Les anciens appels sans instantané gardent leur chemin de lecture.

## Vérifications

- 50 suites ordinaires réussies avant ajout du nouveau scénario startup-performance au lanceur.
- Scénario ciblé : 100 déplacements, zéro lecture de fiche ; 100 mises à jour de tour/journal avec adversaire identique, une construction de panneau et zéro relecture. Vérification des changements de PV, round, rôle et de suppression du panneau.
- Lancement différé : appels répétés bloqués, réponses d’ancienne identité/transition ignorées, erreur récupérable et nouvelle tentative possible.
- Émulateur Firebase local : scénario complet d’entrée MJ/joueurs et six scénarios de coupure/reconnexion en combat, y compris pendant une animation et après confirmation perdue, sans rejouer les dégâts.
- Edge : déplacement réel des panneaux et gestion des ressources audio ; dossier Kraken sur quatre tailles d’écran, fermeture Échap et séparation MJ/joueur.

Ces essais mesurent des lectures et reconstructions évitées. Ils ne constituent pas une mesure du débit ou des images par seconde sur l’appareil des joueurs. Les essais multijoueurs utilisent des médias simulés et aucune donnée de production.
