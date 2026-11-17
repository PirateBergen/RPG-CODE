function closeCombatInitiativeOverlay() {
  const overlay = document.getElementById("combatInitiativeOverlay")
  if (overlay) overlay.remove()
}

function renderCombatInitiativeToggle(state) {
  const existing = document.getElementById("combatInitiativeToggle")
  if (existing) existing.remove()
  if (!combatActive || !state) return

  const wrap = document.createElement("div")
  wrap.id = "combatInitiativeToggle"
  wrap.classList.add("combatInitiativeToggleLayout")

  const btn = document.createElement("button")
  btn.classList.add("combatInitiativeOrderButton")
  btn.innerText = state.phase === "rolling" ? "🎲 Dés d'init" : "📋 Ordre"
  btn.onclick = () => {
    window.__combatInitiativeHidden = false
    renderCombatInitiativeOverlay(state)
  }
  wrap.appendChild(btn)

  if (isGM && state.phase === "rolling") {
    const rollAllBtn = document.createElement("button")
    rollAllBtn.classList.add("combatInitiativeRollAllToggle")
    rollAllBtn.innerText = "⚡ Tout lancer"
    rollAllBtn.onclick = () => {
      if (typeof submitAllInitiativeRollsForGMTest === "function") submitAllInitiativeRollsForGMTest()
    }
    wrap.appendChild(rollAllBtn)
  }

  document.body.appendChild(wrap)
}

function renderCombatInitiativeOverlay(state) {
  closeCombatInitiativeOverlay()
  if (!combatActive || !state) return
  if (window.__combatInitiativeHidden) {
    renderCombatInitiativeToggle(state)
    return
  }

  const existingToggle = document.getElementById("combatInitiativeToggle")
  if (existingToggle) existingToggle.remove()

  const overlay = document.createElement("div")
  overlay.id = "combatInitiativeOverlay"
  overlay.classList.add("combatInitiativeOverlay")

  const box = document.createElement("div")
  box.classList.add("combatInitiativePanel")

  const topBar = document.createElement("div")
  topBar.classList.add("combatInitiativeCloseRow")
  const hideBtn = document.createElement("button")
  hideBtn.classList.add("combatInitiativeCloseButton")
  hideBtn.innerText = "Fermer"
  hideBtn.onclick = () => {
    window.__combatInitiativeHidden = true
    closeCombatInitiativeOverlay()
    renderCombatInitiativeToggle(state)
  }
  topBar.appendChild(hideBtn)
  box.appendChild(topBar)

  const title = document.createElement("div")
  title.classList.add("combatInitiativeTitle")
  title.innerText = state.phase === "rolling" ? "Initiative du Combat" : "Ordre du Combat"
  box.appendChild(title)

  const sub = document.createElement("div")
  sub.classList.add("combatInitiativeSubtitle")
  sub.innerText = state.phase === "rolling"
    ? "Chaque combattant lance un D12. Le MJ lance pour les mobs."
    : "Round " + (state.round || 1) + " — tour actuel : " + heroDisplayName(state.currentActorId).toUpperCase() + (window.__combatSnapshot?.[state.currentActorId]?.actionsPerTurn>1?" — action "+((state.actorActionIndex||0)+1)+"/2":"")
  box.appendChild(sub)

  const grid = document.createElement("div")
  grid.classList.add("combatInitiativeGrid")
  box.appendChild(grid)

  let entries = state.phase === "active"
    ? (Array.isArray(state.order) ? state.order : [])
    : (Array.isArray(state.participants) ? state.participants : [])

  // Joueur : pendant la phase de jet, n'affiche que sa propre carte
  if (!isGM && state.phase === "rolling" && myToken) {
    entries = entries.filter(e => e.id !== "bibi" && canAccessCharacter(String(e.id || "")))
  }

  entries.forEach((entry, idx) => {
    const card = document.createElement("div")
    const isCurrent = state.phase === "active" && String(state.currentActorId || "") === String(entry.id || "")
    card.classList.add("combatInitiativeCard"); card.classList.toggle("is-current",isCurrent)

    const portrait = document.createElement("img")
    portrait.src = "images/" + sanitizeAssetName(entry.id === "ju" ? heroPortraitFile("ju") : entry.image || "")
    portrait.classList.add("combatInitiativePortrait")
    portrait.onerror = () => { portrait.style.display = "none" }
    card.appendChild(portrait)

    const name = document.createElement("div")
    name.classList.add("combatInitiativeName")
    name.innerText = state.phase === "active" ? (idx + 1) + ". " + combatParticipantDisplayName(entry) : combatParticipantDisplayName(entry)
    card.appendChild(name)

    const rollVal = state.rolls && state.rolls[entry.id]
      ? parseInt(state.rolls[entry.id], 10)
      : (state.phase === "active" ? parseInt(entry.roll, 10) : null)

    const roll = document.createElement("div")
    roll.classList.add("combatInitiativeRoll")
    const initiativeBonus=state.initiativeBonuses?.[entry.id]||0
    roll.innerText = Number.isFinite(rollVal) ? "D12 : " + rollVal+(initiativeBonus?" + "+initiativeBonus+" = "+(rollVal+initiativeBonus):"") : "—"
    card.appendChild(roll)

    if (state.phase === "rolling") {
      if (canRollInitiativeForActor(entry.id, state)) {
        const btn = document.createElement("button")
        btn.classList.add("combatInitiativeRollButton")
        btn.innerText = "Lancer D12"
        btn.onclick = () => submitInitiativeRoll(entry.id)
        card.appendChild(btn)
      } else if (isGM && !Number.isFinite(rollVal) && !initiativeRollsInFlight.has(initiativeRollKey(entry.id))) {
        const gmBtn = document.createElement("button")
        gmBtn.classList.add("combatInitiativeTestRollButton")
        gmBtn.innerText = "Test MJ"
        gmBtn.onclick = () => submitInitiativeRollForGMTest(entry.id)
        card.appendChild(gmBtn)
      } else {
        const waiting = document.createElement("div")
        waiting.classList.add("combatInitiativeWaiting")
        waiting.innerText = Number.isFinite(rollVal) ? "Jet validé" : "En attente"
        card.appendChild(waiting)
      }
    } else {
      const status = document.createElement("div")
      status.classList.add("combatInitiativeStatus"); status.classList.toggle("is-current",isCurrent)
      status.innerText = isCurrent ? "Tour actif" : "En attente"
      card.appendChild(status)
      if (isGM && entry.type === "player" && typeof setCombatPreviewPlayer === "function") {
        const previewBtn = document.createElement("button")
        previewBtn.classList.add("combatInitiativePreviewButton")
        previewBtn.innerText = isCurrent ? "Tester le tour" : "Test HUD"
        previewBtn.onclick = () => setCombatPreviewPlayer(entry.id)
        card.appendChild(previewBtn)
      }
    }

    grid.appendChild(card)
  })

  if (isGM) {
    const tools = document.createElement("div")
    tools.classList.add("combatInitiativeTools")

    if (state.phase === "rolling") {
      const allBtn = document.createElement("button")
      allBtn.classList.add("combatInitiativeRollAllButton")
      allBtn.innerText = "MJ Test : lancer tous les D12"
      allBtn.onclick = () => submitAllInitiativeRollsForGMTest()
      tools.appendChild(allBtn)
    } else {
      const currentEntry = entries.find(entry => String(entry.id || "") === String(state.currentActorId || ""))
      if (currentEntry && currentEntry.type === "player" && typeof setCombatPreviewPlayer === "function") {
        const currentBtn = document.createElement("button")
        currentBtn.classList.add("combatInitiativePreviewCurrentButton")
        currentBtn.innerText = "MJ Test : ouvrir le HUD de " + combatParticipantDisplayName(currentEntry)
        currentBtn.onclick = () => setCombatPreviewPlayer(currentEntry.id)
        tools.appendChild(currentBtn)
      }
      if (typeof closeCombatPreviewHUD === "function") {
        const closeBtn = document.createElement("button")
        closeBtn.classList.add("combatInitiativeClosePreviewButton")
        closeBtn.innerText = "Fermer le HUD test"
        closeBtn.onclick = () => closeCombatPreviewHUD()
        tools.appendChild(closeBtn)
      }
    }

    box.appendChild(tools)
  }

  overlay.appendChild(box)
  document.body.appendChild(overlay)
}

