"use strict"

let combatCoordinatorRef = null
let combatCoordinatorCallback = null
let combatCoordinatorQueue = Promise.resolve()
let combatTargetCancellation = null
let combatTargetRefresh = null
let lastCombatPresentationId = null
window.__combatSnapshot = null

async function transactCombatRoot(update) {
  if(typeof reliableRootTransaction==="function")return reliableRootTransaction(update)
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
  if (window.__authRole !== "gm" || (typeof requireActionConnection==="function"&&!window.__actionOnline)) return
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

async function submitCombatAction(kind,actor,payload={}){
 requireActionAccess()
 if(!window.__combatSnapshot?.id)throw Error("Attendez la synchronisation du combat")
 if(Array.isArray(payload.decision?.targets))payload={...payload,decision:{...payload.decision,targetsSpecified:true}}
 return submitReliableAction("combatRequests",{actor,kind,payload:{...payload,version:1},combatId:window.__combatSnapshot.id,sequence:combatInt(getCombatTurnState()?.sequence)})
}

function chooseEnemyCombatTarget(attack=null,actor=null,special=false) {
  const slots = livingMobs(window.__combatSnapshot)
  if (!slots.length) return Promise.resolve(null)
  const combatId=window.__combatSnapshot?.id,previousFocus=document.activeElement
  const allowed=slot=>combatTargetEligibility(attack,actor,special,slot).allowed
  if (slots.length === 1) {if(!allowed(slots[0])){showNotification(combatTargetEligibility(attack,actor,special,slots[0]).reason);return Promise.resolve(null)}return Promise.resolve(slots[0])}
  if (combatTargetCancellation) combatTargetCancellation()
  return new Promise(resolve => {
    const overlay = document.createElement("div"); overlay.id = "combatEnemyTargetPicker"
    overlay.style.cssText = "position:fixed;inset:0;z-index:2000000000;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;"
    const panel = document.createElement("div"); panel.className="combatTargetPickerPanel";panel.style.cssText = "padding:24px;background:#19100c;border:1px solid #cda761;border-radius:12px;color:#ffe4ac;font:18px Georgia;"
    const title = document.createElement("p"); title.textContent = "Choisir la cible"+(attack?.name?" — "+attack.name:""); panel.appendChild(title)
    const hint=document.createElement("p");hint.className="combatTargetPickerHint";hint.textContent="Choisir une cible lance l’action. Annuler ne consomme aucune action.";panel.appendChild(hint)
    let done=false;const finish=value=>{if(done)return;done=true;overlay.remove();combatTargetCancellation=null;combatTargetRefresh=null;if(previousFocus?.isConnected)previousFocus.focus?.();resolve(value)}
    const choices=[]
    slots.forEach(slot => {
      const mob = window.__combatSnapshot[slot], button = document.createElement("button")
      button.dataset.combatTarget=slot;choices.push([slot,button])
      button.style.cssText = "display:block;margin:10px 0;padding:12px;width:100%;cursor:pointer;"
      button.onclick=()=>{if(allowed(slot))finish(slot);else combatTargetRefresh?.()}; panel.appendChild(button)
    })
    const cancel = document.createElement("button"); cancel.textContent = "Annuler"; cancel.onclick = () => finish(null); panel.appendChild(cancel)
    overlay.appendChild(panel); document.body.appendChild(overlay)
    combatTargetCancellation = () => finish(null)
    combatTargetRefresh=()=>{if(!combatActive||window.__combatSnapshot?.id!==combatId||window.__combatSnapshot?.phase==="finished"||(actor&&window.__combatSnapshot?.turnState?.currentActorId!==combatOwner(actor))){finish(null);return}for(const [slot,button]of choices){const mob=window.__combatSnapshot?.[slot],value=combatTargetEligibility(attack,actor,special,slot);button.disabled=!value.allowed;button.textContent=combatEnemyLabel(slot)+" — "+(mob?.hp||0)+" / "+(mob?.maxHP||0)+" PV"+(value.reason?" — "+value.reason:"");button.title=value.reason}}
    panel.setAttribute("role","dialog");panel.setAttribute("aria-label",title.textContent)
    combatTargetRefresh();choices.find(([,b])=>!b.disabled)?.[1].focus();refreshCombatHUDContext()
  })
}

async function requestHeroCombatAction(attack, options = {}) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  if (window.__playerAttackResolving) return
  let actor = options.actorId || getCombatHUDPlayerId()
  if(actor==="greg"&&attack.name==="Le Bibi"&&window.__publicCharacters?.greg?.hp<=0&&window.__publicCharacters?.bibi?.hp>0)actor="bibi"
  try{requireActionAccess({actor});requireCombatActorTurn(actor)}catch(error){showNotification(error.message);return}
  window.__playerAttackResolving = true
  refreshCombatActionStates()
  try {
    const target = getPlayerAttackTypeKey(attack) === "heal"
      ? await chooseCombatTarget(COMBAT_CHARACTERS, "Choisir le héros à soigner — "+attack.name)
      : await chooseEnemyCombatTarget(attack,actor,!!options.isSpecial)
    if (!target) return
    refreshCombatActionStates()
    await submitCombatAction("hero", actor, { attack: attack.name, special: !!options.isSpecial, target })
  } catch (error) { showNotification(error.message) }
  finally { window.__playerAttackResolving = false;refreshCombatActionStates() }
}

async function requestEnemyCombatAction(attack, mobData, panel, forcedTarget, slot) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  if (!isGM || window.__mobAttackResolving) return
  const actor = slot || panel?.dataset.slot || mobData.slot || "mob"
  window.__mobAttackResolving = true
  refreshCombatActionStates()
  try { requireActionAccess({gmOnly:true});await submitCombatAction("enemy", actor, { attack: attack?.name || "", random: !attack, target: forcedTarget && forcedTarget !== "all" ? forcedTarget : (panel?._manualTarget || null) }) }
  catch (error) { showNotification(error.message) }
  finally { window.__mobAttackResolving = false;refreshCombatActionStates() }
}

async function requestAllyCombatAction(pnj, action, targetId, panel) {
  if(window.__sharedVisualBusy || Date.now()<(window.__combatIntroUntil||0)){showNotification("Attendez la fin de l’animation.");return}
  const actor = getCombatHUDPlayerId() || getCurrentCombatActorId()
  if (!COMBAT_HEROES.includes(actor)) { showNotification("Les alliés interviennent pendant un tour de joueur"); return }
  try{requireActionAccess({actor});requireCombatActorTurn(actor)}catch(error){showNotification(error.message);return}
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

function calculateCombatMob(mobName,tier,partyLevel,enemyCount=1){return balancedCombatMob(mobName,tier,partyLevel,enemyCount)}

async function launchReliableCombat(mainMob, forceTier, extraMobs) {
  if (!isGM || window.__authRole !== "gm" || combatStarting || window.__sessionBusy) return
  if (!mobStats[mainMob] || extraMobs.some(name => !mobStats[name])) return
  combatStarting = true
  const id = db.ref("combatRequests").push().key, now = Date.now(), width = window.innerWidth, height = window.innerHeight
  try {
    const result = await transactCombatRoot(current => {
      if (!current || current.sessionControl?.phase || (current.combat?.mob && current.combat.phase !== "finished")) return undefined
      if([mainMob,...extraMobs].includes("jormungand")&&!isForchurMap(current.game?.map))throw Error("Jörmungandr ne peut être affronté que sur le Forchur, à Brume.")
      const root = combatClone(current), level = Math.max(1, Math.round(COMBAT_HEROES.reduce((sum, hero) => sum + combatInt(root.characters?.[hero]?.lvl, 1), 0) / 3))
      const tier = WORLD_BOSS_NAMES.includes(mainMob)?"boss":forceTier || (CLASSIC_BOSS_NAMES.includes(mainMob)?"boss":mobStats[mainMob].tier)
      root.game ||= {}; root.tokens ||= {}
      const returnTokens = combatClone(root.tokens)
      root.combat = { id, phase: "active", createdAt: now, mob: calculateCombatMob(mainMob, tier, level,1+extraMobs.slice(0,2).length), presentation: { positions: {} } }
      extraMobs.slice(0, 2).forEach((mob, index) => { root.combat["mob" + (index + 2)] = { ...calculateCombatMob(mob, null, level,1+extraMobs.slice(0,2).length), slot: "mob" + (index + 2) } })
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
      for(const hero of COMBAT_HEROES)if(root.characters?.[hero]?.cursedEffect==="critOnly")root.characters[hero].cursedCombatId=id
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
    setGameState("COMBAT"); combatSequence(mainMob, result.snapshot.child("combat/mob/tier").val() || forceTier)
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
 for(const hero of COMBAT_CHARACTERS){const c=root.characters?.[hero];if(c?.cursedCombatId===combatId){delete c.cursedEffect;delete c.cursedCombatId}}
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
  if (!canAccessCharacter(player) || !COMBAT_HEROES.includes(player)) return
  const stat = roll === 1 ? "curse" : roll === max ? "corruption" : null
  if (stat) return db.ref("characters/"+player+"/"+stat).transaction(value=>Math.min(stat==="curse"?8:10,combatInt(value)+1)).catch(error=>showNotification("Jet non enregistré : "+error.message))
}

async function addReliableCombatMob(name, tier) {
  if (!isGM || window.__sessionBusy || !mobStats[name]) return
  const seed=Math.floor(Math.random()*4294967296)
  try { await transactCombatRoot(current=>{
    if(!current?.combat || current.combat.phase==="finished")return undefined
    if(name==="jormungand"&&!isForchurMap(current.game?.combatState?.returnMap||current.game?.map))throw Error("Jörmungandr ne peut être affronté que sur le Forchur.")
    const slot=COMBAT_MOBS.find(s=>!current.combat[s] || combatInt(current.combat[s].hp)<=0)
    if(!slot) return undefined
    const root=combatClone(current), level=Math.max(1,Math.round(COMBAT_HEROES.reduce((sum,id)=>sum+combatInt(root.characters[id].lvl,1),0)/3))
    root.combat[slot]={...calculateCombatMob(name,tier,level,COMBAT_MOBS.filter(s=>current.combat[s]?.hp>0).length+1),slot,x:600+COMBAT_MOBS.indexOf(slot)*100,y:180}
    const entry={id:slot,type:"mob",label:heroDisplayName(name).toUpperCase(),image:name+".png"},ts=root.combat.turnState
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
    if(isJormungandr(current.combat[slot]))throw Error("Jörmungandr est invincible. Utilisez Thor ou la fuite.")
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
    if(typeof renderWorldBossFlee==="function")renderWorldBossFlee(data)
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
      renderAllMobPanels(); updateThuumButton(); refreshCombatActionStates()

      if(data.phase==="finished"&&window.__pendingCombatOutcome)observeCombatEnding(window.__pendingCombatOutcome)
    }
  })
})

async function requestManualCombatOutcome(type) {
  if(!isGM || window.__sessionBusy)return
  if(type==="retreat"){showNotification("La fuite se résout avec un D12 : utilisez le bouton Fuite.");return}
  if(!["victory","defeat"].includes(type))return
  try{await transactCombatRoot(current=>{
    if(!current?.combat || current.combat.phase==="finished")return undefined
    const root=combatClone(current)
    sealCombatOutcome(root,type,{time:Date.now(),manual:true,uid:window.__authUid});root.game.combatOutcome.manual=true
    return root
  })}catch(error){showNotification("Fin de combat non confirmée : "+error.message)}
}

async function requestCombatPass(actor,enemy=false){if(enemy?!isGM:!canAccessCharacter(actor))return false;if(enemy?window.__mobAttackResolving:window.__playerAttackResolving)return false;const flag=enemy?"__mobAttackResolving":"__playerAttackResolving";window[flag]=true;refreshCombatActionStates();try{await submitCombatAction("pass",actor);return true}catch(error){showNotification("Action non confirmée : "+error.message);return false}finally{window[flag]=false;refreshCombatActionStates()}}

function clearWorldBossFleeUI(){
 closeWorldBossFleePicker()
 document.getElementById("worldBossFleePanel")?.remove()
 window.__fleePanelSignature=null
}
function closeWorldBossFleePicker(){const picker=document.getElementById("worldBossFleePicker");if(picker){picker.remove();window.GameWindows?.closed(picker)}}
function openWorldBossFleePicker(){
 if(!isGM)return
 const c=window.__combatSnapshot,availability=worldBossRetreatState({combat:c})
 if(!availability.allowed){showNotification(availability.reason);return}
 closeWorldBossFleePicker()
 const picker=document.createElement("div");picker.id="worldBossFleePicker";picker.setAttribute("role","dialog");picker.setAttribute("aria-label","Choisir le personnage pour la fuite");picker.className="worldBossFleeBox"
 const title=document.createElement("p");title.textContent="Qui tente la fuite ? Un 12 sur D12 est nécessaire.";picker.appendChild(title)
 for(const actor of livingHeroes({characters:window.__combatConditionCharacters||{}})){
  const button=document.createElement("button");button.type="button";button.textContent=heroDisplayName(actor);button.onclick=async()=>{button.disabled=true;try{await submitCombatAction("requestRetreat",actor);closeWorldBossFleePicker()}catch(error){button.disabled=false;showNotification(error.message)}};picker.appendChild(button)
 }
 const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Annuler";cancel.onclick=closeWorldBossFleePicker;picker.appendChild(cancel);document.body.appendChild(picker);window.GameWindows?.register(picker,closeWorldBossFleePicker)
}
function renderWorldBossFlee(c){
 const availability=worldBossRetreatState({combat:c})
 const button=document.getElementById("btnWorldBossFlee"),world=gameStarted&&gameState==="COMBAT"&&availability.worldBoss&&c.phase!=="finished",blocked=availability.blocked
 if(button){button.hidden=!isGM||!world;button.disabled=!availability.allowed;button.title=availability.reason;button.textContent=blocked?"⛵ Fuite · round "+c.retreatBlockedUntilRound:"⛵ FUITE · D12"}
 if(!world){clearWorldBossFleeUI();return}
 const pending=c.pendingRetreat,signature=JSON.stringify([c.id,pending?.id,pending?.actor,window.__authUid,isGM])
 if(!pending){document.getElementById("worldBossFleePanel")?.remove();window.__fleePanelSignature=null;return}
 if(signature===window.__fleePanelSignature&&document.getElementById("worldBossFleePanel"))return
 window.__fleePanelSignature=signature;document.getElementById("worldBossFleePanel")?.remove();closeWorldBossFleePicker()
 const panel=document.createElement("div");panel.id="worldBossFleePanel";panel.className="worldBossFleeBox";panel.setAttribute("aria-label","Tentative de fuite")
 const title=document.createElement("p");title.textContent=heroDisplayName(pending.actor)+" tente la fuite · 12 sur D12 requis";panel.appendChild(title)
 if(isGM||canAccessCharacter(pending.actor)){
  const roll=document.createElement("button");roll.type="button";roll.textContent="Lancer le D12 de fuite";roll.onclick=async()=>{roll.disabled=true;try{await submitCombatAction("rollRetreat",pending.actor,{pendingId:pending.id})}catch(error){roll.disabled=false;showNotification(error.message)}};panel.appendChild(roll)
 }
 if(isGM){const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Annuler avant le jet";cancel.onclick=()=>submitCombatAction("cancelRetreat",pending.actor,{pendingId:pending.id}).catch(error=>showNotification(error.message));panel.appendChild(cancel)}
 document.body.appendChild(panel)
}
