# Recalibrage des combats — version 20261115.3

Objectif retenu : rythme équilibré, difficulté progressive. Cette version remplace les formules des **nouveaux combats**. Un combat sauvegardé avec les anciennes règles les garde jusqu’à sa fin, y compris pour un renfort ajouté après chargement. Aucun compte, inventaire, point attribué, PV courant ou sauvegarde de campagne n’est réécrit par la publication.

## Rôle des statistiques

| Statistique | Effet réel dans les nouveaux combats |
|---|---|
| PV | Réserve de survie, plafond des soins, seuils des spéciales et PV de John Pork. |
| Force | Puissance de la morsure et de la spéciale de Greg ; dégâts par coup du cancan de Pika. |
| Perspicacité | Puissance du tir à l’arc ; bonus d’initiative. |
| Charme | Puissance des sorts de Pika/Elo et de leurs spéciales ; bonus au test d’hypnose. |
| Chance | Bonus borné aux jets d’attaque/soin, initiative, puissance de Bibi et de l’arrivée de John Pork. |
| Défense | Réduction des dégâts d’attaque ennemie ; puissance des Mains magiques d’Elo. |

Les bonus d’équipement sont pris en compte une seule fois. Les statistiques utilisent des rendements décroissants : avec `s` la statistique et `L` le niveau (1 à 99), leur facteur est `s / (s + 10 + L)`. Investir reste utile ; un objet exceptionnel ne permet pas de rendre les dégâts ou la protection illimités.

La Défense réduit les dégâts de `40 % × facteur`, avec un plafond théorique de 40 %. Un coup positif inflige au moins 1 ; une attaque entièrement annulée par les protections du MJ reste à 0. Cela concerne les attaques ennemies, pas une modification manuelle de PV par le MJ.

La Chance donne `min(2, floor(3 × facteur))` au jet, sans toucher au 1 naturel ni au maximum naturel. Le total corrigé ne peut pas atteindre artificiellement le maximum : sur D12, 10 + 2 est limité à 11. Le bonus est visible dans l’animation et dans le journal. Ce sont des paliers : chaque point n’ajoute pas directement un point au dé. L’hypnose ajoute aussi jusqu’à 2 points de Charme ; un world boss exige toujours un 12 naturel.

L’initiative reste un D12 naturel, avec jusqu’à +4 grâce à la Perspicacité et à la Chance. Les ennemis reçoivent un bonus borné selon leur écart de niveau. Les bonus sont figés au lancement ; recharger ne relance pas les dés.

## PV, niveaux et attaques

La courbe existante des PV des héros est conservée : elle est progressive et respecte les personnages déjà montés en campagne. C’est la référence commune des dégâts, soins, effets et ennemis qui est recalibrée autour de cette courbe. Augmenter artificiellement tous les PV des héros aurait nécessité une migration des fiches et aurait seulement déplacé les problèmes de proportion.

La référence de PV `H(L)` est la moyenne des PV théoriques de Greg, Pika et Elo au niveau L. Les PV ennemis suivent les dégâts moyens attendus de trois actions de héros, la catégorie, l’espèce et le nombre d’ennemis. Leur puissance dépend du niveau moyen du groupe, de leur catégorie, de leur niveau propre et de l’attaque choisie. Le niveau moyen ne dépend pas de la qualité de l’équipement : un bon objet conserve son avantage.

| Catégorie | Niveau relatif au groupe | Rythme observé dans les scénarios principaux |
|---|---|---|
| Faible | +0 | 1 à 2 rounds |
| Normal | +1 | Environ 3 rounds seul ; 4 à 5 pour trois gardes |
| Fort | +3 | Environ 5 rounds |
| Boss classique | +3 | Médiane de 6 à 7 rounds ; 90 % des victoires en 8 à 9 rounds |
| World boss | +6 | Kraken : médiane de 9 à 10 rounds ; Roi : 11 rounds |

Ces durées décrivent des décisions scriptées et des rounds, pas des minutes de jeu ni une garantie pour chaque espèce. Les divinités, l’Hydre et le Roi restent particulièrement exigeants. Les world boss gardent deux actions, une spéciale annoncée avant son lancement et une furie sous la moitié des PV.

Pour un groupe ordinaire de deux ou trois ennemis, chaque ennemi reçoit respectivement 80 % ou 66 % des PV de sa version isolée, et 88 % ou 76 % de ses dégâts. Cela évite de tripler simultanément la durée et la pression. Les boss conservent leur budget individuel : ajouter plusieurs boss reste un choix difficile du MJ.

La puissance de base d’une attaque est `H(L) × coefficient × (0,65 + 0,75 × facteurStat) × (0,65 + 0,7 × jet/dé)`. Coefficients : mêlée/sort 0,12 ; distance 0,125 ; soin 0,18 ; arrivée d’invocation 0,10. Les spéciales ont un budget distinct et leur condition d’utilisation reste obligatoire, une fois par combat. Critique générique : ×1,6 ; échec d’attaque : 0. Le soin conserve un effet réduit sur échec, sans dépasser les PV maximum ni ressusciter une cible KO.

Les particularités sont conservées et ajustées : cancan de 0 à 4 coups, ricochet du rire, arc obligatoire, contact pour la morsure/cancan, saignement, poison, rage de Bibi, terrain favorable à Elo (+25 %), conditions des spéciales et recharge d’hypnose. Les dégâts périodiques progressent avec le niveau.

John Pork possède 35 % des PV maximum d’Elo, avec un plafond cohérent pour les soins, et dure trois rounds. Son bonus D4 progresse avec le niveau ; sur critique, ce bonus est doublé et touche tous les ennemis. Il continue à intercepter les attaques à cible unique.

## Alliés, pouvoirs et règles d’histoire

Les interventions offensives suivent désormais le niveau du groupe, le dé et le critique, au lieu de retirer des centaines de PV fixes à tous les niveaux. Chaque cible perd au plus 40 % de ses PV maximum par intervention. Les soins alliés progressent aussi ; leur critique permet toujours la résurrection complète. L’élixir devient un bonus temporaire de 15 à 30 % de la statistique principale pendant trois rounds : il n’augmente plus définitivement la fiche à chaque combat.

Les trois cris gardent leurs permissions et consommations. SKRAA/REIHKT progressent avec le niveau et le rang ; SKARO’H garde ses deux attaques basiques. Le pouvoir obtenu avec dix points de corruption ajoute 25 % aux dégâts du personnage pendant deux rounds lorsqu’il est activé dans un nouveau combat. Il ne modifie pas définitivement ses statistiques.

Les exceptions narratives restent prioritaires : Jörmungandr invulnérable aux attaques ordinaires et vaincu par Thor sur le Forchur, épée du Balrog contre le Roi, passage dans l’Antre et Immortalité quantique. Les soins ordinaires ne remplacent pas la résurrection.

## Validation et limites

- **42 suites unitaires**, dont 17 contrôles dédiés au recalibrage : tous les niveaux 1–99 et toutes les espèces pour les valeurs finies ; statistiques, critiques naturels, permissions, soins, invocations, équipement, effets temporaires, cris, histoire et compatibilité des anciens combats.
- **6 300 combats v3** : sept rencontres × six niveaux × 150 graines, comparés à 6 300 combats avec les anciennes règles, mêmes décisions et graines.
- **5 220 combats complémentaires**, 174 scénarios : toutes les espèces sauf Jörmungandr (test narratif séparé), groupes mixtes, niveaux mélangés, équipement, intervention de Mélenchon et stratégie sans soutien. Aucun de ces 11 520 combats v3 n’a produit d’erreur ni atteint la limite de 35 rounds.
- Cinq sessions locales connectées à l’émulateur Firebase : nouvelle version partagée, attaque réelle de joueur et bonus Chance identiques, deux actions ennemies, spéciale annoncée, sauvegarde et retour de carte. Tests complémentaires Pika, sauvegardes/rechargements, pouvoirs/malédictions et cris ; affichage navigateur sur mobile et ordinateur.

Exemple au niveau 1, sans équipement ni allié : Kraken passe de 23 % de victoires dans l’ancien modèle à 88 % avec la stratégie scriptée complète ; le Roi passe d’environ 1 % à 50 %. Dans l’échantillon complémentaire de 30 combats, une intervention de Mélenchon porte les victoires contre le Roi à 93 %. Les petits échantillons ne sont pas des prédictions exactes pour vos joueurs. La différence entre attaques seules et jeu avec soins/contrôle montre que le soutien a un intérêt réel.

Les rapports reproductibles sont dans `reports/combat-balance-*.json`, les simulateurs dans `tests/combat-simulation.cjs` et `tests/combat-balance-matrix.cjs`. Les premiers échecs du test multijoueur de malédictions lors des vérifications simultanées n’ont pas été reproduits : la version publiée précédente puis cette version passent chacune les 13 contrôles lorsqu’elles sont rejouées seules.

Cette validation utilise le code et des parties locales synthétiques, sans accès au journal de votre session réelle. Elle ne mesure pas toutes les combinaisons d’objets, toutes les décisions du MJ ni une campagne entière avec épuisement entre rencontres. Le résultat est une base cohérente et mesurée ; les prochaines parties permettront d’affiner les seuils plutôt que de prétendre qu’un « combat parfait » est garanti.
