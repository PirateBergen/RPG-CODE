# Fiches et inventaire — regroupement des styles

Les bases de la fiche, des champs et portraits, des jauges, du formulaire d’objet et des choix de caractéristiques sont réunies dans un bloc identifié de `style.css`. Les 22 blocs d’adaptation mobile sont réunis avec ce composant, avec les deux animations des jauges.

Deux blocs de base de la fenêtre de fiche sont fusionnés. Neuf styles fixes du formulaire HTML et deux styles fixes des lignes de caractéristiques créées par le code rejoignent la feuille CSS. Les coordonnées des champs, les valeurs des jauges et les états de visibilité continuent à être gérés par le jeu.

La centralisation préserve les valeurs effectives du formulaire : les anciens styles HTML avaient priorité sur trois valeurs mobiles concurrentes (marge du titre et deux largeurs maximales). La nouvelle cascade exprime ces valeurs sans ajouter de `!important`.

## Contrôles

- Comparaison finale des styles calculés et dimensions dans 30 configurations : Greg, Pika et Bibi ; zéro ou trois lignes de caractéristiques ; cinq tailles d’écran.
- Aucun écart dans cette comparaison finale. Elle utilise des données DOM contrôlées et bloque les ressources réseau ; elle ne représente pas une campagne complète sur plusieurs appareils physiques.
- Nouveau test Edge : saisie du nom, quantité et poids ; choix du bonus ; ajout réel dans le texte d’inventaire ; calcul de charge ; navigation clavier ; retrait d’une ligne de caractéristique. Testé sur mobile et ordinateur.
- 35 suites unitaires et 9 suites Edge réussies.
- Test Firebase local d’inventaire réussi : bonus combinés, affichage de la fiche, sauvegarde des statistiques de base sans double application, bonus d’objet figés malgré le changement de niveau, valeurs invalides refusées et retrait des bonus avec l’objet.

Ce nettoyage ne change ni les règles de poids ni celles des bonus d’équipement. Le total des priorités CSS reste à 345.
