function getAttackStatKey(statLabel) {
  const raw = String(statLabel || "").toLowerCase()
  if (raw.includes("force")) return "force"
  if (raw.includes("charme")) return "charme"
  if (raw.includes("chance")) return "chance"
  if (raw.includes("perspi") || raw.includes("perspic")) return "perspi"
  if (raw.includes("def")) return "defense"
  return "force"
}

function getPlayerAttackTypeKey(attack) {
  const value = String(attack?.type || "").toLowerCase()
  if (value.includes("soin")) return "heal"
  if (value.includes("sort")) return "spell"
  if (value.includes("invocation")) return "summon"
  if (value.includes("analyse")) return "analysis"
  if (value.includes("charme")) return "charm"
  if (value.includes("distance")) return "ranged"
  if (value.includes("sp")) return "special"
  return "physical"
}

function getPlayerSpecialAttack(playerId) {
  return (typeof playerSpecialAttacks !== "undefined" && playerSpecialAttacks) ? (playerSpecialAttacks[playerId] || null) : null
}

