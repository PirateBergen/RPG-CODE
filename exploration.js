"use strict"

window.__explorationState={}
window.__tokenPositions={}
window.__explorationOnline=false
let explorationCoordinatorRef=null,explorationCoordinatorCb=null,explorationQueue=Promise.resolve()
const explorationPending=new Set()


// The world marker has its own coordinates; individual tokens remain untouched.
function isWorldPartyMap(){return String(currentMap).toLowerCase()==="mapmonde.jpg"}
let worldPartyDrag=null,worldPartySaving=false
function syncWorldPartyMarker(){
 if(typeof syncSummonedAllies==="function")syncSummonedAllies()
 if(typeof renderBalrogSwordLoot==="function")renderBalrogSwordLoot()
 syncForchurFog()
 document.body.classList.toggle("brumePrison",gameStarted&&gameState==="GAME"&&!combatActive&&currentMap==="prisonbrume.jpg")
 const visible=gameStarted&&gameState==="GAME"&&!combatActive&&isWorldPartyMap()
 document.body.classList.toggle("worldPartyView",visible)
 let marker=document.getElementById("worldPartyMarker")
 if(!visible){worldPartyDrag=null;if(marker)marker.hidden=true;return}
 const map=document.getElementById("map");if(!map)return
 if(!marker){
  marker=document.createElement("div");marker.id="worldPartyMarker";marker.setAttribute("role","img");marker.setAttribute("aria-label","Position du groupe")
  const image=document.createElement("img");image.src="images/world-party-marker.png?v="+window.GAME_V;image.alt="";image.draggable=false;marker.appendChild(image);map.appendChild(marker)
  marker.addEventListener("pointerdown",event=>{
   if(event.button!==0||worldPartySaving||!isGM)return
   try{requireActionAccess({gmOnly:true});requireExplorationConnection()}catch(error){showNotification(error.message);return}
   event.preventDefault();event.stopPropagation();worldPartyDrag={id:event.pointerId,map:currentMap};marker.setPointerCapture?.(event.pointerId)
  })
  marker.addEventListener("pointermove",event=>{
   if(!worldPartyDrag||worldPartyDrag.id!==event.pointerId)return
   if(!isGM||!isWorldPartyMap()||gameState!=="GAME"){worldPartyDrag=null;syncWorldPartyMarker();return}
   const rect=map.getBoundingClientRect(),scale=Number(cameraZoom)||1
   marker.style.left=Math.max(0,Math.min(map.offsetWidth,(event.clientX-rect.left)/scale))+"px"
   marker.style.top=Math.max(0,Math.min(map.offsetHeight,(event.clientY-rect.top)/scale))+"px"
  })
  marker.addEventListener("pointerup",async event=>{
   if(!worldPartyDrag||worldPartyDrag.id!==event.pointerId)return
   worldPartyDrag=null;worldPartySaving=true
   try{await writeWorldPartyPosition({x:parseFloat(marker.style.left),y:parseFloat(marker.style.top)})}catch(error){showNotification("Repère non enregistré : "+error.message)}finally{worldPartySaving=false;syncWorldPartyMarker()}
  })
  for(const type of ["pointercancel","lostpointercapture"])marker.addEventListener(type,()=>{if(worldPartyDrag){worldPartyDrag=null;syncWorldPartyMarker()}})
 }
 marker.hidden=false;marker.style.pointerEvents=isGM?"auto":"none";marker.title=isGM?"Déplacer le repère du groupe":"Position du groupe"
 if(worldPartyDrag||worldPartySaving)return
 const position=window.__explorationState.worldPartyPosition
 marker.style.left=(Number.isFinite(position?.x)?position.x:map.offsetWidth/2)+"px"
 marker.style.top=(Number.isFinite(position?.y)?position.y:map.offsetHeight/2)+"px"
}
async function writeWorldPartyPosition(value){
 requireActionAccess({gmOnly:true});requireExplorationConnection()
 if(!isWorldPartyMap()||gameState!=="GAME"||combatActive)throw Error("Le repère se déplace sur la carte du monde uniquement.")
 if(!Number.isFinite(value?.x)||!Number.isFinite(value?.y))throw Error("Position invalide")
 const map=document.getElementById("map"),position={x:Math.max(0,Math.min(map.offsetWidth,value.x)),y:Math.max(0,Math.min(map.offsetHeight,value.y))},uid=window.__authUid,revision=persistenceRevision||"initial"
 const result=await reliableRootTransaction(root=>{
  if(root?.roles?.[uid]!=="gm"||String(root?.game?.map).toLowerCase()!=="mapmonde.jpg"||(root?.sessionControl?.revision||"initial")!==revision||root?.sessionControl?.phase||root?.combat?.active||root?.game?.combatState?.active) return undefined
  root.game.worldPartyPosition=position;return root
 })
 if(!result.committed)throw Error("La scène a changé. Réessayez sur la carte du monde.")
 window.__explorationState.worldPartyPosition=position;syncWorldPartyMarker()
}



function partyHasLantern(characters){
 return ["greg","ju","elo","bibi"].some(id=>String(characters?.[id]?.inventaire||"").split(/\r?\n/).some(line=>{
  const name=line.split(/[—;]/)[0].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  if(!/\blanternes?\b/.test(name)||/\b(?:sans|aucune?|pas de)\b.*\blanterne/.test(name))return false
  const quantity=line.toLowerCase().replace(/\([^)]*\)/g," ").match(/(?:^|\s)[x×]\s*(\d+(?:[.,]\d+)?)(?=\s|$)/i)
  return !quantity||Number(quantity[1].replace(",","."))>0
 }))
}
let nightLightingTimer,nightLightingBusy=false,nightLightingDirty=false
function queueNightLightingSync(){
 if(window.__authRole!=="gm"||!window.__explorationState.nightMode?.enabled){clearTimeout(nightLightingTimer);nightLightingDirty=false;return}
 nightLightingDirty=true;clearTimeout(nightLightingTimer)
 nightLightingTimer=setTimeout(syncPartyNightLighting,120)
}
async function syncPartyNightLighting(){
 if(nightLightingBusy)return
 if(window.__authRole!=="gm"||!window.__explorationOnline||window.__sessionBusy||!window.__explorationState.nightMode?.enabled)return
 nightLightingBusy=true;nightLightingDirty=false
 try{
  const uid=window.__authUid,revision=persistenceRevision||"initial"
  await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||!root.game?.nightMode?.enabled)return undefined
   const lit=partyHasLantern(root.characters);if(root.game.nightMode.groupLantern===lit)return undefined
   root.game.nightMode.groupLantern=lit;return root
  })
 }catch(error){console.warn("Éclairage nocturne non confirmé",error.message)}finally{nightLightingBusy=false;if(nightLightingDirty)queueNightLightingSync()}
}
async function toggleNightInterior(){
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  const uid=window.__authUid,revision=persistenceRevision||"initial"
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision)return undefined
   root.game||={};root.game.nightMode={...root.game.nightMode,indoors:root.game.nightMode?.indoors!==true,groupLantern:partyHasLantern(root.characters)};return root
  })
  if(!result.committed)throw Error("La partie a changé. Réessayez.")
 }catch(error){showNotification("Éclairage intérieur non enregistré : "+error.message)}
}

let nightModeSignature,nightNoticeTimer
function syncNightMode(){
 const state=window.__explorationState.nightMode,enabled=state?.enabled===true,visible=gameStarted&&["GAME","COMBAT"].includes(gameState),signature=state?.id||null,changed=nightModeSignature!==undefined&&signature!==nightModeSignature
 nightModeSignature=signature
 let filter=document.getElementById("nightMapFilter")
 const map=document.getElementById("map")
 if(!filter&&map){filter=document.createElement("div");filter.id="nightMapFilter";filter.setAttribute("aria-hidden","true");map.appendChild(filter)}
 const indoors=state?.indoors===true||(typeof isAntreSoulScene==="function"&&isAntreSoulScene()),lit=state?.groupLantern===true
 if(filter)filter.classList.toggle("active",visible&&enabled&&!indoors)
 let darkness=document.getElementById("nightDarknessFilter")
 if(!darkness&&map){darkness=document.createElement("div");darkness.id="nightDarknessFilter";darkness.setAttribute("aria-hidden","true");map.appendChild(darkness)}
 if(darkness)darkness.classList.toggle("active",visible&&enabled&&!indoors&&!lit)
 syncForestNightPaths(visible&&enabled&&!indoors&&!lit&&gameState==="GAME"&&!combatActive&&String(currentMap).toLowerCase()==="foret.jpg")
 const action=document.getElementById("nightToggleAction");if(action)action.textContent=enabled?"Faire revenir le jour":"Faire tomber la nuit"
 const interior=document.getElementById("nightInteriorAction");if(interior){interior.textContent=indoors?"Extérieur : rétablir les effets de nuit":"Intérieur : masquer les effets de nuit";interior.setAttribute("aria-pressed",String(indoors))}
 const status=document.getElementById("nightModeStatus");if(status)status.textContent=(enabled?"Nuit":"Jour")+" · "+(indoors?"Intérieur":lit?"Extérieur · lanterne dans le groupe":"Extérieur · sans lanterne")
 const button=document.getElementById("nightModeBtn")
 if(button){button.setAttribute("aria-pressed",String(enabled));button.title="Jour et nuit — "+(enabled?"nuit active":"jour actif");button.setAttribute("aria-label",button.title);button.textContent=enabled?"☀":"🌙"}
 if(!visible){clearTimeout(nightNoticeTimer);document.getElementById("nightTransitionNotice")?.remove();return}
 if(!changed||!state?.id||state.time<(window.__pageLoadTime||0))return
 clearTimeout(nightNoticeTimer);document.getElementById("nightTransitionNotice")?.remove()
 const notice=document.createElement("div");notice.id="nightTransitionNotice";notice.setAttribute("role","status")
 const symbol=document.createElement("span");symbol.textContent=enabled?"☾":"☀";const text=document.createElement("span");text.textContent=enabled?"La nuit tombe…":"Le jour se lève…";notice.append(symbol,text);document.body.appendChild(notice)
 nightNoticeTimer=setTimeout(()=>notice.remove(),4500)
}
async function toggleNightMode(){
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  const uid=window.__authUid,revision=persistenceRevision||"initial",id=db.ref("game").push().key,time=Date.now()
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision)return undefined
   root.game||={};root.game.nightMode={...root.game.nightMode,enabled:root.game.nightMode?.enabled!==true,groupLantern:partyHasLantern(root.characters),id,time};return root
  })
  if(!result.committed)throw Error("La partie a changé. Réessayez.")
 }catch(error){showNotification("Changement d’ambiance non enregistré : "+error.message)}
}

function requireExplorationConnection(){
  requireActionAccess()
  if(!window.__explorationOnline)throw new Error("Action non envoyée : connexion perdue. Attendez la reconnexion avant de réessayer.")
  if(window.__combatReturnInProgress||window.__combatOutcomeQueued||window.__combatOutcomeShowing||window.__combatSnapshot?.phase==="finished")throw new Error("Attendez le retour à la carte.")
}
function syncExplorationCoordinator(){
  if(explorationCoordinatorRef&&explorationCoordinatorCb)explorationCoordinatorRef.off("child_added",explorationCoordinatorCb)
  explorationCoordinatorRef=null;explorationCoordinatorCb=null
  if(window.__authRole!=="gm")return
  queueNightLightingSync()
  explorationCoordinatorRef=db.ref("explorationRequests")
  explorationCoordinatorCb=snap=>{
    if(snap.val()?.status!=="queued")return
    const id=snap.key,seed=Math.floor(Math.random()*4294967296)
    explorationQueue=explorationQueue.catch(()=>{}).then(()=>window.__authRole==="gm"?transactCombatRoot(root=>reduceExplorationRequest(root,id,seed)):null).catch(error=>showNotification("Action non confirmée : "+error.message))
  }
  explorationCoordinatorRef.on("child_added",explorationCoordinatorCb)
}
async function submitExplorationAction(kind,actor,payload={}){
 requireExplorationConnection()
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
  if(typeof isOregonShipView==="function"&&isOregonShipView()&&["greg","ju","elo","bibi"].includes(id))throw Error("Le MJ déplace le bateau pendant le voyage de l’Oregon III.")
  if(isWorldPartyMap()&&["greg","ju","elo","bibi"].includes(id))throw new Error("Sur la carte du monde, le MJ déplace le repère du groupe.")
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
  if(Object.hasOwn(game,"allyDiscoveries")&&typeof syncAllyDiscoveries==="function")syncAllyDiscoveries()
  syncWorldPartyMarker()
  syncNightMode()
  if(Object.hasOwn(game,"nightMode"))queueNightLightingSync()
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
  if(result.mode==="summon")enqueueSharedVisual("explore-"+event.id,()=>presentExplorationSummon(result),14000)
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
  db.ref(".info/connected").on("value",snap=>{window.__explorationOnline=!!snap.val();if(snap.val())queueNightLightingSync();if(!snap.val()){selected=null;_state.tokenDragging=false;cameraDragging=false}})
  db.ref("tokens").on("value",snap=>{window.__tokenPositions=snap.val()||{};if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()})
  for(const key of ["wantedPosters","wantedOpen","wantedBoardOpen","shop","document","mapLoreBook","mapAudio","worldPartyPosition","nightMode","allyDiscoveries","forchurFog"])db.ref("game/"+key).on("value",snap=>syncSharedExplorationState({[key]:snap.val()}))
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
 if(typeof syncOregonVoyage==="function")syncOregonVoyage()
 if(typeof scheduleAuroraExpiry==="function")scheduleAuroraExpiry(events.aurora)
 if(events.aurora?.active){if(!document.getElementById("auroraOverlay")||window.__auroraPresentedEvent!==events.aurora.time)showAuroraEvent(events.aurora)}
 else if(document.getElementById("auroraOverlay")&&!window.__auroraClosing){window.__auroraClosing=true;showAuroraEndSequence();setTimeout(()=>{window.__auroraClosing=false},8000)}
 if(events.flySwarm?.active){if(currentMap==="epouventail.jpg")showFlySwarmEffect();else clearFlySwarmVisuals()}
 else if(document.getElementById("flySwarmOverlay")&&!window.__fliesClosing){window.__fliesClosing=true;resetFlySwarmPresentation();setTimeout(()=>{window.__fliesClosing=false},9000)}
}
function playSharedMapAudio(data){
 if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
 if(!data?.file){window.__sharedMapAudioSignature=null;return}
 if(!gameStarted||window.__sessionBusy||(data.map||window.__latestMapValue)!==currentMap)return
 const signature=(data.time||0)+":"+data.file
 if(signature===window.__sharedMapAudioSignature)return
 window.__sharedMapAudioSignature=signature
 const map=currentMap,file=/\.(mp3|wav|ogg|m4a)([?#]|$)/i.test(data.file)?data.file:data.file+".mp3"
 setTimeout(()=>{if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority())return;if(currentMap!==map||window.__sharedMapAudioSignature!==signature||window.__sessionBusy)return
 _musicTransitioning=false;_pendingMusic=null;stopAllMusic()
 setTimeout(()=>{if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority())return;if(currentMap!==map||window.__sharedMapAudioSignature!==signature)return;crossfadeMusic(typeof resolveAudioPath==="function"?resolveAudioPath(file):"audio/"+file);_state._pendingMapAudio=false},300)
 },1400)
}

function syncForestNightPaths(visible){
 let svg=document.getElementById("forestNightPaths")
 if(!visible){if(svg)svg.setAttribute("hidden","");return}
 const map=document.getElementById("map");if(!map)return
 if(!svg){
  const ns="http://www.w3.org/2000/svg";svg=document.createElementNS(ns,"svg");svg.id="forestNightPaths";svg.setAttribute("viewBox","0 0 1000 1000");svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("aria-hidden","true");svg.setAttribute("focusable","false")
  const routes=[[[450,900],[400,700],[210,600],[140,280]],[[500,900],[580,650],[400,440],[520,120]],[[550,900],[680,720],[880,520],[880,280]]],colors=["#8cbad3","#c79bd1","#87c6ae","#d5bc82","#91a1d6","#d69ca9"]
  routes.forEach((points,index)=>{const group=document.createElementNS(ns,"g");group.classList.add("forestLightPath");group.dataset.path=String(index+1);svg.appendChild(group)
   for(let i=0;i<30;i++){const t=i/29,u=1-t,x=u*u*u*points[0][0]+3*u*u*t*points[1][0]+3*u*t*t*points[2][0]+t*t*t*points[3][0],y=u*u*u*points[0][1]+3*u*u*t*points[1][1]+3*u*t*t*points[2][1]+t*t*t*points[3][1],dot=document.createElementNS(ns,"g"),color=colors[(i+index*2)%colors.length];dot.classList.add("forestPathLight");dot.style.animationDelay=(-((i*7+index*11)%29)/10)+"s"
    for(const [radius,opacity]of [[5,.10],[2,.66]]){const circle=document.createElementNS(ns,"circle");circle.setAttribute("cx",x.toFixed(2));circle.setAttribute("cy",y.toFixed(2));circle.setAttribute("r",String(radius));circle.setAttribute("fill",color);circle.setAttribute("opacity",String(opacity));dot.appendChild(circle)}group.appendChild(dot)
   }
  });map.appendChild(svg)
 }
 svg.removeAttribute("hidden")
}

function syncForchurFog(){
 const eligible=gameStarted&&gameState==="GAME"&&!combatActive&&String(currentMap).toLowerCase()==="bateau.jpg"&&!!window.__defeatedMobFlags?.jormungand,active=eligible&&window.__explorationState?.forchurFog?.active===true
 const button=document.getElementById("forchurFogBtn");if(button){button.hidden=!(eligible&&isGM);button.setAttribute("aria-pressed",String(active));button.title=active?"Dissiper la brume":"Faire apparaître la brume";button.setAttribute("aria-label",button.title)}
 let fog=document.getElementById("forchurDenseFog");if(!fog&&active){fog=document.createElement("div");fog.id="forchurDenseFog";fog.setAttribute("aria-hidden","true");document.body.appendChild(fog)}
 if(fog){fog.hidden=!active;fog.classList.toggle("active",active)}document.body.classList.toggle("forchurDenseFogActive",active)
}
async function toggleForchurFog(){
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!gameStarted||gameState!=="GAME"||combatActive)throw Error("La brume se déclenche hors combat, sur le Forchur.")
  const uid=window.__authUid,revision=persistenceRevision||"initial",expected=window.__explorationState?.forchurFog?.active===true
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||root.game?.map!=="bateau.jpg"||!root.game?.defeatedMobs?.jormungand||root.game?.combatState?.active||root.combat?.phase==="active"||!!root.game?.forchurFog?.active!==expected)return undefined
   root.game.forchurFog={active:!expected};return root
  })
  if(!result.committed)throw Error("Le Forchur ou l’état de la partie a changé.")
 }catch(error){showNotification(error.message)}
}
