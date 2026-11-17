let bossDossierContext=null,bossTacticSerial=0
let krakenEnemyPanelPreference={combatId:null,collapsed:false}
const krakenAssistancePending=new Set()
function setKrakenEnemyPanelCollapsed(collapsed){
 const panel=document.getElementById("mobAttackPanel");if(!panel)return
 krakenEnemyPanelPreference={combatId:window.__combatSnapshot?.id,collapsed};panel.classList.toggle("krakenEnemyCollapsed",collapsed)
 panel.querySelectorAll(".krakenEnemyFold").forEach(button=>{button.textContent=collapsed?"Ouvrir les attaques":"Replier les attaques";button.setAttribute("aria-expanded",String(!collapsed))})
 if(collapsed)window.GameWindows?.closed(panel,{restoreFocus:false});else window.GameWindows?.register(panel,()=>setKrakenEnemyPanelCollapsed(true),{focusOnOpen:false})
}
function installKrakenEnemyPanelControls(panel){
 const c=window.__combatSnapshot;if(!c||!COMBAT_MOBS.some(slot=>isKrakenEncounter(c[slot])))return
 if(krakenEnemyPanelPreference.combatId!==c.id)krakenEnemyPanelPreference={combatId:c.id,collapsed:false}
 setKrakenEnemyPanelCollapsed(krakenEnemyPanelPreference.collapsed)
}
function closeBossDossier(){const el=document.getElementById("bossDossierModal");el?.remove();if(el)window.GameWindows?.closed(el);bossDossierContext=null}
function appendBossEncounterPanels(panel,mob,slot){
 if(mob.balanceClass!=="world")return
 const box=document.createElement("section");box.className="bossEncounterSummary"
 if(isKrakenEncounter(mob)){const line=document.createElement("p");line.textContent="Phase "+krakenStage(mob)+" / 3 — "+krakenStageName(mob)+(mob.krakenHold?" · "+heroDisplayName(mob.krakenHold.target)+" saisi":"");box.append(line)}
 const publicButton=document.createElement("button");publicButton.textContent="Phase, menace et indices révélés";publicButton.onclick=()=>openBossDossier(slot,false);box.append(publicButton)
 if(mob.chargingSpecial?.reaction){const reaction=document.createElement("button");reaction.textContent="Ouvrir les jets de réaction";reaction.onclick=()=>openCombatReaction(slot);box.append(reaction)}
 if(window.__authRole==="gm"){const notes=document.createElement("button");notes.textContent="Notes MJ — faiblesses et stratégies";notes.onclick=()=>openBossDossier(slot,true);box.append(notes)}
 panel.append(box)
}
async function sendBossTactic(slot,noteId,kind,stage){
 const context=bossDossierContext;if(!context||context.busy)return
 context.busy=true;context.error.textContent="";context.box.setAttribute("aria-busy","true");context.box.querySelectorAll("button").forEach(b=>b.disabled=true)
 try{requireActionAccess({gmOnly:true});requireExplorationConnection();const combatId=context.combatId,revision=persistenceRevision||"initial",id="boss-tactic-"+Date.now()+"-"+(++bossTacticSerial)+"-"+Math.random().toString(36).slice(2),result=await reliableRootTransaction(root=>applyBossTactic(root,window.__authUid,combatId,revision,{slot,noteId,kind,stage},id));if(!result.committed)throw Error("Décision non confirmée")}
 catch(error){context.error.textContent=error.message}finally{if(bossDossierContext===context){context.busy=false;context.signature=null;context.box.removeAttribute("aria-busy");refreshBossDossier()}}
}
function openBossDossier(slot,privateNotes=false){
 const c=window.__combatSnapshot,mob=c?.[slot];if(!combatActive||c?.phase!=="active"||!mob||mob.hp<=0)return
 if(privateNotes&&window.__authRole!=="gm")return
 closeBossDossier();const overlay=document.createElement("div"),box=document.createElement("section"),title=document.createElement("h2"),content=document.createElement("div"),error=document.createElement("p"),close=document.createElement("button")
 overlay.id="bossDossierModal";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",privateNotes?"Notes MJ du world boss":"Informations du world boss");box.className="bossDossierBox";title.textContent=(privateNotes?"Notes MJ — ":"")+heroDisplayName(mob.name);error.setAttribute("role","alert");close.textContent="Fermer — Échap";close.onclick=closeBossDossier;const header=document.createElement("header"),topClose=document.createElement("button");topClose.className="bossDossierClose";topClose.textContent="Fermer";topClose.onclick=closeBossDossier;header.append(title,topClose);box.append(header,content,error,close);overlay.append(box);document.body.append(overlay)
 bossDossierContext={slot,combatId:c.id,name:mob.name,privateNotes,box,content,error,busy:false,signature:null}
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeBossDossier()}if(event.key==="Tab"){const items=[...box.querySelectorAll("button:not(:disabled)")],first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 window.GameWindows?.register(overlay,closeBossDossier);refreshBossDossier();topClose.focus({preventScroll:true})
}
function refreshBossDossier(){
 const ctx=bossDossierContext;if(!ctx)return
 const c=window.__combatSnapshot,mob=c?.[ctx.slot],gm=window.__authRole==="gm"
 if(!combatActive||c?.id!==ctx.combatId||c.phase!=="active"||!mob||mob.name!==ctx.name||mob.hp<=0||ctx.privateNotes&&!gm){closeBossDossier();return}if(ctx.busy)return
 const signature=JSON.stringify([mob,c.turnState,window.__sharedVisualBusy,window.__authRole]);if(signature===ctx.signature)return;ctx.signature=signature
 const scroll=ctx.box.scrollTop;ctx.content.replaceChildren()
 const line=text=>{const p=document.createElement("p");p.textContent=text;ctx.content.append(p)}
 if(isKrakenEncounter(mob)){
  line("Phase "+krakenStage(mob)+" / 3 — "+krakenStageName(mob)+". Seuils : 60 % puis 25 % des PV. Deux actions par tour.")
  line(mob.chargingSpecial?"⚠ "+mob.chargingSpecial.name+" — prête au round "+mob.chargingSpecial.readyRound+(mob.chargingSpecial.reaction?.status==="rolling"?" ; réactions en attente du MJ":""):(krakenSpecialUsed(mob)?"Spéciale de cette phase déjà utilisée ou interrompue.":"La prochaine préparation automatique est possible à partir du round "+mob.krakenNextSpecialRound+"."))
  if(mob.krakenHold)line(heroDisplayName(mob.krakenHold.target)+" est saisi : dégâts infligés −25 %. Libération possible avec une action d’assistance ou encore "+Math.max(0,mob.krakenHold.releaseNeeded-mob.krakenHold.damageTaken)+" dégâts sur le Kraken. L’étreinte dure au plus deux fins de round après la saisie.")
  if(mob.krakenDisorientedActions>0)line("Kraken désorienté : dégâts −20 % pendant "+mob.krakenDisorientedActions+" attaque(s).")
  if(mob.krakenOpeningHits>0)line("Tentacule exposée : les "+mob.krakenOpeningHits+" prochaines actions offensives de héros infligent +25 %.")
 }else line("Deux actions par tour. La spéciale annoncée permet au MJ d’ouvrir un événement de réaction.")
 if(ctx.privateNotes){
  line("Ces notes sont réservées à votre vue MJ. Révéler un indice n’applique pas son effet. Validez la stratégie ou le jet avant d’appliquer une conséquence.")
  for(const note of bossWeaknessNotes(mob.name)){
   const card=document.createElement("section");card.className="bossWeaknessCard";const heading=document.createElement("h3");heading.textContent=note.title;card.append(heading)
   for(const text of ["Indice : "+note.hint,"Stratégie : "+note.strategy,"Effet : "+note.effect,...(note.requiresDefeatedMob?["Condition : "+heroDisplayName(note.requiresDefeatedMob)+" doit avoir été vaincu."]:[])]){const p=document.createElement("p");p.textContent=text;card.append(p)}
   const reveal=document.createElement("button");reveal.textContent=mob.revealedBossNotes?.[note.id]?"Indice déjà révélé":"Révéler cet indice aux joueurs";reveal.disabled=!!mob.revealedBossNotes?.[note.id];reveal.onclick=()=>sendBossTactic(ctx.slot,note.id,"reveal",krakenStage(mob));card.append(reveal)
   if(isKrakenEncounter(mob)){const apply=document.createElement("button"),used=mob.krakenTacticsUsed?.[note.id+"-"+krakenStage(mob)];apply.textContent=used?"Déjà exploitée dans cette phase":"Valider la stratégie et appliquer l’effet";apply.disabled=!!used||note.id==="cannon"&&!mob.chargingSpecial;apply.onclick=()=>sendBossTactic(ctx.slot,note.id,"apply",krakenStage(mob));card.append(apply)}
   ctx.content.append(card)
  }
 }else{
  const notes=Object.values(mob.revealedBossNotes||{});line(notes.length?"Indices révélés par le MJ :":"Aucun indice n’a encore été révélé par le MJ.");for(const note of notes)line(note.title+" — "+note.text)
 }
 ctx.box.lastElementChild.disabled=false;ctx.box.querySelector(".bossDossierClose").disabled=false;ctx.box.scrollTop=scroll
}
function refreshKrakenAssistance(box,actor){
 const old=box?.querySelector(".krakenAssistance");old?.remove();if(!box)return
 const c=window.__combatSnapshot;if(!c||c.phase!=="active")return
 for(const slot of COMBAT_MOBS){const mob=c[slot];if(!isKrakenEncounter(mob)||mob.hp<=0||!mob.krakenHold)continue
  const section=document.createElement("section"),button=document.createElement("button"),hint=document.createElement("p"),key=c.id+":"+actor;section.className="krakenAssistance";button.textContent=mob.krakenHold.target===actor?"Se dégager de la tentacule":"Libérer "+heroDisplayName(mob.krakenHold.target);button.disabled=c.turnState?.currentActorId!==combatOwner(actor)||window.__publicCharacters?.[actor]?.hp<=0||!!c.heroHaste||!!window.__sharedVisualBusy||krakenAssistancePending.has(key);hint.textContent="Consomme votre action · D12 + Chance · seuil "+(mob.krakenHold.target===actor?8:7)
  button.onclick=async()=>{if(button.disabled||krakenAssistancePending.has(key))return;button.disabled=true;krakenAssistancePending.add(key);try{await submitCombatAction("hero",actor,{support:"krakenRelease",target:slot})}catch(error){showNotification(error.message)}finally{krakenAssistancePending.delete(key);refreshCombatActionStates()}};section.append(button,hint);box.prepend(section)
 }
}
function refreshBossEncounterLayout(){const c=window.__combatSnapshot;document.body.classList.toggle("krakenEncounter",!!(combatActive&&c?.phase==="active"&&COMBAT_MOBS.some(slot=>isKrakenEncounter(c[slot])&&c[slot].hp>0)));refreshBossDossier()}
document.addEventListener("DOMContentLoaded",()=>{db.ref("combat").on("value",refreshBossEncounterLayout);setInterval(refreshBossEncounterLayout,1000)})
