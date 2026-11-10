"use strict"

window.__antreAfterlife=null
let antreDeparturePending=false
function isAntreSoulScene(){return currentMap==="antre.jpg"&&window.__antreAfterlife?.phase==="active"}
function syncAntreAfterlifeView(){
 const visible=gameStarted&&!window.__sessionBusy&&["GAME","COMBAT"].includes(gameState)&&currentMap==="antre.jpg"&&window.__antreAfterlife?.phase==="active"
 for(const id of ["greg","ju","elo","bibi"]){
  const token=document.getElementById(id);if(!token)continue
  let badge=token.querySelector(".antreDeathBadge")
  if(visible&&!badge){badge=document.createElement("span");badge.className="antreDeathBadge";badge.textContent="✧ Mort";badge.setAttribute("aria-label","Mort — état narratif, actions disponibles");token.appendChild(badge)}
  if(!visible&&badge){badge.remove();if(gameStarted&&!window.__sessionBusy&&currentMap!=="antre.jpg"&&window.__antreAfterlife?.used){token.classList.add("antreSoulReleased");setTimeout(()=>token.classList.remove("antreSoulReleased"),1400)}}
 }
 if(typeof syncNightMode==="function")syncNightMode()
}
async function reconcileAntreDeparture(){
 if(antreDeparturePending||window.__authRole!=="gm"||window.__sessionBusy||window.__antreAfterlife?.phase!=="active")return
 antreDeparturePending=true
 try{await reliableRootTransaction(root=>{const state=root?.game?.antreAfterlife;if(root?.roles?.[window.__authUid]!=="gm"||root.sessionControl?.phase||state?.phase!=="active"||root.game.map==="antre.jpg")return undefined;state.phase="complete";state.exitedAt=Date.now();return root})}catch(error){console.warn("Sortie de l’Antre à synchroniser",error.message)}finally{antreDeparturePending=false}
}
function antreDepartureUpdate(mapName){
 return mapName!=="antre.jpg"&&window.__antreAfterlife?.phase==="active"?{"antreAfterlife/phase":"complete","antreAfterlife/exitedAt":Date.now()}:{}
}
function playAntreSoulPassage(outcome,done){
 let context=null
 const scope=createPresentationScope("__cancelAntrePassage",()=>{if(context)context.close().catch(()=>{})}),overlay=scope.node(document.createElement("section")),text=document.createElement("p")
 overlay.id="antreSoulPassage";overlay.setAttribute("role","status");overlay.setAttribute("aria-live","polite");text.textContent="Votre histoire ne s’achève pas ici…";overlay.appendChild(text)
 for(let i=0;i<22;i++){const fly=document.createElement("span");fly.className="antreSoulFly";fly.style.setProperty("--x",((i*37)%100)+"%");fly.style.setProperty("--y",((i*23)%100)+"%");fly.style.setProperty("--delay",-(i%7)*.37+"s");overlay.appendChild(fly)}
 document.body.appendChild(overlay)
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){context=new Audio();const noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate),samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.35;const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noise;source.loop=true;filter.type="lowpass";filter.frequency.value=260;gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(.16*(typeof getUserEffectsVolume==="function"?getUserEffectsVolume():.5),context.currentTime+.7);gain.gain.linearRampToValueAtTime(0,context.currentTime+5.8);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();source.stop(context.currentTime+6);context.resume().catch(()=>{})}}catch(error){console.warn("Souffle de l’Antre indisponible",error.message)}
 scope.later(()=>{if(!window.__sessionBusy)done(outcome)},3500)
 scope.later(()=>overlay.classList.add("antreSoulPassageReveal"),4500)
 scope.later(scope.cancel,6000)
 return scope.cancel
}
const antreOriginalShowTavern=showTavern
showTavern=function(...args){const result=antreOriginalShowTavern(...args);syncAntreAfterlifeView();return result}
document.addEventListener("DOMContentLoaded",()=>{
 const refresh=()=>setTimeout(()=>{syncAntreAfterlifeView();if(window.__antreAfterlife?.phase==="active"&&window.__latestMapValue&&window.__latestMapValue!=="antre.jpg")reconcileAntreDeparture()},0)
 db.ref("game/antreAfterlife").on("value",s=>{window.__antreAfterlife=s.val()||null;refresh()})
 db.ref("game/map").on("value",refresh)
 db.ref("sessionControl").on("value",refresh)
})
