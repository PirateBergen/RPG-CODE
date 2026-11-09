"use strict"

// Chaque écran déroule les mêmes événements ; aucune animation ne modifie la partie.
const sharedVisualQueue = []
const sharedVisualSeen = new Set()
let sharedVisualRunning = false
let sharedVisualTimer = null
let sharedVisualEpoch = 0
const sharedVisualDelays = new Set()
function sharedVisualLater(fn,delay){const epoch=sharedVisualEpoch,timer=setTimeout(()=>{sharedVisualDelays.delete(timer);if(epoch===sharedVisualEpoch)fn()},delay);sharedVisualDelays.add(timer);return timer}
function cancelSharedVisuals(){
 sharedVisualEpoch++;clearTimeout(sharedVisualTimer);sharedVisualTimer=null
 for(const timer of sharedVisualDelays)clearTimeout(timer);sharedVisualDelays.clear();sharedVisualQueue.length=0
 sharedVisualRunning=false;window.__sharedVisualBusy=false;window.__combatOutcomeQueued=false
 for(const key of ["__cancelDicePresentation","__cancelAllyPresentation","__cancelAllyEffect"])window[key]?.()
 if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()
}
function createPresentationScope(key,onCleanup=()=>{}){
 window[key]?.();const timers=new Set(),intervals=new Set(),nodes=new Set(),sounds=new Set();let cancelled=false
 const cleanup=()=>{if(cancelled)return;cancelled=true;for(const t of timers)clearTimeout(t);for(const t of intervals)clearInterval(t);for(const n of nodes)n.remove();for(const a of sounds){a.pause();a.currentTime=0}onCleanup();if(window[key]===cleanup)window[key]=null}
 window[key]=cleanup
 return {cancel:cleanup,later(fn,ms){const t=setTimeout(()=>{timers.delete(t);if(!cancelled)fn()},ms);timers.add(t);return t},every(fn,ms){const t=setInterval(()=>{if(!cancelled)fn()},ms);intervals.add(t);return t},node(n){nodes.add(n);return n},audio(a){sounds.add(a);return a}}
}

function enqueueSharedVisual(id, play, duration = 0, priority = 1) {
  if (!id || sharedVisualSeen.has(id)) return false
  sharedVisualSeen.add(id)
  if(sharedVisualSeen.size>2000)sharedVisualSeen.delete(sharedVisualSeen.values().next().value)
  sharedVisualQueue.push({ id, play, duration, priority })
  if (!sharedVisualRunning && !sharedVisualTimer) sharedVisualTimer = sharedVisualLater(drainSharedVisuals, 80)
  return true
}

function drainSharedVisuals() {
  sharedVisualTimer = null
  if (sharedVisualRunning || !sharedVisualQueue.length) return
  const introDelay = Math.max(0, (window.__combatIntroUntil || 0) - Date.now())
  if (introDelay) { sharedVisualTimer = sharedVisualLater(drainSharedVisuals, introDelay); return }
  // Les annonces de tour/sortie viennent après les résultats reçus au même instant.
  sharedVisualQueue.sort((a,b) => a.priority - b.priority)
  const next = sharedVisualQueue.shift()
  sharedVisualRunning = true
  window.__sharedVisualBusy = true
  if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()
  const epoch=sharedVisualEpoch
  try { next.play() } catch (error) { console.error("Animation partagée", error) }
  if(epoch!==sharedVisualEpoch)return
  sharedVisualLater(() => {
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
        sharedVisualLater(()=>_playAllyAnim(def.type,pnj.color,result.crit),2400)
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
      if(Number.isFinite(result.roll))sharedVisualLater(impact,2400);else impact()
    }
    if(action.nextTurn?.phase==="active"&&!result.skipTurnBanner)sharedVisualLater(()=>{if(window.__pendingCombatOutcome?.combatId!==action.combatId)_showCombatTurnBanner(action.nextTurn)},duration)
  },duration+(action.nextTurn?.phase==="active"&&!result.skipTurnBanner?2800:0))
}

function queueCombatTurnBanner(combatId,state) {
  if(!state || state.phase!=="active")return
  const add=()=>enqueueSharedVisual("turn-"+combatId+"-"+(state.sequence||0),()=>{if(window.__pendingCombatOutcome?.combatId!==combatId)_showCombatTurnBanner(state)},2800,state.sequence>0?2:0.5)
  if(state.sequence>0)sharedVisualLater(add,100);else add()
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

function playOregonBombardment(pnj,action,targetId,onComplete){
 window.__cancelOregonBombardment?.()
 const nodes=new Set(),timers=new Set(),sounds=new Set(),combatId=window.__combatSnapshot?.id;let cancelled=false
 const cleanup=()=>{cancelled=true;for(const timer of timers)clearTimeout(timer);for(const node of nodes)node.remove();for(const audio of sounds){audio.pause();audio.currentTime=0}if(window.__cancelOregonBombardment===cleanup)window.__cancelOregonBombardment=null}
 window.__cancelOregonBombardment=cleanup
 const later=(fn,delay)=>{const timer=setTimeout(()=>{timers.delete(timer);if(cancelled)return;if(combatId&&window.__combatSnapshot?.id!==combatId){cleanup();return}fn()},delay);timers.add(timer)}
 const sound=(file,volume)=>{const audio=new Audio("audio/"+file);sounds.add(audio);setManagedAudioBaseVolume(audio,volume,"effects");audio.play().catch(()=>{});audio.addEventListener("ended",()=>sounds.delete(audio),{once:true})}
 const overlay=document.createElement("div");overlay.className="oregonBombardmentOverlay";overlay.setAttribute("role","status");overlay.setAttribute("aria-label","Les troupes de Mélenchon bombardent la cible depuis l’Oregon III");document.body.appendChild(overlay);nodes.add(overlay)
 const title=document.createElement("div");title.className="oregonBombardmentTitle";title.textContent="LES TROUPES DE MÉLENCHON — FEU !";overlay.appendChild(title)
 const ship=document.createElement("img");ship.className="oregonBombardmentShip";ship.src="images/oregon-voyage-ship.png?v="+window.GAME_V;ship.alt="L’Oregon III survole le combat";overlay.appendChild(ship)
 sound("generalmelenchon.mp3",.7)
 const token=document.getElementById(targetId==="mob"?"mobToken":"mobToken_"+targetId),rect=token?.getBoundingClientRect(),x=rect?.width?rect.left+rect.width/2:innerWidth*.68,y=rect?.height?rect.top+rect.height/2:innerHeight*.58
 for(let i=0;i<3;i++)later(()=>{
  const bomb=document.createElement("div"),fromX=innerWidth*(.28+i*.14),fromY=innerHeight*.29;bomb.className="oregonBomb";bomb.textContent="💣";bomb.style.left=fromX+"px";bomb.style.top=fromY+"px";bomb.style.setProperty("--bomb-dx",(x-fromX+(i-1)*18)+"px");bomb.style.setProperty("--bomb-dy",(y-fromY)+"px");overlay.appendChild(bomb)
  later(()=>{bomb.remove();const blast=document.createElement("div");blast.className="endikaki-blast oregonBombBlast";blast.textContent="💥";blast.style.left=(x+(i-1)*18)+"px";blast.style.top=y+"px";overlay.appendChild(blast);sound("bombe.mp3",.28);if(typeof screenShake==="function")screenShake();later(()=>blast.remove(),900)},850)
 },1300+i*550)
 later(()=>{cleanup();if(typeof onComplete==="function")onComplete()},5200)
 return cleanup
}
