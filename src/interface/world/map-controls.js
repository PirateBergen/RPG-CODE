"use strict"

// Déplacements des pions, navigation dans la carte et changement de carte du MJ.
// Les règles et écritures partagées restent dans exploration.js et exploration-core.js.

async function changeMap(mapName,customAudio){
 if(!isGM)return
 try{
 requireExplorationConnection();_musicTransitioning=false;_pendingMusic=null
 if(musicFadeInterval){clearInterval(musicFadeInterval);musicFadeInterval=null}
 _state._pendingMapAudio=!!customAudio
 await writeExplorationMap(mapName,{map:mapName,forchurFog:null,mapAudio:customAudio?{file:customAudio,map:mapName,time:Date.now()}:null})
 maybeSpawnMapLoreBook(mapName)
 document.querySelectorAll(".gmSection").forEach(sec=>{sec.style.display="none"})
 }catch(error){showNotification("Carte non changée : "+error.message)}
}

/* ========================= */
/* DRAG TOKENS               */
/* ========================= */

document.querySelectorAll(".token").forEach(token=>{
  token.addEventListener("dblclick",e=>{if(isGM||canAccessCharacter(token.id)){e.preventDefault();openCharacterSheet(token.id)}})
  token.addEventListener("contextmenu",e=>{e.preventDefault();if(isGM||canAccessCharacter(token.id))openCharacterSheet(token.id)})
  token.addEventListener("mousedown",e=>{
    if(e.button!==0||e.target.closest("button")||e.target.closest("#playerSelect"))return
    if(!isGM&&!canAccessCharacter(token.id))return
    try{requireExplorationConnection()}catch(error){showNotification(error.message);return}
    if(token.classList.contains("playerDead")){showNotification("Ce personnage est KO.");return}
    const pointer={x:e.clientX,y:e.clientY,tokenId:token.id,moved:false}
    _state.tokenDragStart=pointer;_state.tokenDragging=false
    const rect=token.getBoundingClientRect(),scale=cameraZoom||1
    const select=()=>{if(_state.tokenDragStart!==pointer)return;selected=token;lastX=token.offsetLeft;_dragOffsetX=(e.clientX-rect.left)/scale;_dragOffsetY=(e.clientY-rect.top)/scale;lastSentX=NaN;lastSentY=NaN}
    if(token.id==="mobToken"||token.id.startsWith("mobToken_")||token.id==="eloSummonToken")select()
    else readCharacter(token.id,snap=>{if(_state.tokenDragStart!==pointer)return;if(isCharacterOverweight(token.id,snap.val()||{}).overweight){showNotification("Ce personnage est surchargé.");return}select()})
    e.preventDefault()
  })
})
function persistDraggedToken(token,position){
  if(token.id==="eloSummonToken")return db.ref("combat/eloSummon").update(position)
  if(token._fbSlot)return db.ref("combat/"+token._fbSlot).update(position)
  return writeExplorationPosition(token.id,position,token.id==="bibi")
}
document.addEventListener("mousemove",e=>{
  if(!selected||!window.__explorationOnline)return
  if(!isGM&&!canAccessCharacter(selected.id)&&!(selected.id==="eloSummonToken"&&myToken?.id==="elo"))return
  const origin=_state.tokenDragStart
  if(origin&&!origin.moved&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<4)return
  if(origin)origin.moved=true
  _state.tokenDragging=true
  const rect=document.getElementById("map").getBoundingClientRect(),scale=cameraZoom||1
  const x=(e.clientX-rect.left)/scale-_dragOffsetX,y=(e.clientY-rect.top)/scale-_dragOffsetY
  const gx=Math.round(x/grid)*grid,gy=Math.round(y/grid)*grid
  if(gx<lastX)selected.classList.add("faceLeft");else if(gx>lastX)selected.classList.remove("faceLeft")
  lastX=gx;selected.style.left=x+"px";selected.style.top=y+"px"
  if(Date.now()-lastSend>sendDelay&&(gx!==lastSentX||gy!==lastSentY)){
    const token=selected
    persistDraggedToken(token,{x:gx,y:gy,facing:token.classList.contains("faceLeft")?1:0}).catch(error=>showMovementError(error,token.id))
    lastSentX=gx;lastSentY=gy;lastSend=Date.now()
  }
})
document.addEventListener("mouseup",()=>{
  const token=selected,origin=_state.tokenDragStart
  selected=null;_state.tokenDragging=false;_state.tokenDragStart=null
  if(origin?.tokenId==="bibi"&&!origin.moved)resumeBibiFollowing()
  if(token&&(!origin||origin.moved)){
    const position=explorationPosition({x:Math.round(parseFloat(token.style.left)/grid)*grid,y:Math.round(parseFloat(token.style.top)/grid)*grid,facing:token.classList.contains("faceLeft")?1:0})
    token.style.left=position.x+"px";token.style.top=position.y+"px"
    persistDraggedToken(token,position).catch(error=>showMovementError(error,token.id))
    if(token.id==="bibi")tryBark()
  }
})

/* ========================= */
/* CAMÉRA DRAG & ZOOM        */
/* ========================= */

document.addEventListener("mousedown", e => {
  if (e.target.closest("button") || e.target.closest("input") ||
      e.target.closest("#playerSelect") || e.target.closest("#gmBar") ||
      e.target.closest(".gmSection") || e.target.closest("#diceBar") ||
      e.target.closest("#characterSheet") || e.target.closest("#shopOverlay") ||
      e.target.closest("#spellMiniGame") || e.target.closest("#runeChallengeOverlay") ||
      e.target.closest("#mobSelectionMenu") || e.target.closest("#wantedEditor")) return
  if (e.button === 0 && e.target.closest("#camera") && !e.target.closest(".token")) {
    cameraDragging = true; cameraStartX = e.clientX - cameraX; cameraStartY = e.clientY - cameraY
    document.body.style.cursor = "grabbing"
  }
})

document.addEventListener("mousemove", e => {
  if (!cameraDragging) return
  cameraX = e.clientX - cameraStartX; cameraY = e.clientY - cameraStartY
  clampCamera(); updateCamera()
})

document.addEventListener("mouseup", () => { cameraDragging = false; document.body.style.cursor = "default" })

// Aucun zoom interactif sur la carte.

document.addEventListener("contextmenu", e => { if (isGM) e.preventDefault() })

/* ========================= */
/* TOUCH EVENTS (MOBILE)     */
/* ========================= */

// Drag des tokens via touch (simule mousedown/mousemove/mouseup)
document.querySelectorAll(".token").forEach(token => {
  token.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    token.dispatchEvent(new MouseEvent("mousedown", {
      clientX: t.clientX, clientY: t.clientY,
      bubbles: true, cancelable: true
    }))
    e.preventDefault()
  }, { passive: false })
})

document.addEventListener("touchmove", e => {
  if (!selected) return
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  document.dispatchEvent(new MouseEvent("mousemove", {
    clientX: t.clientX, clientY: t.clientY, bubbles: true
  }))
  e.preventDefault()
}, { passive: false })

document.addEventListener("touchend", () => {
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
})

// Pan caméra tactile (pour MJ et joueurs)
let _touchPanId   = null
let _touchPanSX   = 0
let _touchPanSY   = 0

const _camera = document.getElementById("camera")
if (_camera) {
  _camera.addEventListener("touchstart", e => {
    if (selected) return // le drag token prend la priorité
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    if (t.target && t.target.closest && (
      t.target.closest(".token") ||
      t.target.closest("#playerSelect") ||
      t.target.closest("#gmBar") ||
      t.target.closest(".gmSection")
    )) return

    _touchPanId = t.identifier
    _touchPanSX = t.clientX - cameraX
    _touchPanSY = t.clientY - cameraY
    // Pour le MJ, activer aussi cameraDragging pour les listeners existants
    if (isGM) {
      cameraDragging = true
      cameraStartX = _touchPanSX
      cameraStartY = _touchPanSY
    }
  }, { passive: true })

  _camera.addEventListener("touchmove", e => {
    if (selected) return
    const t = Array.from(e.touches).find(x => x.identifier === _touchPanId)
    if (!t) return
    cameraX = t.clientX - _touchPanSX
    cameraY = t.clientY - _touchPanSY
    clampCamera()
    updateCamera()
    if (!isGM) e.preventDefault() // empêche le scroll sur mobile joueur
  }, { passive: false })

  _camera.addEventListener("touchend", e => {
    if (!Array.from(e.touches).find(x => x.identifier === _touchPanId)) {
      _touchPanId = null
      cameraDragging = false
    }
  }, { passive: true })
}

// Aucun zoom par pincement.

