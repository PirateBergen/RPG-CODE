"use strict"

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
  const positions=id==="mob"?[root.tokens?.[key],root.combat?.[id],root.combat?.presentation?.positions?.[key]]:[root.combat?.[id],root.tokens?.[key],root.combat?.presentation?.positions?.[key]]
  return positions.find(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))
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
function presentPikaAttack(result) {
  showNotification(result.message||result.attack)
  if(result.mode==="curse-blocked")return
  if(result.pikaKind!=="endikaki") {
    const effect=document.createElement("div");effect.className="pika-attack-effect";effect.textContent=result.pikaKind==="cancan"?"👢 × "+(result.kicks||0):result.pikaKind==="hypnosis"?(result.hypnotized?"✧ HYPNOSE ✧":"RÉSISTANCE"):"KRRKRR";document.body.appendChild(effect);setTimeout(()=>effect.remove(),1800);return
  }
  if(typeof window.__cancelEndikakiPresentation==="function")window.__cancelEndikakiPresentation()
  const timers=new Set(),nodes=new Set();let cancelled=false
  const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);if(!cancelled)fn()},ms);timers.add(timer)}
  const cleanup=()=>{cancelled=true;for(const timer of timers)clearTimeout(timer);for(const node of nodes)node.remove();for(const id of ["endikakiInvocationSound","endikakiExplosionSound"])document.getElementById(id)?.pause();if(window.__cancelEndikakiPresentation===cleanup)window.__cancelEndikakiPresentation=null}
  window.__cancelEndikakiPresentation=cleanup
  const caption=document.createElement("section"),title=document.createElement("h2"),description=document.createElement("p");caption.className="endikaki-caption";caption.setAttribute("role","status");title.textContent=String(result.attack||"Endikaki").toUpperCase();description.textContent=result.preview?"Invocation d’Endikaki — animation et son uniquement":result.fail?"Endikaki manque sa cible…":result.message||"Endikaki fonce sur l’ennemi et explose !";caption.append(title,description);document.body.appendChild(caption);nodes.add(caption)
  const idFor=id=>id==="mob"?"mobToken":COMBAT_MOBS.includes(id)?"mobToken_"+id:id
  let from=document.getElementById(idFor(result.actor))?.getBoundingClientRect(),to=document.getElementById(idFor(result.target))?.getBoundingClientRect()
  if(!from?.width)from=null
  if((!to||!to.width)&&result.targetPosition){const map=document.getElementById("map")?.getBoundingClientRect(),scale=typeof cameraZoom!=="undefined"?cameraZoom:1;if(map)to={left:map.left+result.targetPosition.x*scale,top:map.top+result.targetPosition.y*scale,width:80*scale,height:80*scale}}
  if(!to?.width)to=null
  const x=(to?to.left+to.width/2:innerWidth*.7)+(result.fail?80:0),y=to?to.top+to.height/2:innerHeight*.55
  const bomb=document.createElement("img");bomb.className="endikaki-bomb-token";bomb.src="images/endikaki-token.svg";bomb.alt="Endikaki, invocation bombe";bomb.style.left=(from?from.left+from.width/2:innerWidth*.3)+"px";bomb.style.top=(from?from.top+from.height/2:innerHeight*.55)+"px";document.body.appendChild(bomb);nodes.add(bomb)
  playSound("endikakiInvocationSound",1,true)
  // The supplied recording lasts 1.92 s. Keep the same timeline on every screen.
  later(()=>{requestAnimationFrame(()=>{if(cancelled)return;bomb.style.left=x+"px";bomb.style.top=y+"px";bomb.style.transform="translate(-50%,-50%) rotate(720deg) scale(.7)"})},2000)
  later(()=>{bomb.remove();document.getElementById("endikakiInvocationSound")?.pause();const blast=document.createElement("div");blast.className="endikaki-blast";blast.style.left=x+"px";blast.style.top=y+"px";blast.textContent="💥";blast.setAttribute("aria-label",result.fail?"Endikaki explose à côté de la cible":"Endikaki explose");const ring=document.createElement("span");ring.className="endikaki-shockwave";blast.appendChild(ring);document.body.appendChild(blast);nodes.add(blast);playSound("endikakiExplosionSound",.3,true);if(typeof screenShake==="function")screenShake();later(()=>blast.remove(),900)},2950)
  later(cleanup,4200)
}
