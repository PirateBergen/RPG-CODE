function grantAllyActionToPlayers(pnj, action, playerId) {
 if(!isGM)return Promise.resolve(false)
 if(!playerId){openAllyGrantPicker(pnj,action);return Promise.resolve(false)}
 return giveAllyActionToPlayer(pnj,action,playerId)
}
function openAllyGrantPicker(pnj,action,{free=false}={}){
 document.getElementById("allyGrantPicker")?.remove()
 const combatId=window.__combatSnapshot?.id
 const previous=document.activeElement,overlay=document.createElement("div"),box=document.createElement("div"),title=document.createElement("h3"),desc=document.createElement("p")
 overlay.id="allyGrantPicker";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","allyGrantTitle");box.className="allyGrantBox";title.id="allyGrantTitle";title.textContent="À qui donner « "+action.label+" » ?";desc.textContent=combatActive?"Autorisation pour ce combat, utilisable une fois par le personnage choisi. Elle remplace l’autorisation précédente.":"Autorisation hors combat : cinématique et pion uniquement. Le joueur choisira quand invoquer cet allié.";box.append(title,desc);overlay.appendChild(box)
 const close=()=>{overlay.remove();previous?.focus?.()}
 if(free){title.textContent="Qui peut invoquer "+pnj.name+" librement ?";desc.textContent="Place seulement son pion dans ce combat, sans dé, pouvoir ou coût en action. Remplace l’autorisation précédente."}
 for(const id of ["greg","ju","elo"]){const button=document.createElement("button");button.type="button";button.textContent=heroDisplayName(id);button.dataset.hero=id;button.onclick=async()=>{for(const b of box.querySelectorAll("button"))b.disabled=true;try{if(await (free?giveFreeCombatAllyAccess(pnj,id,combatId):giveAllyActionToPlayer(pnj,action,id,combatId))){close();document.getElementById("allyPNJPanel")?.remove()}else close()}finally{for(const b of box.querySelectorAll("button"))b.disabled=false}};box.appendChild(button)}
 const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Annuler";cancel.onclick=close;box.appendChild(cancel)
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();close()}if(event.key==="Tab"){const buttons=[...box.querySelectorAll("button:not(:disabled)")],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 document.body.appendChild(overlay);box.querySelector("button").focus()
}
async function giveFreeCombatAllyAccess(pnj,playerId,expectedCombatId=window.__combatSnapshot?.id){
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  const known=ALLY_PNJS.find(p=>p.id===pnj?.id);if(!known||!known.actions[0]||!PLAYABLE_HEROES.includes(playerId))throw Error("Allié ou joueur inconnu")
  const uid=window.__authUid,revision=persistenceRevision||"initial",grantId=db.ref("game").push().key,time=Date.now()
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||!expectedCombatId||freeAllyCombatId(root)!==expectedCombatId||!root.characters?.[playerId]||root.characters[playerId].hp<=0)return undefined
   if(root.game?.allyBreaks?.[known.id])throw Error("Alliance rompue")
   root.game.playerAllyAccess={scope:"combat-free",pnjName:known.name,actionId:known.actions[0].id,playerId,combatId:expectedCombatId,grantId,time};return root
  })
  if(!result.committed)throw Error("Le combat ou le personnage a changé")
  showNotification("Invocation libre de "+known.name+" autorisée pour "+heroDisplayName(playerId)+" : pion uniquement.");return true
 }catch(error){showNotification("Autorisation non donnée : "+error.message);return false}
}
async function giveAllyActionToPlayer(pnj,action,playerId,expectedCombatId=window.__combatSnapshot?.id){
 if(!expectedCombatId){if(pnj.id==="hel_nidhogg_duo"){showNotification("Cette invocation est réservée au combat contre le Roi");return false}return giveExplorationAllyAccess(pnj,action,playerId)}
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!["greg","ju","elo"].includes(playerId))throw Error("Choisissez Greg, Pika ou Elo.")
  const combatId=expectedCombatId,uid=window.__authUid,revision=persistenceRevision||"initial"
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||!combatId||root.combat?.id!==combatId||root.combat.phase!=="active"||!combatHasWorldBoss(root)||root.combat.usedAllies?.[action.id]||root.game?.allyBreaks?.[pnj.id]||!root.characters?.[playerId]||Number(root.characters[playerId].hp)<=0)return undefined
   if(pnj.id==="hel_nidhogg_duo"&&!helNidhoggAvailability(root).allowed)return undefined
   root.game||={};root.game.playerAllyAccess={pnjName:pnj.name,actionId:action.id,playerId,combatId,time:Date.now()};return root
  })
  if(!result.committed)throw Error("Combat terminé, pouvoir déjà utilisé ou personnage KO.")
  showNotification("✦ "+action.label+" autorisée pour "+heroDisplayName(playerId)+" pendant ce combat.");return true
 }catch(error){showNotification("Autorisation non donnée : "+error.message);return false}
}
