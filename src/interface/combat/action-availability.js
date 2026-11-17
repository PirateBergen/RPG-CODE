function combatActionAvailability(actor, attack, special=false, enemy=false) {
  const c=window.__combatSnapshot, players=window.__publicCharacters||{}, state=c?.turnState
  const blocked=label=>({disabled:true,label})
  if(attack?.name==="Le Bibi"&&players.bibi?.hp<=0)return blocked("Bibi est KO — attaque indisponible")
  if(attack?.name==="Le Bibi"&&gmParalyzed({combat:c},"bibi"))return blocked("Bibi est paralysée par le MJ")
  if(attack?.name!=="Passer le tour"&&!(actor==="greg"&&attack?.name==="Le Bibi"&&players.bibi?.hp>0)&&gmParalyzed({combat:c},actor))return blocked("Paralysé par le MJ — "+c.gmStates[actor].paralysis.turns+" tour(s)")
  if(!enemy&&c?.heroHaste&&attack?.name!=="Passer le tour"&&(attack?.name==="Le Bibi"||c.heroHaste.actor!==actor||special||getPlayerAttackTypeKey(attack)==="heal"))return blocked("SKARO’H : attaque basique du personnage uniquement")
  if(special&&(enemy?c?.[actor]?.specialUsed:c?.playerSpecials?.[actor]))return blocked("Déjà utilisée dans ce combat")
  if(attack?.pikaKind==="hypnosis"){const left=pikaRechargeLeft(c);if(left)return blocked("Recharge : "+left+" tour"+(left>1?"s":"")+" restant"+(left>1?"s":""))}
  if(enemy&&c?.[actor]?.lastAttack===attack?.name&&!special&&getMobAttacksForMob(c[actor].name,c[actor].tier).length>1)return blocked("Recharge : utilisez une autre attaque ou passez")
  if(window.__actionOnline===false)return blocked("Connexion perdue — actions suspendues")
  if(window.__sessionBusy)return blocked("Synchronisation de la partie")
  if(!c||c.phase==="finished")return blocked("Combat terminé")
  if(state?.phase==="rolling")return blocked("Jets d’initiative en cours")
  if(c.pendingResolution)return blocked("Décision du MJ en attente")
  if(state?.currentActorId!==combatOwner(actor))return blocked("En attente du tour de "+(enemy?heroDisplayName(c[actor]?.name):combatOwner(actor)==="greg"?"Greg et Bibi":heroDisplayName(combatOwner(actor))))
  if(window.__sharedVisualBusy||Date.now()<(window.__combatIntroUntil||0))return blocked("Animation en cours — patientez")
  if(enemy?window.__mobAttackResolving:window.__playerAttackResolving)return blocked("Action en cours — patientez")
  const bibiInstead=actor==="greg"&&["Le Bibi","Passer le tour"].includes(attack?.name)&&players.bibi?.hp>0
  if(!enemy&&players[actor]?.hp<=0&&!bibiInstead)return blocked("Personnage KO")
  if(enemy&&c[actor]?.hp<=0)return blocked("Adversaire KO")
  if(enemy&&special&&c[actor]?.balanceClass==="world"){
    const charge=c[actor].chargingSpecial,round=state?.round||1
    if(charge?.reaction?.status==="rolling")return blocked("Réactions : attendez la validation des protections par le MJ")
    if(charge&&round<charge.readyRound)return blocked("Préparation : encore "+(charge.readyRound-round)+" round(s)")
    return {disabled:false,label:charge?"Prête à déclencher":"Disponible — annoncer la spéciale"}
  }
  if(special&&!enemy){
    const rule=attack.rule
    if(rule==="mob_below_half"||rule==="mob_below_forty"||rule==="mob_used_special"){
      const valid=livingMobs(c).some(id=>isPlayerSpecialConditionMet(actor,attack,{mob:c[id],players}))
      return valid?{disabled:false,label:"Disponible — choisissez une cible remplissant la condition"}:blocked("Condition manquante : "+attack.conditionText)
    }
    const known=window.__combatConditionCharacters||{}
    const ids=rule==="ally_below_twenty"?COMBAT_CHARACTERS.filter(id=>id!==actor):rule==="ally_below_sixty"?COMBAT_CHARACTERS:rule==="greg_below_twenty"?["greg"]:rule==="self_below_seventy"?[actor]:[]
    if(ids.length){
      const trusted=ids.filter(id=>known[id]&&canAccessCharacter(id))
      const partial=Object.fromEntries(trusted.map(id=>[id,known[id]]))
      const met=trusted.length>0&&(!["greg_below_twenty","self_below_seventy"].includes(rule)||trusted.length===ids.length)&&isPlayerSpecialConditionMet(actor,attack,{players:partial,charData:partial[actor]||{}})
      if(met)return {disabled:false,label:"Disponible — condition remplie"}
      if(trusted.length===ids.length)return blocked("Condition manquante : "+attack.conditionText)
      return {disabled:false,label:"Condition contrôlée au lancement"}
    }
  }
  if(!enemy&&getPlayerAttackTypeKey(attack)!=="heal"&&attack?.name!=="Passer le tour"){const slots=livingMobs(c);if(slots.length&&slots.every(slot=>!combatTargetEligibility(attack,actor,special,slot).allowed))return blocked("Aucune cible admissible — "+combatTargetEligibility(attack,actor,special,slots[0]).reason)}
  return {disabled:false,label:attack?.pikaKind==="cancan"?"Disponible — contact requis avec la cible":"Disponible"}
}
function bindCombatActionState(block,actor,attack,special=false,enemy=false) {
  const activate=block.onclick
  block.dataset.combatActor=actor;block.dataset.combatAttack=attack.name
  const status=document.createElement("div");status.className="combatActionState";status.setAttribute("aria-live","polite");block.appendChild(status)
  const target=document.createElement("div");target.className="combatActionTarget";block.appendChild(target)
  block.setAttribute("role","button");block.tabIndex=0
  block._refreshCombatAction=()=>{
    const value=combatActionAvailability(actor,attack,special,enemy)
    status.textContent=value.label
    target.textContent=combatActionTargetText(actor,attack,special,enemy)
    block.setAttribute("aria-disabled",String(value.disabled))
    block.classList.toggle("combatAction--unavailable",value.disabled)
    block.title=value.label
    return value
  }
  block.onclick=event=>{const value=block._refreshCombatAction();if(value.disabled){showNotification(value.label);return}return activate?.call(block,event)}
  block.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();block.click()}}
  block._refreshCombatAction()
}
function refreshCombatActionStates() {
  if(typeof renderWorldBossFlee==="function")renderWorldBossFlee(window.__combatSnapshot)
  refreshCombatHUDContext()
  if(typeof combatTargetRefresh==="function")combatTargetRefresh()
  document.querySelectorAll("[data-combat-actor]").forEach(block=>block._refreshCombatAction?.())
}


function stopCombatStatsSubscription(){if(window.__combatStatsRef&&window.__combatStatsCb)window.__combatStatsRef.off("value",window.__combatStatsCb);window.__combatStatsRef=null;window.__combatStatsCb=null}

function combatEnemyLabel(slot){const mob=window.__combatSnapshot?.[slot];return heroDisplayName(mob?.name||"Ennemi")+" · n° "+(COMBAT_MOBS.indexOf(slot)+1)}
function combatTargetEligibility(attack,actor,special,slot){
 const c=window.__combatSnapshot,mob=c?.[slot];if(!mob||mob.hp<=0)return {allowed:false,reason:"Adversaire KO"}
 if(special&&["mob_below_half","mob_below_forty","mob_used_special"].includes(attack?.rule)&&!isPlayerSpecialConditionMet(actor,attack,{mob}))return {allowed:false,reason:attack.conditionText||"Condition non remplie"}
 if(attack?.pikaKind==="cancan"||(actor==="greg"&&attack?.name==="Chat Bite (CaC)")){
  const tokens=window.__tokenPositions||{},a=tokens[actor],key=slot==="mob"?"mobToken":"mobToken_"+slot
  const positions=slot==="mob"?[tokens[key],mob,c.presentation?.positions?.[key]]:[mob,tokens[key],c.presentation?.positions?.[key]]
  const b=positions.find(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))
  if(!Number.isFinite(a?.x)||!Number.isFinite(a?.y)||!b)return {allowed:true,reason:"Contact vérifié au lancement"}
  if(Math.hypot(a.x-b.x,a.y-b.y)>180)return {allowed:false,reason:"Hors de portée — rapprochez votre pion"}
  return {allowed:true,reason:"Au contact"}
 }
 return {allowed:true,reason:""}
}
function combatActionTargetText(actor,attack,special=false,enemy=false){
 if(enemy||attack?.name==="Passer le tour")return ""
 if(getPlayerAttackTypeKey(attack)==="heal")return "Cible : choisissez un allié vivant"
 const slots=livingMobs(window.__combatSnapshot);if(!slots.length)return "Aucune cible vivante"
 if(slots.length===1){const value=combatTargetEligibility(attack,actor,special,slots[0]);return "Cible : "+combatEnemyLabel(slots[0])+(value.reason?" — "+value.reason:"")}
 const allowed=slots.filter(slot=>combatTargetEligibility(attack,actor,special,slot).allowed)
 return "Cible : à choisir — "+allowed.length+" / "+slots.length+" ennemi(s) admissible(s)"
}
function refreshCombatHUDContext(){
 const c=window.__combatSnapshot,state=c?.turnState,player=typeof getCombatHUDPlayerId==="function"?getCombatHUDPlayerId():null,hud=document.getElementById("combatHUD"),info=document.getElementById("combatHUDInfo")
 document.querySelectorAll(".combatTargetNumber").forEach(el=>{if(!combatActive||!c)el.remove()})
 if(combatActive&&c)COMBAT_MOBS.forEach((slot,i)=>{const token=document.getElementById(slot==="mob"?"mobToken":"mobToken_"+slot);if(!token||!c[slot])return;let badge=token.querySelector(".combatTargetNumber");if(!badge){badge=document.createElement("span");badge.className="combatTargetNumber";badge.setAttribute("aria-hidden","true");token.appendChild(badge)}badge.textContent=String(i+1);token.title=combatEnemyLabel(slot)+" — "+c[slot].hp+" / "+c[slot].maxHP+" PV"})
 if(!hud||!info||!player)return
 let rules=document.getElementById("combatHUDRules")
 if(c?.balanceVersion===3){if(!rules){rules=document.createElement("p");rules.id="combatHUDRules";info.appendChild(rules)}const raw=window.__publicCharacters?.[player]||{};rules.textContent=calibratedRuleSummary(getEffectiveCharacterData(player,raw));rules.hidden=false}else if(rules)rules.hidden=true
 let summary=document.getElementById("combatHUDTurnSummary");if(!summary){summary=document.createElement("p");summary.id="combatHUDTurnSummary";summary.setAttribute("role","status");info.insertBefore(summary,document.getElementById("combatHUDAttacks"))}
 const current=state?.currentActorId,label=current==="greg"?"Greg et Bibi":COMBAT_MOBS.includes(current)?combatEnemyLabel(current):heroDisplayName(current||"—")
 const pill=document.querySelector("#combatHUDMeta .combatHUDMetaPill--turn");if(pill)pill.textContent="Round "+(state?.round||1)+" · "+(state?.phase==="rolling"?"Initiative":label)
 summary.textContent=window.__actionOnline===false?"Connexion perdue — actions suspendues.":!combatActive||c?.phase==="finished"?"Combat terminé — retour à la carte.":state?.phase==="rolling"?"Les jets d’initiative déterminent l’ordre des tours.":c?.pendingResolution?"Décision du MJ en attente.":window.__sharedVisualBusy||Date.now()<(window.__combatIntroUntil||0)?"Animation en cours — patientez.":window.__playerAttackResolving?(document.getElementById("combatEnemyTargetPicker")||document.getElementById("combatTargetPicker")?"Choisissez la cible dans la fenêtre.":"Action en cours — attendez la confirmation."):current===combatOwner(player)?(combatOwner(player)==="greg"?"À vous : une seule action pour Greg ou Bibi.":"À vous de jouer : choisissez une action."):"Au tour de "+label+". Vos actions sont en attente."
}
