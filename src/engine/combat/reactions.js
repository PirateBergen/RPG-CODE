function combatChargeKey(mob){const charge=mob?.chargingSpecial;return charge?mob.name+":"+(charge.id||charge.name+":"+charge.readyRound):""}
function resolveCombatReactionRoll(root,request,dice){
 const c=root.combat,payload=request.payload||{},reaction=c[payload.slot]?.chargingSpecial?.reaction,actor=request.actor
 if(c.phase!=="active"||c.turnState?.phase!=="active"||c[payload.slot]?.hp<=0||!reaction||reaction.id!==payload.reactionId||reaction.status!=="rolling")throw Error("Cette réaction est terminée ou a changé")
 if(!reaction.participants.includes(actor)||root.characters?.[actor]?.hp<=0)throw Error("Ce personnage ne doit pas lancer ce dé")
 reaction.rolls||={};if(reaction.rolls[actor]||Object.prototype.hasOwnProperty.call(reaction.decisions||{},actor))throw Error("Le jet ou la décision de réaction est déjà enregistré")
 const roll=dice(reaction.dice),data=combatCharacter(root,actor),adjusted=c.balanceVersion===3?calibratedHeroRoll(data,roll,reaction.dice):{total:roll,bonus:0},success=roll!==1&&adjusted.total>=reaction.threshold
 reaction.rolls[actor]={roll,total:adjusted.total,bonus:adjusted.bonus,success}
 return {mode:"reaction-roll",skipTurnBanner:true,actor,roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus,dice:reaction.dice,crit:roll===reaction.dice,fail:roll===1,success,message:heroDisplayName(actor)+" — réaction : "+adjusted.total+" / seuil "+reaction.threshold+". "+(success?"Réussite proposée":"Échec proposé")+", décision finale du MJ."}
}

function applyCombatReactionAdjustment(current,uid,combatId,revision,change,changeId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active"||current.combat.turnState?.phase!=="active")throw Error("Le combat ou la partie a changé")
 if(current.combat.gmAdjustmentLog?.[changeId])return current
 const root=combatClone(current),c=root.combat,mob=c[change.slot],charge=mob?.chargingSpecial
 if(!COMBAT_MOBS.includes(change.slot)||!charge||mob.hp<=0)throw Error("Cette attaque n’est plus en préparation")
 const integer=(n,min,max)=>{if(!Number.isInteger(n)||n<min||n>max)throw Error("Valeur attendue entre "+min+" et "+max);return n}
 let reaction=charge.reaction,message
 if(change.kind==="start"){
  if(change.chargeKey!==combatChargeKey(mob))throw Error("L’attaque annoncée a changé")
  if(reaction)throw Error("Cette attaque possède déjà un événement de réaction")
  const participants=change.participants;if(!Array.isArray(participants)||!participants.length||participants.length>4||new Set(participants).size!==participants.length||participants.some(id=>!COMBAT_CHARACTERS.includes(id)||root.characters?.[id]?.hp<=0))throw Error("Choisissez au moins un personnage vivant")
  if(![6,12,20].includes(change.dice))throw Error("Choisissez D6, D12 ou D20")
  charge.reaction={id:changeId,status:"rolling",participants,dice:change.dice,threshold:integer(change.threshold,2,change.dice),successReduction:integer(change.successReduction,0,100),rolls:{},decisions:{}}
  message="Réactions ouvertes contre « "+charge.name+" » : "+participants.map(heroDisplayName).join(", ")+" · D"+change.dice+" · seuil "+change.threshold
 }else{
  if(!reaction||reaction.id!==change.reactionId)throw Error("Cet événement a changé")
  if(change.kind==="cancel"){delete charge.reaction;message="Réactions annulées contre « "+charge.name+" » ; aucune protection de réaction ne sera appliquée"}
  else if(change.kind==="decision"){
   if(reaction.status!=="rolling"||!reaction.participants.includes(change.target))throw Error("Décision indisponible")
   reaction.decisions||={};reaction.decisions[change.target]=integer(change.amount,0,100)
   message=heroDisplayName(change.target)+" : décision MJ, −"+change.amount+" % pour cette attaque uniquement"
  }else if(change.kind==="reopen"){
   if(reaction.status!=="ready")throw Error("Les décisions sont déjà ouvertes")
   reaction.status="rolling";message="Décisions rouvertes contre « "+charge.name+" » ; nouvelle validation MJ requise"
  }else if(change.kind==="finish"){
   if(reaction.status!=="rolling")throw Error("Les protections sont déjà validées")
   reaction.decisions||={}
   for(const id of reaction.participants){if(!Object.prototype.hasOwnProperty.call(reaction.decisions,id)){if(root.characters?.[id]?.hp<=0)reaction.decisions[id]=0;else if(reaction.rolls?.[id])reaction.decisions[id]=reaction.rolls[id].success?reaction.successReduction:0;else throw Error("Il manque un jet ou une décision MJ pour "+heroDisplayName(id))}}
   reaction.status="ready";message="Protections validées contre « "+charge.name+" » : "+reaction.participants.map(id=>heroDisplayName(id)+" −"+reaction.decisions[id]+" %").join(" · ")
  }else throw Error("Commande de réaction inconnue")
 }
 c.gmAdjustmentLog||={};c.gmAdjustmentLog[changeId]={text:message,time:Date.now()};const entries=Object.keys(c.gmAdjustmentLog);entries.slice(0,Math.max(0,entries.length-80)).forEach(id=>delete c.gmAdjustmentLog[id])
 combatRecord(root,{id:changeId,time:Date.now()},"MJ","Réactions",0,"reaction",message)
 recordConfirmedCombatAction(root,{id:changeId,actor:"mj",time:Date.now()},{mode:"control",message})
 return root
}

