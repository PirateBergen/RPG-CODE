function startCombat(mob, forceTier) {
  if (combatStarting || !isGM) return
  if (combatActive) { showNotification("Terminez le combat en cours avant d’en lancer un autre"); return }
  // Balraug uniquement sur sa map
  if (mob === "balraug" && currentMap !== "balraug.jpg") {
    showNotification("⚠ Balraug ne peut être invoqué que dans sa map !")
    return
  }
  // Kraken uniquement sur le Maelstrom
  if (mob === "kraken" && currentMap !== "tourbillon.jpg") {
    showNotification("⚠ Le Kraken ne peut être invoqué que sur le Maelstrom !")
    return
  }
  combatActive = false
  showMobSelectionMenu(mob, forceTier)
}

function showMobSelectionMenu(mainMob, forceTier) {
  _state.pendingMob  = mainMob
  _state.pendingTier = forceTier
  const menu = document.getElementById("mobSelectionMenu")
  if (!menu) return
  ;["mobSlot2Select","mobSlot3Select"].forEach(id => {
    const el = document.getElementById(id)
    if (el) { el.innerText = "— Aucun —"; el.dataset.value = "" }
  })
  ;["mobDropdown_slot2","mobDropdown_slot3"].forEach(id => {
    const dd = document.getElementById(id)
    if (dd) { dd.style.display = "none"; dd.innerHTML = ""; delete dd.dataset.built }
  })
  const sub = document.getElementById("mobMenuSub")
  if (sub) sub.innerText = "Mob principal : " + heroDisplayName(mainMob).toUpperCase()
  menu.style.display = "flex"
  menu.style.setProperty("background-color", "rgb(8,0,0)", "important")
  setTimeout(() => updateMobPreview(), 50)

  const canvas = document.getElementById("mobMenuBg")
  if (canvas) {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const ctx  = canvas.getContext("2d")
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width*0.7)
    grad.addColorStop(0, "rgb(60,5,5)"); grad.addColorStop(1, "rgb(5,0,0)")
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

function launchFromMobMenu() {
  const mob2 = document.getElementById("mobSlot2Select")?.dataset.value || null
  const mob3 = document.getElementById("mobSlot3Select")?.dataset.value || null
  document.getElementById("mobSelectionMenu").style.display = "none"
  _launchCombatWithMobs(_state.pendingMob, _state.pendingTier, [mob2, mob3].filter(Boolean))
}

function _launchCombatWithMobs(mainMob, forceTier, extraMobs) { return launchReliableCombat(mainMob, forceTier, extraMobs) }

