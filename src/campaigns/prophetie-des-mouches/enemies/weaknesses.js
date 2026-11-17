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


function getMobWeakness(mobName, mobTier = "weak") {
  const key = /^(?:(?:ju|yu|you)\s*pion|pika|you|yu)$/i.test(String(mobName || "").trim()) ? "ju pion" : String(mobName || "").toLowerCase()
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

