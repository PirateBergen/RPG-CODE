# Pions absents jusqu’au prochain déplacement

Signalement : surtout Elo hors combat, parfois en combat. Deux chemins reproductibles ont été corrigés pour tous les héros, sans déplacer les pions dans la base ni modifier les personnages.

- Les positions reçues pendant une synchronisation restent mémorisées. À la fin du verrou, elles sont réappliquées localement, sans attendre un nouveau déplacement.
- Le retour sur l’onglet et la fin d’un changement de carte réappliquent les positions connues. Aucun intervalle de surveillance ni lecture de fiche supplémentaire n’est ajouté. Les déplacements en cours, transitions de combat et animations de retour gardent leurs protections.
- Une reprise lente n’applique pas une lecture d’une ancienne identité, révision ou transition de carte. Si des positions ont changé pendant les lectures, les positions reçues ensuite sont prioritaires.
- L’entrée/reprise en combat utilise les positions actuelles des pions et des adversaires secondaires ; les anciens placements de présentation servent uniquement de secours. Les coordonnées non numériques sont ignorées.

Validation locale : scénario Firebase à deux MJ et trois joueurs, pour Greg/Pika/Elo/Bibi ; verrou, reprise artificiellement retardée, retour sur l’onglet et anciens placements de combat à 9000 px. Récupération sans déplacement et personnages inchangés. Scénario de reprise de session réussi ; scénario Oregon réussi pour conserver le masquage volontaire des pions. Aucune donnée de production utilisée.

Ces tests reproduisent des pertes de mise à jour de position. Ils ne prouvent pas que toute disparition observée sur chaque appareil ait la même origine.
