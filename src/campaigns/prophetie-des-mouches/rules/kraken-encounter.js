// This profile is attached only when a new Kraken encounter is created.
function isKrakenEncounter(mob){return mob?.name==="kraken"&&mob.encounterProfile==="kraken-v1"}
function initializeKrakenEncounter(mob){if(mob.name!=="kraken")return mob;const hp=Math.round(mob.maxHP*1.35/5)*5;return {...mob,hp,maxHP:hp,baseBalancedHP:hp,encounterProfile:"kraken-v1",krakenStage:1,krakenSpecialStageUsed:0,krakenNextSpecialRound:3}}
function krakenStage(mob){return Math.max(mob?.krakenStage||1,mob?.hp<=mob?.maxHP*.25?3:mob?.hp<=mob?.maxHP*.60?2:1)}
function krakenStageName(mob){return ["","La traque","L’étreinte des profondeurs","Le navire sous la menace"][krakenStage(mob)]}
function krakenSpecialAttack(mob){
 const stage=mob.chargingSpecial?.krakenStage||krakenStage(mob),base=getMobSpecialAttack("kraken","boss")
 return {...base,oncePerCombat:false,oncePerPhase:true,name:stage===3?"Écrasement du navire":base.name,krakenStage:stage,flavor:stage===3?"Le Kraken soulève sa masse pour écraser le pont. Cherchez un abri ou interrompez sa préparation !":base.flavor}
}
function krakenNormalAttacks(mob){const list=getMobAttacksForMob("kraken","boss");if(krakenStage(mob)>=2&&!mob.krakenHold)list.push({name:"Saisie tentaculaire",icon:"🐙",dmgMin:10,dmgMax:15,effect:"grab",flavor:"Une tentacule saisit une cible. Un allié peut la libérer ou frapper le Kraken.",desc:"Saisit une cible : dégâts infligés −25 %. Un allié peut la libérer ou infliger assez de dégâts au Kraken."});return list}
function krakenSpecialUsed(mob){return (mob.krakenSpecialStageUsed||0)>=krakenStage(mob)}
function synchronizeKrakenStage(root,slot,request){
 const mob=root.combat?.[slot];if(!isKrakenEncounter(mob))return
 if(mob.hp<=0){delete mob.krakenHold;return}
 const stage=krakenStage(mob)
 if(stage>(mob.krakenStage||1)){mob.krakenStage=stage;mob.krakenNextSpecialRound=Math.max(mob.krakenNextSpecialRound||0,(root.combat.turnState?.round||1)+1);combatRecord(root,request,"KRAKEN","Phase",0,"phase","Kraken — phase "+stage+" : "+krakenStageName(mob)+". Aucun coup supplémentaire gratuit.")}
 mob.specialUsed=krakenSpecialUsed(mob)
 if(mob.krakenHold&&root.characters?.[mob.krakenHold.target]?.hp<=0)delete mob.krakenHold
}
function krakenDamageFactor(attack,mob){
 if(!isKrakenEncounter(mob))return 1
 const stage=attack.krakenStage||krakenStage(mob)
 return [0,1.04,1.10,1.20][stage]*(attack.effect==="grab"?.70:1)*(attack.special&&stage===3?1.20:1)*(mob.krakenDisorientedActions>0?.8:1)
}
function krakenHeroDamageFactor(root,actor){return COMBAT_MOBS.some(slot=>isKrakenEncounter(root.combat[slot])&&root.combat[slot].hp>0&&root.combat[slot].krakenHold?.target===actor)?.75:1}
function krakenIncomingDamage(root,request,from,slot,amount){
 const mob=root.combat[slot];if(!isKrakenEncounter(mob)||request.kind!=="hero"||["POISON","SAIGNEMENT"].includes(from))return amount
 if(mob.krakenOpeningHits>0||mob.krakenOpeningRequest===request.id){if(mob.krakenOpeningRequest!==request.id){mob.krakenOpeningHits--;mob.krakenOpeningRequest=request.id}return Math.round(amount*1.25)}return amount
}
function krakenAfterDamage(root,request,slot,amount){
 const mob=root.combat[slot];if(!isKrakenEncounter(mob))return
 if(mob.krakenHold){mob.krakenHold.damageTaken+=amount;if(mob.krakenHold.damageTaken>=mob.krakenHold.releaseNeeded){combatRecord(root,request,"KRAKEN",mob.krakenHold.target,0,"release","La tentacule lâche sa prise sous les dégâts infligés au Kraken.");delete mob.krakenHold}}
 synchronizeKrakenStage(root,slot,request)
}
function tickKrakenHolds(root,request){
 for(const slot of COMBAT_MOBS){const mob=root.combat[slot];if(!isKrakenEncounter(mob))continue;synchronizeKrakenStage(root,slot,request);const hold=mob.krakenHold;if(!hold||(root.combat.turnState.round||1)<=hold.startedRound)continue
  const victim=root.characters[hold.target];let base=Math.round(calibratedHealth(mob.partyLevel)*(krakenStage(mob)===3?.08:.06));if(mob.attackMalus)base=Math.max(0,base-(mob.attackMalus.amount||0));if(mob.malus?.source==="La Sorcière")base=Math.round(base*combatWitchDamageFactor(root,mob));if(mob.krakenDisorientedActions>0)base=Math.round(base*.8)
  const damage=calibratedIncomingDamage(combatCharacter(root,hold.target),gmIncomingDamage(root,hold.target,gmOutgoingDamage(root,slot,base))),before=victim.hp;victim.hp=Math.max(0,before-damage)
  combatRecord(root,request,"ÉTREINTE",hold.target,before-victim.hp,"mob","L’étreinte du Kraken inflige "+(before-victim.hp)+" dégâts à "+heroDisplayName(hold.target))
  if(--hold.roundsLeft<=0||victim.hp<=0)delete mob.krakenHold
 }
}
function resolveKrakenRelease(root,request,dice){
 requireCombatTurn(root,request,request.actor)
 const mob=root.combat[request.payload?.target],hold=mob?.krakenHold
 if(!isKrakenEncounter(mob)||!hold||mob.hp<=0||root.characters?.[hold.target]?.hp<=0)throw Error("Aucun personnage à libérer de cette tentacule")
 if(root.combat.heroHaste)throw Error("Terminez les attaques de SKARO’H avant une assistance")
 const roll=dice(12),data=combatCharacter(root,request.actor),adjusted=calibratedHeroRoll(data,roll,12),threshold=hold.target===request.actor?8:7,cursed=data.cursedEffect==="critOnly"&&data.cursedCombatId===root.combat.id,success=roll!==1&&adjusted.total>=threshold&&(!cursed||roll===12),target=hold.target
 recordHeroCritical(root,request.actor,roll===12,roll===1);if(success)delete mob.krakenHold;nextCombatTurn(root,request)
 return {actor:request.actor,mode:"control",roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus,dice:12,crit:roll===12,fail:roll===1,success,message:heroDisplayName(request.actor)+(success?" libère ":" ne parvient pas à libérer ")+heroDisplayName(target)+" de la tentacule. Cette tentative consomme son action."}
}
function bossWeaknessNotes(name){
 if(name==="kraken")return [
  {id:"cannon",title:"Boulets de canon",hint:"Une tentacule exposée peut être frappée pendant la préparation.",strategy:"Valider un tir ou un impact lourd sur la tentacule.",effect:"Interrompt la spéciale annoncée et libère la cible saisie. Une fois par phase."},
  {id:"abyss",title:"Davy Jones et les pactes marins",hint:"Les références aux abysses maudites perturbent ses mouvements.",strategy:"Valider une diversion, un pacte ou une mise en scène convaincante.",effect:"Dégâts −20 % pendant ses deux prochaines attaques. Une fois par phase."},
  {id:"deck",title:"Terre ferme",hint:"Une tentacule immobilisée contre le pont perd son avantage.",strategy:"Valider un ancrage, un piège ou une manœuvre exposant la tentacule.",effect:"Les trois prochaines actions d’attaque de héros (hors cris) infligent +25 %. Une fois par phase."}
 ]
 const base=mobWeaknesses[name];return (Array.isArray(base)?base:base?[base]:[]).map((entry,index)=>({id:String(index),title:entry.title,hint:entry.text,strategy:"À arbitrer selon les jets et la stratégie des joueurs.",effect:"Utiliser Intervenir pour appliquer l’effet décidé par le MJ.",requiresDefeatedMob:entry.requiresDefeatedMob||null}))
}
function applyBossTactic(current,uid,combatId,revision,change,changeId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active")throw Error("Le combat ou la partie a changé")
 if(current.combat.gmAdjustmentLog?.[changeId])return current
 const root=combatClone(current),mob=root.combat[change.slot],note=mob&&bossWeaknessNotes(mob.name).find(note=>note.id===change.noteId),request={id:changeId,actor:"mj",uid,time:Date.now()}
 if(!COMBAT_MOBS.includes(change.slot)||!mob||mob.hp<=0||!note)throw Error("Choisissez un boss vivant et une faiblesse existante")
 if(note.requiresDefeatedMob&&!root.game?.defeatedMobs?.[note.requiresDefeatedMob])throw Error("Cette faiblesse exige la défaite de "+note.requiresDefeatedMob)
 let message
 if(change.kind==="reveal"){
  mob.revealedBossNotes||={};mob.revealedBossNotes[note.id]={title:note.title,text:note.hint};message=heroDisplayName(mob.name)+" — indice révélé : "+note.title+". "+note.hint
 }else if(change.kind==="apply"){
  if(!isKrakenEncounter(mob))throw Error("Appliquez l’effet choisi avec Intervenir")
  synchronizeKrakenStage(root,change.slot,request);if(change.stage!==krakenStage(mob))throw Error("La phase du Kraken a changé")
  const key=note.id+"-"+krakenStage(mob);mob.krakenTacticsUsed||={};if(mob.krakenTacticsUsed[key])throw Error("Cette faiblesse a déjà été exploitée pendant cette phase")
  if(note.id==="cannon"){if(!mob.chargingSpecial)throw Error("Le Kraken ne prépare pas de spéciale à interrompre");mob.krakenSpecialStageUsed=Math.max(mob.krakenSpecialStageUsed||0,mob.chargingSpecial.krakenStage||krakenStage(mob));delete mob.chargingSpecial;delete mob.krakenHold;mob.specialUsed=krakenSpecialUsed(mob)}
  if(note.id==="abyss")mob.krakenDisorientedActions=2
  if(note.id==="deck"){mob.krakenOpeningHits=3;delete mob.krakenOpeningRequest}
  mob.krakenTacticsUsed[key]=true;message="Stratégie validée par le MJ — "+note.title+" : "+note.effect
 }else throw Error("Commande inconnue")
 root.combat.gmAdjustmentLog||={};root.combat.gmAdjustmentLog[changeId]={time:request.time,text:message};Object.keys(root.combat.gmAdjustmentLog).slice(0,-80).forEach(id=>delete root.combat.gmAdjustmentLog[id]);recordConfirmedCombatAction(root,request,{mode:"control",message});return root
}
