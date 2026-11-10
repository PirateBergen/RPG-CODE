# Nettoyage des styles de combat

96 blocs de base regroupés en 94 blocs : HUD joueur, états du résumé, panneaux et thèmes des monstres, ciblage et initiative. Dix blocs d’adaptation mobile suivent les bases. Les sélecteurs partagés avec d’autres interfaces restent à leur place.

21 styles fixes de l’initiative déplacés de combat.js vers des classes nommées dans style.css. Les valeurs dynamiques, les interactions et les règles de combat restent dans le code.

Comparaison avant/après dans Edge : 30 configurations, cinq tailles (320×568, 390×844, 844×390, 1024×600, 1440×900), MJ et joueur, jets / ordre actif / panneau fermé. Aucun écart de styles calculés ni de coordonnées sur le HUD, le résumé des états, l’initiative et la notification. Cette comparaison ne couvre pas chaque animation de chaque monstre ni de vrais appareils multiples.

Test navigateur conservé : ouverture, fermeture, réouverture, clic D12 et restriction de la vue joueur à sa propre carte.

Suite conseillée : examiner les styles dynamiques des cartes d’initiative et des panneaux de monstres, puis mesurer les échanges des actions complexes sur les longues campagnes. La conception du combat final du Roi reste reportée.

Contrôle complémentaire : douze configurations avec panneaux de monstres, attaques normales et spéciales désactivées, sans écart observé.
