"use strict"

const ALLY_DISCOVERY_MESSAGES={
 melenchon:"Le général Mélenchon engage ses troupes à vos côtés. Lors de vos combats les plus difficiles, l’Oregon III pourra vous apporter son appui aérien.",
 odin:"Le regard du Tout-Père se pose sur vous. Dans vos combats les plus difficiles, Odin pourra répondre à votre appel.",
 thor:"Le tonnerre gronde : Thor vous promet son soutien face aux ennemis les plus redoutables.",
 freya:"Freya vous accorde sa faveur. Au cœur des batailles les plus sombres, vous ne serez plus seuls.",
 witch:"Une promesse scelle votre alliance. Lorsque tout semblera perdu, la Sorcière pourra vous prêter ses pouvoirs.",
 baldur:"Vous avez gagné le soutien du Jarl Baldur. Face aux plus grandes menaces, il se tiendra à vos côtés."
}
let allyDiscoveryKnown=null,allyDiscoveryQueue=[],allyDiscoveryTimer=null
function discoveredAllies(){return ALLY_PNJS.filter(p=>window.__explorationState?.allyDiscoveries?.[p.id])}
function syncAllyDiscoveries(){
 const data=window.__explorationState?.allyDiscoveries||{},previous=allyDiscoveryKnown
 allyDiscoveryKnown={...data}
 allyDiscoveryQueue=allyDiscoveryQueue.filter(p=>data[p.id])
 const showing=document.getElementById("allyDiscoveryAnnouncement")
 if(showing&&!data[showing.dataset.ally]){clearTimeout(allyDiscoveryTimer);allyDiscoveryTimer=null;showing.remove()}
 if(previous&&gameStarted&&!window.__sessionBusy&&["GAME","COMBAT"].includes(gameState)){
  for(const pnj of ALLY_PNJS)if(data[pnj.id]&&!previous[pnj.id]&&Math.abs(Date.now()-Number(data[pnj.id].time))<30000)allyDiscoveryQueue.push(pnj)
  playNextAllyDiscovery()
 }
 if(typeof updateThuumButton==="function")updateThuumButton()
}
function clearAllyDiscoveryAnimation(){clearTimeout(allyDiscoveryTimer);allyDiscoveryTimer=null;allyDiscoveryQueue=[];document.getElementById("allyDiscoveryAnnouncement")?.remove()}
function playNextAllyDiscovery(){
 if(document.getElementById("allyDiscoveryAnnouncement")||!allyDiscoveryQueue.length)return
 if(!gameStarted||window.__sessionBusy||!["GAME","COMBAT"].includes(gameState)){clearAllyDiscoveryAnimation();return}
 const pnj=allyDiscoveryQueue.shift(),overlay=document.createElement("div"),card=document.createElement("div"),image=document.createElement("img"),name=document.createElement("h2"),message=document.createElement("p"),note=document.createElement("small")
 overlay.id="allyDiscoveryAnnouncement";overlay.dataset.ally=pnj.id;overlay.setAttribute("role","status");overlay.setAttribute("aria-live","polite");card.className="allyDiscoveryCard";card.style.setProperty("--ally-color",pnj.color)
 image.src="images/"+pnj.image;image.alt=pnj.name;name.textContent=pnj.name;message.textContent=ALLY_DISCOVERY_MESSAGES[pnj.id];note.textContent="Allié découvert — sur autorisation du MJ : pion hors combat, pouvoir contre les world boss."
 card.append(image,name,message,note);overlay.appendChild(card);document.body.appendChild(overlay)
 allyDiscoveryTimer=setTimeout(()=>{overlay.remove();allyDiscoveryTimer=null;playNextAllyDiscovery()},7000)
}
function openAllyDiscoveryPanel(){
 if(!isGM||!gameStarted)return
 document.getElementById("allyDiscoveryPanel")?.remove()
 const panel=document.createElement("div"),box=document.createElement("div"),title=document.createElement("h2"),intro=document.createElement("p"),close=document.createElement("button")
 panel.id="allyDiscoveryPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Débloquer un allié");box.className="allyDiscoveryBox";title.textContent="Débloquer un allié";intro.textContent="Annonce au groupe et ajoute l’allié au menu Action. Votre autorisation reste nécessaire : pion hors combat, pouvoir contre les world boss."
 box.append(title,intro)
 for(const pnj of ALLY_PNJS){const button=document.createElement("button"),image=document.createElement("img"),label=document.createElement("span");button.type="button";button.dataset.ally=pnj.id;image.src="images/"+pnj.image;image.alt="";label.textContent=pnj.name+(window.__explorationState?.allyDiscoveries?.[pnj.id]?" — déjà découvert":" — débloquer");button.disabled=!!window.__explorationState?.allyDiscoveries?.[pnj.id];button.append(image,label);button.onclick=async()=>{button.disabled=true;if(await unlockAllyDiscovery(pnj.id)){panel.remove();window.GameWindows?.closed(panel);document.querySelectorAll(".gmSection").forEach(menu=>menu.style.display="none")}else button.disabled=false};box.appendChild(button)}
 const previous=document.activeElement,finish=()=>{panel.remove();previous?.focus?.()};close.textContent="Fermer";close.onclick=finish;box.appendChild(close);panel.appendChild(box)
 panel.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();finish()}if(event.key==="Tab"){const buttons=[...box.querySelectorAll("button:not(:disabled)")],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 document.body.appendChild(panel);box.querySelector("button:not(:disabled)")?.focus()
}
async function unlockAllyDiscovery(id){
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!ALLY_PNJS.some(p=>p.id===id))throw Error("Allié inconnu")
  const uid=window.__authUid,revision=persistenceRevision||"initial",time=Date.now()
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||root.game?.allyDiscoveries?.[id])return undefined
   root.game||={};root.game.allyDiscoveries||={};root.game.allyDiscoveries[id]={time};return root
  })
  if(!result.committed)throw Error("Allié déjà découvert ou partie modifiée.")
  return true
 }catch(error){showNotification(error.message);return false}
}
function renderDiscoveredAllies(panel){
 for(const pnj of discoveredAllies()){
  const card=document.createElement("section"),image=document.createElement("img"),title=document.createElement("h3"),state=document.createElement("p"),list=document.createElement("ul")
  card.className="discoveredAlly";image.src="images/"+pnj.image;image.alt="";title.textContent=pnj.name;state.textContent="Sur autorisation du MJ : pion hors combat, pouvoir contre les world boss."
  for(const action of pnj.actions){const item=document.createElement("li");item.textContent=action.label+" : "+action.desc;list.appendChild(item)}
  card.append(image,title,state,list);panel.appendChild(card)
 }
}

window.__summonedAllies={}
async function giveExplorationAllyAccess(pnj,action,actor){
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  const known=ALLY_PNJS.find(p=>p.id===pnj?.id),power=known?.actions.find(a=>a.id===action?.id);if(!known||!power||!PLAYABLE_HEROES.includes(actor))throw Error("Allié, pouvoir ou héros inconnu")
  const uid=window.__authUid,revision=persistenceRevision||"initial",grantId=db.ref("game").push().key,time=Date.now()
  const result=await reliableRootTransaction(root=>{if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||root.game?.combatState?.active||root.combat?.phase==="active"||!root.characters?.[actor]||root.characters[actor].hp<=0)return undefined;root.game||={};root.game.playerAllyAccess={scope:"exploration",pnjName:known.name,actionId:power.id,playerId:actor,grantId,time};return root})
  if(!result.committed)throw Error("Un combat a commencé ou la partie a changé.")
  showNotification(known.name+" : invocation hors combat autorisée pour "+heroDisplayName(actor)+".");return true
 }catch(e){showNotification("Autorisation non donnée : "+e.message);return false}
}
function openExplorationAlliesPanel(){
 if(!isGM||window.__authRole!=="gm"||!gameStarted||gameState!=="GAME"||combatActive)return
 const existing=document.getElementById("allyPNJPanel");if(existing){existing.remove();return}
 const panel=document.createElement("section"),title=document.createElement("h2"),help=document.createElement("p"),close=document.createElement("button");panel.id="allyPNJPanel";panel.className="explorationAlliesPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Invocations hors combat");title.textContent="Invocations hors combat";help.textContent="Autorisez un joueur à invoquer un allié. La cinématique pose un pion sur cette carte, sans dégâts ni soins. Le pion reste ici jusqu’à votre suppression.";panel.append(title,help)
 for(const pnj of ALLY_PNJS){const card=document.createElement("section"),name=document.createElement("h3"),image=document.createElement("img");image.src="images/"+pnj.image;image.alt="";name.textContent=pnj.name;card.append(image,name);for(const action of pnj.actions){const button=document.createElement("button");button.type="button";button.textContent=action.label+" — Donner…";button.onclick=()=>openAllyGrantPicker(pnj,action);card.appendChild(button)}panel.appendChild(card)}
 close.type="button";close.textContent="Fermer";close.onclick=()=>{panel.remove();window.GameWindows?.closed(panel)};panel.appendChild(close);document.body.appendChild(panel);window.GameWindows?.register(panel,close.onclick)
}
async function requestExplorationSummon(pnj,action){
 if(window.__sharedVisualBusy||window.__sessionBusy)return showNotification("Attendez la fin de l’animation en cours.")
 const actor=getLocalPlayerId(),access=window.playerAllyAccessData
 if(!actor||!hasPlayerAllyAccess()||access.scope!=="exploration"||access.actionId!==action.id)return showNotification("Demandez l’autorisation du MJ pour invoquer cet allié.")
 return requestExplorationAction("summon",actor,{pnjId:pnj.id,actionId:action.id,grantId:access.grantId,map:currentMap})
}
function presentExplorationSummon(result){
 const pnj=ALLY_PNJS.find(p=>p.id===result.pnjId),action=pnj?.actions.find(a=>a.id===result.actionId)
 if(!pnj||!action||!gameStarted||gameState!=="GAME"||combatActive||currentMap!==result.map)return
 _allyInvocationCinematic(pnj,action,null,()=>_playAllyAnim(action.type,pnj.color,false))
}
async function updateSummonedAlly(id,change){
 requireActionAccess({gmOnly:true});requireExplorationConnection();const uid=window.__authUid,revision=persistenceRevision||"initial",map=currentMap
 const result=await reliableRootTransaction(root=>{
  const token=root?.game?.summonedAllies?.[id];if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||root.game?.map!==map||token?.map!==map||root.game?.combatState?.active||root.combat?.phase==="active")return undefined
  if(change.remove)delete root.game.summonedAllies[id];else{if(!Number.isFinite(change.x)||!Number.isFinite(change.y))throw Error("Position invalide");const el=document.getElementById("map");token.x=Math.round(Math.max(0,Math.min(el.offsetWidth,change.x)));token.y=Math.round(Math.max(0,Math.min(el.offsetHeight,change.y)))}return root
 });if(!result.committed)throw Error("L’invocation ou la carte a changé.");return true
}
function syncSummonedAllies(){
 const visible=gameStarted&&gameState==="GAME"&&!combatActive&&!window.__sessionBusy,gm=isGM&&window.__authRole==="gm",map=document.getElementById("map"),button=document.getElementById("allyBtn")
 if(button)button.style.display=gm&&gameStarted&&["GAME","COMBAT"].includes(gameState)&&(!combatActive||combatHasWorldBoss({combat:window.__combatSnapshot}))?"flex":"none"
 const entries=visible?Object.entries(window.__summonedAllies||{}).filter(([,t])=>t?.map===currentMap&&ALLY_PNJS.some(p=>p.id===t.pnjId)):[],wanted=new Set(entries.map(([id])=>id))
 document.querySelectorAll(".summonedAllyToken").forEach(el=>{if(!wanted.has(el.dataset.summonId))el.remove()})
 if(!map)return
 for(const [id,data]of entries){const pnj=ALLY_PNJS.find(p=>p.id===data.pnjId);let token=[...map.querySelectorAll(".summonedAllyToken")].find(el=>el.dataset.summonId===id)
  if(!token){token=document.createElement("div");token.className="summonedAllyToken";token.dataset.summonId=id;const image=document.createElement("img"),name=document.createElement("span");image.src="images/"+pnj.image;image.alt=pnj.name;image.draggable=false;name.textContent=pnj.name;token.append(image,name);map.appendChild(token)
   token.addEventListener("pointerdown",event=>{if(event.button!==0||!isGM||window.__authRole!=="gm"||token.__saving||event.target.closest("button"))return;try{requireExplorationConnection()}catch(e){showNotification(e.message);return}event.preventDefault();event.stopPropagation();token.__pointer=event.pointerId;token.setPointerCapture?.(event.pointerId)})
   token.addEventListener("pointermove",event=>{if(token.__pointer!==event.pointerId||!isGM)return;const rect=map.getBoundingClientRect(),scale=Number(cameraZoom)||1;token.style.left=Math.max(0,Math.min(map.offsetWidth,(event.clientX-rect.left)/scale))+"px";token.style.top=Math.max(0,Math.min(map.offsetHeight,(event.clientY-rect.top)/scale))+"px"})
   token.addEventListener("pointerup",async event=>{if(token.__pointer!==event.pointerId)return;token.__pointer=null;token.__saving=true;try{await updateSummonedAlly(id,{x:parseFloat(token.style.left),y:parseFloat(token.style.top)})}catch(e){showNotification(e.message)}finally{token.__saving=false;syncSummonedAllies()}})
   for(const type of ["pointercancel","lostpointercapture"])token.addEventListener(type,()=>{if(token.__pointer!=null){token.__pointer=null;syncSummonedAllies()}})
  }
  token.style.setProperty("--summon-color",pnj.color);token.style.cursor=gm?"grab":"default";token.setAttribute("aria-label",pnj.name+" — allié invoqué")
  if(token.__pointer==null&&!token.__saving){token.style.left=data.x+"px";token.style.top=data.y+"px"}
  let close=token.querySelector("button");if(!gm)close?.remove();else if(!close){close=document.createElement("button");close.type="button";close.textContent="×";close.title="Retirer cette invocation";close.setAttribute("aria-label","Retirer "+pnj.name);close.onpointerdown=e=>e.stopPropagation();close.onclick=async e=>{e.stopPropagation();close.disabled=true;try{await updateSummonedAlly(id,{remove:true})}catch(error){showNotification(error.message)}finally{close.disabled=false}};token.appendChild(close)}
 }
}
document.addEventListener("DOMContentLoaded",()=>{db.ref("game/summonedAllies").on("value",s=>{window.__summonedAllies=s.val()||{};syncSummonedAllies()})})
