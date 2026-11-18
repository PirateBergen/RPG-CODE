
Object.assign(window,{showMobSpecialAttackEvent,showMobAttackPresentation,cleanupRuneChallengeUI,ensureCemeteryGlyphIntro,ensureTokenStateBadgeContainer,setTokenStateBadges,clearCombatTokenStateVisuals,resetLocalCombatVisualState,cleanupTransientGameUI,finalizeNewGameLocally,updateCombatTokenStateVisuals,syncMapElementsFromDB,syncWantedStateFromDB})
window.__pageLoadTime = Date.now()
try { window.isNewGame = sessionStorage.getItem(persistenceStorageKey("rpg_session_transition")) === "new"; sessionStorage.removeItem(persistenceStorageKey("rpg_session_transition")) } catch (e) {}
window.__introClickLockUntil = 0

// ─── startScreen : un seul handler pointerdown, pas d'onclick inline ───
const startScreen = document.getElementById("startScreen")
if (startScreen) {
  startScreen.style.zIndex = "999999999"
  startScreen.style.pointerEvents = "auto"
  startScreen.addEventListener("pointerdown", safeStartIntro, { passive: false })
}
document.addEventListener("click", function(event) {
  if (Date.now() < (window.__introClickLockUntil || 0)) {
    const intro = document.getElementById("intro")
    if (intro && intro.contains(event.target)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}, true)

initGMCombatPanelsDrag()
  
// Masquer les PNJ immédiatement au chargement
;["storyImage","storyImage2","storyImage3"].forEach(id => {
  const el = document.getElementById(id)
  if (el) { el.style.display = "none"; el.style.opacity = "0" }
})

const madnessGauge = document.getElementById("madnessGauge")
if (madnessGauge) madnessGauge.style.display = "none"
resetMadnessPresentation()
if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()

// ─── combat/hits — log des dégâts (sync tous les clients) ───
db.ref("combat/hits").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) {
    window.__combatDamageLog = []
    window.__combatHitLogSeen = {}
    if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
    return
  }
  const hits = Object.values(data).reverse().sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 30)
  window.__combatDamageLog = hits
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
})

db.ref("combat/hits").on("child_added", snap => {
  if (window.__sessionBusy) return
  const hit = snap.val()
  if (!hit || !hit.detail) return
  if (hit.time && hit.time < gameStartTime) return
  window.__combatHitLogSeen = window.__combatHitLogSeen || {}
  if (window.__combatHitLogSeen[snap.key]) return
  window.__combatHitLogSeen[snap.key] = true
  if (typeof addCombatLog === "function") addCombatLog(String(hit.detail))
})

// ─── combat/mob — listener unique fusionné ───
db.ref("combat/mob").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  activeMobSlots["mob"] = !!data

  // Barre HP panneau MJ
  const topBar  = document.getElementById("mobHPBarTopFill")
  const topText = document.getElementById("mobHPTopText")
  if (topBar && topText && data) {
    const pct = Math.max(0, Math.min(100, (data.hp / data.maxHP) * 100))
    topBar.style.width = pct + "%"
    topText.innerText  = heroDisplayName(data.name).toUpperCase() + "  " + data.hp + " / " + data.maxHP + "  (Niv " + (data.lvl || "?") + ")"
    topBar.style.background = pct > 60 ? "linear-gradient(90deg,#3cff6b,#0b8a3a)" : pct > 30 ? "linear-gradient(90deg,#ffb347,#ff7b00)" : "linear-gradient(90deg,#ff4040,#8b0000)"
  }

  const hud = document.getElementById("mobHUD")
  if (!combatActive || !data) {
    if (hud) hud.style.display = "none"
    const token = document.getElementById("mobToken")
    if (token) token.style.display = "none"
    const mobAttackPanel = document.getElementById("mobAttackPanel")
    if (mobAttackPanel) mobAttackPanel.remove()
    const mobAttackToggle = document.getElementById("mobAttackToggle")
    if (mobAttackToggle) mobAttackToggle.remove()
    return
  }

  // Token HUD (barre au-dessus du token)
  const tokenBar  = document.getElementById("mobTokenHPBar")
  const tokenText = document.getElementById("mobTokenHPText")
  if (tokenBar && tokenText) {
    const pct = (data.hp / data.maxHP) * 100
    tokenBar.style.width = pct + "%"
    tokenText.innerText  = data.hp + " / " + data.maxHP
  }

  const nameEl = document.getElementById("mobName")
  if (nameEl) nameEl.innerText = heroDisplayName(data.name).toUpperCase() + "  •  NIV " + (data.lvl || "?")
  const hpText = document.getElementById("mobHPText")
  if (hpText) hpText.innerText = "HP " + data.hp + " / " + data.maxHP

    if (isGM) {
      hud.style.display = "block"
      activeMobSlots["mob"] = true
      const mobAttackPanel = document.getElementById("mobAttackPanel")
      const mobPanelMissing = !mobAttackPanel || mobAttackPanel.style.display === "none"
      if (typeof renderAllMobPanels === "function" && mobPanelMissing) {
        setTimeout(() => renderAllMobPanels(window.__combatSnapshot), 40)
      } else {
        const spFill = document.getElementById("subPanelHPFill_mob")
        if (spFill) {
          const spPct = Math.max(0, Math.min(100, (data.hp / data.maxHP) * 100))
          spFill.style.width = spPct + "%"
          spFill.style.background = spPct > 50 ? "#44ff44" : spPct > 25 ? "#ffaa00" : "#ff3333"
        }
      }
      if (lastMobHP !== null && data.hp < lastMobHP) { flashRed(); screenShake() }
      // L’issue collective est publiée par le coordinateur du combat.
      lastMobHP = data.hp
    } else {
      if (combatActive) {
        hud.style.display = "block"
        activeMobSlots["mob"] = true
      }
      // Ne pas déduire une victoire du seul ennemi principal.
    }
})

// ─── diceRoll ───
db.ref("diceRoll").on("child_added", snap => {
  if (!window.__sessionBusy) presentSharedDice(snap.key,snap.val())
})

db.ref("game/runeDiceEvent").on("value",snap=>{
  const data=snap.val()
  if(!window.__sessionBusy && data?.id && data.time >= (window.__pageLoadTime||0))enqueueSharedVisual("rune-"+data.id,()=>showRuneBubble(data.dialogue,data.letter,data.rune),6800)
})

// ─── storyImage slots ───
db.ref("game/storyImage").on("value", snap => {
  if (window.__sessionBusy) return
  const image = snap.val()
  // Masquer le PNJ sur tous les écrans sauf GAME et COMBAT
  const box = document.getElementById("storyImage")
  if (gameState !== "GAME" && gameState !== "COMBAT") {
    if (box) { box.style.display = "none"; box.style.opacity = "0" }
    document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
    return
  }
  if (image) showStoryImage(image)
  else       hideStoryImage()
})

db.ref("game/storyImage2").on("value", snap => {
  if (window.__sessionBusy) return
  const image = snap.val()
  const box2  = document.getElementById("storyImage2")
  const img2  = document.getElementById("storyImageContent2")
  if (!box2 || !img2) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box2.style.display="none"; box2.style.opacity="0"; return }
  if (image) {
    img2.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box2.style.opacity = "0"; box2.style.left = "0"; box2.style.right = "auto"; box2.style.transform = ""; box2.style.display = "flex"
    if (!pnjSlotOrder.includes(2)) pnjSlotOrder.push(2)
    updatePNJPositions()
    setTimeout(() => { box2.style.opacity = "1" }, 60)
  } else {
    box2.style.opacity = "0"
    setTimeout(() => { box2.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 2); updatePNJPositions() }, 500)
  }
})

db.ref("game/storyImage3").on("value", snap => {
  if (window.__sessionBusy) return
  const image = snap.val()
  const box3  = document.getElementById("storyImage3")
  const img3  = document.getElementById("storyImageContent3")
  if (!box3 || !img3) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box3.style.display="none"; box3.style.opacity="0"; return }
  if (image) {
    img3.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box3.style.opacity = "0"; box3.style.right = "0"; box3.style.left = "auto"; box3.style.transform = ""; box3.style.display = "flex"
    if (!pnjSlotOrder.includes(3)) pnjSlotOrder.push(3)
    updatePNJPositions()
    setTimeout(() => { box3.style.opacity = "1" }, 60)
  } else {
    box3.style.opacity = "0"
    setTimeout(() => { box3.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 3); updatePNJPositions() }, 500)
  }
})

// ─── tokens ───
db.ref("tokens").on("child_added",   updateTokenFromDB)
db.ref("tokens").on("child_changed", updateTokenFromDB)

// ─── characters ───
syncCharacterSubscriptions()

// ─── map ───
db.ref("game/map").on("value", snap => {
  if (window.__sessionBusy) return
  const mapName = snap.val()
  if (!mapName) return
  window.__latestMapValue = mapName
  if(combatActive&&window.__pendingCombatOutcome?.combatId===window.__localCombatId&&!window.__combatReturnInProgress)return
  if (gameState !== GAME_STATE.GAME && gameState !== GAME_STATE.COMBAT) return

  const map  = document.getElementById("map")
  const fade = document.getElementById("fadeScreen")
  const transition = window.__mapTransitionSequence = (window.__mapTransitionSequence || 0) + 1

  const previousMap = currentMap
  const isFirst = firstMapLoad
  if (isFirst) firstMapLoad = false
  if(previousMap&&previousMap!==mapName)cancelMapPresentations()
  currentMap = mapName
  if(typeof syncAntreAfterlifeView==="function")syncAntreAfterlifeView()
  preloadAssets(mapName)
  if(typeof refreshExplorationMapEvents==="function")refreshExplorationMapEvents()
  if(typeof playSharedMapAudio==="function")playSharedMapAudio(window.__explorationState?.mapAudio)
  if (previousMap && previousMap !== mapName) { closeMapLoreBookOverlay(); if (isGM) addSessionLog("🗺 Carte : " + (mapNames[mapName] || mapName)) }
  if (typeof stopBifrostFlashSound === "function") stopBifrostFlashSound(mapName==="bifrost.jpg")
  updateMadnessUI(window.groupMadness || 0)
  updateWorldMapFogTopLeft()
  updateMapLoreBookVisibility()
  setTimeout(() => updateBifrostBtn(), 100)

  fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = 1; fade.style.pointerEvents = "none"

  setTimeout(() => {
    if(transition !== window.__mapTransitionSequence)return
    map.style.backgroundImage = "url('images/" + mapName + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    updateWorldMapFogTopLeft()
    updateMapLoreBookVisibility()
    calculateMinZoom(); cameraZoom = minZoom; updateCamera()
    document.querySelectorAll(".token").forEach(t => spawnPortal(t.id))
    if (mapMusic[mapName] && !_state._pendingMapAudio) {
      const shouldKeepAuroraMusic = auroraActive && mapName !== "bifrost.jpg"
      const wantedMusic = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
      const activeMusic = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const activeName = activeMusic && activeMusic.src ? decodeURIComponent(activeMusic.src.replace(/.*\//, "").replace(/%20/g, " ")) : ""
      const wantedName = wantedMusic.replace(/.*\//, "").replace(/%20/g, " ")

      if (!shouldKeepAuroraMusic && !(activeName === wantedName && activeMusic && !activeMusic.paused && activeMusic.volume > 0.05)) {
        _musicTransitioning = false; _pendingMusic = null
        if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
        if (auroraActive && mapName === "bifrost.jpg") {
          const aurora = document.getElementById("auroraMusic")
          if (aurora) {
            aurora.pause()
            aurora.currentTime = 0
            aurora.volume = 0
          }
        }
        stopAllMusic()
        ensureMapMusicPlayback(mapName, 200)
      }
    }
  }, 800)

  setTimeout(() => {
    if(transition !== window.__mapTransitionSequence)return
    fade.style.transition = "opacity 1s ease"; fade.style.opacity = 0; fade.style.pointerEvents = "none"
    setTimeout(() => document.body.focus(), 100)
  }, 1200)

  setTimeout(() => {
    if(transition !== window.__mapTransitionSequence)return
    if (mapNames[mapName]) showLocation(mapNames[mapName])
    if (isGM && !auroraActive && Math.random() < 0.03) triggerAurora()
    if (isGM && mapName === "cimetiere.jpg" && !cemeteryEventDone) setTimeout(() => triggerCemeteryEvent(), 1500)
  }, 2200)
})

// ─── Connexion Firebase ───
db.ref(".info/connected").on("value", snap => {
  if (window.__sessionBusy) return
  const connected = !!snap.val()
  const dot   = document.getElementById("firebaseDot")
  const label = document.getElementById("firebaseDotLabel")
  if (dot) { dot.style.background = connected ? "#44ff88" : "#ff4444"; dot.style.boxShadow = connected ? "0 0 6px #44ff88" : "0 0 6px #ff4444" }
  if (label) label.textContent = connected ? "connecté" : "déconnecté"


})

// Un signal partagé, une présentation locale annulable par écran.
db.ref("game/endSession").on("value", snap => {
  if(window.__sessionBusy||isGM)return
  const data=snap.val()
  if(!data?.time||data.active===false){window.__cancelEndSession?.();return}
  if(!gameStarted||Date.now()-data.time>5*60*1000)return
  showEndSessionPresentation(data.time)
})

// ─── newGame — signal nouvelle partie ───
db.ref("game/newGame").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time < (window.__pageLoadTime || 0)) return  // event antérieur au chargement, ignorer
  if (isGM) return  // le MJ gère lui-même
  // Réinitialiser l'état local et revenir à l'écran d'intro
  if (typeof forceCloseCharacterSheetWithoutSave === "function") forceCloseCharacterSheetWithoutSave()
  gameStarted = false
  window.isNewGame = true
  combatActive = false
  combatStarting = false
  window.__combatOutcomeShowing = false
  window.__pendingLocalDefeat = false
  myToken = null
  window.myToken = null
  stopAllMusic()
  setGameState("MENU")
  startIntro()
  showNotification("Nouvelle partie lancée par le MJ")
})

// ─── groupMadness — jauge folie du groupe ───
db.ref("game/groupMadness").on("value", snap => {
  if (window.__sessionBusy) return
  const value = Math.max(0, Math.min(100, parseInt(snap.val(), 10) || 0))
  window.groupMadness = value
  updateMadnessUI(value)
})

db.ref("game/worldMapFogTopLeftHidden").on("value", snap => {
  if (window.__sessionBusy) return
  const prevHidden = !!window.worldMapFogTopLeftHidden
  const nextHidden = !!snap.val()
  window.worldMapFogTopLeftHidden = nextHidden
  if (window.__worldMapFogTopLeftReady && !prevHidden && nextHidden) {
    revealWorldMapFogTopLeft()
  }
  window.__worldMapFogTopLeftReady = true
  updateWorldMapFogTopLeft()
})

// Le zoom sauvegardé n’est plus imposé aux participants.

db.ref("game/readLoreBooks").on("value", snap => {
  if (window.__sessionBusy) return
  window.readLoreBooksData = snap.val() || {}
})

// game/mapLoreBook : synchronisation dans exploration.js

// ─── shop ───
// game/shop : synchronisation dans exploration.js

// ─── highPNJName ───
db.ref("game/highPNJName").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.name) return
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  showHighPNJScroll(data.name,data.time)
})

// ─── fly swarm listener ───
// events/flySwarm : contrôleur de reprise partagé.

// ─── aurora ───
// events/aurora : contrôleur de reprise partagé.

// ─── bifrostFlash ───
db.ref("game/bifrostFlash").on("value", snap => {
  if (window.__sessionBusy) return
  const d = snap.val()
  if (!d) return
  if (!d.time || d.time < (window.__pageLoadTime || 0)) { void 0; return }
  if(!d.completedAt)doBifrostFlash(d)
  void 0
})

// ─── odinVision ───
db.ref("game/odinVision").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) return
  showOdinVision(data.msg,data)
})

// ─── powerSound ───
db.ref("game/powerSound").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) { void 0; return }
  const pInfo = playerPowerSounds[data.player]
  if (!pInfo) return
  playCharacterPowerSound(pInfo,{fadeIn:true})
  void 0
})

