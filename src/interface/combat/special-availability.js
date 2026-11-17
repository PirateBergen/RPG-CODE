function hasPlayerUsedCombatSpecial(playerId) {
  return !!(window.__playerCombatSpecialsUsed && window.__playerCombatSpecialsUsed[playerId])
}


function hasPlayerCombatTrigger(playerId, key) {
  return !!(window.__playerCombatFlags && window.__playerCombatFlags[playerId] && window.__playerCombatFlags[playerId][key])
}

