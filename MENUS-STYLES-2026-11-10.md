# Regroupement des styles des menus — 10 novembre 2026

Les bases de la barre MJ, des icônes, des sections et boutons MJ, des onglets PNJ, des catégories, du menu personnage et du menu Action sont réunies dans un bloc identifié de `style.css`.

51 anciens blocs deviennent 33 blocs de base, soit 18 blocs répétés retirés. Les déclarations sont fusionnées avec le parseur CSS d’Edge, en conservant les valeurs et priorités gagnantes. 20 `!important` dupliqués disparaissent : 365 → 345. Aucun sélecteur plus spécifique n’est ajouté pour compenser une suppression.

Les adaptations mobiles, les restrictions selon le rôle et l’exception de largeur finale du menu Action sont conservées à leurs points d’application. La première comparaison avait détecté un écart sur cette largeur maximale ; la version finale le préserve.

## Vérifications

- Styles calculés, dimensions et pseudo-éléments des menus comparés avant/après dans 35 configurations contrôlées : choix initial, menus fermés, menus MJ, menu joueur, survols d’icône MJ, de bouton et de catégorie, sur cinq formats d’écran (320, 390, 844, 1100 et 1440 pixels de large).
- Aucun écart observé dans la comparaison finale.
- Nouveau test Edge avec les vrais gestionnaires de catégories, d’onglets et de fermeture automatique : navigation sans fermeture, choix d’un PNJ avec fermeture, maintien de la bonne sélection, sur mobile et ordinateur.
- Les comparaisons contrôlées n’exécutent pas une campagne complète ; les ressources réseau y sont bloquées. Les suites Edge existantes vérifient en complément les fenêtres dynamiques et les ressources réelles.

Les styles du combat, des fiches et des inventaires restent des chantiers distincts. Les règles de jeu et les sauvegardes ne sont pas modifiées par ce regroupement.
