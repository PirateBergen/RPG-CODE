"use strict"

// Seuls ces champs sont partagés avec le groupe. Ne jamais ajouter notes,
// inventaire, gold, xp ou freePoints à cette liste.
const PLAYABLE_HEROES = ["greg", "ju", "elo"]
const CHARACTER_IDS = [...PLAYABLE_HEROES, "bibi"]
const PUBLIC_CHARACTER_FIELDS = ["lvl", "hp", "force", "charme", "perspi", "chance", "defense", "curse", "corruption", "poids", "equipmentModifiers", "carriedWeight"]
let characterAccessGeneration = 0
let characterAccessSubscriptions = []

function canAccessCharacter(id) {
  if (!CHARACTER_IDS.includes(id)) return false
  if (window.__authRole === "gm") return true
  const owner = window.__authPlayerId
  return !!(window.__authUid && PLAYABLE_HEROES.includes(owner) &&
    (id === owner || (id === "bibi" && owner === "greg")))
}

function readCharacter(id, onValue, onError) {
  if (!CHARACTER_IDS.includes(id)) return Promise.reject(new Error("Personnage inconnu"))
  const uid = window.__authUid
  const generation = characterAccessGeneration
  const promise = canAccessCharacter(id)
    ? db.ref("characters/" + id).once("value")
    : Promise.all(PUBLIC_CHARACTER_FIELDS.map(field =>
        db.ref("characters/" + id + "/" + field).once("value").then(s => [field, s.val()])
      )).then(entries => {
        const value = Object.fromEntries(entries.filter(([, value]) => value !== null))
        return { key: id, val: () => Object.keys(value).length ? value : null }
      })
  return promise.then(snapshot => {
    // Un résultat demandé sous une ancienne identité ne doit pas remplir la fiche.
    if (uid !== window.__authUid) {
      const error = new Error("Accès personnage modifié")
      if (onValue) { if (onError) onError(error); return null }
      throw error
    }
    // Les rôles/profils arrivent séparément pendant la connexion : refaire la
    // projection avec les droits actuels plutôt que signaler une erreur normale.
    if (generation !== characterAccessGeneration) return readCharacter(id, onValue, onError)
    if (onValue) onValue(snapshot)
    return snapshot
  }).catch(error => {
    if (onError) { onError(error); return null }
    throw error
  })
}

function stopCharacterSubscriptions() {
  characterAccessGeneration++
  characterAccessSubscriptions.forEach(({ ref, callback }) => ref.off("value", callback))
  characterAccessSubscriptions = []
}

function syncCharacterSubscriptions() {
  stopCharacterSubscriptions()
  if (!window.__authUid) return
  const generation = characterAccessGeneration
  const subscribe = (ref, callback) => {
    characterAccessSubscriptions.push({ ref, callback })
    ref.on("value", callback, error => console.warn("Lecture personnage refusée", error))
  }
  CHARACTER_IDS.forEach(id => {
    if (canAccessCharacter(id)) {
      subscribe(db.ref("characters/" + id), snapshot => {
        if (generation !== characterAccessGeneration) return
        const value = snapshot.val()
        if (value && !window.__sessionBusy) publishCharacterCombatSummary(id, value)
        watchCharacter(snapshot)
      })
      return
    }
    // Firebase ne filtre pas un parent : lire chaque champ public explicitement.
    const values = {}, received = new Set()
    let queued = false
    PUBLIC_CHARACTER_FIELDS.forEach(field => {
      subscribe(db.ref("characters/" + id + "/" + field), snapshot => {
        if (generation !== characterAccessGeneration) return
        const value = snapshot.val()
        if (value === null) delete values[field]
        else values[field] = value
        received.add(field)
        if (received.size !== PUBLIC_CHARACTER_FIELDS.length || queued) return
        queued = true
        queueMicrotask(() => {
          queued = false
          if (generation === characterAccessGeneration) {
            const value = { ...values }
            watchCharacter({ key: id, val: () => Object.keys(value).length ? value : null })
          }
        })
      })
    })
  })
}

function publishCharacterCombatSummary(id, data) {
  if (!canAccessCharacter(id)) return
  const equipmentModifiers = getInventoryStatModifiers(data.inventaire || "")
  const parsedWeight = typeof _parseInventoryWeight === "function" ? _parseInventoryWeight(data.inventaire || "") : null
  const carriedWeight = parsedWeight === null ? null : (Number.isFinite(parsedWeight) ? Math.max(0, parsedWeight) : 0)
  const updates = {}
  if (Object.keys(equipmentModifiers).some(stat => data.equipmentModifiers?.[stat] !== equipmentModifiers[stat])) updates.equipmentModifiers = equipmentModifiers
  if (carriedWeight !== null && data.carriedWeight !== carriedWeight) updates.carriedWeight = carriedWeight
  if (Object.keys(updates).length) {
    db.ref("characters/" + id).update(updates).catch(error => console.warn("Résumé de combat non synchronisé", error))
  }
}

function resetLocalCharacterAccess() {
  stopCharacterSubscriptions()
  clearTimeout(window.__sheetAutoSaveTimer)
  window.__sheetAutoSaveTimer = null
  if (typeof forceCloseCharacterSheetWithoutSave === "function") forceCloseCharacterSheetWithoutSave()
  ;["inventaire", "notes", "goldInput"].forEach(id => {
    const field = document.getElementById(id)
    if (field) field.value = ""
  })
  ;["notesEditorPanel", "freePointsPanel"].forEach(id => document.getElementById(id)?.remove())
  window.__sheetBaseCharacterData = null
  window.__sheetInventoryModifiers = null
  window.__combatPreviewPlayerId = null
  window.__localPlayerId = null
  try { localStorage.removeItem("rpg_local_player") } catch (e) {}
  window._previewSavedMyToken = null
  currentSheetPlayer = null
  myToken = null; window.myToken = null
  selected = null
  _state.tokenDragging = false
  _state.bibiData = {}
  window.__playerSelectionPending = false
  if (window.__freePointsRef && window.__freePointsCb) window.__freePointsRef.off("value", window.__freePointsCb)
  if (window.__localDefeatRef && window.__localDefeatCb) window.__localDefeatRef.off("value", window.__localDefeatCb)
  if (window.__combatStatsRef && window.__combatStatsCb) window.__combatStatsRef.off("value", window.__combatStatsCb)
  window.__combatInventoryModifiers = null
  document.querySelectorAll("#playerCombatPanel input").forEach(field => { field.value = "" })
  const goldDisplay = document.getElementById("goldDisplay")
  if (goldDisplay) goldDisplay.innerText = ""
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer", "gmSelected"))
  document.querySelectorAll(".gmSection").forEach(el => { el.style.display = "none" })
  ;["gmBar", "mjLog", "playerPreviewBtn", "combatHUD", "playerAttackBtn", "menuMini"].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = "none"
  })
  const select = document.getElementById("playerSelect")
  if (select) { select.style.display = "none"; select.style.opacity = "1" }
  isGM = false
}
