function getMadnessZoneFactor() {
  const map = (currentMap || "").toLowerCase()
  if (map.includes("foret")) return 1.35
  if (map.includes("portail")) return 1.1
  return 1
}

function isMadnessActiveMap() {
  const map = (currentMap || "").toLowerCase()
  return map.includes("foret") || map.includes("portail")
}

function getMadnessTier(value) {
  if (value >= 100) return 4
  if (value >= 75) return 3
  if (value >= 50) return 2
  if (value >= 25) return 1
  return 0
}

function stopMadnessLoops() {
  ;["madnessLow", "madnessMid", "madnessHigh", "madnessPeak"].forEach(id => {
    const audio = document.getElementById(id)
    if (!audio) return
    audio.volume = 0
    audio.pause()
    audio.currentTime = 0
  })
  window.currentMadnessLoopId = null
}

function clearMadnessResidualEffects() {
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")

  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }

  if (overlay) {
    overlay.style.display = "none"
    overlay.style.opacity = "0"
    overlay.style.background = ""
    overlay.classList.remove("active", "pulse")
  }

  if (cameraEl) {
    cameraEl.style.filter = ""
    cameraEl.classList.remove("madnessWarp")
    cameraEl.style.transform = ""
  }
}

function playMadnessLoopForTier(tier, value) {
  if (tier <= 0 || !isMadnessActiveMap() || combatActive || gameState !== "GAME") {
    stopMadnessLoops()
    return
  }

  const audioMap = {
    1: document.getElementById("madnessLow"),
    2: document.getElementById("madnessMid"),
    3: document.getElementById("madnessHigh"),
    4: document.getElementById("madnessPeak")
  }
  const audio = audioMap[tier]
  const targetId = audio ? audio.id : null
  if (!audio) {
    stopMadnessLoops()
    return
  }

  const targetVolume = Math.min(0.85, (0.18 + value / 180) * getMadnessZoneFactor())

  if (window.currentMadnessLoopId === targetId && !audio.paused) {
    setManagedAudioBaseVolume(audio,targetVolume,"effects")
    return
  }

  stopMadnessLoops()
  window.currentMadnessLoopId = targetId
  audio.currentTime = 0
  audio.loop = true
  setManagedAudioBaseVolume(audio,targetVolume,"effects")
  audio.play().catch(() => {})
}

function playMadnessHit() {
  const hit = document.getElementById("whisperHit")
  if (!hit || combatActive || gameState !== "GAME") return
  hit.currentTime = 0
  setManagedAudioBaseVolume(hit,Math.min(0.95, 0.45 * getMadnessZoneFactor()),"effects")
  hit.play().catch(() => {})
}

function updateWorldMapFogTopLeft() {
  if(typeof syncWorldPartyMarker==="function")syncWorldPartyMarker()
  if(typeof syncOregonVoyage==="function")syncOregonVoyage()
  if(typeof syncNightMode==="function")syncNightMode()
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog) return
  const shouldShow = currentMap === "MAPMONDE.jpg" && !window.worldMapFogTopLeftHidden && gameState === "GAME"
  fog.style.transition = "opacity 0.5s ease"
  fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
  fog.style.display = shouldShow ? "block" : "none"
  fog.style.opacity = shouldShow ? "0.98" : "0"
}

function toggleWorldMapFogTopLeft() {
  if (!isGM) return
  db.ref("game/worldMapFogTopLeftHidden").set(!window.worldMapFogTopLeftHidden)
}

function revealWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog || currentMap !== "MAPMONDE.jpg" || gameState !== "GAME") return
  fog.style.display = "block"
  fog.style.opacity = "0.98"
  fog.style.transition = "opacity 2s ease, filter 2s ease, transform 0.18s ease"
  fog.style.filter = "brightness(1.4) drop-shadow(0 0 26px rgba(255,220,160,0.55))"
  fog.style.transform = "scale(1.03)"
  const revealSnd = new Audio("audio/pow.mp3")
  setManagedAudioBaseVolume(revealSnd, 0.85)
  revealSnd.play().catch(() => {})
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  requestAnimationFrame(() => {
    fog.style.opacity = "0"
    fog.style.filter = "brightness(1.05) drop-shadow(0 0 10px rgba(255,220,160,0.18))"
    fog.style.transform = "scale(1)"
  })
  setTimeout(() => {
    fog.style.display = "none"
    fog.style.transition = "opacity 0.5s ease"
    fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
    fog.style.transform = ""
  }, 2050)
}

function startMadnessShake(tier) {
  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }
  if (tier < 2) return

  const interval = tier >= 4 ? 2200 : tier === 3 ? 3400 : 5200
  window.madnessShakeInterval = setInterval(() => {
    if (combatActive || gameState !== "GAME") return
    if (tier >= 4) screenShakeHard()
    else screenShake()
  }, interval)
}

function updateMadnessVisibility() {
  const gauge = document.getElementById("madnessGauge")
  const overlay = document.getElementById("madnessOverlay")
  if (!gauge || !overlay) return

  const visible = gameState === "GAME" && !combatActive && isMadnessActiveMap()
  gauge.style.display = visible ? "flex" : "none"
  overlay.style.display = visible ? "block" : "none"

  if (!visible) {
    stopMadnessLoops()
    clearMadnessResidualEffects()
  }
  else playMadnessLoopForTier(window.groupMadnessTier, window.groupMadness)
}

function resetMadnessPresentation() {
  const gauge = document.getElementById("madnessGauge")
  stopMadnessLoops()
  if (gauge) gauge.style.display = "none"
  clearMadnessResidualEffects()
}

function updateMadnessUI(value) {
  const gauge = document.getElementById("madnessGauge")
  const fill = document.getElementById("madnessGaugeFill")
  const glow = document.getElementById("madnessGaugeGlow")
  const label = document.getElementById("madnessGaugeValue")
  const mjValues = document.querySelectorAll("#madnessMJValue")
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")
  if (!gauge || !fill || !glow || !label || !overlay) return

  if (!isMadnessActiveMap()) {
    gauge.style.display = "none"
    stopMadnessLoops()
    clearMadnessResidualEffects()
    mjValues.forEach(el => { el.innerText = Math.max(0, Math.min(100, value)) + " / 100" })
    return
  }

  const pct = Math.max(0, Math.min(100, value))
  const tier = getMadnessTier(pct)
  const zoneFactor = getMadnessZoneFactor()

  gauge.classList.remove("tier-0", "tier-1", "tier-2", "tier-3", "tier-4")
  gauge.classList.add("tier-" + tier)
  fill.style.width = pct + "%"
  glow.style.width = pct + "%"
  label.innerText = pct + " / 100"
  mjValues.forEach(el => { el.innerText = pct + " / 100" })

  overlay.classList.toggle("active", pct > 0)
  overlay.classList.toggle("pulse", tier >= 2)
  overlay.style.opacity = pct <= 0 ? "0" : String(Math.min(0.82, (pct / 140) * zoneFactor))
  if (cameraEl) {
    const blur = pct >= 75 ? 1.6 : pct >= 50 ? 1.1 : pct >= 25 ? 0.5 : 0
    const brightness = pct >= 75 ? 0.82 : pct >= 50 ? 0.9 : pct >= 25 ? 0.96 : 1
    cameraEl.style.filter = combatActive ? "" : `blur(${blur}px) brightness(${brightness}) saturate(${1 + pct / 250})`
    if (pct >= 75 && gameState === "GAME" && !combatActive) {
      cameraEl.classList.add("madnessWarp")
      setTimeout(() => cameraEl.classList.remove("madnessWarp"), 350)
    }
  }

  if (tier >= 4) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(150,20,20,0.14) 0%, rgba(50,0,0,0.24) 42%, rgba(0,0,0,0.64) 100%)"
  } else if (tier >= 2) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(110,30,20,0.1) 0%, rgba(24,0,0,0.16) 48%, rgba(0,0,0,0.48) 100%)"
  } else {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(90,40,20,0.06) 0%, rgba(12,0,0,0.12) 48%, rgba(0,0,0,0.38) 100%)"
  }

  if (tier !== window.groupMadnessTier) {
    if (tier > 0) playMadnessHit()
    window.groupMadnessTier = tier
  }

  playMadnessLoopForTier(tier, pct)
  startMadnessShake(tier)
  updateMadnessVisibility()
}

function setGroupMadness(value) {
  if (!isGM) return
  const clamped = Math.max(0, Math.min(100, value))
  db.ref("game/groupMadness").set(clamped)
}

function changeGroupMadness(delta) {
  if (!isGM) return
  db.ref("game/groupMadness").transaction(current => {
    return Math.max(0, Math.min(100, (parseInt(current, 10) || 0) + delta))
  }, err => { if (err) console.error("changeGroupMadness transaction failed:", err) })
}

function resetGroupMadness() {
  setGroupMadness(0)
}

function ensureMadnessGMButton() {}

/* ========================= */
/* FIREBASE LISTENERS        */
/* UN SEUL par chemin        */
/* Initialisés après chargement complet (ui.js + combat.js disponibles) */
/* ========================= */

