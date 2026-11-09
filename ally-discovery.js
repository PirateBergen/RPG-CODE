"use strict"

const ALLY_DISCOVERY_MESSAGES={
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
 image.src="images/"+pnj.image;image.alt=pnj.name;name.textContent=pnj.name;message.textContent=ALLY_DISCOVERY_MESSAGES[pnj.id];note.textContent="Allié découvert — invocation contre les world boss, sur autorisation du MJ."
 card.append(image,name,message,note);overlay.appendChild(card);document.body.appendChild(overlay)
 allyDiscoveryTimer=setTimeout(()=>{overlay.remove();allyDiscoveryTimer=null;playNextAllyDiscovery()},7000)
}
function openAllyDiscoveryPanel(){
 if(!isGM||!gameStarted)return
 document.getElementById("allyDiscoveryPanel")?.remove()
 const panel=document.createElement("div"),box=document.createElement("div"),title=document.createElement("h2"),intro=document.createElement("p"),close=document.createElement("button")
 panel.id="allyDiscoveryPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Débloquer un allié");box.className="allyDiscoveryBox";title.textContent="Débloquer un allié";intro.textContent="Annonce au groupe et ajoute l’allié au menu Action. L’utilisation exige toujours votre autorisation pendant un combat de world boss."
 box.append(title,intro)
 for(const pnj of ALLY_PNJS){const button=document.createElement("button"),image=document.createElement("img"),label=document.createElement("span");button.type="button";button.dataset.ally=pnj.id;image.src="images/"+pnj.image;image.alt="";label.textContent=pnj.name+(window.__explorationState?.allyDiscoveries?.[pnj.id]?" — déjà découvert":" — débloquer");button.disabled=!!window.__explorationState?.allyDiscoveries?.[pnj.id];button.append(image,label);button.onclick=async()=>{button.disabled=true;if(await unlockAllyDiscovery(pnj.id))panel.remove();else button.disabled=false};box.appendChild(button)}
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
  card.className="discoveredAlly";image.src="images/"+pnj.image;image.alt="";title.textContent=pnj.name;state.textContent="Sur autorisation du MJ — combats de world boss uniquement."
  for(const action of pnj.actions){const item=document.createElement("li");item.textContent=action.label+" : "+action.desc;list.appendChild(item)}
  card.append(image,title,state,list);panel.appendChild(card)
 }
}
