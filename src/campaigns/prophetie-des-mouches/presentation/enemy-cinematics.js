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
  const key = /^(?:(?:ju|yu|you)\s*pion|pika|you|yu)$/i.test(String(mobName || "").trim()) ? "ju pion" : String(mobName || "").toLowerCase()
  const presentation = mobSpecialPresentations[key]
  return presentation ? { ...presentation } : null
}

