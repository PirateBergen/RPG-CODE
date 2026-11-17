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

