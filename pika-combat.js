"use strict"
function isPikaCombatNpc(name) { return /^(?:ju\s*pion|yu\s*pion|you\s*pion|pika)$/i.test(String(name || "")) }
function pikaHypnosisThreshold(mob) {
  const kind = mob.balanceClass || getMobBalanceClass(mob.name, mob.tier)
  return ({weak:2,normal:2,strong:7,boss:10,world:12})[kind] || 7
}
function pikaAllyInDanger(players, actor="ju") {
  return COMBAT_CHARACTERS.some(id => id !== actor && players[id] && Number(players[id].hp) >= 0 && Number(players[id].hp) * 5 < getCharacterMaxHp(id,players[id]))
}
function pikaPosition(root,id) {
  if(!COMBAT_MOBS.includes(id))return root.tokens?.[id]
  const key=id==="mob"?"mobToken":"mobToken_"+id
  return [root.tokens?.[key],root.combat?.[id],root.combat?.presentation?.positions?.[key]].find(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))
}
function pikaAtContact(root,actor,target) {
  const a=pikaPosition(root,actor),b=pikaPosition(root,target)
  return !!a&&!!b&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&Math.hypot(a.x-b.x,a.y-b.y)<=180
}
function pikaKickCount(roll) { return roll===1?0:roll<=5?1:roll<=9?2:roll<12?3:4 }
function pikaRechargeLeft(combat,actor="ju") {
  const ready=actor==="ju"?combat?.pikaHypnosisReadyRound:combat?.[actor]?.pikaHypnosisReadyRound
  return Math.max(0,(ready||0)-(combat?.turnState?.round||1))
}
function resolvePikaHeroAction(root,request,attack,dice) {
  const c=root.combat,actor=request.actor,slot=request.payload?.target||livingMobs(c)[0]
  requireCombatTurn(root,request,actor)
  if(!livingMobs(c).includes(slot))throw Error("Choisissez un ennemi vivant")
  const special=!!request.payload?.special,kind=attack.pikaKind,raw=root.characters[actor],data=combatCharacter(root,actor),round=c.turnState.round||1
  if(special&&c.playerSpecials?.[actor])throw Error("Spéciale déjà utilisée dans ce combat")
  if(kind==="cancan"&&!pikaAtContact(root,actor,slot))throw Error("French cancan nécessite le contact avec la cible (180 maximum)")
  if(kind==="hypnosis"&&pikaRechargeLeft(c)>0)throw Error("Je suis une fille recharge encore pendant "+pikaRechargeLeft(c)+" tour(s)")
  if(kind==="endikaki"&&!pikaAllyInDanger(root.characters,actor))throw Error("Endikaki nécessite un autre allié à moins de 20 % de ses PV")
  const max=special?20:12,roll=dice(max),crit=roll===max,fail=roll===1,level=Math.max(1,combatInt(raw.lvl,1)),bonus=getBalanceLevelBonus(level)
  recordHeroCritical(root,actor,crit,fail)
  if(kind==="hypnosis")c.pikaHypnosisReadyRound=round+3
  if(special){c.playerSpecials||={};c.playerSpecials[actor]=true}
  const targetPosition=pikaPosition(root,slot)
  const result={targetPosition:targetPosition?{x:targetPosition.x,y:targetPosition.y}:null,actor,attack:attack.name,target:slot,targetName:heroDisplayName(c[slot].name),roll,dice:max,crit,fail,special,pikaKind:kind,mode:"damage",amount:0}
  if(raw.cursedEffect==="critOnly"&&raw.cursedCombatId===c.id&&!crit){result.mode="curse-blocked";result.message="Malédiction : seul un critique produit un effet";nextCombatTurn(root,request);return result}
  if(kind==="hypnosis") {
    const threshold=pikaHypnosisThreshold(c[slot]),success=!fail&&roll>=threshold,turns=crit?2:1
    result.mode="control";result.threshold=threshold;result.hypnotized=success&&arbitrationEffects(root,slot);result.hypnosisTurns=result.hypnotized?turns:0
    if(result.hypnotized)c[slot].pikaHypnosisTurns=Math.max(c[slot].pikaHypnosisTurns||0,turns)
    result.message=fail?"Échec critique : la séduction échoue.":!success?result.targetName+" résiste à la séduction.":result.hypnotized?result.targetName+" hypnotisé : "+turns+" tour(s) complet(s) neutralisé(s).":"L’effet est annulé par la décision du MJ."
    combatRecord(root,request,"PIKA",result.targetName,0,"hypnosis",result.message)
  } else {
    let damage=0
    if(kind==="cancan"){result.kicks=pikaKickCount(roll);damage=result.kicks*Math.max(1,3+combatInt(data.force)+Math.floor(bonus/3))}
    if(kind==="laugh"&&!fail){damage=roll+combatInt(data.charme)+bonus;const other=livingMobs(c).find(id=>id!==slot);if(crit&&other){result.bounceTarget=other;result.bounceAmount=combatDamage(root,request,"PIKA — Rire KRRKRR",other,Math.floor(damage*.5))}else if(crit)damage=Math.round(damage*1.5)}
    if(kind==="endikaki"&&!fail)damage=Math.round((roll+combatInt(data.charme)+bonus)*1.8+8+(level-1)*2)*(crit?2:1)
    if(!fail&&c[slot].bibiRage?.turns>0)damage+=c[slot].bibiRage.damage||2
    result.amount=combatDamage(root,request,"PIKA — "+attack.name,slot,Math.max(0,damage))
    result.message=kind==="cancan"?result.kicks+" coup(s) de pied — "+result.amount+" dégâts":kind==="endikaki"?"Endikaki explose — "+result.amount+" dégâts":"Ce rire est tellement bizarre que l’ennemi en reste sans voix — "+result.amount+" dégâts"
  }
  nextCombatTurn(root,request);return result
}
function pikaNpcSpecialReady(root,actor) {
  return COMBAT_MOBS.some(id=>id!==actor&&root.combat[id]&&Number(root.combat[id].hp)>=0&&Number(root.combat[id].hp)*5<Math.max(1,root.combat[id].maxHP||1))
}
function resolvePikaNpcAction(root,request,dice) {
  const c=root.combat,slot=request.actor,mob=c[slot],payload=request.payload||{}
  requireCombatTurn(root,request,slot)
  const normals=getMobAttacksForMob(mob.name,mob.tier),special=getMobSpecialAttack(mob.name,mob.tier)
  let attack=[...normals,...(special?[special]:[])].find(a=>a.name===payload.attack),randomRoll=null
  if(payload.random){randomRoll=dice(20);const hint=payload.target||livingHeroes(root)[0];let choices=randomRoll===20&&!mob.specialUsed&&pikaNpcSpecialReady(root,slot)?[special]:normals.filter(a=>a.name!==mob.lastAttack&&(a.pikaKind!=="hypnosis"||!pikaRechargeLeft(c,slot))&&(a.pikaKind!=="cancan"||pikaAtContact(root,slot,hint)));if(!choices.length)choices=normals.filter(a=>a.pikaKind==="laugh");attack=choices[dice(choices.length)-1]}
  if(!attack)throw Error("Attaque de Pika inconnue")
  if(attack.special&&(mob.specialUsed||!pikaNpcSpecialReady(root,slot)))throw Error("Endikaki nécessite un autre allié de Pika PNJ sous 20 % et ne sert qu’une fois par combat")
  if(attack.pikaKind==="hypnosis"&&pikaRechargeLeft(c,slot)>0)throw Error("Je suis une fille recharge encore")
  const targets=root.__arbitration?.targets?.filter(id=>livingHeroes(root).includes(id))||chooseEnemyTarget(root,slot,attack,payload.target,dice),target=targets[0]
  if(!livingHeroes(root).includes(target))throw Error("Choisissez un héros vivant")
  if(attack.pikaKind==="cancan"&&!pikaAtContact(root,slot,target))throw Error("French cancan nécessite le contact avec la cible")
  const max=attack.special?20:12,roll=dice(max),crit=roll===max,fail=roll===1,range=getMobDamageRange(attack,mob.lvl,mob.tier,mob)
  const result={actor:slot,attack:attack.name,target,targetName:heroDisplayName(target),targets:[target],roll,dice:max,crit,fail,special:!!attack.special,pikaKind:attack.pikaKind,mode:"enemy",amount:0}
  const hit=(id,amount)=>{const character=root.characters[id],before=character.hp;character.hp=Math.max(0,before-arbitrationAmount(root,id,amount));combatRecord(root,request,"PIKA",heroDisplayName(id),before-character.hp,"mob",attack.name);return before-character.hp}
  if(attack.pikaKind==="hypnosis"){
    mob.pikaHypnosisReadyRound=(c.turnState.round||1)+3;result.hypnotized=!fail&&roll>=4&&arbitrationEffects(root,target);result.hypnosisTurns=result.hypnotized?(crit?2:1):0
    if(result.hypnotized){c.heroStuns||={};c.heroHypnosis||={};const owner=combatOwner(target);c.heroStuns[owner]=Math.max(c.heroStuns[owner]||0,result.hypnosisTurns);c.heroHypnosis[owner]=result.hypnosisTurns}
    result.message=result.hypnotized?heroDisplayName(target)+" hypnotisé pendant "+result.hypnosisTurns+" tour(s)":"La séduction échoue."
  }else{
    let damage=fail?0:Math.round(range.min+(range.max-range.min)*(roll-2)/Math.max(1,max-2))
    if(attack.pikaKind==="cancan"){result.kicks=pikaKickCount(roll);damage=Math.round((range.min+range.max)/2*result.kicks*.5)}
    if(attack.pikaKind==="endikaki"&&crit)damage*=2
    if(attack.pikaKind==="laugh"&&crit){const other=livingHeroes(root).find(id=>id!==target);if(other){result.bounceTarget=other;result.bounceAmount=hit(other,Math.floor(damage*.5))}else damage=Math.round(damage*1.5)}
    if(mob.attackMalus)damage=Math.max(0,damage-(mob.attackMalus.amount||0))
    if(mob.malus?.source==="La Sorcière")damage=Math.round(damage*.75)
    result.amount=hit(target,Math.max(0,damage));result.message=attack.pikaKind==="endikaki"?"Endikaki explose !":attack.pikaKind==="cancan"?result.kicks+" coup(s) de pied":"Un rire tellement bizarre que l’adversaire en reste sans voix."
  }
  if(attack.special)mob.specialUsed=true;mob.lastAttack=attack.name
  nextCombatTurn(root,request);return result
}
function presentPikaAttack(result) {
  showNotification(result.message||result.attack)
  if(result.mode==="curse-blocked")return
  if(result.pikaKind!=="endikaki") {
    const effect=document.createElement("div");effect.className="pika-attack-effect";effect.textContent=result.pikaKind==="cancan"?"👢 × "+(result.kicks||0):result.pikaKind==="hypnosis"?(result.hypnotized?"✧ HYPNOSE ✧":"RÉSISTANCE"):"KRRKRR";document.body.appendChild(effect);setTimeout(()=>effect.remove(),1800);return
  }
  const idFor=id=>id==="mob"?"mobToken":COMBAT_MOBS.includes(id)?"mobToken_"+id:id
  const from=document.getElementById(idFor(result.actor))?.getBoundingClientRect();let to=document.getElementById(idFor(result.target))?.getBoundingClientRect()
  if((!to||!to.width)&&result.targetPosition){const map=document.getElementById("map")?.getBoundingClientRect(),scale=typeof cameraZoom!=="undefined"?cameraZoom:1;if(map)to={left:map.left+result.targetPosition.x*scale,top:map.top+result.targetPosition.y*scale,width:80*scale,height:80*scale}}
  const bomb=document.createElement("img");bomb.className="endikaki-bomb-token";bomb.src="images/endikaki-token.svg";bomb.alt="Endikaki, invocation bombe";bomb.style.left=(from?from.left+from.width/2:innerWidth*.3)+"px";bomb.style.top=(from?from.top+from.height/2:innerHeight*.55)+"px";document.body.appendChild(bomb)
  requestAnimationFrame(()=>{bomb.style.left=(to?to.left+to.width/2:innerWidth*.7)+"px";bomb.style.top=(to?to.top+to.height/2:innerHeight*.55)+"px";bomb.style.transform="translate(-50%,-50%) rotate(720deg) scale(.7)"})
  setTimeout(()=>{const x=bomb.style.left,y=bomb.style.top;bomb.remove();const blast=document.createElement("div");blast.className="endikaki-blast";blast.style.left=x;blast.style.top=y;blast.textContent=result.fail?"✧":"💥";document.body.appendChild(blast);if(!result.fail){if(typeof screenShake==="function")screenShake();if(typeof playSound==="function")playSound("powerSound",.3)}setTimeout(()=>blast.remove(),900)},950)
}
