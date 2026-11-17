"use strict"

// Version 3 applies only to newly created encounters. Saved encounters keep their rules.
const COMBAT_BALANCE_VERSION=3
const calibratedHealthCache=new Map(),calibratedDamageCache=new Map()
const CALIBRATED_ENCOUNTER={
 weak:{rounds:1.1,damage:[.12,.17],offset:0},
 normal:{rounds:2.7,damage:[.23,.32],offset:1},
 strong:{rounds:4.1,damage:[.32,.43],offset:3},
 boss:{rounds:6.8,damage:[.42,.56],offset:3},
 world:{rounds:7.8,damage:[.19,.26],offset:6}
}
function calibratedCombat(combat){return combat?.balanceVersion===COMBAT_BALANCE_VERSION}
// Opt-in on encounter creation: absent on existing saves and ongoing fights.
function enhancedCombatCriticals(combat){return calibratedCombat(combat)&&combat.criticalRulesVersion===1}
function combatCriticalMultiplier(combat){return calibratedCombat(combat)&&!enhancedCombatCriticals(combat)?1.6:2}
function combatWitchDamageFactor(root,mob){return 1-(enhancedCombatCriticals(root.combat)&&mob.malus?.damageReduction===.35?.35:.25)}
function calibratedLevel(value){return Math.max(1,Math.min(99,Math.round(Number(value)||1)))}
function calibratedHealth(level){level=calibratedLevel(level);if(!calibratedHealthCache.has(level))calibratedHealthCache.set(level,['greg','ju','elo'].reduce((sum,id)=>sum+getPlayerStatsAtLevel(id,level).hp,0)/3);return calibratedHealthCache.get(level)}
function calibratedStatRatio(value,level){const stat=Math.max(0,Number(value)||0);return stat/(stat+10+calibratedLevel(level))}
function calibratedLuckBonus(data){return Math.min(2,Math.floor(3*calibratedStatRatio(data?.chance,data?.lvl)))}
function calibratedHeroRoll(data,natural,max){const bonus=natural===1||natural===max?0:Math.min(calibratedLuckBonus(data),max-1-natural);return {natural,bonus,total:natural+Math.max(0,bonus)}}
function calibratedDefense(data){return .4*calibratedStatRatio(data?.defense,data?.lvl)}
function calibratedIncomingDamage(data,amount){return amount>0?Math.max(1,Math.round(amount*(1-calibratedDefense(data)))):0}
function calibratedInitiativeBonus(data){return Math.min(4,Math.floor(4*calibratedStatRatio(data?.perspi,data?.lvl))+calibratedLuckBonus(data))}
function calibratedAttackPower(attack,roll,statValue,context={}){
 const data=context.charData||{},level=calibratedLevel(data.lvl),health=calibratedHealth(level),type=getPlayerAttackTypeKey(attack),max=Math.max(2,Number(attack?.dice)||12)
 const coefficient=type==='heal'?.18:type==='summon'?.10:type==='physical'?.12:type==='ranged'?.125:.12
 const statFactor=.65+.75*calibratedStatRatio(statValue,level),rollFactor=.65+.7*Math.max(1,Math.min(max,roll))/max
 return Math.max(type==='heal'?2:1,Math.round(health*coefficient*statFactor*rollFactor))
}
function calibratedSpecialDamage(actor,power,crit,fail,multiplier=1.6){return fail?0:Math.round(power*({greg:2.8,ju:3,elo:2.3,bibi:2.8}[actor]||2.5)*(crit?multiplier:1))}
function calibratedPikaKickDamage(data,kicks){return Math.round(kicks*calibratedHealth(data.lvl)*(.032+.035*calibratedStatRatio(data.force,data.lvl)))}
function calibratedHypnosisBonus(data){return Math.min(2,Math.floor(4*calibratedStatRatio(data.charme,data.lvl)))}
function calibratedPartyDamage(level){
 level=calibratedLevel(level);if(calibratedDamageCache.has(level))return calibratedDamageCache.get(level)
 let total=0
 for(const id of ['greg','ju','elo']){const data={...getPlayerStatsAtLevel(id,level),lvl:level},attack=id==='greg'?attacks.greg[0]:id==='ju'?attacks.ju[2]:attacks.elo[1],stat=data[getAttackStatKey(attack.stat)];for(let roll=2;roll<=12;roll++){const effective=calibratedHeroRoll(data,roll,12).total;total+=calibratedAttackPower(attack,effective,stat,{charData:data})*(roll===12?1.6:1)/12}}
 calibratedDamageCache.set(level,total);return total
}
function calibratedCombatMob(name,tier,partyLevel,enemyCount=1){
 const level=calibratedLevel(partyLevel),chosenTier=WORLD_BOSS_NAMES.includes(name)?'boss':tier||mobStats[name]?.tier||'weak',category=getMobBalanceClass(name,chosenTier),profile=CALIBRATED_ENCOUNTER[category],count=Math.max(1,Math.min(3,enemyCount)),ordinary=['weak','normal','strong'].includes(category),groupFactor=ordinary?[1,.80,.66][count-1]:1,damageGroupFactor=ordinary?[1,.88,.76][count-1]:1
 const baseline={weak:28,normal:60,strong:100,boss:300,world:400}[category],species=name==='roi'&&category==='world'?1.1:Math.max(.8,Math.min(1.2,(mobStats[name]?.baseHP||baseline)/baseline))
 const hp=Math.max(10,Math.round(calibratedPartyDamage(level)*profile.rounds*species*groupFactor/5)*5)
 return {name,hp,maxHP:hp,lvl:level+profile.offset,tier:chosenTier,balanceVersion:3,balanceClass:category,partyLevel:level,partyHpReference:Math.round(calibratedHealth(level)),baseBalancedHP:Math.round(hp/groupFactor),groupFactor,damageGroupFactor,actionsPerTurn:category==='world'?2:1}
}
function getCalibratedMobDamageRange(attack,mob){
 const category=mob.balanceClass||getMobBalanceClass(mob.name,mob.tier),profile=CALIBRATED_ENCOUNTER[category],level=calibratedLevel(mob.partyLevel),health=mob.partyHpReference||calibratedHealth(level)
 const normals=getMobAttacksForMob(mob.name,mob.tier).filter(a=>!a.special&&a.effect!=='all'),average=normals.reduce((n,a)=>n+(a.dmgMin+a.dmgMax)/2,0)/Math.max(1,normals.length)||10,weight=Math.max(.8,Math.min(1.2,((Number(attack.dmgMin)+Number(attack.dmgMax))/2||average)/average))
 const levelFactor=Math.max(.4,Math.min(2.5,Math.pow(((Number(mob.lvl)||level)+8)/(level+profile.offset+8),.8))),fury=!isKrakenEncounter(mob)&&category==='world'&&mob.hp<=mob.maxHP*.5?1.12:1
 const factor=weight*levelFactor*krakenDamageFactor(attack,mob)*(mob.damageGroupFactor||1)*(attack.special?1.35:1)*(attack.effect==='all'?(category==='world'?.45:.60):1)*fury*(category==='world'?1+.12*(level-1)/(level+9):1)*(mob.name==='roi'?1.02:1)
 const min=Math.max(1,Math.round(health*profile.damage[0]*factor)),max=Math.max(min,Math.round(health*profile.damage[1]*factor));return {min,max}
}
function calibratedAllyDamage(pnj,action,roll,crit,fail,level,multiplier=1.6){return Math.round(calibratedPartyDamage(level)*({baldur:1.8,melenchon:2.2,odin:2.8,thor:3,freya:2.5}[pnj.id]||2)*(.6+.8*roll/action.dice)*(crit?multiplier:1)*(fail?.2:1))}
function calibratedAllyHeal(pnj,roll,max,level){return Math.round(calibratedHealth(level)*(pnj.id==='gardienne'?.50:.70)*(.4+roll/max))}
function calibratedThuumDamage(word,rank,level){const factor=1+.2*(Math.max(1,Math.min(3,Number(rank)||1))-1),health=calibratedHealth(level);return word==='SKARO\'H'?{main:0,splash:0}:{main:Math.round(health*(word==='SKRAA'?.12:.08)*factor),splash:word==='SKRAA'?Math.round(health*.045*factor):0}}
function calibratedRuleSummary(data){const defense=Math.round(calibratedDefense(data)*100),luck=calibratedLuckBonus(data),initiative=calibratedInitiativeBonus(data);return 'Défense : −'+defense+' % de dégâts d’attaque · Chance : jusqu’à +'+luck+' au jet · Initiative : +'+initiative+'. Critiques sur le dé naturel.'}

function calibratedOutgoingDamage(root,actor,amount,actualActor=actor){return Math.round(amount*(root.combat.heroPowerBuffs?.[actor]?.turns>0?1.25:1)*krakenHeroDamageFactor(root,actualActor))}
function calibratedAttackDescription(attack){
 const effects={
  "Le Bibi":"Bibi attaque avec sa Chance. Sur critique, rage pendant trois rounds : bonus de dégâts adapté au niveau.",
  "I know Frank (si arc)":"Tir fondé sur la Perspicacité. Arc requis. Sur critique : saignement adapté au niveau pendant deux rounds.",
  "Je vais te raconter une histoire":"Sort fondé sur le Charme. +25 % en forêt ou mine. Sur critique : poison adapté au niveau pendant deux rounds.",
  "Je suis jet laguée":"John Pork frappe puis protège le groupe avec 35 % des PV maximum d’Elo pendant trois rounds. Bonus D4 adapté au niveau aux attaques suivantes d’Elo ; critique : bonus doublé sur tous les ennemis.",
  "Je suis une fille":"Hypnose : Chance et Charme facilitent les seuils 2 / 7 / 10 selon l’ennemi. World boss : 12 naturel obligatoire. Recharge de trois rounds. 1 naturel : échec."
 }
 return effects[attack.name]||attack.effect
}
function allyActionDescription(pnj,action,combat=window.__combatSnapshot){
 if(combat&&!calibratedCombat(combat))return action.desc
 if(enhancedCombatCriticals(combat)){
  const rolls=' Critique : '+(action.critMin||action.dice)+(action.critMin&&action.critMin<action.dice?'–'+action.dice:'')+' naturel.'+(action.id==='thor_mjolnir'?' 1 naturel : intervention ratée ; action consommée, utilisation aussi consommée hors Jörmungandr.':' 1 naturel : intervention ratée ; utilisation et action consommées.')
  if(action.type==='damage')return action.label+' : dégâts adaptés au niveau, critique ×2. Plafond par cible : 40 % des PV maximum, 50 % sur critique.'+(action.staggerOnCrit?' Critique : prochaine action de la cible interrompue si elle survit.':'')+(action.chainMin?' Chaîne sur '+action.chainMin+'+.':'')+(action.id==='thor_mjolnir'?' Exception : Thor vainc Jörmungandr sur le Forchur si le jet ne fait pas 1. Sur un 1 contre lui, seule l’action est perdue ; nouvelle tentative possible au prochain round sur autorisation du MJ.':'')+rolls
  if(action.type==='heal')return 'Soin adapté au niveau. Critique : soin ×1,5 sur cible vivante, résurrection complète sur cible KO. Une tentative sans critique sur une cible KO consomme l’intervention sans la relever.'+rolls
  if(action.type==='buff')return 'Bonus temporaire de 15 à 30 % de la statistique principale, 3 rounds ou 4 sur critique ; aucun changement permanent de fiche.'+rolls
  return (pnj.id==='witch'?'Sur 10+, dégâts ennemis réduits de 25 %, ou 35 % sur critique.':'Sur 10+, réduction fixe des dégâts adaptée au niveau, renforcée de 25 % sur critique avant arrondi.')+' Jusqu’à la fin du combat.'+rolls
 }
 if(action.id==='thor_mjolnir')return 'Mjolnir : dégâts adaptés au niveau du groupe, chaîne sur 15+. Chaque cible perd au plus 40 % de ses PV maximum. Exception : Thor vainc Jörmungandr sur le Forchur.'
 if(action.type==='damage')return action.label+' : dégâts adaptés au niveau du groupe, au dé et au critique ; au plus 40 % des PV maximum de chaque cible. Une utilisation par combat, sur autorisation du MJ.'
 if(action.type==='heal')return 'Soin adapté au niveau du groupe. Sur critique naturel : résurrection complète. Une utilisation par combat, sur autorisation du MJ.'
 if(action.type==='buff')return 'Bonus temporaire de 15 à 30 % de la statistique principale pendant trois rounds ; aucun changement permanent de fiche.'
 if(pnj.id==='odin')return 'Sur 10+, réduction des dégâts ennemis adaptée au niveau du groupe.'
 return action.desc
}
