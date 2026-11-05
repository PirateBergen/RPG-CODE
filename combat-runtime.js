"use strict"

let combatCoordinatorRef = null
let combatCoordinatorCallback = null
let combatCoordinatorQueue = Promise.resolve()
let combatTargetCancellation = null
let lastCombatPresentationId = null
window.__combatSnapshot = null

async function transactCombatRoot(update) {
  const ref = db.ref()
  // Firebase appelle d’abord la transaction avec le cache local, parfois vide.
  // Lire la racine évite d’abandonner une action valide sur ce premier null.
  const keepCache = () => {}
  ref.on("value", keepCache)
  try {
    for(let attempt=0;attempt<4;attempt++){
      await ref.once("value")
      try{return await ref.transaction(update,undefined,false)}catch(error){if(!/^(set|update)$/.test(error.message||"")||attempt===3)throw error}
    }
  }
  finally { ref.off("value", keepCache) }
}

function syncCombatCoordinator() {
  if (combatCoordinatorRef && combatCoordinatorCallback) combatCoordinatorRef.off("child_added", combatCoordinatorCallback)
  combatCoordinatorRef = null; combatCoordinatorCallback = null
  if (window.__authRole !== "gm") return
  combatCoordinatorRef = db.ref("combatRequests")
  combatCoordinatorCallback = snapshot => {
    if (snapshot.val()?.status !== "queued") return
    const id = snapshot.key, seed = Math.floor(Math.random() * 4294967296)
    combatCoordinatorQueue = combatCoordinatorQueue.catch(() => {}).then(async () => {
      if (window.__authRole !== "gm") return
      await transactCombatRoot(root => reduceCombatRequest(root, id, seed) || undefined)
    }).catch(error => { console.error("Résolution du combat", error); showNotification("Action non confirmée : " + error.message) })
  }
  combatCoordinatorRef.on("child_added", combatCoordinatorCallback)
  migrateSharedFamiliarTurn().catch(error => console.warn(error))
}

async function migrateSharedFamiliarTurn() {
  if (window.__authRole !== "gm") return
  await transactCombatRoot(current => {
    if (!current?.combat?.mob || !current.game?.combatState?.active || current.sessionControl?.phase) return undefined
    if (current.combat.id && !current.combat.turnState?.participants?.some(p => p.id === "bibi") && !current.combat.turnState?.order?.some(p => p.id === "bibi")) return undefined
    const root = combatClone(current)
    root.combat.id ||= "legacy-" + (root.game.combatState.time || Date.now())
    root.combat.phase ||= "active"
    normalizeCombatTurns(root)
    return root
  })
}

async function submitCombatAction(kind, actor, payload = {}) {
  if (window.__sessionBusy) throw new Error("La partie est en cours de synchronisation")
  if (!window.__authUid || !window.__combatSnapshot?.id) throw new Error("Attendez la synchronisation du combat et la connexion du MJ")
  const state = getCombatTurnState()
  const ref = db.ref("combatRequests").push()
  const request = { uid: window.__authUid, actor, kind, payload: { ...payload, version: 1 }, status: "queued", combatId: window.__combatSnapshot.id,
    sequence: combatInt(state?.sequence), time: Date.now() }
  await ref.set(request)
  return new Promise((resolve, reject) => {
    let finished = false
    const finish = (error, result) => {
      if (finished) return
      finished = true; clearTimeout(timer); ref.off("value", listener)
      error ? reject(error) : resolve(result)
    }
    const listener = snap => {
      const value = snap.val()
      if (value?.status === "done") finish(null, value.result)
      else if (value?.status === "failed" || value?.status === "cancelled") finish(new Error(value.error || "Action annulée"))
    }
    const timer = setTimeout(async () => {
      try {
        const result = await ref.child("status").transaction(status => status === "queued" ? "cancelled" : undefined)
        if (result.committed) finish(new Error("Aucun MJ n’a confirmé l’action ; elle a été annulée. Réessayez une fois le MJ connecté."))
        else listener(await ref.once("value"))
      } catch (error) { finish(new Error("Statut de l’action inconnu : reconnectez-vous avant de réessayer")) }
    }, 15000)
    ref.on("value", listener, error => finish(error))
  })
}

function chooseEnemyCombatTarget() {
  const slots = livingMobs(window.__combatSnapshot)
  if (!slots.length) return Promise.resolve(null)
  if (slots.length === 1) return Promise.resolve(slots[0])
  if (combatTargetCancellation) combatTargetCancellation()
  return new Promise(resolve => {
    const overlay = document.createElement("div"); overlay.id = "combatEnemyTargetPicker"
    overlay.style.cssText = "position:fixed;inset:0;z-index:2000000000;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;"
    const panel = document.createElement("div"); panel.style.cssText = "padding:24px;background:#19100c;border:1px solid #cda761;border-radius:12px;color:#ffe4ac;font:18px Georgia;"
    const title = document.createElement("p"); title.textContent = "Choisir l’ennemi à viser"; panel.appendChild(title)
    const finish = value => { overlay.remove(); combatTargetCancellation = null; resolve(value) }
    slots.forEach(slot => {
      const mob = window.__combatSnapshot[slot], button = document.createElement("button")
      button.textContent = mob.name.toUpperCase() + " — " + mob.hp + " / " + mob.maxHP + " PV"
      button.style.cssText = "display:block;margin:10px 0;padding:12px;width:100%;cursor:pointer;"
      button.onclick = () => finish(slot); panel.appendChild(button)
    })
    const cancel = document.createElement("button"); cancel.textContent = "Annuler"; cancel.onclick = () => finish(null); panel.appendChild(cancel)
    overlay.appendChild(panel); document.body.appendChild(overlay)
    combatTargetCancellation = () => finish(null)
  })
}

async function requestHeroCombatAction(attack, options = {}) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  if (window.__playerAttackResolving || window.__sessionBusy) return
  let actor = options.actorId || getCombatHUDPlayerId()
  if(actor==="greg"&&attack.name==="Le Bibi"&&window.__publicCharacters?.greg?.hp<=0&&window.__publicCharacters?.bibi?.hp>0)actor="bibi"
  if (!canAccessCharacter(actor)) return
  if (getCurrentCombatActorId() !== combatOwner(actor)) { showNotification("Ce n’est pas votre tour"); return }
  window.__playerAttackResolving = true
  try {
    const target = getPlayerAttackTypeKey(attack) === "heal"
      ? await chooseCombatTarget(COMBAT_CHARACTERS.filter(id => !document.getElementById(id)?.classList.contains("playerDead")), "Choisir le héros à soigner")
      : await chooseEnemyCombatTarget()
    if (!target) return
    await submitCombatAction("hero", actor, { attack: attack.name, special: !!options.isSpecial, target })
  } catch (error) { showNotification(error.message) }
  finally { window.__playerAttackResolving = false }
}

async function requestEnemyCombatAction(attack, mobData, panel, forcedTarget, slot) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  if (!isGM || window.__mobAttackResolving) return
  const actor = slot || panel?.dataset.slot || mobData.slot || "mob"
  window.__mobAttackResolving = true
  try { await submitCombatAction("enemy", actor, { attack: attack?.name || "", random: !attack, target: forcedTarget && forcedTarget !== "all" ? forcedTarget : (panel?._manualTarget || null) }) }
  catch (error) { showNotification(error.message) }
  finally { window.__mobAttackResolving = false }
}

async function requestAllyCombatAction(pnj, action, targetId, panel) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  const actor = getCombatHUDPlayerId() || getCurrentCombatActorId()
  if (!COMBAT_HEROES.includes(actor)) { showNotification("Les alliés interviennent pendant un tour de joueur"); return }
  if (getCurrentCombatActorId() !== actor) { showNotification("Ce n’est pas le tour de cet acteur"); return }
  if (window.__playerAttackResolving) return
  window.__playerAttackResolving = true
  try {
    let target = targetId
    if (action.type === "damage" || action.type === "malus") target = await chooseEnemyCombatTarget()
    if (!target) return
    await submitCombatAction("ally", actor, { pnjId: pnj.id, actionId: action.id, target })
    panel?.remove()
  } catch (error) { showNotification(error.message) }
  finally { window.__playerAttackResolving = false }
}

function calculateCombatMob(mobName, tier, partyLevel) {
  const base = mobStats[mobName]?.baseHP || 10
  const chosenTier = tier || mobStats[mobName]?.tier || "weak"
  let bonus = 0
  for (let level = 2; level <= partyLevel; level++) bonus += level >= 15 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : 1
  let effective = partyLevel + bonus * .42
  if (chosenTier === "boss" && effective > 10) effective = 10 + (effective - 10) * .65
  const hp = Math.min(50000, Math.round(base * ({ weak: 1.3, medium: 2, high: 3.4, boss: 6.1 }[chosenTier] || 1.3) * Math.pow(1 + effective * ({ weak: .15, medium: .22, high: .30, boss: .41 }[chosenTier] || .15), 1.72)))
  return { name: mobName, hp, maxHP: hp, lvl: Math.max(1, partyLevel + ({ weak: -1, medium: 1, high: 3, boss: 8 }[chosenTier] || 0)), tier: chosenTier }
}

async function launchReliableCombat(mainMob, forceTier, extraMobs) {
  if (!isGM || window.__authRole !== "gm" || combatStarting || window.__sessionBusy) return
  if (!mobStats[mainMob] || extraMobs.some(name => !mobStats[name])) return
  combatStarting = true
  const id = db.ref("combatRequests").push().key, now = Date.now(), width = window.innerWidth, height = window.innerHeight
  try {
    const result = await transactCombatRoot(current => {
      if (!current || current.sessionControl?.phase || (current.combat?.mob && current.combat.phase !== "finished")) return undefined
      const root = combatClone(current), level = Math.max(1, Math.round(COMBAT_HEROES.reduce((sum, hero) => sum + combatInt(root.characters?.[hero]?.lvl, 1), 0) / 3))
      const tier = forceTier || mobStats[mainMob].tier
      root.game ||= {}; root.tokens ||= {}
      const returnTokens = combatClone(root.tokens)
      root.combat = { id, phase: "active", createdAt: now, mob: calculateCombatMob(mainMob, tier, level), presentation: { positions: {} } }
      extraMobs.slice(0, 2).forEach((mob, index) => { root.combat["mob" + (index + 2)] = { ...calculateCombatMob(mob, null, level), slot: "mob" + (index + 2) } })
      COMBAT_CHARACTERS.forEach((hero, index) => {
        const position = { x: Math.max(40, Math.round((width - 440) / 2)) + index * 110, y: Math.round(height * .65), facing: 0 }
        root.tokens[hero] = {...root.tokens[hero],...position}; root.combat.presentation.positions[hero] = position
      })
      COMBAT_MOBS.forEach((slot, index) => {
        if (!root.combat[slot]) return
        const position = { x: Math.max(80, Math.round(width * .4)) + index * 140, y: Math.round(height * .25), facing: 0 }
        Object.assign(root.combat[slot], position)
        root.tokens[slot === "mob" ? "mobToken" : "mobToken_" + slot] = position
        root.combat.presentation.positions[slot === "mob" ? "mobToken" : "mobToken_" + slot] = position
      })
      root.combat.turnState = { phase: "rolling", round: 1, sequence: 0, currentIndex: 0, currentActorId: "", participants: combatParticipants(root), rolls: {}, order: [] }
      root.game.combatState = { active: true, id, mainMob, tier, extraMobs: extraMobs.slice(0, 2), returnMap: root.game.map || currentMap || "taverne.jpg", returnTokens, returnAudio:root.game.mapAudio||null, time: now }
      delete root.game.combatOutcome
      ;["storyImage", "storyImage2", "storyImage3", "highPNJName"].forEach(key => delete root.game[key])
      return root
    })
    if (!result.committed) throw new Error("Un combat est déjà actif ou la partie est en synchronisation")
    currentMob = mainMob; combatActive = true
    _state.pendingExtraMobs = {}; extraMobs.slice(0, 2).forEach((mob, index) => { _state.pendingExtraMobs["mob" + (index + 2)] = mob })
    COMBAT_MOBS.forEach(slot => { activeMobSlots[slot] = !!result.snapshot.child("combat/" + slot).val() })
    document.querySelectorAll(".gmSection").forEach(section => { section.style.display = "none" })
    window.__localCombatId=id; window.__completedCombatExitId=null
    setGameState("COMBAT"); combatSequence(mainMob, forceTier)
    setTimeout(() => { combatStarting = false }, 8000)
  } catch (error) { combatStarting = false; combatActive = false; showNotification("Combat non démarré : " + error.message) }
}

async function finishReliableCombat(combatId){
 if(window.__authRole!=="gm"||!combatId)return
 return transactCombatRoot(current=>{
 if(!current?.combat||current.combat.id!==combatId||current.combat.phase!=="finished"||current.sessionControl?.phase)return undefined
 const root=combatClone(current)
 const type=root.game.combatOutcome?.combatId===combatId?root.game.combatOutcome.type:(!livingHeroes(root).length?"defeat":"victory")
 const outcome=sealCombatOutcome(root,type)
 root.game.map=outcome.returnMap;root.tokens=combatClone(outcome.returnTokens)
 root.game.mapAudio=outcome.returnAudio||null
 root.game.combatOutcome.returnedAt=Date.now()
 delete root.combat;delete root.game.combatState;delete root.game.playerAllyAccess;delete root.game.mobAttackEvent
 return root
 })
}


async function requestPlayerThuumAction(word) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  const actor = myToken?.id
  if (!actor || window.__playerAttackResolving) return
  window.__playerAttackResolving = true
  try {
    const target = await chooseEnemyCombatTarget()
    if (target) await submitCombatAction("thuum", actor, { word, target })
    closePlayerPowersPanel()
  } catch (error) { showNotification(error.message) }
  finally { window.__playerAttackResolving = false }
}

function applyFreeDiceConsequences(player, max, roll) {
  if (!canAccessCharacter(player) || !COMBAT_CHARACTERS.includes(player)) return
  const stat = roll === 1 ? "curse" : roll === max ? "corruption" : null
  if (stat) return db.ref("characters/"+player+"/"+stat).transaction(value=>Math.min(stat==="curse"?8:10,combatInt(value)+1)).catch(error=>showNotification("Jet non enregistré : "+error.message))
}

async function addReliableCombatMob(name, tier) {
  if (!isGM || window.__sessionBusy || !mobStats[name]) return
  const seed=Math.floor(Math.random()*4294967296)
  try { await transactCombatRoot(current=>{
    if(!current?.combat || current.combat.phase==="finished")return undefined
    const slot=COMBAT_MOBS.find(s=>!current.combat[s] || combatInt(current.combat[s].hp)<=0)
    if(!slot) return undefined
    const root=combatClone(current), level=Math.max(1,Math.round(COMBAT_HEROES.reduce((sum,id)=>sum+combatInt(root.characters[id].lvl,1),0)/3))
    root.combat[slot]={...calculateCombatMob(name,tier,level),slot,x:600+COMBAT_MOBS.indexOf(slot)*100,y:180}
    const entry={id:slot,type:"mob",label:name.toUpperCase(),image:name+".png"},ts=root.combat.turnState
    if(ts){
      ts.participants=(ts.participants||[]).filter(p=>p.id!==slot);ts.participants.push(entry)
      if(ts.phase==="active"){
        const actor=ts.currentActorId,roll=combatRandom(seed)(12)
        ts.rolls ||= {};ts.rolls[slot]=roll
        ts.order=(ts.order||[]).filter(p=>p.id!==slot);ts.order.push({...entry,roll,index:ts.order.length})
        ts.order.sort((a,b)=>b.roll-a.roll||(a.type===b.type?a.index-b.index:a.type==="player"?-1:1))
        ts.currentIndex=Math.max(0,ts.order.findIndex(p=>p.id===actor))
      }
    }
    return root
  }) }catch(error){showNotification(error.message)}
}

async function removeReliableCombatMob(slot) {
  if(!isGM || !COMBAT_MOBS.includes(slot))return
  try {await transactCombatRoot(current=>{
    if(!current?.combat?.[slot] || current.combat.phase==="finished")return undefined
    const root=combatClone(current),request={id:"remove-"+slot,time:Date.now()}
    root.combat[slot].hp=0
    if(!combatOutcome(root,request) && root.combat.turnState?.currentActorId===slot)nextCombatTurn(root,request)
    return root
  })}catch(error){showNotification(error.message)}
}

document.addEventListener("DOMContentLoaded", () => {
  syncCombatCoordinator()
  db.ref("combat").on("value", snapshot => {
    if (window.__sessionBusy) return
    const data = snapshot.val(); window.__combatSnapshot = data || null
    if (!data) return
    window.__combatTurnState = data.turnState || null
    window.__playerCombatSpecialsUsed = data.playerSpecials || {}; window.__playerCombatFlags = data.playerFlags || {}
    observeCombatPresentation(data)
    if (combatActive) {
      COMBAT_MOBS.forEach(slot => {
        activeMobSlots[slot] = !!data[slot]
        const tokenId=slot==="mob"?"mobToken":"mobToken_"+slot
        let token=document.getElementById(tokenId)
        if(slot!=="mob"&&data[slot]&&!token){spawnExtraMobToken(data[slot],slot);token=document.getElementById(tokenId)}
        if(token && data[slot]){
          token.style.display=combatInt(data[slot].hp)>0?"flex":"none"
          const position=slot==="mob"?null:data[slot]
          if(position && selected?.id!==tokenId && Number.isFinite(position.x)){token.style.left=position.x+"px";token.style.top=position.y+"px"}
        }
      })
      renderAllMobPanels(); updateThuumButton()
      if(data.phase==="finished"&&window.__pendingCombatOutcome)observeCombatEnding(window.__pendingCombatOutcome)
    }
  })
})

async function requestManualCombatOutcome(type) {
  if(!isGM || !["victory","defeat"].includes(type) || window.__sessionBusy)return
  try{await transactCombatRoot(current=>{
    if(!current?.combat || current.combat.phase==="finished")return undefined
    const root=combatClone(current)
    sealCombatOutcome(root,type,{time:Date.now()});root.game.combatOutcome.manual=true
    if(type==="victory"){
      root.game.defeatedMobs ||= {}
      COMBAT_MOBS.forEach(slot=>{if(root.combat[slot])root.game.defeatedMobs[root.combat[slot].name]=true})
    }
    return root
  })}catch(error){showNotification("Fin de combat non confirmée : "+error.message)}
}
