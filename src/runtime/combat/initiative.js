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
  if(typeof isKingIntroPending==="function"&&isKingIntroPending())return false
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

