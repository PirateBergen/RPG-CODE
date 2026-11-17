function getBalanceLevelBonus(level){let bonus=0;for(let i=2;i<=level;i++)bonus+=i>=15?4:i>=10?3:i>=5?2:1;return bonus}
function getPartyDamageReference(level){
 level=Math.max(1,Math.min(99,Math.round(Number(level)||1)));const bonus=getBalanceLevelBonus(level)
 return Math.round([["greg","force",1.05],["ju","force",1.05],["elo","charme",1.12]].reduce((total,[hero,stat,factor])=>{const stats=getPlayerStatsAtLevel(hero,level);let sum=0;for(let roll=2;roll<=12;roll++)sum+=Math.max(1,Math.round(roll*factor+stats[stat]*.82+bonus))*(roll===12?2:1);return total+sum/12},0))
}
function getMobBalanceClass(name,tier){return WORLD_BOSS_NAMES.includes(name)?"world":tier==="boss"?"boss":tier==="high"?"strong":tier==="medium"?"normal":"weak"}
function balancedCombatMob(name,tier,partyLevel,enemyCount=1){
 const level=Math.max(1,Math.min(99,Math.round(Number(partyLevel)||1)))
 const chosenTier=WORLD_BOSS_NAMES.includes(name)?"boss":tier||(CLASSIC_BOSS_NAMES.includes(name)?"boss":mobStats[name]?.tier)||"weak"
 const category=getMobBalanceClass(name,chosenTier),count=Math.max(1,Math.min(3,enemyCount)),classic=["weak","normal","strong"].includes(category)
 const groupFactor=classic?[1,.85,.70][count-1]:1,damageGroupFactor=classic?[1,.92,.84][count-1]:1
 const baseline={weak:28,normal:60,strong:100,boss:300,world:400}[category]
 const species=name==="roi"&&category==="world"?1.2:Math.max(category==="world"?1:.8,Math.min(1.2,(mobStats[name]?.baseHP||baseline)/baseline))
 const unit=category==="world"?10:5,baseBalancedHP=Math.max(10,Math.round(getPartyDamageReference(level)*({weak:1,normal:2.1,strong:3,boss:6,world:12}[category])*species/unit)*unit)
 const hp=Math.max(5,Math.round(baseBalancedHP*groupFactor/5)*5)
 const partyHpReference=Math.round(["greg","ju","elo"].reduce((n,id)=>n+getPlayerStatsAtLevel(id,level).hp,0)/3)
 return {name,hp,maxHP:hp,lvl:Math.max(1,level+({weak:0,normal:1,strong:3,boss:3,world:6}[category])),tier:chosenTier,balanceVersion:2,balanceClass:category,partyLevel:level,partyHpReference,baseBalancedHP,groupFactor,damageGroupFactor,actionsPerTurn:category==="world"?2:1}
}
function getBalancedMobDamageRange(attack,mob){
 const category=mob.balanceClass||getMobBalanceClass(mob.name,mob.tier)
 // Keep damage from already saved encounters stable. New ordinary enemies hit harder.
 const damageRates=mob.balanceVersion===2?{weak:[.10,.14],normal:[.18,.25],strong:[.22,.30],boss:[.23,.32],world:[.18,.26]}:{weak:[.08,.12],normal:[.12,.17],strong:[.18,.25],boss:[.23,.32],world:[.18,.26]}
 const rates=damageRates[category]
 const normals=getMobAttacksForMob(mob.name,mob.tier).filter(a=>!a.special&&a.effect!=="all"),average=normals.reduce((n,a)=>n+(a.dmgMin+a.dmgMax)/2,0)/Math.max(1,normals.length)||10
 const weight=Math.max(.8,Math.min(1.2,((Number(attack.dmgMin)+Number(attack.dmgMax))/2||average)/average))
 const fury=category==="world"&&mob.hp<=mob.maxHP*.5?1.15:1
 const finalBossFactor=category==="world"&&mob.name==="roi"?1.1:1
 const factor=finalBossFactor*weight*(attack.special?1.4:1)*(attack.effect==="all"?(category==="world"?.45:.65):1)*(mob.damageGroupFactor||1)*fury
 const health=mob.partyHpReference||Math.round(["greg","ju","elo"].reduce((n,id)=>n+getPlayerStatsAtLevel(id,mob.partyLevel||1).hp,0)/3)
 const min=Math.max(1,Math.round(health*rates[0]*factor)),max=Math.max(min,Math.round(health*rates[1]*factor))
 return {min,max}
}

function getMobBaseDamageRange(attack, mobLvl, mobTier = "weak", mobData = null) {
  if([1,2].includes(mobData?.balanceVersion))return getBalancedMobDamageRange(attack,mobData)
  const lvl = Math.max(1, parseInt(mobLvl, 10) || 1)
  let levelBonus = 0
  for (let current = 2; current <= lvl; current += 1) {
    let perLevel = 1
    if (current >= 15) perLevel = 4
    else if (current >= 10) perLevel = 3
    else if (current >= 5) perLevel = 2
    levelBonus += perLevel
  }
  const effectiveLevelBonus = mobTier === "boss" && levelBonus > 18
    ? 18 + (levelBonus - 18) * 0.65
    : levelBonus
  const levelFactor = 1 + effectiveLevelBonus * 0.09
  const tierFactor = { weak:1.14, medium:1.24, high:1.38, boss:1.56 }[mobTier] || 1.16
  const specialFactor = attack && attack.special ? 1.24 : 1
  const factor = levelFactor * tierFactor * specialFactor
  return {
    min: Math.round(attack.dmgMin * factor),
    max: Math.round(attack.dmgMax * factor)
  }
}


/* ========================= */
/* MAPS & MUSIQUES           */
/* ========================= */

