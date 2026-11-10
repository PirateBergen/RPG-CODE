# Nettoyage des priorités CSS — 10 novembre 2026

114 `!important` redondants retirés, de 479 à 365 (−23,8 %).

Les suppressions concernent notamment l’alignement, les espacements, les ombres, certaines marges et limites de dimensions. Les règles non rencontrées dans les scénarios restent intactes. Les priorités de visibilité, d’empilement, d’interaction, d’animation et de pseudo-contenu sont volontairement conservées.

## Comparaison avant/après

Dans Edge, comparaison de toutes les propriétés concernées pour les éléments du document et leurs pseudo-éléments `::before` et `::after` :

- 10 états : choix des personnages, menu MJ, menu joueur, fiche, inventaire, combat, carte monde, bateau, nuit et brume.
- 3 formats : 390 × 844, 844 × 390, 1440 × 900.
- 30 configurations au total ; mêmes styles calculés dans la comparaison finale.

Les propriétés dont le retrait changeait l’apparence ont été rétablies. Cette analyse porte sur des états DOM contrôlés, sans les scripts complets ni les médias distants. Elle ne constitue pas une comparaison de pixels d’une campagne complète.

Les tests Edge existants complètent la comparaison avec les fenêtres dynamiques, le menu Intervenir, les champs natifs, les raccourcis, les aperçus de spéciales et les ressources. Les règles de jeu JavaScript ne sont pas modifiées.

## Pourquoi conserver des priorités ?

Certaines neutralisent les styles injectés directement par le jeu ; d’autres protègent l’interface pendant les transitions et sur les petits écrans. Supprimer les 365 restantes demanderait de revoir leurs règles concurrentes et certains styles injectés. Cette passe n’ajoute pas de sélecteurs artificiellement plus spécifiques pour remplacer les priorités retirées.
