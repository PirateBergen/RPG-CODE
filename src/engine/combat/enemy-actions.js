function resolveEnemyCombatAction(root, request, dice) {
  const slot = request.actor, c = root.combat, mob = c[slot], payload = request.payload || {}
  requireCombatTurn(root, request, slot)
  if (!mob) throw new Error("Ennemi introuvable")
  synchronizeKrakenStage(root,slot,request)
  if(mob.allyStagger){delete mob.allyStagger;nextCombatTurn(root,request);return {actor:slot,mode:"skip",message:"Le courroux du Jarl interrompt cette action"}}
  const special = isKrakenEncounter(mob)?krakenSpecialAttack(mob):getMobSpecialAttack(mob.name, mob.tier || "weak")
  const normal = isKrakenEncounter(mob)?krakenNormalAttacks(mob):getMobAttacksForMob(mob.name, mob.tier || "weak")
  let specialRoll = null
  let attack = payload.random ? null : [...normal, ...(special ? [special] : [])].find(a => a.name === payload.attack)
  if (payload.random) {
    specialRoll = isKrakenEncounter(mob)?null:dice(20)
    const charged=mob.chargingSpecial&&c.turnState.round>=mob.chargingSpecial.readyRound
    const shouldPrepare=isKrakenEncounter(mob)?c.turnState.round>=(mob.krakenNextSpecialRound||3):specialRoll===20
    const choices = (charged || (!mob.chargingSpecial&&shouldPrepare)) && special && !mob.specialUsed ? [special] : normal.filter(a => normal.length === 1 || a.name !== mob.lastAttack)
    attack = choices[dice(choices.length) - 1]
  }
  if (!attack) throw new Error("Attaque ennemie inconnue")
  if (!attack.special && normal.length > 1 && mob.lastAttack === attack.name) throw new Error("Cette attaque recharge ; choisissez-en une autre ou passez le tour")
  if (attack.special && mob.specialUsed) throw new Error("Spéciale déjà utilisée")
  if (mob.yuSkipNextTurn?.active) { delete mob.yuSkipNextTurn; nextCombatTurn(root, request,true); return { actor: slot, mode: "skip", message: "L’ennemi est neutralisé pour cette action" } }
  let reaction=null
  if(attack.special&&mob.balanceClass==="world"){
    if(!mob.chargingSpecial){mob.chargingSpecial={id:request.id,name:attack.name,readyRound:(c.turnState.round||1)+1,...(isKrakenEncounter(mob)?{krakenStage:attack.krakenStage}:{})};nextCombatTurn(root,request);return {actor:slot,mode:"warning",attack:attack.name,special:true,message:heroDisplayName(mob.name).toUpperCase()+" prépare « "+attack.name+" » pour le prochain round !"}}
    if(c.turnState.round<mob.chargingSpecial.readyRound)throw new Error("La spéciale se prépare pour le prochain round ; choisissez une autre action")
    reaction=mob.chargingSpecial.reaction
    if(reaction?.status==="rolling")throw Error("Réactions en attente : le MJ doit valider les protections ou annuler l’événement")
    delete mob.chargingSpecial
  }
  let targets = chooseEnemyTarget(root, slot, attack, payload.target, dice)
  const range = getMobDamageRange(attack, mob.lvl || 1, mob.tier || "weak",mob)
  let damage = range.min + dice(range.max - range.min + 1) - 1
  if (mob.attackMalus) damage = Math.max(0, damage - (mob.attackMalus.amount || 0))
  if (mob.malus?.source === "La Sorcière") damage = Math.round(damage * combatWitchDamageFactor(root,mob))
  damage=gmOutgoingDamage(root,slot,damage)
  if(mob.balrogSwordWeaken){damage=Math.round(damage*(1-mob.balrogSwordWeaken));delete mob.balrogSwordWeaken}
  const duoWeakened=!!mob.helDuoWeakened
  if(duoWeakened){damage=Math.round(damage*.5);delete mob.helDuoWeakened}
  let applied = 0
  const consequences=[]
  if(duoWeakened)consequences.push("Jugement de Hel et Nidhogg : dégâts de cette attaque réduits de 50 %. L’effet est consommé.")
  if(specialRoll)consequences.push("D20 de sélection de l’attaque : "+specialRoll+" (ce dé ne multiplie pas les dégâts).")
  targets.forEach(id => {
    const victim=combatFriendlyTarget(root,id),before = combatInt(victim.hp)
    const reduction=reaction?.status==="ready"?reaction.decisions?.[id]||0:0
    const reactedDamage=Math.round(damage*(1-reduction/100)),protectedDamage=gmIncomingDamage(root,id,reactedDamage),taken=c.balanceVersion===3?calibratedIncomingDamage(id==="eloSummon"?victim:combatCharacter(root,id),protectedDamage):protectedDamage
    if(reduction)combatRecord(root,request,"RÉACTION MJ",combatFriendlyName(id),0,"reaction",combatFriendlyName(id)+" : protection −"+reduction+" % contre « "+attack.name+" » ("+damage+" → "+reactedDamage+" avant armure et autres protections)")
    victim.hp = helPreventKO(root,request,id,before,Math.max(0, before - Math.max(0,combatInt(taken)))); applied += before - victim.hp
    if(reduction===100){combatRecord(root,request,heroDisplayName(mob.name),combatFriendlyName(id),0,"mob",combatFriendlyName(id)+" évite complètement « "+attack.name+" » : aucun dégât ni effet secondaire");return}
    if(id==="eloSummon"){if(attack.effect==="stun"){victim.stunnedAttacks=1;consequences.push("John Pork : prochain bonus d’attaque neutralisé.")}if(attack.effect==="debuff"){victim.debuffRounds=2;consequences.push("John Pork : bonus de dégâts −2 pendant 2 rounds.")}combatRecord(root,request,heroDisplayName(mob.name),"John Pork",before-victim.hp,"mob","John Pork encaisse "+(before-victim.hp)+" dégâts ("+before+" → "+victim.hp+" / "+victim.maxHP+" PV)"+(victim.hp<=0?" — KO":""));return}
    if (id !== "bibi" && attack.effect === "curse") root.characters[id].curse = Math.min(8, combatInt(root.characters[id].curse) + 1)
    if (attack.effect === "stun") { c.heroStuns ||= {}; c.heroStuns[combatOwner(id)] = 1 }
    if (attack.effect === "debuff") { c.heroDebuffs ||= {}; c.heroDebuffs[id] = { amount: 2, turns: 2 } }
    if(isKrakenEncounter(mob)&&attack.effect==="grab"&&taken>0&&!mob.krakenHold)mob.krakenHold={target:id,roundsLeft:2,startedRound:c.turnState.round||1,releaseNeeded:Math.max(1,Math.round(mob.maxHP*.10)),damageTaken:0}
    if(attack.effect==="curse"&&id!=="bibi")consequences.push(combatFriendlyName(id)+" : jauge de malédiction après attaque "+root.characters[id].curse+" / 8.")
    if(attack.effect==="stun")consequences.push(combatFriendlyName(id)+" : une action neutralisée (tour partagé pour Greg et Bibi).")
    if(attack.effect==="debuff")consequences.push(combatFriendlyName(id)+" : Force et Défense −2 pendant 2 rounds.")
    if(mob.krakenHold?.target===id&&attack.effect==="grab"&&taken>0)consequences.push(combatFriendlyName(id)+" saisi : dégâts infligés −25 %, pression en fin de round pendant 2 rounds. Libération par assistance ou "+mob.krakenHold.releaseNeeded+" dégâts cumulés sur le Kraken.")
    combatRecord(root, request, heroDisplayName(mob.name).toUpperCase(), id.toUpperCase(), before - root.characters[id].hp, "mob", heroDisplayName(mob.name) + " — " + attack.name + " → " + combatFriendlyName(id) + " : -" + (before - root.characters[id].hp) + " PV ("+before+" → "+victim.hp+")"+(victim.hp<=0?" — KO":""))
  })
  if (attack.special){mob.specialUsed = true;if(isKrakenEncounter(mob)){mob.krakenSpecialStageUsed=attack.krakenStage;mob.specialUsed=krakenSpecialUsed(mob);mob.krakenNextSpecialRound=(c.turnState.round||1)+3}}
  if(isKrakenEncounter(mob)&&mob.krakenDisorientedActions>0)mob.krakenDisorientedActions--
  if (attack.healSelfRatio) {const before=mob.hp;mob.hp = Math.min(mob.maxHP, mob.hp + Math.round(applied * attack.healSelfRatio));consequences.push(heroDisplayName(mob.name)+" récupère "+(mob.hp-before)+" PV ("+before+" → "+mob.hp+" / "+mob.maxHP+").")}
  mob.lastAttack = attack.name
  const presentation = { attackName: attack.name+(mob.balanceClass==="world"&&mob.hp<=mob.maxHP*.5?" — Furie":""), icon: attack.icon || "⚔", dmg: targets.length===1?applied:damage, damageSummary:targets.map(id=>{const hit=Object.entries(c.hits||{}).filter(([key])=>key.startsWith(request.id+"_")).map(([,hit])=>hit).filter(h=>h.type==="mob"&&(h.to===id.toUpperCase()||id==="eloSummon"&&h.to==="John Pork")).at(-1);return combatFriendlyName(id)+" −"+(hit?.amount||0)+" PV"}).join(" · "), target: targets.length > 1 ? "TOUS" : combatFriendlyName(targets[0]||"AUCUNE").toUpperCase(), mobName: heroDisplayName(mob.name).toUpperCase(), time: request.time, special: !!attack.special, animation: attack.animation || "" }
  nextCombatTurn(root, request)
  return { actor: slot, attack: attack.name, amount: applied, targets, explanation:consequences.join(" "), mode: "enemy", special: !!attack.special, presentation, ...(specialRoll ? {roll:specialRoll,dice:20} : {}) }
}

