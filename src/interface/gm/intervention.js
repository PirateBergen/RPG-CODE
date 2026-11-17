"use strict"
let gmAdjustmentSerial=0
function gmArbitrationClose(){const el=document.getElementById("gmArbitrationModal");el?.remove();if(el)window.GameWindows?.closed(el)}
function renderGMArbitration(){
 const c=window.__combatSnapshot,playing=gameStarted&&document.body.dataset.entryStage==="playing",button=document.getElementById("gmInterveneBtn")
 if(button){button.textContent="Intervenir";button.title="Ajouter un état, le retirer ou ajuster les PV";button.style.display=playing&&window.__authRole==="gm"&&c?.phase==="active"&&c.turnState?.phase==="active"?"":"none"}
 document.getElementById("gmArbitrationBanner")?.remove()
 const modal=document.getElementById("gmArbitrationModal");if(modal&&(!playing||c?.id!==modal.dataset.combatId||c?.phase!=="active"))gmArbitrationClose()
 syncGMStatusBadges()
}
function syncGMArbitration(){clearLegacyGMIntervention();renderGMArbitration()}
function syncGMStatusBadges(){
 document.querySelectorAll(".gmStatusBadges").forEach(el=>el.remove())
 if(!combatActive)return
 for(const [id,states]of Object.entries(window.__combatSnapshot?.gmStates||{})){
  const token=document.getElementById(COMBAT_MOBS.includes(id)?id==="mob"?"mobToken":"mobToken_"+id:id);if(!token)continue
  const box=document.createElement("div");box.className="gmStatusBadges"
  for(const [key,state]of Object.entries(states)){const def=GM_COMBAT_STATES[key];if(!def)continue;const badge=document.createElement("span");badge.textContent=def.icon;badge.title=def.label+" — "+state.turns+" "+def.unit+". "+def.description;box.appendChild(badge)}
  token.appendChild(box)
 }
}
async function sendGMCombatAdjustment(change,expectedCombatId=window.__combatSnapshot?.id){
 requireActionAccess({gmOnly:true});requireExplorationConnection()
 const uid=window.__authUid,revision=persistenceRevision||"initial",changeId="gm-"+Date.now()+"-"+(++gmAdjustmentSerial)+"-"+Math.random().toString(36).slice(2)
 const result=await reliableRootTransaction(root=>applyGMCombatAdjustment(root,uid,expectedCombatId,revision,change,changeId))
 if(!result.committed)throw Error("Ajustement non confirmé")
 return true
}
function openGMIntervention(){
 if(window.__authRole!=="gm")return
 const c=window.__combatSnapshot;if(!combatActive||c?.phase!=="active"||c.turnState?.phase!=="active")return showNotification("Disponible après les initiatives, pendant un combat actif.")
 gmArbitrationClose()
 const overlay=document.createElement("div"),panel=document.createElement("section"),title=document.createElement("h2"),intro=document.createElement("p"),error=document.createElement("p"),targetBox=document.createElement("div"),stateBox=document.createElement("div"),description=document.createElement("p"),fields=document.createElement("div"),current=document.createElement("div"),history=document.createElement("div")
 overlay.id="gmArbitrationModal";overlay.dataset.combatId=c.id;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Intervenir — états et PV");panel.className="gmInterventionBox";title.textContent="Intervenir — états et PV";intro.textContent="Choisissez une cible. Les ajustements ne consomment pas d’action. Un état remplace l’état MJ du même type. Les autres effets du jeu restent en place.";error.setAttribute("role","alert");error.className="gmInterventionError"
 panel.append(title,intro,error,targetBox,stateBox,description,fields,current,history);overlay.appendChild(panel);document.body.appendChild(overlay)
 let selected="greg",stateKey="paralysis",busy=false
 const button=(parent,label,fn)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=fn;parent.appendChild(b);return b}
 const input=(label,value,min,max)=>{const row=document.createElement("label"),field=document.createElement("input");row.textContent=label;field.type="number";field.value=value;field.min=min;field.max=max;field.step=1;row.appendChild(field);fields.appendChild(row);return field}
 const apply=async change=>{if(busy)return;busy=true;error.textContent="";overlay.setAttribute("aria-busy","true");const controls=[...panel.querySelectorAll("button,input,select")];controls.forEach(e=>e.disabled=true);try{await sendGMCombatAdjustment({...change,target:selected},c.id);renderCurrent()}catch(e){error.textContent=e.message}finally{busy=false;overlay.removeAttribute("aria-busy");controls.forEach(e=>e.disabled=false)}}
 for(const id of [...COMBAT_CHARACTERS,...COMBAT_MOBS]){if(COMBAT_MOBS.includes(id)&&!c[id])continue;const label=COMBAT_MOBS.includes(id)?heroDisplayName(c[id].name)+" — ennemi "+(COMBAT_MOBS.indexOf(id)+1):heroDisplayName(id),b=button(targetBox,label,()=>{selected=id;for(const item of targetBox.children)item.setAttribute("aria-pressed",String(item===b));renderCurrent()});b.dataset.target=id;b.setAttribute("aria-pressed",String(id===selected))}
 targetBox.className="gmInterventionTargets";stateBox.className="gmInterventionStates"
 const paint=()=>{const def=GM_COMBAT_STATES[stateKey];description.textContent=def.description+" "+(def.unit==="rounds"?"La durée diminue à chaque fin de round ; les effets périodiques se déclenchent avant de diminuer.":"La durée compte les tours complets de cette cible, pas les rounds. Si son tour est en cours et qu’elle ne peut plus agir, il est passé immédiatement.");fields.replaceChildren();const turns=input("Durée ("+def.unit+")",1,1,99),amount=stateKey==="paralysis"?null:input(["weakened","vulnerable","protected"].includes(stateKey)?"Valeur":"PV par fin de round",5,1,50000);let mode="points";if(["weakened","vulnerable","protected"].includes(stateKey)){const choices=document.createElement("div");fields.appendChild(choices);for(const value of ["points","percent"]){const b=button(choices,value==="points"?"Points":"Pourcentage",()=>{mode=value;amount.max=value==="percent"?100:50000;for(const x of choices.children)x.setAttribute("aria-pressed",String(x===b))});b.setAttribute("aria-pressed",String(value===mode))}}button(fields,"Appliquer « "+def.label+" »",()=>apply({kind:"state",state:stateKey,turns:Number(turns.value),amount:amount?Number(amount.value):0,mode}))}
 for(const [key,def]of Object.entries(GM_COMBAT_STATES)){const b=button(stateBox,def.icon+" "+def.label,()=>{stateKey=key;for(const x of stateBox.children)x.setAttribute("aria-pressed",String(x===b));paint()});b.dataset.state=key;b.setAttribute("aria-pressed",String(key===stateKey))}
 const hp=document.createElement("fieldset"),legend=document.createElement("legend"),value=document.createElement("input");legend.textContent="Ajuster les PV de la cible";value.type="number";value.min=0;value.max=50000;value.step=1;value.value=10;value.setAttribute("aria-label","Montant de PV");hp.append(legend,value);for(const [operation,label]of [["damage","Retirer des PV"],["heal","Soigner / réanimer"],["set","Fixer les PV"]])button(hp,label,()=>apply({kind:"hp",operation,amount:Number(value.value)}));panel.insertBefore(hp,current)
 const note=document.createElement("p");note.textContent="Les PV restent entre 0 et le maximum. Le MJ peut modifier même les PV d’un ennemi invulnérable. Mettre la dernière cible à 0 déclenche normalement la victoire ou la défaite.";hp.appendChild(note)
 function renderCurrent(){current.replaceChildren();const heading=document.createElement("h3"),root={combat:window.__combatSnapshot,characters:window.__publicCharacters},target=gmTarget(root,selected);heading.textContent="Cible : "+(COMBAT_MOBS.includes(selected)?heroDisplayName(target?.name):heroDisplayName(selected))+" — "+(target?.hp??"?")+" PV";current.appendChild(heading);const states=gmStateMap(root,selected);for(const [key,state]of Object.entries(states)){const def=GM_COMBAT_STATES[key];if(!def)continue;button(current,"Retirer "+def.label+" — "+state.turns+" "+def.unit,()=>apply({kind:"remove",state:key}))}if(Object.keys(states).length)button(current,"Retirer tous les états MJ de cette cible",()=>apply({kind:"clear"}));history.replaceChildren();const label=document.createElement("h3");label.textContent="Derniers ajustements MJ";history.appendChild(label);for(const entry of Object.values(window.__combatSnapshot?.gmAdjustmentLog||{}).slice(-8).reverse()){const line=document.createElement("p");line.textContent=entry.text;history.appendChild(line)}}
 overlay.__refreshCurrent=renderCurrent;paint();renderCurrent();button(panel,"Fermer",()=>{if(!busy)gmArbitrationClose()});overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();if(!busy)gmArbitrationClose()}if(event.key==="Tab"){const items=[...panel.querySelectorAll("button:not(:disabled),input:not(:disabled)")],first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});window.GameWindows?.register(overlay,gmArbitrationClose);targetBox.querySelector("button")?.focus({preventScroll:true})
}
document.addEventListener("DOMContentLoaded",()=>db.ref("combat").on("value",()=>{clearLegacyGMIntervention();renderGMArbitration();document.getElementById("gmArbitrationModal")?.__refreshCurrent?.();requestAnimationFrame(syncGMStatusBadges)}))

let gmLegacyClearing=false
async function clearLegacyGMIntervention(){if(gmLegacyClearing||window.__authRole!=="gm"||window.__sessionBusy||(!window.__combatSnapshot?.pendingResolution&&!window.__combatSnapshot?.interventionArmed))return;gmLegacyClearing=true;try{const id=window.__combatSnapshot.id;await reliableRootTransaction(root=>{if(root?.roles?.[window.__authUid]!=="gm"||root.sessionControl?.phase||root.combat?.id!==id)return undefined;if(!root.combat.pendingResolution&&!root.combat.interventionArmed)return undefined;delete root.combat.pendingResolution;delete root.combat.interventionArmed;return root})}catch(error){console.warn("Ancienne intervention",error.message)}finally{gmLegacyClearing=false}}
