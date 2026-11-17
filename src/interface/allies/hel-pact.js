"use strict"
window.__helMarks={}
const helViewStartedAt=Date.now(),helSeenEvents=new Set()
let helCommandPending=false
async function submitHelPactCommand(command){
 if(helCommandPending)return false
 helCommandPending=true
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  const uid=window.__authUid,revision=persistenceRevision||"initial",id=db.ref("game/helCommands").push().key,time=Date.now()
  const result=await reliableRootTransaction(root=>applyHelPactCommand(root,uid,revision,command,id,time))
  if(!result.committed)throw Error("Action non confirmée")
  showNotification(command.kind==="revoke"?"Alliance rompue":command.kind==="mark"?"Marque des parjures appliquée : PV maximum −15 %":"Courroux de Hel levé")
  return true
 }catch(error){showNotification(error.message);return false}finally{helCommandPending=false}
}
function helModal(overlay,close){
 const previous=document.activeElement
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true")
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();close()}if(event.key==="Tab"){const all=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=all[0],last=all.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}})
 document.body.appendChild(overlay);window.GameWindows?.register(overlay,close);overlay.querySelector("button,input")?.focus()
 return ()=>{overlay.remove();window.GameWindows?.closed(overlay);if(previous?.isConnected)previous.focus()}
}
function openHelWrathMenu(){
 if(!isGM||!gameStarted)return
 document.getElementById("helWrathMenu")?.__close?.()
 const overlay=document.createElement("div"),box=document.createElement("section"),title=document.createElement("h2"),intro=document.createElement("p")
 overlay.id="helWrathMenu";overlay.className="helModal";overlay.setAttribute("aria-label","Courroux de Hel — Marque des parjures");box.className="helMenuBox"
 title.textContent="Courroux de Hel";intro.textContent="Marque des parjures : −15 % de PV maximum, sans cumul, jusqu’à ce que le MJ la lève. Choisissez les personnages concernés. Lever la marque ne soigne pas."
 box.append(title,intro)
 for(const id of ["greg","ju","elo","bibi"]){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=id;input.checked=id!=="bibi";label.className="helTarget";label.append(input,document.createTextNode(heroDisplayName(id)+(window.__helMarks[id]?" — déjà marqué":"")));box.appendChild(label)}
 let dispose=()=>{};const close=()=>dispose();overlay.__close=close
 for(const [kind,text]of [["mark","Déclencher le courroux — PV maximum −15 %"],["lift","Lever le courroux sur les personnages choisis"]]){const button=document.createElement("button");button.type="button";button.textContent=text;button.dataset.helCommand=kind;button.onclick=async()=>{const targets=[...box.querySelectorAll("input:checked")].map(i=>i.value);for(const b of box.querySelectorAll("button"))b.disabled=true;if(await submitHelPactCommand({kind,targets}))close();else for(const b of box.querySelectorAll("button"))b.disabled=false};box.appendChild(button)}
 const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Fermer — Échap";cancel.onclick=close;box.appendChild(cancel);overlay.appendChild(box);dispose=helModal(overlay,close)
}
function presentHelWrath(event){
 const alliance=event.kind==="duo-alliance"
 const overlay=document.createElement("div"),portrait=document.createElement("img"),box=document.createElement("section"),title=document.createElement("h2"),text=document.createElement("p"),effect=document.createElement("p"),close=document.createElement("button")
 overlay.id=alliance?"helAllianceScene":"helWrathScene";overlay.className="helWrathScene";overlay.setAttribute("aria-label",alliance?"Hel et Nidhogg — soutien commun":"Hel — Marque des parjures")
 let finishScene=()=>{}
 const scope=createPresentationScope("__cancelHelWrath",()=>{document.body.classList.remove("helWrathShake");finishScene()})
 scope.node(overlay);portrait.src="images/hel.png";portrait.alt="Hel";portrait.className="helWrathPortrait";title.textContent="HEL";text.textContent="Comment osez-vous ? Vous avez engagé votre parole devant les morts… puis cru pouvoir la reprendre. Gardez votre souffle, parjures. Désormais, une part de votre vie demeure ici, auprès de moi."
 if(alliance)text.textContent="Vous avez gagné ma confiance… et celle de Nidhogg. Vous êtes dignes de recevoir notre aide face à votre défi final. Devant le Roi, appelez-nous ensemble."
 effect.textContent="Marque des parjures — PV maximum −15 % · "+event.targets.map(heroDisplayName).join(", ");close.type="button";close.textContent="Fermer — Échap";close.onclick=scope.cancel;box.className="helWrathSpeech";box.append(title,text,effect,close);overlay.append(portrait,box);finishScene=helModal(overlay,scope.cancel)
 if(alliance)effect.textContent="Duo Hel et Nidhogg débloqué — uniquement contre le Roi, sur autorisation du MJ."
 const pow=document.getElementById("powSound");if(pow)scope.audio(pow);playSound("powSound",.84,true)
 const rumble=scope.audio(new Audio("audio/tremblement.mp3"));setManagedAudioBaseVolume(rumble,.7);rumble.play().catch(()=>{})
 const dialogue=text.textContent
 if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){let letters=0;text.textContent="";text.style.minHeight="6em";const typing=scope.every(()=>{letters+=3;text.textContent=dialogue.slice(0,letters);if(letters>=dialogue.length)clearInterval(typing)},25)}
 if(!alliance&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){document.body.classList.add("helWrathShake");scope.later(()=>document.body.classList.remove("helWrathShake"),650)}
 scope.later(scope.cancel,10500)
}
function renderHelMarkOnSheet(){
 const bar=document.getElementById("hpBar");if(!bar)return
 let note=document.getElementById("helMarkSheetNote");if(!note){note=document.createElement("p");note.id="helMarkSheetNote";bar.parentElement?.insertAdjacentElement("afterend",note)}
 note.textContent="Marque des parjures : PV maximum −15 % — permanent";note.hidden=!window.__helMarks?.[typeof currentSheetPlayer!=="undefined"?currentSheetPlayer:""]
}
document.addEventListener("DOMContentLoaded",()=>{
 let eventReady=false
 let allianceReady=false;const allianceSeen=new Set()
 db.ref("game/helNidhoggAnnouncement").on("value",snap=>{const event=snap.val();if(!allianceReady){allianceReady=true;if(event?.id)allianceSeen.add(event.id);return}if(!event?.id||allianceSeen.has(event.id))return;allianceSeen.add(event.id);if(window.__sessionBusy||!gameStarted||Date.now()-event.time>20000)return;enqueueSharedVisual("hel-alliance-"+event.id,()=>{if(typeof clearAllyDiscoveryAnimation==="function")clearAllyDiscoveryAnimation();presentHelWrath({...event,kind:"duo-alliance",targets:[]})},11000)})
 db.ref("game/helMarks").on("value",snap=>{window.__helMarks=snap.val()||{};if(typeof updateHPBar==="function")updateHPBar();if(typeof renderCombatStatusPanel==="function")renderCombatStatusPanel();for(const id of ["greg","ju","elo","bibi"])if(typeof updateTokenStats==="function"&&typeof gameStarted!=="undefined"&&gameStarted)updateTokenStats(id)})
 db.ref("game/helWrathEvent").on("value",snap=>{const event=snap.val();if(!eventReady){eventReady=true;if(event?.id)helSeenEvents.add(event.id);return}if(!event?.id||helSeenEvents.has(event.id))return;helSeenEvents.add(event.id);if(window.__sessionBusy||event.time<helViewStartedAt||Date.now()-event.time>20000||!gameStarted)return;enqueueSharedVisual("hel-"+event.id,()=>presentHelWrath(event),11000)})
})
