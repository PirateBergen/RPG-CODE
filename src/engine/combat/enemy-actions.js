function resolveEnemyCombatAction(root, request, dice) {
  const slot = request.actor, c = root.combat, mob = c[slot], payload = request.payload || {}
  requireCombatTurn(root, request, slot)
  if (!mob) throw new Error("Ennemi introuvable")
  if(mob.allyStagger){delete mob.allyStagger;nextCombatTurn(root,request);return {actor:slot,mode:"skip",message:"Le courroux du Jarl interrompt cette action"}}
  const special = getMobSpecialAttack(mob.name, mob.tier || "weak")
  const normal = getMobAttacksForMob(mob.name, mob.tier || "weak")
  let specialRoll = null
  let attack = payload.random ? null : [...normal, ...(special ? [special] : [])].find(a => a.name === payload.attack)
  if (payload.random) {
    specialRoll = dice(20)
    const charged=mob.chargingSpecial&&c.turnState.round>=mob.chargingSpecial.readyRound
    const choices = (charged || (!mob.chargingSpecial&&specialRoll === 20)) && special && !mob.specialUsed ? [special] : normal.filter(a => normal.length === 1 || a.name !== mob.lastAttack)
    attack = choices[dice(choices.length) - 1]
  }
  if (!attack) throw new Error("Attaque ennemie inconnue")
  if (!attack.special && normal.length > 1 && mob.lastAttack === attack.name) throw new Error("Cette attaque recharge ; choisissez-en une autre ou passez le tour")
  if (attack.special && mob.specialUsed) throw new Error("Spéciale déjà utilisée")
  if (mob.yuSkipNextTurn?.active) { delete mob.yuSkipNextTurn; nextCombatTurn(root, request,true); return { actor: slot, mode: "skip", message: "L’ennemi est neutralisé pour cette action" } }
  let reaction=null
  if(attack.special&&mob.balanceClass==="world"){
    if(!mob.chargingSpecial){mob.chargingSpecial={id:request.id,name:attack.name,readyRound:(c.turnState.round||1)+1};nextCombatTurn(root,request);return {actor:slot,mode:"warning",attack:attack.name,special:true,message:heroDisplayName(mob.name).toUpperCase()+" prépare « "+attack.name+" » pour le prochain round !"}}
    if(c.turnState.round<mob.chargingSpecial.readyRound)throw new Error("La spéciale se prépare pour le prochain round ; choisissez une autre action")
    reaction=mob.chargingSpecial.reaction
    if(reaction?.status==="rolling")throw Error("Réactions en attente : le MJ doit valider les protections ou annuler l’événement")
    delete mob.chargingSpecial
  }
  let targets = chooseEnemyTarget(root, slot, attack, payload.target, dice)
  const range = getMobDamageRange(attack, mob.lvl || 1, mob.tier || "weak",mob)
  let damage = range.min + dice(range.max - range.min + 1) - 1
  if (mob.attackMalus) damage = Math.max(0, damage - (mob.attackMalus.amount || 0))
  if (mob.malus?.source === "La Sorcière") damage = Math.round(damage * .75)
  damage=gmOutgoingDamage(root,slot,damage)
  if(mob.balrogSwordWeaken){damage=Math.round(damage*(1-mob.balrogSwordWeaken));delete mob.balrogSwordWeaken}
  let applied = 0
  targets.forEach(id => {
    const victim=combatFriendlyTarget(root,id),before = combatInt(victim.hp)
    const reduction=reaction?.status==="ready"?reaction.decisions?.[id]||0:0
    const reactedDamage=Math.round(damage*(1-reduction/100)),protectedDamage=gmIncomingDamage(root,id,reactedDamage),taken=c.balanceVersion===3?calibratedIncomingDamage(id==="eloSummon"?victim:combatCharacter(root,id),protectedDamage):protectedDamage
    if(reduction)combatRecord(root,request,"RÉACTION MJ",combatFriendlyName(id),0,"reaction",combatFriendlyName(id)+" : protection −"+reduction+" % contre « "+attack.name+" » ("+damage+" → "+reactedDamage+" avant armure et autres protections)")
    victim.hp = Math.max(0, before - Math.max(0,combatInt(taken))); applied += before - victim.hp
    if(reduction===100){combatRecord(root,request,heroDisplayName(mob.name),combatFriendlyName(id),0,"mob",combatFriendlyName(id)+" évite complètement « "+attack.name+" » : aucun dégât ni effet secondaire");return}
    if(id==="eloSummon"){if(attack.effect==="stun")victim.stunnedAttacks=1;if(attack.effect==="debuff")victim.debuffRounds=2;combatRecord(root,request,heroDisplayName(mob.name),"John Pork",before-victim.hp,"mob","John Pork encaisse "+(before-victim.hp)+" dégâts");return}
    if (id !== "bibi" && attack.effect === "curse") root.characters[id].curse = Math.min(8, combatInt(root.characters[id].curse) + 1)
    if (attack.effect === "stun") { c.heroStuns ||= {}; c.heroStuns[combatOwner(id)] = 1 }
    if (attack.effect === "debuff") { c.heroDebuffs ||= {}; c.heroDebuffs[id] = { amount: 2, turns: 2 } }
    combatRecord(root, request, heroDisplayName(mob.name).toUpperCase(), id.toUpperCase(), before - root.characters[id].hp, "mob", heroDisplayName(mob.name) + " — " + attack.name + " → " + id.toUpperCase() + " : -" + (before - root.characters[id].hp) + " PV")
  })
  if (attack.special) mob.specialUsed = true
  if (attack.healSelfRatio) mob.hp = Math.min(mob.maxHP, mob.hp + Math.round(applied * attack.healSelfRatio))
  mob.lastAttack = attack.name
  const presentation = { attackName: attack.name+(mob.balanceClass==="world"&&mob.hp<=mob.maxHP*.5?" — Furie":""), icon: attack.icon || "⚔", dmg: targets.length===1?applied:damage, damageSummary:targets.map(id=>{const hit=Object.entries(c.hits||{}).filter(([key])=>key.startsWith(request.id+"_")).map(([,hit])=>hit).filter(h=>h.type==="mob"&&(h.to===id.toUpperCase()||id==="eloSummon"&&h.to==="John Pork")).at(-1);return combatFriendlyName(id)+" −"+(hit?.amount||0)+" PV"}).join(" · "), target: targets.length > 1 ? "TOUS" : combatFriendlyName(targets[0]||"AUCUNE").toUpperCase(), mobName: heroDisplayName(mob.name).toUpperCase(), time: request.time, special: !!attack.special, animation: attack.animation || "" }
  nextCombatTurn(root, request)
  return { actor: slot, attack: attack.name, amount: applied, targets, mode: "enemy", special: !!attack.special, presentation, ...(specialRoll ? {roll:specialRoll,dice:20} : {}) }
}

