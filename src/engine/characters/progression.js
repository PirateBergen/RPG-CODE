const allStats = ["force","charme","perspi","chance","defense"]

function getMaxCarryWeight(playerId, level = 1) {
  const value=Number(level),lvl=Number.isFinite(value)?Math.max(1,Math.floor(value)):1
  return 100+20*Math.floor(lvl/8)
}

function _getLevelUpGains(lvl) {
  if      (lvl <= 2)  return { main:2, secCount:1, secAmt:1, hp:8  }
  else if (lvl <= 3)  return { main:2, secCount:2, secAmt:1, hp:10 }
  else if (lvl <= 4)  return { main:3, secCount:2, secAmt:1, hp:10 }
  else if (lvl <= 5)  return { main:3, secCount:2, secAmt:2, hp:12 }
  else if (lvl <= 8)  return { main:3, secCount:2, secAmt:2, hp:14 }
  else if (lvl <= 12) return { main:4, secCount:2, secAmt:2, hp:16 }
  else                return { main:5, secCount:2, secAmt:3, hp:18 }
}

function getPlayerStatsAtLevel(playerId, level, build = null) {
  const base = build?.base || playerBaseStats[playerId]
  const main = build?.main || playerMainStat[playerId]
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
  stats.poids = getMaxCarryWeight(playerId, level)
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

