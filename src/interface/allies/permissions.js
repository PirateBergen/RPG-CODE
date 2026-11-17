function grantAllyActionToPlayers(pnj, action, playerId) {
 if(!isGM)return Promise.resolve(false)
 if(!playerId){openAllyGrantPicker(pnj,action);return Promise.resolve(false)}
 return giveAllyActionToPlayer(pnj,action,playerId)
}
function openAllyGrantPicker(pnj,action){
 document.getElementById("allyGrantPicker")?.remove()
 const combatId=window.__combatSnapshot?.id
 const previous=document.activeElement,overlay=document.createElement("div"),box=document.createElement("div"),title=document.createElement("h3"),desc=document.createElement("p")
 overlay.id="allyGrantPicker";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","allyGrantTitle");box.className="allyGrantBox";title.id="allyGrantTitle";title.textContent="À qui donner « "+action.label+" » ?";desc.textContent=combatActive?"Autorisation pour ce combat, utilisable une fois par le personnage choisi. Elle remplace l’autorisation précédente.":"Autorisation hors combat : cinématique et pion uniquement. Le joueur choisira quand invoquer cet allié.";box.append(title,desc);overlay.appendChild(box)
 const close=()=>{overlay.remove();previous?.focus?.()}
 for(const id of ["greg","ju","elo"]){const button=document.createElement("button");button.type="button";button.textContent=heroDisplayName(id);button.dataset.hero=id;button.onclick=async()=>{for(const b of box.querySelectorAll("button"))b.disabled=true;try{if(await giveAllyActionToPlayer(pnj,action,id,combatId)){close();document.getElementById("allyPNJPanel")?.remove()}else close()}finally{for(const b of box.querySelectorAll("button"))b.disabled=false}};box.appendChild(button)}
 const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Annuler";cancel.onclick=close;box.appendChild(cancel)
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();close()}if(event.key==="Tab"){const buttons=[...box.querySelectorAll("button:not(:disabled)")],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 document.body.appendChild(overlay);box.querySelector("button").focus()
}
async function giveAllyActionToPlayer(pnj,action,playerId,expectedCombatId=window.__combatSnapshot?.id){
 if(!expectedCombatId)return giveExplorationAllyAccess(pnj,action,playerId)
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!["greg","ju","elo"].includes(playerId))throw Error("Choisissez Greg, Pika ou Elo.")
  const combatId=expectedCombatId,uid=window.__authUid,revision=persistenceRevision||"initial"
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||!combatId||root.combat?.id!==combatId||root.combat.phase!=="active"||!combatHasWorldBoss(root)||root.combat.usedAllies?.[action.id]||!root.characters?.[playerId]||Number(root.characters[playerId].hp)<=0)return undefined
   root.game||={};root.game.playerAllyAccess={pnjName:pnj.name,actionId:action.id,playerId,combatId,time:Date.now()};return root
  })
  if(!result.committed)throw Error("Combat terminé, pouvoir déjà utilisé ou personnage KO.")
  showNotification("✦ "+action.label+" autorisée pour "+heroDisplayName(playerId)+" pendant ce combat.");return true
 }catch(error){showNotification("Autorisation non donnée : "+error.message);return false}
}
