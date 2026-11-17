"use strict"
let characterEffectsRefs=[],characterEffectsTimer=null,characterEffectsQueue=Promise.resolve()
let characterEffectsCache={characters:null,curse:{wheel:null},sessionControl:null,ready:new Set()}
const characterEffectRequests=new Set(),seenPowerEvents=new Set()
function syncCharacterEffects(){
 characterEffectsRefs.forEach(([r,e,cb])=>r.off(e,cb));characterEffectsRefs=[];clearTimeout(characterEffectsTimer)
 characterEffectsCache={characters:null,curse:{wheel:null},sessionControl:null,ready:new Set()}
 if(window.__authRole!=="gm")return
 const schedule=()=>{clearTimeout(characterEffectsTimer);characterEffectsTimer=setTimeout(tickCharacterEffects,60)}
 const requests=db.ref("characterRequests"),cb=snap=>{if(snap.val()?.status!=="queued")return;const id=snap.key,seed=Math.floor(Math.random()*4294967296);characterEffectsQueue=characterEffectsQueue.catch(()=>{}).then(()=>window.__authRole==="gm"?transactCombatRoot(root=>reduceCharacterRequest(root,id,seed)):null).catch(error=>console.error(error))}
 requests.on("child_added",cb);characterEffectsRefs.push([requests,"child_added",cb])
 for(const branch of ["characters","curse/wheel","sessionControl",".info/connected"]){const ref=db.ref(branch),callback=snap=>{if(branch==="curse/wheel")characterEffectsCache.curse.wheel=snap.val();else if(branch!==".info/connected")characterEffectsCache[branch]=snap.val();characterEffectsCache.ready.add(branch);schedule()};ref.on("value",callback);characterEffectsRefs.push([ref,"value",callback])}
}
async function tickCharacterEffects(){
 if(window.__authRole!=="gm"||window.__sessionBusy||(typeof requireActionConnection==="function"&&!window.__actionOnline))return
 // A local dry run never applies effects; every change is rechecked in the transaction.
 try{const cache=characterEffectsCache,ready=["characters","curse/wheel","sessionControl"].every(key=>cache.ready.has(key));if(!ready||advanceCharacterState(cache)!==undefined)await transactCombatRoot(advanceCharacterState)}catch(error){console.error("Malédiction non synchronisée",error)}
 if(window.__authRole==="gm"){
  const w=characterEffectsCache.ready.has("curse/wheel")?characterEffectsCache.curse.wheel:window.__activeCurseWheel
  if(w&&["spinning","result"].includes(w.state)){
   const deadline=w.state==="spinning"?w.startedAt+4500:(w.resultAt||w.time)+5000
   clearTimeout(characterEffectsTimer);characterEffectsTimer=setTimeout(tickCharacterEffects,Math.max(100,deadline-Date.now()))
  }
 }
}
async function requestCharacterEffect(kind,actor,payload={}){
 const key=kind+actor;if(characterEffectRequests.has(key))return
 try{requireActionAccess({actor,playerOnly:true})
  characterEffectRequests.add(key);return await submitReliableAction("characterRequests",{actor,kind,payload:{version:1,...payload}})
 }catch(e){showNotification(e.message)}finally{characterEffectRequests.delete(key)}
}

function showCurseIntro(player){showNotification(heroDisplayName(player).toUpperCase()+" : malédiction complète, en attente de la roue du MJ…")}


async function spinCurseWheel(player){
 await requestCharacterEffect("curse-spin",player,{wheelId:window.__activeCurseWheel?.id||""})
 if(["intro","wheel"].includes(window.__activeCurseWheel?.state)){window.__cursePresented=null;presentSavedCurseWheel(window.__activeCurseWheel)}
}
function activatePowerMode(player){
 if(!COMBAT_HEROES.includes(player))return
 const token=document.getElementById(player);if(token)token.classList.add("powerReady","powerFull")
 if(window.__authRole==="gm"||window.__authPlayerId!==player||myToken?.id!==player)return
 if(!powerModeActive)playSound("powerSound",.75)
 powerModeActive=true
 if(!document.getElementById("usePowerBtn"))showUsePowerBtn(player)
}
async function usePower(player){const button=document.getElementById("usePowerBtn");if(button?.disabled)return;try{if(button)button.disabled=true;return await requestCharacterEffect("power",player)}finally{if(button?.isConnected)button.disabled=false}}
function presentSavedCurseWheel(wheel){
 if(wheel?.player==="bibi")wheel=null
 window.__activeCurseWheel=wheel||null
 if(!wheel){for(const id of ["curseIntroScreen","curseWheelScreen","curseResultScreen"])document.getElementById(id)?.remove();window.__cursePresented=null;return}
 if(!gameStarted||window.__sessionBusy)return
 const signature=wheel.id+":"+wheel.state
 if(window.__cursePresented===signature&&document.getElementById(wheel.state==="result"?"curseResultScreen":"curseWheelScreen"))return
 window.__cursePresented=signature
 for(const id of ["curseIntroScreen","curseWheelScreen","curseResultScreen"])document.getElementById(id)?.remove()
 if(wheel.state==="result"){showCurseResult(wheel.player,wheel.result);return}
 showCurseWheelScreen(wheel.player)
 if(wheel.state==="spinning"){
  const button=document.getElementById("curseWheelBtn");if(button){button.disabled=true;button.innerText="La roue tourne…"}
  const canvas=document.getElementById("curseWheelCanvas"),n=curseWheelChoices.length,arc=Math.PI*2/n,total=Math.PI*2*6+(Math.PI*2-wheel.result*arc-arc/2)
  const animate=()=>{if(window.__activeCurseWheel?.id!==wheel.id||window.__activeCurseWheel.state!=="spinning"||!canvas.isConnected)return;const p=Math.max(0,Math.min(1,(Date.now()-wheel.startedAt)/4000));drawCurseWheel(canvas,total*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(animate)};requestAnimationFrame(animate)
 }
}
function presentCharacterPower(event){
 if(!COMBAT_HEROES.includes(event?.player)||!event?.id||seenPowerEvents.has(event.id)||event.time<(window.__pageLoadTime||0)||!gameStarted)return
 seenPowerEvents.add(event.id)
 enqueueSharedVisual("power-"+event.id,()=>{
  playSound("powerSound",.9);powerExplosion();flashGold();screenShakeHard();showNotification(event.player==="ju"?"PIKA — APPÉTIT ABYSSAL !":heroDisplayName(event.player).toUpperCase()+" LIBÈRE SON POUVOIR !")
  const info=playerPowerSounds[event.player];if(info)playCharacterPowerSound(info)
 },3000)
}
document.addEventListener("DOMContentLoaded",()=>{
 syncCharacterEffects()
 db.ref("curse/wheel").on("value",s=>presentSavedCurseWheel(s.val()))
 db.ref("game/powerEvents").on("child_added",s=>presentCharacterPower(s.val()))
})

function updateFlyBlessingButton(){
 const button=document.getElementById("flyBlessingBtn");if(!button)return
 button.disabled=!(isGM&&window.__authRole==="gm"&&gameStarted&&gameState==="GAME"&&!combatActive&&currentMap==="chapelle.jpg"&&!window.__sessionBusy)
 button.title=button.disabled?"Utilisable uniquement à la chapelle, hors combat":"Remettre les malédictions de tous les héros à zéro"
}
async function blessPartyWithFlies(){
 const button=document.getElementById("flyBlessingBtn");if(button)button.disabled=true
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!gameStarted||gameState!=="GAME"||combatActive||currentMap!=="chapelle.jpg")throw Error("La bénédiction est disponible uniquement à la chapelle, hors combat.")
  const uid=window.__authUid,revision=persistenceRevision||"initial"
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||root.game?.map!=="chapelle.jpg"||root.game?.combatState?.active||root.combat?.phase==="active")return undefined
   for(const id of PLAYABLE_HEROES){const c=root.characters?.[id];if(c){c.curse=0;delete c.cursedEffect}}
   if(root.curse)delete root.curse.wheel
   root.game.flyBlessing={id:uid+"-"+Date.now(),time:Date.now()}
   return root
  })
  if(!result.committed)throw Error("La carte ou la partie a changé.")
  showNotification("Bénédiction des mouches : toutes les malédictions actives sont dissipées.")
  document.querySelectorAll(".gmSection").forEach(menu=>menu.style.display="none");return true
 }catch(error){showNotification("Bénédiction non appliquée : "+error.message);return false}finally{updateFlyBlessingButton()}
}
document.addEventListener("DOMContentLoaded",()=>{db.ref("game/map").on("value",()=>setTimeout(updateFlyBlessingButton,0));db.ref("combat").on("value",()=>setTimeout(updateFlyBlessingButton,0));setInterval(updateFlyBlessingButton,1000);updateFlyBlessingButton()})

function presentFlyBlessing(event){
 if(!event?.id||!gameStarted||window.__sessionBusy||event.time<(window.__pageLoadTime||0)||Date.now()-event.time>15000)return
 const map=currentMap
 enqueueSharedVisual("fly-blessing-"+event.id,()=>{
  if(currentMap!==map||!gameStarted||window.__sessionBusy)return
  const scope=createPresentationScope("__cancelFlyBlessing"),scene=scope.node(document.createElement("div")),smoke=document.createElement("div"),title=document.createElement("h2")
  scene.className="flyBlessingScene";scene.setAttribute("role","status");smoke.className="flyBlessingSmoke";title.textContent="Bénédiction des mouches";scene.append(smoke,title)
  for(let i=0;i<32;i++){const fly=document.createElement("img");fly.src="images/mouche.png";fly.alt="";fly.className="flyBlessingFly";fly.style.cssText="left:"+Math.random()*100+"%;top:"+Math.random()*100+"%;--size:"+(12+Math.random()*18)+"px;--duration:"+(1+Math.random()*1.7)+"s;animation-delay:-"+Math.random()*3+"s";scene.appendChild(fly)}
  document.body.appendChild(scene);const sound=document.getElementById("powSound");if(sound)scope.audio(sound);playSound("powSound",.85,true);scope.later(scope.cancel,4800)
 },4800)
}
document.addEventListener("DOMContentLoaded",()=>db.ref("game/flyBlessing").on("value",s=>presentFlyBlessing(s.val())))
