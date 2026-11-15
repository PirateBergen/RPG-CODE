"use strict"

let diceChoiceContext=null,diceChoicePending=false
function closeDiceChoice(){
 const overlay=document.getElementById("diceChoiceModal"),previous=diceChoiceContext?.previousFocus
 overlay?.remove();if(overlay)window.GameWindows?.closed(overlay);diceChoiceContext=null
 previous?.isConnected&&previous.focus?.({preventScroll:true})
}
function diceChoiceState(actor){
 const gm=window.__authRole==="gm",data=window.__publicCharacters?.[actor],state=getCombatTurnState()
 let reason=""
 if(!combatActive||!window.__combatSnapshot?.id)reason="L’initiative se lance au début d’un combat."
 else if(state?.phase!=="rolling")reason="L’ordre du combat est déjà établi."
 else if(actor==="bibi")reason="Bibi partage l’initiative de Greg : choisissez Greg."
 else if(!(state.participants||[]).some(p=>p.id===actor))reason="Choisissez un personnage participant au combat."
 else if(Number.isInteger(state.rolls?.[actor]))reason="L’initiative de ce personnage est déjà enregistrée."
 else if(!canRollInitiativeForActor(actor,state))reason="Ce jet d’initiative est indisponible."
 const effective=data?(window.__combatSnapshot?.phase==="active"&&window.__combatSnapshot.balanceVersion===3?combatCharacter({combat:window.__combatSnapshot,characters:window.__publicCharacters},actor):getEffectiveCharacterData(actor,data)):null
 return {canInitiative:!reason,reason,canChance:!!data&&(gm||window.__authPlayerId===actor),bonus:effective?calibratedLuckBonus(effective):0}
}
function chooseDiceRoll(max){
 if(![4,6,8,10,12,20,100].includes(Number(max)))return
 if(diceChoicePending)return showNotification("Un jet attend sa confirmation.")
 if(window.__authRole!=="gm"&&!myToken)return showNotification("Choisissez votre héros")
 closeDiceChoice()
 const gm=window.__authRole==="gm",overlay=document.createElement("div"),box=document.createElement("section"),title=document.createElement("h2"),description=document.createElement("p"),choices=document.createElement("div"),hint=document.createElement("p"),close=document.createElement("button")
 overlay.id="diceChoiceModal";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Choisir le type de jet");box.className="diceChoiceBox";title.textContent="D"+max+" — quel type de jet ?";description.textContent="Choisissez avant de lancer. Le résultat sera partagé avec la table.";hint.setAttribute("role","status");close.textContent="Annuler";close.onclick=closeDiceChoice;box.append(title,description)
 let actor=gm?"MJ":myToken.id,select=null
 if(gm){const label=document.createElement("label");label.textContent="Lancer pour";select=document.createElement("select");select.setAttribute("aria-label","Lancer pour");for(const id of ["MJ",...COMBAT_CHARACTERS.filter(id=>window.__publicCharacters?.[id])]){const option=document.createElement("option");option.value=id;option.textContent=heroDisplayName(id);select.append(option)}label.append(select);box.append(label)}
 diceChoiceContext={max:Number(max),actor,uid:window.__authUid,revision:persistenceRevision||"initial",combatId:window.__combatSnapshot?.id||null,previousFocus:document.activeElement,select,hint,choices}
 for(const [kind,label]of [["free","Jet libre"],["chance","Jet de Chance"],["initiative","Initiative · D12"]]){const button=document.createElement("button");button.type="button";button.dataset.diceKind=kind;button.textContent=label;button.onclick=()=>performDiceChoice(kind);choices.append(button)}
 box.append(choices,hint,close);overlay.append(box);document.body.append(overlay);if(select)select.onchange=()=>{if(diceChoiceContext){diceChoiceContext.actor=select.value;refreshDiceChoice()}}
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeDiceChoice()}if(event.key==="Tab"){const fields=[...box.querySelectorAll("button:not(:disabled),select")],first=fields[0],last=fields.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 window.GameWindows?.register(overlay,closeDiceChoice);refreshDiceChoice();box.querySelector("select,button")?.focus({preventScroll:true})
}
function refreshDiceChoice(){
 const context=diceChoiceContext;if(!context)return
 if(context.uid!==window.__authUid||context.revision!==(persistenceRevision||"initial")||context.combatId!==(window.__combatSnapshot?.id||null)){closeDiceChoice();return}
 const state=diceChoiceState(context.actor),buttons=context.choices
 buttons.querySelector('[data-dice-kind="chance"]').disabled=!state.canChance
 buttons.querySelector('[data-dice-kind="chance"]').textContent="Jet de Chance · D"+context.max+(state.canChance?" · bonus jusqu’à +"+state.bonus:"")
 buttons.querySelector('[data-dice-kind="initiative"]').disabled=!state.canInitiative
 context.hint.textContent=(state.canChance?"Chance : bonus calculé avec la statistique et l’équipement, plafonné à +2. Le 1 et le maximum naturels sont conservés.":"Pour un jet de Chance, choisissez le personnage concerné.")+" "+(state.canInitiative?"Initiative : D12 avec les bonus du combat, quel que soit le dé cliqué.":state.reason)
}
async function performDiceChoice(kind){
 const context=diceChoiceContext;if(!context||diceChoicePending||!["free","chance","initiative"].includes(kind))return
 refreshDiceChoice();if(diceChoiceContext!==context)return
 const state=diceChoiceState(context.actor);if(kind==="chance"&&!state.canChance||kind==="initiative"&&!state.canInitiative)return
 diceChoicePending=true;closeDiceChoice()
 try{
  if(kind==="initiative"){renderCombatInitiativeOverlay(getCombatTurnState());return await submitInitiativeRoll(context.actor)}
  return await requestReliableDice(context.actor,context.max,undefined,kind==="chance"?"chance":undefined)
 }catch(error){showNotification(error.message)}finally{diceChoicePending=false}
}
document.addEventListener("DOMContentLoaded",()=>setInterval(refreshDiceChoice,500))
