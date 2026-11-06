"use strict"

window.__combatOutcomeShowing = false
window.__pendingLocalDefeat = false

/* ========================= */
/* DÉMARRAGE COMBAT          */
/* ========================= */

function _getCombatArenaMap(mob, tier) {
  if (mob === "kraken") return "tourbillon.jpg"
  return tier === "boss" ? "arenefinal.jpg" : "arene.jpg"
}

function _syncCombatStart(mainMob, tier, extraMobs) {
  return db.ref("game/combatState").set({
    active: true,
    mainMob,
    tier,
    extraMobs: extraMobs || [],
    returnMap: currentMap || "taverne.jpg",
    time: Date.now()
  })
}

function _syncCombatEnd() {
  return db.ref("game/combatState").remove()
}

function getCombatTurnState() {
  return window.__combatTurnState || null
}

function getCurrentCombatActorId() {
  const state = getCombatTurnState()
  if (!state || state.phase !== "active") return null
  return String(state.currentActorId || "")
}

function getCombatActorLabel(actorId) {
  const id = String(actorId || "")
  if (!id) return "—"
  const turnState = getCombatTurnState()
  const participants = Array.isArray(turnState?.participants) ? turnState.participants : []
  const order = Array.isArray(turnState?.order) ? turnState.order : []
  const entry = order.find(e => String(e.id || "") === id) || participants.find(e => String(e.id || "") === id)
  if (entry && entry.label) return entry.label
  if (id === "greg") return "Greg"
  if (id === "ju") return "Yu"
  if (id === "elo") return "Elo"
  if (id === "bibi") return "Bibi"
  if (id === "mob") return String(currentMob || "Mob").toUpperCase()
  return id.toUpperCase()
}

function getInitiativeParticipants() { return combatParticipants({ characters: window.__publicCharacters || {}, combat: window.__combatSnapshot || {} }) }

async function initCombatTurnState() {
  if (!isGM || window.__sessionBusy) return
  await migrateSharedFamiliarTurn()
  await transactCombatRoot(current => {
    if (!current?.combat || current.combat.turnState) return undefined
    const root = combatClone(current)
    root.combat.turnState = { phase:"rolling", participants:combatParticipants(root), rolls:{}, order:[], round:1, sequence:0, currentActorId:"", currentIndex:0 }
    return root
  })
  const state = getCombatTurnState()
  if (state) { renderCombatInitiativeOverlay(state); finalizeCombatInitiativeIfReady(state) }
}

function canRollInitiativeForActor(actorId, state) {
  if (!state || state.phase !== "rolling" || actorId === "bibi" || !(state.participants || []).some(p => p.id === actorId) || Number.isInteger(state.rolls?.[actorId])) return false
  return isGM || !!(myToken && myToken.id === actorId && canAccessCharacter(actorId))
}

async function submitInitiativeRoll(actorId) {
  if (!canRollInitiativeForActor(actorId, getCombatTurnState())) return
  const roll = Math.floor(Math.random()*12)+1
  try {
    const result = await db.ref("combat/turnState/rolls/"+actorId).transaction(current => current == null ? roll : undefined)
    // Le listener partagé affiche le jet confirmé sur tous les écrans.
  } catch(error) { showNotification("Initiative non enregistrée : "+error.message) }
}

function submitInitiativeRollForGMTest(actorId) { if(isGM) return submitInitiativeRoll(actorId) }

function submitAllInitiativeRollsForGMTest() {
  if (!isGM) return
  const state = getCombatTurnState()
  if (!state || state.phase !== "rolling") return
  const participants = Array.isArray(state.participants) ? state.participants : []
  participants.forEach(entry => submitInitiativeRollForGMTest(entry.id))
}

async function finalizeCombatInitiativeIfReady(state) {
  if (!isGM || !state || state.phase !== "rolling" || window.__combatInitiativeFinalizePending || window.__sessionBusy) return
  window.__combatInitiativeFinalizePending = true
  const seed=Math.floor(Math.random()*4294967296)
  try {
    await transactCombatRoot(current => {
      if (!current?.combat?.turnState || current.sessionControl?.phase || current.combat.turnState.phase !== "rolling") return undefined
      const root=combatClone(current); normalizeCombatTurns(root)
      const ts=root.combat.turnState, heroes=ts.participants.filter(p=>p.type==="player")
      if (!heroes.every(p=>Number.isInteger(ts.rolls?.[p.id]) && ts.rolls[p.id]>=1 && ts.rolls[p.id]<=12)) return undefined
      const dice=combatRandom(seed); ts.rolls ||= {}
      ts.participants.filter(p=>p.type==="mob").forEach(p=>{ if(ts.rolls[p.id]==null) ts.rolls[p.id]=dice(12) })
      const ready=finalizedInitiative(ts); if(!ready) return undefined
      for(const hero of heroes)if(root.characters?.[hero.id]?.hp>0)recordHeroCritical(root,hero.id,ts.rolls[hero.id]===12,ts.rolls[hero.id]===1)
      root.combat.turnState=ready
      return root
    })
  } catch(error) { showNotification("Initiative non confirmée : "+error.message) }
  finally { window.__combatInitiativeFinalizePending=false }
}

async function advanceCombatTurn() {
  const state=getCombatTurnState(); if(!state || state.phase!=="active") return
  const actor=state.currentActorId
  try {
    const dead=isGM && !combatActorAlive({ characters:window.__publicCharacters||{},combat:window.__combatSnapshot||{} },actor)
    await submitCombatAction(dead?"skipDead":"pass",actor)
  } catch(error) { showNotification(error.message) }
}

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
  wrap.style.cssText = "position:fixed;top:88px;right:22px;z-index:999999996;display:flex;gap:6px;"

  const btn = document.createElement("button")
  btn.style.cssText = "padding:10px 14px;font-family:Cinzel,serif;font-size:12px;letter-spacing:0.8px;background:linear-gradient(180deg,rgba(12,24,30,0.94),rgba(6,12,18,0.94));color:#f3ddb0;border:1px solid rgba(214,164,90,0.4);border-radius:999px;cursor:pointer;box-shadow:0 12px 24px rgba(0,0,0,0.28);"
  btn.innerText = state.phase === "rolling" ? "🎲 Dés d'init" : "📋 Ordre"
  btn.onclick = () => {
    window.__combatInitiativeHidden = false
    renderCombatInitiativeOverlay(state)
  }
  wrap.appendChild(btn)

  if (isGM && state.phase === "rolling") {
    const rollAllBtn = document.createElement("button")
    rollAllBtn.style.cssText = "padding:10px 14px;font-family:Cinzel,serif;font-size:12px;background:linear-gradient(180deg,rgba(70,40,10,0.96),rgba(35,18,4,0.96));color:#ffe8bb;border:1px solid rgba(212,168,91,0.55);border-radius:999px;cursor:pointer;box-shadow:0 12px 24px rgba(0,0,0,0.28);"
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
  overlay.style.cssText = "position:fixed;inset:0;background:radial-gradient(circle at center, rgba(6,14,22,0.68), rgba(0,0,0,0.9));display:flex;align-items:center;justify-content:center;z-index:999999995;backdrop-filter:blur(5px);"

  const box = document.createElement("div")
  box.style.cssText = "width:min(980px,92vw);max-height:84vh;overflow:auto;padding:22px 24px;background:linear-gradient(180deg,rgba(10,16,22,0.94),rgba(6,8,12,0.96)), url('images/combat_panel.png') center/cover no-repeat;border:1px solid rgba(201,159,88,0.4);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,226,178,0.08);font-family:Cinzel,serif;color:#f2dfbc;"

  const topBar = document.createElement("div")
  topBar.style.cssText = "display:flex;justify-content:flex-end;margin-bottom:6px;"
  const hideBtn = document.createElement("button")
  hideBtn.style.cssText = "padding:7px 12px;font-family:Cinzel,serif;font-size:11px;background:linear-gradient(#38444b,#171e22);color:#dbe8ef;border:1px solid rgba(132,158,173,0.45);border-radius:8px;cursor:pointer;"
  hideBtn.innerText = "Fermer"
  hideBtn.onclick = () => {
    window.__combatInitiativeHidden = true
    closeCombatInitiativeOverlay()
    renderCombatInitiativeToggle(state)
  }
  topBar.appendChild(hideBtn)
  box.appendChild(topBar)

  const title = document.createElement("div")
  title.style.cssText = "text-align:center;font-size:34px;letter-spacing:5px;color:#f3d59a;margin-bottom:8px;text-shadow:0 2px 0 rgba(0,0,0,0.4),0 0 18px rgba(214,164,90,0.12);"
  title.innerText = state.phase === "rolling" ? "Initiative du Combat" : "Ordre du Combat"
  box.appendChild(title)

  const sub = document.createElement("div")
  sub.style.cssText = "text-align:center;font-size:14px;color:#c7b088;margin-bottom:20px;letter-spacing:0.5px;"
  sub.innerText = state.phase === "rolling"
    ? "Chaque combattant lance un D12. Le MJ lance pour les mobs."
    : "Round " + (state.round || 1) + " — tour actuel : " + String(state.currentActorId || "").toUpperCase() + (window.__combatSnapshot?.[state.currentActorId]?.actionsPerTurn>1?" — action "+((state.actorActionIndex||0)+1)+"/2":"")
  box.appendChild(sub)

  const grid = document.createElement("div")
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(164px,1fr));gap:14px;"
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
    card.style.cssText = "padding:14px 12px;border:1px solid " + (isCurrent ? "rgba(255,215,130,0.72)" : "rgba(80,120,150,0.22)") + ";border-radius:16px;background:" + (isCurrent ? "linear-gradient(180deg,rgba(72,50,18,0.94),rgba(18,14,10,0.98))" : "linear-gradient(180deg,rgba(12,22,28,0.9),rgba(7,14,18,0.95))") + ";text-align:center;box-shadow:" + (isCurrent ? "0 16px 32px rgba(0,0,0,0.26), 0 0 22px rgba(214,164,90,0.12)" : "0 12px 24px rgba(0,0,0,0.16)") + ";"

    const portrait = document.createElement("img")
    portrait.src = "images/" + sanitizeAssetName(entry.image || "")
    portrait.style.cssText = "width:74px;height:74px;object-fit:contain;border-radius:50%;border:2px solid rgba(214,172,96,0.45);margin-bottom:10px;background:rgba(0,0,0,0.22);box-shadow:0 0 0 2px rgba(63,117,136,0.18);"
    portrait.onerror = () => { portrait.style.display = "none" }
    card.appendChild(portrait)

    const name = document.createElement("div")
    name.style.cssText = "font-size:15px;letter-spacing:1px;color:#f0ddba;margin-bottom:8px;text-transform:uppercase;"
    name.innerText = state.phase === "active" ? (idx + 1) + ". " + entry.label : entry.label
    card.appendChild(name)

    const rollVal = state.rolls && state.rolls[entry.id]
      ? parseInt(state.rolls[entry.id], 10)
      : (state.phase === "active" ? parseInt(entry.roll, 10) : null)

    const roll = document.createElement("div")
    roll.style.cssText = "font-size:26px;color:#8fd8ff;text-shadow:0 0 12px rgba(120,200,255,0.35);margin-bottom:10px;"
    roll.innerText = Number.isFinite(rollVal) ? "D12 : " + rollVal : "—"
    card.appendChild(roll)

    if (state.phase === "rolling") {
      if (canRollInitiativeForActor(entry.id, state)) {
        const btn = document.createElement("button")
        btn.style.cssText = "padding:8px 14px;font-family:Cinzel,serif;font-size:12px;background:linear-gradient(#234d66,#142f40);color:#e8f4ff;border:1px solid rgba(125,178,212,0.55);border-radius:8px;cursor:pointer;"
        btn.innerText = "Lancer D12"
        btn.onclick = () => submitInitiativeRoll(entry.id)
        card.appendChild(btn)
      } else if (isGM && !Number.isFinite(rollVal)) {
        const gmBtn = document.createElement("button")
        gmBtn.style.cssText = "padding:8px 14px;font-family:Cinzel,serif;font-size:12px;background:linear-gradient(#6a4b1b,#342109);color:#ffe8bb;border:1px solid rgba(212,168,91,0.55);border-radius:8px;cursor:pointer;"
        gmBtn.innerText = "Test MJ"
        gmBtn.onclick = () => submitInitiativeRollForGMTest(entry.id)
        card.appendChild(gmBtn)
      } else {
        const waiting = document.createElement("div")
        waiting.style.cssText = "font-size:11px;color:#9aa9b2;"
        waiting.innerText = Number.isFinite(rollVal) ? "Jet validé" : "En attente"
        card.appendChild(waiting)
      }
    } else {
      const status = document.createElement("div")
      status.style.cssText = "font-size:11px;color:" + (isCurrent ? "#ffd48b" : "#96a7b5") + ";"
      status.innerText = isCurrent ? "Tour actif" : "En attente"
      card.appendChild(status)
      if (isGM && entry.type === "player" && typeof setCombatPreviewPlayer === "function") {
        const previewBtn = document.createElement("button")
        previewBtn.style.cssText = "margin-top:8px;padding:7px 12px;font-family:Cinzel,serif;font-size:11px;background:linear-gradient(#4d2f68,#231132);color:#f1dcff;border:1px solid rgba(179,120,219,0.55);border-radius:8px;cursor:pointer;"
        previewBtn.innerText = isCurrent ? "Tester le tour" : "Test HUD"
        previewBtn.onclick = () => setCombatPreviewPlayer(entry.id)
        card.appendChild(previewBtn)
      }
    }

    grid.appendChild(card)
  })

  if (isGM) {
    const tools = document.createElement("div")
    tools.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:18px;"

    if (state.phase === "rolling") {
      const allBtn = document.createElement("button")
      allBtn.style.cssText = "padding:10px 16px;font-family:Cinzel,serif;font-size:12px;background:linear-gradient(#6a4b1b,#342109);color:#ffe8bb;border:1px solid rgba(212,168,91,0.55);border-radius:9px;cursor:pointer;"
      allBtn.innerText = "MJ Test : lancer tous les D12"
      allBtn.onclick = () => submitAllInitiativeRollsForGMTest()
      tools.appendChild(allBtn)
    } else {
      const currentEntry = entries.find(entry => String(entry.id || "") === String(state.currentActorId || ""))
      if (currentEntry && currentEntry.type === "player" && typeof setCombatPreviewPlayer === "function") {
        const currentBtn = document.createElement("button")
        currentBtn.style.cssText = "padding:10px 16px;font-family:Cinzel,serif;font-size:12px;background:linear-gradient(#4d2f68,#231132);color:#f1dcff;border:1px solid rgba(179,120,219,0.55);border-radius:9px;cursor:pointer;"
        currentBtn.innerText = "MJ Test : ouvrir le HUD de " + currentEntry.label
        currentBtn.onclick = () => setCombatPreviewPlayer(currentEntry.id)
        tools.appendChild(currentBtn)
      }
      if (typeof closeCombatPreviewHUD === "function") {
        const closeBtn = document.createElement("button")
        closeBtn.style.cssText = "padding:10px 16px;font-family:Cinzel,serif;font-size:12px;background:linear-gradient(#38444b,#171e22);color:#dbe8ef;border:1px solid rgba(132,158,173,0.45);border-radius:9px;cursor:pointer;"
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
  if (sub) sub.innerText = "Mob principal : " + mainMob.toUpperCase()
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

function combatSequence(mob, forceTier) {
  window.__combatIntroUntil = Date.now()+((mob === "roi" && (forceTier||mobStats[mob]?.tier)==="boss")?24500:6500)
  const tierMob = forceTier || (mobStats[mob] ? mobStats[mob].tier : "weak")
  if (mob === "roi" && tierMob === "boss") playRoiIntro(mob, tierMob)
  else _startCombatSequence(mob, tierMob)
}

function playRoiIntro(mob, tierMob) {
  stopAllMusic()
  const intro = document.getElementById("combatIntro"); intro.style.display = "flex"
  const cf    = document.getElementById("combatFilter")
  cf.style.cssText = "display:block;opacity:1;transition:none;background:rgba(120,0,0,0.7);"
  screenShakeHard(); setTimeout(() => screenShakeHard(), 400); setTimeout(() => screenShakeHard(), 800)
  playSound("combatSound", 0.4)

  setTimeout(() => {
    intro.style.display = "none"
    cf.style.opacity = "0.5"; cf.style.background = "rgba(120,0,0,0.5)"
    const box = document.getElementById("storyImage"); const img = document.getElementById("storyImageContent")
    if (box && img) {
      img.src = "images/roi.png"; box.style.opacity = "0"; box.style.left = "50%"
      box.style.transform = "translateX(-50%)"; box.style.right = "auto"; box.style.display = "flex"
      setTimeout(() => { box.style.transition = "opacity 0.8s"; box.style.opacity = "1" }, 50)
    }
    const roiSnd = new Audio("audio/roi.mp3"); roiSnd.volume = 1.0; roiSnd.play().catch(() => {})
    setTimeout(() => {
      let iv = setInterval(() => { if (roiSnd.volume > 0.04) roiSnd.volume = Math.max(0, roiSnd.volume - 0.05); else { roiSnd.pause(); clearInterval(iv) } }, 80)
    }, 15000)
    setTimeout(() => {
      if(isGM)db.ref("game/storyImage").remove()
      if (box) { box.style.transition = "opacity 1s ease"; box.style.opacity = "0" }
      cf.style.transition = "opacity 1s ease"; cf.style.opacity = "0"
    }, 15000)
    setTimeout(() => {
      if (box) { box.style.display = "none"; box.style.opacity = "" }
      cf.style.transition = "none"; cf.style.display = "none"; cf.style.opacity = "1"; cf.style.background = ""
      _startCombatSequence(mob, tierMob)
    }, 16000)
  }, 2000)
}

function _startCombatSequence(mob, tierMob) {
  const keepMapMusic =
    (mob === "kraken" && currentMap === "tourbillon.jpg") ||
    (mob === "balraug" && currentMap === "balraug.jpg")

  if (!keepMapMusic) {
    fadeMusicOut(() => {
      const track = tierMob === "boss"
        ? "audio/worldboss.mp3"
        : tierMob === "high"
        ? "audio/highcombat.mp3"
        : "audio/lowcombat.mp3"
      setTimeout(() => crossfadeMusic(track), 100)
    })
  }

  const intro = document.getElementById("combatIntro"); intro.style.display = "flex"
  const cf    = document.getElementById("combatFilter")
  cf.style.display = "block"; cf.style.opacity = "1"; cf.style.transition = "none"

  if (tierMob === "boss")       { cf.style.background = "rgba(120,0,0,0.7)"; screenShakeHard(); setTimeout(() => screenShakeHard(), 400); setTimeout(() => screenShakeHard(), 800) }
  else if (tierMob === "high")  { cf.style.background = "rgba(80,0,0,0.6)";  screenShakeHard(); setTimeout(() => screenShake(), 500) }
  else                          { cf.style.background = "rgba(60,0,0,0.5)";  screenShake() }
  playSound("combatSound", 0.4)

  setTimeout(() => {
    intro.style.display = "none"
    showMobIntro(mob)

    setTimeout(() => {
      const fade = document.getElementById("fadeScreen")
      fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = "1"

      setTimeout(() => {
        const map = document.getElementById("map")
        map.style.backgroundImage = "url('images/" + _getCombatArenaMap(currentMob, tierMob) + "')"
        fadeToCombat()
        cf.style.display = "none"; cf.style.opacity = "1"
        fade.style.transition = "opacity 1s ease"; fade.style.opacity = "0"

        setTimeout(() => {
          spawnMobToken(mob)
          // Extra mobs
          ;["mob2","mob3"].forEach(slot => {
            if (_state.pendingExtraMobs && _state.pendingExtraMobs[slot]) {
              db.ref("combat/" + slot).once("value", snap => {
                const md = snap.val()
                if (md) { const ex = document.getElementById("mobToken_" + slot); if (ex) ex.remove(); spawnExtraMobToken(md, slot) }
              })
            }
          })

            if (tierMob === "boss") startBossFireEffect()
            const allyBtn = document.getElementById("allyBtn"); if (allyBtn && isGM) allyBtn.style.display = "flex"
            showCombatHUD()
            if (typeof updateThuumButton === "function") updateThuumButton()
            if (isGM) initCombatTurnState()

          db.ref("combat/mob").once("value", () => {
            activeMobSlots["mob"] = true
            if (!document.getElementById("mobAttackPanel")) renderAllMobPanels()
            if (isGM) {
              const ap = document.getElementById("addMobPanel")
              if (ap) {
                ap.style.display = "block"
                const btnsDiv = document.getElementById("addMobButtons")
                if (btnsDiv && !btnsDiv.dataset.built) {
                  btnsDiv.dataset.built = "1"
                  ;["gobelins","loup","draugr","garde","bandit","ogre","valkyrie","golem","zombie","zombie2"].forEach(m => {
                    const b = document.createElement("button")
                    b.style.cssText = "padding:3px 8px;font-family:Cinzel,serif;font-size:9px;background:rgba(120,10,10,0.5);color:#ffaaaa;border:1px solid rgba(180,40,40,0.4);border-radius:3px;cursor:pointer;"
                    b.innerText = m; b.onclick = () => addMobToFight(m); btnsDiv.appendChild(b)
                  })
                }
              }
            }
          })


          loadPlayerCombatStats()
          if (isGM) {
            document.getElementById("gmDamagePanel").style.display = "block"
            if (typeof toggleGMDamageControls === "function") toggleGMDamageControls(true)
            document.getElementById("gmCombatButtons").style.display = "flex"
          }
        }, 600)
      }, 800)
    }, 2500)
  }, 2000)
}

/* ========================= */
/* INTRO MOB                 */
/* ========================= */

function showMobIntro(mob) {
  window.__witchIntroSoundPlaying = false
  const mobs = [mob]
  if (_state.pendingExtraMobs) {
    ;["mob2","mob3"].forEach(slot => { const m = _state.pendingExtraMobs[slot]; if (m) mobs.push(m) })
  }
  const slots   = [{ box:"storyImage", img:"storyImageContent" }, { box:"storyImage2", img:"storyImageContent2" }, { box:"storyImage3", img:"storyImageContent3" }]
  const posMap  = {
    1: [{ left:"50%", transform:"translateX(-50%)", right:"auto" }],
    2: [{ left:"25%", transform:"translateX(-50%)", right:"auto" }, { left:"75%", transform:"translateX(-50%)", right:"auto" }],
    3: [{ left:"20%", transform:"translateX(-50%)", right:"auto" }, { left:"50%", transform:"translateX(-50%)", right:"auto" }, { left:"80%", transform:"translateX(-50%)", right:"auto" }]
  }
  const posSet = posMap[Math.min(mobs.length, 3)]

    mobs.forEach((mobName, i) => {
      if (i >= slots.length) return
      const s = slots[i]; const p = posSet[i]
      const box = document.getElementById(s.box); const img = document.getElementById(s.img)
      if (!box || !img) return
      box.style.left = p.left; box.style.transform = p.transform; box.style.right = p.right || "auto"
      box.style.display = "flex"; box.style.opacity = "1"
      img.src = "images/" + mobName + ".png"
      if (mobName === "witch" && !window.__witchIntroSoundPlaying) {
        window.__witchIntroSoundPlaying = true
        const witchSound = new Audio("audio/witch.mp3")
        witchSound.volume = 0.9
        witchSound.play().catch(() => {})
        setTimeout(() => {
          const fadeIv = setInterval(() => {
            if (witchSound.volume > 0.08) witchSound.volume = Math.max(0, witchSound.volume - 0.09)
            else {
              witchSound.pause()
              window.__witchIntroSoundPlaying = false
              clearInterval(fadeIv)
            }
          }, 100)
        }, 4000)
      }
      const title = document.createElement("div")
      title.innerText = mobName.toUpperCase()
      title.style.cssText = "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:clamp(20px,3vw,40px);color:red;text-shadow:0 0 10px red;white-space:nowrap;"
      box.appendChild(title)
    setTimeout(() => {
      box.style.transition = "opacity 1s"; box.style.opacity = "0"
      setTimeout(() => { box.style.display = "none"; if (title.parentNode) title.remove(); box.style.opacity = "1"; box.style.transition = "" }, 1000)
    }, 3000)
  })
}

/* ========================= */
/* ARÈNE                     */
/* ========================= */

function fadeToCombat() {
  const arena     = document.getElementById("combatArena")
  const tokenZone = document.getElementById("combatTokens")
  arena.style.cssText = "display:block;position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;"
  tokenZone.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"

  ;["greg","ju","elo","bibi"].forEach((id, i) => {
    const token = document.getElementById(id)
    if (!token) return
    tokenZone.appendChild(token)
    token.style.transition = "none"; token.style.position = "absolute"; token.style.display = "flex"
    const startX = Math.round((window.innerWidth - 4 * 110) / 2)
      token.style.left   = (startX + i * 110) + "px"
      token.style.top    = Math.round(window.innerHeight * 0.65) + "px"
      token.style.zIndex = "200"; token.style.width = "70px"; token.style.height = "70px"
      token.style.pointerEvents = "auto"
      setTimeout(() => { token.style.transition = "" }, 50)
    })

  const mob = document.getElementById("mobToken")
  if (mob) {
    tokenZone.appendChild(mob)
    mob.style.cssText = "position:absolute;left:650px;top:180px;display:flex;z-index:200;"
  }
  const positions=window.__combatSnapshot?.presentation?.positions || {}
  Object.entries(positions).forEach(([id,pos])=>{const token=document.getElementById(id);if(token){token.style.left=pos.x+"px";token.style.top=pos.y+"px"}})
}

function spawnMobToken(mob) {
  const tokenZone = document.getElementById("combatTokens")
  const token     = document.getElementById("mobToken")
  const img       = document.getElementById("mobTokenImg")
  if (!token || !img) return

  token.style.pointerEvents = "auto"; token.style.cursor = "grab"
  if (tokenZone) tokenZone.appendChild(token)
  img.src = "images/" + mob + ".png"
  token.style.width = "130px"; token.style.height = "130px"
  img.style.width   = "130px"; img.style.height  = "130px"
  token.style.left  = "600px"; token.style.top   = "180px"
  token.style.display = "flex"; token.style.zIndex = "200"; token.style.position = "absolute"

  const oldName = token.querySelector(".mobNameTag"); if (oldName) oldName.remove()
  const nameTag = document.createElement("div")
  nameTag.className = "mobNameTag"; nameTag.innerText = mob.toUpperCase()
  nameTag.style.cssText = "position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:22px;color:red;text-shadow:0 0 10px darkred;white-space:nowrap;"
  token.appendChild(nameTag)

  token.style.opacity = "0"; token.style.transform = "scale(0.1) rotate(-15deg)"; token.style.filter = "brightness(5) saturate(3)"
  const portal = document.createElement("div")
  portal.className = "mobPortal"
  portal.style.cssText = "position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(150,0,0,0.95) 0%,rgba(80,0,0,0.6) 50%,transparent 75%);box-shadow:0 0 40px red,0 0 80px darkred;z-index:-1;"
  token.appendChild(portal)

  setTimeout(() => {
    flashRed(); flashRed(); screenShakeHard()
    token.style.transition = "all 0.5s cubic-bezier(0.17,0.67,0.35,1.4)"
    token.style.opacity = "1"; token.style.transform = "scale(1.3) rotate(0deg)"; token.style.filter = "brightness(2) saturate(2)"
    setTimeout(() => { token.style.transition = "all 0.3s ease"; token.style.transform = "scale(1)"; token.style.filter = "brightness(1)"; portal.remove() }, 500)
    if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
  }, 100)
}

function spawnEloSummonToken(data) {
  const tokenZone = document.getElementById("combatTokens")
  if (!tokenZone) return

  let token = document.getElementById("eloSummonToken")
  if (!token) {
    token = document.createElement("div")
    token.id = "eloSummonToken"
    token.className = "token"
    token.style.cssText = "position:absolute;left:720px;top:430px;display:flex;z-index:160;"

    const stats = document.createElement("div")
    stats.className = "tokenStats"
    stats.id = "stats_eloSummon"
    token.appendChild(stats)

    const hpWrap = document.createElement("div")
    hpWrap.className = "hpBarToken"
    const hpFill = document.createElement("div")
    hpFill.className = "hpBarFill"
    hpFill.id = "hp_eloSummon"
    hpWrap.appendChild(hpFill)
    token.appendChild(hpWrap)

    const img = document.createElement("img")
    img.id = "eloSummonTokenImg"
    img.src = "images/pork.png"
    img.style.cssText = "object-fit:cover;"
    token.appendChild(img)

    const name = document.createElement("div")
    name.className = "nameTag"
    name.innerText = "John Pork"
    token.appendChild(name)

    token.addEventListener("mousedown", e => {
      if (!isGM && (!myToken || myToken.id !== "elo")) return
      selected = token
      lastX = token.offsetLeft
      _state.tokenDragStart = { x: e.clientX, y: e.clientY }
      _state.tokenDragging = false
      e.preventDefault()
      e.stopPropagation()
    })

    tokenZone.appendChild(token)
  }

  token.style.left = ((data && data.x) || 720) + "px"
  token.style.top = ((data && data.y) || 430) + "px"
  token.style.display = data && data.active ? "flex" : "none"
  token.style.opacity = data && data.active ? "1" : "0"
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()

  const hpFill = document.getElementById("hp_eloSummon")
  if (hpFill) {
    const pct = Math.max(0, Math.min(100, ((data?.hp || 0) / Math.max(1, data?.maxHP || 1)) * 100))
    hpFill.style.width = pct + "%"
  }

  const stats = document.getElementById("stats_eloSummon")
  if (stats) {
    stats.innerHTML = ""
    const hpText = document.createElement("div")
    hpText.className = "hpText"
    hpText.innerText = "❤ " + (data?.hp || 0) + "/" + (data?.maxHP || 0)
    stats.appendChild(hpText)
  }
}

/* ========================= */
/* VICTOIRE / DÉFAITE        */
/* ========================= */

function _showVictoryNow(outcome) {
  window.__combatOutcomeShowing = true

  if(outcome?.lootBonus)showNotification("Spider Sense a révélé un meilleur butin pour la victoire.")
  playSound("victorySound", 0.45)
  fadeMusicOut(() => {})

  const victory = document.getElementById("victoryScreen")
  victory.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:999999999;opacity:0;transition:opacity 0.4s ease;"
  document.body.appendChild(victory)
  setTimeout(() => { victory.style.opacity = "1" }, 20)

  playSound("curseSound")
  screenShakeHard(); powerExplosion(); powerExplosion(); flashGold(); flashGold()
  spawnVictoryParticles()

  setTimeout(() => {
    const vs = document.getElementById("victorySound")
    if (vs) { let iv = setInterval(() => { if (vs.volume > 0.03) vs.volume -= 0.03; else { vs.pause(); vs.volume = 0; clearInterval(iv) } }, 100) }
  }, 5000)
  setTimeout(() => {
    victory.style.display="none"
    if(typeof completeCombatReturn==="function")completeCombatReturn(outcome)
    else{endCombat();returnToMap();window.__combatOutcomeShowing=false}
  }, 7000)
}

function _showDefeatNow(outcome) {
  if (window.__combatOutcomeShowing) return
  window.__combatOutcomeShowing = true
  window.__pendingLocalDefeat = true
  combatActive = true
  setGameState("COMBAT")
  playSound("defeatSound")
  fadeMusicOut(() => {})

  const screen = document.getElementById("defeatScreen")
  if (!screen) { console.error("defeatScreen element not found"); return }
  screen.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;opacity:1;"
  document.body.appendChild(screen)
  flashRed(); screenShakeHard()
  setTimeout(() => {
    screen.style.display = "none"
    if(typeof completeCombatReturn==="function")completeCombatReturn(outcome)
    else{endCombat();returnToMap();window.__combatOutcomeShowing=false}
  }, 5000)
}

function endCombat(options = {}) {
  if (!combatActive && !options.force) return
  combatActive = false; combatStarting = false
  if (typeof resetLocalCombatVisualState === "function") resetLocalCombatVisualState()
  setGameState("GAME")

  const map = document.getElementById("map")
  ;["greg","ju","elo","bibi","mobToken"].forEach(id => {
    const token = document.getElementById(id)
    if (token && map) { map.appendChild(token); token.style.position = "absolute" }
  })

  const gcp = document.getElementById("gmCombatButtons"); if (gcp) gcp.style.display = "none"
  const gdp = document.getElementById("gmDamagePanel"); if (gdp) gdp.style.display = "none"
  stopBossFireEffect()
  document.querySelectorAll('[id^="mobToken_"]').forEach(token=>{if(token._slotRef&&token._slotRefCb)token._slotRef.off("value",token._slotRefCb);token.remove()})

  const atkPanel = document.getElementById("mobAttackPanel"); if (atkPanel) atkPanel.remove()
  ;["mob2","mob3"].forEach(s => { activeMobSlots[s] = false })
  activeMobSlots["mob"] = false

  const ap = document.getElementById("addMobPanel"); if (ap) ap.style.display = "none"
  const allyPanel = document.getElementById("allyPNJPanel"); if (allyPanel) allyPanel.remove()
  const allyBtn = document.getElementById("allyBtn"); if (allyBtn) allyBtn.style.display = "none"
  const playerAllyBtn = document.getElementById("playerAllyBtn"); if (playerAllyBtn) playerAllyBtn.style.display = "none"
  const allyViewer = document.getElementById("allyViewerPanel"); if (allyViewer) allyViewer.remove()
  const ab = document.getElementById("addMobButtons"); if (ab) { ab.innerHTML = ""; delete ab.dataset.built }

  const arena = document.getElementById("combatArena"); if (arena) { arena.style.display = "none"; arena.style.position = "relative"; arena.style.width = ""; arena.style.height = "" }
  const cg = document.getElementById("combatGrid"); if (cg) cg.style.display = "none"
  const cf = document.getElementById("combatFilter"); if (cf) cf.style.display = "none"
  const md12 = document.getElementById("mobD12"); if (md12) md12.style.display = "none"
  const md20 = document.getElementById("mobD20"); if (md20) md20.style.display = "none"
  closeCombatInitiativeOverlay()
  const initiativeToggle = document.getElementById("combatInitiativeToggle"); if (initiativeToggle) initiativeToggle.remove()
  window.__combatInitiativeHidden = false

  const hud = document.getElementById("combatHUD"); if (hud) hud.style.display = "none"
  const attackBtn = document.getElementById("playerAttackBtn"); if (attackBtn) attackBtn.style.display = "none"
  const thuumBtn = document.getElementById("playerThuumBtn"); if (thuumBtn) thuumBtn.style.display = "none"
  window.__combatTurnState = null
  window.__playerCombatSpecialsUsed = {}
  window.__playerCombatFlags = {}
  window.__eloSummonState = null
  const eloSummonToken = document.getElementById("eloSummonToken"); if (eloSummonToken) eloSummonToken.remove()
  if (typeof closePlayerThuumPanel === "function") closePlayerThuumPanel()
  if (isGM && !options.skipFinish) finishReliableCombat(window.__combatSnapshot?.id).catch(error=>showNotification("Fin de combat non confirmée : "+error.message))

  setTimeout(() => { if (typeof updateThuumButton === "function") updateThuumButton() }, 80)
}

function returnToMap(outcome){
 const fade=document.getElementById("fadeScreen")
 if(fade){fade.style.transition="opacity .6s ease";fade.style.opacity="1";fade.style.pointerEvents="none"}
 setTimeout(()=>{
 const map=document.getElementById("map")
 for(const id of ["greg","ju","elo","bibi","mobToken"]){const token=document.getElementById(id);if(!token||!map)continue;map.appendChild(token);token.style.transform="";token.style.width="";token.style.height="";token.style.position="absolute";token.style.pointerEvents="auto"}
 const mob=document.getElementById("mobToken");if(mob)mob.style.display="none"
 if(typeof restoreCombatMap==="function")restoreCombatMap(outcome)
 setTimeout(()=>{if(fade){fade.style.transition="opacity .8s ease";fade.style.opacity="0"}window.__combatReturnInProgress=false},300)
 },600)
}

/* ========================= */
/* FEU BOSS                  */
/* ========================= */

function startBossFireEffect() {
  const existing = document.getElementById("bossFireOverlay"); if (existing) existing.remove()
  const overlay  = document.createElement("div"); overlay.id = "bossFireOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4999;opacity:0;transition:opacity 1.5s ease;"
  overlay.style.background = [
    "radial-gradient(ellipse at bottom,rgba(255,80,0,0.6) 0%,transparent 55%)",
    "radial-gradient(ellipse at bottom left,rgba(255,50,0,0.5) 0%,transparent 45%)",
    "radial-gradient(ellipse at bottom right,rgba(255,50,0,0.5) 0%,transparent 45%)"
  ].join(",")

  for (let i = 0; i < 40; i++) {
    const spark = document.createElement("div")
    const zone  = Math.random()
    let x, startY
    if (zone < 0.4)      { x = Math.random()*100; startY = 85+Math.random()*15 }
    else if (zone < 0.7) { x = Math.random()*12;  startY = 40+Math.random()*60 }
    else                 { x = 88+Math.random()*12; startY = 40+Math.random()*60 }
    const w = 4+Math.random()*10, h = 10+Math.random()*20
    spark.style.cssText = `position:absolute;width:${w}px;height:${h}px;border-radius:50% 50% 20% 20%;background:linear-gradient(to top,transparent,#ff6600,${Math.random()>0.5?"#ffcc00":"#ff3300"});left:${x}%;top:${startY}%;animation:bossFireSpark ${1+Math.random()*2.5}s ease-in infinite;animation-delay:${Math.random()*2}s;filter:blur(${Math.random()*2}px);`
    overlay.appendChild(spark)
  }

  const vignette = document.createElement("div")
  vignette.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(200,30,0,0.5);animation:bossVignettePulse 1.5s ease-in-out infinite alternate;"
  overlay.appendChild(vignette)
  document.body.appendChild(overlay)
  setTimeout(() => { overlay.style.opacity = "1" }, 50)
}

function stopBossFireEffect() {
  const overlay = document.getElementById("bossFireOverlay"); if (!overlay) return
  overlay.style.transition = "opacity 1.5s ease"; overlay.style.opacity = "0"
  setTimeout(() => overlay.remove(), 1500)
}

/* ========================= */
/* CINÉMATIQUE INTRO         */
/* ========================= */

function playOpeningCinematic(callback) {
  if(typeof window.__cancelOpeningCinematic==="function")window.__cancelOpeningCinematic()
  const openingTimeouts=new Set(),openingIntervals=new Set(),openingSounds=new Set()
  let openingCancelled=false
  const openingTimeout=(fn,ms)=>{const id=setTimeout(()=>{openingTimeouts.delete(id);if(!openingCancelled)fn()},ms);openingTimeouts.add(id);return id}
  const openingInterval=(fn,ms)=>{const id=setInterval(()=>{if(!openingCancelled)fn()},ms);openingIntervals.add(id);return id}
  const openingAudio=src=>{const audio=new Audio(src);openingSounds.add(audio);return audio}
  const cancelOpening=()=>{openingCancelled=true;openingTimeouts.forEach(clearTimeout);openingIntervals.forEach(clearInterval);openingSounds.forEach(audio=>audio.pause());document.getElementById("openingCinematic")?.remove();if(window.__cancelOpeningCinematic===cancelOpening)window.__cancelOpeningCinematic=null}
  window.__cancelOpeningCinematic=cancelOpening

  const screen = document.createElement("div"); screen.id = "openingCinematic"
  screen.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999999999;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:1;"
  document.body.appendChild(screen)

  const tremb = openingAudio("audio/tremblement.mp3"); tremb.volume = 0.8; tremb.play().catch(() => {})
  openingTimeout(() => { let iv = openingInterval(() => { if (tremb.volume>0.05) tremb.volume-=0.05; else { tremb.pause(); clearInterval(iv) } }, 100) }, 5500)

  let shakeCount = 0
  const shakeIv = openingInterval(() => {
    shakeCount++
    screen.style.transform = `translate(${(Math.random()-0.5)*8}px,${(Math.random()-0.5)*8}px)`
    if (shakeCount > 30) { clearInterval(shakeIv); screen.style.transform = "" }
  }, 80)

  const showCinText = (text, duration) => {
    const old = screen.querySelector(".cinText")
    if (old) { old.style.opacity = "0"; openingTimeout(() => { if (old.parentNode) old.remove() }, 1000) }
    const el = document.createElement("div"); el.className = "cinText"
    el.style.cssText = "font-family:'IM Fell English',serif;font-size:24px;color:#c8a050;text-shadow:0 0 20px rgba(200,160,50,0.6);text-align:center;letter-spacing:3px;line-height:1.8;max-width:600px;padding:0 40px;opacity:0;transition:opacity 1.5s ease;white-space:pre-line;"
    el.innerText = text; screen.appendChild(el)
    openingTimeout(() => { el.style.opacity = "1" }, 50)
    openingTimeout(() => { el.style.opacity = "0"; openingTimeout(() => { if (el.parentNode) el.remove() }, 1500) }, duration)
  }

  openingTimeout(() => {
    const flashDelays = [0,100,220,400,600]
    flashDelays.forEach(delay => {
      openingTimeout(() => {
        const flash = document.createElement("div")
        flash.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:10;"
        screen.appendChild(flash)
        requestAnimationFrame(() => {
          flash.style.transition = "opacity 0.05s"; flash.style.opacity = "1"
          openingTimeout(() => { flash.style.transition = "opacity 0.1s"; flash.style.opacity = "0"; openingTimeout(() => flash.remove(), 150) }, 50)
        })
      }, delay)
    })

    openingTimeout(() => {
      ;["fart.mp3","cribibi.mp3","ah.mp3"].forEach((s, i) => {
        openingTimeout(() => {
          const snd = openingAudio("audio/" + s); snd.volume = 0; snd.play().catch(() => {})
          let inIv = openingInterval(() => { if (snd.volume<0.55) snd.volume=Math.min(0.55,snd.volume+0.04); else clearInterval(inIv) }, 80)
          openingTimeout(() => { let outIv = openingInterval(() => { if (snd.volume>0.03) snd.volume=Math.max(0,snd.volume-0.04); else { snd.pause(); clearInterval(outIv) } }, 100) }, 3000)
        }, i * 200)
      })
      const gb = openingAudio("audio/grisebarbe.mp3"); gb.volume = 0; gb.play().catch(() => {})
      let gbIn = openingInterval(() => { if (gb.volume<0.7) gb.volume=Math.min(0.7,gb.volume+0.03); else clearInterval(gbIn) }, 100)
      openingTimeout(() => { let gbOut = openingInterval(() => { if (gb.volume>0.02) gb.volume-=0.03; else { gb.pause(); clearInterval(gbOut) } }, 100) }, 27000)
    }, 100)
  }, 6000)

  openingTimeout(() => showCinText("… alors, dans le lointain,\non entendra la fréquence sacrée.", 4000), 11000)
  openingTimeout(() => showCinText("… et les héros viendraient offrir\nune nouvelle ère de paix.", 4000), 16000)
  openingTimeout(() => {
    const old = screen.querySelector(".cinText"); if (old) { old.style.opacity = "0"; openingTimeout(() => { if (old.parentNode) old.remove() }, 1000) }
    const wrapper = document.createElement("div"); wrapper.className = "cinText"
    wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;max-width:680px;padding:0 50px;opacity:0;transition:opacity 1.5s ease;"
    const t = document.createElement("div"); t.style.cssText = "font-family:'Cinzel Decorative','Cinzel',serif;font-size:18px;letter-spacing:5px;color:#c8a050;text-shadow:0 0 15px gold;text-align:center;margin-bottom:14px;"; t.innerText = "Prophétie des Enfants de Mouches"; wrapper.appendChild(t)
    const v = document.createElement("div"); v.style.cssText = "font-family:'IM Fell English',serif;font-size:15px;color:rgba(200,160,50,0.8);line-height:2;text-align:center;font-style:italic;"; v.innerText = "— Livre I, Verset 1 —"; wrapper.appendChild(v)
    screen.appendChild(wrapper); openingTimeout(() => { wrapper.style.opacity = "1" }, 50)
    const prop = openingAudio("audio/prophetie.mp3"); prop.volume = 0; prop.play().catch(() => {})
    let pIv = openingInterval(() => { if (prop.volume<0.8) prop.volume=Math.min(0.8,prop.volume+0.04); else clearInterval(pIv) }, 100)
  }, 21000)

  openingTimeout(() => {
    screen.style.transition = "opacity 2s ease"; screen.style.opacity = "0"
    openingTimeout(() => { screen.remove(); if (callback) callback() }, 2000)
  }, 27000)
}

/* ========================= */
/* DROP MOB DIFFICULTÉ       */
/* ========================= */

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

  nameEl.innerText = mobId.toUpperCase()
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

const MOB_SELECT_LIST = ["gobelins","loup","draugr","garde","bandit","ogre","valkyrie","golem","zombie","zombie2","witch","fantome","vampire","dragon","fenrir","balraug","jormungand","kraken"]

function toggleMobDropdown(slot, triggerEl) {
  const dd = document.getElementById("mobDropdown_" + slot); if (!dd) return
  if (dd.style.display !== "none") { dd.style.display = "none"; return }
  if (!dd.dataset.built) {
    dd.dataset.built = "1"
    const none = document.createElement("div"); none.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,100,100);cursor:pointer;"; none.innerText = "— Aucun —"; none.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, "", "— Aucun —") }; dd.appendChild(none)
    MOB_SELECT_LIST.forEach(m => {
      const item = document.createElement("div"); item.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,180,180);cursor:pointer;"; item.innerText = m.charAt(0).toUpperCase() + m.slice(1)
      item.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, m, item.innerText) }; item.onmouseenter = () => item.style.background = "rgb(60,10,10)"; item.onmouseleave = () => item.style.background = ""; dd.appendChild(item)
    })
  }
  const rect = triggerEl.getBoundingClientRect()
  dd.style.position = "fixed"; dd.style.top = (rect.bottom+4)+"px"; dd.style.left = rect.left+"px"; dd.style.width = rect.width+"px"; dd.style.display = "block"
}

function selectMobOption(slot, value, label) {
  const num     = slot.replace("slot", "")
  const trigger = document.getElementById("mobSlot" + num + "Select")
  if (trigger) { trigger.innerText = label; trigger.dataset.value = value }
  const dd = document.getElementById("mobDropdown_" + slot); if (dd) dd.style.display = "none"
  updateMobPreview()
}

function updateMobPreview() {
  const preview = document.getElementById("mobPreviewRow"); if (!preview) return; preview.innerHTML = ""
  const slots = [
    { name: _state.pendingMob },
    { name: document.getElementById("mobSlot2Select")?.dataset.value },
    { name: document.getElementById("mobSlot3Select")?.dataset.value }
  ].filter(s => s.name)

  slots.forEach(s => {
    const div = document.createElement("div"); div.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;"
    const img = document.createElement("img"); img.src = "images/" + s.name + ".png"; img.style.cssText = "width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid rgb(180,40,40);box-shadow:0 0 10px rgb(150,0,0);"; img.onerror = () => img.style.opacity = "0.3"; div.appendChild(img)
    const lbl = document.createElement("div"); lbl.style.cssText = "font-family:Cinzel,serif;font-size:9px;color:rgb(255,150,150);letter-spacing:1px;"; lbl.innerText = s.name.toUpperCase(); div.appendChild(lbl)
    preview.appendChild(div)
  })
}

function _startRemoteCombat(data) {
  if (window.__sessionBusy) return
  if (combatStarting || !data || !data.active) return
  if (!gameStarted) return
  if (gameState !== "GAME" && gameState !== "COMBAT" && gameState !== "DIALOGUE") return
  if (combatActive && currentMob === data.mainMob) return

  window.__localCombatId=data.id||window.__combatSnapshot?.id;window.__completedCombatExitId=null
  currentMob = data.mainMob
  if (data.returnMap) currentMap = data.returnMap

  _state.pendingExtraMobs = {}
  ;(data.extraMobs || []).forEach((mob, i) => {
    const slot = ["mob2","mob3"][i]
    if (!slot || !mob) return
    _state.pendingExtraMobs[slot] = mob
  })

  combatActive = true
  combatStarting = false
  setGameState("COMBAT")
  combatSequence(data.mainMob, data.tier)
  setTimeout(() => { if (typeof updateThuumButton === "function") updateThuumButton() }, 250)
  // Race condition fix : si combat/turnState est déjà arrivé avant game/combatState,
  // le listener a retourné tôt car combatActive était false — on re-render maintenant
  setTimeout(() => {
    const ts = window.__combatTurnState
    if (ts && typeof renderCombatInitiativeOverlay === "function") {
      renderCombatInitiativeOverlay(ts)
      if(ts.phase==="active")queueCombatTurnBanner(window.__combatSnapshot?.id||"legacy",ts)
      if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
    }
  }, 350)
}

function _playRemoteCombatExit(){
 if(window.__combatOutcomeQueued||window.__combatOutcomeShowing)return
 Promise.all([db.ref("game/map").once("value"),db.ref("tokens").once("value")]).then(([map,tokens])=>completeCombatReturn({combatId:window.__localCombatId,returnMap:map.val()||currentMap,returnTokens:tokens.val()||{}}))
}

function _resolveRemoteCombatEnd(){
 db.ref("game/combatOutcome").once("value",snap=>{const data=snap.val();if(data)observeCombatEnding(data);else if(!window.__combatOutcomeQueued&&!window.__combatOutcomeShowing)_playRemoteCombatExit()})
}

function _showCombatTurnBanner(data) {
  const actorId = String(data.currentActorId || "")
  const order   = Array.isArray(data.order) ? data.order : []
  const entry   = order.find(e => String(e.id || "") === actorId)

  const playerColors = { greg:"#d9b37c", ju:"#8fc9ff", elo:"#9cf2cf", bibi:"#ffd28d" }
  const isMob   = !entry || entry.type === "mob"
  const label   = isMob ? "Ennemi attaque" : (entry.label || actorId).toUpperCase() + " joue"
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
          showNotification((currentEntry.label || currentEntry.id).toUpperCase() + " est KO et passe son tour.")
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
