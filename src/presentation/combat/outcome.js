function _showVictoryNow(outcome) {
  window.__combatOutcomeShowing = true

  if(outcome?.lootBonus)showNotification("Spider Sense a révélé un meilleur butin pour la victoire.")
  playSound("victorySound", 0.45)
  fadeMusicOut(() => {})

  const victory = document.getElementById("victoryScreen")
  victory.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:999999999;opacity:0;transition:opacity 0.4s ease;"
  document.body.appendChild(victory)
  setTimeout(() => { victory.style.opacity = "1" }, 20)

  playSound("curseSound")
  screenShakeHard(); powerExplosion(); powerExplosion(); flashGold(); flashGold()
  spawnVictoryParticles()

  setTimeout(() => {
    const vs = document.getElementById("victorySound")
    if (vs) { let iv = setInterval(() => { if (vs.volume > 0.03) vs.volume -= 0.03; else { vs.pause(); vs.volume = 0; clearInterval(iv) } }, 100) }
  }, 5000)
  setTimeout(() => {
    victory.style.display="none"
    if(typeof completeCombatReturn==="function")completeCombatReturn(outcome)
    else{endCombat();returnToMap();window.__combatOutcomeShowing=false}
  }, 7000)
}

function _showDefeatNow(outcome) {
  if (window.__combatOutcomeShowing) return
  window.__combatOutcomeShowing = true
  window.__pendingLocalDefeat = true
  combatActive = true
  setGameState("COMBAT")
  playSound("defeatSound")
  fadeMusicOut(() => {})

  const screen = document.getElementById("defeatScreen")
  if (!screen) { console.error("defeatScreen element not found"); return }
  screen.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;opacity:1;"
  document.body.appendChild(screen)
  flashRed(); screenShakeHard()
  setTimeout(() => {
    screen.style.display = "none"
    if(outcome?.antrePassage&&typeof playAntreSoulPassage==="function")playAntreSoulPassage(outcome,completeCombatReturn)
    else if(typeof completeCombatReturn==="function")completeCombatReturn(outcome)
    else{endCombat();returnToMap();window.__combatOutcomeShowing=false}
  }, 5000)
}

