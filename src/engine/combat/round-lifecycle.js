function tickCombatRound(root, request) {
  COMBAT_MOBS.forEach(slot => {
    const mob = root.combat[slot]; if (!mob) return
    ;["playerPoison", "playerBleed"].forEach(key => {
      const effect = mob[key]
      if (effect?.turns > 0) combatDamage(root, request, key === "playerPoison" ? "POISON" : "SAIGNEMENT", slot, effect.damage || 1)
    })
    ;["playerPoison", "playerBleed", "bibiRage", "yuAggro", "attackMalus"].forEach(key => {
      if (mob[key]?.turns > 0 && --mob[key].turns <= 0) delete mob[key]
    })
  })
  Object.entries(root.combat.heroDebuffs || {}).forEach(([id, effect]) => { if (--effect.turns <= 0) delete root.combat.heroDebuffs[id] })
  for(const field of ["heroBuffs","heroPowerBuffs"])for(const [id,buff]of Object.entries(root.combat[field]||{}))if(--buff.turns<=0)delete root.combat[field][id]
  const summon = root.combat.eloSummon
  if(summon)for(const key of ["debuffRounds"])if(summon[key]>0)summon[key]--
  if (summon && (--summon.turnsLeft <= 0 || combatInt(summon.hp) <= 0)) delete root.combat.eloSummon
  tickKrakenHolds(root,request)
  gmTickStatusRound(root,request)
}

function nextCombatTurn(root, request, skipRemaining = false) {
  const state = root.combat.turnState
  const order = state.order || []
  if (!order.length || combatOutcome(root, request)) return
  const current=state.currentActorId,mob=root.combat[current]
  const haste=root.combat.heroHaste
  if(haste&&combatOwner(haste.actor)===current){
   if(request.kind==="hero"&&request.actor===haste.actor&&haste.remaining>1){haste.remaining--;state.sequence=combatInt(state.sequence)+1;return}
   delete root.combat.heroHaste
  }
  if(!skipRemaining&&request.kind!=="pass"&&COMBAT_MOBS.includes(current)&&mob?.hp>0&&(state.actorActionIndex||0)+1<Math.min(2,mob.actionsPerTurn||1)){state.actorActionIndex=(state.actorActionIndex||0)+1;state.sequence=combatInt(state.sequence)+1;return}
  gmEndStatusTurn(root,current)
  state.actorActionIndex=0
  for (let attempts = 0; attempts < order.length*101; attempts++) {
    state.currentIndex = (combatInt(state.currentIndex) + 1) % order.length
    if (state.currentIndex === 0) { tickCombatRound(root, request); state.round = Math.max(1, combatInt(state.round, 1)) + 1 }
    if (combatOutcome(root, request)) return
    const id = order[state.currentIndex].id
    if(root.combat[id]?.reihktParalyzed){delete root.combat[id].reihktParalyzed;gmBeginStatusTurn(root,id);gmEndStatusTurn(root,id);continue}
    if (combatActorAlive(root, id)) {
      if(!gmBeginStatusTurn(root,id))continue
      if (root.combat.heroStuns?.[id] > 0) { root.combat.heroStuns[id]--;if(root.combat.heroHypnosis?.[id]>0)root.combat.heroHypnosis[id]--;gmEndStatusTurn(root,id); continue }
      if(COMBAT_MOBS.includes(id)&&root.combat[id]?.pikaHypnosisTurns>0){root.combat[id].pikaHypnosisTurns--;gmEndStatusTurn(root,id);continue}
      state.currentActorId = id; state.sequence = combatInt(state.sequence) + 1; return
    }
  }
}

function requireCombatTurn(root, request, actor) {
  const state = root.combat.turnState
  if(request.kind!=="pass"&&gmParalyzed(root,actor))throw Error("Cet acteur est paralysé par le MJ")
  if (state?.phase !== "active" || root.combat.phase === "finished") throw new Error("Le combat n’est pas prêt à recevoir une action")
  if (state.currentActorId !== combatOwner(actor)) throw new Error("Ce n’est pas le tour de cet acteur")
  if (combatInt(request.sequence) !== combatInt(state.sequence)) throw new Error("Ce tour est déjà terminé")
  if (!combatActorAlive(root, actor) || (actor !== "greg" && COMBAT_CHARACTERS.includes(actor) && combatInt(root.characters[actor].hp) <= 0) || (actor === "greg" && request.kind !== "pass" && combatInt(root.characters.greg.hp) <= 0)) throw new Error("Cet acteur est KO")
}

