"use strict"

window.__explorationState={}
window.__tokenPositions={}
window.__explorationOnline=false
let explorationCoordinatorRef=null,explorationCoordinatorCb=null,explorationQueue=Promise.resolve()
const explorationPending=new Set()

function requireExplorationConnection(){
  if(!window.__explorationOnline)throw new Error("Connexion interrompue : attendez la reconnexion avant de réessayer.")
  if(window.__sessionBusy)throw new Error("La partie est en cours de synchronisation")
  if(window.__combatReturnInProgress||window.__combatOutcomeQueued||window.__combatOutcomeShowing||window.__combatSnapshot?.phase==="finished")throw new Error("Attendez le retour à la carte.")
}
function syncExplorationCoordinator(){
  if(explorationCoordinatorRef&&explorationCoordinatorCb)explorationCoordinatorRef.off("child_added",explorationCoordinatorCb)
  explorationCoordinatorRef=null;explorationCoordinatorCb=null
  if(window.__authRole!=="gm")return
  explorationCoordinatorRef=db.ref("explorationRequests")
  explorationCoordinatorCb=snap=>{
    if(snap.val()?.status!=="queued")return
    const id=snap.key,seed=Math.floor(Math.random()*4294967296)
    explorationQueue=explorationQueue.catch(()=>{}).then(()=>window.__authRole==="gm"?transactCombatRoot(root=>reduceExplorationRequest(root,id,seed)):null).catch(error=>showNotification("Action non confirmée : "+error.message))
  }
  explorationCoordinatorRef.on("child_added",explorationCoordinatorCb)
}
async function submitExplorationAction(kind,actor,payload={}){
 requireExplorationConnection();requireActionConnection()
 return submitReliableAction("explorationRequests",{actor,kind,payload:{...payload,version:1}})
}

async function requestExplorationAction(kind,actor,payload){
  if(explorationPending.has(kind))return
  explorationPending.add(kind)
  showNotification("En attente de confirmation du MJ…")
  try{return await submitExplorationAction(kind,actor,payload)}catch(error){showNotification(error.message)}finally{explorationPending.delete(kind)}
}
async function writeExplorationPosition(id,value,manual=false){
  requireExplorationConnection()
  if(!isGM&&!canAccessCharacter(id))throw new Error("Vous ne contrôlez pas ce pion")
  const position=explorationPosition(value)
  if(id==="bibi")await db.ref("tokens/bibi").transaction(current=>explorationBibiPosition(current,position,manual))
  else{
    await db.ref("tokens/"+id).update(position)
    if(id==="greg")await db.ref("tokens/bibi").transaction(current=>explorationBibiPosition(current,{...position,x:position.x+80},false))
  }
}
async function resumeBibiFollowing(){
  try{
    requireExplorationConnection()
    if(!isGM&&!canAccessCharacter("bibi"))return
    await db.ref("tokens/bibi").transaction(current=>({...current,followGreg:true}))
    showNotification("Bibi suit de nouveau Greg.")
  }catch(error){showNotification(error.message)}
}
function showMovementError(error,id){
  showNotification("Déplacement non enregistré : "+error.message)
  const position=window.__tokenPositions[id],token=document.getElementById(id)
  if(token&&position){token.style.left=position.x+"px";token.style.top=position.y+"px"}
}
function renderPersistentWantedPosters(data){
  let dock=document.getElementById("persistentWantedBoard")
  const posters=Object.values(data||{}).map(normalizeWantedPosterData).filter(Boolean)
  if(!gameStarted||!posters.length){dock?.remove();return}
  if(!dock){dock=document.createElement("aside");dock.id="persistentWantedBoard";dock.setAttribute("aria-label","Affiches recherchées");dock.style.cssText="position:fixed;right:12px;top:100px;width:148px;max-height:48vh;overflow-y:auto;z-index:6000;background:rgba(24,16,8,.88);padding:8px;border:1px solid #b58b48;border-radius:6px;color:#ffe0a0;pointer-events:auto;";document.body.appendChild(dock)}
  dock.replaceChildren()
  const title=document.createElement("div");title.textContent="WANTED · "+posters.length;title.style.cssText="text-align:center;font:13px Georgia;margin-bottom:6px";dock.appendChild(title)
  posters.forEach(p=>{const button=document.createElement("button");button.type="button";button.dataset.posterId=p.id;button.style.cssText="display:block;width:100%;margin:4px 0;padding:6px;color:#42230e;background:#ddc18a;border:1px solid #9b713b;cursor:pointer;font:12px Georgia";button.textContent=p.mob.toUpperCase()+" · "+p.reward+" po";button.onclick=()=>showWantedOverlay(p);dock.appendChild(button)})
}
async function removePersistentWanted(id){
  if(!isGM)return
  try{requireExplorationConnection();await transactCombatRoot(current=>{
    if(!current?.game?.wantedPosters?.[id])return undefined
    const root=combatClone(current);delete root.game.wantedPosters[id]
    if(root.game.wantedOpen?.poster?.id===id)delete root.game.wantedOpen
    if(root.elements?.[id]?.wantedData)delete root.elements[id]
    return root
  })}catch(error){showNotification("Affiche non retirée : "+error.message)}
}
function syncSharedExplorationState(game){
  Object.assign(window.__explorationState,game)
  if(!gameStarted||window.__sessionBusy)return
  renderPersistentWantedPosters(window.__explorationState.wantedPosters)
  refreshExplorationMapEvents()
  if(game.wantedPosters!==undefined){
    window.__wantedPostersData=game.wantedPosters||{}
    const list=document.getElementById("wantedList");if(list&&isGM){list.replaceChildren();Object.values(game.wantedPosters||{}).filter(Boolean).forEach(renderWantedPoster)}
    const board=document.getElementById("wantedBoardContent");if(board)buildWantedBoardContent(board,Object.values(game.wantedPosters||{}).filter(Boolean))
    const preview=document.getElementById("wantedOverlay");if(preview?.dataset.posterId&&!game.wantedPosters?.[preview.dataset.posterId])preview.remove()
  }
  if(Object.hasOwn(game,"wantedOpen")){
    const value=game.wantedOpen,signature=value?.poster?.id+":"+value?.time
    if(value?.poster && signature!==window.__wantedPresentedSignature){window.__wantedPresentedSignature=signature;showWantedOverlay(value.poster)}
    if(!value)document.getElementById("wantedOverlay")?.remove()
  }
  if(Object.hasOwn(game,"wantedBoardOpen")){if(game.wantedBoardOpen)openWantedBoard(true);else closeWantedBoard(true)}
  if(Object.hasOwn(game,"shop")){
    const value=game.shop,signature=JSON.stringify(value||null),wasOpen=!!document.getElementById("shopOverlay"),previousShop=window.__shopState;window.__shopState=value||{}
    const editor=document.getElementById("shopItemEditor");if(editor&&(!value?.open||editor.dataset.type!==shopTypeKey(value.type)))editor.remove()
    if(signature!==window.__sharedShopSignature){window.__sharedShopSignature=signature;document.getElementById("shopOverlay")?.remove();if(value?.open)renderShop(value.partyLvl||1,value.type,value,!wasOpen||previousShop?.type!==value.type||previousShop?.time!==value.time)}
  }
  if(Object.hasOwn(game,"document")){
    const signature=JSON.stringify(game.document||null)
    if(signature!==window.__sharedDocumentSignature){window.__sharedDocumentSignature=signature;_renderDocument(game.document)}
  }
  if(Object.hasOwn(game,"mapAudio"))playSharedMapAudio(game.mapAudio)
  if(Object.hasOwn(game,"mapLoreBook")){window.mapLoreBookData=game.mapLoreBook;updateMapLoreBookVisibility()}
}
function presentExplorationEvent(event){
  if(!event?.id||!event.result||event.time<(window.__pageLoadTime||0))return
  const result=event.result
  if(result.mode==="book")enqueueSharedVisual("explore-"+event.id,()=>presentMapLoreBookEvent(result.book,result.actor),1000)
  if(result.mode==="hint")enqueueSharedVisual("explore-"+event.id,()=>{playSound("parcheminSound",.7);flashGold();showNotification("Fragment runique découvert !")},1800)
  if(result.mode==="spell")enqueueSharedVisual("explore-"+event.id,()=>{
    _showDiceAnimationNow(result.actor,20,result.roll)
    setTimeout(()=>showSpellRollResult(result.roll,result.crit,result.fail,result.actor),2400)
  },6000)
}
function syncCemeteryPresentation(data){
  window.__cemeterySpellData=data
  if(!gameStarted||gameState!=="GAME")return
  if(!data){document.getElementById("spellMiniGame")?.remove();document.getElementById("glipheOverlay")?.remove();stopSpellAura();return}
  if(data.freed){
    if(data.time<(window.__pageLoadTime||0)){stopSpellAura();return}
    document.getElementById("spellMiniGame")?.remove();document.getElementById("glipheOverlay")?.remove()
    enqueueSharedVisual("cemetery-end-"+data.time,()=>{
      stopSpellAura()
      if(!data.failedByZombie)showSpellFreed()
      else showNotification("L’épreuve a échoué : des morts-vivants approchent.")
      if(isGM&&data.failedByZombie)setTimeout(async()=>{
        const current=(await db.ref("game/cemeterySpell").once("value")).val()
        if(!current||current.time!==data.time||current.combatLaunched||window.__sessionBusy)return
        await launchReliableCombat(data.encounter||"zombie","high",[])
        if(window.__combatSnapshot?.mob)db.ref("game/cemeterySpell/combatLaunched").set(true).catch(()=>{})
      },2000)
    },5500,3)
    return
  }
  if(!data.glipheShown){ensureCemeteryGlyphIntro();scheduleCemeteryOpening(data);return}
  document.getElementById("glipheOverlay")?.remove()
  startSpellAura();ensureCemeteryMusic();renderSpellDiceGame(data)
}
document.addEventListener("DOMContentLoaded",()=>{
  syncExplorationCoordinator()
  if(isGM)cleanupLegacyWantedElements().catch(error=>console.warn(error))
  db.ref(".info/connected").on("value",snap=>{window.__explorationOnline=!!snap.val();if(!snap.val()){selected=null;_state.tokenDragging=false;cameraDragging=false}})
  db.ref("tokens").on("value",snap=>{window.__tokenPositions=snap.val()||{}})
  for(const key of ["wantedPosters","wantedOpen","wantedBoardOpen","shop","document","mapLoreBook","mapAudio"])db.ref("game/"+key).on("value",snap=>syncSharedExplorationState({[key]:snap.val()}))
  db.ref("events").on("value",snap=>{window.__explorationWorldEvents=snap.val()||{};refreshExplorationMapEvents()})
  db.ref("game/explorationEvents").on("child_added",snap=>{if(!window.__sessionBusy)presentExplorationEvent(snap.val())})
  db.ref("game/runeVictory").on("value",snap=>{const e=snap.val();if(e?.id&&e.time>=(window.__pageLoadTime||0))enqueueSharedVisual("rune-victory-"+e.id,_showRuneVictoryNow,5200)})
  db.ref("game/cemeterySpell").on("value",snap=>{if(!window.__sessionBusy)syncCemeteryPresentation(snap.val())})
})

function tokenFollowLabel(data){const token=document.getElementById("bibi");if(token){const label=data.followGreg===false?"Bibi reste ici · cliquer pour suivre Greg":"Bibi suit Greg · déplacer pour la laisser ici";token.title=label;token.setAttribute("aria-label",label)}}

function requestMapRuneHint(elementId){const actor=myToken?.id||(isGM?"greg":null);if(actor)return requestExplorationAction("hint",actor,{elementId})}
const cemeteryOpenTimers=new Set()
function scheduleCemeteryOpening(data){
 if(!isGM||cemeteryOpenTimers.has(data.time))return
 cemeteryOpenTimers.add(data.time)
 setTimeout(async()=>{cemeteryOpenTimers.delete(data.time);if(window.__sessionBusy){scheduleCemeteryOpening(data);return}
 try{await transactCombatRoot(current=>{const spell=current?.game?.cemeterySpell;if(!spell||spell.time!==data.time||spell.glipheShown||spell.freed||current.game.combatState?.active)return undefined;const root=combatClone(current);Object.assign(root.game.cemeterySpell,{glipheShown:true,turnIdx:0,revision:0});return root})}catch(error){showNotification(error.message)}
 },Math.max(1000,10000-(Date.now()-data.time)))
}
function ensureCemeteryMusic(){let music=document.getElementById("sortPrisonMusic");if(!music){music=document.createElement("audio");music.id="sortPrisonMusic";music.src="audio/sortprison.mp3";music.loop=true;document.body.appendChild(music);setManagedAudioBaseVolume(music,.75,"music");music.play().catch(()=>{})}}

window.addEventListener("resize",()=>{calculateMinZoom();cameraZoom=minZoom;updateCamera()})

async function finishCemeteryByGM(){if(!isGM)return;try{await transactCombatRoot(current=>{if(!current?.game?.cemeterySpell?.active||current.game.cemeterySpell.freed)return undefined;const root=combatClone(current);root.game.cemeterySpell.freed=true;root.game.cemeterySpell.failedByZombie=false;root.game.completedEvents ||= {};root.game.completedEvents.cemetery=true;return root})}catch(error){showNotification(error.message)}}

function clearFlySwarmVisuals(){document.querySelectorAll(".fly-particle,#flySwarmOverlay,#flySwarmRings,#flySwarmGlow,#flySwarmFlash").forEach(el=>el.remove());document.getElementById("flySwarmSound")?.pause()}
function refreshExplorationMapEvents(){
 if(!gameStarted||window.__sessionBusy||!["GAME","COMBAT"].includes(gameState))return
 const events=window.__explorationWorldEvents||{}
 if(typeof scheduleAuroraExpiry==="function")scheduleAuroraExpiry(events.aurora)
 if(events.aurora?.active){if(!document.getElementById("auroraOverlay")||window.__auroraPresentedEvent!==events.aurora.time)showAuroraEvent(events.aurora)}
 else if(document.getElementById("auroraOverlay")&&!window.__auroraClosing){window.__auroraClosing=true;showAuroraEndSequence();setTimeout(()=>{window.__auroraClosing=false},8000)}
 if(events.flySwarm?.active){if(currentMap==="epouventail.jpg")showFlySwarmEffect();else clearFlySwarmVisuals()}
 else if(document.getElementById("flySwarmOverlay")&&!window.__fliesClosing){window.__fliesClosing=true;resetFlySwarmPresentation();setTimeout(()=>{window.__fliesClosing=false},9000)}
}
function playSharedMapAudio(data){
 if(!data?.file){window.__sharedMapAudioSignature=null;return}
 if(!gameStarted||window.__sessionBusy||(data.map||window.__latestMapValue)!==currentMap)return
 const signature=(data.time||0)+":"+data.file
 if(signature===window.__sharedMapAudioSignature)return
 window.__sharedMapAudioSignature=signature
 const map=currentMap,file=/\.(mp3|wav|ogg|m4a)([?#]|$)/i.test(data.file)?data.file:data.file+".mp3"
 setTimeout(()=>{if(currentMap!==map||window.__sharedMapAudioSignature!==signature||window.__sessionBusy)return
 _musicTransitioning=false;_pendingMusic=null;stopAllMusic()
 setTimeout(()=>{if(currentMap!==map||window.__sharedMapAudioSignature!==signature)return;crossfadeMusic(typeof resolveAudioPath==="function"?resolveAudioPath(file):"audio/"+file);_state._pendingMapAudio=false},300)
 },1400)
}
