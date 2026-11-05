"use strict"

const COMBAT_HEROES = ["greg", "ju", "elo"]
const COMBAT_MOBS = ["mob", "mob2", "mob3"]
const COMBAT_CHARACTERS = [...COMBAT_HEROES, "bibi"]
const combatClone = value => JSON.parse(JSON.stringify(value))
const combatInt = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback
const combatOwner = id => id === "bibi" ? "greg" : id

function combatRandom(seed) {
  let state = seed >>> 0
  return max => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return 1 + Math.floor(state / 4294967296 * max) }
}

function livingMobs(combat) { return COMBAT_MOBS.filter(slot => combat?.[slot] && combatInt(combat[slot].hp) > 0) }
function livingHeroes(root) { return COMBAT_CHARACTERS.filter(id => combatInt(root.characters?.[id]?.hp) > 0) }
function combatActorAlive(root, id) {
  if (id === "greg") return combatInt(root.characters?.greg?.hp) > 0 || combatInt(root.characters?.bibi?.hp) > 0
  return COMBAT_MOBS.includes(id) ? combatInt(root.combat?.[id]?.hp) > 0 : combatInt(root.characters?.[id]?.hp) > 0
}

function combatParticipants(root) {
  const list = COMBAT_HEROES.filter(id => combatActorAlive(root, id)).map(id => ({ id, type: "player", label: id === "greg" ? "Greg / Bibi" : id === "ju" ? "Yu" : "Elo", image: id + ".png" }))
  livingMobs(root.combat).forEach(slot => list.push({ id: slot, type: "mob", label: root.combat[slot].name.toUpperCase(), image: root.combat[slot].name + ".png" }))
  return list
}

function normalizeCombatTurns(root) {
  const state = root.combat?.turnState
  if (!state) return
  const oldActor = state.currentActorId === "bibi" ? "greg" : state.currentActorId
  ;["participants", "order"].forEach(key => {
    const seen = new Set()
    state[key] = (state[key] || []).filter(entry => entry.id !== "bibi" && !seen.has(entry.id) && (seen.add(entry.id), true))
    state[key].forEach(entry => { if (entry.id === "greg") entry.label = "Greg / Bibi" })
  })
  if (state.rolls) delete state.rolls.bibi
  if (state.phase === "active") {
    const index = state.order.findIndex(entry => entry.id === oldActor)
    state.currentIndex = Math.max(0, index)
    state.currentActorId = state.order[state.currentIndex]?.id || ""
  }
  state.sequence = combatInt(state.sequence)
}

function finalizedInitiative(state) {
  if (!state || state.phase !== "rolling") return null
  const participants = (state.participants || []).filter(p => p.id !== "bibi")
  if (!participants.length || participants.some(p => !Number.isInteger(state.rolls?.[p.id]) || state.rolls[p.id] < 1 || state.rolls[p.id] > 12)) return null
  const order = participants.map((p, index) => ({ ...p, index, roll: state.rolls[p.id] })).sort((a, b) => b.roll - a.roll || (a.type === b.type ? a.index - b.index : a.type === "player" ? -1 : 1))
  return { ...state, phase: "active", order, currentIndex: 0, currentActorId: order[0].id, round: 1, sequence: 0 }
}

function combatRecord(root, request, from, to, amount, type, detail) {
  root.combat.hits ||= {}
  const index = Object.keys(root.combat.hits).filter(key => key.startsWith(request.id + "_")).length
  root.combat.hits[request.id + "_" + index] = { from, to, amount: Math.max(0, combatInt(amount)), type, round: Math.max(1, combatInt(root.combat.turnState?.round, 1)), time: request.time, detail }
  const keys = Object.keys(root.combat.hits).sort((a, b) => root.combat.hits[b].time - root.combat.hits[a].time)
  keys.slice(120).forEach(key => delete root.combat.hits[key])
}

function combatCharacter(root, id) {
  const raw = root.characters?.[id]
  if (!raw) throw new Error("Personnage introuvable")
  const data = getEffectiveCharacterData(id, raw)
  const debuff = root.combat.heroDebuffs?.[id]
  if (debuff?.turns > 0) { data.force = Math.max(0, data.force - (debuff.amount || 2)); data.defense = Math.max(0, data.defense - (debuff.amount || 2)) }
  return data
}

function combatHeal(root, request, from, id, amount, resurrect = false) {
  const c = root.characters?.[id]
  if (!c || (!resurrect && combatInt(c.hp) <= 0)) throw new Error("La cible est KO ; une résurrection est nécessaire")
  const before = combatInt(c.hp), max = getCharacterMaxHp(id, c)
  c.hp = resurrect && before <= 0 ? max : Math.min(max, before + Math.max(0, combatInt(amount)))
  combatRecord(root, request, from, id, c.hp - before, "heal", from + " → " + id.toUpperCase() + " : +" + (c.hp - before) + " PV")
  return c.hp - before
}

function combatDamage(root, request, from, slot, amount, type = "dmg") {
  const target = root.combat[slot]
  if (!target || combatInt(target.hp) <= 0) return 0
  const before = combatInt(target.hp)
  target.hp = Math.max(0, before - Math.max(0, combatInt(amount)))
  combatRecord(root, request, from, target.name.toUpperCase(), before - target.hp, type, from + " → " + target.name.toUpperCase() + " : -" + (before - target.hp) + " PV")
  return before - target.hp
}

function combatOutcome(root, request) {
  if (!livingMobs(root.combat).length) {
    root.combat.phase = "finished"; root.combat.turnState.phase = "finished"
    root.game.combatOutcome = { type: "victory", combatId: root.combat.id, time: request.time, lootBonus: COMBAT_MOBS.some(slot => root.combat[slot]?.victoryLootBonus?.active) }
    root.game.defeatedMobs ||= {}
    COMBAT_MOBS.forEach(slot => { if (root.combat[slot]) root.game.defeatedMobs[root.combat[slot].name] = true })
    return true
  }
  if (!livingHeroes(root).length) {
    root.combat.phase = "finished"; root.combat.turnState.phase = "finished"
    root.game.combatOutcome = { type: "defeat", combatId: root.combat.id, time: request.time }
    return true
  }
  return false
}

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
  const summon = root.combat.eloSummon
  if (summon && (--summon.turnsLeft <= 0 || combatInt(summon.hp) <= 0)) delete root.combat.eloSummon
}

function nextCombatTurn(root, request) {
  const state = root.combat.turnState
  const order = state.order || []
  if (!order.length || combatOutcome(root, request)) return
  for (let attempts = 0; attempts < order.length; attempts++) {
    state.currentIndex = (combatInt(state.currentIndex) + 1) % order.length
    if (state.currentIndex === 0) { tickCombatRound(root, request); state.round = Math.max(1, combatInt(state.round, 1)) + 1 }
    if (combatOutcome(root, request)) return
    const id = order[state.currentIndex].id
    if (combatActorAlive(root, id)) {
      if (root.combat.heroStuns?.[id] > 0) { root.combat.heroStuns[id]--; continue }
      state.currentActorId = id; state.sequence = combatInt(state.sequence) + 1; return
    }
  }
}

function requireCombatTurn(root, request, actor) {
  const state = root.combat.turnState
  if (state?.phase !== "active" || root.combat.phase === "finished") throw new Error("Le combat n’est pas prêt à recevoir une action")
  if (state.currentActorId !== combatOwner(actor)) throw new Error("Ce n’est pas le tour de cet acteur")
  if (combatInt(request.sequence) !== combatInt(state.sequence)) throw new Error("Ce tour est déjà terminé")
  if (!combatActorAlive(root, actor) || (actor !== "greg" && COMBAT_CHARACTERS.includes(actor) && combatInt(root.characters[actor].hp) <= 0) || (actor === "greg" && request.kind !== "pass" && combatInt(root.characters.greg.hp) <= 0)) throw new Error("Cet acteur est KO")
}

function chooseEnemyTarget(root, slot, attack, forced, dice) {
  const alive = livingHeroes(root)
  if (attack.effect === "all") return alive
  if (forced) { if (!alive.includes(forced)) throw new Error("La cible choisie est KO ou invalide"); return [forced] }
  if (root.combat[slot].yuAggro?.turns > 0 && alive.includes("ju")) return ["ju"]
  if (!alive.length) throw new Error("Aucune cible vivante")
  if (isPhysicalMobAttack(attack)) {
    const mob = slot === "mob" ? (root.tokens?.mobToken || root.combat.mob) : root.combat[slot]
    const ranked = [...alive].sort((a, b) => Math.hypot((root.tokens[a]?.x || 0) - mob.x, (root.tokens[a]?.y || 0) - mob.y) - Math.hypot((root.tokens[b]?.x || 0) - mob.x, (root.tokens[b]?.y || 0) - mob.y))
    const roll = dice(100)
    if (roll <= 68) return [ranked[0]]
    if (roll <= 90) return [ranked[Math.min(1, ranked.length - 1)]]
  }
  if ((attack.effect === "ranged" || attack.effect === "magic") && dice(100) <= 60) return [[...alive].sort((a, b) => root.characters[b].hp - root.characters[a].hp)[0]]
  return [alive[dice(alive.length) - 1]]
}

function resolveHeroCombatAction(root, request, dice) {
  const actor = request.actor, payload = request.payload || {}, c = root.combat
  requireCombatTurn(root, request, actor)
  const raw = root.characters[actor], data = combatCharacter(root, actor)
  const special = !!payload.special
  const attack = special ? getPlayerSpecialAttack(actor) : (attacks[actor] || []).find(a => a.name === payload.attack)
  if (!attack || attack.name !== payload.attack) throw new Error("Capacité inconnue")
  if (special && c.playerSpecials?.[actor]) throw new Error("Spéciale déjà utilisée")
  const heal = getPlayerAttackTypeKey(attack) === "heal"
  const slot = payload.target || livingMobs(c)[0]
  if (!heal && !livingMobs(c).includes(slot)) throw new Error("Choisissez un ennemi vivant")
  const mob = !heal ? c[slot] : null
  if (actor === "greg" && attack.name === "I know Frank (si arc)" && !playerHasInventoryItem(raw, "arc")) throw new Error("Greg doit posséder un arc")
  if (actor === "greg" && attack.name === "Chat Bite (CaC)") {
    const p = root.tokens.greg, candidates = slot === "mob" ? [root.tokens.mobToken,c.mob,c.presentation?.positions?.mobToken] : [c[slot],root.tokens["mobToken_"+slot],c.presentation?.positions?.["mobToken_"+slot]]
    const m = candidates.find(position => Number.isFinite(position?.x) && Number.isFinite(position?.y))
    if (!p || !m || !Number.isFinite(m.x) || Math.hypot(p.x - m.x, p.y - m.y) > 180) throw new Error("La morsure nécessite le contact avec la cible")
  }
  const players = Object.fromEntries(COMBAT_CHARACTERS.map(id => [id, combatCharacter(root, id)]))
  if (special && !isPlayerSpecialConditionMet(actor, attack, { mob, charData: data, players })) throw new Error(attack.conditionText || "Condition de spéciale non remplie")
  const max = Math.max(2, combatInt(attack.dice, 20)), roll = dice(max), crit = roll === max, fail = roll === 1
  const stat = combatInt(data[getAttackStatKey(attack.stat)])
  const power = getPlayerAttackPower(attack, roll, stat, { playerId: actor, charData: data, isSpecial: special })
  if (crit) raw.corruption = Math.min(10, combatInt(raw.corruption) + 1)
  if (fail) raw.curse = Math.min(8, combatInt(raw.curse) + 1)
  if (heal) {
    if (!COMBAT_CHARACTERS.includes(payload.target)) throw new Error("Choisissez un héros à soigner")
    const amount = combatHeal(root, request, actor.toUpperCase(), payload.target, fail ? Math.max(4, Math.round(power * 0.45)) : crit ? power * 2 : power)
    nextCombatTurn(root, request)
    return { actor, attack: attack.name, roll, dice: max, crit, fail, amount, mode: "heal", target: payload.target }
  }
  let damage = fail ? 0 : power * (crit ? 2 : 1), groupHeal = 0
  if (special) {
    damage = Math.round(damage * (attack.damageBonus || 1.75))
    const modified = applyPlayerSpecialModifiers(actor, { charData: data, mobHpRatio: mob.hp / Math.max(1, mob.maxHP), mobSpecialUsed: !!mob.specialUsed, gregCriticalHp: root.characters.greg.hp <= getCharacterMaxHp("greg", root.characters.greg) * .2, anyAllyQuarterHp: COMBAT_CHARACTERS.some(id => root.characters[id].hp > 0 && root.characters[id].hp <= getCharacterMaxHp(id, root.characters[id]) * .25), crit, fail, damage, flatBonus: 0, multiplier: 1, basePower: power })
    damage = modified.damage; groupHeal = modified.groupHeal || 0
  }
  if (!fail && mob.bibiRage?.turns > 0) damage += mob.bibiRage.damage || 2
  if (!fail && mob.yuAggro?.turns > 0) damage += mob.yuAggro.allyBonus || 1
  if (!fail && mob.spiderSenseBuff?.active) damage = Math.round(damage * (mob.spiderSenseBuff.damageMult || 1.1))
  if (attack.name === "Je vais te raconter une histoire" && /foret|mine/i.test(root.game.combatState?.returnMap || root.game.map || "")) damage *= 2
  if (attack.name === "Spider Sense" && !fail) { damage = Math.round(damage * .65); c.playerFlags ||= {}; c.playerFlags[actor] ||= {}; c.playerFlags[actor].spiderSense = true; mob.spiderSenseBuff = { active: true, damageMult: 1.1 }; const weakness = getMobWeakness(mob.name, mob.tier || "weak"); if (weakness) mob.revealedWeakness = { mobName: mob.name, title: weakness.title, text: weakness.text }; if (crit) mob.victoryLootBonus = { active: true } }
  if (attack.name === "Petite merde" && c.playerFlags?.[actor]?.spiderSense) damage *= 2
  const amount = combatDamage(root, request, actor.toUpperCase() + " — " + attack.name, slot, Math.round(damage))
  if (!fail) {
    if (actor === "greg" && attack.name === "Le Bibi" && crit) mob.bibiRage = { damage: 2, turns: 3 }
    if (actor === "greg" && attack.name === "I know Frank (si arc)" && crit) mob.playerBleed = { damage: 1, turns: 2 }
    if (actor === "ju" && getPlayerAttackTypeKey(attack) === "charm") { mob.yuAggro = { turns: 3, allyBonus: 1 }; if (crit) mob.yuSkipNextTurn = { active: true } }
    if (attack.name === "Petite merde" && crit) mob.attackMalus = { amount: 1, turns: 2 }
    if (attack.name === "Je vais te raconter une histoire" && crit) mob.playerPoison = { damage: 2, turns: 2 }
    if (attack.name === "Je suis jet laguée") c.eloSummon = { active: true, hp: Math.round(getCharacterMaxHp("elo", raw) * .8), maxHP: Math.round(getCharacterMaxHp("elo", raw) * .8), turnsLeft: 3, damageBonus: 4, frenzy: crit, x: 720, y: 430 }
    else if (actor === "elo" && c.eloSummon?.active) {
      const bonus = dice(4) * (c.eloSummon.frenzy ? 2 : 1)
      ;(c.eloSummon.frenzy ? livingMobs(c) : [slot]).forEach(s => combatDamage(root, request, "INVOCATION", s, bonus))
    }
  }
  if (groupHeal > 0) COMBAT_CHARACTERS.filter(id => root.characters[id].hp > 0).forEach(id => combatHeal(root, request, "ELO", id, groupHeal))
  if (special) { c.playerSpecials ||= {}; c.playerSpecials[actor] = true }
  nextCombatTurn(root, request)
  return { actor, attack: attack.name, roll, dice: max, crit, fail, amount, mode: "damage", target: slot }
}

function resolveEnemyCombatAction(root, request, dice) {
  const slot = request.actor, c = root.combat, mob = c[slot], payload = request.payload || {}
  requireCombatTurn(root, request, slot)
  if (!mob) throw new Error("Ennemi introuvable")
  const special = getMobSpecialAttack(mob.name, mob.tier || "weak")
  const normal = getMobAttacksForMob(mob.name, mob.tier || "weak")
  let attack = payload.random ? null : [...normal, ...(special ? [special] : [])].find(a => a.name === payload.attack)
  if (payload.random) {
    const specialRoll = dice(20)
    const choices = specialRoll === 20 && special && !mob.specialUsed ? [special] : normal.filter(a => normal.length === 1 || a.name !== mob.lastAttack)
    attack = choices[dice(choices.length) - 1]
  }
  if (!attack) throw new Error("Attaque ennemie inconnue")
  if (!attack.special && normal.length > 1 && mob.lastAttack === attack.name) throw new Error("Cette attaque recharge ; choisissez-en une autre ou passez le tour")
  if (attack.special && mob.specialUsed) throw new Error("Spéciale déjà utilisée")
  if (mob.yuSkipNextTurn?.active) { delete mob.yuSkipNextTurn; nextCombatTurn(root, request); return { actor: slot, mode: "skip", message: "L’ennemi est neutralisé pour cette action" } }
  const targets = chooseEnemyTarget(root, slot, attack, payload.target, dice)
  const range = getMobDamageRange(attack, mob.lvl || 1, mob.tier || "weak")
  let damage = range.min + dice(range.max - range.min + 1) - 1
  if (mob.attackMalus) damage = Math.max(0, damage - (mob.attackMalus.amount || 0))
  if (mob.malus?.source === "La Sorcière") damage = Math.round(damage * .75)
  let applied = 0
  targets.forEach(id => {
    const before = combatInt(root.characters[id].hp)
    root.characters[id].hp = Math.max(0, before - damage); applied += before - root.characters[id].hp
    if (attack.effect === "curse") root.characters[id].curse = Math.min(8, combatInt(root.characters[id].curse) + 1)
    if (attack.effect === "stun") { c.heroStuns ||= {}; c.heroStuns[combatOwner(id)] = 1 }
    if (attack.effect === "debuff") { c.heroDebuffs ||= {}; c.heroDebuffs[id] = { amount: 2, turns: 2 } }
    combatRecord(root, request, mob.name.toUpperCase(), id.toUpperCase(), before - root.characters[id].hp, "mob", mob.name + " — " + attack.name + " → " + id.toUpperCase() + " : -" + (before - root.characters[id].hp) + " PV")
  })
  if (attack.special) mob.specialUsed = true
  if (attack.healSelfRatio) mob.hp = Math.min(mob.maxHP, mob.hp + Math.round(applied * attack.healSelfRatio))
  mob.lastAttack = attack.name
  root.game.mobAttackEvent = { attackName: attack.name, icon: attack.icon || "⚔", dmg: damage, target: targets.length > 1 ? "TOUS" : targets[0].toUpperCase(), mobName: mob.name.toUpperCase(), time: request.time, special: !!attack.special, animation: attack.animation || "" }
  nextCombatTurn(root, request)
  return { actor: slot, attack: attack.name, amount: damage, targets, mode: "enemy" }
}

function resolveAllyCombatAction(root, request, dice) {
  requireCombatTurn(root, request, request.actor)
  const payload = request.payload || {}, pnj = ALLY_PNJS.find(p => p.id === payload.pnjId), action = pnj?.actions.find(a => a.id === payload.actionId)
  if (!pnj || !action) throw new Error("Action alliée inconnue")
  if (root.combat.usedAllies?.[action.id]) throw new Error("Cette intervention a déjà été utilisée")
  if (root.roles?.[request.uid] !== "gm" && root.game.playerAllyAccess?.actionId !== action.id) throw new Error("Le MJ doit autoriser cette intervention")
  const roll = dice(action.dice), crit = roll >= (action.critMin || action.dice), fail = roll === 1
  let amount = 0
  if (action.type === "damage") {
    amount = Math.round((action.dmgBase + roll * action.dmgBonus) * (crit && action.critMult ? action.critMult : 1) * (fail ? .2 : 1))
    ;(action.chainMin && roll >= action.chainMin ? livingMobs(root.combat) : [payload.target || livingMobs(root.combat)[0]]).forEach(slot => { if (!livingMobs(root.combat).includes(slot)) throw new Error("Choisissez un ennemi vivant"); combatDamage(root, request, pnj.name, slot, amount) })
  } else if (action.type === "heal") amount = combatHeal(root, request, pnj.name, payload.target, roll * (action.healMult || 1), crit)
  else if (action.type === "buff") {
    const target = root.characters[payload.target]; if (!target || target.hp <= 0) throw new Error("Choisissez un héros vivant")
    const stat = playerMainStat[payload.target]; amount = roll * (action.buffMult || 1); target[stat] = Math.min(999, combatInt(target[stat]) + amount)
    combatRecord(root, request, pnj.name, payload.target.toUpperCase(), amount, "buff", pnj.name + " renforce " + payload.target)
  } else if (action.type === "malus" && roll >= (action.threshold || 10)) {
    const slot = payload.target || livingMobs(root.combat)[0]; if (!livingMobs(root.combat).includes(slot)) throw new Error("Choisissez un ennemi vivant")
    if (pnj.id === "odin") root.combat[slot].attackMalus = { amount: 15 }
    root.combat[slot].malus = { label: action.label, source: pnj.name, roll }
    combatRecord(root, request, pnj.name, root.combat[slot].name, 0, "malus", pnj.name + " — " + action.label)
  }
  root.combat.usedAllies ||= {}; root.combat.usedAllies[action.id] = true
  delete root.game.playerAllyAccess
  nextCombatTurn(root, request)
  return { actor: request.actor, attack: action.label, pnjId: pnj.id, roll, dice: action.dice, crit, fail, amount, mode: "ally" }
}

function reduceCombatRequest(current, id, seed) {
  const queued = current?.combatRequests?.[id]
  if (!queued || queued.status !== "queued") return null
  const root = combatClone(current), request = root.combatRequests[id]
  request.id = id
  const fail = error => { const unchanged = combatClone(current); unchanged.combatRequests[id] = { ...queued, status: "failed", error: String(error.message || error).slice(0, 300) }; return unchanged }
  try {
    if (root.sessionControl?.phase) throw new Error("La session est en cours de sauvegarde ou de chargement")
    if (!root.combat || root.combat.id !== request.combatId) throw new Error("Ce combat est terminé ou a changé")
    if (!Number.isFinite(request.time) || Date.now() - request.time > 120000) throw new Error("Cette action a expiré")
    const gm = root.roles?.[request.uid] === "gm", profile = root.profiles?.[request.uid]?.playerId
    if (!gm && (profile !== combatOwner(request.actor) || !COMBAT_CHARACTERS.includes(request.actor))) throw new Error("Vous ne contrôlez pas cet acteur")
    normalizeCombatTurns(root)
    const dice = combatRandom(seed)
    let result
    if (request.kind === "hero") result = resolveHeroCombatAction(root, request, dice)
    else if (request.kind === "enemy") { if (!gm || !COMBAT_MOBS.includes(request.actor)) throw new Error("Action réservée au MJ"); result = resolveEnemyCombatAction(root, request, dice) }
    else if (request.kind === "ally") result = resolveAllyCombatAction(root, request, dice)
    else if (request.kind === "pass") { requireCombatTurn(root, request, request.actor); if(COMBAT_MOBS.includes(request.actor)) delete root.combat[request.actor].lastAttack; nextCombatTurn(root, request); result = { actor: request.actor, mode: "pass", message: "Tour passé" } }
    else if (request.kind === "skipDead") {
      if (!gm || root.combat.turnState?.currentActorId !== request.actor || combatActorAlive(root, request.actor) || combatInt(request.sequence) !== combatInt(root.combat.turnState.sequence)) throw new Error("Le tour ne peut pas être sauté")
      nextCombatTurn(root, request); result = { actor: request.actor, mode: "skip", message: "Acteur KO : tour passé" }
    }
    else if (request.kind === "manualDamage") {
      if (!gm) throw new Error("Action réservée au MJ")
      const amount = combatInt(request.payload?.amount)
      if (amount < 1 || amount > 50000 || !livingMobs(root.combat).includes(request.payload?.target)) throw new Error("Dégâts ou cible invalides")
      combatDamage(root, request, "MJ", request.payload.target, amount); combatOutcome(root, request); result = { mode: "manual", amount }
    } else if (request.kind === "thuum") {
      requireCombatTurn(root, request, request.actor)
      const word = request.payload?.word, def = window.THUUMS?.[word], learned = root.game.playerThuum?.[request.actor]?.[word]
      if (!def || !learned?.unlocked || !root.game.playerThuumAccess?.[request.actor]?.[word]?.allowed) throw new Error("Ce Thu’um n’est pas autorisé")
      if (root.combat.usedThuum?.[request.actor]?.[word]) throw new Error("Ce Thu’um est déjà utilisé")
      const target = request.payload.target || livingMobs(root.combat)[0]
      if (!livingMobs(root.combat).includes(target)) throw new Error("Choisissez une cible vivante")
      const amounts = def.combatDamageByRank(learned.rank || 1)
      livingMobs(root.combat).forEach(slot => combatDamage(root, request, word, slot, slot === target ? amounts.main : amounts.splash))
      if (word === "REIHKT") root.combat[target].attackMalus = { amount: Math.max(1, (learned.rank || 1) * 2), turns: 2 }
      root.combat.usedThuum ||= {}; root.combat.usedThuum[request.actor] ||= {}; root.combat.usedThuum[request.actor][word] = true
      delete root.game.playerThuumAccess[request.actor][word]
      root.game.thuumCast = { playerId: request.actor, word, time: request.time, outsideCombat: false }
      nextCombatTurn(root, request); result = { actor: request.actor, mode: "thuum", word, amount: amounts.main }
    } else throw new Error("Action inconnue")
    request.status = "done"; request.result = result
    root.combat.lastAction = { id, time: request.time, result }
    return root
  } catch (error) { return fail(error) }
}
