# Le Roi — cinq phases

Profil `king-v1`, attaché uniquement aux nouveaux combats créés par le moteur. Les anciens combats et sauvegardes sans ce profil gardent leurs statistiques et leur introduction. Aucun état de campagne en production n’a été modifié pendant les essais.

## Équilibrage retenu

- PV : 2,25 fois le Roi calibré précédent ; une barre de vie, sans remise à zéro ni réduction des dégâts traversant un seuil.
- Une action par tour pour le Roi, avec des coups ordinaires renforcés de 35 %. Chaque Schnaw a sa propre action et son initiative.
- Une attaque majeure par phase, annoncée au moins un round avant son déclenchement ; Turn Around laisse deux changements de round après son annonce automatique.
- Aux niveaux de groupe 6 / 10 / 15 : respectivement 1 270 / 1 890 / 2 725 PV. Les niveaux et bonus des héros continuent d’alimenter les règles de combat habituelles.
- Deux attaques puissantes par tour ont été écartées lors du contrôle de difficulté : avec les PV et les renforts supplémentaires, cette cadence écrasait le groupe même préparé.

## Phases et commandes

| PV | Phase | Stratégies et effets |
|---|---|---|
| 100–80 % | Le mépris du souverain | Sentence royale cible un personnage annoncé. Le MJ peut valider un pilier pour les personnages choisis : protection 100 %, pilier consommé. Réactions personnalisées disponibles. Une Sentence entièrement évitée ouvre deux actions offensives à +25 %. |
| 80–60 % | Le tribut de sang | Drain annoncé ; soin basé sur les dégâts réellement appliqués, plafonné à 5 % des PV du Roi. Interruption : aucun soin et deux actions offensives de héros à +25 %. Perturber l’invocation affaiblit un des futurs Schnaw, deux perturbations maximum. |
| 60–40 % | Mes sujets vous dévoreront | Deux Schnaw au total, en fin d’initiative (valeur d’arrivée 1), aucun renfort infini. Le chasseur vise un personnage isolé ; le garde vivant réduit les dégâts reçus par le Roi de 20 %. Les slots vivants existants sont préservés ; les renforts restants attendent une place. |
| 40–20 % | Le refus du destin | Balayage annoncé ; réactions, abris et réductions arbitrés par le MJ. Après son attaque majeure, trois actions offensives de héros à +25 %. |
| 20–0 % | La couronne brisée | Turn Around tente d’éteindre les dernières aurores. Chaque aurore libérée par un joueur consomme une action, sans jet obligatoire. Le MJ peut aussi valider une solution narrative. Les refuges validés réduisent de 25 / 60 / 85 / 100 % selon 0 / 1 / 2 / 3 aurores. Le déclenchement attend explicitement la validation des refuges, même si personne n’est protégé. |

Les commandes du MJ sont dans « Notes MJ — faiblesses et stratégies », sous les attaques du Roi. Les joueurs utilisent « Stratégies — Roi » dans leur panneau de combat. Les fenêtres sont défilables et fermables avec Échap ; les repères de terrain restent derrière les pions, sans intercepter leurs déplacements.

Trois aurores libérées débloquent « Appel des aurores — Odin » dans les alliés et les stratégies. L’appel est gratuit, possible hors du tour du demandeur vivant, utilisable une fois, et protège tout le groupe contre Turn Around, Bibi et John Pork compris. Une alliance rompue avec Odin demeure rompue ; aucun pouvoir normal d’Odin n’est accordé. Le Roi reste à vaincre.

Le duo Hel–Nidhogg conserve ses conditions, consommations et plafonds. Ses dégâts ne sont pas annulés par un changement de phase ; la protection du garde Schnaw reste applicable.

## Présentation et fiabilité

Les scènes reprennent uniquement les images existantes, les effets de l’aperçu et les sons POW, tremblement, Schnaw et cristal. Images redimensionnées en mémoire, rendus limités à environ 30 images/s, médias chargés par scène, préparation des images d’Odin en phase 5. Mode mouvements réduits, fermeture Échap, annulation à la sortie de carte et à la mise en arrière-plan. Les scènes ne mutent jamais les PV ou les phases.

Phases, renforts, protections, aurores et appel d’Odin sont enregistrés dans l’état du combat. Les événements visuels sont dédupliqués ; une reconnexion ne rejoue pas les anciennes scènes. Autorisations, propriété du héros, tour, phase, révision de session et identifiant d’attaque sont validés avant leurs effets respectifs. Les objets vides supprimés par Firebase sont tolérés.

## Validation

- Suite ordinaire, complétée par `tests/king.cjs` : statistiques, anciens profils, franchissement des phases, initiative, renforts bornés, garde, Sentence, drain, refuges, Odin, sauvegarde et duo.
- `tests/firebase-king.cjs` : deux MJ et trois joueurs sur émulateur local ; parcours complet puis reconnexion, commandes MJ privées, actions d’aurore, appel d’Odin malgré trahison, dégâts nuls de Turn Around, conservation des comptes/fiches/archives et validation de la sauvegarde restaurable.
- `tests/king-browser.cjs` : Edge, quatre tailles de fenêtre (320×568 à 1440×900), sept scènes avec les fichiers réels, Échap, défilement, séparation MJ/joueur et repères des aurores.
- Contrôle de difficulté par simulation à niveaux 6, 10 et 15 : 30 tirages par scénario, équipements de base. Le scénario préparé utilise les abris, l’interruption, les perturbations, les refuges et des alliés ; il ne prédit pas une partie réelle. Les personnages équipés, les décisions MJ et les stratégies narratives peuvent changer fortement l’issue.

Les sons définitifs et les voix pourront être remplacés lorsque les enregistrements seront fournis.
