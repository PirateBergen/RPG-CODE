function endCombat(options = {}) {
  if (!combatActive && !options.force) return
  stopCombatStatsSubscription()
  if(typeof combatTargetCancellation==="function")combatTargetCancellation()
  combatActive = false; combatStarting = false
  if (typeof resetLocalCombatVisualState === "function") resetLocalCombatVisualState()
  setGameState("GAME")

  const map = document.getElementById("map")
  ;["greg","ju","elo","bibi","mobToken"].forEach(id => {
    const token = document.getElementById(id)
    if (token && map) { map.appendChild(token); token.style.position = "absolute" }
  })

  const gcp = document.getElementById("gmCombatButtons"); if (gcp) gcp.style.display = "none"
  const gdp = document.getElementById("gmDamagePanel"); if (gdp) gdp.style.display = "none"
  stopBossFireEffect()
  document.querySelectorAll('[id^="mobToken_"]').forEach(token=>{if(token._slotRef&&token._slotRefCb)token._slotRef.off("value",token._slotRefCb);token.remove()})

  const atkPanel = document.getElementById("mobAttackPanel"); if (atkPanel) atkPanel.remove()
  ;["mob2","mob3"].forEach(s => { activeMobSlots[s] = false })
  activeMobSlots["mob"] = false

  const ap = document.getElementById("addMobPanel"); if (ap) ap.style.display = "none"
  const allyPanel = document.getElementById("allyPNJPanel"); if (allyPanel) allyPanel.remove()
  const allyBtn = document.getElementById("allyBtn"); if (allyBtn) allyBtn.style.display = "none"
  const playerAllyBtn = document.getElementById("playerAllyBtn"); if (playerAllyBtn) playerAllyBtn.style.display = "none"
  const allyViewer = document.getElementById("allyViewerPanel"); if (allyViewer) allyViewer.remove()
  const ab = document.getElementById("addMobButtons"); if (ab) { ab.innerHTML = ""; delete ab.dataset.built }

  const arena = document.getElementById("combatArena"); if (arena) { arena.style.display = "none"; arena.style.position = "relative"; arena.style.width = ""; arena.style.height = "" }
  const cg = document.getElementById("combatGrid"); if (cg) cg.style.display = "none"
  const cf = document.getElementById("combatFilter"); if (cf) cf.style.display = "none"
  const md12 = document.getElementById("mobD12"); if (md12) md12.style.display = "none"
  const md20 = document.getElementById("mobD20"); if (md20) md20.style.display = "none"
  closeCombatInitiativeOverlay()
  const initiativeToggle = document.getElementById("combatInitiativeToggle"); if (initiativeToggle) initiativeToggle.remove()
  window.__combatInitiativeHidden = false

  const hud = document.getElementById("combatHUD"); if (hud) hud.style.display = "none"
  const attackBtn = document.getElementById("playerAttackBtn"); if (attackBtn) attackBtn.style.display = "none"
  const thuumBtn = document.getElementById("playerThuumBtn"); if (thuumBtn) thuumBtn.style.display = "none"
  window.__combatTurnState = null
  window.__playerCombatSpecialsUsed = {}
  window.__playerCombatFlags = {}
  window.__eloSummonState = null
  const eloSummonToken = document.getElementById("eloSummonToken"); if (eloSummonToken) eloSummonToken.remove()
  if (typeof closePlayerThuumPanel === "function") closePlayerThuumPanel()
  if (isGM && !options.skipFinish) finishReliableCombat(window.__combatSnapshot?.id).catch(error=>showNotification("Fin de combat non confirmée : "+error.message))

  setTimeout(() => { if (typeof updateThuumButton === "function") updateThuumButton() }, 80)
}

function returnToMap(outcome){
 const fade=document.getElementById("fadeScreen")
 if(fade){fade.style.transition="opacity .6s ease";fade.style.opacity="1";fade.style.pointerEvents="none"}
 setTimeout(()=>{
 const map=document.getElementById("map")
 for(const id of ["greg","ju","elo","bibi","mobToken"]){const token=document.getElementById(id);if(!token||!map)continue;map.appendChild(token);token.style.transform="";token.style.width="";token.style.height="";token.style.position="absolute";token.style.pointerEvents="auto"}
 const mob=document.getElementById("mobToken");if(mob)mob.style.display="none"
 if(typeof restoreCombatMap==="function")restoreCombatMap(outcome)
 setTimeout(()=>{if(fade){fade.style.transition="opacity .8s ease";fade.style.opacity="0"}window.__combatReturnInProgress=false;if(typeof renderBalrogSwordLoot==="function")renderBalrogSwordLoot()},300)
 },600)
}

/* ========================= */
/* FEU BOSS                  */
/* ========================= */

