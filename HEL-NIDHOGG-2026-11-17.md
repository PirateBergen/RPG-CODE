# Hel et Nidhogg — soutien commun, version 20261117.11

## Alliances et annonce

Nidhogg est ajouté aux alliés débloquables par le MJ, avec son portrait existant `nhiddog.png`. Son alliance et celle de Hel restent indépendantes ; les commandes Rompre/Rétablir s’appliquent à chacun.

Quand le MJ débloque la seconde de ces alliances, Hel apparaît dans sa brume et annonce :

« Vous avez gagné ma confiance… et celle de Nidhogg. Vous êtes dignes de recevoir notre aide face à votre défi final. Devant le Roi, appelez-nous ensemble. »

L’annonce remplace l’annonce ordinaire du second allié pour éviter les superpositions. Elle est synchronisée pour les joueurs présents, enregistrée dans la campagne et ne se répète pas au chargement, à la reconnexion ou à un rétablissement ultérieur. Si le courroux est actif, l’annonce attend sa levée. Rien n’est débloqué automatiquement lors de la publication : les alliances sont des décisions du MJ.

## Nidhogg seul — Morsure des racines

Intervention contre les world boss, sur autorisation du MJ pour le joueur. D20 naturel, sans bonus de Chance :

- 2–19 : dégâts adaptés au niveau ; si la cible survit et subit des dégâts, dégâts reçus +15 % jusqu’à la fin du prochain round.
- 20 : dégâts ×2 et blessure à +25 % pendant la même durée.
- 1 : aucun dégât ni blessure ; intervention et action du héros consommées.

La blessure ne se cumule pas avec elle-même. Les dégâts directs respectent les protections et les plafonds de 40 % des PV maximum, 50 % sur critique. L’invulnérabilité de Jörmungandr est conservée. Les dégâts périodiques MJ qui ignorent explicitement les vulnérabilités restent des arbitrages séparés.

## Duo — Le Jugement de la Couronne creuse

L’entrée **Duo — Hel et Nidhogg** apparaît dans les invocations MJ et les alliés consultables des joueurs uniquement pendant un combat actif avec un Roi vivant et les deux alliances intactes. Elle ne figure pas dans le catalogue de déblocage comme un troisième allié et ne peut pas être autorisée hors combat.

Conditions revérifiées à l’autorisation et à la résolution : deux alliances débloquées, aucune rupture, aucun courroux actif sur les personnages, interventions individuelles encore disponibles et cible `roi`. Un Roi en emplacement secondaire est également reconnu. Un autre ennemi présent dans le même combat ne peut pas être ciblé par le duo.

| Jet naturel au D20 | Conséquence |
|---|---|
| 1 | Aucun dégât ni affaiblissement. |
| 2–19 | Base de dégâts de 25 % des PV maximum du Roi ; sa prochaine attaque inflige 50 % de dégâts en moins. |
| 20 | Base de 30 % des PV maximum, même affaiblissement. Aucun autre multiplicateur critique. |

Les protections du MJ et les affaiblissements du lanceur restent actifs. Les vulnérabilités ne peuvent pas dépasser le plafond de 25/30 %, et la blessure de Nidhogg n’amplifie pas le duo. Le sort peut achever un Roi déjà affaibli ; il ne retire jamais tous ses PV maximum d’un seul coup.

La réduction s’applique à la prochaine attaque réellement exécutée, spéciale comprise. Une préparation de spéciale, une paralysie, une action interrompue ou un tour passé ne la consomme pas. Elle se combine multiplicativement avec les protections des réactions.

Le duo consomme une action du héros, le Sursis de Hel et la Morsure de Nidhogg, sur réussite comme sur échec. Une utilisation individuelle préalable interdit le duo pendant ce combat ; rompre puis rétablir une alliance ne réinitialise pas ces usages. Rompre l’une des deux alliances annule aussi une autorisation du duo encore en attente.

## Animation

La scène reprend l’aperçu validé : les trois PNG existants, racines et brume dessinées, double spectral dérivé du portrait du Roi, couronne magique et fragments. Aucun nouveau portrait généré n’est utilisé. Le D20 partagé précède la scène ; le résultat et les effets sont déjà confirmés par le moteur.

Sur échec, le Roi résiste et la couronne ne se brise pas ; les effets de réussite ne sont pas joués. Les sons POW et tremblement sont gérés par une portée annulable. Échap, Fermer ou le nettoyage de session arrête les images, sons et délais sans modifier le résultat. La scène s’adapte aux petits écrans et limite les secousses si le mouvement réduit est demandé.

## Vérifications

- Suite `hel-nidhogg` : annonce unique, courroux, portée Roi uniquement, autorisations, plafonds, critiques/échecs, usages communs, blessures et attaque suivante.
- Test Firebase sur émulateur : cinq sessions plus une reconnexion, déblocage progressif, annonce commune, absence du duo contre Kraken, présence contre Roi, autorisation joueur, critique partagé, consommation et sauvegarde.
- Test Edge sur 320×568, 390×844, 844×390 et 1440×900 : animation avec les vrais PNG, succès/échec, fenêtres bornées et arrêt par Échap.

Aucune donnée de partie en production n’est modifiée par les tests ni par la publication.
