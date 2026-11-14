# Styles du menu Action — 14 novembre 2026

Version 20261114.5, regroupant aussi les extractions précédentes de la carte et du menu Action.

Les styles fixes des onglets, du bouton de fiche, de l'icône de rune, des descriptions et des états vides sont centralisés dans style.css. L'onglet actif est indiqué par une classe au lieu de trois affectations de style à chaque rafraîchissement. Les commandes, permissions et textes ne changent pas. Aucune nouvelle règle !important n'est ajoutée.

Avant modification, le test Edge du menu a enregistré les styles calculés et les dimensions du panneau et de ses descendants pour les cinq onglets, sur des écrans de 320, 390 et 1000 px. Après modification, la comparaison des quinze configurations est identique. Les comportements du menu sont vérifiés dans le même parcours.

Le test peut enregistrer une référence via RPG_ACTION_STYLE_SNAPSHOT et la comparer via RPG_ACTION_STYLE_BASELINE. Les références de cette passe restent dans le dossier local ignoré _site et ne sont pas livrées avec le jeu.

Le changement ne touche pas aux données de campagne. Les règles de visibilité et les valeurs d'animation restent dans le code ; cette passe centralise la présentation fixe du menu.
