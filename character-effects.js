"use strict"
let characterEffectsRefs=[],characterEffectsTimer=null,characterEffectsQueue=Promise.resolve()
const characterEffectRequests=new Set(),seenPowerEvents=new Set()
function syncCharacterEffects(){
 characterEffectsRefs.forEach(([r,e,cb])=>r.off(e,cb));characterEffectsRefs=[];clearTimeout(characterEffectsTimer)
 if(window.__authRole!=="gm")return
 const schedule=()=>{clearTimeout(characterEffectsTimer);characterEffectsTimer=setTimeout(tickCharacterEffects,60)}
 const requests=db.ref("characterRequests"),cb=snap=>{if(snap.val()?.status!=="queued")return;const id=snap.key,seed=Math.floor(Math.random()*4294967296);characterEffectsQueue=characterEffectsQueue.catch(()=>{}).then(()=>window.__authRole==="gm"?transactCombatRoot(root=>reduceCharacterRequest(root,id,seed)):null).catch(error=>console.error(error))}
 requests.on("child_added",cb);characterEffectsRefs.push([requests,"child_added",cb])
 for(const branch of ["characters","curse/wheel","sessionControl",".info/connected"]){const ref=db.ref(branch);ref.on("value",schedule);characterEffectsRefs.push([ref,"value",schedule])}
}
async function tickCharacterEffects(){
 if(window.__authRole!=="gm")return
 try{await transactCombatRoot(advanceCharacterState)}catch(error){console.error("Malédiction non synchronisée",error)}
 if(window.__authRole==="gm"){
  const w=window.__activeCurseWheel
  if(w&&["spinning","result"].includes(w.state)){
   const deadline=w.state==="spinning"?w.startedAt+4500:(w.resultAt||w.time)+5000
   clearTimeout(characterEffectsTimer);characterEffectsTimer=setTimeout(tickCharacterEffects,Math.max(100,deadline-Date.now()))
  }
 }
}
async function requestCharacterEffect(kind,actor,payload={}){
 if(!canAccessCharacter(actor)||window.__sessionBusy||!window.__explorationOnline)return showNotification("Connexion et accès au personnage nécessaires")
 const key=kind+actor;if(characterEffectRequests.has(key))return
 characterEffectRequests.add(key)
 const ref=db.ref("characterRequests").push()
 let timer,listener
 try{
  await ref.set({uid:window.__authUid,actor,kind,payload:{version:1,...payload},status:"queued",time:Date.now()})
  await new Promise((resolve,reject)=>{listener=s=>{const r=s.val();if(r?.status==="done")resolve();if(["failed","cancelled"].includes(r?.status))reject(new Error(r.error||"Demande annulée"))};timer=setTimeout(async()=>{try{const r=await ref.child("status").transaction(v=>v==="queued"?"cancelled":undefined);if(r.committed)reject(new Error("Le MJ doit être connecté pour confirmer cette action"));else listener(await ref.once("value"))}catch(e){reject(e)}},15000);ref.on("value",listener,reject)})
 }catch(error){showNotification(error.message)}finally{clearTimeout(timer);if(listener)ref.off("value",listener);characterEffectRequests.delete(key)}
}
function showCurseIntro(player){showNotification(player.toUpperCase()+" : malédiction complète, en attente de la roue du MJ…")}
function triggerCurseWheel(){ /* Le MJ coordonne automatiquement les personnages à huit points. */ }
function applyCurseEffect(){ /* L’effet est appliqué une seule fois dans la transaction du MJ. */ }
async function spinCurseWheel(player){
 await requestCharacterEffect("curse-spin",player,{wheelId:window.__activeCurseWheel?.id||""})
 if(["intro","wheel"].includes(window.__activeCurseWheel?.state)){window.__cursePresented=null;presentSavedCurseWheel(window.__activeCurseWheel)}
}
function activatePowerMode(player){
 const token=document.getElementById(player);if(token)token.classList.add("powerReady","powerFull")
 if(myToken?.id!==player)return
 if(!powerModeActive)playSound("powerSound",.75)
 powerModeActive=true
 if(!document.getElementById("usePowerBtn"))showUsePowerBtn(player)
}
function usePower(player){return requestCharacterEffect("power",player)}
function presentSavedCurseWheel(wheel){
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
 if(!event?.id||seenPowerEvents.has(event.id)||event.time<(window.__pageLoadTime||0)||!gameStarted)return
 seenPowerEvents.add(event.id)
 enqueueSharedVisual("power-"+event.id,()=>{
  playSound("powerSound",.9);powerExplosion();flashGold();screenShakeHard();showNotification(event.player.toUpperCase()+" LIBÈRE SON POUVOIR !")
  const info=playerPowerSounds[event.player];if(info){const audio=new Audio(resolveAudioPath(info.file));setManagedAudioBaseVolume(audio,.85);audio.play().catch(()=>{});if(info.fadeAt)setTimeout(()=>audio.pause(),info.fadeAt)}
 },3000)
}
document.addEventListener("DOMContentLoaded",()=>{
 syncCharacterEffects()
 db.ref("curse/wheel").on("value",s=>presentSavedCurseWheel(s.val()))
 db.ref("game/powerEvents").on("child_added",s=>presentCharacterPower(s.val()))
})
