function getCombatHUDPlayerId() {
  if (isGM && window.__combatPreviewPlayerId) return window.__combatPreviewPlayerId
  if (myToken && myToken.id) return myToken.id
  return null
}

function setCombatPreviewPlayer(playerID) {
  if (!isGM) return
  window.__combatPreviewPlayerId = playerID || null
  showCombatHUD()
  const hud = document.getElementById("combatHUD")
  if (hud) {
    hud.style.display = "flex"
    hud.style.alignItems = "flex-start"
  }
  document.querySelectorAll(".gmPlayerTestBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.playerId === playerID)
  })
}

function closeCombatPreviewHUD() {
  window.__combatPreviewPlayerId = null
  const hud = document.getElementById("combatHUD")
  if (hud) hud.style.display = "none"
  document.querySelectorAll(".gmPlayerTestBtn").forEach(btn => btn.classList.remove("active"))
}


