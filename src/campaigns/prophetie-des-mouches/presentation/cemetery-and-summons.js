function ensureCemeteryGlyphIntro() {
  let g = document.getElementById("glipheOverlay")
  if (!g) {
    g = document.createElement("div")
    g.id = "glipheOverlay"
    g.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999990;opacity:0;transition:opacity 1s ease;"
    const im = document.createElement("img")
    im.src = (typeof resolveImagePath === "function") ? resolveImagePath("gliphe.png") : "images/gliphe.png"
    im.style.cssText = "max-height:70vh;max-width:70vw;object-fit:contain;filter:drop-shadow(0 0 30px purple);"
    g.appendChild(im)
    document.body.appendChild(g)
    const s2 = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("spell.mp3") : "audio/spell.mp3")
    setManagedAudioBaseVolume(s2, 0.9)
    s2.play().catch(() => {})
  }
  setTimeout(() => { g.style.opacity = "1" }, 50)
  setTimeout(() => {
    if (typeof startSpellAura === "function") startSpellAura()
  }, 1000)
}

// ─── cemeterySpell ───
// game/cemeterySpell : synchronisation dans exploration.js

// ─── playerDeath ───
db.ref("game/playerDeath").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) return
  const pid = data.player
  deadPlayers[pid] = true
  const tok = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === String(pid || "").toLowerCase())
  if (tok) {
    tok.classList.add("playerDead")
    if (!document.getElementById("skull_" + pid)) {
      const skull = document.createElement("div"); skull.id = "skull_" + pid
      skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
      skull.innerText = "💀"; tok.appendChild(skull)
    }
  }
  showNotification(heroDisplayName(pid).toUpperCase() + " est tombé !")
  const snd = new Audio("audio/defaite.mp3"); setManagedAudioBaseVolume(snd, 0.6); snd.play().catch(() => {})
  screenShakeHard()
  if (!isGM && getLocalPlayerId() === String(pid || "").toLowerCase()) triggerLocalDefeat("playerDeath")
  if (isGM) {
      // Un KO individuel ne remplace pas l’issue collective du combat.
      if (!document.getElementById("revive_" + pid)) {
        const revBtn = document.createElement("button"); revBtn.id = "revive_" + pid
      revBtn.style.cssText = "position:fixed;bottom:104px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 24px;font-family:'Cinzel Decorative',serif;font-size:13px;background:linear-gradient(rgba(0,80,0,0.8),rgba(0,40,0,0.8));color:#88ff88;border:2px solid rgba(50,180,50,0.6);border-radius:6px;cursor:pointer;letter-spacing:2px;animation:bifrostPulse 1.5s ease-in-out infinite alternate;"
      revBtn.innerText = "✦ Ressusciter " + heroDisplayName(pid).toUpperCase()
      revBtn.onclick = () => { revivePlayer(pid); revBtn.remove() }
      document.body.appendChild(revBtn)
    }
  }
  if (isGM) setTimeout(() => db.ref("game/playerDeath").remove(), 1200)
  })

// ─── combatOutcome — victoire/défaite fiable côté joueurs ───
// Fin de combat : combat-exit.js, sans filtre sur le héros local.

// ─── playerRevive ───
db.ref("game/playerRevive").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) return
  const pid = data.player
  const tok = document.getElementById(pid)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + pid)
    if (skull) { skull.style.transition = "opacity 0.5s"; skull.style.opacity = "0"; setTimeout(() => skull.remove(), 500) }
  }
  deadPlayers[pid] = false
  if (!isGM && getLocalPlayerId() === String(pid || "").toLowerCase() && !window.__combatOutcomeQueued && !window.__combatOutcomeShowing) {
    window.__pendingLocalDefeat = false
    window.__combatOutcomeShowing = false
    const defeatScreen = document.getElementById("defeatScreen")
    if (defeatScreen) defeatScreen.style.display = "none"
  }
  const revBtn = document.getElementById("revive_" + pid)
  if (revBtn) revBtn.remove()
  void 0
})

// ─── mob2 et mob3 ───
;["mob2", "mob3"].forEach(slot => {
  db.ref("combat/" + slot).on("value", snap => {
  if (window.__sessionBusy) return
    const data = snap.val()
    activeMobSlots[slot] = !!data
    const existing = document.getElementById("mobToken_" + slot)
    if (existing) existing.remove()
    if (data && (gameState === "COMBAT" || gameState === "GAME")) {
      spawnExtraMobToken(data, slot)
      renderAllMobPanels()
    }
  })
})

db.ref("combat/eloSummon").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  const wasActive = !!(window.__eloSummonState && window.__eloSummonState.active)
  window.__eloSummonState = data || null
  const existing = document.getElementById("eloSummonToken")
  if (!combatActive || !data || !data.active) {
    if (existing) existing.remove()
    return
  }
  if (!wasActive) {
    const porkSnd = new Audio("audio/pork.mp3")
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(porkSnd, 0.78)
    else porkSnd.volume = 0.78
    porkSnd.play().catch(() => {})
  }
  if (typeof spawnEloSummonToken === "function") spawnEloSummonToken(data)
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

