const GM_COMBAT_STATES={
 paralysis:{label:"Paralysé",icon:"⛓",unit:"tours",description:"Ne peut pas agir pendant le nombre de tours complets choisi. Un world boss perd toutes ses actions du tour. Greg et Bibi sont affectés séparément : l’autre peut encore agir."},
 weakened:{label:"Affaibli",icon:"▼",unit:"rounds",description:"Inflige moins de dégâts. Choisissez la réduction en points ou en pourcentage. Les soins ne sont pas réduits."},
 vulnerable:{label:"Vulnérable",icon:"◇",unit:"rounds",description:"Subit davantage de dégâts. Choisissez le supplément en points ou en pourcentage."},
 protected:{label:"Protégé",icon:"🛡",unit:"rounds",description:"Subit moins de dégâts, sans descendre sous zéro. Choisissez la réduction en points ou en pourcentage. Si la cible est aussi vulnérable, la protection s’applique après la vulnérabilité."},
 poison:{label:"Poison",icon:"☠",unit:"rounds",description:"Perd les PV indiqués à chaque fin de round. Ces dégâts fixes ignorent les états Protégé et Vulnérable."},
 bleeding:{label:"Saignement",icon:"🩸",unit:"rounds",description:"Perd les PV indiqués à chaque fin de round, indépendamment du poison ou de la brûlure."},
 burning:{label:"Brûlure",icon:"🔥",unit:"rounds",description:"Perd les PV indiqués à chaque fin de round, indépendamment des autres dégâts périodiques."},
 regeneration:{label:"Régénération",icon:"✚",unit:"rounds",description:"Récupère les PV indiqués à chaque fin de round, sans dépasser ses PV maximum. Ne réanime pas une cible KO."}
}
function gmTarget(root,id){return COMBAT_MOBS.includes(id)?root.combat?.[id]:root.characters?.[id]}
function gmStateMap(root,id){return root.combat?.gmStates?.[id]||{}}
function gmParalyzed(root,id){return (gmStateMap(root,id).paralysis?.turns||0)>0}
function gmTurnMembers(owner){return owner==="greg"?["greg","bibi"]:[owner]}
function gmEndStatusTurn(root,owner){for(const id of gmTurnMembers(owner)){const state=gmStateMap(root,id).paralysis;if(state?.activeTurn){delete state.activeTurn;if(--state.turns<=0)delete root.combat.gmStates[id].paralysis}}}
function gmBeginStatusTurn(root,owner){
 const alive=gmTurnMembers(owner).filter(id=>(gmTarget(root,id)?.hp||0)>0)
 for(const id of alive){const state=gmStateMap(root,id).paralysis;if(state)state.activeTurn=true}
 if(alive.length&&alive.every(id=>gmParalyzed(root,id))){gmEndStatusTurn(root,owner);return false}
 return true
}
function gmModifyDamage(amount,state,increase=false){if(!state)return Math.max(0,Math.round(amount));const n=state.mode==="percent"?amount*state.amount/100:state.amount;return Math.max(0,Math.round(amount+(increase?n:-n)))}
function gmOutgoingDamage(root,actor,amount){return gmModifyDamage(amount,gmStateMap(root,actor).weakened)}
function gmIncomingDamage(root,id,amount){if(amount<=0)return 0;const states=gmStateMap(root,id);return gmModifyDamage(gmModifyDamage(amount,states.vulnerable,true),states.protected)}
function gmTickStatusRound(root,request){
 for(const [id,states]of Object.entries(root.combat.gmStates||{})){
  const target=gmTarget(root,id);if(!target)continue
  for(const key of ["poison","bleeding","burning","regeneration"]){const state=states[key];if(!state||target.hp<=0)continue;const before=target.hp,max=COMBAT_MOBS.includes(id)?target.maxHP:getCharacterMaxHp(id,target)
   if(key==="regeneration")target.hp=Math.min(max,target.hp+state.amount)
   else if(!isJormungandr(COMBAT_MOBS.includes(id)?target:null))target.hp=Math.max(0,target.hp-state.amount)
   if(before!==target.hp)combatRecord(root,request,"MJ — "+GM_COMBAT_STATES[key].label,id,Math.abs(before-target.hp),key==="regeneration"?"heal":"dmg","Effet MJ : "+GM_COMBAT_STATES[key].label)
  }
  for(const [key,state]of Object.entries(states))if(key!=="paralysis"&&--state.turns<=0)delete states[key]
 }
}
function applyGMCombatAdjustment(current,uid,combatId,revision,change,changeId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active"||current.combat.turnState?.phase!=="active")throw Error("Le combat ou la partie a changé")
 if(current.combat.gmAdjustmentLog?.[changeId])return current
 const root=combatClone(current),c=root.combat,id=change.target,target=gmTarget(root,id),request={id:changeId,uid,actor:"mj",manual:true,time:Date.now()}
 if(![...COMBAT_CHARACTERS,...COMBAT_MOBS].includes(id)||!target)throw Error("Choisissez une cible existante")
 const label=COMBAT_MOBS.includes(id)?heroDisplayName(target.name):heroDisplayName(id)
 let message="",integer=(value,min,max)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error("Valeur attendue entre "+min+" et "+max);return n}
 c.gmStates||={};c.gmStates[id]||={}
 if(change.kind==="state"){
  const def=GM_COMBAT_STATES[change.state];if(!def)throw Error("État inconnu")
  const turns=integer(change.turns,1,99),mode=change.mode==="percent"?"percent":"points",amount=change.state==="paralysis"?0:integer(change.amount,1,mode==="percent"?100:50000)
  c.gmStates[id][change.state]={turns,amount,mode,...(change.state==="paralysis"&&combatOwner(id)===c.turnState.currentActorId?{activeTurn:true}:{})}
  if(change.state==="paralysis"&&c.heroHaste?.actor===id)delete c.heroHaste
  message=label+" : "+def.label+" pendant "+turns+" "+def.unit+(amount?" ("+amount+(mode==="percent"?" %":" points")+")":"")
 }else if(change.kind==="remove"){
  if(!GM_COMBAT_STATES[change.state])throw Error("État inconnu")
  delete c.gmStates[id][change.state];message=label+" : "+GM_COMBAT_STATES[change.state].label+" retiré"
 }else if(change.kind==="clear"){c.gmStates[id]={};message=label+" : états MJ retirés"}
 else if(change.kind==="hp"){
  const max=COMBAT_MOBS.includes(id)?target.maxHP:getCharacterMaxHp(id,target),value=integer(change.amount,0,50000),before=target.hp
  if(!["set","heal","damage"].includes(change.operation))throw Error("Ajustement de PV inconnu")
  target.hp=Math.max(0,Math.min(max,change.operation==="set"?value:before+(change.operation==="heal"?value:-value)))
  message=label+" : "+before+" → "+target.hp+" / "+max+" PV (ajustement MJ)"
  if(target.hp!==before)combatRecord(root,request,"MJ",label,Math.abs(target.hp-before),target.hp>before?"heal":"dmg",message)
 }else throw Error("Ajustement inconnu")
 delete c.pendingResolution;delete c.interventionArmed
 if(!combatOutcome(root,request)){
  const owner=c.turnState.currentActorId,members=gmTurnMembers(owner).filter(member=>(gmTarget(root,member)?.hp||0)>0)
  if(!combatActorAlive(root,owner)||(members.length&&members.every(member=>gmParalyzed(root,member))))nextCombatTurn(root,request,true)
 }
 c.gmAdjustmentLog||={};c.gmAdjustmentLog[changeId]={time:request.time,text:message,target:id}
 Object.keys(c.gmAdjustmentLog).slice(0,-50).forEach(key=>delete c.gmAdjustmentLog[key])
 recordConfirmedCombatAction(root,request,{mode:"control",message})
 c.visualEvents||={};c.visualEvents[changeId]={id:changeId,combatId:c.id,time:request.time,result:{mode:"control",message},nextTurn:combatClone(c.turnState)}
 Object.keys(c.visualEvents).slice(0,-120).forEach(key=>delete c.visualEvents[key])
 return root
}
