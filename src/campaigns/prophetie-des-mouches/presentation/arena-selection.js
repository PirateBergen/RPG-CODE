"use strict"

window.__combatOutcomeShowing = false
window.__pendingLocalDefeat = false

/* ========================= */
/* DÉMARRAGE COMBAT          */
/* ========================= */

function _getCombatArenaMap(mob, tier) {
  if (mob === "jormungand" || (typeof combatHasJormungandr==="function"&&combatHasJormungandr({combat:window.__combatSnapshot}))) return "bateau.jpg"
  if (mob === "kraken") return "tourbillon.jpg"
  return tier === "boss" ? "arenefinal.jpg" : "arene.jpg"
}


