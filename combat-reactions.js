"use strict"

let combatReactionSerial=0,combatReactionPanel=null
const combatReactionSeen=new Set(),combatReactionRollsInFlight=new Set()

async function sendCombatReaction(change){
 requireActionAccess({gmOnly:true});requireExplorationConnection()
 const combatId=window.__combatSnapshot?.id,revision=persistenceRevision||"initial",id="reaction-"+Date.now()+"-"+(++combatReactionSerial)+"-"+Math.random().toString(36).slice(2)
 const result=await reliableRootTransaction(root=>applyCombatReactionAdjustment(root,window.__authUid,combatId,revision,change,id))
 if(!result.committed)throw Error("Réaction non confirmée")
}
function closeCombatReaction(){const panel=document.getElementById("combatReactionModal");panel?.remove();if(panel)window.GameWindows?.closed(panel);document.body.classList.remove("combatReactionOpen");combatReactionPanel=null}
function combatReactionCanRoll(actor,reaction){
 return reaction?.status==="rolling"&&reaction.participants.includes(actor)&&!reaction.rolls?.[actor]&&!Object.prototype.hasOwnProperty.call(reaction.decisions||{},actor)&&window.__publicCharacters?.[actor]?.hp>0&&(window.__authRole==="gm"||window.__authPlayerId===combatOwner(actor))
}
async function rollCombatReaction(slot,actor){
 const reaction=window.__combatSnapshot?.[slot]?.chargingSpecial?.reaction,key=reaction?.id+":"+actor
 if(!combatReactionCanRoll(actor,reaction)||combatReactionRollsInFlight.has(key))return
 combatReactionRollsInFlight.add(key);refreshCombatReaction()
 try{await submitCombatAction("initiative",actor,{slot,reactionId:reaction.id})}catch(error){showNotification(error.message)}finally{combatReactionRollsInFlight.delete(key);refreshCombatReaction()}
}
function openCombatReaction(slot){
 const c=window.__combatSnapshot,charge=c?.[slot]?.chargingSpecial
 if(!charge||c.phase!=="active"||c[slot].hp<=0)return showNotification("Cette attaque n’est plus en préparation")
 if(window.__authRole!=="gm"&&!charge.reaction)return
 closeCombatReaction()
 const overlay=document.createElement("div"),box=document.createElement("section"),head=document.createElement("h2"),content=document.createElement("div"),error=document.createElement("p"),close=document.createElement("button")
 overlay.id="combatReactionModal";overlay.className="combatReactionModal";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Réactions à une attaque annoncée");box.className="combatReactionBox";head.textContent="Réagir à « "+charge.name+" »";error.setAttribute("role","alert");close.textContent="Fermer la fenêtre";close.onclick=closeCombatReaction
 box.append(head,content,error,close);overlay.append(box);document.body.append(overlay);document.body.classList.add("combatReactionOpen")
 combatReactionPanel={slot,combatId:c.id,chargeKey:combatChargeKey(c[slot]),content,error,busy:false,draft:!charge.reaction,signature:null}
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeCombatReaction()}if(event.key==="Tab"){const items=[...box.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled)")],first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 window.GameWindows?.register(overlay,closeCombatReaction);refreshCombatReaction();box.querySelector("button,input,select")?.focus({preventScroll:true})
}
function reactionButton(parent,label,fn){const button=document.createElement("button");button.type="button";button.textContent=label;button.onclick=fn;parent.append(button);return button}
function reactionField(parent,label,value,min,max){const row=document.createElement("label"),field=document.createElement("input");field.type="number";field.min=min;field.max=max;field.step=1;field.value=value;row.append(document.createTextNode(label),field);parent.append(row);return field}
async function runCombatReactionChange(change){
 const panel=combatReactionPanel;if(!panel||panel.busy)return
 panel.busy=true;panel.error.textContent="";for(const control of panel.content.querySelectorAll("button,input,select"))control.disabled=true
 try{await sendCombatReaction({...change,slot:panel.slot,chargeKey:panel.chargeKey});panel.signature=null}catch(error){panel.error.textContent=error.message}finally{if(combatReactionPanel===panel){panel.busy=false;for(const control of panel.content.querySelectorAll("button,input,select"))control.disabled=false;panel.signature=null;refreshCombatReaction()}}
}
function renderCombatReactionDraft(panel){
 const content=panel.content,description=document.createElement("p"),participants=document.createElement("fieldset"),legend=document.createElement("legend")
 description.textContent="Les joueurs décrivent leur réaction. Choisissez qui lance le dé. Ces jets ne consomment pas leur tour ; vous décidez des protections finales.";legend.textContent="Qui doit lancer ?";participants.append(legend);content.append(description,participants)
 for(const id of COMBAT_CHARACTERS){if(!(window.__publicCharacters?.[id]?.hp>0))continue;const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=id;input.checked=true;label.append(input,document.createTextNode(heroDisplayName(id)));participants.append(label)}
 const diceLabel=document.createElement("label"),dice=document.createElement("select");diceLabel.textContent="Dé de réaction";for(const n of [6,12,20]){const option=document.createElement("option");option.value=n;option.textContent="D"+n;option.selected=n===12;dice.append(option)}diceLabel.append(dice);content.append(diceLabel)
 const threshold=reactionField(content,"Seuil de réussite",8,2,12);dice.onchange=()=>{threshold.max=dice.value;threshold.value=Math.min(Number(threshold.value),Number(dice.value))}
 const reduction=reactionField(content,"Réduction proposée en cas de réussite (%)",50,0,100),presets=document.createElement("div");presets.className="combatReactionPresets";content.append(presets)
 for(const [value,label]of [[20,"20 %"],[25,"Protection · 25 %"],[50,"Abri · 50 %"],[100,"Évitement · 100 %"]])reactionButton(presets,label,()=>reduction.value=value)
 const note=document.createElement("p");note.textContent="Sur échec : 0 % proposé. Le 1 naturel échoue ; la Chance peut aider les autres jets. Vous pouvez remplacer chaque résultat par une décision MJ. Une protection à 100 % annule aussi les effets secondaires de cette attaque.";content.append(note)
 const start=reactionButton(content,"Ouvrir les jets des joueurs",()=>runCombatReactionChange({kind:"start",participants:[...participants.querySelectorAll("input:checked")].map(input=>input.value),dice:Number(dice.value),threshold:Number(threshold.value),successReduction:Number(reduction.value)}));start.dataset.reactionCommand="start"
}
function refreshCombatReaction(){
 const panel=combatReactionPanel;if(!panel)return
 const c=window.__combatSnapshot,mob=c?.[panel.slot],charge=mob?.chargingSpecial,reaction=charge?.reaction
 if(!combatActive||c?.id!==panel.combatId||c.phase!=="active"||!charge||combatChargeKey(mob)!==panel.chargeKey||mob.hp<=0){closeCombatReaction();return}
 if(panel.busy)return
 const signature=JSON.stringify([reaction,window.__authRole,window.__authPlayerId,reaction?.participants.map(id=>window.__publicCharacters?.[id]?.hp>0),[...combatReactionRollsInFlight]])
 if(panel.signature===signature)return;panel.signature=signature
 if(!reaction){if(!panel.draft){closeCombatReaction();return}if(!panel.content.children.length)renderCombatReactionDraft(panel);return}
 const wasDraft=panel.draft,scrollTop=panel.content.parentElement.scrollTop,editedActor=document.activeElement?.dataset.reactionEdit,editedValue=document.activeElement?.value
 panel.draft=false;panel.content.replaceChildren()
 const gm=window.__authRole==="gm",intro=document.createElement("p");intro.textContent="D"+reaction.dice+" · seuil "+reaction.threshold+" · réussite proposée : −"+reaction.successReduction+" %. "+(reaction.status==="ready"?"Protections validées pour cette attaque uniquement.":"L’attaque annoncée attend la validation du MJ. Les tours ordinaires peuvent continuer.");panel.content.append(intro)
 for(const id of reaction.participants){
  const row=document.createElement("section"),title=document.createElement("h3"),result=document.createElement("p"),roll=reaction.rolls?.[id],decided=Object.prototype.hasOwnProperty.call(reaction.decisions||{},id),amount=decided?reaction.decisions[id]:roll?.success?reaction.successReduction:0
  row.className="combatReactionRow";row.dataset.reactionActor=id;title.textContent=heroDisplayName(id);result.textContent=(roll?"Dé : "+roll.roll+(roll.bonus?" + "+roll.bonus+" Chance = "+roll.total:"")+" — "+(roll.success?"réussite":"échec"):decided?"Décision MJ sans jet obligatoire":window.__publicCharacters?.[id]?.hp>0?"En attente du jet":"Personnage KO")+(roll||decided?" · Réduction "+(reaction.status==="ready"||decided?"retenue":"proposée")+" : "+amount+" %":"");row.append(title,result);panel.content.append(row)
  if(combatReactionCanRoll(id,reaction)){const button=reactionButton(row,gm?"Lancer pour "+heroDisplayName(id)+" (MJ)":"Lancer mon D"+reaction.dice,()=>rollCombatReaction(panel.slot,id));button.dataset.reactionRoll=id;button.disabled=combatReactionRollsInFlight.has(reaction.id+":"+id)}
  if(gm&&reaction.status==="rolling"){const field=reactionField(row,"Réduction décidée par le MJ (%)",amount,0,100);field.dataset.reactionEdit=id;if(editedActor===id){field.value=editedValue;field.focus({preventScroll:true})}reactionButton(row,"Appliquer cette décision",()=>runCombatReactionChange({kind:"decision",reactionId:reaction.id,target:id,amount:Number(field.value)}))}
 }
 if(gm&&reaction.status==="rolling")reactionButton(panel.content,"Valider les protections",()=>runCombatReactionChange({kind:"finish",reactionId:reaction.id})).dataset.reactionCommand="finish"
 if(gm&&reaction.status==="ready")reactionButton(panel.content,"Modifier les protections",()=>runCombatReactionChange({kind:"reopen",reactionId:reaction.id})).dataset.reactionCommand="reopen"
 if(gm)reactionButton(panel.content,"Annuler les réactions et retirer leurs protections",()=>runCombatReactionChange({kind:"cancel",reactionId:reaction.id})).dataset.reactionCommand="cancel"
 if(!wasDraft)panel.content.parentElement.scrollTop=scrollTop
}
function syncCombatReactions(){
 const c=window.__combatSnapshot,gm=window.__authRole==="gm",playing=gameStarted&&document.body.dataset.entryStage==="playing"
 let bar=document.getElementById("combatReactionBar");refreshCombatReaction()
 if(!playing||!combatActive||c?.phase!=="active"){bar?.remove();return}
 const slots=COMBAT_MOBS.filter(slot=>c[slot]?.hp>0&&c[slot].chargingSpecial&&(gm||c[slot].chargingSpecial.reaction))
 if(!slots.length){bar?.remove();return}
 const signature=JSON.stringify([c.id,gm,slots.map(slot=>[slot,c[slot].chargingSpecial])])
 if(bar?.dataset.signature===signature)return
 bar?.remove()
 bar=document.createElement("div");bar.id="combatReactionBar"
 bar.dataset.signature=signature
 for(const slot of slots){const charge=c[slot].chargingSpecial,reaction=charge.reaction;const button=reactionButton(bar,heroDisplayName(c[slot].name)+" · "+(reaction?.status==="ready"?"Protections prêtes":reaction?"Jets de réaction":"Faire réagir les joueurs"),()=>openCombatReaction(slot));button.dataset.reactionSlot=slot
  if(reaction&&!combatReactionSeen.has(c.id+":"+reaction.id)){combatReactionSeen.add(c.id+":"+reaction.id);if(!combatReactionPanel)openCombatReaction(slot)}
 }
 document.body.append(bar)
}
document.addEventListener("DOMContentLoaded",()=>{db.ref("combat").on("value",syncCombatReactions);setInterval(syncCombatReactions,1000)})
