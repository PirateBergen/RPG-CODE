function resolveAllyCombatAction(root, request, dice) {
  if(!combatHasWorldBoss(root))throw Error("Les invocations sont réservées aux combats de world boss")
  requireCombatTurn(root, request, request.actor)
  const payload = request.payload || {}, pnj = ALLY_PNJS.find(p => p.id === payload.pnjId), action = pnj?.actions.find(a => a.id === payload.actionId)
  if (!pnj || !action) throw new Error("Action alliée inconnue")
  if (root.combat.usedAllies?.[action.id]) throw new Error("Cette intervention a déjà été utilisée")
  if (root.roles?.[request.uid] !== "gm" && (root.game.playerAllyAccess?.scope === "exploration" || root.game.playerAllyAccess?.actionId !== action.id || (root.game.playerAllyAccess.playerId&&root.game.playerAllyAccess.playerId!==request.actor) || (root.game.playerAllyAccess.combatId&&root.game.playerAllyAccess.combatId!==root.combat.id))) throw new Error("Le MJ doit autoriser cette intervention")
  const enhanced=enhancedCombatCriticals(root.combat)
  if(enhanced&&(root.combat.allyRetryRounds?.[action.id]||0)>(root.combat.turnState?.round||1))throw Error("Thor reprend ses forces : nouvelle tentative au prochain round")
  if(enhanced){
    if(["heal","buff"].includes(action.type)){const target=combatFriendlyTarget(root,payload.target);if(!target||!COMBAT_CHARACTERS.includes(payload.target)||action.type==="buff"&&target.hp<=0)throw Error("Choisissez un héros valide")}
    else if(!livingMobs(root.combat).includes(payload.target||livingMobs(root.combat)[0]))throw Error("Choisissez un ennemi vivant")
  }
  const roll = dice(action.dice), crit = roll !== 1 && roll >= (action.critMin || action.dice);let fail = roll === 1,thorVictory=false
  let amount = 0,thorLethalDamage=0,totalAllyDamage=0
  const consequences=[]
  const wasKO=combatFriendlyTarget(root,payload.target)?.hp<=0
  const thorRetry=enhanced&&fail&&action.id==="thor_mjolnir"&&isJormungandr(root.combat[payload.target||livingMobs(root.combat)[0]])&&isForchurMap(root.game?.combatState?.returnMap||root.game?.map)
  if(enhanced&&fail){
    consequences.push(thorRetry?"Échec critique : Thor rate Jörmungandr, aucun dégât. L’action du héros est consommée. Le MJ peut réautoriser Thor au prochain round pour conserver une issue à ce combat.":"Échec critique : intervention ratée, aucun dégât, soin ou effet. L’intervention et l’action du héros sont consommées.")
  } else if (action.type === "damage") {
    amount = root.combat.balanceVersion===3?calibratedAllyDamage(pnj,action,roll,crit,fail,root.combat.mob.partyLevel,combatCriticalMultiplier(root.combat)):Math.round((action.dmgBase + roll * action.dmgBonus) * (crit && action.critMult ? action.critMult : 1) * (fail ? .2 : 1))
    const targets=action.chainMin&&roll>=action.chainMin?livingMobs(root.combat):[payload.target||livingMobs(root.combat)[0]]
    const thorMjolnir=pnj.id==="thor"&&action.id==="thor_mjolnir"
    targets.forEach(slot=>{
      if(!livingMobs(root.combat).includes(slot))throw Error("Choisissez un ennemi vivant")
      const dealt=combatDamage(root,request,pnj.name,slot,root.combat.balanceVersion===3&&!isJormungandr(root.combat[slot])?Math.min(amount,Math.round(root.combat[slot].maxHP*(enhanced&&crit?.5:.4))):amount,"dmg",{thorMjolnir,...(enhanced?{damageCap:Math.floor(root.combat[slot].maxHP*(crit?.5:.4))}:{})})
      totalAllyDamage+=dealt
      if(action.staggerOnCrit&&crit&&dealt>0&&root.combat[slot].hp>0){root.combat[slot].allyStagger=true;consequences.push(heroDisplayName(root.combat[slot].name)+" : prochaine action interrompue.")}
      if(thorMjolnir&&isJormungandr(root.combat[slot])&&dealt>0){thorLethalDamage=dealt;thorVictory=true;fail=false}
    })
    if(thorVictory)amount=thorLethalDamage
    else if(root.combat.balanceVersion===3)amount=totalAllyDamage
    if(crit&&!thorVictory)consequences.push("Critique : dégâts multipliés par "+(root.combat.balanceVersion===3?combatCriticalMultiplier(root.combat):action.critMult||1)+" avant protections et limites."+(root.combat.balanceVersion===3?" Intervention limitée à "+(enhanced?50:40)+" % des PV maximum de chaque cible, sauf Thor contre Jörmungandr.":""))
    if(targets.length>1)consequences.push("Attaque en chaîne : "+targets.length+" ennemis ciblés.")
  } else if (action.type === "heal") {
    if(enhanced&&wasKO&&!crit)consequences.push("Résurrection manquée : un critique est nécessaire. L’intervention et l’action sont consommées.")
    else amount = combatHeal(root, request, pnj.name, payload.target, root.combat.balanceVersion===3?Math.round(calibratedAllyHeal(pnj,roll,action.dice,root.combat.mob.partyLevel)*(enhanced&&crit&&!wasKO?1.5:1)):roll * (action.healMult || 1), crit)
  }
  else if (action.type === "buff") {
    const target = root.characters[payload.target]; if (!target || target.hp <= 0) throw new Error("Choisissez un héros vivant")
    const turns=enhanced&&crit?4:3
    const stat = playerMainStat[payload.target]; amount = root.combat.balanceVersion===3?Math.max(1,Math.round(combatInt(target[stat])*(.15+.15*roll/action.dice))):roll * (action.buffMult || 1); if(root.combat.balanceVersion===3){root.combat.heroBuffs||={};root.combat.heroBuffs[payload.target]={stat,amount,turns}}else target[stat] = Math.min(999, combatInt(target[stat]) + amount)
    combatRecord(root, request, pnj.name, payload.target.toUpperCase(), amount, "buff", pnj.name + " renforce " + combatFriendlyName(payload.target)+" : +"+amount+" "+stat+(root.combat.balanceVersion===3?" pendant "+turns+" rounds":""))
  } else if (action.type === "malus" && roll >= (action.threshold || 10)) {
    const slot = payload.target || livingMobs(root.combat)[0]; if (!livingMobs(root.combat).includes(slot)) throw new Error("Choisissez un ennemi vivant")
    if (pnj.id === "odin") root.combat[slot].attackMalus = { amount: root.combat.balanceVersion===3?Math.max(1,Math.round(calibratedHealth(root.combat.mob.partyLevel)*.04*(enhanced&&crit?1.25:1))):15 }
    root.combat[slot].malus = { label: action.label, source: pnj.name, roll,...(enhanced&&crit&&pnj.id==="witch"?{damageReduction:.35}:{}) }
    combatRecord(root, request, pnj.name, root.combat[slot].name, 0, "malus", pnj.name + " — " + action.label+(pnj.id==="odin"?" : attaques ennemies −"+root.combat[slot].attackMalus.amount+" dégâts jusqu’à la fin du combat":pnj.id==="witch"?" : dégâts ennemis −"+(enhanced&&crit?35:25)+" % jusqu’à la fin du combat":""))
  } else if(action.type==="malus"){
    consequences.push("Seuil "+(action.threshold||10)+" non atteint : aucun affaiblissement appliqué.")
  }
  if(action.type==="heal"&&crit)consequences.push(wasKO?"Critique : résurrection avec tous les PV maximum.":enhanced?"Critique : soin renforcé ×1,5, limité aux PV maximum.":"Cible déjà vivante : soin normal, limité aux PV maximum ; aucun bonus de soin critique supplémentaire prévu actuellement.")
  if(crit&&["buff","malus"].includes(action.type))consequences.push(enhanced?(action.type==="buff"?"Critique : bonus prolongé à 4 rounds.":pnj.id==="witch"?"Critique : dégâts ennemis réduits de 35 % au lieu de 25 %.":"Critique : affaiblissement renforcé de 25 % avant arrondi."):"Aucun bonus critique supplémentaire prévu pour ce soutien actuellement.")
  const explanation=consequences.join(" ")
  root.combat.usedAllies ||= {}
  if(thorRetry){root.combat.allyRetryRounds||={};root.combat.allyRetryRounds[action.id]=(root.combat.turnState?.round||1)+1}
  else {root.combat.usedAllies[action.id] = true;if(root.combat.allyRetryRounds)delete root.combat.allyRetryRounds[action.id]}
  delete root.game.playerAllyAccess
  nextCombatTurn(root, request)
  return { actor: request.actor, attack: action.label, pnjId: pnj.id, actionId: action.id, target: payload.target || "", roll, dice: action.dice, crit, fail, amount, explanation, interventionFailed:enhanced&&(fail||action.type==="heal"&&wasKO&&!crit), mode: "ally",...(thorVictory?{thorVictory:true,message:"Mjölnir frappe : Jörmungandr est vaincu par Thor."}:{}) }
}

