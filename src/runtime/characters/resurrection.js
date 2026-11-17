async function revivePlayer(playerId,expectedRevision=persistenceRevision||"initial",expectedCombatId=window.__combatSnapshot?.id||null) {
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!["greg","ju","elo","bibi"].includes(playerId))throw Error("Personnage inconnu.")
  const uid=window.__authUid,time=Date.now()
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==expectedRevision||(root.combat?.id||null)!==expectedCombatId||root.combat?.phase==="finished")return undefined
   const c=root.characters?.[playerId];if(!c||Number(c.hp)>0)return undefined
   c.hp=getCharacterMaxHp(playerId,c);root.game||={};root.game.playerRevive={player:playerId,time};return root
  })
  if(!result.committed)throw Error("Personnage déjà vivant ou partie modifiée. Rouvrez le menu.")
  showNotification(heroDisplayName(playerId)+" revient à la vie avec tous ses PV !");return true
 }catch(error){showNotification("Résurrection non effectuée : "+error.message);return false}
}

function openResurrectionMenu(){
 if(!isGM)return
 document.getElementById("resurrectionMenu")?.remove()
 const revision=persistenceRevision||"initial",combatId=window.__combatSnapshot?.id||null
 const panel=document.createElement("div"),box=document.createElement("div"),title=document.createElement("h3"),description=document.createElement("p")
 panel.id="resurrectionMenu";panel.className="resurrectionMenu";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","resurrectionTitle")
 box.className="allyGrantBox";title.id="resurrectionTitle";title.textContent="Ressusciter un personnage";description.textContent="Relève un personnage KO avec tous ses PV, sans lui donner l’Immortalité quantique."
 box.append(title,description);panel.append(box)
 const previous=document.activeElement,close=()=>{panel.remove();window.GameWindows?.closed(panel);previous?.focus?.()}
 for(const id of ["greg","ju","elo","bibi"]){const button=document.createElement("button");button.type="button";button.textContent=heroDisplayName(id);button.dataset.hero=id;button.disabled=Number(window.__publicCharacters?.[id]?.hp)>0||!window.__publicCharacters?.[id];if(button.disabled)button.textContent+=" — vivant";button.onclick=async()=>{const buttons=[...box.querySelectorAll("button")],disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);try{if(await revivePlayer(id,revision,combatId))close()}finally{buttons.forEach((b,i)=>b.disabled=disabled[i])}};box.append(button)}
 const cancel=document.createElement("button");cancel.textContent="Fermer";cancel.onclick=close;box.append(cancel)
 panel.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();close()}if(event.key==="Tab"){const buttons=[...box.querySelectorAll("button:not(:disabled)")],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 document.body.append(panel);window.GameWindows?.register(panel,close);box.querySelector("button:not(:disabled)")?.focus()
}

/* ========================= */
/* MAP                       */
/* ========================= */



/* ========================= */
/* XP                        */
/* ========================= */

