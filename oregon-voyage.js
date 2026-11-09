"use strict"

// A voyage lives inside its aurora event, so saves and expiry stay atomic.
function currentOregonVoyage(){
 const aurora=window.__explorationWorldEvents?.aurora
 return aurora?.active&&aurora.oregonVoyage?.active?aurora.oregonVoyage:null
}
function oregonVoyageMusicPriority(){return !!currentOregonVoyage()&&gameStarted&&["GAME","COMBAT"].includes(gameState)&&currentMap!=="bifrost.jpg"}
function isOregonShipView(){return oregonVoyageMusicPriority()&&gameState==="GAME"&&currentMap==="arbre.jpg"&&!combatActive}
let oregonMusicEvent=null,oregonShipDrag=null,oregonShipSaving=false
function ensureOregonVoyageMusic(){
 if(!oregonVoyageMusicPriority())return
 const event=window.__explorationWorldEvents.aurora
 let audio=document.getElementById("oregonVoyageMusic")
 if(!audio){audio=document.createElement("audio");audio.id="oregonVoyageMusic";audio.src="audio/"+mapMusic["bateau1.jpg"];audio.loop=true;document.body.appendChild(audio)}
 if(oregonMusicEvent!==event.time){
  const existing=[document.getElementById("musicA"),document.getElementById("musicB")].find(el=>el?.src?.endsWith(mapMusic["bateau1.jpg"]))
  audio.currentTime=existing?.currentTime||0;oregonMusicEvent=event.time
 }
 for(const id of ["musicA","musicB","auroraMusic"]){const other=document.getElementById(id);if(other){other.pause();other.volume=0}}
 setManagedAudioBaseVolume(audio,1,"music")
 if(audio.paused)audio.play().catch(()=>{})
}
function resumeCurrentExplorationMusic(){
 if(!gameStarted||window.__sessionBusy||oregonVoyageMusicPriority())return
 const custom=window.__explorationState?.mapAudio
 window.__sharedMapAudioSignature=null
 if(custom?.file&&(!custom.map||custom.map===currentMap))playSharedMapAudio(custom)
 else if(mapMusic[currentMap])crossfadeMusic(mapMusic[currentMap])
}
function syncOregonVoyage(){
 const priority=oregonVoyageMusicPriority(),wasPriority=oregonMusicEvent!==null
 if(priority)ensureOregonVoyageMusic()
 else{
  const audio=document.getElementById("oregonVoyageMusic");if(audio)audio.pause()
  oregonMusicEvent=null
  if(wasPriority&&gameStarted&&gameState==="GAME"&&currentMap!=="bifrost.jpg"&&!document.getElementById("auroraOverlay"))setTimeout(resumeCurrentExplorationMusic,0)
 }
 const visible=isOregonShipView();document.body.classList.toggle("oregonVoyageView",visible)
 let marker=document.getElementById("oregonVoyageShip")
 if(!visible){oregonShipDrag=null;if(marker)marker.hidden=true;return}
 const map=document.getElementById("map");if(!map)return
 if(!marker){
  marker=document.createElement("div");marker.id="oregonVoyageShip";marker.setAttribute("role","img");marker.setAttribute("aria-label","L’Oregon III en vol")
  const image=document.createElement("img");image.src="images/oregon-voyage-ship.png?v="+window.GAME_V;image.alt="";image.draggable=false;marker.appendChild(image);map.appendChild(marker)
  marker.addEventListener("pointerdown",event=>{
   if(event.button!==0||!isGM||oregonShipSaving)return
   try{requireActionAccess({gmOnly:true});requireExplorationConnection()}catch(error){showNotification(error.message);return}
   event.preventDefault();event.stopPropagation();oregonShipDrag=event.pointerId;marker.setPointerCapture?.(event.pointerId)
  })
  marker.addEventListener("pointermove",event=>{
   if(oregonShipDrag!==event.pointerId)return
   if(!isGM||!isOregonShipView()){oregonShipDrag=null;syncOregonVoyage();return}
   const rect=map.getBoundingClientRect(),scale=Number(cameraZoom)||1
   marker.style.left=Math.max(0,Math.min(map.offsetWidth,(event.clientX-rect.left)/scale))+"px"
   marker.style.top=Math.max(0,Math.min(map.offsetHeight,(event.clientY-rect.top)/scale))+"px"
  })
  marker.addEventListener("pointerup",async event=>{
   if(oregonShipDrag!==event.pointerId)return
   oregonShipDrag=null;oregonShipSaving=true
   try{await writeOregonShipPosition({x:parseFloat(marker.style.left),y:parseFloat(marker.style.top)})}catch(error){showNotification("Bateau non déplacé : "+error.message)}finally{oregonShipSaving=false;syncOregonVoyage()}
  })
  for(const type of ["pointercancel","lostpointercapture"])marker.addEventListener(type,()=>{if(oregonShipDrag!==null){oregonShipDrag=null;syncOregonVoyage()}})
 }
 marker.hidden=false;marker.style.pointerEvents=isGM?"auto":"none";marker.title=isGM?"Déplacer l’Oregon III":"L’Oregon III"
 if(oregonShipDrag!==null||oregonShipSaving)return
 const position=currentOregonVoyage()?.position
 marker.style.left=(Number.isFinite(position?.x)?position.x:map.offsetWidth*.62)+"px"
 marker.style.top=(Number.isFinite(position?.y)?position.y:map.offsetHeight/2)+"px"
}
async function writeOregonShipPosition(value){
 requireActionAccess({gmOnly:true});requireExplorationConnection()
 if(!isOregonShipView()||!Number.isFinite(value?.x)||!Number.isFinite(value?.y))throw Error("Le bateau se déplace sur l’Arbre Monde pendant le voyage.")
 const map=document.getElementById("map"),position={x:Math.max(0,Math.min(map.offsetWidth,value.x)),y:Math.max(0,Math.min(map.offsetHeight,value.y))},uid=window.__authUid,revision=persistenceRevision||"initial",eventTime=window.__explorationWorldEvents.aurora.time
 const result=await reliableRootTransaction(root=>{
  const aurora=root?.events?.aurora
  if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||root.game?.map!=="arbre.jpg"||root.game?.combatState?.active||!aurora?.active||aurora.time!==eventTime||!aurora.oregonVoyage?.active)return undefined
  aurora.oregonVoyage.position=position;return root
 })
 if(!result.committed)throw Error("Le voyage ou la carte a changé.")
}
