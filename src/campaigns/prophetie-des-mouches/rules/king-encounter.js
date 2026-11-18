function recordKingVisual(root,request,slot,scene,message,extra={}){
 const id=(request.id||"king")+"-"+scene+"-"+slot,c=root.combat
 c.kingEvents||={};c.kingEvents[id]={id,combatId:c.id,time:Date.now(),scene,message,...extra}
 Object.keys(c.kingEvents).slice(0,-50).forEach(key=>delete c.kingEvents[key])
}
function summonKingSchnaw(root,slot,request){
 const king=root.combat[slot],state=king.king,c=root.combat
 while((state.minionsSummoned||0)<2){
  const target=COMBAT_MOBS.find(s=>s!==slot&&(!c[s]||c[s].hp<=0));if(!target)break
  const index=state.minionsSummoned||0,weak=index<(state.disruptions||0),mob=calibratedCombatMob("chnaw","high",king.partyLevel,3)
  const hp=Math.max(1,Math.round(calibratedPartyDamage(king.partyLevel)*(weak?.85:1.3)))
  c[target]={...mob,hp,maxHP:hp,baseBalancedHP:hp,actionsPerTurn:1,kingMinion:true,kingMaster:slot,kingRole:index===0?"isoler":"garde",damageGroupFactor:weak?.60:.85,x:king.x+(index?170:-170),y:king.y+80,slot:target}
  if(!Number.isFinite(c[target].x))c[target].x=index?750:350
  if(!Number.isFinite(c[target].y))c[target].y=260
  if(c.gmStates)delete c.gmStates[target]
  const entry={id:target,type:"mob",label:"SCHNAW — "+(index===0?"Chasseur":"Garde"),image:"chnaw.png",roll:1,bonus:0,total:1}
  const ts=c.turnState;if(ts){ts.participants=(ts.participants||[]).filter(p=>p.id!==target);ts.participants.push(entry);ts.order=(ts.order||[]).filter(p=>p.id!==target);ts.order.push(entry);ts.rolls||={};ts.rolls[target]=1;ts.currentIndex=Math.max(0,ts.order.findIndex(p=>p.id===ts.currentActorId))}
  state.minionsSummoned=index+1
  combatRecord(root,request,"ROI","Invocation",0,"control","Un Schnaw "+(weak?"affaibli par le rituel perturbé":"renforcé")+" rejoint la fin de l’initiative : "+hp+" PV, une action par tour.")
 }
}
function synchronizeKingStage(root,slot,request){
 const mob=root.combat?.[slot];if(!isKingEncounter(mob))return
 mob.king.specialsUsed||={};mob.king.auroras||={}
 if(mob.hp<=0){delete mob.chargingSpecial;return}
 const stage=kingStage(mob),before=mob.king.phase
 if(stage>before){
  delete mob.chargingSpecial
  for(let phase=before+1;phase<=stage;phase++){
   mob.king.phase=phase
   combatRecord(root,request,"ROI","Phase",0,"phase","Roi — phase "+phase+" / 5 : "+KING_PHASES[phase-1].name+". Aucun dégât ni tour supplémentaire gratuit.")
   recordKingVisual(root,request,slot,"phase-"+phase,KING_PHASES[phase-1].quote,{phase})
   if(phase===3)summonKingSchnaw(root,slot,request)
   if(phase===5){mob.chargingSpecial={id:(request.id||"king")+"-turn-around",name:"Turn Around",kingStage:5,readyRound:(root.combat.turnState?.round||1)+2};mob.king.refugesConfirmed=false;mob.king.refugeTargets=[]}
  }
 }
 if(stage>=3)summonKingSchnaw(root,slot,request)
 mob.specialUsed=kingSpecialUsed(mob)
}
function kingAfterDamage(root,request,slot){
 const mob=root.combat[slot]
 if(isKingEncounter(mob))synchronizeKingStage(root,slot,request)
 else if(mob?.kingMinion&&mob.hp<=0&&isKingEncounter(root.combat[mob.kingMaster]))synchronizeKingStage(root,mob.kingMaster,request)
}
function kingIncomingDamage(root,request,from,slot,amount){
 const mob=root.combat[slot];if(!isKingEncounter(mob))return amount
 if(COMBAT_MOBS.some(s=>root.combat[s]?.kingMaster===slot&&root.combat[s]?.kingRole==="garde"&&root.combat[s].hp>0)){
  amount=Math.round(amount*.8);combatRecord(root,request,"GARDE SCHNAW","ROI",0,"control","Le Schnaw garde réduit les dégâts reçus par le Roi de 20 %.")
 }
 if(request.kind==="hero"&&(mob.king.openingHits>0||mob.king.openingRequest===request.id)&&!["POISON","SAIGNEMENT"].includes(from)){
  if(mob.king.openingRequest!==request.id){mob.king.openingHits--;mob.king.openingRequest=request.id}
  amount=Math.round(amount*1.25)
 }
 return amount
}
function kingReactionReduction(mob,attack,id,reduction,charge){
 if(!isKingEncounter(mob))return reduction
 reduction=Math.max(reduction,charge?.kingShelter?.[id]||0)
 if(attack.kingStage===5){
  if(mob.king.odinInvoked)return 100
  if((mob.king.refugeTargets||[]).includes(id))reduction=Math.max(reduction,[25,60,85,100][kingAuroraCount(mob)])
 }
 return reduction
}
function kingGrantOpening(mob,hits=2){mob.king.openingHits=hits;delete mob.king.openingRequest}
function kingReleaseAurora(root,slot,index,actor,request){
 const mob=root.combat[slot]
 if(!isKingEncounter(mob)||mob.hp<=0||kingStage(mob)!==5||mob.chargingSpecial?.kingStage!==5||!Number.isInteger(index)||index<0||index>2)throw Error("Cette aurore n’est pas disponible")
 mob.king.auroras||={}
 if(mob.king.auroras[index])throw Error("Cette aurore est déjà libérée")
 mob.king.auroras[index]={actor,time:Date.now()}
 const message=heroDisplayName(actor)+" libère l’aurore "+(index+1)+" — "+kingAuroraCount(mob)+" / 3. Rejoignez les refuges ; le MJ valide les personnages protégés."
 combatRecord(root,request,"AURORES",actor,0,"control",message);return message
}
function kingInvokeOdin(root,slot,request){
 const mob=root.combat[slot];if(!kingOdinAvailable(mob))throw Error("Libérez les trois aurores avant d’appeler Odin, pendant Turn Around")
 mob.king.odinInvoked=true;mob.king.refugesConfirmed=true;mob.king.refugeTargets=livingHeroes(root)
 const betrayed=!!root.game?.allyBreaks?.odin
 const message=betrayed?"Ne prenez pas ma présence pour un pardon. Je ne viens pas pour vous. Je viens pour les aurores.":"Vous avez rendu leur liberté aux aurores. Ensemble, nous empêcherons leur extinction."
 combatRecord(root,request,"ODIN","AURORES",0,"control",message+" Turn Around sera entièrement arrêté pour le groupe, Bibi compris. L’alliance reste inchangée.")
 return message
}
function resolveKingOdinCall(root,request){
 const slot=request.payload?.slot,mob=root.combat?.[slot]
 if(root.combat.phase!=="active"||root.combat.turnState?.phase!=="active"||!COMBAT_CHARACTERS.includes(request.actor)||root.characters?.[request.actor]?.hp<=0)throw Error("Choisissez un personnage vivant dans ce combat")
 const message=kingInvokeOdin(root,slot,request)
 return {actor:request.actor,mode:"control",skipTurnBanner:true,message,kingScene:"odin",kingSlot:slot,kingLights:3}
}
function resolveKingSupport(root,request,dice){
 requireCombatTurn(root,request,request.actor)
 if(root.combat.heroHaste)throw Error("Terminez les attaques de SKARO’H avant une stratégie")
 const {target:slot,strategy,index}=request.payload,mob=root.combat[slot]
 if(!isKingEncounter(mob)||mob.hp<=0)throw Error("Choisissez le Roi vivant")
 mob.king.specialsUsed||={}
 let message,roll,adjusted,success=true
 if(strategy==="aurora")message=kingReleaseAurora(root,slot,index,request.actor,request)
 else{
  if(strategy==="drain"&&mob.chargingSpecial?.kingStage!==2)throw Error("Aucun drain à interrompre")
  if(strategy==="disrupt"&&(kingStage(mob)!==2||mob.king.disruptions>=2))throw Error("Le rituel des Schnaw ne peut plus être perturbé")
  if(!["drain","disrupt"].includes(strategy))throw Error("Stratégie inconnue")
  roll=dice(12);adjusted=calibratedHeroRoll(combatCharacter(root,request.actor),roll,12)
  const raw=root.characters[request.actor];success=roll!==1&&adjusted.total>=7&&(!(raw.cursedEffect==="critOnly"&&raw.cursedCombatId===root.combat.id)||roll===12)
  recordHeroCritical(root,request.actor,roll===12,roll===1)
  if(success){if(strategy==="drain"){delete mob.chargingSpecial;mob.king.specialsUsed[2]=true;mob.specialUsed=kingSpecialUsed(mob);kingGrantOpening(mob)}else mob.king.disruptions++}
  message=heroDisplayName(request.actor)+" — "+(strategy==="drain"?"interruption du drain":"perturbation du rituel des Schnaw")+" : "+(success?"réussite":"échec")+". Action consommée."+(success&&strategy==="drain"?" Aucun soin pour le Roi ; deux actions offensives de héros à +25 %.":"")
 }
 nextCombatTurn(root,request)
 return {actor:request.actor,mode:"control",message,success,...(roll?{roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus,dice:12,crit:roll===12,fail:roll===1}:{}),...(strategy==="aurora"?{kingScene:"aurora",kingRelease:true,kingLights:kingAuroraCount(mob)}:strategy==="drain"&&success?{kingScene:"blood",kingProtected:true}:{})}
}
function applyKingTactic(current,uid,combatId,revision,change,id){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active")throw Error("Le combat ou la session a changé")
 if(current.combat.gmAdjustmentLog?.[id])return current
 const root=combatClone(current),slot=change.slot,mob=root.combat[slot],request={id,uid,actor:"mj",time:Date.now()}
 if(!COMBAT_MOBS.includes(slot)||!isKingEncounter(mob)||mob.hp<=0||change.phase!==kingStage(mob))throw Error("La phase du Roi a changé")
 mob.king.specialsUsed||={};mob.king.auroras||={}
 let message,scene
 if(change.kind==="drain"){
  if(mob.chargingSpecial?.kingStage!==2||mob.chargingSpecial.id!==change.chargeId)throw Error("Ce drain n’est plus en préparation")
  delete mob.chargingSpecial;mob.king.specialsUsed[2]=true;mob.specialUsed=kingSpecialUsed(mob);kingGrantOpening(mob)
  message="Le MJ valide l’interruption du drain : aucun soin, deux actions offensives de héros à +25 %.";scene="blood"
 }else if(change.kind==="disrupt"){
  if(kingStage(mob)!==2||mob.king.disruptions>=2)throw Error("Les deux perturbations possibles sont déjà validées ou le rituel est terminé")
  mob.king.disruptions++;message="Le MJ valide la perturbation du rituel : un Schnaw arrivera affaibli."
 }else if(change.kind==="aurora"){message=kingReleaseAurora(root,slot,change.index,"mj",request);scene="aurora"}
 else if(change.kind==="odin"){message=kingInvokeOdin(root,slot,request);scene="odin"}
 else if(["pillar","refuges"].includes(change.kind)){
  const targets=change.targets;if(!Array.isArray(targets)||targets.length>4||new Set(targets).size!==targets.length||targets.some(a=>!COMBAT_CHARACTERS.includes(a)||root.characters?.[a]?.hp<=0))throw Error("Choisissez uniquement des personnages vivants")
  const charge=mob.chargingSpecial;if(!charge||charge.id!==change.chargeId)throw Error("L’attaque annoncée a changé")
  if(change.kind==="pillar"){
   if(charge.kingStage!==1||mob.king.pillars<=0||!targets.length)throw Error("Aucun pilier disponible contre cette Sentence")
   mob.king.pillars--;charge.kingShelter||={};targets.forEach(a=>charge.kingShelter[a]=100);message="Le pilier absorbera Sentence royale pour "+targets.map(heroDisplayName).join(", ")+". Pilier détruit ; "+mob.king.pillars+" restant(s)."
  }else{
   if(charge.kingStage!==5)throw Error("Les refuges sont réservés à Turn Around")
   mob.king.refugeTargets=targets;mob.king.refugesConfirmed=true;message="Refuges validés : "+(targets.map(heroDisplayName).join(", ")||"personne")+". "+kingAuroraCount(mob)+" aurore(s), protection "+[25,60,85,100][kingAuroraCount(mob)]+" % dans les refuges."
  }
 }else throw Error("Décision inconnue")
 root.combat.gmAdjustmentLog||={};root.combat.gmAdjustmentLog[id]={time:request.time,text:message};Object.keys(root.combat.gmAdjustmentLog).slice(0,-80).forEach(key=>delete root.combat.gmAdjustmentLog[key])
 recordConfirmedCombatAction(root,request,{mode:"control",message})
 if(scene)recordKingVisual(root,request,slot,scene,message,{lights:kingAuroraCount(mob),success:true,kingRelease:change.kind==="aurora"})
 return root
}
