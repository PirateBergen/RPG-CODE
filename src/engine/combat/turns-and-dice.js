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
  const list = COMBAT_HEROES.filter(id => combatActorAlive(root, id)).map(id => ({ id, type: "player", label: id === "greg" ? "Greg / Bibi" : id === "ju" ? "Pika" : "Elo", image: id === "ju" ? "pika-token.svg" : id + ".png" }))
  livingMobs(root.combat).forEach(slot => list.push({ id: slot, type: "mob", label: heroDisplayName(root.combat[slot].name).toUpperCase(), image: root.combat[slot].name + ".png" }))
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
  const order = participants.map((p, index) => ({ ...p, index, roll: state.rolls[p.id],...(state.initiativeBonuses?{bonus:state.initiativeBonuses[p.id]||0,total:state.rolls[p.id]+(state.initiativeBonuses[p.id]||0)}:{}) })).sort((a, b) => (b.total??b.roll) - (a.total??a.roll) || (a.type === b.type ? a.index - b.index : a.type === "player" ? -1 : 1))
  return { ...state, phase: "active", order, currentIndex: 0, currentActorId: order[0].id, round: 1, sequence: 0 }
}

