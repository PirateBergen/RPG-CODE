# Petite passe générale de nettoyage

Revue des sources organisées dans le manifeste, avec des changements limités aux répétitions et à la lisibilité. Aucun déplacement des chemins Firebase, identifiant de sauvegarde, média ou règle de combat.

- Interface : l’état ouvert/fermé des journaux utilise désormais la même fonction à l’initialisation et lors d’un clic. Les préférences locales, libellés et attributs d’accessibilité restent identiques. Suppression d’un ancien titre de commentaire sans rapport avec les panneaux.
- Audio : le lancement direct d’une musique de carte est partagé entre le premier lancement et le dernier essai de reprise. Les délais, priorités de l’Oregon, volumes, sources et gestion des erreurs sont conservés.
- Moteur : la résolution des dés d’exploration est isolée de la répartition des demandes. Les validations, bonus de Chance, critiques et limites des historiques sont conservés.

Validation : assemblages contrôlés ; 50 suites ordinaires réussies ; contrôle complémentaire des préférences ouvert/fermé dans menu-closure ; scénario multijoueur Oregon sur émulateur local pour les priorités musicales, sauvegarde et reconnexion. Aucune donnée de partie en production utilisée.
