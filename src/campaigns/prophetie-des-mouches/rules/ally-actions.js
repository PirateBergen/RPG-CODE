function resolveAllyCombatAction(root, request, dice) {
  if(!combatHasWorldBoss(root))throw Error("Les invocations sont réservées aux combats de world boss")
  requireCombatTurn(root, request, request.actor)
  const payload = request.payload || {}, pnj = ALLY_PNJS.find(p => p.id === payload.pnjId), action = pnj?.actions.find(a => a.id === payload.actionId)
  if (!pnj || !action) throw new Error("Action alliée inconnue")
  if (root.combat.usedAllies?.[action.id]) throw new Error("Cette intervention a déjà été utilisée")
  if (root.roles?.[request.uid] !== "gm" && (root.game.playerAllyAccess?.scope === "exploration" || root.game.playerAllyAccess?.actionId !== action.id || (root.game.playerAllyAccess.playerId&&root.game.playerAllyAccess.playerId!==request.actor) || (root.game.playerAllyAccess.combatId&&root.game.playerAllyAccess.combatId!==root.combat.id))) throw new Error("Le MJ doit autoriser cette intervention")
  const roll = dice(action.dice), crit = roll >= (action.critMin || action.dice);let fail = roll === 1,thorVictory=false
  let amount = 0,thorLethalDamage=0,totalAllyDamage=0
  const consequences=[]
  const wasKO=combatFriendlyTarget(root,payload.target)?.hp<=0
  if (action.type === "damage") {
    amount = root.combat.balanceVersion===3?calibratedAllyDamage(pnj,action,roll,crit,fail,root.combat.mob.partyLevel):Math.round((action.dmgBase + roll * action.dmgBonus) * (crit && action.critMult ? action.critMult : 1) * (fail ? .2 : 1))
    const targets=action.chainMin&&roll>=action.chainMin?livingMobs(root.combat):[payload.target||livingMobs(root.combat)[0]]
    const thorMjolnir=pnj.id==="thor"&&action.id==="thor_mjolnir"
    targets.forEach(slot=>{
      if(!livingMobs(root.combat).includes(slot))throw Error("Choisissez un ennemi vivant")
      const dealt=combatDamage(root,request,pnj.name,slot,root.combat.balanceVersion===3&&!isJormungandr(root.combat[slot])?Math.min(amount,Math.round(root.combat[slot].maxHP*.4)):amount,"dmg",{thorMjolnir})
      totalAllyDamage+=dealt
      if(action.staggerOnCrit&&crit&&dealt>0&&root.combat[slot].hp>0){root.combat[slot].allyStagger=true;consequences.push(heroDisplayName(root.combat[slot].name)+" : prochaine action interrompue.")}
      if(thorMjolnir&&isJormungandr(root.combat[slot])&&dealt>0){thorLethalDamage=dealt;thorVictory=true;fail=false}
    })
    if(thorVictory)amount=thorLethalDamage
    else if(root.combat.balanceVersion===3)amount=totalAllyDamage
    if(crit&&!thorVictory)consequences.push("Critique : dégâts multipliés par "+(root.combat.balanceVersion===3?1.6:action.critMult||1)+" avant protections et limites."+(root.combat.balanceVersion===3?" Intervention limitée à 40 % des PV maximum de chaque cible, sauf Thor contre Jörmungandr.":""))
    if(targets.length>1)consequences.push("Attaque en chaîne : "+targets.length+" ennemis ciblés.")
  } else if (action.type === "heal") amount = combatHeal(root, request, pnj.name, payload.target, root.combat.balanceVersion===3?calibratedAllyHeal(pnj,roll,action.dice,root.combat.mob.partyLevel):roll * (action.healMult || 1), crit)
  else if (action.type === "buff") {
    const target = root.characters[payload.target]; if (!target || target.hp <= 0) throw new Error("Choisissez un héros vivant")
    const stat = playerMainStat[payload.target]; amount = root.combat.balanceVersion===3?Math.max(1,Math.round(combatInt(target[stat])*(.15+.15*roll/action.dice))):roll * (action.buffMult || 1); if(root.combat.balanceVersion===3){root.combat.heroBuffs||={};root.combat.heroBuffs[payload.target]={stat,amount,turns:3}}else target[stat] = Math.min(999, combatInt(target[stat]) + amount)
    combatRecord(root, request, pnj.name, payload.target.toUpperCase(), amount, "buff", pnj.name + " renforce " + combatFriendlyName(payload.target)+" : +"+amount+" "+stat+(root.combat.balanceVersion===3?" pendant 3 rounds":""))
  } else if (action.type === "malus" && roll >= (action.threshold || 10)) {
    const slot = payload.target || livingMobs(root.combat)[0]; if (!livingMobs(root.combat).includes(slot)) throw new Error("Choisissez un ennemi vivant")
    if (pnj.id === "odin") root.combat[slot].attackMalus = { amount: root.combat.balanceVersion===3?Math.max(1,Math.round(calibratedHealth(root.combat.mob.partyLevel)*.04)):15 }
    root.combat[slot].malus = { label: action.label, source: pnj.name, roll }
    combatRecord(root, request, pnj.name, root.combat[slot].name, 0, "malus", pnj.name + " — " + action.label+(pnj.id==="odin"?" : attaques ennemies −"+root.combat[slot].attackMalus.amount+" dégâts jusqu’à la fin du combat":pnj.id==="witch"?" : dégâts ennemis −25 % jusqu’à la fin du combat":""))
  } else if(action.type==="malus"){
    consequences.push("Seuil "+(action.threshold||10)+" non atteint : aucun affaiblissement appliqué.")
  }
  if(action.type==="heal"&&crit)consequences.push(wasKO?"Critique : résurrection avec tous les PV maximum.":"Cible déjà vivante : soin normal, limité aux PV maximum ; aucun bonus de soin critique supplémentaire prévu actuellement.")
  if(crit&&["buff","malus"].includes(action.type))consequences.push("Aucun bonus critique supplémentaire prévu pour ce soutien actuellement.")
  const explanation=consequences.join(" ")
  root.combat.usedAllies ||= {}; root.combat.usedAllies[action.id] = true
  delete root.game.playerAllyAccess
  nextCombatTurn(root, request)
  return { actor: request.actor, attack: action.label, pnjId: pnj.id, actionId: action.id, target: payload.target || "", roll, dice: action.dice, crit, fail, amount, explanation, mode: "ally",...(thorVictory?{thorVictory:true,message:"Mjölnir frappe : Jörmungandr est vaincu par Thor."}:{}) }
}

