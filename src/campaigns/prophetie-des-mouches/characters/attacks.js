const CAMPAIGN_HERO_ATTACKS = {
  greg: [
    { name:"Chat Bite (CaC)",      type:"Mêlée",    dice:12, stat:"Force",        effect:"Morsure brutale",                                             crit:"Dégâts x2" },
    { name:"Le Bibi",              type:"Spécial",  dice:20, stat:"Chance",       effect:"Bibi attaque avec rage",                                      crit:"Bonus allié de +2 dégâts pendant 3 rounds" },
    { name:"I know Frank (si arc)",type:"Distance", dice:12, stat:"Perspicacité", effect:"Tir précis arc",                                              crit:"Dégâts x2 et saignement, -1 HP pendant 2 tours" }
  ],
  ju: [
    {name:"French cancan",type:"Mêlée",dice:12,stat:"Force",pikaKind:"cancan",effect:"Contact obligatoire. Coups selon le jet ; dégâts fondés sur la Force et le niveau.",crit:"4 coups de pied",condition:"À 180 ou moins de la cible"},
    {name:"Je suis une fille",type:"Charme",dice:12,stat:"Charme",pikaKind:"hypnosis",effect:"Hypnose 1 tour complet. Recharge : 3 tours. Faible/normal : sauf échec critique ; fort : 7+ ; boss : 10+ ; world boss : critique uniquement.",crit:"Hypnose pendant 2 tours complets"},
    {name:"Rire KRRKRR",type:"Sort à distance",dice:12,stat:"Charme",pikaKind:"laugh",effect:"Ce rire est tellement bizarre que l’ennemi en reste sans voix. Dégâts à distance fondés sur le Charme et le niveau.",crit:"Ricochet à 50 % sur une autre cible ; si elle est seule, +50 % de dégâts."}
  ],
  elo: [
    { name:"Mains magiques",                  type:"Soin",      dice:12, stat:"Defense", effect:"Restaure HP à soi ou allié",                                                     crit:"Pv restaurés x2" },
    { name:"Je vais te raconter une histoire",type:"Sort",      dice:12, stat:"Charme",  effect:"invoque les forces de la nature. Bonus de dégâts en forêt ou mine",                crit:"L'ennemi est empoisonné, -2 hp pendant 2 tours" },
    { name:"Je suis jet laguée",              type:"Invocation",dice:12, stat:"Chance",  effect:"John Pork frappe à son arrivée, encaisse les attaques à cible unique et donne un bonus D4 aux attaques d’Elo pendant 3 rounds",    crit:"Le familier devient fou, dégats x2 et attaque tous les mobs" }
  ]
}

const CAMPAIGN_HERO_SPECIALS = {
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
    name:"Endikaki",type:"Spécial",dice:20,stat:"Charme",pikaKind:"endikaki",effect:"Invoque Endikaki, une bombe vivante qui fonce sur la cible et explose.",crit:"Explosion renforcée : dégâts doublés",fail:"Endikaki explose sans toucher l’ennemi.",conditionText:"Un autre allié est à moins de 20 % de ses PV (un allié KO compte).",flavor:"Le vieux fou est parti !",icon:"endikaki-token.svg",rule:"ally_below_twenty",damageBonus:1.8
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

