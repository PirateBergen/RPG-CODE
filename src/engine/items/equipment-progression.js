function getShopPrice(item, partyLvl) {
  return Math.round(item.basePrix + item.scaling * (partyLvl - 1))
}

function getEquipmentLevelBonus(level) {
  const lvl=Math.max(1,Math.min(99,Math.round(Number(level)||1)))
  let bonus=0
  for(let current=2;current<=lvl;current++){
    if(current<=5)bonus+=1
    else if(current<=10)bonus+=current%2===0?2:1
    else if(current<=15)bonus+=2
    else bonus+=current%2===0?3:2
  }
  return bonus
}
function getShopStats(item, partyLvl) {
  const lvl = Math.max(1,Math.min(99,Math.round(Number(partyLvl)||1)))
  if (item.id === "cartedumonde") return "Accès aux repères du monde"
  if (item.id === "selle")      return "Poids Bibi +" + (5 + lvl * 3)
  if (item.id === "amulette")   return "Curse -" + Math.min(3, 1 + Math.floor(lvl / 3))
  if (item.id === "pierresoin") return "+" + (5 + Math.floor(lvl / 2)) + " HP/tour"
  if (item.scaling === 0)       return item.baseStats
  const match = item.baseStats.match(/(\d+)/)
  if (!match) return item.baseStats
  // Equipment improves each level with gradual, bounded growth. Acquired inventory values stay fixed.
  const equipment = item.category === "arme" || item.category === "armure"
  const scaled = parseInt(match[1]) + (equipment ? getEquipmentLevelBonus(lvl) : Math.floor(item.scaling * (lvl - 1) * 0.5))
  return item.baseStats.replace(match[1], scaled)
}

/* ========================= */
/* WANTED                    */
/* ========================= */

