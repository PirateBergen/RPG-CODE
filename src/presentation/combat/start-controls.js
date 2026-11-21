function combatSequence(mob, forceTier) {
  window.__combatIntroUntil = Date.now()+((mob === "roi" && !isKingEncounter(window.__combatSnapshot?.mob) && (forceTier||mobStats[mob]?.tier)==="boss")?24500:(typeof isKingIntroPending==="function"&&isKingIntroPending()?3500:6500))
  const tierMob = forceTier || (mobStats[mob] ? mobStats[mob].tier : "weak")
  if (mob === "roi" && tierMob === "boss") playRoiIntro(mob, tierMob)
  else _startCombatSequence(mob, tierMob)
}

