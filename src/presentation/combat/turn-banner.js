function _showCombatTurnBanner(data) {
  const actorId = String(data.currentActorId || "")
  const order   = Array.isArray(data.order) ? data.order : []
  const entry   = order.find(e => String(e.id || "") === actorId)

  const playerColors = { greg:"#d9b37c", ju:"#8fc9ff", elo:"#9cf2cf", bibi:"#ffd28d" }
  const isMob   = !entry || entry.type === "mob"
  const label   = isMob ? "Ennemi attaque" : combatParticipantDisplayName(entry||{id:actorId}).toUpperCase() + " joue"
  const color   = isMob ? "#ff8080" : (playerColors[actorId] || "#f3ddb0")

  const old = document.getElementById("combatTurnBanner")
  if (old) { clearTimeout(old.__fadeTimer); clearTimeout(old.__removeTimer); old.remove() }

  const banner = document.createElement("div")
  banner.id = "combatTurnBanner"
  banner.textContent = label
  banner.style.cssText = [
    "position:fixed", "top:42%", "left:50%",
    "transform:translate(-50%,-50%) scale(0.88)",
    "z-index:999999990", "pointer-events:none",
    "font-family:Cinzel,serif", "font-size:36px",
    "letter-spacing:6px", "text-transform:uppercase",
    "color:" + color,
    "text-shadow:0 0 22px " + color + ",0 0 50px " + color + "66,0 3px 0 rgba(0,0,0,0.6)",
    "opacity:0",
    "transition:opacity 0.3s ease,transform 0.3s ease",
    "white-space:nowrap"
  ].join(";")

  document.body.appendChild(banner)
  requestAnimationFrame(() => {
    banner.style.opacity = "1"
    banner.style.transform = "translate(-50%,-50%) scale(1)"
    banner.__fadeTimer = setTimeout(() => {
      banner.style.transition = "opacity 0.55s ease,transform 0.55s ease"
      banner.style.opacity = "0"
      banner.style.transform = "translate(-50%,-50%) scale(1.08)"
      banner.__removeTimer = setTimeout(() => banner.remove(), 600)
    }, 2200)
  })
}

document.addEventListener("DOMContentLoaded", () => {
  db.ref("combat/turnState").on("value", snap => {
  if (window.__sessionBusy) return
    const data = snap.val()
    window.__combatTurnState = data || null
    if (!data || !combatActive) {
      window.__skippingDeadCombatTurn = ""
      window.__lastCombatPhase = null
      window.__lastCombatActorId = null
      closeCombatInitiativeOverlay()
      const initiativeToggle = document.getElementById("combatInitiativeToggle"); if (initiativeToggle) initiativeToggle.remove()
      window.__combatInitiativeHidden = false
      if (isGM && typeof closeCombatPreviewHUD === "function") closeCombatPreviewHUD()
      if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
      return
    }
    const currentEntry = data.phase === "active" && Array.isArray(data.order)
      ? data.order.find(entry => String(entry.id || "") === String(data.currentActorId || ""))
      : null
    if (isGM && currentEntry && currentEntry.type === "player") {
      const currentToken = document.getElementById(currentEntry.id)
      const currentIsDead = !combatActorAlive({characters:window.__publicCharacters||{},combat:window.__combatSnapshot||{}},currentEntry.id)
      if (currentIsDead) {
        if (window.__skippingDeadCombatTurn !== currentEntry.id) {
          window.__skippingDeadCombatTurn = currentEntry.id
          showNotification(combatParticipantDisplayName(currentEntry).toUpperCase() + " est KO et passe son tour.")
          setTimeout(() => {
            if (typeof advanceCombatTurn === "function" && getCurrentCombatActorId() === currentEntry.id) advanceCombatTurn()
          }, 150)
        }
        renderCombatInitiativeOverlay(data)
        if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
        return
      }
    }
    window.__skippingDeadCombatTurn = ""

    // Réinitialise le verrou d'attaque quand le tour change
    if (data.phase === "active" && !isGM) window.__playerAttackResolving = false

    // Auto-fermer quand tous les dés sont tirés (transition rolling → active)
    const prevPhase = window.__lastCombatPhase || null
    window.__lastCombatPhase = data.phase
    if (data.phase === "active" && prevPhase === "rolling") {
      window.__combatInitiativeHidden = true
      window.__lastCombatActorId = null
      closeCombatInitiativeOverlay()
      renderCombatInitiativeToggle(data)
      if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
      if (typeof showCombatHUD === "function") showCombatHUD()
      if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
      queueCombatTurnBanner(window.__combatSnapshot?.id || "legacy",data)
      return
    }

    // Détection changement de tour
    if (data.phase === "active" && data.currentActorId) {
      const prevActor = window.__lastCombatActorId || null
      window.__lastCombatActorId = data.currentActorId
      if (data.currentActorId !== prevActor) {
        if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
        queueCombatTurnBanner(window.__combatSnapshot?.id || "legacy",data)
      }
    }

    renderCombatInitiativeOverlay(data)
    if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
    if (isGM && typeof setCombatPreviewPlayer === "function" && data.phase === "active") {
      if (currentEntry && currentEntry.type === "player" && window.__combatPreviewPlayerId) {
        setCombatPreviewPlayer(currentEntry.id)
      } else if (window.__combatPreviewPlayerId && typeof closeCombatPreviewHUD === "function" && currentEntry && currentEntry.type !== "player") {
        closeCombatPreviewHUD()
      }
    }
    if (isGM) finalizeCombatInitiativeIfReady(data)
  })

  db.ref("game/combatState").on("value", snap => {
  if (window.__sessionBusy) return
    const data = snap.val()

    if (!gameStarted) return
    if (gameState !== "GAME" && gameState !== "COMBAT" && gameState !== "DIALOGUE") return

    if (!data || !data.active) {
      if (!isGM && (window.__combatOutcomeShowing || window.__pendingLocalDefeat)) return
      if (!isGM && (combatActive || gameState === "COMBAT" || window.__combatOutcomeShowing || window.__pendingLocalDefeat)) {
        _resolveRemoteCombatEnd()
      }
      return
    }

    _startRemoteCombat(data)
  })
})


document.addEventListener("DOMContentLoaded", () => {
  db.ref("combat/playerSpecials").on("value", s => { window.__playerCombatSpecialsUsed = s.val() || {} })
  db.ref("combat/playerFlags").on("value", s => { window.__playerCombatFlags = s.val() || {} })
})
