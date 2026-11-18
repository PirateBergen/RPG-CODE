const kingDecisionsPending=new Set(),kingPlayerPending=new Set()
function currentKingSlot(){const c=window.__combatSnapshot;return c?.phase==="active"?COMBAT_MOBS.find(s=>isKingEncounter(c[s])&&c[s].hp>0):null}
function hasKingOdinCall(){const slot=currentKingSlot();return !!slot&&kingOdinAvailable(window.__combatSnapshot[slot])}
async function sendKingDecision(slot,change){
 requireActionAccess({gmOnly:true});requireExplorationConnection()
 const c=window.__combatSnapshot,mob=c?.[slot],key=c?.id+":"+slot
 if(kingDecisionsPending.has(key))throw Error("Décision du Roi en cours")
 const uid=window.__authUid,id="king-decision-"+Date.now()+"-"+Math.random().toString(36).slice(2),revision=persistenceRevision||"initial",command={...change,slot,phase:kingStage(mob),chargeId:mob?.chargingSpecial?.id||null}
 kingDecisionsPending.add(key)
 try{const result=await reliableRootTransaction(root=>applyKingTactic(root,uid,c.id,revision,command,id));if(!result.committed)throw Error("Décision non confirmée")}
 finally{kingDecisionsPending.delete(key)}
}
function appendKingOdinCall(panel,actor){
 if(!hasKingOdinCall())return
  const slot=currentKingSlot(),button=document.createElement("button"),hint=document.createElement("p")
 button.type="button";button.className="kingOdinCall";button.textContent="Appel des aurores — Odin";button.dataset.kingOdin="true"
 hint.textContent="Trois aurores libérées · sans coût en action · protège le groupe contre Turn Around, même si Odin a été trahi."
 button.onclick=async()=>{button.disabled=true;try{if(window.__authRole==="gm")await sendKingDecision(slot,{kind:"odin"});else{let caller=actor||getLocalPlayerId();if(caller==="greg"&&window.__publicCharacters?.greg?.hp<=0&&window.__publicCharacters?.bibi?.hp>0)caller="bibi";await submitCombatAction("initiative",caller,{kingOdin:true,slot})}}catch(e){showNotification(e.message)}finally{button.disabled=false}}
 panel.append(button,hint)
}
function renderKingDossier(ctx,mob){
 const phase=kingStage(mob),state=mob.king,charge=mob.chargingSpecial,gm=ctx.privateNotes&&window.__authRole==="gm",line=text=>{const p=document.createElement("p");p.textContent=text;ctx.content.append(p)}
 line("Phase "+phase+" / 5 — "+kingPhaseInfo(mob).name+" · Une action offensive par tour ; les Schnaw ont leur propre initiative. Seuils : 80 / 60 / 40 / 20 % des PV. Une seule barre de vie.")
 line(kingPhaseInfo(mob).hint)
 line(charge?"⚠ "+charge.name+" — prête au round "+charge.readyRound+(charge.kingTargets?.length?" · Cible annoncée : "+charge.kingTargets.map(combatFriendlyName).join(", "):""):"Aucune attaque majeure en préparation."+(kingSpecialUsed(mob)?" La majeure de cette phase est déjà utilisée ou interrompue.":""))
 if(state.openingHits>0)line("Roi exposé : les "+state.openingHits+" prochaines actions offensives de héros infligent +25 %.")
 if(phase>=3)line("Schnaw invoqués : "+(state.minionsSummoned||0)+" / 2 au total. Le garde vivant réduit les dégâts reçus par le Roi de 20 %. Aucun renfort infini.")
 if(phase===5){line("Aurores libérées : "+kingAuroraCount(mob)+" / 3. Refuges : "+(state.refugesConfirmed?(state.refugeTargets||[]).map(heroDisplayName).join(", ")||"personne":"validation MJ requise")+". Protections dans les refuges : 25 / 60 / 85 / 100 % pour 0 / 1 / 2 / 3 aurores.");if(state.odinInvoked)line("Odin répond à l’appel des aurores : Turn Around sera arrêté pour tous. Le pacte avec Odin n’a pas été modifié.")}
 const button=(label,fn,disabled=false)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.disabled=disabled;b.onclick=async()=>{b.disabled=true;try{await fn();ctx.signature=null}catch(e){ctx.error.textContent=e.message}finally{b.disabled=false;if(bossDossierContext===ctx)refreshBossDossier()}};ctx.content.append(b);return b}
 if(charge)button(gm?"Ouvrir les réactions / protections":"Voir les jets de réaction",()=>openCombatReaction(ctx.slot),!gm&&!charge.reaction)
 if(!gm){appendKingOdinCall(ctx.content,getLocalPlayerId());return}
 const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Mémo MJ — les cinq phases et leurs parades";details.append(summary)
 KING_PHASES.forEach((p,i)=>{const text=document.createElement("p");text.textContent=(i+1)+". "+p.name+" — "+p.hint;details.append(text)});ctx.content.append(details)
 line("Les joueurs décrivent leur stratégie. Ces boutons valident votre arbitrage sans consommer leur action ; les boutons Stratégies de leur panneau de combat consomment leur action normale.")
 if(phase===2){
  button("Valider l’interruption du drain",()=>sendKingDecision(ctx.slot,{kind:"drain"}),charge?.kingStage!==2)
  button("Valider une perturbation de l’invocation ("+state.disruptions+" / 2)",()=>sendKingDecision(ctx.slot,{kind:"disrupt"}),state.disruptions>=2)
 }
 if(phase===5&&charge?.kingStage===5){
  for(let i=0;i<3;i++)button(state.auroras?.[i]?"Aurore "+(i+1)+" libérée":"Valider la libération de l’aurore "+(i+1),()=>sendKingDecision(ctx.slot,{kind:"aurora",index:i}),!!state.auroras?.[i])
  appendKingOdinCall(ctx.content)
 }
 if(charge?.kingStage===1||charge?.kingStage===5){
  const field=document.createElement("fieldset"),legend=document.createElement("legend");legend.textContent=charge.kingStage===1?"Personnages derrière le pilier":"Personnages ayant rejoint les refuges";field.append(legend)
  if(ctx.kingDraftPhase!==phase){ctx.kingDraftPhase=phase;ctx.kingDraftTargets=state.refugesConfirmed?[...(state.refugeTargets||[])]:COMBAT_CHARACTERS.filter(id=>window.__publicCharacters?.[id]?.hp>0)}
  for(const id of COMBAT_CHARACTERS){if(!(window.__publicCharacters?.[id]?.hp>0))continue;const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=id;input.checked=ctx.kingDraftTargets.includes(id);input.onchange=()=>{ctx.kingDraftTargets=[...field.querySelectorAll("input:checked")].map(el=>el.value)};label.append(input,document.createTextNode(heroDisplayName(id)));field.append(label)}
  ctx.content.append(field)
  button(charge.kingStage===1?"Valider l’abri — détruire un pilier ("+state.pillars+" restants)":"Valider les personnages dans les refuges",()=>sendKingDecision(ctx.slot,{kind:charge.kingStage===1?"pillar":"refuges",targets:ctx.kingDraftTargets}),charge.kingStage===1&&state.pillars<=0)
 }
}
function refreshKingAssistance(box,actor){
 if(!box)return
 if(actor==="greg"&&window.__publicCharacters?.greg?.hp<=0&&window.__publicCharacters?.bibi?.hp>0)actor="bibi"
 const c=window.__combatSnapshot,slot=currentKingSlot(),old=box.querySelector(".kingAssistance")
 if(!slot){old?.remove();return}
 const mob=c[slot],phase=kingStage(mob),key=c.id+":"+actor,signature=JSON.stringify([c.id,c.turnState?.sequence,mob.king,mob.chargingSpecial,actor,window.__sharedVisualBusy,window.__actionOnline,kingPlayerPending.has(key)])
 if(old?.dataset.signature===signature)return
 const expanded=old?.open??true;old?.remove();const section=document.createElement("details"),summary=document.createElement("summary"),hint=document.createElement("p");section.className="kingAssistance";section.dataset.signature=signature;section.open=expanded;summary.textContent="Stratégies — Roi · phase "+phase+" / 5";hint.textContent=kingPhaseInfo(mob).hint;section.append(summary,hint);section.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();section.open=false;summary.focus()}})
 const add=(label,strategy,index)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.dataset.kingStrategy=strategy;b.disabled=c.turnState?.phase!=="active"||c.turnState.currentActorId!==combatOwner(actor)||window.__publicCharacters?.[actor]?.hp<=0||!!c.heroHaste||!!window.__sharedVisualBusy||window.__actionOnline===false||kingPlayerPending.has(key);b.onclick=async()=>{b.disabled=true;kingPlayerPending.add(key);try{await submitCombatAction("hero",actor,{support:"kingStrategy",strategy,index,target:slot})}catch(e){showNotification(e.message)}finally{kingPlayerPending.delete(key);refreshCombatActionStates()}};section.append(b)}
 if(phase===2){if(mob.chargingSpecial?.kingStage===2)add("Briser le lien — action · D12 + Chance, seuil 7","drain");if(mob.king.disruptions<2)add("Perturber l’invocation — action · D12 + Chance, seuil 7","disrupt")}
 if(phase===5&&mob.chargingSpecial?.kingStage===5){for(let i=0;i<3;i++)if(!mob.king.auroras?.[i])add("Libérer l’aurore "+(i+1)+" — une action, sans jet","aurora",i);appendKingOdinCall(section,actor)}
 const info=document.createElement("button");info.type="button";info.textContent="Voir la menace et les stratégies";info.onclick=()=>openBossDossier(slot,false);section.append(info);box.prepend(section)
}
