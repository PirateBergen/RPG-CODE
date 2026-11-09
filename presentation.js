"use strict"

// Chaque écran déroule les mêmes événements ; aucune animation ne modifie la partie.
const sharedVisualQueue = []
const sharedVisualSeen = new Set()
let sharedVisualRunning = false
let sharedVisualTimer = null

function enqueueSharedVisual(id, play, duration = 0, priority = 1) {
  if (!id || sharedVisualSeen.has(id)) return false
  sharedVisualSeen.add(id)
  sharedVisualQueue.push({ id, play, duration, priority })
  if (!sharedVisualRunning && !sharedVisualTimer) sharedVisualTimer = setTimeout(drainSharedVisuals, 80)
  return true
}

function drainSharedVisuals() {
  sharedVisualTimer = null
  if (sharedVisualRunning || !sharedVisualQueue.length) return
  const introDelay = Math.max(0, (window.__combatIntroUntil || 0) - Date.now())
  if (introDelay) { sharedVisualTimer = setTimeout(drainSharedVisuals, introDelay); return }
  // Les annonces de tour/sortie viennent après les résultats reçus au même instant.
  sharedVisualQueue.sort((a,b) => a.priority - b.priority)
  const next = sharedVisualQueue.shift()
  sharedVisualRunning = true
  window.__sharedVisualBusy = true
  if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()
  try { next.play() } catch (error) { console.error("Animation partagée", error) }
  setTimeout(() => {
    sharedVisualRunning = false
    window.__sharedVisualBusy = false
    if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()
    drainSharedVisuals()
  }, next.duration)
}

function showDiceAnimation(player, dice, result, rawRoll) {
  return enqueueSharedVisual("dice-local-" + (window.__localDiceVisualId=(window.__localDiceVisualId||0)+1),
    () => _showDiceAnimationNow(player,dice,result,rawRoll), 4500)
}

function presentSharedDice(id, data) {
  const dice=Number(data?.dice), result=Number(data?.result), raw=data?.rawRoll == null ? result : Number(data.rawRoll)
  if (!Number.isInteger(dice) || ![4,6,8,10,12,20,100].includes(dice) || !Number.isInteger(raw) || raw<1 || raw>dice || !Number.isInteger(result) || !data.player) return false
  if (!Number.isFinite(data.time) || data.time < (window.__pageLoadTime || 0)) return false
  return enqueueSharedVisual("dice-"+id, () => _showDiceAnimationNow(data.player,dice,result,raw,{eventId:"free-"+id}),4500)
}

function presentCombatResolution(action) {
  if (!action?.id || !action.result || action.time < (window.__pageLoadTime || 0)) return
  const result=action.result
  const isAlly=result.mode==="ally"
  const duration=isAlly?14000:Number.isFinite(result.roll)?(result.special?9000:6000):result.mode==="enemy"?(result.special?7000:3400):2000
  if(action.nextTurn?.phase==="active"&&!result.skipTurnBanner)sharedVisualSeen.add("turn-"+action.combatId+"-"+(action.nextTurn.sequence||0))
  enqueueSharedVisual("combat-"+action.id,()=>{
    if(isAlly){
      const pnj=ALLY_PNJS.find(p=>p.id===result.pnjId),def=pnj?.actions.find(a=>a.id===result.actionId)
      if(pnj&&def) _allyInvocationCinematic(pnj,result.thorVictory?{...def,dialogue:result.message}:def,result.target,()=>{
        _showDiceAnimationNow(pnj.name,result.dice,result.roll,undefined,{crit:result.crit,fail:result.fail,eventId:action.id})
        setTimeout(()=>_playAllyAnim(def.type,pnj.color,result.crit),2400)
      })
    } else {
      if(Number.isFinite(result.roll)) _showDiceAnimationNow(result.actor?.startsWith("mob")?"MOB":result.actor||"MJ",result.dice||20,result.roll,undefined,{crit:result.crit,fail:result.fail,eventId:action.id})
      const impact=()=>{
        if(result.pikaKind){presentPikaAttack(result);return}
        if(result.mode==="damage" || result.mode==="heal"){
          const attack=typeof getCombatHeroAttack==="function"?getCombatHeroAttack(result.actor,result.attack,result.special):(result.special?getPlayerSpecialAttack(result.actor):(attacks[result.actor]||[]).find(a=>a.name===result.attack))
          if(attack)showPlayerAttackImpact(result.actor,attack,{mode:result.mode,amount:result.amount,targetName:result.targetName||result.target},{special:result.special,crit:result.crit,fail:result.fail})
        } else if(result.mode==="enemy" && result.presentation)showMobAttackPresentation(result.presentation)
        else if(result.mode==="thuum")playThuumCastEffect({playerId:result.actor,word:result.word})
        else if(result.message)showNotification(result.message)
      }
      if(Number.isFinite(result.roll))setTimeout(impact,2400);else impact()
    }
    if(action.nextTurn?.phase==="active"&&!result.skipTurnBanner)setTimeout(()=>{if(window.__pendingCombatOutcome?.combatId!==action.combatId)_showCombatTurnBanner(action.nextTurn)},duration)
  },duration+(action.nextTurn?.phase==="active"&&!result.skipTurnBanner?2800:0))
}

function queueCombatTurnBanner(combatId,state) {
  if(!state || state.phase!=="active")return
  const add=()=>enqueueSharedVisual("turn-"+combatId+"-"+(state.sequence||0),()=>{if(window.__pendingCombatOutcome?.combatId!==combatId)_showCombatTurnBanner(state)},2800,state.sequence>0?2:0.5)
  if(state.sequence>0)setTimeout(add,100);else add()
}

function queueCombatOutcome(type) {
  if(window.__pendingCombatOutcome&&typeof observeCombatEnding==="function"){observeCombatEnding(window.__pendingCombatOutcome);return}
  if(window.__combatOutcomeShowing || window.__combatOutcomeQueued)return
  window.__combatOutcomeQueued=true
  const id=window.__combatSnapshot?.id||"legacy"
  enqueueSharedVisual("outcome-"+id+"-"+type,()=>{
    window.__combatOutcomeQueued=false
    if(type==="victory")_showVictoryNow();else _showDefeatNow()
  },type==="victory"?7400:5600,3)
}

function showVictory(){queueCombatOutcome("victory")}
function showDefeat(){queueCombatOutcome("defeat")}

function observeCombatPresentation(data) {
    Object.values(data.visualEvents||{}).sort((a,b)=>a.time-b.time).forEach(presentCombatResolution)
    const ts=data.turnState
    const previousRolls=window.__seenInitiativeRolls?.[data.id]||{}
    window.__seenInitiativeRolls ||= {};window.__seenInitiativeRolls[data.id]={...(ts?.rolls||{})}
    Object.entries(ts?.rolls||{}).forEach(([actor,roll])=>{
      const key="initiative-"+data.id+"-"+actor
      if(previousRolls[actor]==null && (ts?.phase==="rolling" || data.createdAt >= (window.__pageLoadTime||0))){
        if(Number.isInteger(roll))enqueueSharedVisual(key,()=>_showDiceAnimationNow(actor.startsWith("mob")?"MOB":actor,12,roll),4500,0)
      }
    })

}
