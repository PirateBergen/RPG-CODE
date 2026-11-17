# Critiques de combat — version 20261117.6

Les nouveaux combats calibrés enregistrent `criticalRulesVersion: 1`. Les combats et sauvegardes sans ce marqueur gardent leurs calculs précédents. Aucun combat existant n’est migré. La Chance et les jets de réaction ne changent pas.

## Héros

Les dégâts et soins génériques critiques passent de ×1,6 à ×2, y compris les spéciales et le soin de groupe de la spéciale d’Elo. Les effets associés (poison, saignement, rage, John Pork) restent inchangés. Les échecs des attaques restent à zéro et les soins sur échec restent réduits.

Les critiques particuliers de Pika sont conservés : quatre coups pour le cancan, ricochet de 50 % ou ×1,5 sur cible unique pour le rire, deux tours complets d’hypnose. Ils ne reçoivent pas un deuxième multiplicateur. Endikaki passe à ×2. Les seuils d’hypnose, recharges et conditions des spéciales sont conservés.

## Interventions des PNJ alliés

- Offense : ×2 sur critique, plafond strict par cible de 50 % des PV maximum, contre 40 % normalement. Le plafond est aussi contrôlé après les vulnérabilités du MJ. Les protections restent actives. Les seuils du catalogue sont conservés : généralement le maximum naturel du dé, 18–20 pour Gungnir d’Odin.
- Baldur interrompt toujours la prochaine action ennemie sur critique si la cible survit et a réellement subi des dégâts. Les chaînes existantes sont conservées.
- Sur un 1 naturel, aucune attaque, chaîne, interruption, malédiction, amélioration ou guérison n’est appliquée. L’intervention et l’action du héros sont consommées. Pas de dégâts alliés ni de relance gratuite.
- Thor conserve sa victoire scénarisée contre Jörmungandr sur le Forchur, mais elle échoue désormais sur un 1 naturel. L’exception historique reste intacte pour les anciens combats.
- Soin sur critique : ×1,5 sur cible vivante, plafonné aux PV maximum ; résurrection complète sur cible KO. Aucun bouclier stockable. Une tentative sans critique sur une cible KO consomme l’intervention sans résurrection.
- Élixir : durée de quatre rounds sur critique au lieu de trois, sans augmentation permanente de statistique. Le bonus est remplacé, jamais additionné à lui-même.
- Sorcière : réduction des dégâts ennemis de 35 % sur critique, contre 25 % normalement ; appliquée aussi à la pression des tentacules du Kraken.
- Corbeaux d’Odin : réduction fixe renforcée de 25 % sur critique, avant arrondi. Les seuils normaux restent inchangés.

Chaque intervention reste utilisable une seule fois par combat, pendant une action du héros et avec autorisation du MJ pour le joueur. Le plafond s’applique à chaque intervention, pas au total de toutes les invocations : autoriser plusieurs PNJ offensifs reste un levier de difficulté du MJ.

L’historique et les fiches décrivent les règles attachées au combat. Une intervention ratée ne joue plus l’animation d’impact réussi ; son explication est affichée après le dé. Les mobs ne gagnent pas de critiques de dégâts aléatoires avec cette mise à jour.

## Vérification

- Suite `combat-criticals` : calculs réels des critiques et des échecs, tous les PNJ offensifs, anciens combats, plafonds et protections, Thor/Jörmungandr, soutiens, résurrection, Pika et sauvegarde.
- Test Firebase `firebase-mob-balance` sur émulateur local, cinq sessions : création, synchronisation et conservation du marqueur de règles dans la sauvegarde.
- Rapport `reports/combat-criticals-2026-11-17.json` : 3 000 simulations comparées aux règles précédentes, niveaux 1, 6 et 20, mêmes graines et mêmes ennemis. Aucun équipement ; stratégie automatisée, réactions et éventuellement une intervention de Mélenchon.

Au niveau 6 : rencontre ordinaire médiane de trois rounds dans les deux versions ; boss de sept à six rounds ; Kraken avec réactions de treize rounds dans les deux versions, taux de victoire simulé de 21 % à 28 %. Avec réactions et un PNJ offensif : dix rounds dans les deux versions, victoires de 69 % à 72 %. Ces chiffres comparent des scénarios automatisés ; ils ne prédisent pas les performances du groupe réel et n’évaluent pas une accumulation de toutes les invocations.
