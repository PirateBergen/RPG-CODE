# Immortalité quantique — don de la Gardienne

## Acquisition

Le premier départ de l’Antre après le passage des âmes accorde au groupe l’état permanent **Immortalité quantique**, attribué à la Gardienne. Le Passage de l’Antre compte également comme sortie. Le changement de carte, la fin de la marque narrative et l’acquisition sont enregistrés dans une même transaction. Les clients ne décident pas de leur propre attribution.

Une animation partagée affiche un symbole infini lumineux, le titre du don et son origine, avec le son des pouvoirs à volume modéré. Elle dure environ cinq secondes et tient compte du mouvement réduit. Elle est annulée proprement au chargement ou au nettoyage d’une présentation.

Le don apparaît dans une section **États permanents** de la fiche. Il n’est pas un bouton d’attaque et ne dépense ni points de don ni points de malédiction. Greg, Pika, Elo et Bibi peuvent en bénéficier. Le PNJ de la Gardienne reste à créer ultérieurement ; cette modification ne crée pas ce personnage.

## Mort et retour de combat

- Avant ce don, les KO restent morts sur la carte après une fin de combat ordinaire. Le premier passage exceptionnel vers l’Antre conserve sa règle propre : PV restaurés, mais marque narrative de mort jusqu’à la sortie.
- Avec le don, les dégâts et les KO restent normaux pendant le combat. Une défaite reste une défaite ; aucun dégât n’est annulé.
- À la fin du combat, les bénéficiaires KO sont relevés avec leurs PV maximum. La règle s’applique aux combats classiques et world boss, sur victoire, défaite ou fuite.
- Un survivant blessé conserve ses PV restants. Le don ne soigne pas toute l’équipe gratuitement.
- Les inventaires, statistiques de base, notes et jauges ne sont pas réinitialisés.

## Persistance et contrôle

Le don est conservé dans la progression sauvegardée de la partie, avec un bénéficiaire explicite par personnage. Il n’est pas un champ libre de la fiche. Les règles existantes réservent cette progression au MJ : les tentatives d’écriture ou de suppression par un joueur sont refusées. L’édition normale de la fiche conserve le don.

Une sauvegarde après acquisition le contient ; une nouvelle partie repart sans ce don. Reconnexion et lecture d’un don déjà acquis ne doivent pas rejouer son animation. Les parties existantes dont la sortie de l’Antre est déjà enregistrée avec son identifiant de combat obtiennent ce don lors de leur synchronisation.

## Vérifications

37 suites unitaires et 11 suites Edge réussies. Parcours locaux ciblés : première sortie avec deux MJ, une animation par écran, don sauvegardé, retour à l’Antre sans nouvel événement, seconde défaite world boss avec résurrection, fiche permanente, refus des écritures joueur, mort réelle pendant un combat classique, résurrection après défaite, résurrection d’un seul KO après victoire, blessures des survivants conservées, sauvegarde du don, et régression des 17 scénarios de sortie sans don.

Les tests multijoueurs emploient un émulateur Firebase et des fenêtres DOM simulées. Edge valide les interfaces et animations ciblées ; aucune campagne complète sur plusieurs appareils physiques ni écoute humaine de la bande sonore n’est revendiquée.

Le prochain chantier de nettoyage reste celui des styles de l’écran de combat, déjà consigné dans `ROADMAP.md`.
