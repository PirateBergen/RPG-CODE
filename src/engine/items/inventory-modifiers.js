const INVENTORY_STAT_CODE_ALIASES = {
  force: "force",
  forc: "force",
  forse: "force",
  charme: "charme",
  charmes: "charme",
  charnme: "charme",
  mag: "charme",
  magie: "charme",
  magique: "charme",
  perspi: "perspi",
  persp: "perspi",
  perspicacite: "perspi",
  perspicacitee: "perspi",
  precision: "perspi",
  precisione: "perspi",
  precison: "perspi",
  precisions: "perspi",
  chance: "chance",
  chanse: "chance",
  defense: "defense",
  defensee: "defense",
  armure: "defense"
}

function normalizeInventoryStatCode(code) {
  return String(code || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "")
}

function getInventoryStatModifiers(text) {
  const mods = { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
  const source = String(text || "")
  const regex = /([+-]?\d+)\s*([a-zA-ZÀ-ÿ]+)/g
  let match
  while ((match = regex.exec(source))) {
    const amount = parseInt(match[1], 10)
    const rawCode = normalizeInventoryStatCode(match[2])
    const stat = INVENTORY_STAT_CODE_ALIASES[rawCode]
    if (!stat || !Number.isFinite(amount)) continue
    mods[stat] += amount
  }
  return mods
}

function getEffectiveCharacterData(playerId, rawData = {}, sword=window.__balrogSword) {
  const data = { ...(rawData || {}) }
  const mods = Object.prototype.hasOwnProperty.call(data, "inventaire")
    ? getInventoryStatModifiers(data.inventaire || "")
    : (data.equipmentModifiers || {})
  if(playerId==="greg"&&Object.prototype.hasOwnProperty.call(data,"inventaire")&&sword?.status==="claimed"&&sword.holder==="greg"&&sword.equipped&&String(data.inventaire).includes(BALROG_SWORD_LINE)){const bonus=balrogSwordBonus(data.lvl);mods.force+=bonus.force;mods.defense+=bonus.defense}
  ;["force", "charme", "perspi", "chance", "defense"].forEach(stat => {
    data[stat] = (parseInt(data[stat], 10) || 0) + (mods[stat] || 0)
  })
  data.__inventoryStatMods = mods
  data.__effectivePlayerId = playerId || ""
  return data
}

/**
 * CS — Combat State namespace.
 * Regroupe les 5 globals combat critiques sous un seul objet inspectable.
 * L'ancien accès window.__xxx continue de fonctionner via des accessors
 * (pas besoin de toucher le reste du code).
 *
 * Usage debug en console : CS  →  {turnState, damageLog, attackResolving, outcomeShowing, pendingLocalDefeat}
 */
window.CS = {}
;[
  ["__combatTurnState",      "turnState"],
  ["__combatDamageLog",      "damageLog"],
  ["__playerAttackResolving","attackResolving"],
  ["__combatOutcomeShowing", "outcomeShowing"],
  ["__pendingLocalDefeat",   "pendingLocalDefeat"],
].forEach(([oldKey, newKey]) => {
  Object.defineProperty(window, oldKey, {
    get()  { return window.CS[newKey] },
    set(v) { window.CS[newKey] = v },
    configurable: true,
    enumerable: false,
  })
})


