"use strict"

/* ========================= */
/* ÉTATS DU JEU              */
/* ========================= */

const GAME_STATE = {
  MENU:     "MENU",
  INTRO:    "INTRO",
  DIALOGUE: "DIALOGUE",
  GAME:     "GAME",
  COMBAT:   "COMBAT"
}

/* ========================= */
/* STATS JOUEURS             */
/* ========================= */

const playerBaseStats = {
  greg: { force:6, charme:4, perspi:4, chance:4, defense:5, hp:120, poids:100 },
  ju:   { force:4, charme:5, perspi:7, chance:5, defense:4, hp:110, poids:100 },
  elo:  { force:4, charme:7, perspi:5, chance:5, defense:4, hp:110, poids:100 },
  bibi: { force:5, charme:4, perspi:4, chance:6, defense:4, hp:110, poids:100 }
}

const playerMainStat = { greg:"force", ju:"perspi", elo:"charme", bibi:"chance" }

const allStats = ["force","charme","perspi","chance","defense"]

function _getLevelUpGains(lvl) {
  if      (lvl <= 2)  return { main:2, secCount:1, secAmt:1, hp:8  }
  else if (lvl <= 3)  return { main:2, secCount:2, secAmt:1, hp:10 }
  else if (lvl <= 4)  return { main:3, secCount:2, secAmt:1, hp:10 }
  else if (lvl <= 5)  return { main:3, secCount:2, secAmt:2, hp:12 }
  else if (lvl <= 8)  return { main:3, secCount:2, secAmt:2, hp:14 }
  else if (lvl <= 12) return { main:4, secCount:2, secAmt:2, hp:16 }
  else                return { main:5, secCount:2, secAmt:3, hp:18 }
}

function getPlayerStatsAtLevel(playerId, level) {
  const base = playerBaseStats[playerId]
  const main = playerMainStat[playerId]
  if (!base) return null
  const stats = {}
  allStats.forEach(s => { stats[s] = base[s] })
  let hp = base.hp

  for (let lvl = 2; lvl <= level; lvl++) {
    const g = _getLevelUpGains(lvl)
    stats[main] += g.main
    hp += g.hp
    // Stats secondaires — réparties déterministement mais variées
    const others = allStats.filter(s => s !== main)
    const chosen = []
    for (let i = 0; i < g.secCount; i++) {
      const seed = playerId.charCodeAt(0) + lvl * 7 + i * 31
      let idx = seed % others.length
      // Éviter de choisir deux fois la même stat au même niveau
      while (chosen.includes(idx)) idx = (idx + 1) % others.length
      chosen.push(idx)
      stats[others[idx]] += g.secAmt
    }
  }
  stats.hp    = hp
  stats.poids = base.poids + (level - 1) * 2
  return stats
}

function xpForLevel(lvl) {
  let total = 0
  for (let i = 1; i < lvl; i++) total += i * 20
  return total
}

/* ========================= */
/* STATS MOBS                */
/* ========================= */

const mobStats = {
  gobelins:          { tier:"weak",   baseHP:20  },
  loup:              { tier:"weak",   baseHP:48  },
  draugr:            { tier:"weak",   baseHP:56  },
  fantome:           { tier:"weak",   baseHP:20  },
  vampire:           { tier:"weak",   baseHP:32  },
  witch:             { tier:"weak",   baseHP:24  },
  garde:             { tier:"weak",   baseHP:56  },
  bandit:            { tier:"weak",   baseHP:24  },
  ogre:              { tier:"medium", baseHP:48  },
  dragon:            { tier:"medium", baseHP:70  },
  liquorice:         { tier:"medium", baseHP:56  },
  valkyrie:          { tier:"medium", baseHP:60  },
  golem:             { tier:"high",   baseHP:100 },
  pretre:            { tier:"high",   baseHP:80  },
  balraug:           { tier:"boss",   baseHP:180 },
  fenrir:            { tier:"high",   baseHP:100 },
  jormungand:        { tier:"boss",   baseHP:360 },
  kraken:            { tier:"boss",   baseHP:390 },
  nhiddog:           { tier:"boss",   baseHP:330 },
  roi:               { tier:"boss",   baseHP:450 },
  tavernier:         { tier:"weak",   baseHP:20  },
  soulard:           { tier:"weak",   baseHP:16  },
  serveuse:          { tier:"weak",   baseHP:18  },
  marchand:          { tier:"weak",   baseHP:44  },
  forgeron:          { tier:"medium", baseHP:60  },
  forgeron1:         { tier:"medium", baseHP:56  },
  voyantepnj:        { tier:"medium", baseHP:44  },
  "garde baldur":    { tier:"medium", baseHP:32  },
  "child baldur":    { tier:"weak",   baseHP:15  },
  pnj1:              { tier:"weak",   baseHP:24  },
  pnj2:              { tier:"weak",   baseHP:24  },
  oldmessager:       { tier:"weak",   baseHP:20  },
  maire:             { tier:"high",   baseHP:90  },
  generalmelenchon:  { tier:"high",   baseHP:120 },
  "jarl baldur":     { tier:"high",   baseHP:55  },
  marchand2:         { tier:"weak",   baseHP:22  },
  gardedunord:       { tier:"medium", baseHP:60  },
  garde2:            { tier:"medium", baseHP:56  },
  conseillerroinord: { tier:"high",   baseHP:90  },
  intendantbrume:    { tier:"high",   baseHP:100 },
  zombie:            { tier:"high",   baseHP:120 },
  zombie2:           { tier:"high",   baseHP:110 },
  troll:             { tier:"medium", baseHP:80  },
  cyclope:           { tier:"medium", baseHP:85  },
  serpentgeant:      { tier:"high",   baseHP:130 },
  hydre:             { tier:"boss",   baseHP:450 },
  basilic:           { tier:"boss",   baseHP:400 },
  odin:              { tier:"boss",   baseHP:600 },
  thor:              { tier:"boss",   baseHP:550 },
  freya:             { tier:"boss",   baseHP:480 },
  heimdall:          { tier:"boss",   baseHP:520 },
  "ELO PION":        { tier:"weak",   baseHP:28  },
  "ju pion":         { tier:"weak",   baseHP:28  },
  "greg pion":       { tier:"weak",   baseHP:32  }
}

/* ========================= */
/* ATTAQUES JOUEURS          */
/* ========================= */

const attacks = {
  greg: [
    { name:"Chat Bite (CaC)",      type:"Mêlée",    dice:12, stat:"Force",        effect:"Morsure brutale",                                             crit:"Dégâts x2" },
    { name:"Le Bibi",              type:"Spécial",  dice:20, stat:"Chance",       effect:"Bibi attaque avec rage",                                      crit:"Bonus allié de +2 dégâts pendant 3 rounds" },
    { name:"I know Frank (si arc)",type:"Distance", dice:12, stat:"Perspicacité", effect:"Tir précis arc",                                              crit:"Dégâts x2 et saignement, -1 HP pendant 2 tours" }
  ],
  ju: [
    { name:"Dépêche-toi !!!",  type:"Charme",  dice:12, stat:"Perspicacité", effect:"L'ennemi cible Ju. Alliés +1 dégats",                        crit:"Mobs n'attaquent pas au prochain tour" },
    { name:"Spider Sense",     type:"Analyse", dice:10, stat:"Perspicacité", effect:"Révèle les faiblesses",                                      crit:"Augmente le loot de la victoire" },
    { name:"Petite merde",     type:"Attaque", dice:12, stat:"Force",        effect:"Attaque humiliante. Si utilisé après Spider sense, dégâts x2", crit:"l'ennemi est humilié, -1 attaque pendant 2 tours" }
  ],
  elo: [
    { name:"Mains magiques",                  type:"Soin",      dice:12, stat:"Defense", effect:"Restaure HP à soi ou allié",                                                     crit:"Pv restaurés x2" },
    { name:"Je vais te raconter une histoire",type:"Sort",      dice:12, stat:"Charme",  effect:"invoque les forces de la nature. Dégats double en forêt ou mine",                crit:"L'ennemi est empoisonné, -2 hp pendant 2 tours" },
    { name:"Je suis jet laguée",              type:"Invocation",dice:12, stat:"Chance",  effect:"Invoque un familier : bonus D4 aux attaques d’Elo pendant 3 rounds",    crit:"Le familier devient fou, dégats x2 et attaque tous les mobs" }
  ]
}

const playerSpecialAttacks = {
  greg: {
    name: "Crâne de Frank",
    type: "Spécial",
    dice: 20,
    stat: "Force",
    effect: "Exécution brutale sur cible affaiblie",
    crit: "Dégâts colossaux",
    fail: "Greg vacille et rate sa fenêtre d'exécution.",
    conditionText: "Cible à 40% HP ou moins",
    flavor: "Greg lâche toute retenue et termine le travail sans élégance.",
    icon: "slash_overlay.png",
    rule: "mob_below_forty",
    damageBonus: 1.95
  },
  ju: {
    name: "Plan qui tourne trop bien",
    type: "Spécial",
    dice: 20,
    stat: "Perspicacité",
    effect: "Riposte de précision après la spéciale ennemie",
    crit: "Rupture totale des défenses",
    fail: "Le plan s'effondre et Yu révèle trop tôt son jeu.",
    conditionText: "La cible a déjà utilisé sa spéciale",
    flavor: "Ju attend exactement le moment où l'ennemi se croit intouchable.",
    icon: "rune_glow.png",
    rule: "mob_used_special",
    damageBonus: 1.8
  },
  elo: {
    name: "C'est fou ce dont les humains sont capables",
    type: "Spécial",
    dice: 20,
    stat: "Charme",
    effect: "Déchaîne la nature et soigne le groupe quand il vacille",
    crit: "Soin du groupe renforcé",
    fail: "L'incantation se brise, mais un souffle d'espoir subsiste.",
    conditionText: "Un allié à 60% HP ou moins",
    flavor: "Elo appelle une histoire si vieille qu'elle mord encore.",
    icon: "rune_glow.png",
    rule: "ally_below_sixty",
    damageBonus: 1.7
  },
  bibi: {
    name: "Le zoomies final",
    type: "Spécial",
    dice: 20,
    stat: "Chance",
    effect: "Bibi déchaîne son chaos canin",
    crit: "Dégâts massifs",
    fail: "Bibi s'éparpille et ne trouve pas sa cible.",
    conditionText: "Greg à 20% HP ou moins",
    flavor: "Quand Bibi craque, tout le champ de bataille le sent.",
    icon: "fang.png",
    rule: "greg_below_twenty",
    damageBonus: 1.85
  }
}

/* ========================= */
/* ATTAQUES MOBS             */
/* ========================= */

const mobAttacks = {
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

const mobAttackOverrides = {
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
  "ELO PION": [
    { name:"Charge pionnière", icon:"♟", dmgMin:4, dmgMax:8, effect:null, desc:"Petit format, grande obstination" },
    { name:"Coup de diagonale", icon:"✨", dmgMin:3, dmgMax:7, effect:null, desc:"Presque élégant, pas vraiment" }
  ],
  "ju pion": [
    { name:"Calcul d'échec", icon:"♟", dmgMin:4, dmgMax:8, effect:null, desc:"Le pion pense trop, frappe assez" },
    { name:"Percée maladroite", icon:"💥", dmgMin:3, dmgMax:7, effect:null, desc:"La stratégie finit dans le tibia" }
  ],
  "greg pion": [
    { name:"Morsure de pion", icon:"♟", dmgMin:5, dmgMax:9, effect:null, desc:"Une agressivité disproportionnée" },
    { name:"Poussée brutale", icon:"💢", dmgMin:4, dmgMax:8, effect:null, desc:"L'avance est courte mais vexante" }
  ]
}

const mobSpecialAnimations = {
  bloodmoon: { accent:"#d14b6a", glow:"rgba(209,75,106,0.55)", bg:"radial-gradient(circle at center,rgba(90,0,20,0.92) 0%,rgba(20,0,8,0.98) 70%)" },
  howl:      { accent:"#89d1ff", glow:"rgba(90,170,255,0.52)", bg:"radial-gradient(circle at center,rgba(10,30,50,0.92) 0%,rgba(3,8,18,0.98) 72%)" },
  spectral:  { accent:"#c8f6ff", glow:"rgba(130,240,255,0.5)", bg:"radial-gradient(circle at center,rgba(8,42,46,0.94) 0%,rgba(2,10,12,0.98) 74%)" },
  venom:     { accent:"#8cff75", glow:"rgba(120,255,90,0.48)", bg:"radial-gradient(circle at center,rgba(18,56,8,0.92) 0%,rgba(6,14,4,0.98) 72%)" },
  arcane:    { accent:"#d7a8ff", glow:"rgba(181,120,255,0.55)", bg:"radial-gradient(circle at center,rgba(44,18,70,0.94) 0%,rgba(10,4,18,0.98) 72%)" },
  fire:      { accent:"#ff9b57", glow:"rgba(255,120,50,0.58)", bg:"radial-gradient(circle at center,rgba(82,20,0,0.94) 0%,rgba(18,4,0,0.98) 74%)" },
  storm:     { accent:"#9ad6ff", glow:"rgba(110,190,255,0.54)", bg:"radial-gradient(circle at center,rgba(16,34,76,0.94) 0%,rgba(4,8,18,0.98) 72%)" },
  stone:     { accent:"#d0c2a6", glow:"rgba(180,160,120,0.45)", bg:"radial-gradient(circle at center,rgba(48,38,22,0.94) 0%,rgba(14,10,6,0.98) 72%)" },
  abyss:     { accent:"#6ce2d9", glow:"rgba(50,220,210,0.5)", bg:"radial-gradient(circle at center,rgba(0,44,56,0.94) 0%,rgba(0,8,12,0.99) 74%)" },
  divine:    { accent:"#ffe08a", glow:"rgba(255,214,120,0.52)", bg:"radial-gradient(circle at center,rgba(90,62,12,0.94) 0%,rgba(20,12,2,0.98) 72%)" },
  royal:     { accent:"#ffcf7f", glow:"rgba(255,170,70,0.55)", bg:"radial-gradient(circle at center,rgba(80,28,8,0.94) 0%,rgba(20,4,0,0.98) 74%)" },
  tavern:    { accent:"#ffd9a0", glow:"rgba(255,210,150,0.45)", bg:"radial-gradient(circle at center,rgba(90,48,12,0.94) 0%,rgba(20,10,2,0.98) 74%)" }
}

const mobSpecialAttacks = {
  gobelins: { name:"Les sournoiseries du gobelin", icon:"💣", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Une pluie de bombes artisanales mal fabriquées, mais avec enthousiasme." },
  loup: { name:"Hurlement de meute", icon:"🐺", dmgMin:8, dmgMax:14, effect:null, animation:"howl", flavor:"Un hurlement glacial annonce la morsure coordonnée." },
  draugr: { name:"WHAAAAAA", icon:"🪦", dmgMin:10, dmgMax:17, effect:"curse", animation:"spectral", flavor:"Le draugr s'exprime dans la langue des Dieux." },
  fantome: { name:"Dance or die", icon:"👻", dmgMin:8, dmgMax:13, effect:null, animation:"spectral", flavor:"Le fantôme danse et son rythme est insoutenable." },
  vampire: { name:"La vie en oah oah", icon:"🩸", dmgMin:12, dmgMax:20, effect:"curse", animation:"bloodmoon", flavor:"Si si je vous promets que je suis une dangereuse créature." },
  witch: { name:"Défier la gravité", icon:"🧪", dmgMin:11, dmgMax:18, effect:"curse", animation:"arcane", flavor:"Regardez à l'Ouest.", },
  garde: { name:"J'ai pris une flèche dans le genou", icon:"🛡", dmgMin:10, dmgMax:16, effect:null, animation:"stone", flavor:"Le garde raconte son histoire et la pitié vous envahie." },
  bandit: { name:"Tres tres vilain", icon:"🪓", dmgMin:8, dmgMax:15, effect:null, animation:"tavern", flavor:"Un coup bas, mal annoncé, mais très appliqué." },
  ogre: { name:"It's all ogre now", icon:"🌳", dmgMin:14, dmgMax:22, effect:null, animation:"stone", flavor:"L'ogre prononce sa catchphrase et tout le monde regrette d'être venu." },
  dragon: { name:"Thu'um draconique", icon:"🐉", dmgMin:16, dmgMax:26, effect:"all", animation:"fire", flavor:"Ne soyez pas si arrogants, humanoïdes." },
  liquorice: { name:"Bonbon piégé", icon:"🍬", dmgMin:12, dmgMax:18, effect:null, animation:"arcane", flavor:"Quiconque ose y goûter s'assèche instantanément." },
  valkyrie: { name:"Chute de lance", icon:"🪽", dmgMin:14, dmgMax:22, effect:null, animation:"divine", flavor:"La lance traverse le ciel comme un verdict déjà signé." },
  golem: { name:"Écrasement tectonique", icon:"🪨", dmgMin:15, dmgMax:24, effect:null, animation:"stone", flavor:"Le sol oublie sa fonction de sol." },
  pretre: { name:"Mon cierge est allumé, la cire prête à couler", icon:"📿", dmgMin:16, dmgMax:24, effect:"curse", animation:"divine", flavor:"Le sermon dérape immédiatement vers quelque chose de très peu canonique." },
  fenrir: { name:"Le son de la fin du monde", icon:"🌘", dmgMin:16, dmgMax:25, effect:null, animation:"howl", flavor:"Fenrir hurle sous la lune et invoque le Ragnarok." },
  zombie: { name:"Marche des morceaux", icon:"🧟", dmgMin:13, dmgMax:20, effect:null, animation:"venom", flavor:"Chaque membre participe, même sans coordination centrale." },
  zombie2: { name:"Morsure recyclée", icon:"☣", dmgMin:13, dmgMax:19, effect:"curse", animation:"venom", flavor:"Rien n'est frais, tout est offensant." },
  troll: { name:"Pont cassé", icon:"🪵", dmgMin:12, dmgMax:18, effect:null, animation:"stone", flavor:"Le troll frappe comme si la route lui appartenait." },
  cyclope: { name:"Regard du mal calibré", icon:"👁", dmgMin:13, dmgMax:20, effect:null, animation:"stone", flavor:"Un seul œil, mais une très mauvaise intention." },
  serpentgeant: { name:"Constriction abyssale", icon:"🐍", dmgMin:15, dmgMax:24, effect:null, animation:"abyss", flavor:"Le serpent décide que respirer est devenu optionnel." },
  balraug: { name:"Coup de fouet bien placé", icon:"🔥", dmgMin:25, dmgMax:38, effect:"all", animation:"fire", flavor:"Le Balraug bloque le passage avec une autorité tout à fait litigieuse." },
  jormungand: { name:"Raz de marée", icon:"🌊", dmgMin:24, dmgMax:36, effect:"all", animation:"abyss", flavor:"Le serpent sort de l'eau et sa taille fait trembler le monde." },
  kraken: { name:"Fatale tentacule", icon:"🐙", dmgMin:23, dmgMax:35, effect:"all", animation:"abyss", flavor:"Le Kraken surgit et sa masse fait trembler le monde." },
  nhiddog: { name:"Faim insatiable", icon:"🕳", dmgMin:21, dmgMax:33, effect:"all", animation:"abyss", flavor:"Le dragon affamé suce le sang de ses opposants." },
  hydre: { name:"Conseil de têtes", icon:"🐍", dmgMin:24, dmgMax:38, effect:"all", animation:"venom", flavor:"Personne n'est d'accord, sauf sur le fait de vous dévorer." },
  basilic: { name:"Œil qui fige", icon:"🗿", dmgMin:22, dmgMax:34, effect:null, animation:"venom", flavor:"Le regard pèse comme une pierre vivante." },
  roi: { name:"Impôt terminal", icon:"👑", dmgMin:26, dmgMax:40, effect:"all", animation:"royal", flavor:"Le roi prélève directement en points de vie." },
  odin: { name:"Décret du borgne", icon:"🜂", dmgMin:28, dmgMax:42, effect:"all", animation:"divine", flavor:"Une sentence divine, cosmique, et très peu négociable." },
  thor: { name:"Procès-verbal de Mjolnir", icon:"⚡", dmgMin:27, dmgMax:41, effect:"all", animation:"storm", flavor:"Le tonnerre signe son nom sur tout le groupe." },
  freya: { name:"Grâce qui blesse", icon:"🌺", dmgMin:24, dmgMax:36, effect:null, animation:"divine", flavor:"Une beauté si parfaite qu'elle devient offensive." },
  heimdall: { name:"Alarme du pont", icon:"🌈", dmgMin:24, dmgMax:37, effect:"all", animation:"storm", flavor:"Heimdall sonne la fin avant même qu'elle commence." },
  tavernier: { name:"Tournée générale de baffes", icon:"🍺", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Le tavernier sert chaud, vite, et avec l'avant-bras." },
  soulard: { name:"Chanson de fin de tonneau", icon:"🍷", dmgMin:6, dmgMax:10, effect:null, animation:"tavern", flavor:"Le rythme est faux mais le coup porte." },
  serveuse: { name:"Plateau orbital", icon:"🍽", dmgMin:7, dmgMax:11, effect:null, animation:"tavern", flavor:"Un service express directement à la mâchoire." },
  marchand: { name:"Offre non remboursable", icon:"💰", dmgMin:8, dmgMax:13, effect:null, animation:"royal", flavor:"Le marchand facture désormais à l'unité de douleur." },
  marchand2: { name:"Promotion létale", icon:"🪙", dmgMin:8, dmgMax:13, effect:null, animation:"royal", flavor:"Deux achetés, trois bleus offerts." },
  forgeron: { name:"Enclume du destin", icon:"🔨", dmgMin:12, dmgMax:19, effect:null, animation:"fire", flavor:"Chaque frappe résonne jusque dans la colonne vertébrale." },
  forgeron1: { name:"Reprise à chaud", icon:"⚒", dmgMin:11, dmgMax:18, effect:null, animation:"fire", flavor:"Le métal n'est pas le seul à plier." },
  maire: { name:"Discours d'urgence", icon:"📜", dmgMin:14, dmgMax:22, effect:null, animation:"royal", flavor:"Une allocution si longue qu'elle devient contondante." },
  generalmelenchon: { name:"MAIS QUI ELLE EST CELLE LA", icon:"📣", dmgMin:18, dmgMax:27, effect:"all", animation:"royal", flavor:"Humiliation gauchiste sans torticolis." }
  ,chnaw: { name:"Regroupement", icon:"📸", dmgMin:17, dmgMax:26, effect:"all", animation:"tavern", flavor:"Les chnaws se multiplient jusqu'à écraser quiconque se met en travers de leur chemin." }
}

function _getFallbackMobSpecialAttack(mobName, mobTier) {
  const label = String(mobName || "créature").toUpperCase()
  if (mobTier === "boss") return { name:"Cataclysme de " + label, icon:"☄", dmgMin:22, dmgMax:36, effect:"all", animation:"abyss", flavor:"Le boss décide que la nuance n'est plus nécessaire." }
  if (mobTier === "high") return { name:"Signature maudite", icon:"✦", dmgMin:14, dmgMax:24, effect:"curse", animation:"arcane", flavor:"Une technique personnelle visiblement interdite dans plusieurs royaumes." }
  if (mobTier === "medium") return { name:"Montée en pression", icon:"💢", dmgMin:10, dmgMax:17, effect:null, animation:"stone", flavor:"Le combat prend soudain un ton bien moins raisonnable." }
  return { name:"Sale surprise", icon:"🗡", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Petit gabarit, mauvaises idées." }
}

function getMobSpecialAttack(mobName, mobTier) {
  const key = String(mobName || "").toLowerCase()
  const attack = mobSpecialAttacks[key] || _getFallbackMobSpecialAttack(mobName, mobTier)
  return attack ? { ...attack, special:true, oncePerCombat:true } : null
}

function getMobAttacksForMob(mobName, mobTier) {
  const key = String(mobName || "").toLowerCase()
  const attacks = mobAttackOverrides[key]
  if (attacks && attacks.length) return attacks.map(attack => ({ ...attack }))
  return (mobAttacks[mobTier] || mobAttacks.weak).map(attack => ({ ...attack }))
}

const mobWeaknesses = {
  gobelins: [
    { title:"Peur de se faire voler", text:"La menace de perdre ses biens ou son butin le paralyse instantanément." },
    { title:"Achetable",              text:"Une pièce d'or bien placée suffit à retourner sa loyauté sans crier gare." },
    { title:"Dragueur",               text:"Un regard ou un compliment appuyé détourne son attention plus sûrement qu'une attaque." }
  ],
  loup: [
    { title:"Gooner",              text:"Un regard trop insistant ou une posture trop attrayante le paralyse complètement." },
    { title:"Hurle à la lune",     text:"Quand la lune est couverte ou qu'on détourne son attention du ciel, son élan s'effondre." },
    { title:"Peur des chasseurs",  text:"Le moindre geste ou odeur de chasseur aguerri déclenche une fuite instinctive." }
  ],
  draugr: [
    { title:"Allergie à la poussière", text:"La poussière qu'il traîne depuis des siècles finit par devenir un vrai problème." },
    { title:"Peur des Thu'um", text:"Le simple écho d'un cri nordique bien placé fait vibrer ses vieux os." },
    { title:"Cryptomanie", text:"Dès qu'on menace son petit confort de caveau, toute sa concentration s'effondre." }
  ],
  fantome: [
    { title:"Peur des aspirateurs", text:"Le simple bruit d'une aspiration un peu trop énergique menace instantanément son intégrité spectrale." },
    { title:"Crise existentielle", text:"Le moindre doute sur sa condition le fige dans une grande spirale métaphysique." },
    { title:"Peur d'être oublié", text:"Ignoré trop longtemps, il perd contenance et se dissipe presque de lui-même." }
  ],
  vampire: [
    { title:"Peur des loups", text:"Le moindre rappel lupin suffit à fissurer sa superbe." },
    { title:"Sensible aux odeurs", text:"Les parfums trop francs, l'ail ou une odeur humide lui coupent le style." },
    { title:"Jalousie maladive", text:"Tout ce qui menace son grand roman romantique le fait perdre ses moyens." }
  ],
  witch: [
    { title:"Menace de Glinda", text:"Le simple souvenir de sa grande rivale suffit à lui faire perdre sa superbe." },
    { title:"Cause animale", text:"Dès qu'on évoque des bêtes maltraitées, sa colère brouille sa magie." },
    { title:"Blessure d'orgueil", text:"Les moqueries et le ridicule public réveillent tout ce qu'elle essaie de dominer." }
  ],
  garde: [
    { title:"Vision rognée par son casque", text:"Son champ de vision réduit le rend aveugle sur les côtés — un simple pas de côté suffit à le dérouter." },
    { title:"Peur des dragons",             text:"La simple évocation d'un dragon le fait reculer d'un pas. Personne ne lui a dit qu'il n'y en avait pas ici." },
    { title:"Aime la politique",            text:"Lancez un débat sur la gouvernance du royaume — il oubliera immédiatement pourquoi il était là." }
  ],
  bandit: [
    { title:"Paperasse",  text:"La simple mention d'un formulaire de déclaration de vol le paralyse. Il aurait dû régulariser sa situation." },
    { title:"Autographe", text:"Lui demander un autographe le désarme complètement — il a toujours rêvé d'être célèbre." },
    { title:"Reçu",       text:"Exiger un reçu pour le vol en cours le plonge dans une crise administrative dont il ne se remet pas." }
  ],
  ogre: [
    { title:"Effrayé par les petites personnes", text:"Les petites silhouettes trop sûres d'elles troublent profondément sa logique d'ogre." },
    { title:"Ne résiste pas à un oignon", text:"Un simple oignon détourne instantanément toute sa concentration." },
    { title:"Déteste qu'on lui parle trop", text:"Les longs discours et les remarques incessantes lui font perdre ses moyens." }
  ],
  dragon: [
    { title:"Peur des Thu'um", text:"Le moindre écho d'un cri draconique bien lancé réveille un instinct très ancien." },
    { title:"Voleurs de trésors", text:"La simple idée qu'on touche à son butin suffit à lui faire perdre son calme." },
    { title:"Ventre mou", text:"Sous toute cette majesté écailleuse, il reste une zone bien moins glorieuse à protéger." }
  ],
  liquorice: [
    { title:"L'eau",                         text:"Un simple verre d'eau suffit à dissoudre sa confiance en lui." },
    { title:"Les amateurs de bonbons salés", text:"Leur enthousiasme pour sa propre technique le déstabilise complètement." },
    { title:"Le sucre",                      text:"La présence de sucre pur dans son voisinage provoque une réaction de rejet incontrôlable." }
  ],
  valkyrie: [
    { title:"Syndrome de l'imposteur divin", text:"Elle se demande secrètement si elle mérite vraiment Asgard. Un seul doute exprimé à voix haute la fige sur place." },
    { title:"Jalousie",                      text:"Complimenter une autre guerrière devant elle déclenche une crise d'ego qui court-circuite son attaque." },
    { title:"Refus du destin",               text:"Lui dire \"tu n'es pas sur ma liste\" la plonge dans une crise existentielle dont elle ne sort pas vite." }
  ],
  golem:             { title:"Fissures et résonance", text:"Les impacts lourds répétés et la foudre ouvrent sa pierre." },
  pretre: [
    { title:"Déstabilisé par les enfants", text:"La présence des enfants fait vaciller son masque et brouille sa contenance." },
    { title:"Regard lubrique", text:"Un simple trouble charnel suffit à le déconcentrer et à fissurer son autorité." },
    { title:"Peur de Dieu", text:"L'idée d'un vrai jugement divin le glace bien plus qu'il ne l'admet." }
  ],
  balraug: [
    { title:"Eau", text:"Tout ce qui évoque l'eau, l'extinction ou l'étouffement de la braise lui coupe l'élan." },
    { title:"Peur du vide", text:"Le moindre rappel d'une chute sans fin fissure sa superbe infernale." },
    { title:"Peur de la magie", text:"Les forces occultes qu'il ne contrôle pas lui inspirent une vraie méfiance." }
  ],
  fenrir: [
    { title:"Peur des chaînes", text:"Les chaînes, les entraves et tout ce qui rappelle sa captivité suffisent à freiner sa rage." },
    { title:"Mâchoire vulnérable", text:"Sa mâchoire porte toute sa fureur : une frappe nette à cet endroit suffit à le dérégler." },
    { title:"Solitude de la meute", text:"Séparé des siens, Fenrir perd une partie de sa fureur et de sa présence." },
    { title:"Fratrie décimée", text:"La mort de Jormungand fissure sa volonté et laisse apparaître une vraie faille.", requiresDefeatedMob:"jormungand" }
  ],
  jormungand: [
    { title:"Fratrie décimée", text:"La mort de Fenrir fissure sa volonté et laisse apparaître une vraie faille.", requiresDefeatedMob:"fenrir" },
    { title:"Solitude", text:"Séparé de tout ce qui lui rappelle le monde, il perd une partie de sa présence et de sa rage." },
    { title:"Peur de Thor", text:"Le simple souvenir du tonnerre et du marteau suffit à troubler ses instincts les plus anciens." }
  ],
  kraken: [
    { title:"Boulet de canon", text:"Les vieux réflexes maritimes remontent vite quand il sent qu'on veut vraiment le couler." },
    { title:"Davy Jones", text:"Tout ce qui rappelle les abysses maudites et les pactes marins trouble sa rage." },
    { title:"Terre ferme", text:"Loin de l'océan et de son élément, sa majesté tentaculaire perd nettement en présence." }
  ],
  nhiddog: [
    { title:"Obsession de se nourrir", text:"Le pousse à se précipiter bêtement dès qu'il croit sentir une proie facile." },
    { title:"Dépression", text:"Le poids de son existence souterraine l'alourdit dès qu'on l'isole ou qu'on lui résiste." },
    { title:"Folie", text:"Ses pulsions deviennent erratiques et il perd toute discipline quand on le pousse à bout." }
  ],
  roi:               { title:"Humiliation publique", text:"Craque plus vite quand son autorité est tournée au ridicule." },
  tavernier:         { title:"Désordre", text:"Le chaos, les meubles qui volent et les attaques imprévisibles le dérèglent." },
  soulard:           { title:"Vertige", text:"Supporte mal les frappes rapides et tout ce qui lui fait perdre l'appui." },
  serveuse:          { title:"Espace réduit", text:"Ses grands gestes deviennent dangereux pour elle quand on la colle." },
  marchand:          { title:"Panique comptable", text:"Dès qu'il perd le contrôle, toute sa confiance s'effondre." },
  forgeron:          { title:"Refroidissement", text:"Le froid et les interruptions au rythme de frappe le punissent." },
  forgeron1:         { title:"Acier cassant", text:"Les chocs soudains et le gel lui coupent son tempo." },
  voyantepnj:        { title:"Brouillage", text:"Les actions imprévisibles brisent ses lectures d'avenir." },
  "garde baldur":    { title:"Excès de confiance", text:"Une feinte bien placée ou une attaque dans le dos fissure sa tenue." },
  "child baldur":    { title:"Fuite", text:"Le moindre gros impact ou cri d'autorité le fait hésiter." },
  pnj1:              { title:"Peur simple", text:"Rien de subtil : une vraie pression suffit à le faire flancher." },
  pnj2:              { title:"Peur simple", text:"Rien de subtil : une vraie pression suffit à le faire flancher." },
  oldmessager:       { title:"Équilibre ancien", text:"Ses appuis sont mauvais, il supporte mal les charges." },
  maire:             { title:"Pression publique", text:"Plus il est contredit frontalement, plus il se décompose." },
  generalmelenchon: [
    { title:"Peur des blondes", text:"Toute présence blonde le fait dérailler de sa ligne oratoire." },
    { title:"Frites molles", text:"Une frite trop molle suffit à ruiner son autorité gastronomique." },
    { title:"Il est sourd", text:"Les ordres, les objections et les nuances ont tendance à lui échapper complètement." }
  ],
  chnaw: [
    { title:"Touriste de l'extrême", text:"Dès qu'il aperçoit un angle parfait, il oublie totalement le combat pour capturer le meilleur cliché." },
    { title:"Ne se déplace qu'en groupe", text:"Isolé, il perd tout courage et toute coordination." },
    { title:"Barrière de langue", text:"Le moindre malentendu ou ordre mal compris suffit à briser son élan collectif." }
  ],
  "jarl baldur":     { title:"Orgueil de chef", text:"A du mal à encaisser une riposte brillante ou une humiliation claire." },
  marchand2:         { title:"Nerfs fragiles", text:"Dès que la scène sort de son contrôle, il perd ses moyens." },
  gardedunord:       { title:"Froid retourné", text:"Supporte mal les attaques rapides qui cassent sa formation." },
  garde2:            { title:"Formation brisée", text:"La garde tombe dès que le rythme du duel lui échappe." },
  conseillerroinord: { title:"Déstabilisation", text:"Les surprises et les attaques peu orthodoxes lui font perdre son calme." },
  intendantbrume:    { title:"Lumière nette", text:"Les effets francs, lumineux et directs percent sa brume politique." },
  zombie:            { title:"Tête et feu", text:"Le feu et les frappes nettes à la tête restent la solution classique." },
  zombie2:           { title:"Tête et feu", text:"Le feu et les frappes nettes à la tête restent la solution classique." },
  troll:             { title:"Articulations", text:"Les genoux et les chevilles tiennent tout ce tas de muscles ensemble." },
  cyclope:           { title:"Œil unique", text:"Toute pression sur sa vision le rend beaucoup moins fiable." },
  serpentgeant:      { title:"Cou torsadé", text:"N'aime ni les entraves ni les attaques sur le milieu du corps." },
  hydre:             { title:"Coordination", text:"Les attaques qui cassent son rythme ou frappent pendant qu'elle se divise la punissent." },
  basilic:           { title:"Miroirs et éclats", text:"Ce qui retourne son regard contre lui le gêne énormément." },
  odin:              { title:"Hubris divine", text:"Supporte mal les gestes imprévus et ceux qui défient sa lecture du destin." },
  thor:              { title:"Contre-rythme", text:"Quand on casse son élan, sa force devient moins propre." },
  freya:             { title:"Distraction du cœur", text:"Les charmes, la confusion et la rupture du tempo la troublent." },
  heimdall:          { title:"Saturation", text:"Trop d'effets à la fois brouillent sa vigilance parfaite." },
  "elo pion":        { title:"Fragile", text:"Une vraie pression suffit à l'écarter." },
  "ju pion":         { title:"Fragile", text:"Une vraie pression suffit à l'écarter." },
  "greg pion":       { title:"Fragile", text:"Une vraie pression suffit à l'écarter." }
}

/**
 * DA par mob — couleur accent + tint de fond.
 * Chaque mob qui a une entrée ici reçoit une classe CSS `mobPanel--{key}`
 * sur son sous-panel de combat pour appliquer la direction artistique.
 * Les mobs sans entrée conservent le style par défaut (rouge sombre).
 */
const mobThemes = {
  loup:      { key: "loup" },
  // à compléter mob par mob
}

function getMobTheme(mobName) {
  const key = String(mobName || "").toLowerCase()
  return mobThemes[key] || null
}

function getMobWeakness(mobName, mobTier = "weak") {
  const key = String(mobName || "").toLowerCase()
  const weakness = mobWeaknesses[key]
  if (weakness) {
    const rawPool = Array.isArray(weakness)
      ? weakness
      : [
          weakness,
          {
            title: weakness.title + " instable",
            text: weakness.text + " Une pression continue finit par l'y forcer."
          },
          {
            title: "Rupture de rythme",
            text: weakness.text + " Si on casse son tempo, la faille devient évidente."
          }
        ]
    const defeatedMobs = (typeof window !== "undefined" && window.__defeatedMobFlags) ? window.__defeatedMobFlags : {}
    const pool = rawPool.filter(entry => {
      if (!entry || !entry.requiresDefeatedMob) return true
      return !!defeatedMobs[String(entry.requiresDefeatedMob).toLowerCase()]
    })
    const usablePool = pool.length ? pool : rawPool.filter(entry => !entry?.requiresDefeatedMob)
    const pick = usablePool[Math.floor(Math.random() * usablePool.length)] || weakness
    return { ...pick }
  }
  const fallbackByTier = {
    weak: [
      { title:"Mauvaise défense", text:"Cède sous la pression et les attaques franches." },
      { title:"Rythme cassé", text:"Perd ses moyens si on l'agresse sans lui laisser reprendre l'initiative." },
      { title:"Panique rapide", text:"Une démonstration brutale suffit souvent à le faire hésiter." }
    ],
    medium: [
      { title:"Rythme cassé", text:"Perd ses moyens quand on brise son tempo." },
      { title:"Ouverture latérale", text:"Supporte mal les attaques qui changent brutalement d'angle." },
      { title:"Pression continue", text:"Dès qu'on le force à répondre trop vite, sa garde descend." }
    ],
    high: [
      { title:"Faute d'orgueil", text:"Déteste les ripostes brillantes et les coups humiliants." },
      { title:"Concentration brisée", text:"Une interruption nette peut faire tomber tout son plan." },
      { title:"Tempo retourné", text:"Si on l'oblige à subir le rythme, sa puissance devient moins propre." }
    ],
    boss: [
      { title:"Ouverture rare", text:"Attend le moment où il surestime sa propre domination." },
      { title:"Point de rupture", text:"Même un monstre finit par laisser une faille quand son enchaînement se dérègle." },
      { title:"Excès de confiance", text:"Plus il pense avoir gagné, plus la contre-attaque a de valeur." }
    ]
  }
  const fallbackPool = fallbackByTier[mobTier] || fallbackByTier.weak
  const pick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)] || fallbackPool[0]
  return { ...pick }
}

const mobSpecialPresentations = {
  valkyrie: {
    scene: "valkyrie",
    sound: "impact.mp3",
    soundVolume: 0.68,
    kicker: "Jugement céleste",
    emphasis: "divine",
    particles: [],
    image: "valkyrie.png",
    quoteFrame: "cadre.png"
  },
  liquorice: {
    scene: "liquorice",
    sound: "liquorice.mp3",
    soundVolume: 0.70,
    kicker: "Assèchement sucré",
    emphasis: "arcane",
    particles: [],
    image: "sel.png",
    quoteFrame: "cadre.png"
  },
  garde: {
    scene: "garde",
    sound: "garde.mp3",
    soundVolume: 0.65,
    kicker: "Flèche dans le genou",
    emphasis: "stone",
    particles: [],
    image: "gardespé.jpg",
    quoteFrame: "cadre.png"
  },
  bandit: {
    scene: "bandit",
    sound: "bandit.mp3",
    soundVolume: 0.68,
    kicker: "Coupe gorge",
    emphasis: "sneak",
    particles: [],
    quoteFrame: "cadre.png",
    slideImages: ["banditspé.jpg","banditspé1.jpg","banditspé2.jpg","banditspé3.jpg"]
  },
  gobelins: {
    scene: "gobelins",
    sound: "gobelinspé.mp3",
    soundVolume: 0.7,
    kicker: "Pluie de ferraille",
    emphasis: "chaos",
    particles: [],
    quoteFrame: "cadre.png"
  },
  loup: {
    scene: "loup",
    sound: "loup.mp3",
    soundVolume: 0.72,
    kicker: "Meute unie",
    emphasis: "howl",
    particles: [],
    image: "loupspé.jpg",
    quoteFrame: "cadre.png"
  },
  fantome: {
    scene: "fantome",
    sound: "fantome.mp3",
    soundVolume: 0.72,
    kicker: "Disco d'outre-tombe",
    emphasis: "spectral",
    particles: [],
    video: "fantome.mp4",
    quoteFrame: "cadre.png"
  },
  vampire: {
    scene: "vampire",
    sound: "vampire spé.mp3",
    soundVolume: 0.58,
    image: "lune.png",
    kicker: "Moonlit menace",
    emphasis: "seductive",
    particles: [],
    sparkleImage: "paillettes.png",
    quoteFrame: "cadre.png"
  },
  witch: {
    scene: "witch",
    sound: "witch1.mp3",
    soundVolume: 0.24,
    kicker: "Wicked resonance",
    emphasis: "floating",
    particles: [],
    image: "witchspé.png",
    quoteFrame: "cadre.png"
  },
  draugr: {
    scene: "draugr",
    sound: "draugr.mp3",
    soundVolume: 0.5,
    kicker: "Crypt rupture",
    emphasis: "scream",
    particles: [],
    video: "draugrspé.mp4",
    quoteFrame: "cadre.png"
  },
  dragon: {
    scene: "dragon",
    sound: "dragonspé.mp3",
    soundVolume: 0.62,
    kicker: "Voix du feu",
    emphasis: "royal",
    particles: [],
    image: "dragonspé.jpg",
    quoteFrame: "cadre.png"
  },
  ogre: {
    scene: "ogre",
    sound: "ogre.mp3",
    soundVolume: 0.56,
    kicker: "Heavy impact",
    emphasis: "slam",
    particles: [],
    image: "ogrespé.jpg",
    quoteFrame: "cadre.png"
  },
  pretre: {
    scene: "pretre",
    sound: "osana.mp3",
    soundVolume: 0.9,
    kicker: "Liturgie trouble",
    emphasis: "ritual",
    particles: [],
    image: "pretrespé.png",
    quoteFrame: "cadre.png"
  },
  chnaw: {
    scene: "chnaw",
    sound: "chnaws.mp3",
    soundVolume: 0.76,
    kicker: "Multiplication de terrain",
    emphasis: "flash",
    particles: [],
    quoteFrame: "cadre.png"
  },
  fenrir: {
    scene: "fenrir",
    sound: "fenrir.mp3",
    soundVolume: 0.78,
    kicker: "Ragnarok imminent",
    emphasis: "howl",
    particles: [],
    image: "fenrirspé.jpg",
    quoteFrame: "cadre.png"
  },
  jormungand: {
    scene: "jormungand",
    sound: "jormspé.mp3",
    soundVolume: 0.8,
    kicker: "Déferlement du monde",
    emphasis: "abyss",
    particles: [],
    image: "jormspé.jpg",
    quoteFrame: "cadre.png"
  },
  kraken: {
    scene: "kraken",
    sound: "krakenspé.mp3",
    soundVolume: 0.84,
    kicker: "Abysses en colère",
    emphasis: "abyss",
    particles: [],
    video: "krakenspé.mp4",
    quoteFrame: "cadre.png"
  },
  nhiddog: {
    scene: "nhiddog",
    sound: "nispé.mp3",
    soundVolume: 0.8,
    kicker: "Soif de sang",
    emphasis: "abyss",
    particles: [],
    image: "nispé.jpg",
    quoteFrame: "cadre.png"
  },
  generalmelenchon: {
    scene: "melenchon",
    sound: "melenchon1.mp3",
    soundVolume: 0.54,
    kicker: "Tribune de guerre",
    emphasis: "speech",
    particles: [],
    image: "melenchonspé.jpg",
    quoteFrame: "cadre.png"
  },
  balraug: {
    scene: "balraug",
    sound: "balrog.mp3",
    soundVolume: 0.62,
    kicker: "Bridge of fire",
    emphasis: "boss",
    particles: [],
    image: "balrogspé.jpg",
    quoteFrame: "cadre.png"
  }
}

function getMobSpecialPresentation(mobName) {
  const key = String(mobName || "").toLowerCase()
  const presentation = mobSpecialPresentations[key]
  return presentation ? { ...presentation } : null
}

function getMobAnimationStyle(animationKey) {
  return mobSpecialAnimations[animationKey] || mobSpecialAnimations.arcane
}

function getMobDamageRange(attack, mobLvl, mobTier = "weak") {
  const lvl = Math.max(1, parseInt(mobLvl, 10) || 1)
  let levelBonus = 0
  for (let current = 2; current <= lvl; current += 1) {
    let perLevel = 1
    if (current >= 15) perLevel = 4
    else if (current >= 10) perLevel = 3
    else if (current >= 5) perLevel = 2
    levelBonus += perLevel
  }
  const effectiveLevelBonus = mobTier === "boss" && levelBonus > 18
    ? 18 + (levelBonus - 18) * 0.65
    : levelBonus
  const levelFactor = 1 + effectiveLevelBonus * 0.09
  const tierFactor = { weak:1.14, medium:1.24, high:1.38, boss:1.56 }[mobTier] || 1.16
  const specialFactor = attack && attack.special ? 1.24 : 1
  const factor = levelFactor * tierFactor * specialFactor
  return {
    min: Math.round(attack.dmgMin * factor),
    max: Math.round(attack.dmgMax * factor)
  }
}

function getMobDamage(attack, mobLvl, mobTier = "weak") {
  const range = getMobDamageRange(attack, mobLvl, mobTier)
  const min = range.min
  const max = range.max
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* ========================= */
/* MAPS & MUSIQUES           */
/* ========================= */

const mapMusic = {
  "taverne.jpg":         "ambiancetaverne.mp3",
  "village1.jpg":        "marche.mp3",
  "armurerie.jpg":       "armurerie.mp3",
  "marche.jpg":          "marche.mp3",
  "voyante.jpg":         "voyante.mp3",
  "foret.jpg":           "foret.mp3",
  "arbre.jpg":           "arbre.mp3",
  "castleofevil.jpg":    "castleofevil.mp3",
  "cimetiere.jpg":       "cimetiere.mp3",
  "mine.jpg":            "mine.mp3",
  "port.jpg":            "port.mp3",
  "bateaunord.png":      "port.mp3",
  "neige.jpg":           "neige.mp3",
  "bifrost.jpg":         "bifrost.mp3",
  "MAPMONDE.jpg":        "prairie.mp3",
  "prairie.jpg":         "prairie.mp3",
  "chasseuraurore.jpg":  "chasseuraurore.mp3",
  "tenteaurore.jpg":     "tente.mp3",
  "bateau1.jpg":         "chasseuraurore.mp3",
  "antre.jpg":           "antre.mp3",
  "portail.jpg":         "foret.mp3",
  "tourbillon.jpg":      "tourbillon.mp3",
  "trou.jpg":            "trou.mp3",
  "cristaux.jpg":        "cristaux.mp3",
  "interieurmine.jpg":   "mine.mp3",
  "prebalraug.jpg":      "mine.mp3",
  "throne.jpg":          "throne.mp3",
  "interieurcastle.jpg": "castleofevil.mp3",
  "egout.jpg":           "egout.mp3",
  "tavernebrume.png":    "ambiancetaverne.mp3",
  "armurerie1.jpg":      "brumeinside.mp3",  // Armurerie de Brume
  "balduregout.jpg":     "egout.mp3",
  "marche1.jpg":         "port.mp3",
  "palaisville.jpg":     "brumeinside.mp3",
  "mairemaison.jpg":     "mairemaison.mp3",
  "epouventail.jpg":     "marche.mp3",
  "asgard.jpg":          "asgard.mp3",
  "rivebois.jpg":        "marche.mp3",
  "ruines.jpg":          "ruines.mp3",
  "niflheim.jpg":        "niflheim.mp3",
  "hvergelmir.jpg":      "niflheim.mp3"
}

const mapNames = {
  "taverne.jpg":         "La Taverne",
  "village1.jpg":        "Village Rivebois",
  "armurerie.jpg":       "Forge de Rivebois",
  "voyante.jpg":         "Apothicaire",
  "marche.jpg":          "Place du marché",
  "foret.jpg":           "Forêt enchantée",
  "arbre.jpg":           "Arbre Monde",
  "castleofevil.jpg":    "The Castle of Evil",
  "cimetiere.jpg":       "Cimetière ancien",
  "mine.jpg":            "Mine du vent d'Est",
  "prebalraug.jpg":      "Salle principal",
  "port.jpg":            "La Cité du Nord Brume",
  "portail.jpg":         "Portail de Vérité",
  "trou.jpg":            "Passage de l'Antre monde",
  "cristaux.jpg":        "Cristal de vérité",
  "tourbillon.jpg":      "Le Maelestrom",
  "interieurcastle.jpg": "Salle principale",
  "throne.jpg":          "Throne",
  "bateaunord.png":      "Port de Brume",
  "bifrost.jpg":         "Bifrost",
  "MAPMONDE.jpg":        "MAP MONDE",
  "chasseuraurore.jpg":  "Camp des Chasseurs d'Aurore",
  "tenteaurore.jpg":     "Tente du Général Mélenchon",
  "antre.jpg":           "L'Antre monde",
  "egout.jpg":           "🌊 Égout de Brume",
  "bateau.jpg":           "Le for sure",
  "bateau1.jpg":         "L'Oregon III",
  "tavernebrume.png":    "Taverne de Brume",
  "armurerie1.jpg":      "Armurerie de Brume",
  "balduregout.jpg":     "Salle secrète de Baldur",
  "marche1.jpg":         "Place du Marché de Brume",
  "mairemaison.jpg":     "🏛 Mairie de Rivebois",
  "epouventail.jpg":     "",
  "asgard.jpg":          "⚡ La cité des dieux Asgard",
  "rivebois.jpg":        "🏘 Rivebois",
  "ruines.jpg":          "🏚 Ruines du village du Jarl Baldur",
  "niflheim.jpg":        "🌊 Cité engloutie Niflheim",
  "hvergelmir.jpg":      "🌊 Source sacrée Hvergelmir"
}

/* ========================= */
/* SHOP                      */
/* ========================= */

const shopItemsArmurerie = [
  { id:"epee",         name:"Épée",             img:"epee.png",         category:"arme",   basePrix:60,  baseStats:"Force +2",        scaling:8  },
  { id:"arc",          name:"Arc",              img:"arc.png",          category:"arme",   basePrix:70,  baseStats:"Précision +2",    scaling:8  },
  { id:"masse",        name:"Masse",            img:"masse.png",        category:"arme",   basePrix:65,  baseStats:"Force +3",        scaling:9  },
  { id:"baton",        name:"Bâton",            img:"baton.png",        category:"arme",   basePrix:55,  baseStats:"Magie +2",        scaling:7  },
  { id:"bouclier",     name:"Bouclier",         img:"bouclier.png",     category:"arme",   basePrix:70,  baseStats:"Défense +3",      scaling:8  },
  { id:"fleches",      name:"Flèches (x10)",    img:"fleche.png",       category:"arme",   basePrix:25,  baseStats:"Munitions",       scaling:3  },
  { id:"armleg",       name:"Armure Légère",    img:"armurelegere.png", category:"armure", basePrix:90,  baseStats:"Défense +2",      scaling:10 },
  { id:"armlour",      name:"Armure Lourde",    img:"armurelourde.png", category:"armure", basePrix:150, baseStats:"Défense +5",      scaling:15 },
  { id:"anneauforce",  name:"Anneau de Force",  img:"anneau1.png",      category:"armure", basePrix:120, baseStats:"Force +2",        scaling:12 },
  { id:"anneaucharme", name:"Anneau de Charme", img:"anneau2.png",      category:"armure", basePrix:120, baseStats:"Charme +2",       scaling:12 },
  { id:"anneauperspi", name:"Anneau de Perspic.",img:"anneau1.png",     category:"armure", basePrix:120, baseStats:"Perspicacité +2", scaling:12 },
  { id:"anneauchance", name:"Anneau de Chance", img:"anneau2.png",      category:"armure", basePrix:120, baseStats:"Chance +2",       scaling:12 },
  { id:"anneaudef",    name:"Anneau de Défense",img:"anneau1.png",      category:"armure", basePrix:120, baseStats:"Défense +2",      scaling:12 }
]

const shopItems = [
  { id:"sort",       name:"Parchemin Sort",  img:"sort.png",      category:"magie",   basePrix:100, baseStats:"Sort unique",  scaling:12 },
  { id:"anneaumagic",name:"Anneau Mystique", img:"anneau1.png",   category:"magie",   basePrix:130, baseStats:"Magie +3",     scaling:13 },
  { id:"potion",     name:"Potion de Vie",   img:"potionvie.png", category:"consomm", basePrix:50,  baseStats:"Vie +30",      scaling:5  },
  { id:"potionres",  name:"Potion de Rés.",  img:"potionres.png", category:"consomm", basePrix:300, baseStats:"Résurrection", scaling:20 },
  { id:"lanterne",   name:"Lanterne",        img:"lanterne.png",  category:"util",    basePrix:30,  baseStats:"Vision nuit",  scaling:2  },
  { id:"torche",     name:"Torche",          img:"torche.png",    category:"util",    basePrix:15,  baseStats:"Éclairage",    scaling:1  },
  { id:"corde",      name:"Corde/Grappin",   img:"corde.png",     category:"util",    basePrix:25,  baseStats:"Utilité",      scaling:2  },
  { id:"cartedumonde", name:"Carte du Monde", img:"mapicon.png",  category:"util",    basePrix:90,  baseStats:"Révèle les routes", scaling:6 },
  { id:"selle",      name:"Selle de Bibi",   img:"bag.png",       category:"util",    basePrix:80,  baseStats:"Poids +",      scaling:5  },
  { id:"pioche",     name:"Pioche",          img:"pioche.png",    category:"util",    basePrix:40,  baseStats:"Minage",       scaling:3  },
  { id:"amulette",   name:"Amulette Sacrée", img:"anneau2.png",   category:"util",    basePrix:150, baseStats:"Curse -1",     scaling:10 },
  { id:"pierresoin", name:"Pierre de Soin",  img:"sort.png",      category:"util",    basePrix:120, baseStats:"+5 HP/tour",   scaling:8  }
]

const categoryLabels = {
  arme:"⚔ Armes", armure:"🛡 Armures", magie:"✨ Magie", consomm:"🧪 Consommables", util:"🔧 Utilitaires"
}

function getShopPrice(item, partyLvl) {
  return Math.round(item.basePrix + item.scaling * (partyLvl - 1))
}

function getShopStats(item, partyLvl) {
  const lvl = partyLvl || 1
  if (item.id === "cartedumonde") return "Accès aux repères du monde"
  if (item.id === "selle")      return "Poids Bibi +" + (5 + lvl * 3) + " kg"
  if (item.id === "amulette")   return "Curse -" + Math.min(3, 1 + Math.floor(lvl / 3))
  if (item.id === "pierresoin") return "+" + (5 + Math.floor(lvl / 2)) + " HP/tour"
  if (item.scaling === 0)       return item.baseStats
  const match = item.baseStats.match(/(\d+)/)
  if (!match) return item.baseStats
  const scaled = parseInt(match[1]) + Math.floor(item.scaling * (lvl - 1) * 0.5)
  return item.baseStats.replace(match[1], scaled)
}

/* ========================= */
/* WANTED                    */
/* ========================= */

const WANTED_REWARDS = {
  weak:  [50, 100, 150],
  medium:[200, 350, 500],
  high:  [600, 900, 1200],
  boss:  [2000, 3500, 5000]
}

const WANTED_MOBS = [
  "gobelins","loup","ogre","dragon","bandit","garde","valkyrie","liquorice",
  "vampire","witch","pretre","fantome","draugr","zombie","zombie2","golem",
  "balraug","fenrir","jormungand","kraken","nhiddog","roi"
]

/* ========================= */
/* MALÉDICTION               */
/* ========================= */

const curseWheelChoices = [
  { label:"-40% Vie",      icon:"💀", color:"#8b0000", description:"Votre vie est réduite de 40%" },
  { label:"Stat -4",       icon:"⬇",  color:"#4a0080", description:"Votre stat principale perd 4 points" },
  { label:"Critiques Only",icon:"⚔",  color:"#800040", description:"Au prochain combat, seuls les critiques comptent" },
  { label:"Perd un objet", icon:"🎒", color:"#603000", description:"Vous perdez le dernier objet de votre inventaire" }
]

/* ========================= */
/* RUNES                     */
/* ========================= */

const runeAlphabet = {
  "A":"ᚨ","B":"ᛒ","C":"ᚲ","D":"ᛞ","E":"ᛖ","F":"ᚠ","G":"ᚷ","H":"ᚺ",
  "I":"ᛁ","J":"ᛃ","K":"ᚲ","L":"ᛚ","M":"ᛗ","N":"ᚾ","O":"ᛟ","P":"ᛈ",
  "Q":"ᚲ","R":"ᚱ","S":"ᛊ","T":"ᛏ","U":"ᚢ","V":"ᚢ","W":"ᚹ","X":"ᛉ",
  "Y":"ᛃ","Z":"ᛉ",
  "a":"ᚨ","b":"ᛒ","c":"ᚲ","d":"ᛞ","e":"ᛖ","f":"ᚠ","g":"ᚷ","h":"ᚺ",
  "i":"ᛁ","j":"ᛃ","k":"ᚲ","l":"ᛚ","m":"ᛗ","n":"ᚾ","o":"ᛟ","p":"ᛈ",
  "q":"ᚲ","r":"ᚱ","s":"ᛊ","t":"ᛏ","u":"ᚢ","v":"ᚢ","w":"ᚹ","x":"ᛉ",
  "y":"ᛃ","z":"ᛉ",
  "é":"ᛖ","è":"ᛖ","ê":"ᛖ","à":"ᚨ","â":"ᚨ","ô":"ᛟ","î":"ᛁ","û":"ᚢ","ç":"ᚲ",
  "É":"ᛖ","È":"ᛖ","À":"ᚨ"
}

const runeHints = [
  { id:"hint1", runes:"ᚨ=A  ᛚ=L  ᛖ=E  ᚢ=U", desc:"Fragment I"    },
  { id:"hint2", runes:"ᛁ=I  ᛖ=E  ᚱ=R  ᛊ=S", desc:"Fragment II"   },
  { id:"hint3", runes:"ᛞ=D  ᛖ=E  ᚨ=A  ᛟ=O", desc:"Fragment III"  },
  { id:"hint4", runes:"ᛒ=B  ᚱ=R  ᚨ=A  ᚢ=V", desc:"Fragment IV"   },
  { id:"hint5", runes:"ᛏ=T  ᚱ=R  ᛁ=I  ᚾ=N", desc:"Fragment V"    },
  { id:"hint6", runes:"ᛟ=O  ᛞ=D  ᛁ=I  ᚾ=N", desc:"Fragment VI"   },
  { id:"hint7", runes:"ᚹ=W  ᛊ=S  ᛟ=O  ᛗ=M", desc:"Fragment VII"  },
  { id:"hint8", runes:"ᚷ=G  ᚨ=A  ᛈ=P",       desc:"Fragment VIII" }
]

const secretMessage = "A la lueur des aurores, les braves trinquent avec Odin au sommet de l'Arbre."
const secretAnswer  = "a la lueur des aurores les braves trinquent avec odin au sommet de larbre"

/* ========================= */
/* POUVOIR                   */
/* ========================= */

const playerPowerSounds = {
  greg: { file:"gregpower.mp3", fadeAt:3000 },
  ju:   { file:"jupower.mp3",   fadeAt:null  },
  elo:  { file:"elopower.mp3",  fadeAt:5000  },
  bibi: { file:"power.mp3",     fadeAt:null  }
}

/* ========================= */
/* VISION ODIN               */
/* ========================= */

const ODIN_VISIONS = [
  "Odin vous voit. Son œil unique suit votre route depuis Asgard.",
  "Le Père de Tous vous accorde son soutien. Portez-le dignement.",
  "Vos noms sont gravés dans le bois d'Yggdrasil.",
  "Les corbeaux ont rapporté vos actes. Odin est satisfait.",
  "La sagesse d'Odin guide vos pas. Ne faiblissez pas.",
  "Le Tout-Puissant a entendu vos prières. Il répond.",
  "Odin lève son sceptre en votre honneur. Valhalla vous observe.",
  "Le dieu borgne sourit. Votre chemin est juste.",
  "Munin se souvient de vous. Huginn vous accompagne.",
  "Par la volonté d'Odin, les runes vous livrent leurs secrets."
]

/* ========================= */
/* ÉVÉNEMENT RUNE PNJ        */
/* ========================= */

const runeEventDialogues = [
  "Ho, tant que j'y pense... j'ai trouvé ça, peut-être que ça peut vous être utile.",
  "Curieux... j'ai entendu dire que les anciens utilisaient ce symbole.",
  "Psst ! Gardez ça pour vous, mais j'ai vu cette marque gravée sur un vieux mur.",
  "Je ne sais pas si ça vaut quelque chose, mais tenez... j'ai trouvé ça ce matin.",
  "Les bardes chantent parfois ce signe... peut-être que ça vous dira quelque chose ?",
  "Mon grand-père m'avait montré ça. Je ne l'ai jamais compris, mais vous peut-être ?",
  "Étrange coïncidence que vous soyez là... j'ai quelque chose pour vous.",
  "Je ne suis pas sûr de ce que ça signifie, mais ça semblait important."
]

/* ========================= */
/* SORT CIMETIÈRE            */
/* ========================= */

const SPELL_PLAYERS   = ["greg","ju","elo"]
const SPELL_MAX_TRIES = 3

/* ========================= */
/* MULTI-MOBS                */
/* ========================= */

const MOB_SLOTS = ["mob","mob2","mob3"]

/* ========================= */
/* DIALOGUE INTRO            */
/* ========================= */

const dialogue = [
  { portrait:"tavernier.png", text:"Réveillez-vous étrangers !" },
  { portrait:"tavernier.png", text:"Vous êtes restés inconscients toute la nuit..." },
  { portrait:"serveuse.png",  text:"Bienvenue à Rivebois." }
]

/* ========================= */
/* PNJ ALLIÉS EN COMBAT      */
/* ========================= */

const ALLY_PNJS = [
  {
    id:      "odin",
    name:    "Odin",
    image:   "odin.png",
    role:    "Père de tous les dieux",
    color:   "#8866ff",
    lore:    "Le Tout-Père voit tout, sait tout. Sa lance Gungnir ne manque jamais sa cible.",
    actions: [
      {
        id:       "odin_gungnir",
        label:    "Lancer de Gungnir",
        type:     "damage",
        icon:     "⚡",
        desc:     "Odin jette sa lance sacrée. 200 + D20 × 25 dégâts. Critique 18-20 : dégâts × 4.",
        dice:     20,
        dmgBase:  200,
        dmgBonus: 25,
        critMin:  18,
        critMult: 4,
        dialogue: "Gungnir frappe vrai.",
      },
      {
        id:       "odin_ravens",
        label:    "Vision des corbeaux",
        type:     "malus",
        icon:     "🦅",
        desc:     "Huginn et Muninn révèlent les failles. D20 : sur 10+, le mob subit -15 à toutes ses actions.",
        dice:     20,
        threshold: 10,
        dialogue: "Mes corbeaux ont tout vu.",
      }
    ]
  },
  {
    id:      "thor",
    name:    "Thor",
    image:   "thor.png",
    role:    "Dieu du tonnerre",
    color:   "#ffaa00",
    lore:    "Fils d'Odin, gardien de Midgard. Mjolnir revient toujours dans sa main.",
    actions: [
      {
        id:       "thor_mjolnir",
        label:    "Mjolnir",
        type:     "damage",
        icon:     "🔨",
        desc:     "Thor abat Mjolnir. 250 + D20 × 30 dégâts. Sur 15+ : frappe tous les mobs en même temps.",
        dice:     20,
        dmgBase:  250,
        dmgBonus: 30,
        chainMin: 15,
        dialogue: "Par le tonnerre.",
      }
    ]
  },
  {
    id:      "freya",
    name:    "Freya",
    image:   "freya.png",
    role:    "Déesse de l'amour et de la guerre",
    color:   "#ff88cc",
    lore:    "Maîtresse de la seiðr, elle choisit la moitié des guerriers tombés.",
    actions: [
      {
        id:       "freya_valkyrie",
        label:    "Grâce des Valkyries",
        type:     "heal",
        icon:     "✦",
        desc:     "Freya bénit un héros. D20 × 20 HP restaurés. Critique 20 : résurrection complète.",
        dice:     20,
        healMult: 20,
        dialogue: "Les Valkyries veillent sur vous.",
      },
      {
        id:       "freya_seidr",
        label:    "Seiðr de guerre",
        type:     "damage",
        icon:     "🌙",
        desc:     "Freya tisse un sort dévastateur. 180 + D20 × 20 dégâts. Sur 1 : dégâts réduits à 20 %.",
        dice:     20,
        dmgBase:  180,
        dmgBonus: 20,
        dialogue: "La magie ancienne vous consume.",
      }
    ]
  },
  {
    id:      "witch",
    name:    "La Sorcière",
    image:   "witch.png",
    role:    "Gardienne des secrets oubliés",
    color:   "#44ffaa",
    lore:    "Nul ne connaît son vrai nom. Elle existe depuis avant les dieux.",
    actions: [
      {
        id:       "witch_hex",
        label:    "Malédiction ancienne",
        type:     "malus",
        icon:     "🌑",
        desc:     "Elle maudit l'ennemi en son cœur. D20 : sur 10+, le mob inflige 25 % de dégâts en moins ce combat.",
        dice:     20,
        threshold: 10,
        dialogue: "Tu portes désormais mon sceau.",
      },
      {
        id:       "witch_elixir",
        label:    "Élixir de puissance",
        type:     "buff",
        icon:     "⚗",
        desc:     "Elle tend un élixir à un héros. D20 × 10 ajoutés à sa stat principale.",
        dice:     20,
        buffMult: 10,
        dialogue: "Buvez. Ne posez pas de questions.",
      }
    ]
  }
]
