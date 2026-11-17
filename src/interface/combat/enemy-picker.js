function openMobDiff(mobId, event) {
  if (!isGM) return
  event.stopPropagation(); _state.mobDiffPending = mobId
  const popup  = document.getElementById("mobDiffPopup")
  const nameEl = document.getElementById("mobDiffName")
  if (!popup) return

  const bossMobs = [...CLASSIC_BOSS_NAMES,...WORLD_BOSS_NAMES]
  const noWeak   = ["golem","pretre","zombie","zombie2","maire","intendantbrume","conseillerroinord","generalmelenchon","jarl baldur","garde baldur"]

  popup.querySelectorAll("button").forEach(btn => {
    const match = btn.getAttribute("onclick")?.match(/launchMobDiff\('(\w+)'\)/)
    const tier  = match?.[1]; if (!tier) return
    if(tier==="boss")btn.textContent=WORLD_BOSS_NAMES.includes(mobId)?"🌍 World boss":"⚡ Boss"
    if (bossMobs.includes(mobId))    btn.style.display = tier === "boss" ? "block" : "none"
    else if (noWeak.includes(mobId)) btn.style.display = tier === "weak" ? "none"  : "block"
    else                             btn.style.display = "block"
  })

  nameEl.innerText = heroDisplayName(mobId).toUpperCase()
  let x = event.clientX, y = event.clientY
  if (x + 150 > window.innerWidth)  x = window.innerWidth  - 160
  if (y + 160 > window.innerHeight) y = window.innerHeight - 170
  popup.style.left = x + "px"; popup.style.top = y + "px"; popup.style.display = "block"
  setTimeout(() => document.addEventListener("mousedown", closeMobDiffOnce), 10)
}

function closeMobDiffOnce(e) {
  const popup = document.getElementById("mobDiffPopup")
  if (popup && !popup.contains(e.target)) { popup.style.display = "none"; document.removeEventListener("mousedown", closeMobDiffOnce) }
}

function launchMobDiff(tier) {
  const popup = document.getElementById("mobDiffPopup"); if (popup) popup.style.display = "none"
  document.removeEventListener("mousedown", closeMobDiffOnce)
  if (_state.mobDiffPending) startCombat(_state.mobDiffPending, tier)
  _state.mobDiffPending = null
}

/* ========================= */
/* DROPDOWN MENU MOB         */
/* ========================= */

