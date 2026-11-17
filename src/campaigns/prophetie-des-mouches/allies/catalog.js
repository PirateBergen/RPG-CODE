const ALLY_PNJS = [
 {id:"melenchon",name:"Les troupes de Mélenchon",image:"generalmelenchon.png",role:"Appui aérien de l’Oregon III",color:"#e5a24a",lore:"Le général engage ses troupes : l’Oregon III survole le champ de bataille et ouvre le feu.",actions:[{id:"melenchon_bombardment",label:"Bombardement de l’Oregon",type:"damage",icon:"💣",dice:20,dmgBase:160,dmgBonus:18,critMult:2,desc:"L’Oregon III bombarde un ennemi choisi : 160 + D20 × 18 dégâts au total. Critique 20 : dégâts doublés. Une seule utilisation pendant ce combat, sur autorisation du MJ.",dialogue:"L’Oregon arrive en renfort. Bombardez la cible !"}]},
 {id:"baldur",name:"Jarl Baldur",image:"jarl baldur.png",role:"Puissant guerrier et jarl de Brume",color:"#e2b36b",lore:"Un chef viking lié au groupe par son serment.",actions:[{id:"baldur_wrath",label:"Le courroux du Jarl",type:"damage",icon:"🪓",dice:20,dmgBase:120,dmgBonus:15,critMult:2,staggerOnCrit:true,desc:"Baldur abat sa hache sur un ennemi : 120 + D20 × 15 dégâts. Critique 20 : dégâts doublés et prochaine action ennemie interrompue.",dialogue:"Par mon serment, vous ne tomberez pas seuls !"}]},
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
    id:      "gardienne",
    name: "La Gardienne", image: "gardienne.png", role: "Gardienne des âmes", color: "#a9dfff",
    lore: "Elle veille sur les âmes qui traversent l’Antre.",
    actions: [{id:"gardienne_souffle",label:"Souffle de la Gardienne",type:"heal",icon:"✦",desc:"Restaure D20 × 12 PV à un allié. Sur un critique (20), relève une cible KO avec tous ses PV. Une utilisation par combat, sur autorisation du MJ. Ne donne pas l’Immortalité quantique.",dice:20,healMult:12,dialogue:"Votre histoire ne s’achève pas ici."}]
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


