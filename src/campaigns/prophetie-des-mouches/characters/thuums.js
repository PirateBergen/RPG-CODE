window.usedThuumData = {}
window.__lastThuumUnlockTime = 0
window.__lastThuumCastTime = 0
window.THUUMS = {
  SKRAA: {
    word: "SKRAA",
    words: ["SKRAA", "VORTH", "NAAK"],
    translation: "Fragmentation • Rupture • Dispersion finale",
    description: "Fracasse la cible principale et blesse les ennemis autour.",
    unlockMap: "prebalraug.jpg",
    buttonImage: "images/runeskraa.png",
    combatDamageByRank: rank => ({ main: 8 + rank * 4, splash: 3 + rank * 2 }),
    outsideCombatMessage: "SKRAA retentit hors combat"
  },
  "SKARO'H": {word:"SKARO'H",words:["SKARO'H","VEL","NAHL"],translation:"Éclair • Impulsion • Fulgurance",description:"Vous vous déplacez à une vitesse fulgurante : deux attaques basiques consécutives pendant ce tour, avec un jet pour chaque attaque. L’activation du cri ne consomme pas l’une de ces deux attaques. Ni soin, ni spéciale, ni action de Bibi dans cet enchaînement.",unlockMap:null,buttonImage:"images/runeskraa.png",combatDamageByRank:()=>({main:0,splash:0}),combatOnly:true,outsideCombatMessage:"SKARO’H ne peut être utilisé qu’en combat"},
  REIHKT: {
    word: "REIHKT",
    words: ["REIHKT", "MUUR", "ZAAL"],
    translation: "Entrave • Immobilité • Paralysie",
    description: "Blesse la cible puis la paralyse : elle perd son prochain tour complet. Sans effet de paralysie sur Jörmungandr.",
    unlockMap: "epouventail.jpg",
    buttonImage: "images/runeskraa.png",
    combatDamageByRank: rank => ({ main: 6 + rank * 3, splash: 0 }),
    outsideCombatMessage: "REIHKT retentit hors combat"
  }
}

