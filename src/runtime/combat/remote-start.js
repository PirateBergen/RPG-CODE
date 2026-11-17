function _startRemoteCombat(data) {
  if (window.__sessionBusy) return
  if (combatStarting || !data || !data.active) return
  if (!gameStarted) return
  if (gameState !== "GAME" && gameState !== "COMBAT" && gameState !== "DIALOGUE") return
  if (combatActive && currentMob === data.mainMob) return

  window.__localCombatId=data.id||window.__combatSnapshot?.id;window.__completedCombatExitId=null
  currentMob = data.mainMob
  if (data.returnMap) currentMap = data.returnMap

  _state.pendingExtraMobs = {}
  ;(data.extraMobs || []).forEach((mob, i) => {
    const slot = ["mob2","mob3"][i]
    if (!slot || !mob) return
    _state.pendingExtraMobs[slot] = mob
  })

  combatActive = true
  combatStarting = false
  setGameState("COMBAT")
  combatSequence(data.mainMob, data.tier)
  setTimeout(() => { if (typeof updateThuumButton === "function") updateThuumButton() }, 250)
  // Race condition fix : si combat/turnState est déjà arrivé avant game/combatState,
  // le listener a retourné tôt car combatActive était false — on re-render maintenant
  setTimeout(() => {
    const ts = window.__combatTurnState
    if (ts && typeof renderCombatInitiativeOverlay === "function") {
      renderCombatInitiativeOverlay(ts)
      if(ts.phase==="active")queueCombatTurnBanner(window.__combatSnapshot?.id||"legacy",ts)
      if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
    }
  }, 350)
}

function _playRemoteCombatExit(){
 if(window.__combatOutcomeQueued||window.__combatOutcomeShowing)return
 Promise.all([db.ref("game/map").once("value"),db.ref("tokens").once("value")]).then(([map,tokens])=>completeCombatReturn({combatId:window.__localCombatId,returnMap:map.val()||currentMap,returnTokens:tokens.val()||{}}))
}

function _resolveRemoteCombatEnd(){
 db.ref("game/combatOutcome").once("value",snap=>{const data=snap.val();if(data)observeCombatEnding(data);else if(!window.__combatOutcomeQueued&&!window.__combatOutcomeShowing)_playRemoteCombatExit()})
}

