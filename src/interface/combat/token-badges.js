function ensureTokenStateBadgeContainer(token) {
  if (!token) return null
  let container = token.querySelector(".tokenStateBadges")
  if (!container) {
    container = document.createElement("div")
    container.className = "tokenStateBadges"
    token.appendChild(container)
  }
  return container
}

function setTokenStateBadges(tokenId, badges) {
  const token = document.getElementById(tokenId)
  if (!token) return
  const container = ensureTokenStateBadgeContainer(token)
  if (!container) return
  container.innerHTML = ""
  ;(badges || []).forEach(badge => {
    const el = document.createElement("div")
    el.className = "tokenStateBadge tokenStateBadge--" + (badge.kind || "buff")
    el.innerText = badge.label || "?"
    el.title = badge.title || badge.label || ""
    container.appendChild(el)
  })
}

function clearCombatTokenStateVisuals() {
  document.querySelectorAll(".combatTargetNumber").forEach(el=>el.remove())
  ;["greg","ju","elo","bibi","mobToken","eloSummonToken"].forEach(id => {
    const token = document.getElementById(id)
    if (!token) return
    token.classList.remove("token--active-turn", "token--aggro", "token--marked")
    const badges = token.querySelector(".tokenStateBadges")
    if (badges) badges.innerHTML = ""
  })
}

function resetLocalCombatVisualState() {
  window.__combatTurnState = null
  window.__combatYuAggroState = null
  window.__combatSpiderSenseBuffState = null
  window.__combatBibiRageState = null
  window.__combatAttackMalusState = null
  window.__combatPlayerPoisonState = null
  window.__combatPlayerBleedState = null
  window.__eloSummonState = null
  clearCombatTokenStateVisuals()
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
}

