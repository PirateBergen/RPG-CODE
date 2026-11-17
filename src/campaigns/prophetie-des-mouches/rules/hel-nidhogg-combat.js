function resolveHelNidhoggCombatAction(root,request,pnj,action,dice){
 const c=root.combat,payload=request.payload||{},duo=pnj.id===HEL_NIDHOGG_DUO.id
 const slot=payload.target||(duo?helNidhoggAvailability(root).kingSlots[0]:livingMobs(c)[0])
 if(duo){const state=helNidhoggAvailability(root,slot);if(!state.allowed)throw Error(state.reason)}
 else if(!root.game?.allyDiscoveries?.nidhogg||root.game?.allyBreaks?.nidhogg)throw Error("Le MJ doit débloquer l’alliance avec Nidhogg")
 if(!livingMobs(c).includes(slot))throw Error("Choisissez un ennemi vivant")
 const roll=dice(20),crit=roll===20,fail=roll===1,mob=c[slot],limit=Math.floor(mob.maxHP*(duo?(crit?.30:.25):(crit?.50:.40)))
 let amount=0,explanation=""
 if(!fail){
  const power=duo?limit:c.balanceVersion===3?calibratedAllyDamage(pnj,action,roll,crit,false,mob.partyLevel||c.mob.partyLevel,2):Math.round((action.dmgBase+roll*action.dmgBonus)*(crit?2:1))
  amount=combatDamage(root,request,pnj.name,slot,Math.min(power,limit),"dmg",{damageCap:limit,ignoreNidhoggWound:duo})
  if(duo){if(mob.hp>0)mob.helDuoWeakened=true;explanation=(crit?"Critique : base de 30 %":"Base de 25 %")+" des PV maximum du Roi, sans multiplication supplémentaire, protections conservées. Sa prochaine attaque inflige 50 % de dégâts en moins, spéciale comprise."}
  else if(amount>0&&mob.hp>0){mob.nidhoggWound={percent:crit?25:15,expiresAfterRound:(c.turnState.round||1)+1};explanation="Morsure des racines : dégâts reçus +"+(crit?25:15)+" % jusqu’à la fin du prochain round ; non cumulable avec elle-même."+(crit?" Critique : dégâts ×2 avant protections et plafond de 50 % des PV maximum.":"")}
 }else explanation="Échec critique : aucun dégât ni effet. "+(duo?"Les interventions de Hel et Nidhogg":"L’intervention de Nidhogg")+" et l’action du héros sont consommées."
 c.usedAllies||={};for(const id of duo?["hel_reprieve","nidhogg_bite","hel_nidhogg_judgment"]:[action.id])c.usedAllies[id]=true
 delete root.game.playerAllyAccess
 nextCombatTurn(root,request)
 return {actor:request.actor,pnjId:pnj.id,actionId:action.id,attack:action.label,target:slot,targetName:heroDisplayName(mob.name),roll,dice:20,crit,fail,amount,mode:"ally",duo,interventionFailed:fail,explanation}
}
