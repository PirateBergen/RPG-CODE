function triggerLocalDefeat(){
 const outcome=window.__pendingCombatOutcome
 if(outcome?.type==="defeat"&&outcome.combatId===(window.__localCombatId||window.__combatSnapshot?.id)){observeCombatEnding(outcome);return true}
 return false
}

function watchLocalPlayerDefeat(playerId) {
  const pid = String(playerId || "").toLowerCase()
  if (!pid) return

  window.__localPlayerId = pid
  try { localStorage.setItem("rpg_local_player", pid) } catch (e) {}

  if (window.__localDefeatRef && window.__localDefeatCb) {
    window.__localDefeatRef.off("value", window.__localDefeatCb)
  }

  const ref = db.ref("characters/" + pid + "/hp")
  const cb = snap => {
    const hp = parseInt(snap.val(), 10) || 0
    if (!isGM && hp <= 0 && (combatActive || gameState === "COMBAT") && !window.__combatOutcomeShowing) {
      triggerLocalDefeat("hp-watch")
    }
  }

  window.__localDefeatRef = ref
  window.__localDefeatCb = cb
  ref.on("value", cb)
}


