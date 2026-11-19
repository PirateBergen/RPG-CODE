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
 if(gm)line(kingPhaseInfo(mob).hint)
 line(charge?"⚠ "+charge.name+" — prête au round "+charge.readyRound+(charge.kingTargets?.length?" · Cible annoncée : "+charge.kingTargets.map(combatFriendlyName).join(", "):""):"Aucune attaque majeure en préparation."+(kingSpecialUsed(mob)?" La majeure de cette phase est déjà utilisée ou interrompue.":""))
 if(state.openingHits>0)line("Roi exposé : les "+state.openingHits+" prochaines actions offensives de héros infligent +25 %.")
 if(phase>=3)line("Schnaw invoqués : "+(state.minionsSummoned||0)+" / 2 au total. Le garde vivant réduit les dégâts reçus par le Roi de 20 %. Aucun renfort infini.")
 if(phase===5){line("Aurores libérées : "+kingAuroraCount(mob)+" / 3. Refuges : "+(state.refugesConfirmed?(state.refugeTargets||[]).map(heroDisplayName).join(", ")||"personne":"validation MJ requise")+". Protections dans les refuges : 25 / 60 / 85 / 100 % pour 0 / 1 / 2 / 3 aurores.");if(state.odinInvoked)line("Odin répond à l’appel des aurores : Turn Around sera arrêté pour tous. Le pacte avec Odin n’a pas été modifié.")}
 const button=(label,fn,disabled=false)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.disabled=disabled;b.onclick=async()=>{b.disabled=true;try{await fn();ctx.signature=null}catch(e){ctx.error.textContent=e.message}finally{b.disabled=false;if(bossDossierContext===ctx)refreshBossDossier()}};ctx.content.append(b);return b}
 if(charge)button(gm?"Ouvrir les réactions / protections":"Voir les jets de réaction",()=>openCombatReaction(ctx.slot),!gm&&!charge.reaction)
 if(!gm)return
 const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Mémo MJ — les cinq phases et leurs parades";details.append(summary)
 KING_PHASES.forEach((p,i)=>{const text=document.createElement("p");text.textContent=(i+1)+". "+p.name+" — "+p.hint;details.append(text)});ctx.content.append(details)
 line("Les joueurs décrivent leur stratégie. Ces boutons valident votre arbitrage sans consommer leur action ; les solutions restent à votre discrétion.")
 if(phase===2){
  button("Valider l’interruption du drain",()=>sendKingDecision(ctx.slot,{kind:"drain"}),charge?.kingStage!==2)
  button("Valider une perturbation de l’invocation ("+state.disruptions+" / 2)",()=>sendKingDecision(ctx.slot,{kind:"disrupt"}),state.disruptions>=2)
 }
 if(phase===5&&charge?.kingStage===5){
  for(let i=0;i<3;i++)button(state.auroras?.[i]?"Aurore "+(i+1)+" libérée":"Valider la libération de l’aurore "+(i+1),()=>sendKingDecision(ctx.slot,{kind:"aurora",index:i}),!!state.auroras?.[i])
  appendKingOdinCall(ctx.content)
 }
 if(charge)button("Régler les protections avant l’impact",()=>openKingProtection(ctx.slot))
 if(charge?.kingStage===5){
  const field=document.createElement("fieldset"),legend=document.createElement("legend");legend.textContent="Personnages ayant rejoint les refuges";field.append(legend)
  if(ctx.kingDraftPhase!==phase){ctx.kingDraftPhase=phase;ctx.kingDraftTargets=state.refugesConfirmed?[...(state.refugeTargets||[])]:COMBAT_CHARACTERS.filter(id=>window.__publicCharacters?.[id]?.hp>0)}
  for(const id of COMBAT_CHARACTERS){if(!(window.__publicCharacters?.[id]?.hp>0))continue;const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=id;input.checked=ctx.kingDraftTargets.includes(id);input.onchange=()=>{ctx.kingDraftTargets=[...field.querySelectorAll("input:checked")].map(el=>el.value)};label.append(input,document.createTextNode(heroDisplayName(id)));field.append(label)}
  ctx.content.append(field)
  button("Valider les personnages dans les refuges",()=>sendKingDecision(ctx.slot,{kind:"refuges",targets:ctx.kingDraftTargets}))
 }
}
function refreshKingAssistance(box,actor){box?.querySelector(".kingAssistance")?.remove()}

function closeKingProtection(){const modal=document.getElementById("kingProtectionModal");if(modal){modal.remove();window.GameWindows?.closed(modal)}}
function openKingProtection(slot,onValidated){
 if(window.__authRole!=="gm")return
 const c=window.__combatSnapshot,mob=c?.[slot],charge=mob?.chargingSpecial
 if(!isKingEncounter(mob)||!charge)return
 closeKingProtection()
 const combatId=c.id,chargeId=charge.id,overlay=document.createElement("div"),box=document.createElement("section"),title=document.createElement("h2"),intro=document.createElement("p"),error=document.createElement("p"),save=document.createElement("button"),cancel=document.createElement("button")
 overlay.dataset.combatId=combatId;overlay.dataset.chargeId=chargeId;overlay.dataset.slot=slot;overlay.id="kingProtectionModal";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Protections MJ — "+charge.name);box.className="bossDossierBox";title.textContent="Avant l’impact — "+charge.name
 intro.textContent="Réservé au MJ. Décidez selon les actions décrites. Une protection ne change pas les cibles annoncées : "+(charge.kingTargets||[]).map(combatFriendlyName).join(", ")+". Tous les choix doivent être validés, même si tous les personnages restent exposés."
 box.append(title,intro);const rows=[]
 const actors=[...COMBAT_CHARACTERS,...(c.eloSummon?.active&&c.eloSummon.hp>0?["eloSummon"]:[])].filter(id=>id==="eloSummon"||window.__publicCharacters?.[id]?.hp>0)
 for(const id of actors){
  const row=document.createElement("fieldset"),legend=document.createElement("legend"),select=document.createElement("select"),percent=document.createElement("input"),label=document.createElement("label")
  row.dataset.kingProtection=id;legend.textContent=combatFriendlyName(id);select.setAttribute("aria-label",combatFriendlyName(id)+" — protection")
  for(const [value,text]of [["exposed","Exposé — dégâts normaux"],["hidden","Caché / protégé — aucun dégât"],["reduced","Dégâts réduits"]]){const option=document.createElement("option");option.value=value;option.textContent=text;select.append(option)}
  const previous=charge.kingProtections?.[id]||0;select.value=previous===100?"hidden":previous>0?"reduced":"exposed";percent.type="number";percent.min="0";percent.max="100";percent.step="1";percent.value=previous>0&&previous<100?previous:50;percent.setAttribute("aria-label",combatFriendlyName(id)+" — réduction en pourcentage");label.append(document.createTextNode("Réduction (%) "),percent);label.hidden=select.value!=="reduced";select.onchange=()=>{label.hidden=select.value!=="reduced"};row.append(legend,select,label);box.append(row);rows.push({id,select,percent})
 }
 error.setAttribute("role","alert");save.textContent=onValidated?"Valider et lancer l’attaque":"Valider les protections";cancel.textContent="Fermer — Échap";cancel.onclick=closeKingProtection
 save.onclick=async()=>{save.disabled=true;try{
  const snapshot=window.__combatSnapshot;if(snapshot?.id!==combatId||snapshot[slot]?.chargingSpecial?.id!==chargeId)throw Error("L’attaque annoncée a changé")
  const decisions=Object.fromEntries(rows.map(({id,select,percent})=>[id,select.value==="hidden"?100:select.value==="reduced"?Number(percent.value):0]));if(Object.values(decisions).some(n=>!Number.isInteger(n)||n<0||n>100))throw Error("Choisissez une réduction entière de 0 à 100 %")
  await sendKingDecision(slot,{kind:"protections",decisions});closeKingProtection();if(onValidated)await onValidated()
 }catch(e){error.textContent=e.message;save.disabled=false}}
 box.append(error,save,cancel);overlay.append(box);document.body.append(overlay);overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeKingProtection()}});window.GameWindows?.register(overlay,closeKingProtection);save.focus({preventScroll:true})
}

let kingProtectionPrompted=null
function refreshKingProtectionPrompt(){
 if(window.__authRole!=="gm"||window.__sharedVisualBusy||document.getElementById("kingScene")||document.getElementById("bossDossierModal")||document.getElementById("kingProtectionModal"))return
 const c=window.__combatSnapshot,slot=currentKingSlot(),charge=c?.[slot]?.chargingSpecial,ts=c?.turnState
 if(!slot||!charge||charge.kingProtectionsConfirmed||ts?.phase!=="active"||ts.currentActorId!==slot||ts.round<charge.readyRound)return
 const key=c.id+":"+charge.id;if(kingProtectionPrompted===key)return;kingProtectionPrompted=key;openKingProtection(slot)
}
