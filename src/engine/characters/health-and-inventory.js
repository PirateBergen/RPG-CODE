function getCharacterMaxHp(playerId, charData = {}) {
  const adjusted=value=>applyCampaignRule("maxHp",[playerId,charData,value],value)
  const direct =
    parseInt(charData.maxHp ?? charData.hpMax ?? charData.hpmax, 10)
  if (Number.isFinite(direct) && direct > 0) return adjusted(direct)

  const lvl = Math.max(1, parseInt(charData.lvl, 10) || 1)
  if (typeof getPlayerStatsAtLevel === "function") {
    const statsAtLevel = getPlayerStatsAtLevel(playerId, lvl)
    if (statsAtLevel && Number.isFinite(parseInt(statsAtLevel.hp, 10))) {
      return adjusted(parseInt(statsAtLevel.hp, 10))
    }
  }

  if (playerBaseStats && playerBaseStats[playerId] && Number.isFinite(parseInt(playerBaseStats[playerId].hp, 10))) {
    return adjusted(parseInt(playerBaseStats[playerId].hp, 10))
  }

  return adjusted(Math.max(1, parseInt(charData.hp, 10) || 1))
}

function parseInventoryItems(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function playerHasInventoryItem(charData, itemNeedle) {
  const needle = String(itemNeedle || "").toLowerCase().trim()
  if (!needle) return false
  return parseInventoryItems(charData?.inventaire).some(item => item === needle || item.includes(needle))
}


function isPhysicalMobAttack(attack) {
  const effect = String(attack?.effect || "").toLowerCase()
  const type = String(attack?.type || "").toLowerCase()
  const name = String(attack?.name || "").toLowerCase()
  if (effect === "all" || effect === "curse" || effect === "magic" || effect === "ranged") return false
  if (effect === "melee") return true
  if (type.includes("melee") || type.includes("physical") || type.includes("physique")) return true
  return /(coup|frappe|morsure|griffe|croc|charge|balayage|taloche|massue|lance|estoc|poing|fouet|pi[eé]tinement|entaille)/.test(name)
}

