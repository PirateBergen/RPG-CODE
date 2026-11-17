function updateCombatTokenStateVisuals() {
  if (!combatActive) {
    clearCombatTokenStateVisuals()
    return
  }

  const activeActorId = (typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null) || ""
  ;["greg","ju","elo","bibi","mobToken","eloSummonToken"].forEach(id => {
    const token = document.getElementById(id)
    if (token) token.classList.remove("token--active-turn")
  })

  const activeTokenMap = {
    greg: "greg",
    ju: "ju",
    elo: "elo",
    bibi: "bibi",
    mob: "mobToken"
  }
  const activeTokenId = activeTokenMap[activeActorId] || (activeActorId === "eloSummon" ? "eloSummonToken" : "")
  if (activeTokenId) {
    const activeToken = document.getElementById(activeTokenId)
    if (activeToken && combatActive) activeToken.classList.add("token--active-turn")
  }

  const yuToken = document.getElementById("ju")
  if (yuToken) {
    const aggroTurns = parseInt(window.__combatYuAggroState?.turns, 10) || 0
    const spiderSense = !!(window.__combatSpiderSenseBuffState && window.__combatSpiderSenseBuffState.active)
    yuToken.classList.toggle("token--aggro", combatActive && aggroTurns > 0)
    const yuBadges = []
    if (aggroTurns > 0) {
      yuBadges.push({
        kind: "warn",
        label: "AGGRO " + aggroTurns,
        title: "Pika attire le mob pendant encore " + aggroTurns + " tour(s)"
      })
    }
    if (spiderSense) {
      yuBadges.push({
        kind: "buff",
        label: "SENSE",
        title: "Spider Sense est actif pour tout le combat"
      })
    }
    if (activeActorId === "ju") {
      yuBadges.unshift({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour de Pika"
      })
    }
    setTokenStateBadges("ju", yuBadges)
  }

  const gregToken = document.getElementById("greg")
  if (gregToken) {
    const gregBadges = []
    if (window.__combatBibiRageState && parseInt(window.__combatBibiRageState.turns, 10) > 0) {
      gregBadges.push({
        kind: "buff",
        label: "BIBI " + (parseInt(window.__combatBibiRageState.turns, 10) || 0),
        title: "Le Bibi renforce les attaques alliées"
      })
    }
    if (activeActorId === "greg") {
      gregBadges.unshift({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour de Greg"
      })
    }
    setTokenStateBadges("greg", gregBadges)
  }

  const eloToken = document.getElementById("elo")
  if (eloToken) {
    const eloBadges = []
    if (window.__eloSummonState && window.__eloSummonState.active) {
      eloBadges.push({
        kind: "ally",
        label: "PORK+",
        title: "John Pork renforce les dégâts d'Elo"
      })
    }
    if (activeActorId === "elo") {
      eloBadges.unshift({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour d'Elo"
      })
    }
    setTokenStateBadges("elo", eloBadges)
  }

  const bibiToken = document.getElementById("bibi")
  if (bibiToken) {
    const bibiBadges = []
    if (activeActorId === "bibi") {
      bibiBadges.push({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour de Bibi"
      })
    }
    setTokenStateBadges("bibi", bibiBadges)
  }

  const mobToken = document.getElementById("mobToken")
  if (mobToken) {
    const poisonTurns = parseInt(window.__combatPlayerPoisonState?.turns, 10) || 0
    const bleedTurns = parseInt(window.__combatPlayerBleedState?.turns, 10) || 0
    const malusTurns = parseInt(window.__combatAttackMalusState?.turns, 10) || 0
    const revealedWeakness = window.__combatRevealedWeaknessState
    const badges = []
    if (activeActorId === "mob") badges.push({ kind: "warn", label: "TOUR", title: "C'est le tour du mob" })
    if (poisonTurns > 0) badges.push({ kind: "warn", label: "POI " + poisonTurns, title: "Poison actif" })
    if (bleedTurns > 0) badges.push({ kind: "warn", label: "SAI " + bleedTurns, title: "Saignement actif" })
    if (malusTurns > 0) badges.push({ kind: "warn", label: "ATK-" + (parseInt(window.__combatAttackMalusState?.amount, 10) || 1), title: "Attaque réduite" })
    if (revealedWeakness && revealedWeakness.title) badges.push({ kind: "warn", label: "FAILLE", title: revealedWeakness.title + " — " + (revealedWeakness.text || "") })
    mobToken.classList.toggle("token--marked", badges.length > 0)
    setTokenStateBadges("mobToken", badges)
  }

  const summonToken = document.getElementById("eloSummonToken")
  if (summonToken) {
    const summon = window.__eloSummonState
    const summonTurns = parseInt(summon?.turnsLeft, 10) || 0
    const summonHp = parseInt(summon?.hp, 10) || 0
    const badges = summon && summon.active ? [
      { kind: "ally", label: activeActorId === "eloSummon" ? "TOUR" : "PORK", title: activeActorId === "eloSummon" ? "C'est le tour de John Pork" : "John Pork est présent" },
      { kind: "ally", label: "PORK " + summonTurns, title: "John Pork actif pendant " + summonTurns + " tour(s)" },
      { kind: "ally", label: "HP " + summonHp, title: "Points de vie de John Pork" }
    ] : []
    setTokenStateBadges("eloSummonToken", badges)
  }
}

db.ref("combat/mob/yuAggro").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatYuAggroState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/spiderSenseBuff").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatSpiderSenseBuffState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/revealedWeakness").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatRevealedWeaknessState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("game/defeatedMobs").on("value", snap => {
  if (window.__sessionBusy) return
  window.__defeatedMobFlags = snap.val() || {}
  if(typeof syncForchurFog==="function")syncForchurFog()
})


db.ref("combat/mob/bibiRage").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatBibiRageState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/attackMalus").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatAttackMalusState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/playerPoison").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatPlayerPoisonState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/playerBleed").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatPlayerBleedState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

// ─── elements ───
db.ref("elements").on("child_added", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (data && (gameState === "GAME" || gameState === "COMBAT")) renderMapElement(data)
})
db.ref("elements").on("child_changed", snap => {
  if (window.__sessionBusy) return
  const data = snap.val(); if (!data) return
  const el = document.getElementById("elem_" + data.id)
  if (el) { el.style.left = data.x + "px"; el.style.top = data.y + "px" }
})
db.ref("elements").on("child_removed", snap => {
  const el = document.getElementById("elem_" + snap.key)
  if (el) { el.style.transition = "opacity 0.4s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 400) }
})

