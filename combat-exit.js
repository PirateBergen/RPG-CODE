"use strict"

let combatCompletionRefs=[]
let combatCompletionTimer=null
let combatCompletionPending=false
let combatCompletionDirty=false
const combatReturnTimers=new Map()
window.__pendingCombatOutcome=null
window.__combatReturnInProgress=false

function syncCombatExitCoordinator(){
  combatCompletionRefs.forEach(([ref,cb])=>ref.off("value",cb));combatCompletionRefs=[]
  clearTimeout(combatCompletionTimer);combatCompletionTimer=null
  for(const timer of combatReturnTimers.values())clearTimeout(timer);combatReturnTimers.clear()
  if(window.__authRole!=="gm")return
  const schedule=()=>{combatCompletionDirty=true;clearTimeout(combatCompletionTimer);combatCompletionTimer=setTimeout(checkCombatCompletion,40)}
  for(const branch of ["characters","combat","game/combatOutcome"]){const ref=db.ref(branch),cb=snap=>{schedule();if(branch==="game/combatOutcome")scheduleAuthoritativeReturn(snap.val())};ref.on("value",cb);combatCompletionRefs.push([ref,cb])}
}
async function checkCombatCompletion(){
  if(window.__authRole!=="gm"||window.__sessionBusy)return
  if(combatCompletionPending){combatCompletionDirty=true;return}
  combatCompletionDirty=false;combatCompletionPending=true
  try{await transactCombatRoot(current=>{
    if(!current?.combat?.id||current.combat.phase==="finished"||current.sessionControl?.phase||!COMBAT_HEROES.every(id=>current.characters?.[id]))return undefined
    if(livingHeroes(current).length&&livingMobs(current.combat).length)return undefined
    const root=combatClone(current);combatOutcome(root,{time:Date.now()});return root
  })}catch(error){console.error("Fin automatique du combat",error)}finally{combatCompletionPending=false;if(combatCompletionDirty)combatCompletionTimer=setTimeout(checkCombatCompletion,40)}
}
function observeCombatEnding(data){
  if(!data?.combatId||!["victory","defeat","retreat"].includes(data.type))return
  window.__pendingCombatOutcome=data
  if(!data.returnMap||!data.returnTokens)return
  if(!gameStarted||window.__sessionBusy)return
  const localId=window.__localCombatId||window.__combatSnapshot?.id
  const wasHere=localId===data.combatId&&(combatActive||gameState==="COMBAT"||window.__combatOutcomeQueued||window.__combatOutcomeShowing)
  if(data.returnedAt&&!wasHere)return
  if(localId&&localId!==data.combatId&&combatActive)return
  if(window.__completedCombatExitId===data.combatId)return
  if(data.finalAction)presentCombatResolution(data.finalAction)
  const frozen=combatClone(data)
  const added=enqueueSharedVisual("outcome-"+data.combatId+"-"+data.type,()=>{
    if(window.__localCombatId&&window.__localCombatId!==data.combatId&&combatActive)return
    window.__combatOutcomeQueued=false;window.__renderedCombatOutcome=frozen
    if(data.type==="victory")_showVictoryNow(frozen);else if(data.type==="retreat")showCombatRetreat(frozen);else _showDefeatNow(frozen)
  },data.type==="victory"?8100:data.type==="retreat"?3100:6100,3)
  if(added){window.__combatOutcomeQueued=true;window.__queuedCombatOutcomeId=data.combatId}
}
function completeCombatReturn(outcome){
  const data=outcome||window.__renderedCombatOutcome||window.__pendingCombatOutcome
  if(data?.combatId&&window.__localCombatId&&data.combatId!==window.__localCombatId&&combatActive)return
  if(typeof cancelSharedVisuals==="function")cancelSharedVisuals()
  cancelCombatRetreatPresentation()
  if(typeof clearWorldBossFleeUI==="function")clearWorldBossFleeUI()
  window.__combatReturnInProgress=true
  if(isGM&&data?.combatId)finishReliableCombat(data.combatId).catch(error=>showNotification("Retour affiché ; synchronisation à confirmer : "+error.message))
  endCombat({force:true,skipFinish:true})
  returnToMap(data)
  window.__pendingLocalDefeat=false
  window.__combatOutcomeShowing=false;window.__combatOutcomeQueued=false
  if(data?.combatId)window.__completedCombatExitId=data.combatId
}
function restoreCombatMap(data){
  const map=document.getElementById("map"),target=data?.returnMap||currentMap||"taverne.jpg"
  currentMap=target
  if(map)map.style.backgroundImage="url('images/"+target+"')"
  const apply=tokens=>Object.entries(tokens||{}).forEach(([id,p])=>{
    const token=document.getElementById(id);if(!token||!Number.isFinite(p.x)||!Number.isFinite(p.y))return
    token.style.left=p.x+"px";token.style.top=p.y+"px";token.classList.toggle("faceLeft",p.facing===1)
  })
  if(data?.returnTokens)apply(data.returnTokens)
  else db.ref("tokens").once("value").then(snap=>apply(snap.val()))
  calculateMinZoom();cameraZoom=minZoom;updateCamera()
  if(typeof syncSharedExplorationState==="function"){
    window.__sharedShopSignature=null;window.__sharedDocumentSignature=null
    syncSharedExplorationState(window.__explorationState||{})
    syncCemeteryPresentation(window.__cemeterySpellData||null)
  }
  if(data?.returnAudio){window.__sharedMapAudioSignature=null;playSharedMapAudio(data.returnAudio)}
  else if(mapMusic[target])crossfadeMusic(mapMusic[target])
  updateWorldMapFogTopLeft();updateThuumButton()
}
function suspendExplorationForCombat(){
  for(const id of ["mapLoreBookOverlay","runeChallengeOverlay","spellMiniGame","glipheOverlay","shopOverlay","shopItemEditor","documentOverlay","wantedBoardOverlay","wantedOverlay"])document.getElementById(id)?.remove()
  if(typeof stopSpellAura==="function")stopSpellAura()
  document.getElementById("sortPrisonMusic")?.pause()
}
document.addEventListener("DOMContentLoaded",()=>{
  syncCombatExitCoordinator()
  db.ref("game/combatOutcome").on("value",snap=>{
    const data=snap.val();if(!data){window.__pendingCombatOutcome=null;return}observeCombatEnding(data)
  })
})

function scheduleAuthoritativeReturn(outcome){
 if(!outcome?.combatId||outcome.returnedAt||combatReturnTimers.has(outcome.combatId))return
 const id=outcome.combatId
 const timer=setTimeout(async()=>{combatReturnTimers.delete(id)
 if(window.__authRole!=="gm")return
 if(window.__sessionBusy){scheduleAuthoritativeReturn({...outcome,time:Date.now()-7000});return}
 try{await finishReliableCombat(id)}catch(error){showNotification("Retour à synchroniser : "+error.message)}
 },Math.max(1000,(outcome.time||Date.now())+8000-Date.now()))
 combatReturnTimers.set(id,timer)
}

let combatRetreatTimer=null
function cancelCombatRetreatPresentation(){
 clearTimeout(combatRetreatTimer);combatRetreatTimer=null
 document.getElementById("combatRetreatOverlay")?.remove()
}
function showCombatRetreat(outcome){
 cancelCombatRetreatPresentation()
 window.__combatOutcomeShowing=true
 const veil=document.createElement("div");veil.id="combatRetreatOverlay";veil.className="combatRetreatOverlay"
 veil.textContent=outcome.returnMap==="bateau.jpg"?"Le Forchur échappe au combat…":"Le groupe parvient à s’échapper…"
 document.body.appendChild(veil)
 combatRetreatTimer=setTimeout(()=>{
   combatRetreatTimer=null;veil.remove()
   if(window.__sessionBusy||(window.__localCombatId&&window.__localCombatId!==outcome.combatId))return
   completeCombatReturn(outcome)
 },2800)
}
