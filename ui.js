"use strict"

/* ========================= */
/* FICHE PERSONNAGE          */
/* ========================= */

const INVENTORY_EFFECT_STATS = ["force", "charme", "perspi", "chance", "defense"]

function refreshSheetEffectiveStatsDisplay() {
  if (!currentSheetPlayer) return
  const inventoryField = document.getElementById("inventaire")
  if (!inventoryField) return

  const previousMods = window.__sheetInventoryModifiers || { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
  const baseData = { ...(window.__sheetBaseCharacterData || {}) }

  INVENTORY_EFFECT_STATS.forEach(stat => {
    const field = document.getElementById(stat)
    if (!field) return
    const displayed = parseInt(field.value, 10)
    if (Number.isFinite(displayed)) baseData[stat] = displayed - (parseInt(previousMods[stat], 10) || 0)
  })

  const nextMods = (typeof getInventoryStatModifiers === "function")
    ? getInventoryStatModifiers(inventoryField.value)
    : { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }

  INVENTORY_EFFECT_STATS.forEach(stat => {
    const field = document.getElementById(stat)
    if (!field) return
    field.value = (parseInt(baseData[stat], 10) || 0) + (nextMods[stat] || 0)
  })

  window.__sheetBaseCharacterData = baseData
  window.__sheetInventoryModifiers = nextMods
}

function getPersistedSheetStatValue(fieldId, rawValue, inventoryMods) {
  if (!INVENTORY_EFFECT_STATS.includes(fieldId)) return rawValue
  return Math.max(0, (parseInt(rawValue, 10) || 0) - (parseInt(inventoryMods[fieldId], 10) || 0))
}

function openCharacterSheet(id = null) {
  let playerID
  if (isGM) { if (!id) return; playerID = id }
  else {
    if (!myToken) { showNotification("Choisissez un personnage 🎭"); return }
    playerID = id || myToken.id
  }
  if (!canAccessCharacter(playerID)) { showNotification("Cette fiche est privée."); return }
  currentSheetPlayer = playerID
  // Marquer la fiche avec l'ID du joueur pour éviter les sauvegardes croisées
  const sheet = document.getElementById("characterSheet")
  if (sheet) sheet.dataset.playerId = playerID
  const inv = document.getElementById("inventaire")
  inv.removeAttribute("readonly")
  const portraits = { greg:"gregsheet.jpg", ju:"jusheet.jpg", elo:"elosheet.jpg", bibi:"bibisheet.jpg" }
  document.getElementById("sheetImage").src = "images/" + (portraits[playerID] || "elosheet.jpg")
  document.getElementById("sheetTitle").innerText = playerID.toUpperCase()
  document.querySelectorAll(".playerOnly").forEach(f => { f.style.display = playerID === "bibi" ? "none" : "block" })
  readCharacter(playerID, snapshot => {
    const data = snapshot.val(); if (!data || currentSheetPlayer !== playerID || !canAccessCharacter(playerID)) return
    window.__sheetBaseCharacterData = { ...data }
    window.__sheetInventoryModifiers = { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
    ;["lvl","xp","force","charme","perspi","chance","defense","hp"].forEach(k => { const el = document.getElementById(k); if (el) el.value = data[k] || 0 })
    if (!window._playerMaxPoids) window._playerMaxPoids = {}
    window._playerMaxPoids[playerID] = data.poids || 100
    const mw = document.getElementById("maxWeight"); if (mw) mw.value = data.poids || 100
    const invField = document.getElementById("inventaire")
    const notesField = document.getElementById("notes")
    if (invField) invField.value = data.inventaire || ""
    if (notesField) notesField.value = data.notes || ""
    refreshSheetEffectiveStatsDisplay()
    curseLevel = data.curse || 0
    document.querySelectorAll(".curseGem").forEach((g, i) => g.classList.toggle("active", i < curseLevel))
    corruptionLevel = data.corruption || 0
    document.querySelectorAll(".corruptionPoint").forEach((b, i) => b.classList.toggle("active", i < corruptionLevel))
    updateHPBar(); updateWeightBar()
  })
  document.getElementById("characterSheet").style.display = "block"
  loadGold(playerID)
  // Vérifier si des points libres sont disponibles
  if (!isGM || playerID === myToken?.id) setTimeout(() => checkFreePoints(playerID), 300)
}

/* ========================= */
/* ÉDITEUR NOTES FLOTTANT    */
/* ========================= */

function openNotesEditor(field) {
  const existing = document.getElementById("notesEditorPanel")
  if (existing) existing.remove()
  const label = field.id === "inventaire" ? "Inventaire" : "Notes"
  const panel = document.createElement("div")
  panel.id = "notesEditorPanel"
  panel.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);width:min(340px,92vw);background:rgba(8,14,20,0.97);border:1px solid rgba(120,160,210,0.5);border-radius:12px;z-index:2000000000;box-shadow:0 8px 32px rgba(0,0,0,0.85);touch-action:none;"
  // Header draggable
  const header = document.createElement("div")
  header.style.cssText = "padding:10px 14px;cursor:grab;background:rgba(20,40,60,0.92);border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between;user-select:none;-webkit-user-select:none;"
  header.innerHTML = "<span style='font-family:Cinzel,serif;font-size:13px;color:#c7d3e8;'>✏ " + label + "</span>"
  const closeX = document.createElement("span")
  closeX.innerText = "✕"
  closeX.style.cssText = "color:#8aabcf;cursor:pointer;font-size:16px;padding:0 4px;"
  closeX.onclick = () => panel.remove()
  header.appendChild(closeX)
  panel.appendChild(header)
  // Drag logic
  let _dx = false, _sx, _sy, _ox, _oy
  header.addEventListener("pointerdown", e => {
    _dx = true; _sx = e.clientX; _sy = e.clientY
    const r = panel.getBoundingClientRect(); _ox = r.left; _oy = r.top
    panel.style.transform = "none"; panel.style.left = _ox + "px"; panel.style.top = _oy + "px"
    header.style.cursor = "grabbing"; header.setPointerCapture(e.pointerId); e.preventDefault()
  })
  header.addEventListener("pointermove", e => {
    if (!_dx) return
    panel.style.left = (_ox + e.clientX - _sx) + "px"
    panel.style.top  = (_oy + e.clientY - _sy) + "px"
  })
  header.addEventListener("pointerup", () => { _dx = false; header.style.cursor = "grab" })
  // Textarea
  const ta = document.createElement("textarea")
  ta.value = field.value || ""
  ta.style.cssText = "width:100%;height:160px;padding:12px 14px;background:rgba(5,10,15,0.95);border:none;border-bottom:1px solid rgba(120,160,210,0.25);color:#f0e8c8;font-family:'IM Fell English',serif;font-size:14px;line-height:1.5;resize:none;box-sizing:border-box;outline:none;-webkit-appearance:none;"
  ta.setAttribute("inputmode", "text")
  ta.spellcheck = false
  panel.appendChild(ta)
  // Boutons
  const btnRow = document.createElement("div")
  btnRow.style.cssText = "display:flex;gap:8px;padding:10px 14px;justify-content:flex-end;"
  const cancelBtn = document.createElement("button")
  cancelBtn.innerText = "Annuler"
  cancelBtn.style.cssText = "padding:8px 16px;background:#222;color:#d0c4ae;border:1px solid #555;border-radius:8px;font-family:Cinzel,serif;font-size:12px;cursor:pointer;"
  cancelBtn.onclick = () => panel.remove()
  const saveBtn = document.createElement("button")
  saveBtn.innerText = "Enregistrer"
  saveBtn.style.cssText = "padding:8px 16px;background:linear-gradient(#3d5d44,#233526);color:#e8f4e0;border:1px solid #87aa86;border-radius:8px;font-family:Cinzel,serif;font-size:12px;cursor:pointer;"
  saveBtn.onclick = () => {
    field.value = ta.value
    field.dispatchEvent(new Event("input", { bubbles: true }))
    field.dispatchEvent(new Event("blur",  { bubbles: true }))
    panel.remove()
  }
  btnRow.appendChild(cancelBtn)
  btnRow.appendChild(saveBtn)
  panel.appendChild(btnRow)
  document.body.appendChild(panel)
  setTimeout(() => ta.focus(), 80)
}

function closeCharacterSheet() {
  if (window.__sheetAutoSaveTimer) {
    clearTimeout(window.__sheetAutoSaveTimer)
    window.__sheetAutoSaveTimer = null
  }
  const closingPlayerId = currentSheetPlayer
  Promise.resolve(saveCharacter()).then(saved => {
    if (!saved) return
    const sheet = document.getElementById("characterSheet"); if (!sheet) return
    sheet.style.display = "none"
    window.__sheetBaseCharacterData = null
    window.__sheetInventoryModifiers = null
    if (pendingLevelUp[closingPlayerId]) { triggerLevelUp(closingPlayerId); pendingLevelUp[closingPlayerId] = false }
  })
}

function forceCloseCharacterSheetWithoutSave() {
  if (window.__sheetAutoSaveTimer) {
    clearTimeout(window.__sheetAutoSaveTimer)
    window.__sheetAutoSaveTimer = null
  }
  const sheet = document.getElementById("characterSheet")
  if (!sheet) return
  sheet.style.display = "none"
  sheet.dataset.playerId = ""
  currentSheetPlayer = null
  window.__sheetBaseCharacterData = null
  window.__sheetInventoryModifiers = null
  const title = document.getElementById("sheetTitle")
  if (title) title.innerText = ""
  const img = document.getElementById("sheetImage")
  if (img) img.removeAttribute("src")
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if ("value" in f) f.value = ""
  })
}

function saveCharacter() {
  if (!canAccessCharacter(currentSheetPlayer)) return Promise.resolve(false)
  const id = currentSheetPlayer, data = {}
  const inventoryField = document.getElementById("inventaire")
  const notesField = document.getElementById("notes")
  const inventoryMods = (typeof getInventoryStatModifiers === "function")
    ? getInventoryStatModifiers(inventoryField?.value || "")
    : { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if (f.offsetParent !== null && f.id !== "weight" && f.id !== "maxWeight" && f.id !== "inventaire" && f.id !== "notes") {
      const rawValue = String(f.value ?? "").trim()
      if (rawValue !== "") data[f.id] = isNaN(rawValue) ? rawValue : getPersistedSheetStatValue(f.id, parseInt(rawValue, 10), inventoryMods)
    }
  })
  data.inventaire = inventoryField ? inventoryField.value : ""
  data.equipmentModifiers = getInventoryStatModifiers(data.inventaire)
  data.carriedWeight = Math.max(0, _parseInventoryWeight(data.inventaire))
  if (notesField) data.notes = notesField.value
  if (window.__sheetBaseCharacterData) {
    INVENTORY_EFFECT_STATS.forEach(stat => {
      if (data[stat] != null) window.__sheetBaseCharacterData[stat] = parseInt(data[stat], 10) || 0
    })
    window.__sheetBaseCharacterData.inventaire = data.inventaire
    if (data.notes != null) window.__sheetBaseCharacterData.notes = data.notes
  }
  return db.ref("characters/" + id).update(data)
    .then(() => {
      showNotification("Fiche sauvegardée")
      return true
    })
    .catch(err => {
      console.error("saveCharacter failed", err)
      showNotification("Sauvegarde fiche incomplète")
      return false
    })
}

function autoSaveCharacter() {
  if (!myToken && !isGM) return
  const id = currentSheetPlayer; if (!canAccessCharacter(id)) return

  // Sécurité — vérifier que l'ID de la fiche ouverte correspond bien
  const sheet = document.getElementById("characterSheet")
  const sheetId = sheet?.dataset.playerId
  if (sheetId && sheetId !== id) return
  if (!isGM && myToken && myToken.id !== id && !(myToken.id === "greg" && id === "bibi")) return

  const data = {}
  const inventoryField = document.getElementById("inventaire")
  const notesField = document.getElementById("notes")
  const inventoryMods = (typeof getInventoryStatModifiers === "function")
    ? getInventoryStatModifiers(inventoryField?.value || "")
    : { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if (f.offsetParent !== null && f.id !== "weight" && f.id !== "maxWeight" && f.id !== "inventaire" && f.id !== "notes") {
      const rawValue = String(f.value ?? "")
      const trimmed = rawValue.trim()
      if (trimmed !== "") {
        data[f.id] = isNaN(trimmed) ? trimmed : getPersistedSheetStatValue(f.id, parseInt(trimmed, 10), inventoryMods)
      }
    }
  })
  data.inventaire = inventoryField ? inventoryField.value : ""
  data.equipmentModifiers = getInventoryStatModifiers(data.inventaire)
  data.carriedWeight = Math.max(0, _parseInventoryWeight(data.inventaire))
  if (notesField) data.notes = notesField.value
  if (window.__sheetBaseCharacterData) {
    INVENTORY_EFFECT_STATS.forEach(stat => {
      if (data[stat] != null) window.__sheetBaseCharacterData[stat] = parseInt(data[stat], 10) || 0
    })
    window.__sheetBaseCharacterData.inventaire = data.inventaire
    if (data.notes != null) window.__sheetBaseCharacterData.notes = data.notes
  }
  if (Object.keys(data).length > 0) {
    return db.ref("characters/" + id).update(data).then(() => ["greg","ju","elo","bibi"].forEach(p => updateTokenStats(p)))
  }
}

function queueCharacterAutoSave(delay = 220) {
  if (window.__sheetAutoSaveTimer) clearTimeout(window.__sheetAutoSaveTimer)
  window.__sheetAutoSaveTimer = setTimeout(() => {
    window.__sheetAutoSaveTimer = null
    autoSaveCharacter()
  }, Math.max(0, parseInt(delay, 10) || 0))
}

function updateHPBar() {
  const hp = parseInt(document.getElementById("hp").value) || 0
  document.getElementById("hpBar").style.width = Math.max(0, Math.min(100, hp)) + "%"
}

function _parseInventoryWeight(text) {
  let total = 0
  text.split("\n").forEach(line => {
    const wm = line.match(/\(([^)]+)\)/); if (!wm) return
    // Retirer "kg" et espaces, remplacer virgule par point
    const cleaned = wm[1].replace(/[kg\s]/gi, "").replace(",", ".")
    const w = parseFloat(cleaned); if (isNaN(w)) return
    const qm = line.match(/x(\d+)/i)
    total += w * (qm ? parseInt(qm[1]) : 1)
  })
  return Math.round(total * 10) / 10  // arrondi à 1 décimale
}

function updateWeightBar() {
  if (!currentSheetPlayer) return
  const text = document.getElementById("inventaire").value
  const total = _parseInventoryWeight(text)
  refreshSheetEffectiveStatsDisplay()
  // Utiliser le max déjà chargé en mémoire, fallback Firebase si absent
  const cachedMax = window._playerMaxPoids && window._playerMaxPoids[currentSheetPlayer]
  const applyMax = max => {
    document.getElementById("weight").value    = total
    document.getElementById("maxWeight").value = max
    const pct = Math.min(100, (total / max) * 100)
    const bar = document.getElementById("weightBar")
    bar.style.width = pct + "%"
    bar.style.background = pct < 70 ? "lime" : pct < 100 ? "orange" : "red"
    const token = document.getElementById(currentSheetPlayer)
    if (token) token.classList.toggle("overweight", total > max)
  }
  if (cachedMax) {
    applyMax(cachedMax)
  } else {
    db.ref("characters/" + currentSheetPlayer + "/poids").once("value", snap => {
      const max = snap.val() || 100
      if (!window._playerMaxPoids) window._playerMaxPoids = {}
      window._playerMaxPoids[currentSheetPlayer] = max
      applyMax(max)
    })
  }
}

/* ========================= */
/* COMBAT UI                 */
/* ========================= */

function loadPlayerCombatStats() {
  if (!myToken || !canAccessCharacter(myToken.id)) return
  if (window.__combatStatsRef && window.__combatStatsCb) {
    window.__combatStatsRef.off("value", window.__combatStatsCb)
  }
  const playerId = myToken.id
  const ref = db.ref("characters/" + playerId)
  const cb = snap => {
    if (!myToken || myToken.id !== playerId || !canAccessCharacter(playerId)) return
    const raw = snap.val(); if (!raw) return
    const d = (typeof getEffectiveCharacterData === "function") ? getEffectiveCharacterData(myToken.id, raw) : raw
    window.__combatInventoryModifiers = d.__inventoryStatMods || { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
    ;["force","charme","perspi","chance","defense","hp"].forEach(k => { const el = document.getElementById("combat_"+k); if (el) el.value = d[k] || 0 })
    updateCombatHPBar(raw.hp || 0)
    if (!isGM && (combatActive || gameState === "COMBAT") && (parseInt(raw.hp, 10) || 0) <= 0 && !window.__combatOutcomeShowing) {
      if (typeof triggerLocalDefeat === "function") triggerLocalDefeat("hp")
    }
  }
  window.__combatStatsRef = ref
  window.__combatStatsCb = cb
  ref.on("value", cb)
}

function saveCombatStats() {
  if (!myToken || !canAccessCharacter(myToken.id)) return
  if (!myToken) return
  const hp = parseInt(document.getElementById("combat_hp").value) || 0
  const data = {}
  const inventoryMods = window.__combatInventoryModifiers || { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
  ;["force","charme","perspi","chance","defense"].forEach(k => { data[k] = getPersistedSheetStatValue(k, document.getElementById("combat_"+k).value, inventoryMods) })
  data.hp = hp
  db.ref("characters/" + myToken.id).update(data).catch(console.error)
  const bar = document.getElementById("hp_" + myToken.id); if (bar) bar.style.width = Math.max(0, Math.min(100, hp)) + "%"
  updateTokenGlow(myToken.id, hp); updateTokenStats(myToken.id); updateCombatHPBar(hp)
}

function updateCombatHPBar(hp) {
  const bar = document.getElementById("combatHPBar"); if (!bar) return
  const pct = Math.max(0, Math.min(100, hp)); bar.style.width = pct + "%"
  if (pct > 60)      { bar.style.background = "linear-gradient(90deg,#3cff6b,#0b8a3a)"; bar.style.boxShadow = "0 0 8px lime"; bar.style.animation = "none" }
  else if (pct > 30) { bar.style.background = "linear-gradient(90deg,#ffb347,#ff7b00)"; bar.style.boxShadow = "0 0 8px orange"; bar.style.animation = "none" }
  else               { bar.style.background = "linear-gradient(90deg,#ff4040,#8b0000)"; bar.style.boxShadow = "0 0 10px red"; bar.style.animation = "hpDangerPulse 0.7s infinite alternate" }
}

function appendAttackLine(container, label, value) {
  if (value == null || value === "") return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = label + " :"
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" " + value))
  container.appendChild(line)
}

function getCombatAssetFromAttack(attack, mobData) {
  const type = String(attack?.type || "").toLowerCase()
  const effect = String(attack?.effect || "").toLowerCase()
  const name = String(attack?.name || "").toLowerCase()
  const animation = String(attack?.animation || "").toLowerCase()
  const mobName = String(mobData?.name || "").toLowerCase()

  if (animation === "bloodmoon" || mobName.includes("vampire")) return "fang.png"
  if (animation === "howl" || mobName.includes("loup") || mobName.includes("fenrir")) return "fang.png"
  if (animation === "fire" || name.includes("feu") || name.includes("braise")) return "fire.png"
  if (animation === "storm") return "arc.png"
  if (animation === "arcane" || animation === "witch" || type.includes("sort") || type.includes("magie") || type.includes("charme") || type.includes("analyse")) return "arcane.png"
  if (animation === "spectral" || animation === "abyss" || animation === "venom" || animation === "shadow") return "shadow.png"
  if (animation === "divine" || type.includes("soin") || name.includes("prêtre") || mobName.includes("pretre") || mobName.includes("valkyrie") || mobName.includes("odin") || mobName.includes("freya")) return "holy.png"
  if (effect === "curse") return "curse.png"
  if (effect === "all") return "impact_ring.png"
  if (type.includes("distance")) return "arc.png"
  if (type.includes("invocation")) return "rune_glow.png"
  if (type.includes("spécial") || type.includes("special")) return "impact_ring.png"
  if (type.includes("mêlée") || type.includes("melee") || name.includes("morsure") || name.includes("griffe") || name.includes("crocs")) return "claw.png"
  return "slash_overlay.png"
}

function createCombatIcon(attack, mobData, className) {
  const img = document.createElement("img")
  img.className = className || "combatIcon"
  img.src = "images/" + getCombatAssetFromAttack(attack, mobData)
  img.alt = ""
  img.onerror = () => { img.style.display = "none" }
  return img
}

function addMJCombatLogEntry(data) {
  const log = document.getElementById("mjLogContent")
  if (!log) return
  const entry = document.createElement("div")
  entry.className = "mjEntry mjEntry--combat"

  const icon = createCombatIcon(data.attack || {}, data.mobData || null, "mjCombatIcon")
  entry.appendChild(icon)

  const text = document.createElement("div")
  text.className = "mjCombatText"

  const top = document.createElement("div")
  top.className = "mjCombatTop"
  top.innerText = (data.mobName || "MOB") + "  •  " + (data.attackName || "Attaque")
  text.appendChild(top)

  const bottom = document.createElement("div")
  bottom.className = "mjCombatBottom"
  bottom.innerText = (data.target || "CIBLE") + "  •  " + String(data.dmg || 0) + " dégâts"
  text.appendChild(bottom)

  if (data.special) {
    const tag = document.createElement("div")
    tag.className = "mjCombatTag"
    tag.innerText = "SPÉCIALE"
    entry.appendChild(tag)
  }

  entry.appendChild(text)
  log.prepend(entry)
}

function appendAttackDiceLine(container, dice, stat) {
  if (!dice) return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = "Jet :"
  const diceEl = document.createElement("span")
  diceEl.className = "attackDice"
  diceEl.innerText = "d" + dice
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" "))
  line.appendChild(diceEl)
  if (stat) {
    const statEl = document.createElement("span")
    statEl.className = "attackStat"
    statEl.innerText = String(stat).toUpperCase()
    line.appendChild(document.createTextNode(" + "))
    line.appendChild(statEl)
  }
  container.appendChild(line)
}

function populateAttackBlock(block, attack) {
  const head = document.createElement("div")
  head.className = "combatAttackHead"
  head.appendChild(createCombatIcon(attack, null, "combatIcon"))
  const t = document.createElement("div")
  t.className = "combatAttack"
  t.innerText = attack.name
  head.appendChild(t)
  block.appendChild(head)
  appendAttackLine(block, "Type", attack.type)
  appendAttackDiceLine(block, attack.dice, attack.stat)
  appendAttackLine(block, "Effet", attack.effect)
  appendAttackLine(block, "Crit", attack.crit)
  if (attack.condition) appendAttackLine(block, "Condition", attack.condition)
}

function getAttackStatKey(statLabel) {
  const raw = String(statLabel || "").toLowerCase()
  if (raw.includes("force")) return "force"
  if (raw.includes("charme")) return "charme"
  if (raw.includes("chance")) return "chance"
  if (raw.includes("perspi") || raw.includes("perspic")) return "perspi"
  if (raw.includes("def")) return "defense"
  return "force"
}

function getPlayerAttackTypeKey(attack) {
  const value = String(attack?.type || "").toLowerCase()
  if (value.includes("soin")) return "heal"
  if (value.includes("sort")) return "spell"
  if (value.includes("invocation")) return "summon"
  if (value.includes("analyse")) return "analysis"
  if (value.includes("charme")) return "charm"
  if (value.includes("distance")) return "ranged"
  if (value.includes("sp")) return "special"
  return "physical"
}

function getPlayerSpecialAttack(playerId) {
  return (typeof playerSpecialAttacks !== "undefined" && playerSpecialAttacks) ? (playerSpecialAttacks[playerId] || null) : null
}

function hasPlayerUsedCombatSpecial(playerId) {
  return !!(window.__playerCombatSpecialsUsed && window.__playerCombatSpecialsUsed[playerId])
}

function markPlayerCombatSpecialUsed(playerId) {
  if (!window.__playerCombatSpecialsUsed) window.__playerCombatSpecialsUsed = {}
  window.__playerCombatSpecialsUsed[playerId] = true
  db.ref("combat/playerSpecials/" + playerId).set(true).catch(error => showNotification("Spéciale non enregistrée : " + error.message))
}

function markPlayerCombatTrigger(playerId, key) {
  if (!window.__playerCombatFlags) window.__playerCombatFlags = {}
  if (!window.__playerCombatFlags[playerId]) window.__playerCombatFlags[playerId] = {}
  window.__playerCombatFlags[playerId][key] = true
  db.ref("combat/playerFlags/" + playerId + "/" + key).set(true).catch(error => console.warn(error))
}

function hasPlayerCombatTrigger(playerId, key) {
  return !!(window.__playerCombatFlags && window.__playerCombatFlags[playerId] && window.__playerCombatFlags[playerId][key])
}

function getCharacterMaxHp(playerId, charData = {}) {
  const direct =
    parseInt(charData.maxHp ?? charData.hpMax ?? charData.hpmax, 10)
  if (Number.isFinite(direct) && direct > 0) return direct

  const lvl = Math.max(1, parseInt(charData.lvl, 10) || 1)
  if (typeof getPlayerStatsAtLevel === "function") {
    const statsAtLevel = getPlayerStatsAtLevel(playerId, lvl)
    if (statsAtLevel && Number.isFinite(parseInt(statsAtLevel.hp, 10))) {
      return parseInt(statsAtLevel.hp, 10)
    }
  }

  if (playerBaseStats && playerBaseStats[playerId] && Number.isFinite(parseInt(playerBaseStats[playerId].hp, 10))) {
    return parseInt(playerBaseStats[playerId].hp, 10)
  }

  return Math.max(1, parseInt(charData.hp, 10) || 1)
}

function parseInventoryItems(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function playerHasInventoryItem(charData, itemNeedle) {
  const needle = String(itemNeedle || "").toLowerCase().trim()
  if (!needle) return false
  return parseInventoryItems(charData?.inventaire).some(item => item === needle || item.includes(needle))
}

function getTokenCenterById(id) {
  const token = document.getElementById(id)
  if (!token) return null
  const left = parseInt(token.style.left, 10)
  const top = parseInt(token.style.top, 10)
  const width = token.offsetWidth || parseInt(token.style.width, 10) || 96
  const height = token.offsetHeight || parseInt(token.style.height, 10) || 96
  const x = Number.isFinite(left) ? left + width / 2 : token.offsetLeft + width / 2
  const y = Number.isFinite(top) ? top + height / 2 : token.offsetTop + height / 2
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function getDistanceBetweenTokens(idA, idB) {
  const a = getTokenCenterById(idA)
  const b = getTokenCenterById(idB)
  if (!a || !b) return Infinity
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function isGregNearMobForBite() {
  return getDistanceBetweenTokens("greg", "mobToken") <= 185
}

function isPhysicalMobAttack(attack) {
  const effect = String(attack?.effect || "").toLowerCase()
  const type = String(attack?.type || "").toLowerCase()
  const name = String(attack?.name || "").toLowerCase()
  if (effect === "all" || effect === "curse" || effect === "magic" || effect === "ranged") return false
  if (effect === "melee") return true
  if (type.includes("melee") || type.includes("physical") || type.includes("physique")) return true
  return /(coup|frappe|morsure|griffe|croc|charge|balayage|taloche|massue|lance|estoc|poing|fouet|pi[eé]tinement|entaille)/.test(name)
}

function chooseCombatTarget(playerIds, titleText) {
  return new Promise(resolve => {
    const existing = document.getElementById("combatTargetPicker")
    if (existing) existing.remove()

    const picker = document.createElement("div")
    picker.id = "combatTargetPicker"
    picker.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid rgba(214,164,90,0.5);box-shadow:0 0 0 1px rgba(120,90,40,0.5),0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:16px;z-index:1000000001;font-family:Cinzel,serif;min-width:260px;"

    const title = document.createElement("div")
    title.style.cssText = "font-size:13px;letter-spacing:2px;color:#f2d7a6;text-align:center;margin-bottom:12px;"
    title.innerText = titleText || "Choisir une cible"
    picker.appendChild(title)

    playerIds.forEach(pid => {
      const btn = document.createElement("button")
      btn.style.cssText = "display:block;width:100%;padding:8px;margin-bottom:6px;font-family:Cinzel,serif;font-size:12px;background:rgba(10,30,38,0.8);color:#e0f0f4;border:1px solid rgba(30,90,102,0.5);border-radius:2px;cursor:pointer;text-align:left;"
      btn.innerText = pid.toUpperCase()
      btn.onclick = () => {
        picker.remove()
        resolve(pid)
      }
      picker.appendChild(btn)
    })

    const cancel = document.createElement("button")
    cancel.style.cssText = "display:block;width:100%;padding:6px;font-family:Cinzel,serif;font-size:11px;background:rgba(80,20,20,0.4);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;"
    cancel.innerText = "Annuler"
    cancel.onclick = () => {
      picker.remove()
      resolve(null)
    }
    picker.appendChild(cancel)

    document.body.appendChild(picker)
  })
}

function getPlayerAttackPower(attack, roll, statValue, context = {}) {
  const type = getPlayerAttackTypeKey(attack)
  const scaling = getPlayerLevelScaling(context.playerId || context.actorId || "", context.charData || null)
  const lvl = Math.max(1, scaling.lvl || 1)
  const getTieredLevelBonus = multiplier => {
    if (lvl <= 1) return 0
    let total = 0
    for (let current = 2; current <= lvl; current += 1) {
      let perLevel = 1
      if (current >= 15) perLevel = 4
      else if (current >= 10) perLevel = 3
      else if (current >= 5) perLevel = 2
      total += perLevel
    }
    return Math.max(0, Math.round(total * multiplier))
  }

  let levelBonus = 0
  if (type === "analysis") levelBonus = getTieredLevelBonus(0.35)
  else if (type === "charm" || type === "summon") levelBonus = getTieredLevelBonus(0.7)
  else if (type === "heal") levelBonus = getTieredLevelBonus(0.85)
  else levelBonus = getTieredLevelBonus(1)

  if (attack && attack.name === "Je suis jet laguée") {
    return Math.max(1, (parseInt(roll, 10) || 0) + (parseInt(statValue, 10) || 0) + levelBonus)
  }
  const multipliers = {
    physical: 1.05,
    ranged: 1.0,
    special: 1.18,
    charm: 1.08,
    spell: 1.12,
    analysis: 0.72,
    summon: 0.94,
    heal: 1.0
  }
  const power = Math.round(roll * (multipliers[type] || 1) + statValue * 0.82 + levelBonus)
  if (type === "heal") return Math.max(8, power)
  return Math.max(1, power)
}

function getCombatHUDPlayerId() {
  if (isGM && window.__combatPreviewPlayerId) return window.__combatPreviewPlayerId
  if (myToken && myToken.id) return myToken.id
  return null
}

function setCombatPreviewPlayer(playerID) {
  if (!isGM) return
  window.__combatPreviewPlayerId = playerID || null
  showCombatHUD()
  const hud = document.getElementById("combatHUD")
  if (hud) {
    hud.style.display = "flex"
    hud.style.alignItems = "flex-start"
  }
  document.querySelectorAll(".gmPlayerTestBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.playerId === playerID)
  })
}

function closeCombatPreviewHUD() {
  window.__combatPreviewPlayerId = null
  const hud = document.getElementById("combatHUD")
  if (hud) hud.style.display = "none"
  document.querySelectorAll(".gmPlayerTestBtn").forEach(btn => btn.classList.remove("active"))
}

function renderPlayerAttackResolution(playerId, attack, roll, total, outcome) {
  const statKey = getAttackStatKey(attack.stat)
  const statLabel = String(attack.stat || statKey).toUpperCase()
  const verb = outcome.mode === "heal" ? "restaure" : "inflige"
  const target = outcome.mode === "heal" ? playerId.toUpperCase() : (outcome.targetName || "MOB")
  const amount = outcome.amount || 0
  showNotification(
    attack.name + " — d" + attack.dice + ": " + roll + " + " + statLabel + " (" + (total - roll) + ") • " +
    verb + " " + amount + (outcome.mode === "heal" ? " PV" : " dégâts") + " à " + target
  )
}

function renderPlayerAttackResolutionV2(playerId, attack, roll, total, outcome) {
  const statKey = getAttackStatKey(attack.stat)
  const statLabel = String(attack.stat || statKey).toUpperCase()
  const verb = outcome.mode === "heal" ? "restaure" : "inflige"
  const target = outcome.mode === "heal" ? playerId.toUpperCase() : (outcome.targetName || "MOB")
  const amount = outcome.amount || 0
  const parts = ["d" + attack.dice + ": " + roll]
  const statBonus = outcome.statBonus != null ? outcome.statBonus : (total - roll)
  if (statBonus) parts.push(statLabel + " +" + statBonus)
  if (outcome.flatBonus) parts.push("Bonus +" + outcome.flatBonus)
  if (outcome.multiplier && outcome.multiplier !== 1) parts.push("x" + outcome.multiplier)
  showNotification(
    attack.name + " — " + parts.join(" • ") + " • " +
    verb + " " + amount + (outcome.mode === "heal" ? " PV" : " dégâts") + " à " + target
  )
}

function getPlayerSpecialPresentation(playerId) {
  const key = String(playerId || "").toLowerCase()
  const map = {
    greg: {
      scene: "greg",
      kicker: "FINISHER",
      accent: "#d9b37c",
      glow: "rgba(217,179,124,0.38)",
      image: "gregspé.jpg",
      quoteFrame: "cadre.png"
    },
    ju: {
      scene: "yu",
      kicker: "RIPOSTE",
      accent: "#8fc9ff",
      glow: "rgba(143,201,255,0.34)",
      video: "juspé.mp4",
      quoteFrame: "cadre.png"
    },
    elo: {
      scene: "elo",
      kicker: "INCANTATION",
      accent: "#9cf2cf",
      glow: "rgba(156,242,207,0.34)",
      image: "elospé.jpg",
      quoteFrame: "cadre.png"
    },
    bibi: {
      scene: "bibi",
      kicker: "RAGE CANINE",
      accent: "#ffd28d",
      glow: "rgba(255,210,141,0.34)",
      image: "bibispé.png",
      quoteFrame: "cadre.png"
    }
  }
  return map[key] || map.greg
}

function showPlayerSpecialCinematic(playerId, attack, outcome, meta = {}) {
  const presentation = getPlayerSpecialPresentation(playerId)
  const specialSoundMap = {
    greg: "spégreg.mp3",
    elo: "spéelo.mp3",
    bibi: "spébibi.mp3"
  }
  const overlay = document.createElement("div")
  overlay.className = "playerSpecialOverlay playerSpecialOverlay--" + presentation.scene

  const stage = document.createElement("div")
  stage.className = "playerSpecialStage"
  overlay.appendChild(stage)

  if (presentation.video) {
    const heroVideo = document.createElement("video")
    heroVideo.className = "playerSpecialVideo playerSpecialVideo--" + presentation.scene
    heroVideo.src = "images/" + presentation.video
    heroVideo.autoplay = true
    heroVideo.loop = true
    heroVideo.muted = false
    heroVideo.volume = 0.88
    heroVideo.playsInline = true
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(heroVideo, 0.88)
    heroVideo.onerror = () => heroVideo.style.display = "none"
    stage.appendChild(heroVideo)
    heroVideo.play().catch(()=>{heroVideo.muted=true;heroVideo.play().catch(()=>{})})
  } else if (presentation.image) {
    const heroImage = document.createElement("img")
    heroImage.className = "playerSpecialImage playerSpecialImage--" + presentation.scene
    heroImage.src = "images/" + presentation.image
    heroImage.alt = ""
    heroImage.onerror = () => heroImage.style.display = "none"
    stage.appendChild(heroImage)
  }

  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.alt = ""
  ring.className = "playerSpecialRing"
  stage.appendChild(ring)

  const slash = document.createElement("img")
  slash.src = "images/" + ((presentation.scene === "elo" || presentation.scene === "yu") ? "rune_glow.png" : "slash_overlay.png")
  slash.alt = ""
  slash.className = "playerSpecialSlash"
  stage.appendChild(slash)

  const box = document.createElement("div")
  box.className = "playerSpecialBox"

  const kicker = document.createElement("div")
  kicker.className = "playerSpecialKicker"
  kicker.style.color = presentation.accent
  kicker.innerText = meta.fail ? "ÉLAN BRISÉ" : meta.crit ? "MOMENT DÉCISIF" : presentation.kicker
  box.appendChild(kicker)

  const title = document.createElement("div")
  title.className = "playerSpecialTitle"
  title.innerText = String(attack.name || "SPÉCIALE").toUpperCase()
  box.appendChild(title)

  const flavorText = outcome.mode === "heal"
    ? playerId.toUpperCase() + " restaure " + (outcome.amount || 0) + " PV"
    : playerId.toUpperCase() + " frappe " + (outcome.targetName || "MOB") + " pour " + (outcome.amount || 0) + " dégâts"

  let flavorHost = box
  if (presentation.quoteFrame) {
    const frame = document.createElement("img")
    frame.className = "playerSpecialQuoteFrame playerSpecialQuoteFrame--" + presentation.scene
    frame.src = "images/" + presentation.quoteFrame
    frame.alt = ""
    frame.onerror = () => frame.style.display = "none"
    box.appendChild(frame)

    const quoteWrap = document.createElement("div")
    quoteWrap.className = "playerSpecialQuoteWrap playerSpecialQuoteWrap--" + presentation.scene
    box.appendChild(quoteWrap)
    flavorHost = quoteWrap
  }

  const sub = document.createElement("div")
  sub.className = "playerSpecialSub"
  sub.style.color = presentation.accent
  sub.innerText = flavorText
  flavorHost.appendChild(sub)

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  const specialSound = specialSoundMap[String(playerId || "").toLowerCase()]
  if (specialSound) {
    const voice = new Audio("audio/" + specialSound)
    const isEloSpecial = String(playerId || "").toLowerCase() === "elo"
    const baseVolume = isEloSpecial ? (meta.crit ? 1.25 : 1.12) : (meta.crit ? 0.96 : 0.88)
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(voice, baseVolume)
    else voice.volume = Math.min(1, baseVolume)
    voice.play().catch(() => {})
  }

  if (meta.fail) {
    playSound("critFailSound", 0.82)
    flashRed()
    screenShake()
  } else if (meta.crit) {
    playSound("critSound", 0.95)
    playSound("powSound", 0.9)
    flashGold()
    flashGold()
    screenShakeHard()
    setTimeout(() => screenShake(), 180)
    setTimeout(() => screenShakeHard(), 360)
    powerExplosion()
  } else {
    playSound("powSound", 0.84)
    flashGold()
    screenShake()
    setTimeout(() => screenShake(), 160)
  }

  setTimeout(() => {
    overlay.querySelectorAll("video").forEach(video=>video.pause())
    overlay.style.transition = "opacity 0.42s ease"
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), 450)
  }, 6000)
}

function showPlayerAttackImpact(playerId, attack, outcome, meta = {}) {
  if (meta.special) {
    showPlayerSpecialCinematic(playerId, attack, outcome, meta)
    return
  }
  const type = getPlayerAttackTypeKey(attack)
  const crit = !!meta.crit
  const fail = !!meta.fail

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999995;display:flex;align-items:center;justify-content:center;"

  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.alt = ""
  ring.style.cssText = "position:absolute;width:min(44vw,420px);opacity:0.22;filter:drop-shadow(0 0 22px rgba(255,210,120,0.28));animation:combatEventPulse 0.42s ease-out 2;"
  overlay.appendChild(ring)

  const slash = document.createElement("img")
  slash.src = "images/" + (type === "spell" || type === "analysis" || type === "summon" ? "rune_glow.png" : "slash_overlay.png")
  slash.alt = ""
  slash.style.cssText = "position:absolute;width:min(56vw,520px);opacity:0.2;transform:rotate(" + (Math.random() * 16 - 8) + "deg);filter:drop-shadow(0 0 16px rgba(255,255,255,0.14));"
  overlay.appendChild(slash)

  const box = document.createElement("div")
  const colorMap = {
    physical: "#d9b37c",
    ranged: "#c8d7ea",
    special: "#ffd28d",
    charm: "#d6a6ff",
    spell: "#8ff0d2",
    analysis: "#8fc9ff",
    summon: "#c1a0ff",
    heal: "#b8ffd2"
  }
  const accent = fail ? "#b86868" : (colorMap[type] || "#d9b37c")
  box.style.cssText = "position:relative;min-width:min(52vw,580px);max-width:72vw;padding:18px 30px;border:1px solid rgba(230,190,110,0.3);background:linear-gradient(135deg,rgba(6,14,18,0.9),rgba(12,20,24,0.84));box-shadow:0 0 30px rgba(0,0,0,0.44), inset 0 0 22px rgba(255,255,255,0.03);"

  const kicker = document.createElement("div")
  kicker.style.cssText = "font-family:Cinzel,serif;font-size:12px;letter-spacing:3px;color:" + accent + ";text-align:center;margin-bottom:6px;"
  kicker.innerText = fail ? "ÉLAN BRISÉ" : crit ? "FRAPPE CRITIQUE" : "ACTION DU JOUEUR"
  box.appendChild(kicker)

  const title = document.createElement("div")
  title.style.cssText = "font-family:'Uncial Antiqua','Cinzel',serif;font-size:30px;line-height:1.15;text-align:center;color:#f4ead2;text-shadow:0 0 16px rgba(0,0,0,0.5);"
  title.innerText = String(attack.name || "ATTAQUE").toUpperCase()
  box.appendChild(title)

  const sub = document.createElement("div")
  sub.style.cssText = "margin-top:10px;font-family:Cinzel,serif;font-size:14px;letter-spacing:1px;text-align:center;color:" + accent + ";"
  if (outcome.mode === "heal") sub.innerText = String(outcome.targetName || playerId).toUpperCase() + " récupère " + (outcome.amount || 0) + " PV"
  else sub.innerText = playerId.toUpperCase() + " frappe " + (outcome.targetName || "MOB") + " pour " + (outcome.amount || 0) + " dégâts"
  box.appendChild(sub)

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  if (fail) {
    playSound("critFailSound", 0.8)
    flashRed()
    screenShake()
  } else if (crit) {
    playSound("critSound", 0.9)
    flashGold()
    flashGold()
    screenShakeHard()
    powerExplosion()
  } else if (type === "heal") {
    playSound("powerSound", 0.42)
    flashGold()
  } else if (type === "spell" || type === "analysis" || type === "summon" || type === "charm") {
    playSound("powerSound", 0.5)
    flashGold()
    screenShake()
  } else {
    playSound("powerSound", 0.34)
    screenShake()
  }

  setTimeout(() => {
    overlay.style.transition = "opacity 0.35s ease"
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), 380)
  }, crit ? 2150 : 1800)
}

function isPlayerSpecialConditionMet(playerId, specialAttack, context = {}) {
  if (!specialAttack) return false
  const rule = specialAttack.rule || ""
  const mob = context.mob || null
  const charData = context.charData || {}
  const players = context.players || {}

  if (rule === "mob_below_half") {
    if (!mob) return false
    const hp = parseInt(mob.hp, 10) || 0
    const maxHP = Math.max(1, parseInt(mob.maxHP, 10) || hp || 1)
    return hp <= Math.ceil(maxHP * 0.5)
  }

  if (rule === "mob_below_forty") {
    if (!mob) return false
    const hp = parseInt(mob.hp, 10) || 0
    const maxHP = Math.max(1, parseInt(mob.maxHP, 10) || hp || 1)
    return hp <= Math.ceil(maxHP * 0.4)
  }

  if (rule === "after_spider_sense") {
    return hasPlayerCombatTrigger(playerId, "spiderSense")
  }

  if (rule === "mob_used_special") {
    return !!mob?.specialUsed
  }

  if (rule === "ally_below_sixty") {
    return ["greg","ju","elo","bibi"].some(id => {
      const ally = players[id]
      if (!ally) return false
      const hp = parseInt(ally.hp, 10) || 0
      const maxHP = getCharacterMaxHp(id, ally)
      return hp <= Math.ceil(maxHP * 0.6)
    })
  }

  if (rule === "self_below_seventy") {
    const hp = parseInt(charData.hp, 10) || 0
    const maxHP = getCharacterMaxHp(playerId, charData)
    return hp <= Math.ceil(maxHP * 0.7)
  }

  if (rule === "greg_below_twenty") {
    const greg = players.greg || {}
    const hp = parseInt(greg.hp, 10) || 0
    const maxHP = getCharacterMaxHp("greg", greg)
    return hp <= Math.ceil(maxHP * 0.2)
  }

  return false
}

function getPlayerLevelScaling(playerId, charData = null) {
  const source = charData || {}
  const lvl = Math.max(1, parseInt(source.lvl, 10) || 1)
  return {
    lvl,
    damageFlat: Math.max(0, (lvl - 1) * 2),
    supportFlat: Math.max(0, Math.floor((lvl - 1) * 1.5)),
    finisherFlat: Math.max(0, (lvl - 1) * 3)
  }
}

function applyPlayerSpecialModifiers(playerId, state) {
  const pid = String(playerId || "").toLowerCase()
  const next = { ...state }
  const scaling = getPlayerLevelScaling(playerId, state.charData)
  next.levelScaling = scaling
  next.failEffectText = ""

  if (pid === "greg") {
    next.damage += 14 + scaling.finisherFlat
    next.flatBonus += 14 + scaling.finisherFlat
    if ((state.mobHpRatio || 1) <= 0.25) {
      next.damage += 8
      next.flatBonus += 8
    }
    if (state.crit) {
      next.damage += 10 + scaling.supportFlat
      next.flatBonus += 10 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = 0
      next.flatBonus = 0
      next.failEffectText = "Greg vacille et rate sa fenêtre d'exécution."
    }
  } else if (pid === "ju") {
    next.damage += 10 + scaling.damageFlat
    next.flatBonus += 10 + scaling.damageFlat
    if (state.mobSpecialUsed) {
      next.damage += 6 + scaling.supportFlat
      next.flatBonus += 6 + scaling.supportFlat
    }
    if (state.crit) {
      next.damage += 4 + scaling.supportFlat
      next.flatBonus += 4 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = Math.max(0, Math.round(state.basePower * 0.4))
      next.flatBonus = 0
      next.failEffectText = "Le plan s'effondre et Yu dévoile trop tôt son jeu."
    }
  } else if (pid === "elo") {
    next.damage += 9 + scaling.damageFlat
    next.flatBonus += 9 + scaling.damageFlat
    next.groupHeal = 6 + (parseInt(state.charData?.charme, 10) || 0) + scaling.supportFlat
    if (state.anyAllyQuarterHp) next.groupHeal += 4
    if (state.crit) next.groupHeal *= 2
    if (state.fail) {
      next.damage = 0
      next.flatBonus = 0
      next.groupHeal = Math.max(3, Math.round((6 + scaling.supportFlat) * 0.5))
      next.failEffectText = "L'incantation se brise, mais un souffle d'espoir subsiste."
    }
  } else if (pid === "bibi") {
    next.damage += 12 + scaling.damageFlat
    next.flatBonus += 12 + scaling.damageFlat
    if (state.gregCriticalHp) {
      next.damage += 8 + scaling.supportFlat
      next.flatBonus += 8 + scaling.supportFlat
    }
    if (state.crit) {
      next.damage += 6 + scaling.supportFlat
      next.flatBonus += 6 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = Math.max(0, Math.round(state.basePower * 0.5))
      next.flatBonus = 0
      next.failEffectText = "Bibi part trop tôt et s'éparpille au lieu de mordre juste."
    }
  }

  return next
}

function buildPlayerSpecialBlock(playerId, specialAttack) {
  const block = document.createElement("div")
  block.className = "combatBlock combatBlock--action combatBlock--special"
  const used = hasPlayerUsedCombatSpecial(playerId)

  populateAttackBlock(block, specialAttack)
  appendAttackLine(block, "Condition", specialAttack.conditionText)
  if (specialAttack.fail) appendAttackLine(block, "Crit fail", specialAttack.fail)

  const state = document.createElement("div")
  state.className = "combatSpecialState"
  state.innerText = used ? "Déjà utilisée dans ce combat" : "Unique • condition requise"
  block.appendChild(state)

  if (used) {
    block.classList.add("combatBlock--spent")
    block.onclick = null
  } else {
    block.title = "Cliquer pour lancer l'attaque spéciale"
    block.onclick = () => resolvePlayerAttack(specialAttack, { isSpecial: true })
  }

  return block
}

function buildPassTurnBlock(actorId, label) {
  const block = document.createElement("div")
  block.className = "combatBlock combatBlock--action combatBlock--pass"
  const title = document.createElement("div")
  title.className = "attackTitle"
  title.innerText = "Passer le tour"
  block.appendChild(title)
  appendAttackLine(block, "Cible", label || String(actorId || "").toUpperCase())
  appendAttackLine(block, "Effet", "Passe l'action sans attaquer")
  block.title = "Terminer le tour de " + (label || String(actorId || "").toUpperCase())
  block.onclick = () => {
    if (!canAccessCharacter(actorId)) return
    const turnState = typeof getCombatTurnState === "function" ? getCombatTurnState() : null
    if (turnState && turnState.phase === "rolling") {
      showNotification("Terminez d'abord les jets d'initiative.")
      return
    }
    const activeActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
    if (activeActorId && activeActorId !== actorId) {
      showNotification("Tour actif : " + (typeof getCombatActorLabel === "function" ? getCombatActorLabel(activeActorId) : String(activeActorId || "").toUpperCase()))
      return
    }
    showNotification((label || String(actorId || "").toUpperCase()) + " passe son tour.")
    if (typeof addMJLog === "function") addMJLog((label || String(actorId || "").toUpperCase()) + " passe son tour.")
    if (typeof advanceCombatTurn === "function") advanceCombatTurn()
  }
  return block
}

function buildMobPassTurnBlock(actorId, label) {
  const block = document.createElement("div")
  block.style.cssText = "padding:6px 8px;margin-top:8px;background:rgba(24,16,16,0.45);border:1px solid rgba(190,140,90,0.28);border-radius:6px;cursor:pointer;"
  const title = document.createElement("div")
  title.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#f0c99d;font-weight:bold;letter-spacing:0.5px;"
  title.innerText = "Passer le tour"
  block.appendChild(title)
  const desc = document.createElement("div")
  desc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#d6b79e;"
  desc.innerText = (label || String(actorId || "").toUpperCase()) + " termine son action sans attaquer."
  block.appendChild(desc)
  block.title = "Terminer le tour de " + (label || String(actorId || "").toUpperCase())
  block.onclick = () => {
    const turnState = typeof getCombatTurnState === "function" ? getCombatTurnState() : null
    if (turnState && turnState.phase === "rolling") {
      showNotification("Terminez d'abord les jets d'initiative.")
      return
    }
    const activeActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
    if (activeActorId && activeActorId !== actorId) {
      showNotification("Tour actif : " + (typeof getCombatActorLabel === "function" ? getCombatActorLabel(activeActorId) : String(activeActorId || "").toUpperCase()))
      return
    }
    showNotification((label || String(actorId || "").toUpperCase()) + " passe son tour.")
    if (typeof addMJLog === "function") addMJLog((label || String(actorId || "").toUpperCase()) + " passe son tour.")
    if (typeof advanceCombatTurn === "function") advanceCombatTurn()
  }
  return block
}

function getCombatStatusEntries() {
  const entries = []
  const turnState = typeof getCombatTurnState === "function" ? getCombatTurnState() : null
  const currentActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
  const actorLabelMap = {
    greg: "Greg",
    ju: "Yu",
    elo: "Elo",
    bibi: "Bibi",
    mob: String(currentMob || "Mob").toUpperCase(),
    mob2: "MOB 2",
    mob3: "MOB 3"
  }
  if (turnState && turnState.phase === "active" && currentActorId) {
    entries.push({
      kind: "buff",
      icon: "impact_ring.png",
      title: "Tour actif",
      text: (actorLabelMap[currentActorId] || (typeof getCombatActorLabel === "function" ? getCombatActorLabel(currentActorId) : String(currentActorId).toUpperCase())) + " joue maintenant",
      meta: "Round " + (turnState.round || 1)
    })
  }

  const yuAggro = window.__combatYuAggroState
  if (yuAggro && parseInt(yuAggro.turns, 10) > 0) {
    entries.push({
      kind: "warn",
      icon: "impact_ring.png",
      title: "Aggro de Yu",
      text: "Le mob doit viser Yu sur ses attaques ciblées.",
      meta: parseInt(yuAggro.turns, 10) + " round(s) restant(s)"
    })
  }

  const spiderSense = window.__combatSpiderSenseBuffState
  if (spiderSense && spiderSense.active) {
    entries.push({
      kind: "buff",
      icon: "arcane.png",
      title: "Spider Sense",
      text: "Les attaques offensives alliées gagnent +10% dégâts.",
      meta: "Actif pour tout le combat"
    })
  }

  const revealedWeakness = window.__combatRevealedWeaknessState
  if (revealedWeakness && revealedWeakness.title) {
    entries.push({
      kind: "warn",
      icon: "weakness.png",
      title: "Faiblesse révélée",
      text: revealedWeakness.title + " — " + (revealedWeakness.text || ""),
      meta: String(revealedWeakness.mobName || "Mob")
    })
  }

  const bibiRage = window.__combatBibiRageState
  if (bibiRage && parseInt(bibiRage.turns, 10) > 0) {
    entries.push({
      kind: "buff",
      icon: "fang.png",
      title: "Le Bibi",
      text: "Chaque attaque alliée ajoute " + (parseInt(bibiRage.damage, 10) || 2) + " dégâts au mob.",
      meta: parseInt(bibiRage.turns, 10) + " round(s) restant(s)"
    })
  }

  const attackMalus = window.__combatAttackMalusState
  if (attackMalus && parseInt(attackMalus.turns, 10) > 0) {
    entries.push({
      kind: "warn",
      icon: "weakness.png",
      title: "Humiliation du mob",
      text: "Les attaques du mob perdent " + (parseInt(attackMalus.amount, 10) || 1) + " dégâts.",
      meta: parseInt(attackMalus.turns, 10) + " round(s) restant(s)"
    })
  }

  const poison = window.__combatPlayerPoisonState
  if (poison && parseInt(poison.turns, 10) > 0) {
    entries.push({
      kind: "warn",
      icon: "venom.png",
      title: "Poison",
      text: "Le mob perd " + (parseInt(poison.damage, 10) || 2) + " HP à chacun de ses tours.",
      meta: parseInt(poison.turns, 10) + " round(s) restant(s)"
    })
  }

  const bleed = window.__combatPlayerBleedState
  if (bleed && parseInt(bleed.turns, 10) > 0) {
    entries.push({
      kind: "warn",
      icon: "fang.png",
      title: "Saignement",
      text: "Le mob perd " + (parseInt(bleed.damage, 10) || 1) + " HP à chacun de ses tours.",
      meta: parseInt(bleed.turns, 10) + " round(s) restant(s)"
    })
  }

  const summon = window.__eloSummonState
  if (summon && summon.active) {
    entries.push({
      kind: "ally",
      icon: "pork.png",
      title: "John Pork",
      text: "Invocation active : bonus D4 aux attaques d’Elo" + (summon.frenzy ? ", doublé et en zone." : "."),
      meta: (parseInt(summon.turnsLeft, 10) || 0) + " round(s) • " + (parseInt(summon.hp, 10) || 0) + "/" + (parseInt(summon.maxHP, 10) || 0) + " HP"
    })
  }

  const dmgLog = window.__combatDamageLog || []
  if (dmgLog.length) {
    entries.push({ kind: "section", title: "Derniers coups" })
    dmgLog.forEach(hit => {
      entries.push({
        kind: hit.type,
        icon: hit.type === "heal" ? "arcane.png" : "impact_ring.png",
        title: hit.from + "  →  " + hit.to,
        text: hit.type === "heal" ? "+" + hit.amount + " PV" : "−" + hit.amount + " PV",
        meta: "Round " + hit.round
      })
    })
  }

  Object.entries(window.__combatSnapshot?.heroDebuffs||{}).forEach(([id,e])=>entries.push({kind:"warn",title:id.toUpperCase()+" affaibli",text:"Force et défense −"+(e.amount||2),meta:e.turns+" round(s)"}))
  Object.entries(window.__combatSnapshot?.heroStuns||{}).filter(([,n])=>n>0).forEach(([id])=>entries.push({kind:"warn",title:id.toUpperCase()+" étourdi",text:"Prochaine action sautée",meta:"Une action"}))
  return entries
}

let _renderCombatStatusPanelTimer = null
function renderCombatStatusPanel() {
  clearTimeout(_renderCombatStatusPanelTimer)
  _renderCombatStatusPanelTimer = setTimeout(_renderCombatStatusPanelNow, 50)
}
function _renderCombatStatusPanelNow() {
  const panel = document.getElementById("combatStatusPanel")
  if (!panel) return
  if (!combatActive) {
    panel.style.display = "none"
    panel.innerHTML = ""
    return
  }

  const entries = getCombatStatusEntries()
  panel.innerHTML = ""
  panel.style.display = "block"

  const header = document.createElement("div")
  header.className = "combatStatusHeader"
  header.innerText = "États du combat"
  panel.appendChild(header)

  const list = document.createElement("div")
  list.className = "combatStatusList"
  panel.appendChild(list)

  if (!entries.length) {
    const empty = document.createElement("div")
    empty.className = "combatStatusEmpty"
    empty.innerText = "Aucun état actif."
    list.appendChild(empty)
    return
  }

  entries.forEach(entry => {
    if (entry.kind === "section") {
      const sep = document.createElement("div")
      sep.className = "combatStatusSection"
      sep.innerText = entry.title || ""
      list.appendChild(sep)
      return
    }

    const row = document.createElement("div")
    row.className = "combatStatusItem combatStatusItem--" + (entry.kind || "buff")
    if ((entry.title || "").toLowerCase().includes("tour actif")) row.classList.add("combatStatusItem--turn")
    if ((entry.title || "").toLowerCase().includes("faiblesse")) row.classList.add("combatStatusItem--weakness")

    const icon = document.createElement("img")
    icon.className = "combatStatusIcon"
    icon.src = "images/" + sanitizeAssetName(entry.icon || "impact_ring.png")
    icon.alt = ""
    icon.onerror = () => { icon.style.display = "none" }
    row.appendChild(icon)

    const body = document.createElement("div")
    body.className = "combatStatusBody"

    const title = document.createElement("div")
    title.className = "combatStatusTitle"
    title.innerText = entry.title || "État"
    body.appendChild(title)

    const text = document.createElement("div")
    text.className = "combatStatusText"
    text.innerText = entry.text || ""
    body.appendChild(text)

    if (entry.meta) {
      const meta = document.createElement("div")
      meta.className = "combatStatusMeta"
      meta.innerText = entry.meta
      body.appendChild(meta)
    }

    row.appendChild(body)
    list.appendChild(row)
  })
}

function resolvePlayerAttack(attack, options = {}) { return requestHeroCombatAction(attack, options) }

function cleanupGMPlayerSheetListener(playerID) {
  if (!window.__gmMiniRefs || !window.__gmMiniRefs[playerID]) return
  const binding = window.__gmMiniRefs[playerID]
  binding.ref.off("value", binding.cb)
  delete window.__gmMiniRefs[playerID]
}

function showCombatHUD() {
  const player = getCombatHUDPlayerId()
  if (!player) return
  const hud = document.getElementById("combatHUD")
  if (hud) {
    let bg = document.getElementById("combatHUDBg")
    if (!bg) {
      bg = document.createElement("img")
      bg.id = "combatHUDBg"
      bg.alt = ""
      bg.src = "images/menuintro.png?v=7"
      hud.prepend(bg)
    }
  }
  const playerAttacks = attacks[player]
  const specialAttack = getPlayerSpecialAttack(player)
  const currentActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
  const meta = document.getElementById("combatHUDMeta")
  document.getElementById("combatHUDPortrait").src   = "images/" + player + ".png"
  document.getElementById("combatHUDName").innerText  = player.toUpperCase()
  if (meta) {
    meta.replaceChildren()
    const rolePill = document.createElement("div")
    rolePill.className = "combatHUDMetaPill"
    rolePill.innerText = isGM && window.__combatPreviewPlayerId ? "Aperçu MJ" : "Combattant"
    meta.appendChild(rolePill)

    const turnPill = document.createElement("div")
    turnPill.className = "combatHUDMetaPill combatHUDMetaPill--turn"
    turnPill.innerText = currentActorId === player ? "Tour actif" : ("Tour : " + String(currentActorId || "—").toUpperCase())
    meta.appendChild(turnPill)

    if (isGM && window.__combatPreviewPlayerId) {
      const previewPill = document.createElement("div")
      previewPill.className = "combatHUDMetaPill combatHUDMetaPill--preview"
      previewPill.innerText = "Test MJ"
      meta.appendChild(previewPill)
    }
  }
  const box = document.getElementById("combatHUDAttacks"); box.innerHTML = ""
  if (playerAttacks) playerAttacks.forEach(a => {
    const block = document.createElement("div"); block.className = "combatBlock"
    populateAttackBlock(block, a)
    block.classList.add("combatBlock--action")
    block.title = "Cliquer pour lancer l'attaque"
    block.onclick = () => resolvePlayerAttack(a)
    box.appendChild(block)
  })
  if (specialAttack) box.appendChild(buildPlayerSpecialBlock(player, specialAttack))
  if (player === "greg") {
    const bibiSpecial = getPlayerSpecialAttack("bibi")
    if (bibiSpecial) {
      const divider = document.createElement("div")
      divider.className = "combatCompanionDivider"
      divider.innerText = "BIBI"
      box.appendChild(divider)

      const bibiBlock = buildPlayerSpecialBlock("bibi", bibiSpecial)
      bibiBlock.classList.add("combatBlock--companion")
      bibiBlock.title = "Greg peut piloter la spéciale de Bibi"
      if (!hasPlayerUsedCombatSpecial("bibi")) {
        bibiBlock.onclick = () => resolvePlayerAttack(bibiSpecial, { isSpecial: true, actorId: "bibi" })
      }
      box.appendChild(bibiBlock)
    }
  }
  box.appendChild(buildPassTurnBlock(player, player.toUpperCase()))
  // Greg et Bibi partagent le même tour et une seule action.
  renderCombatStatusPanel()
  if (hud) hud.style.display = "none"
  const btn = document.getElementById("playerAttackBtn"); if (btn && player) btn.style.display = "flex"
}

function togglePlayerAttacks() {
  const hud = document.getElementById("combatHUD"); if (!hud) return
  const playerId = getCombatHUDPlayerId()
  const turnState = typeof getCombatTurnState === "function" ? getCombatTurnState() : null
  const activeActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
  const isPreviewMode = !!(isGM && window.__combatPreviewPlayerId) || !!window._previewSavedMyToken
  if ((hud.style.display === "none" || !hud.style.display) && combatActive && playerId && turnState && turnState.phase === "rolling" && !isPreviewMode) {
    showNotification("Terminez d'abord les jets d'initiative.")
    return
  }
  const isGregControllingBibi = false
  if ((hud.style.display === "none" || !hud.style.display) && combatActive && playerId && activeActorId && activeActorId !== playerId && !isPreviewMode && !isGregControllingBibi) {
    showNotification("Tour actif : " + (typeof getCombatActorLabel === "function" ? getCombatActorLabel(activeActorId) : String(activeActorId || "").toUpperCase()))
    return
  }
  if (hud.style.display === "none" || !hud.style.display) { hud.style.display = "flex"; hud.style.alignItems = "flex-start" }
  else {
    hud.style.display = "none"
    if (isGM && window.__combatPreviewPlayerId) closeCombatPreviewHUD()
  }
}


function openGMPlayerSheet(playerID) {
  if (!isGM) return
  if (window.__combatPreviewPlayerId === playerID) {
    if (typeof closeCombatPreviewHUD === "function") closeCombatPreviewHUD()
    return
  }
  if (typeof setCombatPreviewPlayer === "function") setCombatPreviewPlayer(playerID)
}

/* ========================= */
/* MULTI-MOBS                */
/* ========================= */

// Ciblage intelligent selon le type d'attaque
function _smartTarget(attack) {
  const players = ["greg","ju","elo","bibi"]
  const alivePlayers = players.filter(p => {
    const tok = document.getElementById(p)
    return tok && !tok.classList.contains("playerDead")
  })
  if (!alivePlayers.length) return players[0]

  const effect = attack.effect || ""
  const name   = (attack.name || "").toLowerCase()

  // Attaque de zone — tous les joueurs
  if (effect === "all") return "all"

  // Attaque corps à corps — joueur le plus proche du token mob
  if (isPhysicalMobAttack(attack)) {
    const mobTok = document.getElementById("mobToken")
    if (mobTok) {
      const mobX = parseInt(mobTok.style.left)||600, mobY = parseInt(mobTok.style.top)||200
      const ranked = []
      alivePlayers.forEach(pid => {
        const tok = document.getElementById(pid); if (!tok) return
        const dx = (parseInt(tok.style.left)||0) - mobX
        const dy = (parseInt(tok.style.top)||0)  - mobY
        const dist = Math.sqrt(dx*dx + dy*dy)
        ranked.push({ pid, dist })
      })
      ranked.sort((a, b) => a.dist - b.dist)
      if (!ranked.length) return alivePlayers[0]
      if (ranked.length === 1) return ranked[0].pid
      const proximityRoll = Math.random()
      if (proximityRoll < 0.68) return ranked[0].pid
      if (proximityRoll < 0.9) return ranked[1].pid
      return ranked[Math.floor(Math.random() * ranked.length)].pid
    }
  }

  // Attaque de malédiction — joueur avec le moins de malédictions actives
  if (effect === "curse") {
    // Cibler celui qui a le moins de malédictions (pire cible = celle qu'on veut affaiblir)
    return alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
  }

  // Attaque à distance / magie — joueur avec le plus de HP (menace principale)
  if (effect === "ranged" || effect === "magic" || name.includes("flèche") || name.includes("magie") || name.includes("sort")) {
    // Lecture des HP depuis les tokens stats si dispo, sinon aléatoire
    const hpEls = alivePlayers.map(pid => {
      const el = document.querySelector("#stats_" + pid + " .hpText, #stats_" + pid + " .lowHPText")
      const txt = el ? el.innerText : ""
      const m = txt.match(/(\d+)\//)
      return { pid, hp: m ? parseInt(m[1]) : 50 }
    })
    hpEls.sort((a,b) => b.hp - a.hp)
    // 60% chance de cibler le plus fort, 40% aléatoire
    return Math.random() < 0.6 ? hpEls[0].pid : alivePlayers[Math.floor(Math.random()*alivePlayers.length)]
  }

  // Par défaut — aléatoire avec légère préférence pour les HP bas
  return alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
}

function renderAllMobPanels() {
  const ex=document.getElementById("mobAttackPanel"); if(ex) ex.remove()
  const exT=document.getElementById("mobAttackToggle"); if(exT) exT.remove()
  const active = MOB_SLOTS.filter(s => activeMobSlots[s]); if (!active.length || !combatActive) return

  const container = document.createElement("div"); container.id = "mobAttackPanel"
  container.style.cssText = "position:fixed;top:calc(96px + 38vh - 132px);right:22px;width:320px;display:flex;flex-direction:column;gap:10px;z-index:9999999;max-height:48vh;overflow-y:auto;padding:4px;"

  // Grab & drop pour le MJ
  if (isGM) {
    let dragging=false, ox=0, oy=0
    container.style.cursor = "grab"
    container.addEventListener("mousedown", e => {
      if (e.target.tagName==="BUTTON"||e.target.tagName==="DIV"&&e.target.onclick) return
      dragging=true; ox=e.clientX-container.offsetLeft; oy=e.clientY-container.offsetTop
      container.style.cursor="grabbing"; e.preventDefault()
    })
    document.addEventListener("mousemove", e => {
      if (!dragging) return
      container.style.left=Math.max(0,Math.min(window.innerWidth-280,e.clientX-ox))+"px"
      container.style.top=Math.max(0,Math.min(window.innerHeight-200,e.clientY-oy))+"px"
      container.style.bottom="auto"; container.style.right="auto"
    })
    document.addEventListener("mouseup", () => { dragging=false; container.style.cursor="grab" })
  }

  active.forEach(slot => { db.ref("combat/"+slot).once("value", snap => { const md=snap.val(); if(md) container.appendChild(buildMobSubPanel(md,slot)) }) })
  document.body.appendChild(container)
}

function buildMobSubPanel(mobData, slot) {
  const panel = document.createElement("div"); panel.dataset.slot=slot; panel.style.cssText = "background:url('images/mobpanel.png') center/100% 100% no-repeat;padding:12px;filter:drop-shadow(0 12px 18px rgba(0,0,0,0.22));"
  const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
  const titleWrap = document.createElement("div"); titleWrap.style.cssText = "display:flex;align-items:center;gap:8px;min-width:0;"
  const portrait = document.createElement("img"); portrait.src = "images/" + sanitizeAssetName((mobData.name || "gobelins") + ".png"); portrait.style.cssText = "width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45));"; portrait.onerror = () => portrait.style.display = "none"; titleWrap.appendChild(portrait)
  const tEl = document.createElement("div"); tEl.style.cssText = "font-family:Cinzel,serif;font-size:12px;color:#ffb6a0;font-weight:bold;letter-spacing:1px;"; tEl.innerText = (mobData.name||"MOB").toUpperCase()+"  Niv."+(mobData.lvl||1); titleWrap.appendChild(tEl); header.appendChild(titleWrap)

  if (isGM) {
    const cBtn = document.createElement("button"); cBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(40,40,80,0.5);color:#8888ff;border:1px solid rgba(80,80,180,0.4);border-radius:3px;cursor:pointer;"; cBtn.innerText = "—"
    cBtn.onclick=()=>{ const p=panel.closest("#mobAttackPanel"); if(p) p.style.display="none"; const tg=document.getElementById("mobAttackToggle"); if(tg) tg.style.display="block" }; header.appendChild(cBtn)
    const xBtn = document.createElement("button"); xBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(120,0,0,0.5);color:#ff8888;border:1px solid rgba(180,0,0,0.4);border-radius:3px;cursor:pointer;"; xBtn.innerText = "✕"; xBtn.onclick=()=>removeMobSlot(slot); header.appendChild(xBtn)
  }
  panel.appendChild(header)

  const pct = Math.max(0,Math.min(100,((mobData.hp||0)/(mobData.maxHP||1))*100))
  const hpWrap = document.createElement("div"); hpWrap.style.cssText = "width:100%;height:6px;background:rgba(80,0,0,0.5);border-radius:3px;margin-bottom:8px;"
  const hpFill = document.createElement("div"); hpFill.id = "subPanelHPFill_"+slot; hpFill.style.cssText = `width:${pct}%;height:100%;background:${pct>50?"#44ff44":pct>25?"#ffaa00":"#ff3333"};border-radius:3px;transition:width 0.3s;`; hpWrap.appendChild(hpFill); panel.appendChild(hpWrap)

  const tier = mobData.tier||"weak", atks = typeof getMobAttacksForMob === "function" ? getMobAttacksForMob(mobData.name, tier) : (mobAttacks[tier]||mobAttacks.weak), mobLvl = mobData.lvl||1
  const getRange = (attack, lvl, mobTier) => {
    if (typeof getMobDamageRange === "function") return getMobDamageRange(attack, lvl, mobTier)
    const factor = 1 + Math.max(0, (lvl || 1) - 1) * 0.15
    return {
      min: Math.round((attack?.dmgMin || 0) * factor),
      max: Math.round((attack?.dmgMax || 0) * factor)
    }
  }
  const specialAtk = typeof getMobSpecialAttack === "function" ? getMobSpecialAttack(mobData.name, tier) : null
  const specialUsed = !!mobData.specialUsed

  if (isGM) {
    // Bouton aléatoire intelligent
    const rBtn = document.createElement("button"); rBtn.style.cssText = "width:100%;padding:5px;margin-bottom:5px;font-family:Cinzel,serif;font-size:10px;background:rgba(80,30,120,0.5);color:#cc88ff;border:1px solid rgba(120,50,200,0.5);border-radius:4px;cursor:pointer;"
    rBtn.innerText = "Aléatoire (ciblage auto)"
    rBtn.onclick = () => {
      requestEnemyCombatAction(null,mobData,panel,panel._manualTarget,slot)
    }
    panel.appendChild(rBtn)

    atks.forEach(atk => {
      const isCD = atks.length > 1 && mobData.lastAttack===atk.name
      const btn = document.createElement("div")
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      btn.style.cssText = `padding:6px 8px;margin-bottom:4px;background:rgba(120,10,10,${isCD?"0.2":"0.4"});border:1px solid rgba(180,40,40,${isCD?"0.2":"0.4"});border-radius:4px;cursor:${isCD?"not-allowed":"pointer"};opacity:${isCD?"0.5":"1"};`
      const row = document.createElement("div")
      row.style.cssText = "display:flex;align-items:center;gap:6px;"
      row.appendChild(createCombatIcon(atk, mobData, "combatIcon combatIcon--small"))
      const name = document.createElement("span")
      name.style.cssText = `font-family:Cinzel,serif;font-size:10px;color:${isCD?"#666":"#ffcccc"};font-weight:bold;`
      name.innerText = atk.name + (isCD?" Recharge":"")
      const dmg = document.createElement("span")
      dmg.style.cssText = "font-size:9px;color:#ff8888;margin-left:auto;"
      dmg.innerText = min + "-" + max
      row.appendChild(name)
      row.appendChild(dmg)
      btn.appendChild(row)
      if (!isCD) {
        btn.onmouseenter=()=>btn.style.background="rgba(180,20,20,0.6)"
        btn.onmouseleave=()=>btn.style.background="rgba(120,10,10,0.4)"
        btn.onclick=()=>{
          const target = panel._manualTarget || null
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlotV2(atk, mobData, panel, target, slot)
        }
      }
      panel.appendChild(btn)
    })

    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sBtn = document.createElement("div")
      sBtn.style.cssText = `padding:8px 10px;margin:8px 0 4px;background:${specialUsed?"rgba(60,30,30,0.35)":"linear-gradient(135deg,rgba(120,20,20,0.88),rgba(40,0,0,0.96))"};border:1px solid ${specialUsed?"rgba(140,80,80,0.3)":"rgba(255,180,110,0.55)"};border-radius:6px;cursor:${specialUsed?"not-allowed":"pointer"};opacity:${specialUsed?"0.55":"1"};box-shadow:${specialUsed?"none":"0 0 24px rgba(255,120,60,0.18)"};`
      const sTop = document.createElement("div")
      sTop.style.cssText = "display:flex;align-items:center;gap:8px;"
      sTop.appendChild(createCombatIcon(specialAtk, mobData, "combatIcon"))
      const sName = document.createElement("span")
      sName.style.cssText = `font-family:Cinzel,serif;font-size:10px;color:${specialUsed?"#aa8888":"#ffd6a0"};font-weight:bold;letter-spacing:0.5px;`
      sName.innerText = specialAtk.name + (specialUsed ? " — UNIQUE DÉJÀ UTILISÉE" : "")
      const sDmg = document.createElement("span")
      sDmg.style.cssText = `font-size:9px;color:${specialUsed?"#9a6a6a":"#ffb37a"};margin-left:auto;`
      sDmg.innerText = sMin + "-" + sMax
      sTop.appendChild(sName)
      sTop.appendChild(sDmg)
      sBtn.appendChild(sTop)
      const sFlavor = document.createElement("div")
      sFlavor.style.cssText = `font-size:9px;color:${specialUsed?"#8a6a6a":"#ffb988"};margin-top:4px;line-height:1.35;`
      sFlavor.innerText = specialAtk.flavor || "Attaque signature à usage unique."
      sBtn.appendChild(sFlavor)
      if (!specialUsed) {
        sBtn.onmouseenter=()=>sBtn.style.filter="brightness(1.08)"
        sBtn.onmouseleave=()=>sBtn.style.filter=""
        sBtn.onclick=()=>{
          const target = specialAtk.effect === "all" ? "all" : (panel._manualTarget || null)
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlotV2(specialAtk, mobData, panel, target, slot)
        }
      }
      panel.appendChild(sBtn)
    }

    const autoTarget=document.createElement("button"); autoTarget.innerText="Ciblage automatique"; autoTarget.onclick=()=>{panel._manualTarget=null;panel._currentTarget=null}; panel.appendChild(autoTarget)
    // Sélection manuelle de cible (override)
    const targetRow = document.createElement("div"); targetRow.style.cssText = "display:flex;gap:3px;margin-top:6px;flex-wrap:wrap;border-top:1px solid rgba(180,40,40,0.2);padding-top:6px;"
    const label = document.createElement("div"); label.style.cssText = "width:100%;font-family:Cinzel,serif;font-size:9px;color:#5a3a3a;margin-bottom:3px;"; label.innerText = "Forcer la cible :"
    targetRow.appendChild(label)
    ;["greg","ju","elo","bibi"].forEach(pid => {
      const btn = document.createElement("button"); btn.dataset.target=pid; btn.style.cssText = "padding:2px 6px;font-family:Cinzel,serif;font-size:9px;border-radius:2px;cursor:pointer;border:1px solid rgba(180,40,40,0.4);background:rgba(60,10,10,0.6);color:#ffaaaa;"; btn.innerText = pid.toUpperCase()
      btn.onclick=()=>{ targetRow.querySelectorAll("button[data-target]").forEach(b=>{ b.style.background=b.dataset.target===pid?"rgba(180,40,40,0.6)":"rgba(60,10,10,0.6)" }); panel._currentTarget=pid; panel._manualTarget=pid }
      targetRow.appendChild(btn)
    })
    panel.appendChild(targetRow)
    panel.appendChild(buildMobPassTurnBlock(String(slot || "mob"), String(mobData.name || "MOB").toUpperCase()))
  } else {
    // Vue lecture seule pour les joueurs
    atks.forEach(atk => {
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      const row = document.createElement("div"); row.style.cssText = "padding:5px 8px;margin-bottom:3px;background:rgba(60,5,5,0.5);border:1px solid rgba(120,20,20,0.3);border-radius:3px;opacity:0.85;"
      const line = document.createElement("div")
      line.style.cssText = "display:flex;align-items:center;gap:6px;"
      line.appendChild(createCombatIcon(atk, mobData, "combatIcon combatIcon--small"))
      const name = document.createElement("span")
      name.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#ffaaaa;"
      name.innerText = atk.name
      const dmg = document.createElement("span")
      dmg.style.cssText = "font-size:9px;color:#884444;margin-left:auto;"
      dmg.innerText = min + "-" + max
      line.appendChild(name)
      line.appendChild(dmg)
      row.appendChild(line)
      const desc = document.createElement("div")
      desc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#d3b8a0;"
      desc.innerText = atk.flavor || atk.effect || "Attaque ennemie."
      row.appendChild(desc)
      panel.appendChild(row)
    })
    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sRow = document.createElement("div")
      sRow.style.cssText = `padding:6px 8px;margin-top:6px;background:${specialUsed?"rgba(55,35,35,0.45)":"rgba(96,28,12,0.5)"};border:1px solid ${specialUsed?"rgba(140,80,80,0.28)":"rgba(255,180,110,0.32)"};border-radius:4px;opacity:0.92;`
      const sLine = document.createElement("div")
      sLine.style.cssText = "display:flex;align-items:center;gap:6px;"
      sLine.appendChild(createCombatIcon(specialAtk, mobData, "combatIcon combatIcon--small"))
      const sName = document.createElement("span")
      sName.style.cssText = `font-family:Cinzel,serif;font-size:10px;color:${specialUsed?"#b48b8b":"#ffd3a0"};`
      sName.innerText = specialAtk.name
      const sState = document.createElement("span")
      sState.style.cssText = `font-size:9px;color:${specialUsed?"#8e6767":"#c9855f"};margin-left:auto;`
      sState.innerText = specialUsed ? "UNIQUE" : (sMin + "-" + sMax)
      sLine.appendChild(sName)
      sLine.appendChild(sState)
      sRow.appendChild(sLine)
      const sDesc = document.createElement("div")
      sDesc.style.cssText = `margin-top:4px;font-size:9px;line-height:1.35;color:${specialUsed?"#b79f96":"#e2c6a2"};`
      sDesc.innerText = specialAtk.flavor || specialAtk.effect || "Attaque signature à usage unique."
      sRow.appendChild(sDesc)
      panel.appendChild(sRow)
    }
    const passRow = document.createElement("div")
    passRow.style.cssText = "padding:6px 8px;margin-top:8px;background:rgba(24,16,16,0.28);border:1px solid rgba(190,140,90,0.16);border-radius:6px;opacity:0.82;"
    const passTitle = document.createElement("div")
    passTitle.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#d8c0a0;"
    passTitle.innerText = "Passer le tour"
    const passDesc = document.createElement("div")
    passDesc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#bba28d;"
    passDesc.innerText = String(mobData.name || "MOB").toUpperCase() + " peut aussi choisir de ne pas agir."
    passRow.appendChild(passTitle)
    passRow.appendChild(passDesc)
    panel.appendChild(passRow)
  }

  return panel
}

function tickMobPlayerPoison() {}

function tickMobPlayerBleed() {}

function tickTimedCombatMobState() {}

function applyMobDamageToPlayer(pid, dmg, attack, mobData, slot) {
  db.ref("characters/" + pid + "/hp").transaction(cur => Math.max(0, safeInt(cur) - dmg))
  if (attack.effect === "curse") {
    db.ref("characters/" + pid + "/curse").transaction(cur => Math.min(8, safeInt(cur) + 1))
  }
  if (attack.special && attack.healSelfRatio && slot) {
    const heal = Math.max(1, Math.round(dmg * attack.healSelfRatio))
    db.ref("combat/" + slot).once("value", mobSnap => {
      const mob = mobSnap.val()
      if (!mob) return
      db.ref("combat/" + slot + "/hp").set(Math.min(mob.maxHP || mob.hp || 0, (mob.hp || 0) + heal))
    })
  }
}

function launchMobAttackFromSlot(attack, mobData, panel, forcedTarget, slot) { return requestEnemyCombatAction(attack,mobData,panel,forcedTarget,slot) }

function animateMobDice(cb) {
  window.__mobAttackResolving = true
  const resolve = cb
  cb = () => { try { resolve() } finally { window.__mobAttackResolving = false } }
  const d20=document.getElementById("mobD20"); if(!d20){ cb(); return }
  let spins=0; const iv=setInterval(()=>{ d20.style.transform=`rotate(${Math.random()*360}deg) scale(1.3)`; if(++spins>8){ clearInterval(iv); d20.style.transform=""; cb() } },120)
}

function launchMobAttackFromSlotV2(attack, mobData, panel, forcedTarget, slot) { return requestEnemyCombatAction(attack,mobData,panel,forcedTarget,slot) }

function addMobToFight(mobId, forceTier) { return addReliableCombatMob(mobId, forceTier) }

function removeMobSlot(slot) { return removeReliableCombatMob(slot) }

function spawnExtraMobToken(mobData, slot) {
  const container=document.getElementById("combatTokens"); if(!container){ if(!mobData._retryCount) mobData._retryCount=0; if(++mobData._retryCount<10) setTimeout(()=>spawnExtraMobToken(mobData,slot),300); return }
  const existing=document.getElementById("mobToken_"+slot)
  if(existing){ if(existing._slotRef&&existing._slotRefCb) existing._slotRef.off("value",existing._slotRefCb); existing.remove() }
  const tok=document.createElement("div"); tok.id="mobToken_"+slot; tok.className="token"
  const idx=slot==="mob2"?1:2, startX=Math.round((window.innerWidth-4*110)/2)
  tok.style.cssText=`position:absolute;width:70px;height:70px;left:${startX+(idx+4)*90}px;top:${Math.round(window.innerHeight*0.25)}px;z-index:200;display:flex;flex-direction:column;align-items:center;cursor:pointer;`
  const img=document.createElement("img"); img.style.cssText="width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid #cc2200;box-shadow:0 0 10px rgba(200,0,0,0.5);"; img.src="images/"+mobData.name+".png"; img.onerror=()=>img.style.display="none"; tok.appendChild(img)
  const label=document.createElement("div"); label.style.cssText="font-family:Cinzel,serif;font-size:9px;color:#ff8888;margin-top:2px;text-align:center;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:2px;"; label.innerText=(mobData.name||"MOB").toUpperCase()+" "+mobData.hp+"/"+mobData.maxHP; tok.appendChild(label)
  const slotRef=db.ref("combat/"+slot); const slotCb=s=>{ const d=s.val(); if(d&&label) label.innerText=(d.name||"MOB").toUpperCase()+" "+d.hp+"/"+d.maxHP }; slotRef.on("value",slotCb); tok._slotRef=slotRef; tok._slotRefCb=slotCb
  tok.addEventListener("mousedown",e=>{ if(!isGM) return; selected=tok; lastX=tok.offsetLeft; _state.tokenDragStart={x:e.clientX,y:e.clientY}; _state.tokenDragging=false; tok._fbSlot=slot; e.preventDefault() })
  container.appendChild(tok)
}

/* ========================= */
/* PNJ                       */
/* ========================= */

function setPNJSlot(slot) {
  currentPNJSlot=slot
  ;["slot1Btn","slot2Btn","slot3Btn"].forEach((id,i)=>{ const btn=document.getElementById(id); if(!btn) return; const a=(i+1)===slot; btn.style.background=a?"rgba(200,160,50,0.3)":"rgba(80,80,80,0.2)"; btn.style.color=a?"#c8a050":"#aaa"; btn.style.borderColor=a?"gold":"#555" })
}

function getPNJSlotRef(slot) {
  return slot === 2 ? "game/storyImage2" : slot === 3 ? "game/storyImage3" : "game/storyImage"
}

function resolvePNJTargetSlot(slots, preferredSlot, forceSlot) {
  if (forceSlot) return preferredSlot || 1
  let targetSlot = preferredSlot || 1
  if (!slots[targetSlot]) return targetSlot
  const freeSlot = [1, 2, 3].find(slot => !slots[slot])
  return freeSlot || targetSlot
}

function openPNJ(image, options) {
  const opts = options || {}
  const preferredSlot = opts.slot || currentPNJSlot || 1
  const forceSlot = !!opts.forceSlot
  const displayName = opts.name || getPNJDisplayName(image)
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })

  Promise.all([
    db.ref("game/storyImage").once("value"),
    db.ref("game/storyImage2").once("value"),
    db.ref("game/storyImage3").once("value")
  ]).then(([s1, s2, s3]) => {
    const slots = {
      1: s1.val(),
      2: s2.val(),
      3: s3.val()
    }

    const targetSlot = resolvePNJTargetSlot(slots, preferredSlot, forceSlot)
    const targetRef = getPNJSlotRef(targetSlot)

    storyType = "pnj"
    if (slots[targetSlot] === image) {
      if (targetSlot === 1) showStoryImage(image)
      else {
        db.ref(targetRef).remove().then(() => db.ref(targetRef).set(image)).catch(() => {})
      }
    } else {
      db.ref(targetRef).set(image)
    }
    if (!pnjSlotOrder.includes(targetSlot)) pnjSlotOrder.push(targetSlot)

    if (displayName) {
      db.ref("game/highPNJName").set({ name: displayName, time: Date.now() })
    }
  })
}

function setPNJImage(img) {
  openPNJ(img, { slot: currentPNJSlot || 1 })
}

function updatePNJPositions() {
  const b1=document.getElementById("storyImage"), b2=document.getElementById("storyImage2"), b3=document.getElementById("storyImage3")
  const v1=b1&&b1.style.display==="flex", v2=b2&&b2.style.display==="flex", v3=b3&&b3.style.display==="flex"
  const count=[v1,v2,v3].filter(Boolean).length, nt=el=>{el.style.transition="opacity 0.5s ease"}
  if(count===1){ if(v1){nt(b1);b1.style.left="50%";b1.style.right="auto";b1.style.transform="translateX(-50%)"} if(v2){nt(b2);b2.style.left="50%";b2.style.right="auto";b2.style.transform="translateX(-50%)"} if(v3){nt(b3);b3.style.left="50%";b3.style.right="auto";b3.style.transform="translateX(-50%)"} }
  else if(count===2){ const boxes=[[v1,b1],[v2,b2],[v3,b3]].filter(([v])=>v).map(([,b])=>b); nt(boxes[0]);boxes[0].style.left="0";boxes[0].style.right="auto";boxes[0].style.transform=""; nt(boxes[1]);boxes[1].style.right="0";boxes[1].style.left="auto";boxes[1].style.transform="" }
  else if(count===3){ nt(b2);b2.style.left="0";b2.style.right="auto";b2.style.transform=""; nt(b1);b1.style.left="50%";b1.style.right="auto";b1.style.transform="translateX(-50%)"; nt(b3);b3.style.right="0";b3.style.left="auto";b3.style.transform="" }
}

function hideHighPNJScrollImmediate() {
  const scroll=document.getElementById("highPNJScroll")
  if (scroll) {
    scroll.style.opacity="0"
    setTimeout(()=>{ if(scroll.parentNode) scroll.remove() },180)
  }
}

function closePNJBySlot(slot) {
  const r={1:"game/storyImage",2:"game/storyImage2",3:"game/storyImage3"}
  db.ref(r[slot]).remove()
  pnjSlotOrder=pnjSlotOrder.filter(s=>s!==slot)
}
function closeLastPNJ() { if(!pnjSlotOrder.length) return false; closePNJBySlot(pnjSlotOrder[pnjSlotOrder.length-1]); return true }

const PNJ_NAMES = {
  "tavernier.png":         "Bjorn le Tavernier",
  "serveuse.png":          "Astrid",
  "marchand.png":          "Egil le Marchand",
  "voyantepnj.png":        "Sigrún la Voyante",
  "soulard.png":           "Gunnar l'Ivrogne",
  "garde.png":             "Halvard",
  "forgeron.png":          "Ulfrik le Forgeron",
  "child baldur.png":      "Leif",
  "forgeron1.png":         "Thormund",
  "garde baldur.png":      "Sigmar",
  "marchand2.png":         "Ragnhild la Marchande",
  "gardedunord.png":       "Ivar du Nord",
  "garde2.png":            "Ketill",
  "conseillerroinord.png": "Conseiller Hákon",
  "pretre.png":            "Frère Osvald",
  "pnj1.png":              "Un passant",
  "pnj2.png":              "Une villageoise",
  "femmepnj.png":          "Solveig",
  "femmepnj1.png":         "Ingrid",
  "femmepnj2.png":         "Brynja",
  "femmepnj3.png":         "Runa",
  "oldmessager.png":       "Orm le Vieux Messager",
  "capitaine.png":         "Capitaine Tobias",
  "serveusebrume.png":     "Lana",
  "aubergistebrume.png":   "Aubergiste Etchebest",
  "soulard1.png":          "Ren le bon",
  "pirat.png":             "Capitaine Quince",
  "mysterefemme.png":      "Femme mysterieuse",
  "mysterefemme1.png":     "Glinda",
  "heimdall.png":          "Heimdall",
  "witch.png":             "Witch",
  "ELO PION.png":          "ELO PION",
  "ju pion.png":           "JU PION",
  "greg pion.png":         "GREG PION",
}

function getPNJDisplayName(image) {
  if (PNJ_NAMES[image]) return PNJ_NAMES[image]
  const base = String(image || "").replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "")
  if (!base) return ""
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function resolvePNJImageSrc(image) {
  const src = String(image || "")
  if (!src) return ""
  if (typeof resolveImagePath === "function") return resolveImagePath(src)
  if (/^(https?:|data:|blob:|\/|images\/)/i.test(src)) return src
  return "images/" + src
}

function showStoryImage(image) {
  const box=document.getElementById("storyImage"), img=document.getElementById("storyImageContent")
  if(!image){ box.style.display="none"; return }
  img.src=resolvePNJImageSrc(image); box.style.opacity="0"; box.style.left="50%"; box.style.transform="translateX(-50%)"; box.style.right="auto"; box.style.display="flex"
  if(!pnjSlotOrder.includes(1)) pnjSlotOrder.push(1); setTimeout(updatePNJPositions,50); setTimeout(()=>box.style.opacity="1",60)

  // Afficher le nom si défini — délai pour laisser passer le set(null) initial
  const pnjName = getPNJDisplayName(image)
  if (pnjName) {
    document.querySelectorAll("[id^='pnjNameTag']").forEach(el => el.remove())
    const tag = document.createElement("div")
    tag.id = "pnjNameTag_" + image.replace(/[^a-z0-9]/g, "")
    tag.innerText = pnjName
    tag.style.cssText = "position:fixed;bottom:12%;left:50%;transform:translateX(-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:20px;color:#f0e8c8;letter-spacing:3px;text-shadow:0 0 8px rgba(30,160,180,0.6),1px 1px 4px black;pointer-events:none;z-index:2147483647;opacity:0;transition:opacity 0.6s ease;background:rgba(8,20,24,0.9);border:1px solid rgba(30,90,102,0.5);border-radius:3px;padding:6px 20px;white-space:nowrap;"
    document.body.appendChild(tag)
    setTimeout(() => { tag.style.opacity = "1" }, 100)
  }

  const soundKey = String(image || "").replace(/^.*[\\/]/, "")
  const pnjSounds = { "generalmelenchon.png": "generalmelenchon.mp3", "intendantbrume.png": "macron.mp3" }
  if (pnjSounds[soundKey]) {
    const sid = "pnjSound_" + soundKey.replace(/[^a-z]/gi, "")
    let snd = document.getElementById(sid)
    if (!snd) {
      snd = document.createElement("audio")
      snd.id = sid
      snd.src = "audio/" + pnjSounds[soundKey]
      snd.volume = 1.0
      document.body.appendChild(snd)
    }
    snd.currentTime = 0
    snd.play().catch(() => {})
    setTimeout(() => {
      let iv = setInterval(() => {
        if (snd.volume > 0.05) snd.volume -= 0.05
        else { snd.pause(); snd.volume = 1.0; clearInterval(iv) }
      }, 100)
    }, 2000)
  }
}

function hideStoryImage() {
  const box=document.getElementById("storyImage"); if(!box) return
  box.style.opacity="0"
  // Retirer le tag nom seulement si aucun autre PNJ n'est affiché
  setTimeout(() => {
    const b2 = document.getElementById("storyImage2")
    const b3 = document.getElementById("storyImage3")
    if ((!b2 || b2.style.display === "none") && (!b3 || b3.style.display === "none")) {
      document.querySelectorAll("[id^='pnjNameTag']").forEach(tag=>{ tag.style.opacity="0"; setTimeout(()=>{ if(tag.parentNode) tag.remove() },600) })
    }
  }, 300)
  setTimeout(()=>{ box.style.display="none"; updatePNJPositions() },500); pnjSlotOrder=pnjSlotOrder.filter(s=>s!==1)
}

function showHighPNJ(image, name) {
  openPNJ(image, { slot: 1, forceSlot: true, name, scrollName: true })
}
function showHighPNJScroll(name) {
  const old=document.getElementById("highPNJScroll"); if(old) old.remove()
  const scroll=document.createElement("div"); scroll.id="highPNJScroll"; scroll.style.cssText="position:fixed;bottom:8%;left:50%;transform:translateX(-50%);pointer-events:none;z-index:99999999;"
  const el=document.createElement("div"); el.innerText=name; el.style.cssText="font-family:'Cinzel Decorative','Cinzel',serif;font-size:32px;letter-spacing:4px;font-weight:900;color:#f5e6c8;text-shadow:0 0 10px rgba(0,0,0,0.9),2px 2px 4px black;text-align:center;opacity:0;transition:opacity 0.5s ease;"; scroll.appendChild(el); document.body.appendChild(scroll)
  setTimeout(()=>el.style.opacity="1",20); setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>{ scroll.remove(); db.ref("game/highPNJName").remove() },500) },5000)
}

/* ========================= */
/* SHOP                      */
/* ========================= */

function openShop(type){if(!isGM)return;try{requireExplorationConnection();getPartyLevel(p=>db.ref("game/shop").set({open:true,type:type||"marche",partyLvl:p,time:Date.now()}).catch(error=>showNotification(error.message)))}catch(error){showNotification(error.message)}}
function closeShop(){if(isGM)db.ref("game/shop").remove().catch(error=>showNotification(error.message))}

function renderShop(partyLvl, shopType) {
  shopType=shopType||"marche"
  if (!window.__shopRenderSoundLock) window.__shopRenderSoundLock = 0
  const now = Date.now()
  if (now - window.__shopRenderSoundLock > 500) {
    window.__shopRenderSoundLock = now
    const shopSfx = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("shop.mp3") : "audio/shop.mp3")
    setManagedAudioBaseVolume(shopSfx, 0.82, "effects")
    shopSfx.play().catch(() => {})
  }
  const activeItems=shopType==="armurerie"?shopItemsArmurerie:shopItems, shopTitle=shopType==="armurerie"?"⚔ Armurerie":"🛒 Marché"
  _buildShop(partyLvl,null,activeItems,shopTitle)
}

function _buildShop(partyLvl, runeCard, activeItems, shopTitle) {
  const overlay=document.createElement("div"); overlay.id="shopOverlay"; overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.5s ease;"
  const box=document.createElement("div"); box.style.cssText="background:url('images/shelf.png') center/100% 100% no-repeat;width:min(900px,92vw);max-height:85vh;overflow-y:auto;padding:50px 50px 40px 50px;min-height:400px;position:relative;font-family:'IM Fell English',serif;"
  const t=document.createElement("div"); t.style.cssText="text-align:center;font-family:'Cinzel Decorative','Cinzel',serif;font-size:28px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.8);margin-bottom:6px;letter-spacing:3px;"; t.innerText=shopTitle; box.appendChild(t)
  if(runeCard){ const rc=document.createElement("div"); rc.style.cssText="position:relative;background:rgba(200,160,80,0.15);border:2px solid rgba(200,160,80,0.6);border-radius:6px;padding:16px;text-align:center;margin-bottom:16px;"; rc.innerHTML=`<div style="font-family:'Cinzel',serif;font-size:12px;color:#ffd700;margin-bottom:8px;">✦ OBJET MYSTÉRIEUX ✦</div><div style="font-size:28px;color:#ffd700;text-shadow:0 0 10px gold;">${runeCard.rune}</div><div style="font-family:'Cinzel',serif;font-size:14px;color:#ffc840;font-weight:bold;margin-top:8px;">💰 50 po</div>`; if(isGM){ const x=document.createElement("div"); x.style.cssText="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#8b2000;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;z-index:10;"; x.innerText="✕"; x.onclick=()=>rc.remove(); rc.appendChild(x) }; box.appendChild(rc) }
  const sub=document.createElement("div"); sub.style.cssText="text-align:center;font-family:'Cinzel',serif;font-size:13px;color:#f5ead8;text-shadow:0 1px 3px rgba(0,0,0,0.7);margin-bottom:24px;font-weight:bold;"; sub.innerText="Niveau du groupe : "+partyLvl; box.appendChild(sub)
  const cats={}, catOrder=[]; activeItems.forEach(item=>{ if(!cats[item.category]){ cats[item.category]=[]; catOrder.push(item.category) }; cats[item.category].push(item) })
  let currentCat=0
  const navBar=document.createElement("div"); navBar.style.cssText="display:flex;justify-content:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;"
  catOrder.forEach((cat,idx)=>{ const btn=document.createElement("button"); btn.style.cssText="font-family:'Cinzel',serif;font-size:11px;padding:5px 12px;background:"+(idx===0?"rgba(0,0,0,0.45)":"rgba(0,0,0,0.25)")+";color:#fff;border:1px solid rgba(255,255,255,"+(idx===0?"0.5":"0.2")+");border-radius:3px;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,0.8);"; btn.innerText=categoryLabels[cat]; btn.onclick=()=>{ currentCat=idx; navBar.querySelectorAll("button").forEach((b,i)=>{ b.style.background=i===idx?"rgba(0,0,0,0.45)":"rgba(0,0,0,0.25)"; b.style.borderColor=i===idx?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.2)" }); showCat(idx) }; navBar.appendChild(btn) })
  box.appendChild(navBar)
  const zone=document.createElement("div"); zone.id="shopItemsZone"; box.appendChild(zone)
  const catTitleEl=document.createElement("div"); catTitleEl.id="shopCatTitle"; catTitleEl.style.cssText="font-family:'Cinzel',serif;font-size:14px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);letter-spacing:2px;font-weight:bold;"
  function showCat(idx) { const cat=catOrder[idx],items=cats[cat]; if(catTitleEl) catTitleEl.innerText=categoryLabels[cat]; zone.innerHTML=""; const grid=document.createElement("div"); grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;"; items.forEach(item=>{ const prix=getShopPrice(item,partyLvl),stats=getShopStats(item,partyLvl); const card=document.createElement("div"); card.style.cssText="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:6px;"; const iHtml=item.img?`<img src="images/${item.img}" style="width:40px;height:40px;object-fit:contain;">`:""; card.innerHTML=`<div style="display:flex;align-items:center;gap:10px;">${iHtml}<span style="font-family:'Cinzel',serif;font-size:14px;color:#fff;font-weight:bold;text-shadow:0 1px 2px rgba(0,0,0,0.8);">${item.name}</span></div><div style="font-size:12px;color:#e8d8c0;font-style:italic;">${stats}</div><div style="font-family:'Cinzel',serif;font-size:14px;color:#ffc840;font-weight:bold;">💰 ${prix} po</div>`; grid.appendChild(card) }); zone.appendChild(grid) }
  const navRow=document.createElement("div"); navRow.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-top:16px;"
  const prev=document.createElement("button"); prev.innerHTML="◀ Précédent"; prev.style.cssText="font-family:'Cinzel',serif;font-size:12px;padding:8px 16px;background:rgba(0,0,0,0.35);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:3px;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,0.8);"; prev.onclick=()=>{ if(currentCat>0){ currentCat--; navBar.querySelectorAll("button")[currentCat].click() } }
  const next=document.createElement("button"); next.innerHTML="Suivant ▶"; next.style.cssText="font-family:'Cinzel',serif;font-size:12px;padding:8px 16px;background:rgba(0,0,0,0.35);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:3px;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,0.8);"; next.onclick=()=>{ if(currentCat<catOrder.length-1){ currentCat++; navBar.querySelectorAll("button")[currentCat].click() } }
  navRow.appendChild(prev); navRow.appendChild(catTitleEl); navRow.appendChild(next); box.appendChild(navRow)
  if(isGM){ const cb=document.createElement("button"); cb.style.cssText="display:block;margin:20px auto 0;padding:10px 40px;font-family:'Cinzel',serif;font-size:14px;background:linear-gradient(#5a0000,#2a0000);color:#ffaaaa;border:1px solid #aa0000;border-radius:4px;cursor:pointer;"; cb.innerText="✕ Fermer la boutique"; cb.onclick=closeShop; box.appendChild(cb) }
  overlay.appendChild(box); document.body.appendChild(overlay); showCat(0); catTitleEl.innerText=categoryLabels[catOrder[0]]; setTimeout(()=>overlay.style.opacity="1",20)
}

/* ========================= */
/* RUNE CHALLENGE            */
/* ========================= */

function encodeToRunes(text, rev) { const r=rev||[]; return text.split("").map(c=>{ if(r.includes(c.toUpperCase())) return c; return runeAlphabet[c]||(c===" "?" ":c===","?"᛫":c==="."?"᛬":c==="'"?"'":c) }).join("") }
function openRuneChallenge() {
  if(!isGM) return
  _state.runeJustOpened=false
  const existing = window.activeRuneChallengeData
  if (existing && existing.active) {
    renderRuneChallenge(existing)
    document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
    return
  }
  db.ref("game/runeChallenge").set({ active:true, unlockedHints:[], revealedLetters:[], time:Date.now() })
  document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
}
function decodeRuneProgress(text, rev) {
  const revealed = rev || []
  return String(text || "").split("").map(c => {
    const up = c.toUpperCase()
    if (/[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸÆŒ]/i.test(c)) return revealed.includes(up) ? c : "·"
    if (c === " " || c === "," || c === "." || c === "'") return c
    return c
  }).join("")
}
function closeRuneChallenge() {
  const ov=document.getElementById("runeChallengeOverlay")
  if(ov) ov.remove()
  _state.runeJustOpened = false
}
function endRuneChallenge() {
  db.ref("game/runeChallenge").remove()
  closeRuneChallenge()
  const btn=document.getElementById("playerCodeBtn")
  if(btn) btn.remove()
}
function toggleRuneOverlay(data) { const ov=document.getElementById("runeChallengeOverlay"); if(ov) ov.remove(); else renderRuneChallenge(data) }
function updateRuneMenuBtn(active) { const l=document.getElementById("runeLaunchBtn"),c=document.getElementById("runeContinueBtn"); if(!l) return; if(active){ l.style.display="none"; if(c) c.style.display="block" } else { l.style.display="block"; if(c) c.style.display="none"; _state.runeJustOpened=false } }

function renderRuneChallenge(data) {
  const uh=data.unlockedHints||[], rev=data.revealedLetters||[], enc=encodeToRunes(secretMessage,rev), dec=decodeRuneProgress(secretMessage,rev)
  const ov=document.createElement("div"); ov.id="runeChallengeOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,5,2,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.6s ease;overflow-y:auto;padding:20px 0;"
  const t=document.createElement("div"); t.style.cssText="font-family:'Cinzel Decorative','Cinzel',serif;font-size:26px;color:#c8a050;letter-spacing:6px;margin-bottom:6px;text-shadow:0 0 20px gold;"; t.innerText="ᚱᚢᚾᛖᛊ ᛞᛖ ᛚ'ᚨᚾᚲᛁᛖᚾ"; ov.appendChild(t)
  const st=document.createElement("div"); st.style.cssText="font-family:'IM Fell English',serif;font-size:14px;color:#8a6830;margin-bottom:24px;letter-spacing:2px;"; st.innerText="Déchiffrez le message des anciens..."; ov.appendChild(st)
  const mb=document.createElement("div"); mb.style.cssText="background:url('images/roc.png') center/100% 100% no-repeat;padding:50px 70px;max-width:700px;width:90vw;text-align:center;margin-bottom:24px;border-radius:4px;"
  const rt=document.createElement("div"); rt.style.cssText="font-size:32px;color:#ffe8a0;line-height:2.2;letter-spacing:6px;font-family:serif;word-break:break-word;font-weight:bold;"; rt.innerText=enc; mb.appendChild(rt); ov.appendChild(mb)
  const dbx=document.createElement("div"); dbx.style.cssText="max-width:720px;width:90vw;text-align:center;margin:-6px 0 20px;"
  const dtitle=document.createElement("div"); dtitle.style.cssText="font-family:Cinzel,serif;font-size:11px;color:#8a6830;letter-spacing:3px;margin-bottom:8px;"; dtitle.innerText="— TRADUCTION EN COURS —"
  const dline=document.createElement("div"); dline.style.cssText="font-family:'Cinzel',serif;font-size:24px;color:#f5e6c8;line-height:1.8;letter-spacing:4px;word-break:break-word;text-shadow:0 0 10px rgba(0,0,0,0.8);"
  dline.innerText=dec
  dbx.appendChild(dtitle)
  dbx.appendChild(dline)
  ov.appendChild(dbx)
  if(uh.length){ const hb=document.createElement("div"); hb.style.cssText="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:700px;margin-bottom:16px;"; uh.forEach(hid=>{ const h=runeHints.find(x=>x.id===hid); if(!h) return; const card=document.createElement("div"); card.style.cssText="background:rgba(200,160,80,0.12);border:1px solid rgba(200,160,80,0.4);border-radius:6px;padding:8px 16px;font-family:serif;font-size:16px;color:#c8a050;letter-spacing:2px;"; card.innerHTML=`<div style="font-size:10px;color:#8a6830;font-family:Cinzel;margin-bottom:4px;">${h.desc}</div>${h.runes}`; hb.appendChild(card) }); ov.appendChild(hb) }
  if(rev.length){ const rb=document.createElement("div"); rb.style.cssText="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:700px;margin-bottom:16px;"; const revT=document.createElement("div"); revT.style.cssText="width:100%;text-align:center;font-family:Cinzel;font-size:11px;color:#8a6830;letter-spacing:2px;margin-bottom:4px;"; revT.innerText="— LETTRES RÉVÉLÉES —"; rb.appendChild(revT); rev.forEach(l=>{ const r=runeAlphabet[l]||"?"; const p=document.createElement("div"); p.style.cssText="background:rgba(200,160,80,0.2);border:1px solid gold;border-radius:20px;padding:4px 12px;font-size:18px;color:#f5e6c8;"; p.innerHTML=`<span style="font-family:serif;">${r}</span> <span style="font-family:Cinzel;font-size:12px;color:#c8a050;">${l}</span>`; rb.appendChild(p) }); ov.appendChild(rb) }
  if(isGM){ const as=document.createElement("div"); as.style.cssText="display:flex;flex-direction:column;align-items:center;gap:10px;width:90vw;max-width:600px;"; const ai=document.createElement("input"); ai.placeholder="Tapez votre réponse ici..."; ai.style.cssText="width:100%;padding:12px 20px;font-family:'Cinzel',serif;font-size:14px;background:rgba(200,160,80,0.1);border:1px solid rgba(200,160,80,0.4);border-radius:4px;color:#f5e6c8;text-align:center;outline:none;"; const sb=document.createElement("button"); sb.innerText="⚔ Valider la réponse"; sb.style.cssText="padding:10px 30px;font-family:'Cinzel',serif;font-size:14px;background:linear-gradient(#7a5520,#3a2508);color:#c8a050;border:1px solid #c8a050;border-radius:4px;cursor:pointer;"; sb.onclick=()=>{ const ans=ai.value.toLowerCase().replace(/[^a-zéèàâêôîûçœ ]/g,"").replace(/\s+/g," ").trim(), tgt=secretAnswer.replace(/[^a-zéèàâêôîûçœ ]/g,"").replace(/\s+/g," ").trim(); if(ans===tgt) showRuneVictory(); else{ ai.style.borderColor="red"; setTimeout(()=>ai.style.borderColor="rgba(200,160,80,0.4)",1000); screenShakeHard() } }; as.appendChild(ai); as.appendChild(sb); ov.appendChild(as)
    const br=document.createElement("div"); br.style.cssText="display:flex;gap:10px;margin-top:16px;"; const xb=document.createElement("button"); xb.innerText="✕ Quitter"; xb.style.cssText="padding:8px 24px;font-family:'Cinzel',serif;font-size:12px;background:rgba(80,20,20,0.4);color:#ff8080;border:1px solid rgba(180,40,40,0.4);border-radius:4px;cursor:pointer;"; xb.onclick=closeRuneChallenge; br.appendChild(xb); ov.appendChild(br) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",20)
}

function unlockRuneHint(hintId) { if(!isGM)return; db.ref("game/runeChallenge/unlockedHints").once("value",snap=>{ const c=snap.val()||[]; if(!c.includes(hintId)){ c.push(hintId); db.ref("game/runeChallenge/unlockedHints").set(c); showNotification("Fragment runique découvert !"); flashGold() } }) }
function revealRuneLetter(letter) { if(!isGM) return; db.ref("game/runeChallenge/revealedLetters").once("value",snap=>{ const c=snap.val()||[], u=letter.toUpperCase(); if(!c.includes(u)){ c.push(u); db.ref("game/runeChallenge/revealedLetters").set(c); showNotification("Lettre révélée : "+u+" = "+(runeAlphabet[u]||"?")) } }) }
function _showRuneVictoryNow() { playSound("critSound"); flashGold(); flashGold(); screenShakeHard(); powerExplosion(); const w=document.createElement("div"); w.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:40px;color:gold;text-shadow:0 0 20px gold;text-align:center;pointer-events:none;z-index:99999999;"; const title=document.createElement("div"); title.innerText="⚔ MESSAGE DÉCHIFFRÉ ⚔"; const sub=document.createElement("span"); sub.style.cssText="font-size:18px;color:#c8a050;"; sub.innerText="Les runes révèlent leur secret !"; w.appendChild(title); w.appendChild(sub); document.body.appendChild(w); setTimeout(()=>{ w.style.transition="opacity 1s"; w.style.opacity="0"; setTimeout(()=>w.remove(),1000) },4000) }
async function tryRuneEventOnDice(eventId) {
  if(!isGM || !eventId || window.__sessionBusy)return
  const box=document.getElementById("storyImage")
  if(!box || box.style.display!=="flex")return
  try {
    const claim=await db.ref("game/runeDiceClaims/"+eventId).transaction(value=>value?undefined:true)
    if(!claim.committed)return
    const data=(await db.ref("game/runeChallenge").once("value")).val()
    if(!data?.active || Math.random()>0.25)return
    const revealed=data.revealedLetters||[],letters=[...new Set("ALUERDSBVTIN OPQCM".split("").filter(c=>c.trim()))].filter(c=>!revealed.includes(c))
    if(!letters.length)return
    const letter=letters[Math.floor(Math.random()*letters.length)]
    await db.ref("game/runeDiceEvent").set({id:eventId,letter,rune:runeAlphabet[letter]||"?",dialogue:runeEventDialogues[Math.floor(Math.random()*runeEventDialogues.length)],time:Date.now()})
    setTimeout(()=>revealRuneLetter(letter),3000)
  }catch(error){console.warn("Événement de rune non confirmé",error)}
}

function showRuneBubble(dialogue, letter, rune) { const ex=document.getElementById("runeBubble"); if(ex) ex.remove(); const b=document.createElement("div"); b.id="runeBubble"; b.style.cssText="position:fixed;bottom:30%;left:55%;max-width:320px;background:url('images/paper.png') center/100% 100% no-repeat;padding:24px 30px;font-family:'IM Fell English',serif;font-size:15px;color:#2b1a10;line-height:1.6;z-index:9999999;opacity:0;transition:opacity 0.6s ease;pointer-events:none;"; const tx=document.createElement("div"); tx.innerText=dialogue; tx.style.cssText="margin-bottom:12px;font-style:italic;"; b.appendChild(tx); const rd=document.createElement("div"); rd.style.cssText="text-align:center;font-size:32px;color:#c8a050;text-shadow:0 0 10px gold;font-family:serif;margin:8px 0 4px;"; rd.innerText=rune; b.appendChild(rd); const ld=document.createElement("div"); ld.style.cssText="text-align:center;font-family:'Cinzel',serif;font-size:14px;color:#8b4000;letter-spacing:2px;"; ld.innerText="= "+letter; b.appendChild(ld); document.body.appendChild(b); setTimeout(()=>b.style.opacity="1",50); playSound("parcheminSound"); setTimeout(()=>{ b.style.opacity="0"; setTimeout(()=>b.remove(),600) },6000) }

/* ========================= */
/* MALÉDICTION               */
/* ========================= */

function toggleCurse(level) {
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!isGM && targetId !== (myToken && myToken.id)) return
  if (!targetId) return
  const previousLevel = curseLevel
  if (level === 8) addMJLog("☠ Malédiction complète !")
  curseLevel = level
  document.querySelectorAll(".curseGem").forEach((g, i) => g.classList.toggle("active", i < level))
  const targetToken = document.getElementById(targetId)
  if (level === 8) {
    flashRed()
    screenShakeHard()
    showNotification("La malédiction est complète !")
    if (targetToken) {
      targetToken.classList.add("cursed")
      startBloodEffect(targetToken)
    }
    if (previousLevel < 8) {
      window.__curseWheelTriggeredFor = String(targetId).toLowerCase()
      showCurseIntro(targetId)
      triggerCurseWheel(targetId)
    }
  }
  if (level < 8 && targetToken) {
    targetToken.classList.remove("cursed")
    stopBloodEffect(targetToken)
  }
  if (level < 8 && window.__curseWheelTriggeredFor === String(targetId).toLowerCase()) {
    window.__curseWheelTriggeredFor = null
  }
  saveCurse()
}
function saveCurse() {
  if (!canAccessCharacter(currentSheetPlayer || myToken?.id)) return
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!targetId) return
  db.ref("characters/" + targetId + "/curse").set(curseLevel)
}
function setCorruption(level) {
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!isGM && targetId !== (myToken && myToken.id)) return
  if (!targetId) return
  corruptionLevel = level
  document.querySelectorAll(".corruptionPoint").forEach((b, i) => b.classList.toggle("active", i < level))
  const targetToken = document.getElementById(targetId)
  if (level === 10) {
    addMJLog("✨ Pouvoir activé pour " + targetId)
    flashGold()
    screenShake()
    powerExplosion()
    showNotification("Pouvoir disponible !")
    if (targetToken) targetToken.classList.add("powerReady")
    activatePowerMode(targetId)
  }
  if (level < 10 && targetToken) targetToken.classList.remove("powerReady", "powerFull")
  saveCorruption()
}
function saveCorruption() {
  if (!canAccessCharacter(currentSheetPlayer || myToken?.id)) return
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!targetId) return
  db.ref("characters/" + targetId + "/corruption").set(corruptionLevel)
}
function triggerCurseWheel(playerID) {
  if (!canAccessCharacter(playerID) || window.__sessionBusy) return
  const id = db.ref("curse/wheel").push().key
  return db.ref("curse/wheel").transaction(current => current ? undefined : { id, player: playerID, state: "intro", time: Date.now() })
    .catch(error => showNotification("Roue non enregistrée : " + error.message))
}

function showCurseIntro(playerID) {
  playSound("curseSound"); playSound("curse1Sound"); let s=document.getElementById("curseIntroScreen"); if(!s){ s=document.createElement("div"); s.id="curseIntroScreen"; document.body.appendChild(s) }; s.innerHTML=""; s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;animation:cursePulse 0.5s ease-in-out infinite alternate;"
  const t=document.createElement("div"); t.innerText="VOUS ETES MAUDIT"; t.style.cssText="font-family:Cinzel;font-size:60px;color:#ff0000;text-shadow:0 0 20px red;animation:curseShake 0.1s infinite;text-align:center;margin-bottom:30px;"; s.appendChild(t)
  const sub=document.createElement("div"); sub.innerText=playerID.toUpperCase()+" doit affronter son destin..."; sub.style.cssText="font-family:IM Fell English;font-size:24px;color:#cc4444;text-align:center;opacity:0.8;"; s.appendChild(sub)
  screenShakeHard(); flashRed()
  setTimeout(() => {
    if (s && s.parentNode) s.remove()
    // GM met à jour Firebase pour les autres clients
    if (isGM) {
      db.ref("curse/wheel/state").set("wheel")
    } else {
      // Le joueur maudit affiche la roue directement (sans dépendre d'un write Firebase)
      showCurseWheelScreen(playerID)
    }
  }, 3000)
}

function showCurseWheelScreen(playerID) {
  const isCursed = isGM || (myToken && myToken.id === playerID)
  let s = document.getElementById("curseWheelScreen")
  if (!s) { s = document.createElement("div"); s.id = "curseWheelScreen"; document.body.appendChild(s) }
  s.innerHTML = ""
  // Pas de overflow-y:auto ici — ça casse pointerup/click sur iOS
  s.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;padding:12px;box-sizing:border-box;gap:12px;"

  const t = document.createElement("div")
  t.innerText = "LA ROUE DU DESTIN"
  t.style.cssText = "font-family:Cinzel;font-size:clamp(18px,3.5vw,36px);color:#cc0000;text-shadow:0 0 20px red;text-align:center;flex-shrink:0;"
  s.appendChild(t)

  const canvas = document.createElement("canvas")
  canvas.id = "curseWheelCanvas"
  canvas.width = 500; canvas.height = 500
  // Canvas responsive sans overflow : 55vmin laisse la place au titre + bouton
  canvas.style.cssText = "filter:drop-shadow(0 0 20px darkred);width:min(500px,55vmin);height:min(500px,55vmin);flex-shrink:0;touch-action:none;"
  s.appendChild(canvas)

  const btn = document.createElement("button")
  btn.id = "curseWheelBtn"
  btn.innerText = isCursed ? "Tourner la roue" : "En attente de " + playerID.toUpperCase() + "..."
  btn.style.cssText = "padding:16px 44px;font-family:Cinzel;font-size:clamp(14px,2vw,18px);background:linear-gradient(#5a0000,#2a0000);color:#ff6060;border:2px solid #aa0000;border-radius:8px;cursor:" + (isCursed ? "pointer" : "default") + ";opacity:" + (isCursed ? "1" : "0.4") + ";touch-action:manipulation;flex-shrink:0;-webkit-appearance:none;"
  if (isCursed) {
    btn.addEventListener("click", () => {
      if (btn.disabled) return
      btn.disabled = true; btn.style.opacity = "0.4"
      spinCurseWheel(playerID)
    })
  }
  s.appendChild(btn)

  drawCurseWheel(canvas, 0)
}

function drawCurseWheel(canvas, rotation) {
  const ctx=canvas.getContext("2d"),cx=250,cy=250,radius=190,n=curseWheelChoices.length,arc=(Math.PI*2)/n
  ctx.clearRect(0,0,500,500); ctx.beginPath(); ctx.arc(cx,cy,radius+14,0,Math.PI*2); ctx.fillStyle="#3a0000"; ctx.fill(); ctx.strokeStyle="#ff4040"; ctx.lineWidth=3; ctx.stroke()
  curseWheelChoices.forEach((ch,i)=>{ const start=rotation+i*arc-Math.PI/2,end=start+arc,mid=start+arc/2; const gx=cx+Math.cos(mid)*radius*0.5,gy=cy+Math.sin(mid)*radius*0.5; const grad=ctx.createRadialGradient(gx,gy,0,cx,cy,radius); grad.addColorStop(0,shadeColor(ch.color,40)); grad.addColorStop(1,ch.color); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath(); ctx.fillStyle=grad; ctx.fill(); ctx.strokeStyle="rgba(255,80,80,0.8)"; ctx.lineWidth=2; ctx.stroke(); ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid); ctx.shadowColor="black"; ctx.shadowBlur=8; ctx.font="32px serif"; ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(ch.icon,radius*0.65,-18); ctx.font="bold 16px serif"; ctx.fillText(ch.label.split(" ").slice(0,2).join(" "),radius*0.65,8); if(ch.label.split(" ").length>2){ ctx.font="bold 14px serif"; ctx.fillText(ch.label.split(" ").slice(2).join(" "),radius*0.65,26) }; ctx.shadowBlur=0; ctx.restore() })
  ctx.beginPath(); ctx.arc(cx,cy,36,0,Math.PI*2); const cg=ctx.createRadialGradient(cx-8,cy-8,0,cx,cy,36); cg.addColorStop(0,"#ff4040"); cg.addColorStop(1,"#330000"); ctx.fillStyle=cg; ctx.fill(); ctx.strokeStyle="#ff6060"; ctx.lineWidth=3; ctx.stroke(); ctx.font="26px serif"; ctx.fillStyle="white"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("☠",cx,cy)
  ctx.save(); ctx.translate(cx,cy-radius-20); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-16,-26); ctx.lineTo(16,-26); ctx.closePath(); ctx.fillStyle="#cc0000"; ctx.fill(); ctx.restore()
}

function spinCurseWheel(playerID) {
  const canvas=document.getElementById("curseWheelCanvas"); if(!canvas) return
  window.__curseResolving = true
  const n=curseWheelChoices.length,arc=(Math.PI*2)/n,ri=Math.floor(Math.random()*n)
  let total=(Math.PI*2*(5+Math.random()*3))+(-(ri*arc)-arc/2), start=null, cur=0
  function animate(ts) { if(!start) start=ts; const p=Math.min((ts-start)/4000,1); cur=total*(1-Math.pow(1-p,3)); drawCurseWheel(canvas,cur); if(p<1) requestAnimationFrame(animate); else setTimeout(()=>db.ref("curse/wheel").update({ state:"result",result:ri,player:playerID }).finally(()=>{ window.__curseResolving = false }),500) }
  requestAnimationFrame(animate)
}

function showCurseResult(playerID, resultIndex) {
  const safeIndex = Math.max(0, Math.min(curseWheelChoices.length - 1, parseInt(resultIndex, 10) || 0))
  const ch=curseWheelChoices[safeIndex]; const ws=document.getElementById("curseWheelScreen"); if(ws) ws.remove(); playSound("curseSound"); playSound("curse2Sound")
  const s=document.createElement("div"); s.id="curseResultScreen"; s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;padding:20px;box-sizing:border-box;"; document.body.appendChild(s); flashRed(); screenShakeHard()
  const ic=document.createElement("div"); ic.innerText=ch.icon; ic.style.cssText="font-size:clamp(60px,12vmin,100px);margin-bottom:16px;animation:curseResultPop 0.5s ease-out;"; s.appendChild(ic)
  const t=document.createElement("div"); t.innerText=ch.label; t.style.cssText="font-family:Cinzel;font-size:clamp(28px,6vw,56px);color:#ff0000;text-shadow:0 0 20px red;margin-bottom:12px;text-align:center;animation:curseResultPop 0.6s ease-out;"; s.appendChild(t)
  const d=document.createElement("div"); d.innerText=ch.description; d.style.cssText="font-family:IM Fell English;font-size:clamp(16px,2.5vw,22px);color:#cc6666;text-align:center;margin-bottom:30px;"; s.appendChild(d)
  if (isGM) applyCurseEffect(playerID,safeIndex)
  else if (myToken && myToken.id===playerID) applyCurseEffect(playerID,safeIndex)
  setTimeout(()=>{
    if (s && s.parentNode) s.remove()
    db.ref("curse/wheel").remove()
    if (isGM) db.ref("characters/"+playerID+"/curse").set(0)
    else if (myToken && myToken.id===playerID) db.ref("characters/"+playerID+"/curse").set(0)
    if(currentSheetPlayer===playerID){
      curseLevel=0
      document.querySelectorAll(".curseGem").forEach(g=>g.classList.remove("active"))
    }
    if (window.__curseWheelTriggeredFor === String(playerID).toLowerCase()) window.__curseWheelTriggeredFor = null
    const tok=document.getElementById(playerID)
    if(tok){
      tok.classList.remove("cursed")
      stopBloodEffect(tok)
    }
  },5000)
}

function applyCurseEffect(playerID, ri) {
  if (!canAccessCharacter(playerID)) return
  const wheel = window.__activeCurseWheel
  const rollId = wheel && String(wheel.id || wheel.time || "")
  if (!rollId) return
  return db.ref("characters/" + playerID).transaction(current => resolveCharacterCurse(current, playerID, rollId, ri) || undefined)
    .catch(error => showNotification("Effet de malédiction non enregistré : " + error.message))
}

/* ========================= */
/* POUVOIR                   */
/* ========================= */

function activatePowerMode(playerID) { if(powerModeActive) return; powerModeActive=true; playSound("powerSound",0.75); const tok=document.getElementById(playerID); if(tok) tok.classList.add("powerReady","powerFull"); if(myToken&&myToken.id===playerID) showUsePowerBtn(playerID) }
function showUsePowerBtn(playerID) { const ex=document.getElementById("usePowerBtn"); if(ex) ex.remove(); const btn=document.createElement("button"); btn.id="usePowerBtn"; btn.innerText="LIBERER LE POUVOIR"; btn.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:14px 40px;font-family:Cinzel;font-size:20px;letter-spacing:2px;background:linear-gradient(180deg,#8a6000,#4a3000);color:gold;border:2px solid gold;border-radius:10px;cursor:pointer;z-index:999999999;box-shadow:0 0 20px gold,0 0 40px orange;animation:powerBtnPulse 1s ease-in-out infinite alternate;text-shadow:0 0 10px gold;"; btn.onclick=()=>usePower(playerID); document.body.appendChild(btn) }

function usePower(playerID) {
  const btn=document.getElementById("usePowerBtn"); if(btn) btn.remove()
  db.ref("game/powerSound").set({ player:playerID, time:Date.now() }); playSound("powerSound",0.9); powerExplosion(); powerExplosion(); flashGold(); flashGold(); screenShakeHard()
  for(let i=0;i<30;i++) setTimeout(()=>{ const p=document.createElement("div"); p.style.cssText=`position:fixed;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;border-radius:50%;background:gold;left:${Math.random()*100}%;top:${Math.random()*100}%;pointer-events:none;z-index:9999998;box-shadow:0 0 8px gold;animation:goldRise 1.5s ease-out forwards;`; document.body.appendChild(p); setTimeout(()=>p.remove(),1500) },i*60)
  showNotification(playerID.toUpperCase()+" LIBERE SON POUVOIR !"); addMJLog(playerID.toUpperCase()+" utilise son pouvoir !"); db.ref("characters/"+playerID+"/corruption").set(0); powerModeActive=false
  const tok=document.getElementById(playerID); if(tok) setTimeout(()=>tok.classList.remove("powerReady","powerFull"),2000)
  if(currentSheetPlayer===playerID){ corruptionLevel=0; document.querySelectorAll(".corruptionPoint").forEach(pt=>pt.classList.remove("active")) }
}

/* ========================= */
/* AURORE BORÉALE            */
/* ========================= */

function triggerAurora() { if(!isGM)return; if(auroraActive) return; auroraActive=true; db.ref("events/aurora").set({ active:true, time:Date.now() }); document.querySelectorAll(".gmSection").forEach(s => s.style.display="none") }

function clearAuroraTimers() {
  ;["__auroraMsgTimer", "__auroraRemoveMsgTimer", "__auroraAutoEndTimer", "__auroraFinalCleanupTimer"].forEach(key => {
    if (window[key]) {
      clearTimeout(window[key])
      window[key] = null
    }
  })
  if (window.__auroraFadeInInterval) {
    clearInterval(window.__auroraFadeInInterval)
    window.__auroraFadeInInterval = null
  }
  if (window.__auroraFadeOutInterval) {
    clearInterval(window.__auroraFadeOutInterval)
    window.__auroraFadeOutInterval = null
  }
}

function startAuroraMusic() {
  const aurora = document.getElementById("auroraMusic")
  if (!aurora) return
  if (window.__auroraFadeOutInterval) {
    clearInterval(window.__auroraFadeOutInterval)
    window.__auroraFadeOutInterval = null
  }
  try { aurora.pause() } catch (_) {}
  aurora.currentTime = 0
  aurora.volume = 0
  aurora.play().catch(()=>{})
  window.__auroraFadeInInterval = setInterval(() => {
    if (aurora.volume < 0.35) aurora.volume = Math.min(0.35, aurora.volume + 0.03)
    else {
      clearInterval(window.__auroraFadeInInterval)
      window.__auroraFadeInInterval = null
    }
  }, 100)
}

function stopAuroraMusic(fade, onDone) {
  const aurora = document.getElementById("auroraMusic")
  if (!aurora) {
    if (onDone) onDone()
    return
  }
  if (window.__auroraFadeInInterval) {
    clearInterval(window.__auroraFadeInInterval)
    window.__auroraFadeInInterval = null
  }
  if (!fade) {
    try { aurora.pause() } catch (_) {}
    aurora.currentTime = 0
    aurora.volume = 0
    if (onDone) onDone()
    return
  }
  window.__auroraFadeOutInterval = setInterval(() => {
    if (aurora.volume > 0.04) aurora.volume = Math.max(0, aurora.volume - 0.04)
    else {
      clearInterval(window.__auroraFadeOutInterval)
      window.__auroraFadeOutInterval = null
      try { aurora.pause() } catch (_) {}
      aurora.currentTime = 0
      aurora.volume = 0
      if (onDone) onDone()
    }
  }, 100)
}

function resetAuroraPresentation() {
  clearAuroraTimers()
  auroraActive = false
  const overlay = document.getElementById("auroraOverlay")
  if (overlay && overlay.parentNode) overlay.remove()
  const msg = document.getElementById("auroraMessage")
  if (msg && msg.parentNode) msg.remove()
  const bifrostBtn = document.getElementById("bifrostBtn")
  if (bifrostBtn && bifrostBtn.parentNode) bifrostBtn.remove()
  const end = document.getElementById("auroraEndMessage")
  if (end && end.parentNode) end.remove()
  stopAuroraMusic(false)
}

function showAuroraEvent() {
  clearAuroraTimers()
  if(document.getElementById("auroraOverlay")) {
    auroraActive = true
    updateBifrostBtn()
    const aurora = document.getElementById("auroraMusic")
    if (aurora && aurora.paused && currentMap !== "bifrost.jpg") startAuroraMusic()
    return
  }
  auroraActive=true; updateBifrostBtn(); if(isGM) setTimeout(()=>checkOdinVision(),5000)
  const ov=document.createElement("div"); ov.id="auroraOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999990;opacity:0;transition:opacity 3s ease;"; document.body.appendChild(ov)
  const colors=["rgba(0,255,150,0.22)","rgba(0,220,255,0.18)","rgba(120,60,255,0.16)","rgba(0,255,180,0.20)","rgba(40,180,255,0.17)"]
  for(let i=0;i<8;i++){ const b=document.createElement("div"); b.style.cssText=`position:absolute;top:${Math.random()*60}%;left:-20%;width:140%;height:${80+Math.random()*160}px;background:linear-gradient(90deg,transparent,${colors[i%colors.length]},transparent);border-radius:50%;transform:rotate(${-15+Math.random()*30}deg);animation:auroraDance ${4+Math.random()*6}s ease-in-out infinite;animation-delay:${Math.random()*3}s;filter:blur(8px);`; ov.appendChild(b) }
  const msg=document.createElement("div"); msg.id="auroraMessage"; msg.style.cssText="position:fixed;top:12%;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:9999995;opacity:0;transition:opacity 2s ease;"; const msgIcon=document.createElement("div"); msgIcon.style.cssText="font-size:42px;margin-bottom:16px;"; msgIcon.innerText="✨"; const msgTitle=document.createElement("div"); msgTitle.style.cssText="font-family:Cinzel Decorative,Cinzel,serif;font-size:28px;letter-spacing:4px;margin-bottom:12px;color:#a0ffcc;text-shadow:0 0 20px #00ffaa;"; msgTitle.innerText="AURORES BORÉALES"; const msgText=document.createElement("div"); msgText.style.cssText="font-family:IM Fell English,serif;font-size:18px;color:#c0fff0;opacity:0.9;line-height:1.6;max-width:500px;text-align:center;"; msgText.innerText="Les cieux s'embrasent de lumières mystiques..."; msg.appendChild(msgIcon); msg.appendChild(msgTitle); msg.appendChild(msgText); document.body.appendChild(msg)
  setTimeout(()=>{ ov.style.opacity="1"; msg.style.opacity="1" },100)
  startAuroraMusic()
  fadeMusicOut(()=>{})
  window.__auroraMsgTimer = setTimeout(()=>{
    msg.style.opacity="0"
    window.__auroraRemoveMsgTimer = setTimeout(()=>msg.remove(),2000)
  },5000)
  if (isGM) {
    window.__auroraAutoEndTimer = setTimeout(() => db.ref("events/aurora").remove(), 55000)
  }
}

function showAuroraEndSequence() {
  clearAuroraTimers()
  auroraActive = false
  updateBifrostBtn()

  const ov = document.getElementById("auroraOverlay")
  const msg = document.getElementById("auroraMessage")
  if (msg && msg.parentNode) msg.remove()

  let end = document.getElementById("auroraEndMessage")
  if (!end) {
    end = document.createElement("div")
    end.id = "auroraEndMessage"
    const endIcon=document.createElement("div"); endIcon.style.cssText="font-size:34px;margin-bottom:12px;"; endIcon.innerText="✦"
    const endTitle=document.createElement("div"); endTitle.style.cssText="font-family:Cinzel Decorative,Cinzel,serif;font-size:24px;letter-spacing:4px;margin-bottom:10px;color:#d9fff1;text-shadow:0 0 20px rgba(120,255,220,0.8);"; endTitle.innerText="LES AURORES S'ÉTEIGNENT"
    const endText=document.createElement("div"); endText.style.cssText="font-family:IM Fell English,serif;font-size:18px;color:#d8fff8;opacity:0.92;line-height:1.6;max-width:520px;text-align:center;"; endText.innerText="Le ciel reprend lentement son souffle."
    end.appendChild(endIcon); end.appendChild(endTitle); end.appendChild(endText)
    end.style.cssText = "position:fixed;top:14%;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:99999999;opacity:0;transition:opacity 2s ease;"
    document.body.appendChild(end)
  }

  setTimeout(() => { end.style.opacity = "1" }, 50)
  if (ov) {
    ov.style.transition = "opacity 5s ease"
    ov.style.opacity = "0"
  }
  screenShake()

  stopAuroraMusic(true, () => {
    if (ov && ov.parentNode) ov.remove()
    if (end && end.parentNode) {
      setTimeout(() => {
        end.style.opacity = "0"
        setTimeout(() => { if (end.parentNode) end.remove() }, 2200)
      }, 4000)
    }
    if (currentMap && mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap])
  })
}

function updateBifrostBtn() {
  const ex=document.getElementById("bifrostBtn"), should=auroraActive&&currentMap==="arbre.jpg"
  if(should&&!ex){ const btn=document.createElement("div"); btn.id="bifrostBtn"; btn.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;cursor:"+(isGM?"pointer":"default")+";pointer-events:"+(isGM?"auto":"none")+";text-align:center;opacity:0;transition:opacity 1.5s ease;"; btn.innerHTML=`<div style="font-family:'Cinzel Decorative','Cinzel',serif;font-size:30px;color:#44ccff;text-shadow:0 0 20px #0099ff;letter-spacing:10px;padding:20px 40px;background:rgba(0,50,100,0.5);border:2px solid rgba(100,200,255,0.5);border-radius:12px;box-shadow:0 0 30px rgba(0,150,255,0.4);">BIFROST<br><span style="font-size:12px;letter-spacing:4px;opacity:0.7;">✦ LE PONT ARC-EN-CIEL ✦</span></div>`; if(isGM) btn.onclick=()=>triggerBifrostFlash(); document.body.appendChild(btn); setTimeout(()=>btn.style.opacity="1",50) }
  else if(!should&&ex){ ex.style.transition="opacity 1s"; ex.style.opacity="0"; setTimeout(()=>{ if(ex.parentNode) ex.remove() },1000) }
}

function triggerBifrostFlash() { if(!isGM)return; const btn=document.getElementById("bifrostBtn"); if(btn) btn.style.pointerEvents="none"; db.ref("game/bifrostFlash").set({ time:Date.now() }) }
function stopBifrostFlashSound() {
  const snd = window.__bifrostFlashSound
  if (!snd) return
  try { snd.pause() } catch (_) {}
  try { snd.currentTime = 0 } catch (_) {}
  window.__bifrostFlashSound = null
}
function doBifrostFlash() {
  stopBifrostFlashSound()
  fadeMusicOut(()=>{}); const tremb=new Audio("audio/tremblement.mp3"); let trembBase=0.8; setManagedAudioBaseVolume(tremb,trembBase); tremb.play().catch(()=>{}); setTimeout(()=>{ let iv=setInterval(()=>{ if(trembBase>0.04) { trembBase-=0.05; setManagedAudioBaseVolume(tremb,trembBase) } else{ tremb.pause(); clearInterval(iv) } },100) },4500)
  const snd=new Audio("audio/bifrost.mp3"); setManagedAudioBaseVolume(snd,1.0); window.__bifrostFlashSound = snd; snd.play().catch(()=>{})
  const fl=[{c:"rgba(200,230,255,0.4)",d:80},{c:"rgba(255,255,255,0.5)",d:120},{c:"rgba(100,180,255,0.9)",d:200},{c:"rgba(255,255,255,1.0)",d:400}]
  let delay=0; fl.forEach(f=>{ setTimeout(()=>{ const flash=document.createElement("div"); flash.style.cssText=`position:fixed;top:0;left:0;width:100%;height:100%;background:${f.c};pointer-events:none;z-index:99999998;`; document.body.appendChild(flash); setTimeout(()=>{ flash.style.transition=`opacity ${f.d*1.5}ms ease`; flash.style.opacity="0"; setTimeout(()=>flash.remove(),f.d*2) },f.d*0.3) },delay); delay+=f.d+60 })
  screenShake(); setTimeout(()=>screenShakeHard(),300); setTimeout(()=>screenShakeHard(),700); setTimeout(()=>flashGold(),delay-200); setTimeout(()=>{ if(isGM) changeMap("bifrost.jpg") },delay+400)
}

/* ========================= */
/* ODIN VISION               */
/* ========================= */

function checkOdinVision() { if(!isGM)return; if(odinVisionShown) return; db.ref("events/aurora").once("value",a=>{ if(!a.val()||!a.val().active) return; db.ref("game/runeChallenge").once("value",r=>{ const rc=r.val(); if(!rc||!rc.active) return; odinVisionShown=true; setTimeout(()=>triggerOdinVision(),2000+Math.random()*5000) }) }) }
async function triggerOdinVision(){
 if(!isGM)return
 const seed=Math.floor(Math.random()*4294967296)
 try{await transactCombatRoot(current=>{
 const aurora=current?.events?.aurora,challenge=current?.game?.runeChallenge
 if(!aurora?.active||!challenge?.active)return undefined
 const key=aurora.time+":"+challenge.time
 if(current.game.lastOdinVisionKey===key)return undefined
 const root=combatClone(current),dice=combatRandom(seed)
 root.game.lastOdinVisionKey=key;root.game.odinVision={id:key,msg:ODIN_VISIONS[dice(ODIN_VISIONS.length)-1],time:Date.now()}
 const letters=root.game.runeChallenge.revealedLetters||[],available="ABCDEFGHIJKLMNOPRSTUVWXYZ".split("").filter(l=>!letters.includes(l))
 if(available.length)root.game.runeChallenge.revealedLetters=[...letters,available[dice(available.length)-1]]
 return root
 })}catch(error){showNotification(error.message)}
}
function showOdinVision(msg) { document.getElementById("odinVisionOverlay")?.remove(); const ov=document.createElement("div"); ov.id="odinVisionOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999990;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 1.5s ease;"; const bg=document.createElement("div"); bg.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center,rgba(30,0,80,0.7) 0%,rgba(0,0,40,0.5) 100%);"; ov.appendChild(bg); const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;text-align:center;max-width:560px;padding:36px 40px;background:rgba(10,5,30,0.75);border:1px solid rgba(160,120,255,0.3);border-radius:12px;"; const img=document.createElement("img"); img.src="images/odin.png"; img.style.cssText="width:90px;height:90px;object-fit:contain;border-radius:50%;border:2px solid rgba(180,150,255,0.4);margin-bottom:16px;opacity:0.9;"; img.onerror=()=>img.style.display="none"; d.appendChild(img); const t=document.createElement("div"); t.style.cssText="font-family:'Cinzel Decorative',serif;font-size:14px;color:rgba(220,200,255,0.7);letter-spacing:6px;margin-bottom:16px;"; t.innerText="✦ Odin vous parle ✦"; d.appendChild(t); const m=document.createElement("div"); m.style.cssText="font-family:'IM Fell English',serif;font-size:22px;color:rgba(255,245,220,0.97);font-style:italic;line-height:1.7;"; m.innerText=msg; d.appendChild(m); ov.appendChild(d); document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",50); setTimeout(()=>{ ov.style.opacity="0"; setTimeout(()=>{ if(ov.parentNode) ov.remove() },1500); if(isGM) db.ref("game/odinVision").remove(); odinVisionShown=false },7000) }

/* ========================= */
/* ÉLÉMENTS MAP              */
/* ========================= */

function cleanupMapElementDragHandlers(id) {
  if (!window.__mapElementDragHandlers || !window.__mapElementDragHandlers[id]) return
  const handlers = window.__mapElementDragHandlers[id]
  document.removeEventListener("mousemove", handlers.onMove)
  document.removeEventListener("mouseup", handlers.onUp)
  delete window.__mapElementDragHandlers[id]
}

function clearAllElements() { db.ref("elements").remove() }
function renderMapElement(data) {
  cleanupMapElementDragHandlers(data.id)
  const ex=document.getElementById("elem_"+data.id); if(ex) ex.remove(); if(!document.getElementById("map")) return
  const safeImage = sanitizeAssetName(data.image)
  const el=document.createElement("div"); el.id="elem_"+data.id; el.style.cssText=`position:absolute;left:${data.x}px;top:${data.y}px;width:90px;height:90px;cursor:${isGM?"grab":data.clickable?"pointer":"default"};z-index:5000;user-select:none;transition:opacity 0.4s;opacity:0;`
  if(data.isRune){ const rs=document.createElement("div"); rs.style.cssText="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;color:#c8a050;text-shadow:0 0 15px gold;background:rgba(30,15,5,0.85);border:2px solid rgba(200,160,80,0.6);border-radius:50%;animation:tokenRingPulse 2s ease-in-out infinite;pointer-events:none;"; rs.innerText="ᚱ"; el.appendChild(rs) }
  else{ const img=document.createElement("img"); img.src="images/"+safeImage; img.style.cssText="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8));pointer-events:none;"; el.appendChild(img) }
  if(isGM){ const rb=document.createElement("div"); rb.style.cssText="position:absolute;top:-8px;right:-8px;width:20px;height:20px;background:#cc0000;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 0 6px black;z-index:10;"; rb.innerText="✕"; rb.onclick=e=>{ e.stopPropagation(); cleanupMapElementDragHandlers(data.id); db.ref("elements/"+data.id).remove() }; el.appendChild(rb) }
  if(data.clickable){ el.onclick=()=>{ if(data.isRune&&data.runeHint){ requestMapRuneHint(data.id) } else if(!isGM){ const ov=document.createElement("div"); ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999999;cursor:pointer;"; const bi=document.createElement("img"); bi.src="images/"+safeImage; bi.style.cssText="max-width:80vw;max-height:80vh;object-fit:contain;"; ov.appendChild(bi); ov.onclick=()=>ov.remove(); document.body.appendChild(ov) } } }
  if(isGM){ let dg=false,ox=0,oy=0; const onMove=e=>{ if(!dg) return; data.x=e.clientX-ox; data.y=e.clientY-oy; el.style.left=data.x+"px"; el.style.top=data.y+"px" }; const onUp=()=>{ if(!dg) return; dg=false; el.style.cursor="grab"; db.ref("elements/"+data.id+"/x").set(data.x); db.ref("elements/"+data.id+"/y").set(data.y) }; el.addEventListener("mousedown",e=>{ if(e.target===el.querySelector("div")) return; dg=true; ox=e.clientX-data.x; oy=e.clientY-data.y; el.style.cursor="grabbing"; e.stopPropagation() }); if(!window.__mapElementDragHandlers) window.__mapElementDragHandlers={}; window.__mapElementDragHandlers[data.id]={ onMove, onUp }; document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp) }
  document.body.appendChild(el); setTimeout(()=>el.style.opacity="1",20)
}

/* ========================= */
/* WANTED                    */
/* ========================= */

function openWantedEditor() { const wb=document.getElementById("wantedMobBtn"); if(wb){ wb.innerText="— Choisir un mob —"; wb.dataset.value="" }; document.getElementById("wantedEditor").style.display="flex" }
function normalizeWantedPosterData(data) {
  const allowedTiers = Object.keys(WANTED_REWARDS || {})
  const mob = WANTED_MOBS.includes(data?.mob) ? data.mob : ""
  const tier = allowedTiers.includes(data?.tier) ? data.tier : "weak"
  const reward = clampInteger(data?.reward, 1, 999999)
  const id = String(data?.id || ("wanted_" + Date.now()))
  if (!mob) return null
  return { mob, tier, reward, id }
}

function removeWantedPosterElement(id) {
  const safeId = String(id || "")
  if (!safeId) return
  cleanupMapElementDragHandlers(safeId)
  const el = document.getElementById("elem_" + safeId)
  if (el) el.remove()
  db.ref("elements/" + safeId).remove().catch(() => {})
}

async function cleanupLegacyWantedElements() {
  if(!isGM)return
  await transactCombatRoot(current=>{
    const legacy=Object.entries(current?.elements||{}).filter(([id,item])=>item?.wantedData)
    if(!legacy.length)return undefined
    const root=combatClone(current);root.game ||= {};root.game.wantedPosters ||= {}
    legacy.forEach(([id,item])=>{const poster=normalizeWantedPosterData({...item.wantedData,id});if(poster){root.game.wantedPosters[id] ||= poster;delete root.elements[id]}})
    return root
  })
}

async function publishWantedOverlay(data){if(!isGM)return;try{requireExplorationConnection();const poster=normalizeWantedPosterData(data);if(poster)await db.ref("game/wantedOpen").set({poster,time:Date.now()})}catch(error){showNotification(error.message)}}

async function createWantedPoster(){
 if(!isGM)return
 try{requireExplorationConnection();const id="wanted_"+db.ref("game/wantedPosters").push().key
 const poster=normalizeWantedPosterData({id,mob:document.getElementById("wantedMobBtn")?.dataset.value||"",tier:document.getElementById("wantedTierBtn")?.dataset.value||"weak",reward:document.getElementById("wantedReward").value})
 if(!poster)throw new Error("Affiche invalide")
 await db.ref("game").update({["wantedPosters/"+id]:poster,wantedOpen:{poster,time:Date.now()}})
 document.getElementById("wantedEditor").style.display="none"
 }catch(error){showNotification("Affiche non publiée : "+error.message)}
}

function renderWantedPoster(data) {
  const normalized = normalizeWantedPosterData(data)
  const list=document.getElementById("wantedList")
  if(!list || !normalized) return
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const card=document.createElement("div")
  card.id="wantedCard_" + normalized.id
  card.style.cssText="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(60,40,10,0.4);border:1px solid rgba(150,100,30,0.4);border-radius:4px;"
  const img=document.createElement("img")
  img.src="images/" + safeMobImage
  img.style.cssText="width:36px;height:36px;object-fit:contain;border-radius:3px;"
  img.onerror=()=>img.style.opacity="0.3"
  card.appendChild(img)
  const info=document.createElement("div")
  info.style.cssText="flex:1;"
  const name=document.createElement("div")
  name.style.cssText="font-family:Cinzel,serif;font-size:11px;color:rgb(255,200,80);"
  name.innerText = normalized.mob.toUpperCase()
  const meta=document.createElement("div")
  meta.style.cssText="font-size:10px;color:rgb(200,160,60);"
  meta.innerText = "💰 " + normalized.reward + " po — " + normalized.tier
  info.appendChild(name)
  info.appendChild(meta)
  card.appendChild(info)
  const open=document.createElement("button")
  open.style.cssText="padding:2px 8px;font-size:10px;background:rgba(90,70,20,0.5);color:#ffd68a;border:1px solid rgba(170,130,40,0.45);border-radius:3px;cursor:pointer;"
  open.innerText="Mettre en avant"
  open.onclick=()=>{ if (isGM) publishWantedOverlay(normalized); else showWantedOverlay(normalized) }
  card.appendChild(open)
  const del=document.createElement("button")
  del.style.cssText="padding:2px 8px;font-size:10px;background:rgba(80,20,0,0.5);color:#ff8888;border:1px solid rgba(150,40,0,0.4);border-radius:3px;cursor:pointer;"
  del.innerText="✕"
  del.onclick=()=>removePersistentWanted(normalized.id)
  card.appendChild(del)
  list.appendChild(card)
}

function showWantedOverlay(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return
  const existing = document.getElementById("wantedOverlay")
  if (existing) existing.remove()
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const ov=document.createElement("div")
  ov.id = "wantedOverlay"
  ov.dataset.posterId=normalized.id
  ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999999;cursor:pointer;"
  ov.onclick=()=>ov.remove()
  const p=document.createElement("div")
  p.style.cssText="position:relative;width:300px;padding:30px 20px;text-align:center;"
  const bg=document.createElement("img")
  bg.src="images/wanted.png"
  bg.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;opacity:0.9;"
  p.appendChild(bg)
  const inner=document.createElement("div")
  inner.style.cssText="position:relative;z-index:1;padding:20px;"
  const mi=document.createElement("img")
  mi.src="images/" + safeMobImage
  mi.style.cssText="width:100px;height:100px;object-fit:contain;border:3px solid rgb(100,60,10);border-radius:4px;margin:10px auto;display:block;"
  inner.appendChild(mi)
  const n=document.createElement("div")
  n.style.cssText="font-family:'Cinzel Decorative',serif;font-size:18px;color:rgb(80,40,0);letter-spacing:3px;margin-bottom:8px;"
  n.innerText=normalized.mob.toUpperCase()
  inner.appendChild(n)
  const r=document.createElement("div")
  r.style.cssText="font-family:Cinzel,serif;font-size:22px;color:rgb(120,70,0);font-weight:bold;"
  r.innerText="💰 " + normalized.reward + " po"
  inner.appendChild(r)
  p.appendChild(inner)

  // Bouton fermer (tablettes sans Echap)
  const closeBtn = document.createElement("button")
  closeBtn.innerText = "✕"
  closeBtn.style.cssText = "position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;background:rgba(20,10,0,0.95);border:1px solid rgba(212,168,53,0.7);color:#d4a835;font-size:18px;cursor:pointer;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.7);touch-action:manipulation;"
  closeBtn.onclick = e => { e.stopPropagation(); ov.remove() }
  p.appendChild(closeBtn)

  ov.appendChild(p)
  document.body.appendChild(ov)
}

function renderWantedBoardCard(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return null
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const card=document.createElement("button")
  card.type="button"
  card.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:190px;min-height:268px;padding:26px 18px 18px;background:url('images/wanted.png') center/100% 100% no-repeat;border:none;color:#5a3410;cursor:pointer;font-family:Cinzel,serif;filter:drop-shadow(0 8px 14px rgba(0,0,0,0.45));transition:transform 0.15s ease,filter 0.15s ease;"
  const pin=document.createElement("div")
  pin.style.cssText="position:absolute;top:10px;left:50%;transform:translateX(-50%) rotate(-8deg);width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f4e3bf 0%,#a67c34 45%,#5a3c12 100%);box-shadow:0 2px 5px rgba(0,0,0,0.45);"
  const img=document.createElement("img")
  img.src="images/" + safeMobImage
  img.style.cssText="width:82px;height:82px;object-fit:contain;margin-top:18px;border:3px solid rgba(100,60,10,0.55);border-radius:4px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.28));"
  img.onerror=()=>img.style.opacity="0.35"
  const subtitle=document.createElement("div")
  subtitle.style.cssText="font-family:'Cinzel Decorative',Cinzel,serif;font-size:13px;letter-spacing:3px;color:#7b4208;text-align:center;margin-top:10px;"
  subtitle.innerText="WANTED"
  const title=document.createElement("div")
  title.style.cssText="font-size:15px;letter-spacing:1px;color:#4f2f12;text-align:center;font-weight:bold;line-height:1.3;margin-top:8px;"
  title.innerText=normalized.mob.toUpperCase()
  const meta=document.createElement("div")
  meta.style.cssText="font-size:12px;color:#6b4720;text-align:center;line-height:1.6;margin-top:10px;"
  meta.innerText="Prime : " + normalized.reward + " po"
  const tier=document.createElement("div")
  tier.style.cssText="font-size:10px;color:#8a5a24;text-align:center;letter-spacing:1px;margin-top:2px;"
  tier.innerText=String(normalized.tier || "").toUpperCase()
  card.appendChild(pin)
  card.appendChild(img)
  card.appendChild(subtitle)
  card.appendChild(title)
  card.appendChild(meta)
  card.appendChild(tier)
  card.onmouseenter=()=>{ card.style.transform="translateY(-3px) rotate(-1deg)"; card.style.filter="drop-shadow(0 12px 18px rgba(0,0,0,0.5))" }
  card.onmouseleave=()=>{ card.style.transform=""; card.style.filter="drop-shadow(0 8px 14px rgba(0,0,0,0.45))" }
  card.onclick=()=>showWantedOverlay(normalized)
  return card
}

function buildWantedBoardContent(container, posters) {
  container.innerHTML=""
  const title=document.createElement("div")
  title.style.cssText="text-align:center;font-family:'Cinzel Decorative',Cinzel,serif;font-size:24px;letter-spacing:4px;color:#f1d08a;margin-bottom:8px;"
  title.innerText="TABLEAU DES PRIMES"
  const subtitle=document.createElement("div")
  subtitle.style.cssText="text-align:center;font-family:'IM Fell English',serif;font-size:16px;color:#d9be84;margin-bottom:18px;"
  subtitle.innerText="Cliquez sur une affiche pour la consulter"
  container.appendChild(title)
  container.appendChild(subtitle)
  const grid=document.createElement("div")
  grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,190px));justify-content:center;gap:22px 18px;padding:8px 6px 4px;"
  if (posters.length) {
    posters.forEach(poster => {
      const card = renderWantedBoardCard(poster)
      if (card) grid.appendChild(card)
    })
  } else {
    const empty=document.createElement("div")
    empty.style.cssText="grid-column:1/-1;text-align:center;padding:18px;font-family:Cinzel,serif;font-size:14px;color:#caa46b;border:1px solid rgba(160,110,40,0.25);border-radius:8px;background:rgba(25,15,6,0.6);"
    empty.innerText="Aucune affiche active pour le moment"
    grid.appendChild(empty)
  }
  container.appendChild(grid)
}

function openWantedBoard(fromFirebase) {
  const existing=document.getElementById("wantedBoardOverlay")
  if (existing) {
    if (fromFirebase) return
    closeWantedBoard(); return
  }
  if (isGM && !fromFirebase) db.ref("game/wantedBoardOpen").set({ time: Date.now() })
  const posterOverlay = document.getElementById("wantedOverlay")
  if (posterOverlay) posterOverlay.remove()
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  const bell = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("cloche.mp3") : "audio/cloche.mp3")
  setManagedAudioBaseVolume(bell, 0.78, "effects")
  bell.play().catch(() => {})
  const overlay=document.createElement("div")
  overlay.id="wantedBoardOverlay"
  overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.84);display:flex;align-items:center;justify-content:center;z-index:99999998;"
  overlay.onclick=e=>{ if(e.target===overlay) closeWantedBoard() }
  const panel=document.createElement("div")
  panel.style.cssText="width:min(960px,92vw);max-height:84vh;overflow-y:auto;padding:26px 24px 22px;background:url('images/wood.png') center/contain no-repeat;border:none;border-radius:0;box-shadow:none;"
  panel.onclick=e=>e.stopPropagation()
  const close=document.createElement("button")
  close.type="button"
  close.style.cssText="display:block;margin:0 0 14px auto;padding:6px 12px;background:rgba(80,20,0,0.55);color:#ffb0a0;border:1px solid rgba(180,60,20,0.45);border-radius:6px;cursor:pointer;font-family:Cinzel,serif;"
  close.innerText="Fermer"
  close.onclick=()=>closeWantedBoard()
  panel.appendChild(close)
  const content=document.createElement("div")
  content.id="wantedBoardContent"
  panel.appendChild(content)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
  const posters=Object.values(window.__wantedPostersData||{}).filter(Boolean)
  buildWantedBoardContent(content, posters)
  if (!posters.length) {
    db.ref("game/wantedPosters").once("value", snap => {
      const data=snap.val()||{}
      window.__wantedPostersData=data
      buildWantedBoardContent(content, Object.values(data).filter(Boolean))
    })
  }
}

function closeWantedBoard(fromFirebase) {
  const overlay = document.getElementById("wantedBoardOverlay")
  if (overlay) overlay.remove()
  if (isGM && !fromFirebase) db.ref("game/wantedBoardOpen").remove()
}
function toggleWantedDropdown(el) { const dd=document.getElementById("wantedMobDropdown"); if(!dd) return; if(dd.style.display!=="none"){ dd.style.display="none"; return }; if(!dd.dataset.built){ dd.dataset.built="1"; const em=document.createElement("div"); em.style.cssText="padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,120,60);cursor:pointer;"; em.innerText="— Choisir un mob —"; em.onmousedown=e=>{ e.stopPropagation(); selectWantedMob("","— Choisir un mob —") }; dd.appendChild(em); WANTED_MOBS.forEach(m=>{ const it=document.createElement("div"); it.style.cssText="padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,200,120);cursor:pointer;"; it.innerText=m.charAt(0).toUpperCase()+m.slice(1); it.onmousedown=e=>{ e.stopPropagation(); selectWantedMob(m,it.innerText) }; it.onmouseenter=()=>it.style.background="rgb(60,35,5)"; it.onmouseleave=()=>it.style.background=""; dd.appendChild(it) }) }; const r=el.getBoundingClientRect(); dd.style.position="fixed"; dd.style.top=(r.bottom+2)+"px"; dd.style.left=r.left+"px"; dd.style.width=r.width+"px"; dd.style.display="block" }
function selectWantedMob(val, lbl) { const btn=document.getElementById("wantedMobBtn"); if(btn){ btn.innerText=lbl; btn.dataset.value=val }; const dd=document.getElementById("wantedMobDropdown"); if(dd) dd.style.display="none" }
function toggleWantedTierDropdown(el) { const dd=document.getElementById("wantedTierDropdown"); if(!dd) return; if(dd.style.display!=="none"){ dd.style.display="none"; return }; const r=el.getBoundingClientRect(); dd.style.position="fixed"; dd.style.top=(r.bottom+2)+"px"; dd.style.left=r.left+"px"; dd.style.width=r.width+"px"; dd.style.display="block" }
function selectWantedTier(val, lbl) { const btn=document.getElementById("wantedTierBtn"); if(btn){ btn.innerText=lbl; btn.dataset.value=val }; const dd=document.getElementById("wantedTierDropdown"); if(dd) dd.style.display="none"; const rw=WANTED_REWARDS[val]||WANTED_REWARDS.weak, ri=document.getElementById("wantedReward"); if(ri) ri.value=rw[Math.floor(Math.random()*rw.length)] }

/* ========================= */
/* SAUVEGARDE UI             */
/* ========================= */

async function showSaveMenu() {
  if (!isGM || window.__authRole !== "gm") return
  document.getElementById("savePanel")?.remove()
  const panel = document.createElement("div"); panel.id = "savePanel"
  panel.style.cssText = "position:fixed;inset:12% auto auto 50%;transform:translateX(-50%);max-height:75vh;overflow:auto;z-index:2000000000;background:#15110d;border:2px solid gold;border-radius:12px;padding:24px;color:#f5e6c8;width:min(520px,90vw);font:15px Georgia,serif;"
  document.body.appendChild(panel)
  const title = document.createElement("h2"); title.textContent = "Sauvegardes"; panel.appendChild(title)
  const list = document.createElement("div"); list.textContent = "Chargement…"; panel.appendChild(list)
  const button = (label, action) => { const b = document.createElement("button"); b.textContent = label; b.onclick = action; b.style.margin = "6px"; return b }
  panel.appendChild(button("Sauvegarder maintenant", () => { panel.remove(); saveGame() }))
  panel.appendChild(button("Charger la plus récente", loadGame))
  panel.appendChild(button("Fermer", () => panel.remove()))
  try {
    const { entries, local } = await listGameSaves()
    if (!panel.isConnected || window.__authRole !== "gm") return
    list.replaceChildren()
    if (local) { const info = document.createElement("p"); info.textContent = "Serveur indisponible : copies locales uniquement."; list.appendChild(info) }
    if (!entries.length) list.textContent = "Aucune sauvegarde"
    entries.forEach(([id, save]) => {
      const row = document.createElement("div"); row.style.cssText = "padding:10px 0;border-bottom:1px solid #5d5038"
      const label = document.createElement("div"); label.textContent = (save._saveName || id) + " — " + (save._saveDate || "Date inconnue"); row.appendChild(label)
      row.appendChild(button("Charger", () => loadSave(id)))
      row.appendChild(button("Supprimer", () => deleteSave(id)))
      list.appendChild(row)
    })
  } catch (error) { list.textContent = "Impossible de lire les sauvegardes : " + error.message }
}

function startSpellAura() { if(document.getElementById("spellAura")) return; const a=document.createElement("div"); a.id="spellAura"; a.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5000;opacity:0;transition:opacity 2s ease;"; const v=document.createElement("div"); v.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(150,0,255,0.5);animation:spellPulse 2s ease-in-out infinite alternate;"; a.appendChild(v); document.body.appendChild(a); setTimeout(()=>a.style.opacity="1",50) }
function stopSpellAura() { const a=document.getElementById("spellAura"); if(!a) return; a.style.transition="opacity 1.5s ease"; a.style.opacity="0"; setTimeout(()=>{ if(a.parentNode) a.remove() },1500) }

async function triggerCemeteryEvent(){
 if(!isGM)return
 try{requireExplorationConnection();await transactCombatRoot(current=>{
 if(current?.game?.completedEvents?.cemetery||current?.game?.cemeterySpell?.active)return undefined
 const root=combatClone(current);root.game ||= {};root.game.cemeterySpell={active:true,time:Date.now(),glipheShown:false};return root
 })}catch(error){showNotification(error.message)}
}

function renderSpellDiceGame(data) {
  const ex=document.getElementById("spellMiniGame"); if(ex) ex.remove()
  const tries=data.tries||{}, freed=data.freed_players||[], turnIdx=data.turnIdx||0
  let realCur=SPELL_PLAYERS.filter(p=>!freed.includes(p))[0]||SPELL_PLAYERS[0]
  for(let i=0;i<SPELL_PLAYERS.length;i++){ const p=SPELL_PLAYERS[(turnIdx+i)%SPELL_PLAYERS.length]; if(!freed.includes(p)&&(tries[p]||0)<SPELL_MAX_TRIES){ realCur=p; break } }
  const ov=document.createElement("div"); ov.id="spellMiniGame"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.8s ease;overflow:hidden;background:rgba(10,0,18,0.92);"
  const ttl=document.createElement("div"); ttl.style.cssText="position:relative;z-index:1;font-family:'Cinzel Decorative',serif;font-size:22px;color:#dd66ff;letter-spacing:5px;text-shadow:0 0 30px #aa00ff;text-align:center;margin-bottom:8px;"; ttl.innerText="⛧  SORT D'EMPRISONNEMENT  ⛧"; ov.appendChild(ttl)
  const sub=document.createElement("div"); sub.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;margin-bottom:28px;text-align:center;"; sub.innerText="Lancez un D20 — seul un coup critique peut briser les chaînes..."; ov.appendChild(sub)
  const sr=document.createElement("div"); sr.style.cssText="position:relative;z-index:1;display:flex;gap:20px;margin-bottom:28px;flex-wrap:wrap;justify-content:center;"
  SPELL_PLAYERS.forEach(pid=>{ const t=tries[pid]||0,iF=freed.includes(pid),isOut=t>=SPELL_MAX_TRIES&&!iF,isCur=pid===realCur&&!iF; const card=document.createElement("div"); card.style.cssText=`display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 20px;border-radius:10px;border:2px solid ${iF?"#44ff44":isOut?"#ff4444":isCur?"#cc44ff":"rgba(150,0,255,0.4)"};background:${isCur?"rgba(120,0,180,0.3)":"rgba(0,0,0,0.3)"};min-width:100px;text-align:center;`; const n=document.createElement("div"); n.style.cssText=`font-family:Cinzel,serif;font-size:13px;letter-spacing:2px;color:${iF?"#44ff44":isOut?"#ff6666":isCur?"#dd88ff":"#9955cc"};`; n.innerText=(iF?"✓ ":isOut?"✕ ":isCur?"▶ ":"")+pid.toUpperCase(); card.appendChild(n); const dr=document.createElement("div"); dr.style.cssText="display:flex;gap:4px;"; for(let i=0;i<SPELL_MAX_TRIES;i++){ const d=document.createElement("div"); d.style.cssText="width:12px;height:12px;border-radius:2px;border:1px solid rgba(150,0,255,0.5);background:"+(i<t?(iF?"#44ff44":"rgba(180,0,80,0.6)"):"transparent")+";"; dr.appendChild(d) }; card.appendChild(dr); sr.appendChild(card) })
  ov.appendChild(sr)
  if(myToken&&myToken.id===realCur&&!freed.includes(myToken.id)){ const t=tries[myToken.id]||0; if(t<SPELL_MAX_TRIES){ const rb=document.createElement("div"); rb.id="spellRollBtn"; rb.style.cssText="position:relative;z-index:1;width:120px;height:120px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,rgba(180,0,255,0.6),rgba(80,0,150,0.3));border:3px solid rgba(200,50,255,0.8);box-shadow:0 0 30px rgba(180,0,255,0.5);cursor:pointer;margin-bottom:16px;animation:bifrostPulse 2s ease-in-out infinite alternate;"; rb.innerHTML=`<span style="font-size:36px;">🎲</span><span style="font-family:Cinzel,serif;font-size:11px;color:#cc88ff;letter-spacing:2px;margin-top:4px;">LANCER D20</span>`; rb.onclick=()=>rollSpellDice(myToken.id,t); ov.appendChild(rb); const h=document.createElement("div"); h.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:11px;color:#7733aa;font-style:italic;"; h.innerText=`Essai ${t+1} / ${SPELL_MAX_TRIES}`; ov.appendChild(h) } else { const out=document.createElement("div"); out.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:14px;color:#ff6666;text-shadow:0 0 10px red;"; out.innerText="✕ Vos essais sont épuisés..."; ov.appendChild(out) } }
  else if(myToken&&!freed.includes(myToken.id)){ const w=document.createElement("div"); w.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;"; w.innerText=`✦ Au tour de ${realCur.toUpperCase()} de briser son sort... ✦`; ov.appendChild(w) }
  else if(myToken&&freed.includes(myToken.id)){ const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:15px;color:#44ff44;text-shadow:0 0 10px lime;"; d.innerText="✓ Vous êtes libéré — attendez les autres..."; ov.appendChild(d) }
  if(isGM){ const gr=document.createElement("div"); gr.style.cssText="position:relative;z-index:1;display:flex;gap:8px;margin-top:16px;"; const lb=document.createElement("button"); lb.innerText="🔓 Libérer"; lb.style.cssText="padding:8px 18px;font-family:Cinzel,serif;font-size:12px;background:rgba(20,80,20,0.5);color:#88ff88;border:1px solid rgba(50,180,50,0.5);border-radius:4px;cursor:pointer;"; lb.onclick=finishCemeteryByGM; gr.appendChild(lb); ov.appendChild(gr) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",50)
}

function rollSpellDice(playerId) {
  const spell=window.__cemeterySpellData
  if(!spell || (!isGM && myToken?.id!==playerId))return
  return requestExplorationAction("spell",playerId,{eventTime:spell.time,revision:spell.revision||0})
}

function showSpellRollResult(roll, isCrit, isFail, playerId, cb) {
  const res=document.createElement("div"); res.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;font-family:'Cinzel Decorative',serif;"
  const color=isCrit?"#44ff44":isFail?"#ff4444":"#cc88ff"
  res.innerHTML=`<div style="font-size:48px;margin-bottom:8px;">${roll}</div><div style="font-size:24px;color:${color};text-shadow:0 0 20px ${color};letter-spacing:3px;">${isCrit?"⚡ CRITIQUE ! ⚡":isFail?"💀 ÉCHEC CRITIQUE":`D20 : ${roll}`}</div><div style="font-size:14px;color:${color};opacity:0.8;margin-top:6px;font-family:Cinzel,serif;">${isCrit?"Sort brisé !":isFail?"-10 HP":"Pas assez..."}</div>`
  document.body.appendChild(res); if(isCrit){ flashGold(); flashGold(); screenShake() }; if(isFail) screenShakeHard()
  setTimeout(()=>{ res.style.transition="opacity 0.8s"; res.style.opacity="0"; setTimeout(()=>{ res.remove(); if(cb) cb() },800) },2500)
}

function showSpellFreed() {
  stopSpellAura(); stopSpecialMusic('sortPrisonMusic')
  setTimeout(()=>{ if(currentMap&&mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap]) },1000)
  playSound("powerSound",0.8); flashGold(); flashGold(); screenShakeHard(); powerExplosion()
  const msg=document.createElement("div"); msg.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative',serif;font-size:36px;color:#cc88ff;text-shadow:0 0 30px purple;text-align:center;z-index:99999999;pointer-events:none;"
  const msgTitle = document.createElement("div")
  msgTitle.innerText = "⚡ SORT BRISÉ ⚡"
  const msgSub = document.createElement("span")
  msgSub.style.cssText = "font-size:18px;color:#aa66ff;"
  msgSub.innerText = "Les héros sont libérés !"
  msg.appendChild(msgTitle)
  msg.appendChild(msgSub)
  document.body.appendChild(msg)
  setTimeout(()=>{ msg.style.transition="opacity 1s"; msg.style.opacity="0"; setTimeout(()=>msg.remove(),1000) },4000)
}

/* ========================= */
/* AIDE RACCOURCIS MJ        */
/* ========================= */

function toggleGMShortcutHelp() {
  const existing = document.getElementById("gmShortcutHelp")
  if (existing) { existing.remove(); return }

  const overlay = document.createElement("div")
  overlay.id = "gmShortcutHelp"
  overlay.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(8,20,24,0.97);
    border:1px solid #1e5a66;
    box-shadow:0 0 0 1px #8a6520,0 0 30px rgba(0,0,0,0.9);
    border-radius:3px;padding:16px 20px;
    font-family:Cinzel,serif;
    z-index:999999999;pointer-events:auto;
    display:flex;flex-direction:column;gap:6px;
    min-width:280px;
    animation:shortcutFadeIn 0.15s ease;
  `

  const title = document.createElement("div")
  title.style.cssText = "font-size:10px;letter-spacing:3px;color:#1e8a9a;margin-bottom:8px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:6px;"
  title.innerText = "RACCOURCIS MJ"
  overlay.appendChild(title)

  const shortcuts = [
    { key:"M",   label:"Maps" },
    { key:"P",   label:"Personnages" },
    { key:"R",   label:"PNJ / High PNJ" },
    { key:"T",   label:"Mobs / PNJ Combat" },
    { key:"X",   label:"XP" },
    { key:"E",   label:"Éléments" },
    { key:"S",   label:"Sauvegarder" },
    { key:"J",   label:"Fiche joueur sélectionné" },
    { key:"B",   label:"Fiche Bibi" },
    { key:"Esc", label:"Fermer / Retour" },
    { key:"?",   label:"Cette aide" },
  ]

  shortcuts.forEach(({ key, label }) => {
    const row = document.createElement("div")
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:24px;"
    const labelEl = document.createElement("span")
    labelEl.style.cssText = "font-size:12px;color:#a0c8d0;"
    labelEl.innerText = label
    const keyEl = document.createElement("span")
    keyEl.style.cssText = "background:rgba(15,42,48,0.9);border:1px solid #2e6a78;border-radius:3px;font-size:11px;color:#5a9aaa;padding:2px 8px;min-width:28px;text-align:center;"
    keyEl.innerText = key
    row.appendChild(labelEl)
    row.appendChild(keyEl)
    overlay.appendChild(row)
  })

  // Fermeture au clic extérieur
  setTimeout(() => {
    document.addEventListener("mousedown", function close(ev) {
      if (!overlay.contains(ev.target)) { overlay.remove(); document.removeEventListener("mousedown", close) }
    })
  }, 50)

  document.body.appendChild(overlay)
}

// Injection style animation
;(function() {
  if (document.getElementById("gmShortcutStyle")) return
  const s = document.createElement("style")
  s.id = "gmShortcutStyle"
  s.textContent = `@keyframes shortcutFadeIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`
  document.head.appendChild(s)
})()


/* ========================= */
/* PNJ ALLIÉS — INVOCATION   */
/* ========================= */

function openAllyPNJPanel() {
  if (!isGM || !combatActive) return
  const existing = document.getElementById("allyPNJPanel")
  if (existing) {
    existing.remove()
    return
  }
  const panel = document.createElement("div"); panel.id = "allyPNJPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.97);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:16px;z-index:99999999;min-width:380px;max-width:92vw;max-height:82vh;overflow-y:auto;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#1e8a9a;margin-bottom:12px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;"
  const titleText = document.createElement("span")
  titleText.innerText = "⚔ INVOQUER UNE DIVINITÉ"
  const titleClose = document.createElement("span")
  titleClose.style.cssText = "cursor:pointer;color:#ff8888;font-size:14px;"
  titleClose.innerText = "✕"
  titleClose.onclick = () => {
    const panelEl = document.getElementById("allyPNJPanel")
    if (panelEl) panelEl.remove()
  }
  title.appendChild(titleText)
  title.appendChild(titleClose)
  panel.appendChild(title)

  db.ref("combat/usedAllies").once("value", snap => {
    const used = snap.val() || {}
    ALLY_PNJS.forEach(pnj => {
      const block = document.createElement("div"); block.style.cssText = "margin-bottom:14px;border-bottom:1px solid rgba(30,90,102,0.15);padding-bottom:12px;"
      const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;"
      const img = document.createElement("img"); img.src = "images/"+pnj.image; img.style.cssText = `width:40px;height:40px;border-radius:50%;border:2px solid ${pnj.color};object-fit:contain;box-shadow:0 0 10px ${pnj.color}44;`; img.onerror=()=>img.style.opacity="0.3"
      const info = document.createElement("div")
      const infoName = document.createElement("div")
      infoName.style.cssText = `font-size:14px;color:${pnj.color};letter-spacing:2px;text-shadow:0 0 8px ${pnj.color}88;`
      infoName.innerText = pnj.name
      const infoRole = document.createElement("div")
      infoRole.style.cssText = "font-size:10px;color:#5a9aaa;"
      infoRole.innerText = pnj.role
      info.appendChild(infoName)
      info.appendChild(infoRole)
      header.appendChild(img); header.appendChild(info); block.appendChild(header)

      pnj.actions.forEach(action => {
        const isUsed = !!used[action.id]
        const typeColors = { damage:"#ff7777", heal:"#77ff99", malus:"#ffaa44", buff:"#88aaff" }
        const typeLabels = { damage:"ATQ", heal:"SOIN", malus:"MALUS", buff:"BUFF" }
        const btn = document.createElement("div")
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:5px;border-radius:2px;border:1px solid ${isUsed?"rgba(30,90,102,0.15)":pnj.color+"55"};background:${isUsed?"rgba(5,15,20,0.3)":`rgba(8,20,24,0.9)`};cursor:${isUsed?"not-allowed":"pointer"};opacity:${isUsed?"0.4":"1"};transition:background 0.15s;`
        const iconEl = document.createElement("span")
        iconEl.style.fontSize = "20px"
        iconEl.innerText = action.icon
        const center = document.createElement("div")
        center.style.flex = "1"
        const labelEl = document.createElement("div")
        labelEl.style.cssText = `font-size:12px;color:${isUsed?"#444":pnj.color};letter-spacing:1px;`
        labelEl.innerText = action.label
        if (action.dice) {
          const diceEl = document.createElement("span")
          diceEl.style.cssText = "color:#8888ff;font-size:10px;"
          diceEl.innerText = " (D" + action.dice + ")"
          labelEl.appendChild(diceEl)
        }
        const descEl = document.createElement("div")
        descEl.style.cssText = "font-size:10px;color:#5a7a8a;margin-top:2px;"
        descEl.innerText = action.desc
        center.appendChild(labelEl)
        center.appendChild(descEl)
        const badge = document.createElement("span")
        badge.style.cssText = `font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(30,90,102,0.2);color:${typeColors[action.type]};letter-spacing:1px;`
        badge.innerText = isUsed ? "UTILISÉ" : typeLabels[action.type]
        btn.appendChild(iconEl)
        btn.appendChild(center)
        btn.appendChild(badge)
        if (!isUsed) {
          btn.onmouseenter=()=>btn.style.background=`rgba(20,40,52,0.95)`
          btn.onmouseleave=()=>btn.style.background=`rgba(8,20,24,0.9)`
          btn.onclick=()=>triggerAllyAction(pnj, action, panel)

          const grantBtn = document.createElement("button")
          grantBtn.innerText = "Donner"
          grantBtn.style.cssText = "padding:5px 8px;font-family:Cinzel,serif;font-size:10px;background:rgba(70,20,90,0.75);color:#f0d0ff;border:1px solid rgba(180,120,255,0.45);border-radius:3px;cursor:pointer;margin-left:6px;white-space:nowrap;"
          grantBtn.onclick = e => {
            e.stopPropagation()
            grantAllyActionToPlayers(pnj, action)
          }
          btn.appendChild(grantBtn)
        }
        block.appendChild(btn)
      })
      panel.appendChild(block)
    })
    document.body.appendChild(panel)
  })
}

function triggerAllyAction(pnj, action, panel) {
  if (!isGM && myToken && (action.type === "heal" || action.type === "buff")) {
    _executeAllyAction(pnj, action, myToken.id, panel)
    return
  }
  if (action.type === "heal" || action.type === "buff") { _allyChooseTarget(pnj, action, panel); return }
  _executeAllyAction(pnj, action, null, panel)
}

function _allyChooseTarget(pnj, action, panel) {
  const picker = document.createElement("div"); picker.id = "allyTargetPicker"
  picker.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid "+pnj.color+";border-radius:3px;padding:16px;z-index:999999999;font-family:Cinzel,serif;min-width:220px;"
  const pickerTitle = document.createElement("div")
  pickerTitle.style.cssText = `font-size:11px;color:${pnj.color};letter-spacing:2px;margin-bottom:12px;`
  pickerTitle.innerText = "CHOISIR LA CIBLE"
  picker.appendChild(pickerTitle)
  ;["greg","ju","elo","bibi"].forEach(pid => {
    const btn = document.createElement("button"); btn.style.cssText = "display:block;width:100%;padding:8px;margin-bottom:6px;font-family:Cinzel,serif;font-size:12px;background:rgba(10,30,38,0.8);color:#e0f0f4;border:1px solid rgba(30,90,102,0.5);border-radius:2px;cursor:pointer;text-align:left;"
    const img = document.createElement("img")
    img.src = "images/" + sanitizeAssetName(pid + ".png")
    img.style.cssText = "width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:8px;"
    btn.appendChild(img)
    btn.appendChild(document.createTextNode(pid.toUpperCase()))
    btn.onclick=()=>{ picker.remove(); _executeAllyAction(pnj, action, pid, panel) }
    picker.appendChild(btn)
  })
  const cancel = document.createElement("button"); cancel.style.cssText = "display:block;width:100%;padding:6px;font-family:Cinzel,serif;font-size:11px;background:rgba(80,20,20,0.4);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;"
  cancel.innerText = "✕ Annuler"; cancel.onclick=()=>picker.remove(); picker.appendChild(cancel)
  document.body.appendChild(picker)
}

function _executeAllyAction(pnj, action, targetId, panel) { return requestAllyCombatAction(pnj,action,targetId,panel) }

function showAllyActionResult(data) { /* Les jets et effets sont désormais résolus par le MJ, une seule fois. */ }

function _allyInvocationCinematic(pnj, action, targetId, onComplete) {
  // ÉTAPE 1 — Tremblement + flash
  screenShakeHard()
  setTimeout(()=>screenShakeHard(), 300)
  const flash = document.createElement("div"); flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:999999990;transition:opacity 0.05s;"
  document.body.appendChild(flash)
  setTimeout(()=>{ flash.style.opacity="0.7"; setTimeout(()=>{ flash.style.transition="opacity 0.4s"; flash.style.opacity="0"; setTimeout(()=>flash.remove(),400) },80) },50)

  // ÉTAPE 2 — Image du dieu + message solennel (après 600ms)
  setTimeout(()=>{
    const cinScreen = document.createElement("div"); cinScreen.id = "allyCinScreen"
    cinScreen.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999995;opacity:0;transition:opacity 0.6s ease;`

    // Image du dieu
    const img = document.createElement("img"); img.src = "images/"+pnj.image
    img.style.cssText = `max-height:45vh;object-fit:contain;filter:drop-shadow(0 0 30px ${pnj.color});opacity:0;transition:opacity 0.8s ease;margin-bottom:30px;`
    cinScreen.appendChild(img)

    // Nom du dieu
    const nameEl = document.createElement("div")
    nameEl.style.cssText = `font-family:'Cinzel Decorative','Cinzel',serif;font-size:36px;color:${pnj.color};letter-spacing:8px;text-shadow:0 0 20px ${pnj.color};opacity:0;transition:opacity 0.8s ease 0.3s;margin-bottom:14px;`
    nameEl.innerText = pnj.name.toUpperCase()
    cinScreen.appendChild(nameEl)

    // Message invocation
    const msgEl = document.createElement("div")
    msgEl.style.cssText = `font-family:'IM Fell English',serif;font-size:18px;color:rgba(220,210,255,0.85);font-style:italic;letter-spacing:2px;opacity:0;transition:opacity 0.8s ease 0.6s;text-align:center;max-width:500px;padding:0 20px;`
    msgEl.innerText = action.dialogue
    cinScreen.appendChild(msgEl)

    document.body.appendChild(cinScreen)

    // Son impact — fade out après 2s
    const impact = new Audio("audio/impact.mp3"); setManagedAudioBaseVolume(impact, 0.85); impact.play().catch(()=>{})
    setTimeout(()=>{ let iv=setInterval(()=>{ if(impact.volume>0.05) impact.volume=Math.max(0,impact.volume-0.06); else{ impact.pause(); clearInterval(iv) } },100) }, 2000)

    setTimeout(()=>{
      cinScreen.style.opacity = "1"
      setTimeout(()=>{ img.style.opacity="1"; nameEl.style.opacity="1"; msgEl.style.opacity="1" }, 50)
    }, 20)

    // ÉTAPE 3 — Après 4s, lancer le dé
    setTimeout(()=>{
      cinScreen.style.opacity = "0"
      setTimeout(()=>{ cinScreen.remove(); if(typeof onComplete==="function")onComplete() }, 600)
    }, 4000)
  }, 600)
}

// Aucun jet local après une invocation : le résultat partagé est présenté par presentation.js.

function _applyAllyResult() { /* Présentation uniquement ; la résolution est centralisée. */ }

function _playAllyAnim(animType, color, isCrit) {
  // Animation solennelle — voile coloré + particules lentes
  const overlay = document.createElement("div"); overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999990;opacity:0;transition:opacity 1.5s ease;`
  document.body.appendChild(overlay)

  // Voile de couleur discret
  const veil = document.createElement("div"); veil.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center, ${color}18 0%, transparent 70%);`
  overlay.appendChild(veil)

  // Particules lentes et rares
  const count = isCrit ? 12 : 6
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div")
    const size = 3 + Math.random() * 5
    p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};left:${10+Math.random()*80}%;top:${20+Math.random()*60}%;opacity:0;animation:allyParticle ${2+Math.random()*2}s ease-out ${Math.random()*1.5}s forwards;`
    overlay.appendChild(p)
  }

  // Ligne horizontale solennelle
  const line = document.createElement("div"); line.style.cssText = `position:absolute;top:50%;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,${color}66,transparent);transform:scaleX(0);transition:transform 1.2s ease;transform-origin:center;`
  overlay.appendChild(line)

  setTimeout(() => { overlay.style.opacity = "1"; line.style.transform = "scaleX(1)" }, 20)
  if (isCrit) { flashGold(); screenShakeHard() } else screenShake()
  setTimeout(() => { overlay.style.transition = "opacity 2s ease"; overlay.style.opacity = "0"; setTimeout(() => overlay.remove(), 2000) }, isCrit ? 3500 : 2500)
}

;(function(){
  if (document.getElementById("allyAnimStyle")) return
  const s = document.createElement("style"); s.id = "allyAnimStyle"
  s.textContent = `@keyframes allyParticle { 0%{opacity:0;transform:translateY(0) scale(0.5)} 20%{opacity:0.9} 100%{opacity:0;transform:translateY(-80px) scale(1.2)} }`
  document.head.appendChild(s)
})()

/* ========================= */
/* VUE LECTURE SEULE JOUEUR  */
/* ========================= */

function openAllyPNJViewer() {
  const existing = document.getElementById("allyViewerPanel"); if (existing) { existing.remove(); return }
  db.ref("game/playerAllyAccess").once("value", snap => {
    const access = snap.val()
    if (!access) {
      showNotification("Aucune invocation donnée par le MJ")
      return
    }

    let granted = null
    ALLY_PNJS.forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
    if (!granted) {
      showNotification("Invocation introuvable")
      return
    }

    const panel = document.createElement("div"); panel.id = "allyViewerPanel"
    panel.style.cssText = "position:fixed;bottom:80px;left:84px;background:rgba(8,20,24,0.97);border:1px solid rgba(140,80,255,0.4);box-shadow:0 0 0 1px rgba(80,40,160,0.3),0 0 30px rgba(0,0,0,0.9);border-radius:3px;padding:14px;z-index:99999999;min-width:300px;max-width:88vw;max-height:75vh;overflow-y:auto;font-family:Cinzel,serif;"

    const title = document.createElement("div"); title.style.cssText = "font-size:10px;letter-spacing:3px;color:#a880ff;margin-bottom:12px;border-bottom:1px solid rgba(140,80,255,0.2);padding-bottom:6px;display:flex;justify-content:space-between;"
    const titleLeft = document.createElement("span")
    titleLeft.innerText = "✦ INVOCATION AUTORISÉE"
    const titleRight = document.createElement("span")
    titleRight.style.cssText = "cursor:pointer;color:#ff8888;"
    titleRight.innerText = "✕"
    titleRight.onclick = () => {
      const panelEl = document.getElementById("allyViewerPanel")
      if (panelEl) panelEl.remove()
    }
    title.appendChild(titleLeft)
    title.appendChild(titleRight)
    panel.appendChild(title)

    const block = document.createElement("div"); block.style.cssText = "margin-bottom:6px;border-bottom:1px solid rgba(140,80,255,0.1);padding-bottom:10px;"
    const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:6px;"
    const img = document.createElement("img"); img.src = "images/"+granted.pnj.image; img.style.cssText = `width:36px;height:36px;border-radius:50%;border:1px solid ${granted.pnj.color}66;object-fit:contain;filter:grayscale(20%);`; img.onerror=()=>img.style.opacity="0.3"
    const info = document.createElement("div")
    info.innerHTML = `<div style="font-size:13px;color:${granted.pnj.color};letter-spacing:1px;">${granted.pnj.name}</div><div style="font-size:9px;color:#4a6a7a;font-style:italic;margin-top:2px;">${granted.pnj.lore}</div>`
    header.appendChild(img); header.appendChild(info); block.appendChild(header)

    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:flex-start;gap:8px;padding:8px 8px;margin-bottom:3px;border-radius:2px;border:1px solid rgba(140,80,255,0.2);background:rgba(8,15,22,0.6);"
    const rowIcon = document.createElement("span")
    rowIcon.style.cssText = "font-size:16px;margin-top:1px;"
    rowIcon.innerText = granted.action.icon
    const rowCenter = document.createElement("div")
    rowCenter.style.flex = "1"
    const rowLabel = document.createElement("div")
    rowLabel.style.cssText = `font-size:11px;color:${granted.pnj.color};letter-spacing:1px;`
    rowLabel.innerText = granted.action.label + " "
    const rowDice = document.createElement("span")
    rowDice.style.cssText = "color:#5555aa;font-size:9px;"
    rowDice.innerText = "(D" + granted.action.dice + ")"
    rowLabel.appendChild(rowDice)
    const rowDesc = document.createElement("div")
    rowDesc.style.cssText = "font-size:10px;color:#3a5a6a;margin-top:3px;line-height:1.5;"
    rowDesc.innerText = granted.action.desc
    rowCenter.appendChild(rowLabel)
    rowCenter.appendChild(rowDesc)
    const rowBadge = document.createElement("span")
    rowBadge.style.cssText = "font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(80,40,160,0.25);color:#d8b0ff;letter-spacing:1px;"
    rowBadge.innerText = "AUTORISÉE"
    row.appendChild(rowIcon)
    row.appendChild(rowCenter)
    row.appendChild(rowBadge)
    row.style.cursor = "pointer"
    row.style.transition = "background 0.15s,border-color 0.15s,transform 0.15s"
    row.onmouseenter = () => { row.style.background = "rgba(20,30,48,0.85)"; row.style.borderColor = granted.pnj.color + "88"; row.style.transform = "translateX(-2px)" }
    row.onmouseleave = () => { row.style.background = "rgba(8,15,22,0.6)"; row.style.borderColor = "rgba(140,80,255,0.2)"; row.style.transform = "" }
    row.onclick = () => triggerAllyAction(granted.pnj, granted.action, panel)
    block.appendChild(row)
    panel.appendChild(block)
    document.body.appendChild(panel)
  })
}

/* ========================= */
/* POINTS LIBRES — LEVEL UP  */
/* ========================= */

function showFreePointsPanel(playerID, points) {
  if (!canAccessCharacter(playerID)) return
  const existing = document.getElementById("freePointsPanel"); if (existing) existing.remove()
  if (points <= 0) return

  const panel = document.createElement("div"); panel.id = "freePointsPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:20px;z-index:999999999;min-width:320px;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#d4a835;margin-bottom:6px;text-align:center;"
  title.innerText = "✦ LEVEL UP ✦"
  panel.appendChild(title)

  const sub = document.createElement("div"); sub.style.cssText = "font-family:'IM Fell English',serif;font-size:13px;color:#6a9aaa;text-align:center;margin-bottom:16px;font-style:italic;"
  sub.innerText = "Répartissez vos points de capacité"
  panel.appendChild(sub)

  const counter = document.createElement("div"); counter.id = "freePointsCounter"; counter.style.cssText = "text-align:center;font-size:28px;color:#d4a835;margin-bottom:16px;letter-spacing:2px;"
  counter.innerText = points + " point" + (points > 1 ? "s" : "") + " restant" + (points > 1 ? "s" : "")
  panel.appendChild(counter)

  let remaining = points
  const changes = {}

  const stats = ["force","charme","perspi","chance","defense"]
  const statLabels = { force:"Force", charme:"Charme", perspi:"Perspicacité", chance:"Chance", defense:"Défense" }

  stats.forEach(stat => {
    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:6px 10px;background:rgba(10,30,38,0.6);border:1px solid rgba(30,90,102,0.3);border-radius:2px;"

    const label = document.createElement("div"); label.style.cssText = "font-size:12px;color:#a0c8d0;letter-spacing:1px;flex:1;"
    label.innerText = statLabels[stat]

    const addedEl = document.createElement("div"); addedEl.id = "fp_added_"+stat; addedEl.style.cssText = "font-size:11px;color:#d4a835;min-width:40px;text-align:center;"
    addedEl.innerText = "+0"

    const minus = document.createElement("button"); minus.innerText = "−"; minus.style.cssText = "width:26px;height:26px;font-size:16px;background:rgba(80,20,20,0.5);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;margin:0 4px;"
    minus.onclick = () => {
      if (!(changes[stat] > 0)) return
      changes[stat]--; remaining++
      addedEl.innerText = "+" + (changes[stat] || 0)
      counter.innerText = remaining + " point" + (remaining > 1 ? "s" : "") + " restant" + (remaining > 1 ? "s" : "")
      confirmBtn.disabled = remaining > 0; confirmBtn.style.opacity = remaining > 0 ? "0.4" : "1"
    }

    const plus = document.createElement("button"); plus.innerText = "+"; plus.style.cssText = "width:26px;height:26px;font-size:16px;background:rgba(20,60,80,0.5);color:#88ccdd;border:1px solid rgba(30,90,102,0.4);border-radius:2px;cursor:pointer;margin:0 4px;"
    plus.onclick = () => {
      if (remaining <= 0) return
      changes[stat] = (changes[stat] || 0) + 1; remaining--
      addedEl.innerText = "+" + changes[stat]
      counter.innerText = remaining + " point" + (remaining > 1 ? "s" : "") + " restant" + (remaining > 1 ? "s" : "")
      confirmBtn.disabled = remaining > 0; confirmBtn.style.opacity = remaining > 0 ? "0.4" : "1"
    }

    row.appendChild(label); row.appendChild(minus); row.appendChild(addedEl); row.appendChild(plus)
    panel.appendChild(row)
  })

  const confirmBtn = document.createElement("button"); confirmBtn.style.cssText = "width:100%;margin-top:12px;padding:10px;font-family:Cinzel,serif;font-size:13px;background:rgba(10,40,52,0.8);color:#a0c8d0;border:1px solid #1e5a66;border-radius:2px;cursor:pointer;opacity:0.4;letter-spacing:2px;transition:all 0.2s;"
  confirmBtn.innerText = "✦ Confirmer"; confirmBtn.disabled = true
  confirmBtn.onclick = async () => {
    if (!canAccessCharacter(playerID) || remaining !== 0 || window.__sessionBusy) return
    confirmBtn.disabled = true
    try {
      const result = await db.ref("characters/" + playerID).transaction(current => spendCharacterPoints(current, changes, points) || undefined)
      if (!result.committed) { showNotification("Ces points ont déjà été utilisés. Rouvrez la fiche."); return }
      panel.remove()
      showNotification("Stats améliorées !")
      flashGold()
      if (currentSheetPlayer === playerID) openCharacterSheet(playerID)
    } catch (error) { showNotification("Points non enregistrés : " + error.message) }
    finally { confirmBtn.disabled = remaining > 0 }
  }
  panel.appendChild(confirmBtn)

  document.body.appendChild(panel)
  flashGold()
}

function checkFreePoints(playerID) {
  if (!canAccessCharacter(playerID)) return
  db.ref("characters/" + playerID + "/freePoints").once("value", snap => {
    if (!canAccessCharacter(playerID)) return
    const pts = parseInt(snap.val()) || 0
    if (pts > 0) showFreePointsPanel(playerID, pts)
  })
}

/* ========================= */
/* OR / BOURSE               */
/* ========================= */

function toggleGoldInput() {
  const input   = document.getElementById("goldInput")
  const display = document.getElementById("goldDisplay")
  if (!input || !display) return
  const snd = new Audio("audio/coin.mp3"); setManagedAudioBaseVolume(snd, 0.7); snd.play().catch(()=>{})
  setTimeout(()=>{ let iv=setInterval(()=>{ if(snd.volume>0.05) snd.volume=Math.max(0,snd.volume-0.04); else{ snd.pause(); clearInterval(iv) } },100) }, 2000)
  const open = input.style.display !== "none"
  if (open) {
    input.style.display = "none"
    display.style.display = "block"
  } else {
    display.style.display = "none"
    input.style.display = "block"
    input.focus(); input.select()
  }
}

function saveGold() {
  if (!canAccessCharacter(currentSheetPlayer)) return
  if (!currentSheetPlayer) return
  const input = document.getElementById("goldInput"); if (!input) return
  const val = parseInt(input.value) || 0
  db.ref("characters/" + currentSheetPlayer + "/gold").set(val)
  // Fermer l'input et afficher la valeur
  input.style.display = "none"
  const display = document.getElementById("goldDisplay")
  if (display) { display.innerText = val + " po"; display.style.display = "block" }
  showNotification(val + " pièces d'or")
}

function loadGold(playerID) {
  if (!canAccessCharacter(playerID)) return
  db.ref("characters/" + playerID + "/gold").once("value", snap => {
    if (!canAccessCharacter(playerID) || currentSheetPlayer !== playerID) return
    const val = parseInt(snap.val()) || 0
    const input   = document.getElementById("goldInput")
    const display = document.getElementById("goldDisplay")
    if (input)   input.value = val
    if (display) { display.innerText = val + " po"; display.style.display = "block" }
  })
}

/* ========================= */
/* JOURNAL MJ — RÉDUIRE      */
/* ========================= */

function toggleMJLog() {
  const content = document.getElementById("mjLogContent")
  const btn     = document.getElementById("mjLogToggle")
  const log     = document.getElementById("mjLog")
  if (!content || !btn) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}

/* ========================= */
/* DOCUMENTS / INDICES       */
/* ========================= */

function toggleDiceLog() {
  const content = document.getElementById("diceLogContent")
  const btn = document.getElementById("diceLogToggle")
  const log = document.getElementById("diceLog")
  if (!content || !btn || !log) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}

function showDocument(image,title){if(!isGM)return;db.ref("game/document").set({image,title,time:Date.now()}).catch(error=>showNotification(error.message))}

function hideDocument() {
  if(!isGM)return
  db.ref("game/document").remove()
}

function _renderDocument(data) {
  const existing = document.getElementById("documentOverlay"); if (existing) existing.remove()
  if (!data) return

  const overlay = document.createElement("div"); overlay.id = "documentOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9999995;opacity:0;transition:opacity 0.8s ease;"

  const img = document.createElement("img"); img.src = (typeof resolveImagePath === "function") ? resolveImagePath(data.image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(data.image || "")) ? String(data.image || "") : "images/" + data.image)
  img.style.cssText = "max-height:80vh;max-width:80vw;object-fit:contain;filter:drop-shadow(0 20px 50px rgba(0,0,0,0.9));animation:pnjIdle 3s ease-in-out infinite;pointer-events:none;"
  img.onerror = () => img.style.opacity = "0.3"
  overlay.appendChild(img)

  // Bouton fermer — visible pour tous (tablettes sans Echap)
  const closeBtn = document.createElement("button")
  closeBtn.innerText = "✕"
  closeBtn.style.cssText = "position:fixed;top:18px;right:18px;width:42px;height:42px;border-radius:50%;background:rgba(20,12,8,0.95);border:1px solid rgba(212,168,53,0.6);color:#d4a835;font-size:20px;cursor:pointer;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.7);touch-action:manipulation;"
  closeBtn.onclick = () => { if (isGM) hideDocument(); else overlay.remove() }
  overlay.appendChild(closeBtn)

  document.body.appendChild(overlay)
  setTimeout(() => overlay.style.opacity = "1", 30)
  playSound("parcheminSound", 0.7)
}

function grantAllyActionToPlayers(pnj, action) {
  db.ref("game/playerAllyAccess").set({
    pnjName: pnj.name,
    actionId: action.id,
    time: Date.now()
  }).then(() => {
    showNotification("✦ " + action.label + " donnée aux joueurs")
  })
}
function toggleCollapsiblePanel(contentId, buttonId, panelId) {
  const content = document.getElementById(contentId)
  const btn = document.getElementById(buttonId)
  const panel = document.getElementById(panelId)
  if (!content || !btn || !panel) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  panel.style.maxHeight = collapsed ? "260px" : "auto"
}

toggleMJLog = function () {
  toggleCollapsiblePanel("mjLogContent", "mjLogToggle", "mjLog")
}

toggleDiceLog = function () {
  toggleCollapsiblePanel("diceLogContent", "diceLogToggle", "diceLog")
}

/* ========================= */
/* ESSAIM DE MOUCHES         */
/* ========================= */

function showFlySwarmEffect() {
  if (document.getElementById("flySwarmOverlay")) return // déjà actif

  // Base overlay — bleu brillant pulsant
  const ov = document.createElement("div")
  ov.id = "flySwarmOverlay"
  ov.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999974;opacity:0;transition:opacity 2s ease;background:radial-gradient(ellipse at center,rgba(140,210,255,0.28) 0%,rgba(60,140,255,0.18) 45%,rgba(0,20,80,0.22) 100%);animation:flySwarmPulse 2s ease-in-out infinite;"
  document.body.appendChild(ov)
  setTimeout(() => { ov.style.opacity = "1" }, 30)

  // Lueur centrale (orbe Thu'um)
  const glow = document.createElement("div")
  glow.id = "flySwarmGlow"
  glow.style.cssText = "position:fixed;top:50%;left:50%;width:500px;height:500px;pointer-events:none;z-index:9999975;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,0.75) 0%,rgba(160,225,255,0.55) 18%,rgba(80,170,255,0.3) 45%,transparent 72%);animation:flySwarmCenterPulse 1.8s ease-in-out infinite;filter:blur(22px);opacity:0;transition:opacity 2s ease;"
  document.body.appendChild(glow)
  setTimeout(() => { glow.style.opacity = "1" }, 100)

  // Anneaux de vent tourbillonnants
  const rings = document.createElement("div")
  rings.id = "flySwarmRings"
  rings.style.cssText = "position:fixed;top:50%;left:50%;pointer-events:none;z-index:9999976;opacity:0;transition:opacity 2.5s ease;"
  const ringDefs = [
    [110, 5, "windSwirlCW",  1.6, 0.85, 0],
    [185, 7, "windSwirlCCW", 2.4, 0.75, 0.3],
    [270, 5, "windSwirlCW",  3.1, 0.65, 0.6],
    [360, 8, "windSwirlCCW", 4.2, 0.55, 0.1],
    [145, 3, "windSwirlCCW", 1.2, 0.9,  0.8],
    [230, 4, "windSwirlCW",  2.8, 0.6,  0.4],
    [310, 6, "windSwirlCCW", 3.6, 0.5,  0.2],
  ]
  ringDefs.forEach(([r, t, anim, dur, alpha, delay]) => {
    const arc1 = document.createElement("div")
    arc1.style.cssText = `position:absolute;top:${-r}px;left:${-r}px;width:${r*2}px;height:${r*2}px;border:${t}px solid transparent;border-top-color:rgba(120,215,255,${alpha});border-right-color:rgba(80,180,255,${alpha*0.4});border-radius:50%;filter:blur(2px);animation:${anim} ${dur}s linear infinite;animation-delay:-${delay}s;`
    rings.appendChild(arc1)
    const arc2 = document.createElement("div")
    arc2.style.cssText = `position:absolute;top:${-r+8}px;left:${-r+8}px;width:${r*2-16}px;height:${r*2-16}px;border:${Math.max(2,t-2)}px solid transparent;border-bottom-color:rgba(200,240,255,${alpha*0.7});border-left-color:rgba(150,220,255,${alpha*0.25});border-radius:50%;filter:blur(3px);animation:${anim==="windSwirlCW"?"windSwirlCCW":"windSwirlCW"} ${dur*1.35}s linear infinite;animation-delay:-${delay+0.5}s;`
    rings.appendChild(arc2)
  })
  document.body.appendChild(rings)
  setTimeout(() => { rings.style.opacity = "1" }, 200)

  // Vignette bleue brillante sur les bords
  const flash = document.createElement("div")
  flash.id = "flySwarmFlash"
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999977;background:radial-gradient(ellipse at center,transparent 38%,rgba(40,110,255,0.35) 72%,rgba(100,200,255,0.6) 100%);opacity:0;transition:opacity 2.5s ease;"
  document.body.appendChild(flash)
  setTimeout(() => { flash.style.opacity = "1" }, 350)

  // Mouches (sombres pour contraster avec le bleu brillant)
  const buzzes = ["flyBuzz1", "flyBuzz2", "flyBuzz3"]
  for (let i = 0; i < 50; i++) {
    const fly = document.createElement("img")
    fly.src = "images/mouche.png"
    fly.className = "fly-particle"
    const size = 13 + Math.random() * 16
    const x = Math.random() * 100
    const y = Math.random() * 100
    const anim = buzzes[Math.floor(Math.random() * 3)]
    const dur = (0.25 + Math.random() * 0.42).toFixed(2)
    const delay = (Math.random() * 2).toFixed(2)
    fly.style.cssText = `position:fixed;left:${x}%;top:${y}%;width:${size}px;height:${size}px;object-fit:contain;pointer-events:none;z-index:9999979;opacity:0;transition:opacity 1.5s ease;animation:${anim} ${dur}s linear infinite;animation-delay:-${delay}s;filter:brightness(0.15) contrast(3);`
    document.body.appendChild(fly)
    setTimeout(() => { fly.style.opacity = (0.65 + Math.random() * 0.35).toFixed(2) }, 100 + i * 35)
  }

  // Son
  const snd = document.getElementById("flySwarmSound")
  if (snd) {
    snd.currentTime = 0; snd.volume = 0; snd.play().catch(() => {})
    let v = 0
    const fade = setInterval(() => { v = Math.min(v + 0.05, 0.75); snd.volume = v; if (v >= 0.75) clearInterval(fade) }, 100)
  }

}

function resetFlySwarmPresentation() {
  // 1. Mouches qui s'envolent
  document.querySelectorAll(".fly-particle").forEach(f => {
    const dx = ((Math.random() - 0.5) * 400).toFixed(0)
    const dy = (-(80 + Math.random() * 300)).toFixed(0)
    f.style.animation = "none"
    f.style.transition = "opacity 0.9s ease, transform 0.9s ease"
    f.style.transform = `translate(${dx}px, ${dy}px) scale(2.5)`
    f.style.opacity = "0"
    setTimeout(() => { if (f.parentNode) f.remove() }, 950)
  })

  // 2. pow.mp3 + message style Thu'um exact
  setTimeout(() => {
    const pow = new Audio("audio/pow.mp3")
    pow.volume = 0.85
    pow.play().catch(() => {})

    const screen = document.getElementById("thuumUnlockScreen")
    const image  = document.getElementById("thuumUnlockImage")
    const title  = document.getElementById("thuumUnlockTitle")
    const words  = document.getElementById("thuumUnlockWords")
    const player = document.getElementById("thuumUnlockPlayer")
    if (!screen || !title || !words) return

    if (image)  image.src   = "images/thuum.png"
    title.innerText          = "Un mot de pouvoir"
    words.innerText          = "apparaît gravé dans le sol"
    if (player) player.innerText = ""

    screen.style.display = "flex"
    requestAnimationFrame(() => screen.classList.add("active"))
    if (typeof screenShakeHard === "function") screenShakeHard()

    setTimeout(() => {
      screen.classList.remove("active")
      setTimeout(() => { screen.style.display = "none" }, 600)
    }, 6200)
  }, 500)

  // 3. Anneaux/lueur s'estompent pendant le message
  ;["flySwarmRings", "flySwarmGlow"].forEach(id => {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) { el.style.transition = "opacity 2s ease"; el.style.opacity = "0"; setTimeout(() => { if (el.parentNode) el.remove() }, 2100) }
    }, 4500)
  })

  // 4. Atmosphère bleue disparaît après le message
  ;["flySwarmOverlay", "flySwarmFlash"].forEach(id => {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) { el.style.transition = "opacity 2.5s ease"; el.style.opacity = "0"; setTimeout(() => { if (el.parentNode) el.remove() }, 2600) }
    }, 6000)
  })

  // 5. Son qui s'estompe
  const snd = document.getElementById("flySwarmSound")
  if (snd) {
    setTimeout(() => {
      let v = snd.volume
      const fade = setInterval(() => { v = Math.max(v - 0.03, 0); snd.volume = v; if (v <= 0) { clearInterval(fade); snd.pause(); snd.currentTime = 0 } }, 100)
    }, 3000)
  }
}

function showRuneVictory(){if(isGM)db.ref("game/runeVictory").set({time:Date.now(),id:db.ref("game/runeVictory").push().key})}
