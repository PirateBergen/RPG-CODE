const CAMPAIGN_ENEMY_ATTACKS = {
  weak: [
    { name:"Attaque",        icon:"⚔",  dmgMin:3,  dmgMax:8,  effect:null,    desc:"Frappe basique" }
  ],
  medium: [
    { name:"Frappe",         icon:"⚔",  dmgMin:5,  dmgMax:12, effect:null,    desc:"Attaque normale" },
    { name:"Assaut brutal",  icon:"💢", dmgMin:8,  dmgMax:18, effect:"stun",  desc:"Étourdit la cible" }
  ],
  high: [
    { name:"Coup puissant",    icon:"⚔",  dmgMin:10, dmgMax:20, effect:null,    desc:"Frappe puissante" },
    { name:"Attaque de zone",  icon:"🌀", dmgMin:6,  dmgMax:12, effect:"all",   desc:"Touche tous les joueurs" },
    { name:"Capacité spéciale",icon:"✨", dmgMin:12, dmgMax:25, effect:"curse", desc:"+1 malédiction" }
  ],
  boss: [
    { name:"Frappe dévastatrice",icon:"💥", dmgMin:20, dmgMax:40, effect:null,    desc:"Dégâts massifs" },
    { name:"Rugissement",        icon:"😤", dmgMin:8,  dmgMax:15, effect:"debuff",desc:"Force/Défense -2 pendant 2 tours" },
    { name:"Pouvoir ultime",     icon:"⚡", dmgMin:25, dmgMax:50, effect:"all",   desc:"Frappe TOUS les joueurs" }
  ]
}

const CAMPAIGN_ENEMY_ATTACK_OVERRIDES = {
  gobelins: [
    { name:"Coup de gourdin", icon:"🪵", dmgMin:4, dmgMax:9, effect:null, desc:"Un classique gobelin très mal élevé" },
    { name:"Jet de caillou", icon:"🪨", dmgMin:3, dmgMax:8, effect:null, desc:"Petit projectile, grand manque de respect" }
  ],
  loup: [
    { name:"Morsure", icon:"🦷", dmgMin:5, dmgMax:10, effect:null, desc:"Morsure rapide à la gorge" },
    { name:"Bond sauvage", icon:"🐾", dmgMin:4, dmgMax:9, effect:null, desc:"Le loup jaillit sans prévenir" }
  ],
  draugr: [
    { name:"Griffe funéraire", icon:"🪦", dmgMin:5, dmgMax:11, effect:null, desc:"Une main morte mais très motivée" },
    { name:"Souffle de caveau", icon:"💀", dmgMin:4, dmgMax:10, effect:"curse", desc:"Une haleine tombale qui colle à l'âme" }
  ],
  fantome: [
    { name:"Toucher glacé", icon:"👻", dmgMin:4, dmgMax:9, effect:null, desc:"Le froid vous traverse jusqu'à l'os" },
    { name:"Ricanement spectral", icon:"🌫", dmgMin:3, dmgMax:8, effect:null, desc:"Pas très douloureux, mais très mauvais pour le moral" }
  ],
  vampire: [
    { name:"Spider monkey", icon:"🕷", dmgMin:5, dmgMax:11, effect:null, desc:"Le vampire bondit avec une énergie très peu naturelle" },
    { name:"Glowing glass skin", icon:"✨", dmgMin:4, dmgMax:10, effect:"curse", desc:"Une beauté scintillante qui fait mal aux yeux et au reste" }
  ],
  witch: [
    { name:"No mourning", icon:"🧹", dmgMin:5, dmgMax:10, effect:"curse", desc:"La sorcière retire toute gravité à la situation, sauf les dégâts" },
    { name:"No good deed", icon:"✨", dmgMin:4, dmgMax:9, effect:null, desc:"Une bonne intention finit très mal pour la cible" }
  ],
  garde: [
    { name:"Coup de lance", icon:"🗡", dmgMin:5, dmgMax:10, effect:null, desc:"Propre, carré, réglementaire" },
    { name:"Charge au bouclier", icon:"🛡", dmgMin:4, dmgMax:9, effect:null, desc:"La garde avance, la cible recule" }
  ],
  bandit: [
    { name:"Coup sale", icon:"🔪", dmgMin:5, dmgMax:10, effect:null, desc:"Aucun honneur, un certain rendement" },
    { name:"Entaille de route", icon:"🪓", dmgMin:4, dmgMax:10, effect:null, desc:"Le péage est payable en hémoglobine" }
  ],
  ogre: [
    { name:"Couches d'onion", icon:"🧅", dmgMin:8, dmgMax:15, effect:null, desc:"L'ogre révèle de nouvelles couches de violence" },
    { name:"Fais ton RReeu", icon:"📣", dmgMin:7, dmgMax:14, effect:null, desc:"Un cri si lourd qu'il devient presque un coup" }
  ],
  dragon: [
    { name:"Morsure draconique", icon:"🐉", dmgMin:9, dmgMax:17, effect:null, desc:"Des dents premium" },
    { name:"Souffle de braise", icon:"🔥", dmgMin:8, dmgMax:15, effect:"all", desc:"Le feu règle plusieurs problèmes à la fois" }
  ],
  valkyrie: [
    { name:"Pique céleste", icon:"🪽", dmgMin:8, dmgMax:15, effect:null, desc:"Une attaque descendue d'en haut" },
    { name:"Entaille d'Asgard", icon:"⚔", dmgMin:7, dmgMax:14, effect:null, desc:"Le métal chante, la cible moins" }
  ],
  golem: [
    { name:"Poing de granite", icon:"🪨", dmgMin:10, dmgMax:18, effect:null, desc:"Une explication géologique très directe" },
    { name:"Onde de choc", icon:"💥", dmgMin:8, dmgMax:15, effect:"all", desc:"Le sol participe lui aussi" }
  ],
  pretre: [
    { name:"Sol do mi", icon:"📿", dmgMin:8, dmgMax:15, effect:"curse", desc:"Le prêtre attaque en gamme ascendante et en intensité douteuse" },
    { name:"À genoux", icon:"🕯", dmgMin:7, dmgMax:14, effect:null, desc:"L'ordre est bref, l'impact très concret" }
  ],
  fenrir: [
    { name:"Crocs du loup-monde", icon:"🐺", dmgMin:10, dmgMax:18, effect:null, desc:"La fin du monde, version morsure" },
    { name:"Déchirement du flanc", icon:"🌘", dmgMin:9, dmgMax:17, effect:null, desc:"Fenrir ouvre le combat comme un paquet cadeau" }
  ],
  zombie: [
    { name:"Claquement d'os", icon:"🧟", dmgMin:8, dmgMax:15, effect:null, desc:"Pas rapide, mais très appliqué" },
    { name:"Morsure moisie", icon:"☣", dmgMin:7, dmgMax:14, effect:"curse", desc:"Le goût reste. Longtemps." }
  ],
  zombie2: [
    { name:"Main de cave", icon:"🧟", dmgMin:8, dmgMax:14, effect:null, desc:"Une vieille habitude qui colle" },
    { name:"Morsure rance", icon:"☣", dmgMin:7, dmgMax:13, effect:"curse", desc:"Une attaque avec arrière-goût" }
  ],
  troll: [
    { name:"Patate de pont", icon:"👊", dmgMin:7, dmgMax:14, effect:null, desc:"Le troll gère les passages à sa manière" },
    { name:"Jet de gravats", icon:"🪵", dmgMin:6, dmgMax:13, effect:null, desc:"Le mobilier urbain n'est plus en sécurité" }
  ],
  cyclope: [
    { name:"Taloche monoculaire", icon:"👁", dmgMin:8, dmgMax:15, effect:null, desc:"Le cyclope vous a bien à l'œil" },
    { name:"Coup de massue", icon:"🪓", dmgMin:8, dmgMax:16, effect:null, desc:"Une discussion courte et convaincante" }
  ],
  serpentgeant: [
    { name:"Morsure constrictrice", icon:"🐍", dmgMin:9, dmgMax:17, effect:null, desc:"Ça serre et ça mord, combo classique" },
    { name:"Fouet d'écailles", icon:"🌀", dmgMin:8, dmgMax:15, effect:null, desc:"La queue fait très bien le travail" }
  ],
  balraug: [
    { name:"Fouet de feu", icon:"🔥", dmgMin:14, dmgMax:24, effect:null, desc:"Un fouet qui corrige jusqu'à l'âme" },
    { name:"Piétinement infernal", icon:"💥", dmgMin:12, dmgMax:22, effect:"all", desc:"Le sol se souvient du passage du Balraug" }
  ],
  jormungand: [
    { name:"Morsure du monde", icon:"🌊", dmgMin:15, dmgMax:26, effect:null, desc:"Le serpent-monde ferme la mâchoire sur l'horizon" },
    { name:"Vague corrosive", icon:"🫧", dmgMin:12, dmgMax:21, effect:"all", desc:"Toute la ligne prend la marée" }
  ],
  kraken: [
    { name:"Claquement de tentacule", icon:"🐙", dmgMin:14, dmgMax:24, effect:null, desc:"Le Kraken distribue des baffes maritimes" },
    { name:"Jet de maelstrom", icon:"🌊", dmgMin:12, dmgMax:20, effect:"all", desc:"Le combat devient très humide, très vite" }
  ],
  liquorice: [
    { name:"Entité démoniaque", icon:"🍬", dmgMin:7, dmgMax:13, effect:null, desc:"La réglisse assume enfin sa vraie nature cosmique" },
    { name:"Goût de cul", icon:"💀", dmgMin:6, dmgMax:12, effect:null, desc:"Le palais souffre, puis le reste du corps suit" }
  ],
  tavernier: [
    { name:"Baffe du comptoir", icon:"🍺", dmgMin:4, dmgMax:9, effect:null, desc:"Service compris, pourboire non inclus" },
    { name:"Coup de torchon", icon:"🧽", dmgMin:3, dmgMax:8, effect:null, desc:"Étonnamment humiliant" }
  ],
  soulard: [
    { name:"Moulinet ivre", icon:"🍷", dmgMin:3, dmgMax:7, effect:null, desc:"Trajectoire douteuse, impact réel" },
    { name:"Hoquet de guerre", icon:"💫", dmgMin:2, dmgMax:6, effect:null, desc:"Le souffle est une arme improvisée" }
  ],
  serveuse: [
    { name:"Revers de plateau", icon:"🍽", dmgMin:4, dmgMax:8, effect:null, desc:"Rapide, sec, professionnel" },
    { name:"Carafe expéditive", icon:"🥛", dmgMin:3, dmgMax:7, effect:null, desc:"Un service très mal orienté" }
  ],
  marchand: [
    { name:"Balance truquée", icon:"💰", dmgMin:4, dmgMax:9, effect:null, desc:"L'arnaque devient physique" },
    { name:"Contrat agressif", icon:"📜", dmgMin:4, dmgMax:8, effect:null, desc:"Les petites lignes frappent fort" }
  ],
  forgeron: [
    { name:"Marteau de forge", icon:"🔨", dmgMin:8, dmgMax:15, effect:null, desc:"Un outil devenu argument final" },
    { name:"Gerbe d'étincelles", icon:"⚒", dmgMin:6, dmgMax:12, effect:null, desc:"Le métal proteste en feu" }
  ],
  forgeron1: [
    { name:"Coup d'enclume", icon:"🔩", dmgMin:8, dmgMax:14, effect:null, desc:"Poids, précision, très peu de tendresse" },
    { name:"Scorie volante", icon:"✨", dmgMin:6, dmgMax:11, effect:null, desc:"Une petite pluie de forge" }
  ],
  voyantepnj: [
    { name:"Carte maudite", icon:"🃏", dmgMin:6, dmgMax:11, effect:"curse", desc:"La voyante tire votre pire version" },
    { name:"Prédiction acide", icon:"🔮", dmgMin:5, dmgMax:10, effect:null, desc:"L'avenir vous gifle avant l'heure" }
  ],
  "garde baldur": [
    { name:"Estoc nordique", icon:"🗡", dmgMin:6, dmgMax:12, effect:null, desc:"Le nord aime les choses simples" },
    { name:"Parade punitive", icon:"🛡", dmgMin:5, dmgMax:11, effect:null, desc:"Défense et mépris dans le même geste" }
  ],
  "child baldur": [
    { name:"Caillou héroïque", icon:"🪨", dmgMin:2, dmgMax:5, effect:null, desc:"Petit bras, grande conviction" },
    { name:"Coup de panique", icon:"💢", dmgMin:2, dmgMax:4, effect:null, desc:"Improvisé, mais sincère" }
  ],
  pnj1: [
    { name:"Poing de village", icon:"👊", dmgMin:4, dmgMax:8, effect:null, desc:"Rien de personnel, juste local" },
    { name:"Coup de botte", icon:"👢", dmgMin:3, dmgMax:7, effect:null, desc:"Un classique des places publiques" }
  ],
  pnj2: [
    { name:"Taloche civile", icon:"🖐", dmgMin:4, dmgMax:8, effect:null, desc:"Administration locale de la douleur" },
    { name:"Pichenette vexée", icon:"💢", dmgMin:3, dmgMax:6, effect:null, desc:"Le geste n'est pas grand, l'intention si" }
  ],
  oldmessager: [
    { name:"Coup de canne", icon:"🦯", dmgMin:3, dmgMax:7, effect:null, desc:"Le message était urgent, la canne aussi" },
    { name:"Avertissement sec", icon:"📯", dmgMin:3, dmgMax:6, effect:null, desc:"Un vieux ton qui claque" }
  ],
  maire: [
    { name:"Signature autoritaire", icon:"📜", dmgMin:8, dmgMax:15, effect:null, desc:"Le maire paraphe directement sur le visage" },
    { name:"Coup de marteau municipal", icon:"🏛", dmgMin:7, dmgMax:14, effect:null, desc:"Le conseil est levé, la cible aussi" }
  ],
  generalmelenchon: [
    { name:"Abattez la citadelle", icon:"📣", dmgMin:10, dmgMax:18, effect:null, desc:"L'ordre tombe avec la délicatesse d'un meeting sous tension" },
    { name:"Les frittes molles", icon:"🍟", dmgMin:9, dmgMax:17, effect:null, desc:"Une attaque politique d'une mollesse étonnamment létale" }
  ],
  "jarl baldur": [
    { name:"Commandement du jarl", icon:"👑", dmgMin:8, dmgMax:14, effect:null, desc:"Le statut social devient contondant" },
    { name:"Lame de salle longue", icon:"⚔", dmgMin:7, dmgMax:13, effect:null, desc:"Une attaque digne de la grande salle" }
  ],
  marchand2: [
    { name:"Remise brutale", icon:"🪙", dmgMin:4, dmgMax:8, effect:null, desc:"Un prix cassé, une arcade aussi" },
    { name:"Argument de comptoir", icon:"📦", dmgMin:4, dmgMax:8, effect:null, desc:"Le stock part vite, surtout à la tête" }
  ],
  gardedunord: [
    { name:"Coupe boréale", icon:"🗡", dmgMin:7, dmgMax:13, effect:null, desc:"Le froid affine le geste" },
    { name:"Charge de sentinelle", icon:"🛡", dmgMin:6, dmgMax:12, effect:null, desc:"Le rempart avance avec ses jambes" }
  ],
  garde2: [
    { name:"Taille de garnison", icon:"⚔", dmgMin:7, dmgMax:13, effect:null, desc:"Pas élégant, efficace" },
    { name:"Coup de pommeau", icon:"🪖", dmgMin:6, dmgMax:11, effect:null, desc:"Une méthode compacte et brutale" }
  ],
  conseillerroinord: [
    { name:"Conseil empoisonné", icon:"📘", dmgMin:8, dmgMax:15, effect:"curse", desc:"Un avis tranchant comme une dette" },
    { name:"Ordonnance glaciale", icon:"❄", dmgMin:7, dmgMax:13, effect:null, desc:"Le protocole fait très mal" }
  ],
  intendantbrume: [
    { name:"Taxe de brume", icon:"🌫", dmgMin:9, dmgMax:16, effect:null, desc:"Une retenue à la source, version vitale" },
    { name:"Décompte funeste", icon:"📚", dmgMin:8, dmgMax:14, effect:null, desc:"Les chiffres se referment comme une mâchoire" }
  ],
  hydre: [
    { name:"Morsure multiple", icon:"🐍", dmgMin:14, dmgMax:24, effect:null, desc:"Une tête suffit rarement" },
    { name:"Crachat venimeux", icon:"☣", dmgMin:12, dmgMax:20, effect:"all", desc:"La salle entière se fait arroser" }
  ],
  basilic: [
    { name:"Crocs minéraux", icon:"🗿", dmgMin:13, dmgMax:22, effect:null, desc:"Une pierre qui décide de mordre" },
    { name:"Reflet pétrifiant", icon:"👁", dmgMin:11, dmgMax:19, effect:null, desc:"Le regard reste collé longtemps après" }
  ],
  odin: [
    { name:"Lance du père de tout", icon:"🜂", dmgMin:16, dmgMax:27, effect:null, desc:"Gungnir a très peu de ratés" },
    { name:"Œil du savoir", icon:"👁", dmgMin:13, dmgMax:22, effect:"all", desc:"La révélation pique sur tout le groupe" }
  ],
  thor: [
    { name:"Impact de Mjolnir", icon:"⚡", dmgMin:16, dmgMax:28, effect:null, desc:"Thor argumente à coups de tonnerre" },
    { name:"Arc électrique", icon:"🌩", dmgMin:13, dmgMax:22, effect:"all", desc:"La foudre cherche des amis" }
  ],
  freya: [
    { name:"Rosée coupante", icon:"🌺", dmgMin:14, dmgMax:23, effect:null, desc:"Très beau, très douloureux" },
    { name:"Vol des vales", icon:"✨", dmgMin:12, dmgMax:20, effect:null, desc:"La grâce a pris des statistiques offensives" }
  ],
  heimdall: [
    { name:"Lame du veilleur", icon:"🌈", dmgMin:15, dmgMax:24, effect:null, desc:"Chaque coup sonne comme une alerte" },
    { name:"Signal d'alarme", icon:"📯", dmgMin:12, dmgMax:20, effect:"all", desc:"Impossible d'ignorer l'annonce" }
  ],
  roi: [
    { name:"Décret royal", icon:"👑", dmgMin:15, dmgMax:25, effect:null, desc:"Le souverain gouverne jusque dans les côtes" },
    { name:"Justice du trône", icon:"🏰", dmgMin:13, dmgMax:22, effect:"all", desc:"Le royaume frappe par ordonnance" }
  ],
  nhiddog: [
    { name:"Morsure des racines", icon:"🕳", dmgMin:14, dmgMax:24, effect:null, desc:"Le monde d'en dessous a de très bonnes dents" },
    { name:"Frappe souterraine", icon:"🌑", dmgMin:12, dmgMax:21, effect:"all", desc:"Ça remonte de très loin et très fort" }
  ],
  "elo pion": [
    { name:"Charge pionnière", icon:"♟", dmgMin:4, dmgMax:8, effect:null, desc:"Petit format, grande obstination" },
    { name:"Coup de diagonale", icon:"✨", dmgMin:3, dmgMax:7, effect:null, desc:"Presque élégant, pas vraiment" }
  ],
  "ju pion": [
    {name:"Pirouette piquante",icon:"💃",dmgMin:6,dmgMax:10,effect:null,desc:"Un pas de danse trompeur suivi d’un coup unique bien placé."},
    {name:"Couplet déroutant",icon:"🎵",dmgMin:4,dmgMax:8,effect:"debuff",desc:"Un refrain qui brouille les idées : dégâts et −2 en Force et Défense pendant 2 rounds, sans hypnose."}
  ],
  "greg pion": [
    { name:"Morsure de pion", icon:"♟", dmgMin:5, dmgMax:9, effect:null, desc:"Une agressivité disproportionnée" },
    { name:"Poussée brutale", icon:"💢", dmgMin:4, dmgMax:8, effect:null, desc:"L'avance est courte mais vexante" }
  ]
}

