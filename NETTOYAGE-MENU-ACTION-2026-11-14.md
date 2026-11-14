# Découpage du menu Action — 14 novembre 2026

Version locale 20261114.4, non publiée pendant cette passe.

## Périmètre

Les 25 fonctions du menu Action, de ses contrôles d'accès et de ses cris ont été extraites de game.js vers player-actions.js. Le nouveau fichier regroupe environ 520 lignes : documents reçus, catalogue des alliés, autorisations d'invocation, cris appris et autorisés, défi runique, accès à la fiche, annonces et commandes de cris du MJ.

Chaque fonction déplacée a été comparée au code du dernier commit publié : son corps est identique. Les données initiales et abonnements Firebase restent dans game.js ; la lecture des documents, la découverte des alliés et les résolutions partagées restent dans leurs modules existants.

player-actions.js est chargé avant game.js pour que les fonctions soient disponibles aux abonnements existants. Le chargement unique et la présence dans le cache sont contrôlés. Le test des présentations de cris utilise désormais leur nouveau fichier.

## Vérifications ciblées

- Douze scénarios locaux : menu masqué sans accès, documents réservés à leur destinataire, alliés consultables sans invocation, autorisation alliée pour le bon héros et le bon combat world boss, cris appris mais non autorisés, demande hors combat, cri déjà utilisé, rune active, conservation et retrait des onglets, accès à la fiche et absence du bouton joueur chez le MJ.
- Edge sur des largeurs de 320, 390 et 1000 px : menu dans les limites de l'écran, lecture du catalogue des alliés, cri non autorisé désactivé, consultation du document reçu, ouverture du défi runique et fermeture du menu, sans erreur de script.
- Les demandes d'action sont simulées dans ces contrôles d'interface. Ils ne remplacent pas les tests des règles et permissions du moteur et ne modifient aucune partie en ligne.

## Suite

Les contrôles de carte et le menu Action ont maintenant leurs fichiers dédiés. La consolidation supplémentaire des styles et les mesures réseau en campagne restent des chantiers distincts.
