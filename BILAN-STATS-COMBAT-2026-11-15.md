# Statistiques de combat et journal de partie — 15 novembre 2026

## Accès au compte rendu

Le jeu enregistre des événements dans game/sessionLog : attaques résolues, dé, critique ou échec critique, dégâts et soins, résultats de combat et événements ajoutés par le MJ. Le panneau MJ lit les 80 dernières entrées. Les résolutions de combat limitent ce journal à 200 entrées récentes : ce n'est pas une transcription exhaustive.

Le journal est inclus dans les données de partie sauvegardées. Une exportation de la sauvegarde de la session permet donc une analyse, sous réserve que celle-ci contienne encore les événements concernés. Aucun onglet MJ connecté n'était accessible depuis cet environnement lors de cette vérification. Aucun bilan des événements réels de la session n'est inventé ici.

## Effets réellement programmés aujourd'hui

| Statistique | Actions concernées | Ce qu'elle ne fait pas automatiquement |
|---|---|---|
| Force | Chat Bite de Greg, French cancan de Pika, spéciale Crâne de Frank | Ne modifie pas les chances de critique ni l'initiative |
| Perspicacité | Tir à l'arc I know Frank de Greg | Pas de bonus général de précision, d'esquive ou d'initiative |
| Charme | Sort et spéciale d'Elo, Rire KRRKRR et Endikaki de Pika ; soin de groupe de la spéciale d'Elo | L'hypnose Je suis une fille affiche Charme, mais sa réussite dépend actuellement seulement du dé et de la catégorie ennemie |
| Défense | Puissance de Mains magiques d'Elo | Ne réduit pas automatiquement les dégâts ennemis reçus ; les protections manuelles du MJ sont un mécanisme distinct |
| Chance | Puissance de Le Bibi, invocation John Pork d'Elo et spéciale de Bibi | Pas de bonus général aux dés de combat, aux critiques ou à l'initiative |

Les valeurs utilisées tiennent compte des caractéristiques effectives et de l'équipement. Les états de combat peuvent encore modifier les effets. Les attaques normales ajoutent généralement environ 0,82 fois la statistique indiquée à une valeur de dé pondérée, avec un bonus de niveau puis des effets propres à l'attaque. L'invocation John Pork ajoute sa Chance directement au dé avant les autres effets.

Pika possède des formules spécifiques :

- French cancan : nombre de coups fixé par le dé ; chaque coup utilise 3 + Force + une part du bonus de niveau.
- Rire : dé + Charme + bonus de niveau, puis ricochet ou bonus sur critique.
- Endikaki : Charme entre dans le calcul de l'explosion, avec les multiplicateurs et bonus de spéciale.
- Hypnose : seuil dépendant de l'ennemi, critique sur le maximum naturel ; Charme n'entre pas dans le test de réussite.

Quand Greg utilise Le Bibi, la résolution utilise ses statistiques ; le recours de Bibi quand Greg ne peut pas agir utilise celles de Bibi. La spéciale propre de Bibi utilise sa Chance.

Les initiatives des héros sont actuellement des D12 sans ajout de caractéristique. Les critiques de leurs attaques reposent sur le maximum naturel du dé ; un 1 naturel détermine l'échec critique. La Chance ne modifie pas cette distribution. Les tests de caractéristique hors combat sont différents : ils affichent D20 + la caractéristique choisie, donc un test de Chance ajoute bien la Chance. Un lancer libre de dé n'est pas automatiquement un test de Chance.

## Vérifications déterministes ciblées

À même jet naturel de 6 et même contexte de test :

| Essai | Valeur de base | Après +5 dans la statistique |
|---|---:|---:|
| Greg, morsure, Force | 11 dégâts | 15 dégâts |
| Greg, Le Bibi, Chance | 10 dégâts | 14 dégâts |
| Elo, Mains magiques, Défense | 9 PV soignés | 13 PV soignés |
| Pika, Rire, Charme | 13 dégâts | 18 dégâts |
| Greg, morsure, Chance | 11 dégâts | 11 dégâts |
| Pika, hypnose sur ennemi fort, Charme | Échec au jet de 6 | Même échec |

Dans un autre essai à attaque ennemie identique, ajouter 20 en Défense à Greg laisse les dégâts reçus à 6. Ces scénarios illustrent le code, pas la session réellement jouée. L'arc a été vérifié dans sa définition et dans le chemin de calcul ; la fixture simplifiée utilisée pour les exemples ne charge pas son analyseur d'inventaire.

## Évolution proposée, pas encore appliquée aux règles

Priorité à la cohérence : Défense devrait protéger contre les dégâts, Charme devrait servir à l'hypnose et Chance devrait intervenir de façon visible dans les jets. Une règle bornée de bonus de Chance, distincte du dé naturel, permettrait de conserver les 1 et maximums naturels pour les critiques. Le plafond, les jets concernés et l'interaction avec les seuils d'hypnose doivent être définis avant d'appliquer un rééquilibrage global.

Il faudra mesurer les effets sur les petits ennemis, les boss et les world boss, ainsi que sur les héros de plusieurs niveaux. Donner un bonus aux dés peut aussi augmenter les dégâts et la fréquence de contrôle ; ce n'est pas uniquement une modification visuelle.
