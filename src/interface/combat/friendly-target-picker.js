function chooseCombatTarget(playerIds,titleText){
 const combatId=window.__combatSnapshot?.id,owner=combatOwner(getCombatHUDPlayerId()),previousFocus=document.activeElement
 if(typeof combatTargetCancellation==="function")combatTargetCancellation()
 return new Promise(resolve=>{
  const picker=document.createElement("section");picker.id="combatTargetPicker";picker.className="combatTargetPickerPanel";picker.setAttribute("role","dialog");picker.setAttribute("aria-label",titleText||"Choisir une cible")
  picker.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px;z-index:2000000000;background:#101b22;border:1px solid #cda761;border-radius:10px;color:#ffe4ac;font:17px Georgia"
  const title=document.createElement("p");title.textContent=titleText||"Choisir une cible";picker.appendChild(title)
  const hint=document.createElement("p");hint.className="combatTargetPickerHint";hint.textContent="Choisir un allié lance le soin. Annuler ne consomme aucune action.";picker.appendChild(hint)
  let done=false;const finish=value=>{if(done)return;done=true;picker.remove();combatTargetCancellation=null;combatTargetRefresh=null;if(previousFocus?.isConnected)previousFocus.focus?.();resolve(value)}
  const choices=[];for(const id of playerIds){const button=document.createElement("button");button.dataset.combatTarget=id;button.style.cssText="display:block;width:100%;padding:12px;margin:8px 0";button.onclick=()=>{if(!button.disabled)finish(id)};picker.appendChild(button);choices.push([id,button])}
  const cancel=document.createElement("button");cancel.textContent="Annuler";cancel.onclick=()=>finish(null);picker.appendChild(cancel);document.body.appendChild(picker)
  combatTargetCancellation=()=>finish(null);combatTargetRefresh=()=>{if(!combatActive||window.__combatSnapshot?.id!==combatId||window.__combatSnapshot?.phase==="finished"||(owner&&window.__combatSnapshot?.turnState?.currentActorId!==owner)){finish(null);return}for(const [id,button]of choices){const data=id==="eloSummon"?window.__combatSnapshot?.eloSummon:window.__publicCharacters?.[id],hp=data?.hp,max=id==="eloSummon"?data?.maxHP:getCharacterMaxHp(id,data||{});button.disabled=hp!=null&&(hp<=0||hp>=max);button.textContent=(id==="eloSummon"?"John Pork":heroDisplayName(id))+(hp!=null?" — "+hp+" / "+max+" PV":"")+(hp<=0?" — KO":hp>=max?" — PV au maximum":"")}};combatTargetRefresh();choices.find(([,b])=>!b.disabled)?.[1].focus();refreshCombatHUDContext()
 })
}

