function getPlayerAttackPower(attack, roll, statValue, context = {}) {
  if(context.balanceVersion===3)return calibratedAttackPower(attack,roll,statValue,context)
  const type = getPlayerAttackTypeKey(attack)
  const scaling = getPlayerLevelScaling(context.playerId || context.actorId || "", context.charData || null)
  const lvl = Math.max(1, scaling.lvl || 1)
  const getTieredLevelBonus = multiplier => {
    if (lvl <= 1) return 0
    let total = 0
    for (let current = 2; current <= lvl; current += 1) {
      let perLevel = 1
      if (current >= 15) perLevel = 4
      else if (current >= 10) perLevel = 3
      else if (current >= 5) perLevel = 2
      total += perLevel
    }
    return Math.max(0, Math.round(total * multiplier))
  }

  let levelBonus = 0
  if (type === "analysis") levelBonus = getTieredLevelBonus(0.35)
  else if (type === "charm" || type === "summon") levelBonus = getTieredLevelBonus(0.7)
  else if (type === "heal") levelBonus = getTieredLevelBonus(0.85)
  else levelBonus = getTieredLevelBonus(1)

  if (attack && attack.name === "Je suis jet laguée") {
    return Math.max(1, (parseInt(roll, 10) || 0) + (parseInt(statValue, 10) || 0) + levelBonus)
  }
  const multipliers = {
    physical: 1.05,
    ranged: 1.0,
    special: 1.18,
    charm: 1.08,
    spell: 1.12,
    analysis: 0.72,
    summon: 0.94,
    heal: 1.0
  }
  const power = Math.round(roll * (multipliers[type] || 1) + statValue * 0.82 + levelBonus)
  if (type === "heal") return Math.max(8, power)
  return Math.max(1, power)
}

