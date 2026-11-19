/* Generated from src/source-map.json by tools/build-source.cjs. Edit the source files, then rebuild. */
"use strict"

window.__combatOutcomeShowing = false
window.__pendingLocalDefeat = false

/* ========================= */
/* DÉMARRAGE COMBAT          */
/* ========================= */

function _getCombatArenaMap(mob, tier) {
  if (mob === "roi") return "roi-salle-du-trone.jpg"
  if (mob === "jormungand" || (typeof combatHasJormungandr==="function"&&combatHasJormungandr({combat:window.__combatSnapshot}))) return "bateau.jpg"
  if (mob === "kraken") return "tourbillon.jpg"
  return tier === "boss" ? "arenefinal.jpg" : "arene.jpg"
}


function combatParticipantDisplayName(entry){return entry?.id==="ju"?"Pika":pikaDisplayText(entry?.label||heroDisplayName(entry?.id))}

function getCombatTurnState() {
  return window.__combatTurnState || null
}

function getCurrentCombatActorId() {
  const state = getCombatTurnState()
  if (!state || state.phase !== "active") return null
  return String(state.currentActorId || "")
}


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

const initiativeRollsInFlight=new Set()
function initiativeRollKey(actorId){return (window.__combatSnapshot?.id||"")+":"+actorId}
function canRollInitiativeForActor(actorId, state) {
  if(initiativeRollsInFlight.has(initiativeRollKey(actorId)))return false
  if (!state || state.phase !== "rolling" || actorId === "bibi" || !(state.participants || []).some(p => p.id === actorId) || Number.isInteger(state.rolls?.[actorId])) return false
  return isGM || !!(myToken && myToken.id === actorId && canAccessCharacter(actorId))
}

async function submitInitiativeRoll(actorId){
 if(!canRollInitiativeForActor(actorId,getCombatTurnState()))return
 const key=initiativeRollKey(actorId);initiativeRollsInFlight.add(key)
 if(document.getElementById("combatInitiativeOverlay"))renderCombatInitiativeOverlay(getCombatTurnState())
 try{return await submitCombatAction("initiative",actorId)}catch(e){showNotification(e.message)}finally{initiativeRollsInFlight.delete(key);if(document.getElementById("combatInitiativeOverlay"))renderCombatInitiativeOverlay(getCombatTurnState())}
}

function submitInitiativeRollForGMTest(actorId) { if(isGM) return submitInitiativeRoll(actorId) }

async function submitAllInitiativeRollsForGMTest() {
  if (!isGM) return
  const state = getCombatTurnState()
  if (!state || state.phase !== "rolling") return
  const participants = Array.isArray(state.participants) ? state.participants : []
  // Enemy initiatives are generated atomically when the last hero roll arrives.
  return Promise.all(participants.filter(entry=>COMBAT_HEROES.includes(entry.id)).map(entry=>submitInitiativeRollForGMTest(entry.id)))
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

function combatSequence(mob, forceTier) {
  window.__combatIntroUntil = Date.now()+((mob === "roi" && !isKingEncounter(window.__combatSnapshot?.mob) && (forceTier||mobStats[mob]?.tier)==="boss")?24500:6500)
  const tierMob = forceTier || (mobStats[mob] ? mobStats[mob].tier : "weak")
  if (mob === "roi" && tierMob === "boss") playRoiIntro(mob, tierMob)
  else _startCombatSequence(mob, tierMob)
}

function playRoiIntro(mob, tierMob) {
  if(isKingEncounter(window.__combatSnapshot?.mob)){_startCombatSequence(mob,tierMob);return}
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
    const roiSnd = new Audio("audio/roi.mp3"); setManagedAudioBaseVolume(roiSnd,1); roiSnd.play().catch(() => {})
    setTimeout(() => {
      let iv = setInterval(() => { if (roiSnd.__baseVolume > 0.04) setManagedAudioBaseVolume(roiSnd,Math.max(0,roiSnd.__baseVolume-0.05)); else { roiSnd.pause(); clearInterval(iv) } }, 80)
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

  const kingCombat=window.__combatSnapshot
  const kingIntro=mob==="roi"&&isKingEncounter(kingCombat?.mob)&&Object.values(kingCombat.kingEvents||{}).some(event=>event.phase===1&&event.time>=(window.__pageLoadTime||0)&&!kingCombat.kingSceneDismissals?.["king-"+event.id])
  if(kingIntro){window.__kingIntroAudioCombatId=window.__combatSnapshot.id;stopAllMusic()}
  if (!keepMapMusic&&!kingIntro) {
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
  window.__cancelBalrogIntroSound?.()
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
        setManagedAudioBaseVolume(witchSound,.9)
        witchSound.play().catch(() => {})
        setTimeout(() => {
          const fadeIv = setInterval(() => {
            if (witchSound.__baseVolume > 0.08) setManagedAudioBaseVolume(witchSound,Math.max(0,witchSound.__baseVolume-0.09))
            else {
              witchSound.pause()
              window.__witchIntroSoundPlaying = false
              clearInterval(fadeIv)
            }
          }, 100)
        }, 4000)
      }
      const title = document.createElement("div")
      title.innerText = heroDisplayName(mobName).toUpperCase()
      title.style.cssText = "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:clamp(20px,3vw,40px);color:red;text-shadow:0 0 10px red;white-space:nowrap;"
      box.appendChild(title)
      if(["balraug","balrog"].includes(mobName)){const scope=createPresentationScope("__cancelBalrogIntroSound"),definition=getMobSpecialPresentation("balraug"),sound=scope.audio(new Audio("audio/"+(definition?.sound||"balrog.mp3")));sound.__specialEffect=true;setManagedAudioBaseVolume(sound,definition?.soundVolume||.8);sound.play().catch(()=>{});scope.later(scope.cancel,4000)}
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
  const positions=resolveCombatTokenPositions(window.__combatSnapshot,window.__tokenPositions)
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
  nameTag.className = "mobNameTag"; nameTag.innerText = heroDisplayName(mob).toUpperCase()
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
    if(outcome?.antrePassage&&typeof playAntreSoulPassage==="function")playAntreSoulPassage(outcome,completeCombatReturn)
    else if(typeof completeCombatReturn==="function")completeCombatReturn(outcome)
    else{endCombat();returnToMap();window.__combatOutcomeShowing=false}
  }, 5000)
}

function endCombat(options = {}) {
  if (!combatActive && !options.force) return
  stopCombatStatsSubscription()
  if(typeof combatTargetCancellation==="function")combatTargetCancellation()
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
 setTimeout(()=>{if(fade){fade.style.transition="opacity .8s ease";fade.style.opacity="0"}window.__combatReturnInProgress=false;if(typeof renderBalrogSwordLoot==="function")renderBalrogSwordLoot()},300)
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

  const tremb = openingAudio("audio/tremblement.mp3"); setManagedAudioBaseVolume(tremb,0.8); tremb.play().catch(() => {})
  openingTimeout(() => { let iv = openingInterval(() => { if (tremb.__baseVolume>0.05) setManagedAudioBaseVolume(tremb,Math.max(0,tremb.__baseVolume-0.05)); else { tremb.pause(); clearInterval(iv) } }, 100) }, 5500)

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
          const snd = openingAudio("audio/" + s); setManagedAudioBaseVolume(snd,0); snd.play().catch(() => {})
          let inIv = openingInterval(() => { if (snd.__baseVolume<0.55) setManagedAudioBaseVolume(snd,Math.min(0.55,snd.__baseVolume+0.04)); else clearInterval(inIv) }, 80)
          openingTimeout(() => { let outIv = openingInterval(() => { if (snd.__baseVolume>0.03) setManagedAudioBaseVolume(snd,Math.max(0,snd.__baseVolume-0.04)); else { snd.pause(); clearInterval(outIv) } }, 100) }, 3000)
        }, i * 200)
      })
      const gb = openingAudio("audio/grisebarbe.mp3"); setManagedAudioBaseVolume(gb,0); gb.play().catch(() => {})
      let gbIn = openingInterval(() => { if (gb.__baseVolume<0.7) setManagedAudioBaseVolume(gb,Math.min(0.7,gb.__baseVolume+0.03)); else clearInterval(gbIn) }, 100)
      openingTimeout(() => { let gbOut = openingInterval(() => { if (gb.__baseVolume>0.02) setManagedAudioBaseVolume(gb,Math.max(0,gb.__baseVolume-0.03)); else { gb.pause(); clearInterval(gbOut) } }, 100) }, 27000)
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
    const prop = openingAudio("audio/prophetie.mp3"); setManagedAudioBaseVolume(prop,0); prop.play().catch(() => {})
    let pIv = openingInterval(() => { if (prop.__baseVolume<0.8) setManagedAudioBaseVolume(prop,Math.min(0.8,prop.__baseVolume+0.04)); else clearInterval(pIv) }, 100)
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

const MOB_SELECT_LIST = ["gobelins","loup","draugr","garde","bandit","ogre","valkyrie","golem","zombie","zombie2","witch","fantome","vampire","dragon","fenrir","balraug","jormungand","kraken"]

function toggleMobDropdown(slot, triggerEl) {
  const dd = document.getElementById("mobDropdown_" + slot); if (!dd) return
  if (dd.style.display !== "none") { dd.style.display = "none"; return }
  if (!dd.dataset.built) {
    dd.dataset.built = "1"
    const none = document.createElement("div"); none.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,100,100);cursor:pointer;"; none.innerText = "— Aucun —"; none.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, "", "— Aucun —") }; dd.appendChild(none)
    MOB_SELECT_LIST.forEach(m => {
      const item = document.createElement("div"); item.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,180,180);cursor:pointer;"; item.innerText = heroDisplayName(m)
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
    const lbl = document.createElement("div"); lbl.style.cssText = "font-family:Cinzel,serif;font-size:9px;color:rgb(255,150,150);letter-spacing:1px;"; lbl.innerText = heroDisplayName(s.name).toUpperCase(); div.appendChild(lbl)
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
  const label   = isMob ? "Ennemi attaque" : combatParticipantDisplayName(entry||{id:actorId}).toUpperCase() + " joue"
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
          showNotification(combatParticipantDisplayName(currentEntry).toUpperCase() + " est KO et passe son tour.")
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
const kingSceneImageCache=new Map()
const KING_SCENE_TITLES={intro:"La Couronne qui refuse le destin",sentence:"Sentence royale",blood:"Le tribut de sang",schnaw:"Mes sujets vous dévoreront",sweep:"Personne ne décide de mon destin",aurora:"Turn Around",odin:"L’appel des aurores"}
function loadKingSceneImages(scene){
 const files={roi:"roi.png",chnaw:"chnaw.png",odin:"odin.png",hel:"hel.png",nidhogg:"nhiddog.png",greg:"greg pion.png",elo:"ELO PION.png",pika:"pika-token.svg",bibi:"bibi.png",arena:"roi-salle-du-trone.jpg"}
 const wanted=["roi","arena",...(scene==="intro"?[]:["greg","elo","pika","bibi"]),...(scene==="schnaw"?["chnaw"]:[]),...(scene==="odin"?["odin"]:[])]
 return Promise.all(wanted.map(key=>{if(kingSceneImageCache.has(key))return kingSceneImageCache.get(key);const promise=new Promise(resolve=>{
  const file=files[key]
  const img=new Image();img.decoding="async";img.onload=()=>{const thumb=document.createElement("canvas"),scale=Math.min(1,(key==="arena"?960:480)/Math.max(img.naturalWidth,img.naturalHeight));thumb.width=Math.max(1,Math.round(img.naturalWidth*scale));thumb.height=Math.max(1,Math.round(img.naturalHeight*scale));thumb.getContext("2d").drawImage(img,0,0,thumb.width,thumb.height);thumb.complete=true;resolve([key,thumb])};img.onerror=()=>{kingSceneImageCache.delete(key);resolve([key,null])};img.src="images/"+file
 });kingSceneImageCache.set(key,promise);return promise})).then(Object.fromEntries)
}
const kingSceneClosures=new Map()
function observeKingSceneClosures(data){
 kingSceneClosures.set(data.id,data.kingSceneDismissals||{})
 if(kingSceneClosures.size>3)kingSceneClosures.delete(kingSceneClosures.keys().next().value)
 window.__kingSceneClosed?.(data.id,data.kingSceneDismissals||{})
}
function presentKingScene(result){
 const scene=result.kingScene||result.scene||"intro",combatId=window.__combatSnapshot?.id
 const sceneId=result.kingSceneId
 if(kingSceneClosures.get(combatId)?.[sceneId])return Promise.resolve()
 let resolveClosed;const completed=new Promise(resolve=>{resolveClosed=resolve})
 const gm=window.__authRole==="gm"||(!window.__authRole&&isGM)
 const overlay=document.createElement("div"),stage=document.createElement("section"),title=document.createElement("h2"),canvas=document.createElement("canvas"),caption=document.createElement("p"),outcome=document.createElement("p"),close=document.createElement("button")
 overlay.id="kingScene";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",KING_SCENE_TITLES[scene]||"Le Roi")
 stage.className="kingSceneStage";title.textContent=result.kingRelease?"Une aurore est libérée":(result.kingWarning?"Préparation — ":"")+(scene==="strike"?result.attack:KING_SCENE_TITLES[scene]||"Le Roi");canvas.width=960;canvas.height=600;canvas.setAttribute("role","img");canvas.setAttribute("aria-label",title.textContent);outcome.textContent=result.explanation||result.message||"";close.textContent="Fermer — Échap";close.type="button"
 outcome.hidden=!!result.kingWarning
 stage.append(title,canvas,caption,outcome,close);overlay.append(stage);document.body.append(overlay)
 const onField=scene!=="intro"&&scene!=="odin"
 if(onField){overlay.classList.add("kingOnField");overlay.setAttribute("role","region");overlay.removeAttribute("aria-modal");overlay.append(canvas);canvas.className="kingFieldCanvas"}
 let voicePlaying=scene==="intro",pendingClose=false
 const finish=()=>{if(window.__kingIntroAudioCombatId===combatId)delete window.__kingIntroAudioCombatId;window.GameWindows?.closed(overlay);if(window.__kingSceneClosed===onClosed)window.__kingSceneClosed=null;resolveClosed()},scope=createPresentationScope("__cancelKingScene",finish);scope.node(overlay)
 const onClosed=(id,closed)=>{if(id===combatId&&closed[sceneId]){if(voicePlaying)pendingClose=true;else scope.cancel()}};window.__kingSceneClosed=onClosed
 const requestClose=async()=>{
  if(!gm||close.disabled||voicePlaying)return
  if(!sceneId){scope.cancel();return}
  close.disabled=true
  try{requireActionAccess({gmOnly:true});requireExplorationConnection();const uid=window.__authUid,revision=persistenceRevision||"initial";const tx=await reliableRootTransaction(root=>applyKingSceneDismissal(root,uid,combatId,revision,sceneId));if(!tx.committed)throw Error("Fermeture non confirmée");scope.cancel()}
  catch(error){outcome.textContent=error.message;close.disabled=false}
 }
 close.textContent=gm?"Continuer — fermer pour tous (Échap)":"En attente du MJ";close.disabled=!gm;close.onclick=requestClose
 scope.listen(overlay,"keydown",e=>{if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();requestClose()}})
 window.GameWindows?.register(overlay,requestClose);close.focus({preventScroll:true})
 const milliseconds=result.kingWarning||result.kingRelease||result.kingTransition?3500:scene==="odin"?8500:7000
 if(scene==="intro"){
  window.__kingIntroAudioCombatId=combatId;stopAllMusic();close.disabled=true;close.textContent="Entrée du Roi — lecture en cours…"
  const portrait=scope.node(document.createElement("img"));portrait.className="kingIntroPortrait";portrait.src="images/roi.png";portrait.alt="Le Roi";canvas.hidden=true;canvas.before(portrait)
  const voice=scope.audio(new Audio("audio/roi.mp3"));setManagedAudioBaseVolume(voice,1)
  const ended=()=>{
   if(scope.cancelled||!voicePlaying)return
   voicePlaying=false;if(window.__kingIntroAudioCombatId===combatId)delete window.__kingIntroAudioCombatId
   close.disabled=!gm;close.textContent=gm?"Continuer — fermer pour tous (Échap)":"En attente du MJ"
   if(window.__combatSnapshot?.id===combatId&&combatActive)crossfadeMusic("audio/worldboss.mp3")
   if(pendingClose)scope.cancel()
  }
  scope.listen(voice,"ended",ended);scope.listen(voice,"error",ended)
  let started=false;const start=()=>{if(started||scope.cancelled)return;started=true;voice.play().catch(ended)}
  scope.listen(portrait,"load",start);scope.listen(portrait,"error",ended);if(portrait.complete&&portrait.naturalWidth>0)start()
 }
 if(onField){
  const sounds=new Set(),sound=id=>{if(sounds.has(id))return;sounds.add(id);const file={pow:"pow.mp3",crystal:"cristalfx.mp3",schnaw:"chnaws.mp3",rumble:"tremblement.mp3"}[id];if(!file)return;const audio=scope.audio(new Audio("audio/"+file));setManagedAudioBaseVolume(audio,id==="rumble"?.14:result.kingWarning?.2:.35,"effects");audio.play().catch(()=>{})}
  const draw=createKingFieldRenderer(canvas,{...result,scene},text=>{caption.textContent=text},sound),reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const finalTime=result.kingWarning?2:9,started=performance.now();let last=0,held=false
  const hold=()=>{if(held)return;held=true;scope.every(()=>{if(window.__combatSnapshot?.id!==combatId){scope.cancel();return}draw(finalTime)},250)}
  if(["sentence","schnaw","sweep","aurora"].includes(scene))sound("rumble")
  if(reduced||result.kingTransition||result.kingRelease){draw(finalTime);hold()}
  else {const tick=now=>{if(scope.cancelled)return;if(window.__combatSnapshot?.id!==combatId){scope.cancel();return}const elapsed=(now-started)/1000;if(now-last>=32){last=now;draw(result.kingWarning?Math.min(2,elapsed):Math.min(9,elapsed*9/(milliseconds/1000)))}if(elapsed*1000<milliseconds)scope.frame(tick);else hold()};scope.frame(tick)}
 }
 else loadKingSceneImages(scene).then(images=>{
  if(scope.cancelled||window.__combatSnapshot?.id!==combatId)return
  if(["sentence","schnaw","sweep","aurora"].includes(scene)){const rumble=scope.audio(new Audio("audio/tremblement.mp3"));setManagedAudioBaseVolume(rumble,.18,"effects");rumble.play().catch(()=>{})}
  const fired=new Set(),sound=(id)=>{if(fired.has(id))return;fired.add(id);const file={pow:"pow.mp3",schnaw:"chnaws.mp3",crystal:"cristalfx.mp3"}[id];if(!file)return;const audio=scope.audio(new Audio("audio/"+file));setManagedAudioBaseVolume(audio,id==="pow"?(result.kingWarning?.2:.35):.4,"effects");audio.play().catch(()=>{})}
  const data={...result,scene,kingLights:result.kingLights??result.lights??0},draw=createKingSceneRenderer(canvas,images,data,text=>{if(caption.textContent!==text)caption.textContent=text},sound),reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if(reduced&&result.kingWarning&&scene==="sentence")sound("pow")
  if(result.kingTransition||result.kingRelease){draw(scene==="intro"?4:5.5);caption.textContent=result.message||caption.textContent;return}
  if(reduced){draw(result.kingWarning?2:9.5);return}
  const started=performance.now();let last=0
  const tick=now=>{if(scope.cancelled)return;if(window.__combatSnapshot?.id!==combatId){scope.cancel();return}const seconds=(now-started)/1000;if(now-last>=32){last=now;draw(result.kingWarning?Math.min(4,seconds):Math.min(12,seconds*12/(milliseconds/1000)))}if(seconds*1000<milliseconds)scope.frame(tick)}
  scope.frame(tick)
 })
 return completed
}
function observeKingScenes(data){
 for(const event of Object.values(data.kingEvents||{}).sort((a,b)=>a.time-b.time)){
  if(!Number.isFinite(event.time)||event.time<(window.__pageLoadTime||0))continue
  const phase=event.phase,scene=phase?(phase===1?"intro":KING_PHASES[phase-1].scene):event.scene
  enqueueSharedVisual("king-"+event.id,()=>presentKingScene({...event,kingScene:scene,kingSceneId:"king-"+event.id,kingTransition:!!phase,kingLights:event.lights||0}),phase||event.kingRelease?3600:scene==="odin"?8600:7100,1.5)
 }
}
function renderKingBattlefield(){
 const c=window.__combatSnapshot,slot=typeof currentKingSlot==="function"?currentKingSlot():null,host=document.getElementById("combatTokens")
 let overlay=document.getElementById("kingBattlefield")
 if(!combatActive||!slot||!host){overlay?.remove();return}
 const mob=c[slot],phase=kingStage(mob),signature=JSON.stringify([c.id,phase,mob.king.pillars,mob.king.auroras,mob.king.refugesConfirmed,mob.king.refugeTargets,mob.chargingSpecial?.id])
 if(overlay?.dataset.signature===signature)return
 if(phase===2)loadKingSceneImages("schnaw").catch(()=>{})
 if(phase===5)loadKingSceneImages("odin").catch(()=>{})
 overlay?.remove();overlay=document.createElement("div");overlay.id="kingBattlefield";overlay.dataset.signature=signature;overlay.setAttribute("aria-label","Repères du combat du Roi");host.prepend(overlay)
 if(phase===5&&kingAuroraCount(mob)>0){const sky=document.createElement("div");sky.className="kingFreedSky";sky.setAttribute("aria-label","Les aurores libérées illuminent le ciel");overlay.append(sky)}
 const marker=(name,cls,x,y,text)=>{const node=document.createElement("div");node.className=cls;node.style.left=x+"%";node.style.top=y+"%";node.dataset.kingMarker=name;const label=document.createElement("span");label.textContent=text;node.append(label);overlay.append(node)}

 if(phase===2)for(let i=0;i<2;i++)marker("ritual-"+i,"kingRitual",24+i*50,40,"Rituel Schnaw")
 if(phase===5&&mob.chargingSpecial?.kingStage===5){for(let i=0;i<3;i++)marker("aurora-"+i,"kingAuroraMarker"+(mob.king.auroras?.[i]?" is-released":""),20+i*30,38,"Aurore "+(i+1)+(mob.king.auroras?.[i]?" libérée":""));marker("refuge","kingRefuge",50,72,mob.king.refugesConfirmed?"Refuges validés par le MJ":"Refuge — validation MJ")}
}

function createKingSceneRenderer(canvas,images,result,setCaption,onSound){
 const c=canvas.getContext("2d"),state={scene:result.scene,lights:result.kingLights||0,defense:result.kingProtected||result.success?"yes":"no"},targetX=({greg:315,ju:440,elo:565,bibi:650})[result.targets?.[0]]||440;let t=0;const playing=true;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},fade=(a,b)=>ease((t-a)/(b-a));
 function cue(id,time){if(t>=time)onSound(id)}
 function glow(x,y,r,color,alpha=1){c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
 function line(points,color,width=2,alpha=1){c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();c.restore()}
 function sprite(name,x,y,h,alpha=1,shadow=null){const im=images[name];if(!im||!im.complete)return;c.save();c.globalAlpha=alpha;if(shadow){c.shadowColor=shadow;c.shadowBlur=22}const w=h*im.width/im.height;c.drawImage(im,x-w/2,y-h,w,h);c.restore()}
 function ring(x,y,rx,ry,color,a=1){c.save();c.globalAlpha=a;c.strokeStyle=color;c.lineWidth=3;c.shadowColor=color;c.shadowBlur=18;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();c.restore()}
 function particles(color,n,cx,cy,spread,progress){c.save();c.fillStyle=color;for(let i=0;i<n;i++){const a=i*2.399,rad=((i*17)%100)/100*spread*(.3+progress);c.globalAlpha=(1-progress)*(.4+(i%5)/10);c.beginPath();c.arc(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.65-progress*70,1+(i%3),0,Math.PI*2);c.fill()}c.restore()}
 function crown(x,y,size,color,broken=false){const pts=[[-1,.2],[-1,-.4],[-.45,-.05],[0,-.8],[.45,-.05],[1,-.4],[1,.2],[-1,.2]].map(([a,b])=>[x+a*size,y+b*size]);line(pts,color,3);if(broken)line([[x-8,y-size*.6],[x+5,y-7],[x-2,y+7]],'#f5eee5',3)}
 function auroras(strength=1,center=220){c.save();c.globalCompositeOperation='screen';const cols=['#63ffc2','#649bff','#ce79ff'];for(let k=0;k<3;k++){const cy=center-70+k*58;for(let j=0;j<5;j++){c.globalAlpha=strength*(.19-j*.027);c.fillStyle=cols[k];c.beginPath();for(let x=0;x<=960;x+=12){const y=cy+Math.sin(x/190+t*.6+k*.35)*31;c.lineTo(x,y-j*5)}for(let x=960;x>=0;x-=12){const y=cy+Math.sin(x/190+t*.6+k*.35)*31;c.lineTo(x,y+14+j*5)}c.closePath();c.fill()}}c.restore()}
 function mist(color,power=.5){for(let i=0;i<9;i++)glow(((i*143+t*16)%1200)-100,470+Math.sin(i+t*.3)*40,160,color,power*.28)}
 function players(y=480,safe=false){[315,440,565].forEach((x,i)=>{glow(x,y+4,36,safe?'#7effc4':'#8c6eaa',.3);ring(x,y,27,10,safe?'#8eeedb':'#b8a78b',.6);if(i!==1)sprite(i===0?'greg':'elo',x,y,58,1);else{c.fillStyle='#9dcbd2';c.beginPath();c.arc(x,y-24,19,0,Math.PI*2);c.fill();sprite('pika',x,y+2,55)}});ring(650,y,21,8,safe?'#8eeedb':'#b8a78b',.6);sprite('bibi',650,y,44)}
 function caption(text){setCaption(text)}
 function draw(){
  const sc=state.scene,success=state.defense==='yes';c.clearRect(0,0,960,600);c.fillStyle='#0a0a12';c.fillRect(0,0,960,600);
  const arena=images.arena;if(arena?.complete){c.save();c.globalAlpha=.37;c.drawImage(arena,0,0,960,600);c.restore()}
  const shade=c.createLinearGradient(0,0,0,600);shade.addColorStop(0,'#050914e8');shade.addColorStop(.45,'#13111c55');shade.addColorStop(1,'#05070ccc');c.fillStyle=shade;c.fillRect(0,0,960,600);
  const shake=playing&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&t>4.7&&t<5.05?Math.sin(t*85)*3:0;c.save();c.translate(shake,0);
  if(sc==='intro'){
   glow(480,290,260,'#b59a48',.4);sprite('roi',480,470,325*(.94+.06*fade(0,5)));crown(480,125,55,'#dfc783',t>7);particles('#edcf85',50,480,340,220,((t*.08)%1));
   caption(t<5?'« Enfants de mouche… Votre prophétie ne signifie rien. »':'« Personne ne décide de mon destin. »');
  }else if(sc==='strike'){
   sprite('roi',480,315,190);players();glow(targetX,440,75,'#ce344e',Math.max(0,1-Math.abs(t-5)/3));caption(result.attack||'Le Roi attaque');cue('pow',4.5);
  }else if(sc==='sentence'){
   sprite('roi',480,315,190);crown(480,110,30,'#e5c580');players();const aimX=targetX;
   if(t<4.5){line([[480,300],[aimX,480]],'#f06d66',5,.3+.25*Math.sin(t*5));ring(targetX,480,36,13,'#ff7676');crown(targetX,399,20,'#f47676');particles('#ad9785',30,480,320,200,(t*.12)%1);caption(result.kingWarning?(result.message||'Le Roi prépare Sentence royale — '+(result.targets||[]).map(combatFriendlyName).join(', ')+' est visé.'):'Sentence royale');cue('pow',1.4);}
   else{const endY=480;line([[480,300],[aimX,endY]],'#ffad7c',26,clamp(1-(t-4.5)*1.5));line([[480,300],[aimX,endY]],'#fff2bb',7,clamp(1-(t-4.5)*1.5));particles('#edc795',50,aimX,endY,150,clamp((t-4.5)/2));caption(success?'La protection validée par le MJ arrête Sentence royale.':'Sentence royale frappe sa cible.');cue('pow',4.5)}
  }else if(sc==='blood'){
   sprite('roi',480,315,190);players();glow(targetX,450,90,'#d22640',.5);const broken=success&&t>=5;
   if(!broken){const pts=[];for(let i=0;i<=40;i++){const p=i/40;pts.push([480+(targetX-480)*p+Math.sin(p*13-t*5)*9,300+155*p])}line(pts,'#ca2749',7,.8);for(let i=0;i<7;i++){const p=((i/7+t*.28)%1);glow(targetX+(480-targetX)*p,455-155*p,15,'#ff5567',.8)}}else particles('#ff3c67',60,520,375,170,clamp((t-5)/3));
   caption(t<5?'Un lien de sang se tend vers la cible annoncée.':broken?'Le lien éclate · le Roi ne reçoit aucun soin.':'Le sang rejoint la couronne · le Roi se soigne.');cue('crystal',5)
  }else if(sc==='schnaw'){
   sprite('roi',480,315,190);players();mist('#6b1529',.8);[270,690].forEach((x,i)=>{glow(x,360,95,'#c72f49',.5);line([[x-65,385],[x-25,369],[x-5,381],[x+15,356],[x+65,368]],'#ff5d67',3);ring(x,375,68*fade(.5,3),19,'#d84965');const appear=fade(2.5+i*.4,5);sprite('chnaw',x,370,145*appear,appear,'#b42347');if(t>5)particles('#ad6d79',15,x,355,80,clamp((t-5)/3))});
   caption(t<3?'Deux marques apparaissent · le rituel peut être perturbé.':'Les deux Schnaw émergent des fissures.');cue('schnaw',3.7)
  }else if(sc==='sweep'){
   sprite('roi',480,315,190);crown(480,111,35,'#ff707a',true);players();const zones=[210,440,670];zones.forEach((x,i)=>{const fire=4+i*1.2,pre=t<fire,alpha=pre?.12:clamp(1-(t-fire)/1.1)*.8;c.fillStyle=`rgba(224,48,77,${alpha})`;c.fillRect(x-85,310,170,205);line([[x-85,310],[x-85,515],[x+85,515]],'#ca6d78',2,.5);if(!pre&&t<fire+1.1){glow(x,410,160,'#bf244e',.75);line([[x,315],[x,510]],'#ffb4bb',12,.6)}});
   caption(t<4?'Les secteurs annoncent l’ordre du balayage.':t<8?'Les vagues traversent les secteurs successivement.':'Le balayage s’achève · le Roi est exposé.');cue('pow',5.2)
  }else if(sc==='aurora'||sc==='odin'){
   const lights=sc==='odin'?3:Number(state.lights),released=fade(2,6),impact=fade(8,9),rescue=lights>0;
   sprite('roi',480,310,175,1-impact*.25);crown(480,125,40,'#e5b3cf',true);glow(480,142,110,'#b175cd',.28);mist('#11051f',1);
   for(let k=0;k<3;k++){const x=[250,480,710][k],active=k<lights,p=active?released:0;line([[480,140],[x-20,230],[x,355]],active?'#80edce':'#9b739a',3,.2+.6*p);ring(x,360,35+10*p,13,active?'#9affd4':'#947297',.8);if(active){glow(x,340,80,'#67d9b7',.4*p);particles('#bbffe5',18,x,345,70,(t*.1+k*.2)%1)}}
   auroras(released*.75,235);if(rescue){glow(440,466,120+lights*30,'#66e5cb',released*.28);ring(440,480,80+lights*28,25+lights*7,'#9cffe1',released);}
   players(480,rescue&&released>.6);
   if(sc==='odin'&&t>3){const a=fade(3,6);glow(480,280,250,'#a0dbe9',a*.5);line([[480,80],[460,170],[495,200],[480,390]],'#d2fcff',5,a);sprite('odin',480,418,300,a,'#a2ffff')}
   if(t>7.8){c.save();const wy=80+(t-7.8)*210,night=c.createLinearGradient(0,wy-90,0,wy+90);night.addColorStop(0,"transparent");night.addColorStop(.5,"#03010ce0");night.addColorStop(1,"transparent");c.fillStyle=night;c.fillRect(0,wy-90,960,180);c.restore();if(rescue){c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(440,480,40,440,480,240);g.addColorStop(0,'#74e7c530');g.addColorStop(.78,'#80d9f277');g.addColorStop(.9,'#b1ffff');g.addColorStop(1,'transparent');c.fillStyle=g;c.beginPath();c.ellipse(440,480,170+lights*18,170+lights*18,0,Math.PI,Math.PI*2);c.lineTo(440+170+lights*18,480);c.closePath();c.fill();c.restore();players(480,true)}cue('pow',8.2);if(t>10)auroras(.8,220)}
   caption(sc==='odin'?(t<5?'Trois aurores libérées · l’appel atteint Odin.':t<8?(result.message||'« Je viens pour les aurores. »'):'Odin canalise les aurores · Turn Around est arrêté.'):(t<3?'La couronne laisse échapper les dernières aurores.':t<7?'Les joueurs libèrent les aurores et ouvrent leurs refuges.':rescue?(lights===3?'Les trois aurores arrêtent Turn Around.':'Le refuge absorbe une partie de Turn Around.'):'Sans aurore libérée · seule subsiste une faible lueur de secours.'));
   cue('crystal',3)
  }else if(sc==='duo'){
   const a=fade(.5,3),strike=fade(7,8);mist('#52335f',1);sprite('roi',620,385,235,1-strike*.25);sprite('hel',300,450,310,a,'#a3a0e2');sprite('nidhogg',650-120*strike,390,245,fade(3,5),'#c3aedc');
   for(let i=0;i<7;i++){const x=530+i*26;line([[x+40,510],[x-15,430],[x+20,390],[620,290]],'#70556f',4,fade(4,7))}
   if(t>7){glow(610,255,180,'#d3b7ff',clamp(1-(t-7)/3));particles('#e4cbff',65,610,250,230,clamp((t-7)/4));crown(620,145,40,'#e9d4ff',true)}
   caption(t<6?'Hel se révèle dans la brume ; Nidhogg approche.':'« Tu portes une couronne. Tu n’en restes pas moins mortel. »');cue('pow',7.5)
  }
  const vig=c.createRadialGradient(480,300,180,480,300,600);vig.addColorStop(0,'transparent');vig.addColorStop(1,'#02030bcf');c.fillStyle=vig;c.fillRect(0,0,960,600);c.restore();
 }

 return seconds=>{t=seconds;draw()}
}

// Effets transparents ancrés aux pions réels : aucune arène ni personnage redessiné.
function createKingFieldRenderer(canvas,result,setCaption,onSound){
 const ctx=canvas.getContext("2d"),scene=result.scene,warning=!!result.kingWarning,fired=new Set()
 const cue=id=>{if(!fired.has(id)){fired.add(id);onSound(id)}}
 const point=id=>{const node=document.getElementById(id==="mob"?"mobToken":id?.startsWith("mob")?"mobToken_"+id:id==="eloSummon"?"eloSummonToken":id);if(!node)return null;const rect=node.getBoundingClientRect();return rect.width>0&&rect.height>0?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,r:Math.max(20,Math.min(rect.width,rect.height)/2)}:null}
 const path=(a,b,color,width,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
 const ring=(p,color,size=1,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*size,p.r*size*.65,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 return seconds=>{
  if(document.hidden)return
  const width=window.innerWidth,height=window.innerHeight,ratio=Math.min(1.5,window.devicePixelRatio||1)
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio)}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height)
  const map=document.getElementById("map")?.getBoundingClientRect();ctx.save();if(map&&map.width>0&&map.height>0){ctx.beginPath();ctx.rect(map.left,map.top,map.width,map.height);ctx.clip()}
  const c=window.__combatSnapshot,mob=c?.[result.kingSlot||"mob"],charge=mob?.chargingSpecial,origin=point(result.kingSlot||"mob"),ids=result.targets?.length?result.targets:charge?.kingTargets||[],targets=ids.map(point).filter(Boolean),pulse=.65+.2*Math.sin(seconds*4)
  if(scene==="sentence"||scene==="strike"||scene==="blood"){
   for(const target of targets){
    ring(target,scene==="blood"?"#db315a":"#ff706a",1.2,pulse)
    if(origin){
     if(scene==="blood"){path(origin,target,"#ad2048",5,pulse);for(let i=0;i<6;i++){const progress=(seconds*.22+i/6)%1;ring({x:target.x+(origin.x-target.x)*progress,y:target.y+(origin.y-target.y)*progress,r:4},"#ff577e",1,.8)}if(seconds>3)cue("crystal")}
     else if(warning){path(origin,target,"#e94c55",2,pulse*.65);if(seconds>=1)cue("pow")}
     else{const impact=seconds<3?.25:seconds<6?1:Math.max(.12,1-(seconds-6)/3);path(origin,target,"#ed514c",seconds<3?3:16,impact);if(seconds>=3){path(origin,target,"#fff1bd",4,impact);cue("pow")}if(result.kingProtected)ring(target,"#a4e9dc",1.6,.9)}
    }
   }
   setCaption(warning?(result.message||"Le Roi prépare "+(result.attack||"Sentence royale")+"."):(result.attack||KING_SCENE_TITLES[scene]||"Le Roi attaque"))
  }else if(scene==="schnaw"){
   for(const slot of COMBAT_MOBS){const p=point(slot);if(p&&c?.[slot]?.kingMinion){ring(p,"#d24b68",1.5,pulse);ring(p,"#8a214e",1.9,.45)}}cue("schnaw");setCaption(result.message||"Les Schnaw répondent au Roi.")
  }else if(scene==="sweep"){
   if(origin){ctx.save();ctx.strokeStyle="#e84e70";ctx.lineWidth=warning?3:10;ctx.globalAlpha=warning?.35:.7;ctx.shadowColor="#ef335d";ctx.shadowBlur=20;const radius=Math.min(width,height)*.36;ctx.beginPath();ctx.arc(origin.x,origin.y,radius,-Math.PI+(seconds%3)*.5,(seconds%3)*.5);ctx.stroke();ctx.restore()}for(const target of targets)ring(target,"#f57e90",1.3,pulse);if(!warning)cue("pow");setCaption(result.message||"Le refus du destin")
  }else if(scene==="aurora"||scene==="odin"){
   const lights=scene==="odin"?3:result.kingLights||0,colors=["#6ce8ba","#6c9eff","#bf84e8"],bounds=map?.width>0?map:{left:0,top:0,width,height}
   for(let i=0;i<lights;i++){ctx.save();ctx.strokeStyle=colors[i];ctx.lineWidth=18;ctx.shadowColor=colors[i];ctx.shadowBlur=25;ctx.globalAlpha=.35;ctx.beginPath();for(let x=0;x<=bounds.width;x+=12){const y=bounds.top+bounds.height*(.12+i*.07)+Math.sin(x/130+seconds*.5+i)*18;ctx.lineTo(bounds.left+x,y)}ctx.stroke();ctx.restore()}
   for(const id of ["greg","ju","elo","bibi","eloSummon"]){const p=point(id);if(p&&(scene==="odin"||mob?.king?.refugeTargets?.includes(id)))ring(p,"#a0efdd",1.7,.8)}cue("crystal");setCaption(result.message||result.explanation||KING_SCENE_TITLES[scene])
  }
  ctx.restore()
 }
}
