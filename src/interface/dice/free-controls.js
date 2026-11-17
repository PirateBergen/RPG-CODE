function rollDice(max) {
  let playerName
  if (isGM) { playerName = "MJ" }
  else {
    if (!myToken) { showNotification("Choisissez un personnage !"); return }
    playerName = myToken.id
  }
  const result = Math.floor(Math.random() * max) + 1
  applyFreeDiceConsequences(playerName,max,result)
  db.ref("diceRoll").push({ player: playerName, dice: max, result, time: Date.now(), sender: playerName })
}

function gmRoll(max) {
  if (!isGM) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MJ", dice: max, result, time: Date.now(), sender: "MJ" })
}

function toggleDiceBar(forceState) {
  const bar = document.getElementById("diceBar")
  const toggle = document.getElementById("diceBarToggle")
  if (!bar || !toggle) return
  const collapsed = typeof forceState === "boolean" ? forceState : !bar.classList.contains("collapsed")
  bar.classList.toggle("collapsed", collapsed)
  toggle.innerText = collapsed ? "▴" : "▾"
  toggle.setAttribute("aria-label", collapsed ? "Déplier les dés" : "Replier les dés")
}

function toggleGMDamageControls(forceState) {
  const panel = document.getElementById("gmDamagePanel")
  const toggle = document.getElementById("gmDamageToggle")
  if (!panel || !toggle) return
  const collapsed = typeof forceState === "boolean" ? forceState : !panel.classList.contains("collapsed")
  panel.classList.toggle("collapsed", collapsed)
  toggle.innerText = collapsed ? "◀" : "▼"
  toggle.setAttribute("aria-label", collapsed ? "Afficher les contrôles du combat" : "Masquer les contrôles du combat")
}

function initGMCombatPanelsDrag() {
  if (window.__gmCombatPanelsDragInit) return
  window.__gmCombatPanelsDragInit = true

  const makeDraggable = (id) => {
    const panel = document.getElementById(id)
    if (!panel) return

    let dragging = false
    let offsetX = 0
    let offsetY = 0

    panel.addEventListener("mousedown", e => {
      if (!isGM) return
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("label")) return
      dragging = true
      const rect = panel.getBoundingClientRect()
      offsetX = e.clientX - rect.left
      offsetY = e.clientY - rect.top
      panel.style.cursor = "grabbing"
      panel.style.left = rect.left + "px"
      panel.style.top = rect.top + "px"
      panel.style.right = "auto"
      panel.style.bottom = "auto"
      e.preventDefault()
    })

    document.addEventListener("mousemove", e => {
      if (!dragging) return
      const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth)
      const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight)
      const left = Math.max(0, Math.min(maxLeft, e.clientX - offsetX))
      const top = Math.max(0, Math.min(maxTop, e.clientY - offsetY))
      panel.style.left = left + "px"
      panel.style.top = top + "px"
    })

    document.addEventListener("mouseup", () => {
      if (!dragging) return
      dragging = false
      panel.style.cursor = "grab"
    })

    panel.style.cursor = "grab"
  }

}

function mobRoll(max) {
  if (!isGM || !combatActive) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MOB", dice: max, result, time: Date.now(), sender: "MJ" })
}

