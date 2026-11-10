"use strict"

// Une session contient toutes les branches de jeu, jamais les comptes ni les sauvegardes.
const SESSION_BRANCHES = ["characters", "tokens", "elements", "game", "combat", "events", "curse", "diceRoll"]
function persistenceStorageKey(key) { return typeof rpgStorageKey === "function" ? rpgStorageKey(key) : key }
const SAVE_SCHEMA_VERSION = 3
let persistenceClientId = null
let persistenceUserId = null
let persistenceSubscriptions = []
let persistenceOperation = null
let persistenceRevision = undefined
let progressionPromise = null
let sessionLockRecoveryTimer = null
const pendingSessionWrites = new Set()
let sessionWriteErrors = []
window.__sessionBusy = false

function installSessionWriteTracking(database) {
  const original = database.ref.bind(database)
  database.ref = (...args) => {
    const ref = original(...args)
    const branch = String(args[0] || "").replace(/^\//, "").split("/")[0]
    if (!SESSION_BRANCHES.includes(branch)) return ref
    return new Proxy(ref, { get(target, key) {
      const value = Reflect.get(target, key, target)
      if (typeof value !== "function") return value
      if (!["set", "update", "remove", "transaction", "push"].includes(key)) return value.bind(target)
      return (...params) => {
        const result = value.apply(target, params)
        if (key === "push" && !params.length) return result
        if (result && typeof result.then === "function") {
          pendingSessionWrites.add(result)
          result.then(() => pendingSessionWrites.delete(result), error => {
            pendingSessionWrites.delete(result); sessionWriteErrors.push(error)
          })
        }
        return result
      }
    } })
  }
}

async function drainSessionWrites() {
  const deadline = Date.now() + 10000
  while (pendingSessionWrites.size) {
    if (Date.now() > deadline) throw new Error("Des modifications attendent encore leur confirmation")
    await Promise.race([Promise.allSettled([...pendingSessionWrites]), new Promise(resolve => setTimeout(resolve, 100))])
  }
  if (sessionWriteErrors.length) {
    const error = sessionWriteErrors[0]; sessionWriteErrors = []
    throw new Error("Une modification a été refusée : " + error.message)
  }
}

function cloneSession(value) { return JSON.parse(JSON.stringify(value)) }

function initialSession() {
  const characters = {}
  CHARACTER_IDS.forEach(id => {
    const stats = getPlayerStatsAtLevel(id, 1)
    characters[id] = { ...stats, lvl: 1, xp: 0, curse: 0, corruption: 0,
      freePoints: 0, gold: 0, inventaire: "", notes: "", progressionRewardedLevel: 1,
      equipmentModifiers: { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }, carriedWeight: 0 }
  })
  Object.assign(characters.ju, {name:"Pika",race:"Elfe",class:"Barde",gift:"Appétit abyssal",buildVersion:"pika-bard-v1"})
  return { characters, tokens: { greg: { x: 320, y: 340, facing: 0 }, ju: { x: 420, y: 340, facing: 0 },
    elo: { x: 520, y: 340, facing: 0 }, bibi: { x: 620, y: 340, facing: 0 } },
    game: { map: "taverne.jpg", groupMadness: 0, worldMapFogTopLeftHidden: false },
    elements: null, combat: null, events: null, curse: null, diceRoll: null }
}

// Compatibility cleanup only: retired preparations must never apply or block a restored game.
function discardRetiredFreeActionData(state){
 if(!state||typeof state!=="object")return false
 let changed=false
 for(const key of ["pendingGMAction","gmActionEvents"])if(state.game&&Object.hasOwn(state.game,key)){delete state.game[key];changed=true}
 if(state.combat?.pendingResolution?.source?.kind==="free"){delete state.combat.pendingResolution;changed=true}
 if(state.combat?.lastAction?.result?.mode==="free"){delete state.combat.lastAction;changed=true}
 for(const [id,event]of Object.entries(state.combat?.visualEvents||{}))if(event?.result?.mode==="free"){delete state.combat.visualEvents[id];changed=true}
 if(state.game?.combatOutcome?.finalAction?.result?.mode==="free"){delete state.game.combatOutcome.finalAction;changed=true}
 for(const [id,request]of Object.entries(state.combatRequests||{}))if(request?.kind==="free"&&request.status==="queued"){state.combatRequests[id]={...request,status:"failed",error:"Cette ancienne commande a été supprimée."};changed=true}
 return changed
}

function captureSession(root) {
  const state = {}
  SESSION_BRANCHES.forEach(key => { state[key] = root[key] ?? null })
  const snapshot=cloneSession(state);discardRetiredFreeActionData(snapshot);return snapshot
}

function validateSessionJSON(value, depth = 0) {
  if (depth > 64) throw new Error("Sauvegarde trop profonde")
  if (value === null || typeof value === "boolean" || typeof value === "string") return
  if (typeof value === "number" && Number.isFinite(value)) return
  if (typeof value !== "object") throw new Error("Valeur de sauvegarde invalide")
  Object.entries(value).forEach(([key, child]) => {
    if (/[.#$\[\]\/]/.test(key) || /[\u0000-\u001f\u007f]/.test(key)) throw new Error("Clé de sauvegarde invalide")
    validateSessionJSON(child, depth + 1)
  })
}

function sessionFromSave(save) {
  if (!save || typeof save !== "object" || Array.isArray(save)) throw new Error("Sauvegarde invalide")
  if (save._schemaVersion > SAVE_SCHEMA_VERSION) throw new Error("Cette sauvegarde nécessite une version plus récente du jeu")
  const state = captureSession(save)
  if (!state.characters || Array.isArray(state.characters) || !state.tokens || Array.isArray(state.tokens) || typeof state.game?.map !== "string" || !state.game.map) throw new Error("Sauvegarde incomplète : personnages, positions ou carte absents")
  CHARACTER_IDS.forEach(id => {
    const c = state.characters[id], t = state.tokens[id]
    if (!c || !t || !Number.isFinite(c.hp) || !Number.isFinite(c.lvl) ||
        !Number.isFinite(t.x) || !Number.isFinite(t.y)) throw new Error("Sauvegarde incomplète pour " + id.toUpperCase())
  })
  validateSessionJSON(state)
  return state // Conserver tous les champs, y compris les pouvoirs et attributs futurs.
}

function saveTimestamp(save) {
  if (Number.isFinite(save?._savedAt)) return save._savedAt
  // Ancien format français : le tri alphabétique des dates choisissait parfois la mauvaise partie.
  const match = String(save?._saveDate || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[^\d]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  return match ? new Date(+match[3], +match[2] - 1, +match[1], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0)).getTime() : 0
}

function sortedSaveEntries(records) {
  const entries = []
  // Les anciens noms contenaient parfois des dates avec « / » : Firebase
  // les a stockés sous plusieurs niveaux de dossiers.
  const visit = (node, prefix = "", depth = 0) => {
    if (!node || typeof node !== "object" || depth > 64) return
    Object.entries(node).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return
      const id = prefix ? prefix + "/" + key : key
      if (value.characters) entries.push([id, value])
      else visit(value, id, depth + 1)
    })
  }
  visit(records)
  return entries.sort(([a, x], [b, y]) => saveTimestamp(y) - saveTimestamp(x) || b.localeCompare(a))
}

function validSaveId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 1024 &&
    !/[.#$\[\]\u0000-\u001f\u007f]/.test(id) && id.split("/").every(part => part.length > 0)
}

function requirePersistenceGM() {
  if (window.__authRole !== "gm" || !isGM) throw new Error("Cette action est réservée au MJ")
}

function setSessionBusy(busy, message = "Synchronisation de la partie…") {
  window.__sessionBusy = busy
  if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()
  let overlay = document.getElementById("sessionSyncOverlay")
  if (!busy) { overlay?.remove(); return }
  if (!overlay) {
    overlay = document.createElement("div"); overlay.id = "sessionSyncOverlay"
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;color:#f5e6c8;font:18px Georgia,serif;text-align:center;padding:24px;"
    overlay.setAttribute("role", "status"); overlay.setAttribute("aria-live", "polite")
    document.body.appendChild(overlay)
  }
  overlay.textContent = message
}

async function flushSessionEdits(preserve = true) {
  clearTimeout(window.__sheetAutoSaveTimer); window.__sheetAutoSaveTimer = null
  if (window.__playerAttackResolving || window.__mobAttackResolving || window.__curseResolving ||
      Date.now() < (window.__diceResolutionUntil || 0) || window.__combatOutcomeShowing || combatStarting) throw new Error("Une action est encore en cours. Attendez sa résolution.")
  if (!preserve) {
    if (typeof forceCloseCharacterSheetWithoutSave === "function") forceCloseCharacterSheetWithoutSave()
    document.getElementById("notesEditorPanel")?.remove()
    selected = null
    await drainSessionWrites()
    return
  }
  const editor = document.getElementById("notesEditorPanel")
  if (editor) throw new Error("Validez ou annulez l’éditeur de notes/inventaire avant de continuer.")
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.style.display !== "none" && currentSheetPlayer && canAccessCharacter(currentSheetPlayer)) {
    window.__sheetFlushAuthorized=true
    try{if (!await saveCharacter()) throw new Error("La fiche ouverte n’a pas pu être enregistrée")}finally{window.__sheetFlushAuthorized=false}
  }
  // Déplacement en cours : le figer à sa dernière position affichée avant l’instantané.
  if (selected && CHARACTER_IDS.includes(selected.id) && canAccessCharacter(selected.id)) {
    const token=selected,id=token.id,x=Math.round(parseFloat(token.style.left)||0),y=Math.round(parseFloat(token.style.top)||0),facing=token.classList.contains("faceLeft")?1:0
    await db.ref("tokens/"+id).update({x,y,facing,...(id==="bibi"&&typeof _state!=="undefined"&&_state.tokenDragging?{followGreg:false}:{})})
    if(id==="greg"&&typeof explorationBibiPosition==="function")await db.ref("tokens/bibi").transaction(current=>explorationBibiPosition(current,{x:x+80,y,facing},false))
    selected=null
    if(typeof _state!=="undefined"){_state.tokenDragging=false;_state.tokenDragStart=null}
  }
  if (progressionPromise) await progressionPromise
  await drainSessionWrites()
}

function stopPersistenceSync() {
  clearTimeout(sessionLockRecoveryTimer)
  persistenceSubscriptions.forEach(([ref, event, cb]) => ref.off(event, cb))
  persistenceSubscriptions = []
  if (persistenceUserId && persistenceClientId) {
    db.ref("sessionClients/" + persistenceUserId + "/" + persistenceClientId).remove().catch(() => {})
    db.ref("profiles/"+persistenceUserId+"/clientVersions/"+persistenceClientId).remove().catch(()=>{})
  }
  persistenceUserId = null; persistenceClientId = null; persistenceRevision = undefined
  setSessionBusy(false)
}

function startPersistenceSync(uid) {
  if (persistenceUserId === uid) return
  stopPersistenceSync()
  if (!uid) return
  persistenceUserId = uid; persistenceClientId = db.ref("sessionClients/" + uid).push().key
  const listen = (ref, event, cb) => { ref.on(event, cb); persistenceSubscriptions.push([ref, event, cb]) }
  const presence = db.ref("sessionClients/" + uid + "/" + persistenceClientId)
  listen(db.ref(".info/connected"), "value", snap => {
    if (!snap.val() || persistenceUserId !== uid) return
    presence.onDisconnect().remove().then(() => {if(persistenceUserId===uid)return presence.set(true)}).catch(error => console.warn("Présence de session", error))
    const version=db.ref("profiles/"+uid+"/clientVersions/"+persistenceClientId)
    version.onDisconnect().remove().then(()=>{if(persistenceUserId===uid&&window.__actionOnline!==false)return version.set(String(window.GAME_V||"inconnue").slice(0,40))}).catch(()=>{})
  })
  listen(db.ref("sessionControl"), "value", snap => {
    const control = snap.val() || {}
    if (persistenceUserId !== uid) return
    if (persistenceRevision === undefined) persistenceRevision = control.revision || null
    if ((control.revision || null) !== persistenceRevision) {
      setSessionBusy(true, "Ouverture de la partie…")
      try { sessionStorage.setItem(persistenceStorageKey("rpg_session_transition"), control.action || "load") } catch (e) {}
      if (persistenceOperation !== control.revision) window.location.reload()
      return
    }
    const wasBusy = window.__sessionBusy
    setSessionBusy(!!control.phase)
    clearTimeout(sessionLockRecoveryTimer)
    if (control.phase) sessionLockRecoveryTimer = setTimeout(() => recoverExpiredSessionLock().catch(error => console.warn(error)), Math.max(1000, 121000 - (Date.now() - (control.startedAt || 0))))
    if (wasBusy && !control.phase && typeof syncCharacterSubscriptions === "function") syncCharacterSubscriptions()
    if (!control.phase || !control.id) return
    const ackPath = "sessionAcks/" + control.id + "/" + uid + "/" + persistenceClientId
    flushSessionEdits(["saving","migrating"].includes(control.phase)).then(() => db.ref(ackPath).set({ ok: true }))
      .catch(error => db.ref(ackPath).set({ ok: false, error: String(error.message).slice(0, 300) }).catch(() => {}))
  })
}

function awaitSessionClients(control, clients) {
  const expected = []
  Object.entries(clients || {}).forEach(([uid, tabs]) => Object.keys(tabs || {}).forEach(tab => expected.push([uid, tab])))
  if (!expected.length) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const ref = db.ref("sessionAcks/" + control.id)
    const finish = error => { clearTimeout(timer); ref.off("value", callback); error ? reject(error) : resolve() }
    const callback = snap => {
      const acks = snap.val() || {}
      const failed = expected.map(([u, t]) => acks[u]?.[t]).find(a => a?.ok === false)
      if (failed) return finish(new Error(failed.error || "Un joueur n’a pas pu synchroniser sa fiche"))
      if (expected.every(([u, t]) => acks[u]?.[t]?.ok === true)) finish()
    }
    const timer = setTimeout(() => finish(new Error("Un joueur ne répond pas. Réessayez après sa reconnexion ou sa déconnexion.")), 15000)
    ref.on("value", callback, finish)
  })
}

async function withSessionOperation(phase, action) {
  requirePersistenceGM()
  if (persistenceOperation) throw new Error("Une sauvegarde ou un chargement est déjà en cours")
  const id = db.ref("sessionAcks").push().key
  persistenceOperation = id
  let acquired = false, committed = false
  try {
    const previous = (await db.ref("sessionControl").once("value")).val() || {}
    const connected = (await db.ref(".info/connected").once("value")).val()
    if (!connected) throw new Error("Connexion nécessaire pour enregistrer ou restaurer la partie")
    await flushSessionEdits(["saving","migrating"].includes(phase))
    const clients = (await db.ref("sessionClients").once("value")).val() || {}
    const control = { id, phase, revision: previous.revision || null, startedAt: Date.now(), owner: window.__authUid }
    const lock = await db.ref("sessionControl").transaction(current => {
      if (current?.phase && Date.now() - (current.startedAt || 0) < 120000) return undefined
      return { ...control, revision: current?.revision || null }
    })
    if (!lock.committed) throw new Error("Une autre opération est en cours sur cette partie")
    acquired = true
    setSessionBusy(true)
    await awaitSessionClients(control, clients)
    const value = await action({ id, control, markCommitted: () => { committed = true } })
    return value
  } finally {
    if (acquired && !committed) {
      await db.ref("sessionControl").transaction(current => current?.id === id ? { revision: current.revision || null } : undefined)
        .catch(error => console.error("Fin de synchronisation non confirmée", error))
    }
    if (acquired) db.ref("sessionAcks/" + id).remove().catch(() => {})
    persistenceOperation = null
    if (!committed) setSessionBusy(false)
  }
}



async function listGameSaves() {
  requirePersistenceGM()
  try { return { entries: sortedSaveEntries((await db.ref("saves").once("value")).val()), local: false } }
  catch (error) { return { entries: sortedSaveEntries(parseLocalStorageJSON("rpg_saves", {})), local: true } }
}

async function saveGame() {
  try {
    requirePersistenceGM()
    const name = prompt("Nom de la sauvegarde :", "Partie " + new Date().toLocaleString("fr-FR"))
    if (name === null || !name.trim()) return false
    if (name.trim().length > 120) throw new Error("Le nom est limité à 120 caractères")
    return await withSessionOperation("saving", async () => {
      await reconcilePartyProgression(true)
      await captureSessionPresentation()
      await drainSessionWrites()
      const root = (await db.ref().once("value")).val() || {}
      const state = captureSession(root)
      sessionFromSave(state)
      const archives=db.__campaignLayout?.()===2?(await db.ref("saves").once("value")).val():root.saves
      const previous=sortedSaveEntries(archives||{})[0]?.[1]
      const now = Math.max(Date.now(),saveTimestamp(previous)+1), id = "current"
      const save = { ...state, _schemaVersion: SAVE_SCHEMA_VERSION, _savedAt: now, _saveName: name.trim(), _saveDate: new Date(now).toLocaleString("fr-FR") }
      const next={current:save,...(previous?{previous}:{})}
      if(typeof reliablePut==="function")await reliablePut("saves",next,undefined,true)
      else await db.ref("saves").set(next)
      try{localStorage.setItem(persistenceStorageKey("rpg_saves"),JSON.stringify(next));localStorage.setItem(persistenceStorageKey("rpg_save"),JSON.stringify(save))}catch(e){console.warn("Copie locale indisponible",e)}
      if(db.__isolatedTest&&db.__storageStatus?.failed){showNotification("Sauvegarde de l’essai conservée uniquement en mémoire. Gardez cet onglet ouvert et utilisez l’export de secours.");return false}
      showNotification("Sauvegardé : " + save._saveName)
      return true
    })
  } catch (error) { if(typeof noteGMDiagnosticIssue==="function")noteGMDiagnosticIssue("La dernière tentative de sauvegarde a échoué. Vérifiez la sauvegarde indiquée avant de quitter.");showNotification("Sauvegarde impossible : " + error.message); console.error(error); return false }
}

async function replaceSession(state, action, operation) {
  const lock = (await db.ref("sessionControl").once("value")).val()
  if (lock?.id !== operation.id) throw new Error("La synchronisation a été interrompue. Réessayez le chargement.")
  const payload = {}
  SESSION_BRANCHES.forEach(key => { payload[key] = state[key] ?? null })
  if (typeof migratePikaCharacter === "function") migratePikaCharacter(payload.characters?.ju)
  payload.combatRequests = null
  payload.explorationRequests = null
  payload.characterRequests = null
  payload.sessionControl = { revision: operation.id, action, changedAt: Date.now() }
  if(typeof reliableRootTransaction==="function"){
    const result=await reliableRootTransaction(current=>{if(current?.sessionControl?.id!==operation.id)throw Error("Le chargement a été interrompu");return {...current,...payload}},true)
    if(!result.committed)throw Error("Chargement non confirmé")
  }else await db.ref().update(payload) // Remplacement atomique, sans file d’attente hors ligne.
  operation.markCommitted()
  try { sessionStorage.setItem(persistenceStorageKey("rpg_session_transition"), action) } catch (e) {}
  window.location.reload() // Seulement après confirmation serveur pour le MJ initiateur.
  return true
}

async function _applyLoadData(data, callback) {
  const state = sessionFromSave(data) // Validation AVANT le moindre changement de session.
  const success = await withSessionOperation("loading", operation => replaceSession(state, "load", operation))
  if (callback) callback()
  return success
}

async function loadGame() {
  try {
    requirePersistenceGM()
    const { entries, local } = await listGameSaves()
    const data = entries[0]?.[1] || parseLocalStorageJSON("rpg_save", null)
    if (!data) throw new Error("Aucune sauvegarde disponible")
    if (local) showNotification("Chargement de la copie locale : serveur inaccessible")
    return await _applyLoadData(data)
  } catch (error) { showNotification("Chargement impossible : " + error.message); console.error(error); return false }
}

async function loadSave(id) {
  try {
    requirePersistenceGM()
    if (!validSaveId(id)) throw new Error("Identifiant de sauvegarde invalide")
    let save
    try { save = (await db.ref("saves/" + id).once("value")).val() }
    catch (error) { save = parseLocalStorageJSON("rpg_saves", {})[id]; if (save) showNotification("Chargement de la copie locale") }
    if (!save) throw new Error("Sauvegarde introuvable")
    return await _applyLoadData(save)
  } catch (error) { showNotification("Chargement impossible : " + error.message); console.error(error); return false }
}

async function deleteSave(id) {
  try {
    requirePersistenceGM()
    if (!validSaveId(id)) throw new Error("Identifiant de sauvegarde invalide")
    if (!confirm("Supprimer cette sauvegarde ?")) return false
    await db.ref("saves/" + id).remove()
    const records = parseLocalStorageJSON("rpg_saves", {}); delete records[id]
    try {
      localStorage.setItem(persistenceStorageKey("rpg_saves"), JSON.stringify(records))
      const latest = sortedSaveEntries(records)[0]?.[1]
      if (latest) localStorage.setItem(persistenceStorageKey("rpg_save"), JSON.stringify(latest)); else localStorage.removeItem(persistenceStorageKey("rpg_save"))
    } catch (error) { console.warn(error) }
    showSaveMenu(); return true
  } catch (error) { showNotification("Suppression impossible : " + error.message); return false }
}

async function newGame() {
  try {
    requirePersistenceGM()
    if (!confirm("Commencer une nouvelle partie ? La partie en cours sera réinitialisée. Les sauvegardes et les comptes seront conservés.")) return false
    const state = initialSession()
    return await withSessionOperation("resetting", operation => replaceSession(state, "new", operation))
  } catch (error) { showNotification("Nouvelle partie impossible : " + error.message); console.error(error); return false }
}

function progressCharacters(characters) {
  if (!characters) return characters
  const next = cloneSession(characters)
  PLAYABLE_HEROES.forEach(id => {
    const c = next[id]; if (!c) return
    const previous = Math.min(99, Math.max(1, parseInt(c.lvl, 10) || 1))
    let level = previous
    while (level < 99 && (Number(c.xp) || 0) >= xpForLevel(level + 1)) level++
    if (level === previous) return
    const before = getPlayerStatsAtLevel(id, previous), after = getPlayerStatsAtLevel(id, level)
    allStats.forEach(stat => { c[stat] = (Number(c[stat]) || 0) + after[stat] - before[stat] })
    c.lvl = level; c.hp = after.hp; c.poids = after.poids
    const rewarded = Math.max(previous, Number(c.progressionRewardedLevel) || previous)
    c.freePoints = (Number(c.freePoints) || 0) + Math.max(0, level - rewarded) * 2
    c.progressionRewardedLevel = Math.max(rewarded, level)
    if (id === "greg" && next.bibi) {
      const b = next.bibi, bLevel = Math.min(99, Math.max(1, Number(b.lvl) || 1))
      if (level > bLevel) {
        const bBefore = getPlayerStatsAtLevel("bibi", bLevel), bAfter = getPlayerStatsAtLevel("bibi", level)
        allStats.forEach(stat => { b[stat] = (Number(b[stat]) || 0) + bAfter[stat] - bBefore[stat] })
        b.lvl = level; b.hp = bAfter.hp; b.poids = bAfter.poids
      }
    }
  })
  return next
}

function spendCharacterPoints(character, changes, count) {
  if (!character || !Number.isInteger(count) || count <= 0 || (Number(character.freePoints) || 0) < count) return null
  const entries = Object.entries(changes)
  if (entries.some(([stat, amount]) => !allStats.includes(stat) || !Number.isInteger(amount) || amount < 0) ||
      entries.reduce((sum, [, amount]) => sum + amount, 0) !== count) return null
  const next = cloneSession(character)
  entries.forEach(([stat, amount]) => { next[stat] = (Number(next[stat]) || 0) + amount })
  next.freePoints = (Number(next.freePoints) || 0) - count
  return next
}

function reconcilePartyProgression(force = false) {
  if (window.__authRole !== "gm" || (!force && window.__sessionBusy)) return Promise.resolve(false)
  if (progressionPromise) return progressionPromise
  progressionPromise = db.ref("characters").transaction(current => {
    if (!current) return undefined
    const next = progressCharacters(current)
    return JSON.stringify(next) === JSON.stringify(current) ? undefined : next
  }).finally(() => { progressionPromise = null })
  return progressionPromise
}

async function captureSessionPresentation() {
  if (!gameStarted) return
  await db.ref("game/sessionView").set({ cameraX, cameraY, cameraZoom })
  if (!combatActive) return
  const positions = {}
  ;[...CHARACTER_IDS, "mobToken", "mobToken_mob2", "mobToken_mob3", "eloSummonToken"].forEach(id => {
    const token = document.getElementById(id)
    if (!token || token.style.display === "none") return
    const x = parseFloat(token.style.left), y = parseFloat(token.style.top)
    if (Number.isFinite(x) && Number.isFinite(y)) positions[id] = { x, y, facing: token.classList.contains("faceLeft") ? 1 : 0 }
  })
  await db.ref("combat/presentation").set({ positions })
}

async function awaitResumeSessionPresentation() {
  if (!gameStarted || window.__sessionBusy) return
  try {
    const [gameSnap, combatSnap, tokensSnap, curseSnap] = await Promise.all([db.ref("game").once("value"), db.ref("combat").once("value"), db.ref("tokens").once("value"), db.ref("curse/wheel").once("value")])
    const game = gameSnap.val() || {}, combat = combatSnap.val() || {}, tokens = tokensSnap.val() || {}
    if (window.__sessionBusy) return
    if (game.sessionView) {
      cameraX = Number(game.sessionView.cameraX) || 0; cameraY = Number(game.sessionView.cameraY) || 0
      calculateMinZoom(); cameraZoom = minZoom
      clampCamera(); updateCamera()
    }
    Object.entries(tokens).forEach(([id, position]) => {
      const token = document.getElementById(id)
      if (token) { token.style.left = position.x + "px"; token.style.top = position.y + "px"; token.classList.toggle("faceLeft", position.facing === 1) }
    })
    window.playerThuumData = game.playerThuum || {}; window.playerThuumAccessData = game.playerThuumAccess || {}
    window.readLoreBooksData = game.readLoreBooks || {}; window.mapLoreBookData = game.mapLoreBook || null
    window.playerAllyAccessData = game.playerAllyAccess || null
    cemeteryEventDone = !!(game.completedEvents?.cemetery || game.cemeterySpell)
    if (typeof refreshActivePNJs === "function") refreshActivePNJs()
    if(typeof syncSharedExplorationState==="function")syncSharedExplorationState(game)
    document.getElementById("runeChallengeOverlay")?.remove()
    window.activeRuneChallengeData=game.runeChallenge?.active?game.runeChallenge:null
    updateRuneMenuBtn(!!window.activeRuneChallengeData)
    // Épreuve restaurée par le contrôleur partagé.
    if(typeof syncCemeteryPresentation==="function")syncCemeteryPresentation(game.cemeterySpell||null)
    if (game.wantedBoardOpen) openWantedBoard(true)
    presentSavedCurseWheel(curseSnap.val())
    updateMadnessUI(game.groupMadness || 0); updateWorldMapFogTopLeft(); updateMapLoreBookVisibility(); updateThuumButton()
    if(game.combatOutcome&&typeof observeCombatEnding==="function"){if(game.combatState?.id)window.__localCombatId=game.combatState.id;observeCombatEnding(game.combatOutcome)}
    if (!game.combatState?.active || !combat.mob || combat.phase === "finished") return
    currentMap = game.combatState.returnMap || game.map || "taverne.jpg"
    window.__localCombatId=combat.id
    currentMob = combat.mob.name; combatActive = true; combatStarting = false
    activeMobSlots = { mob: true, mob2: !!combat.mob2, mob3: !!combat.mob3 }
    _state.pendingExtraMobs = {}
    setGameState("COMBAT")
    const tier = combat.mob.tier || game.combatState.tier || "weak"
    document.getElementById("map").style.backgroundImage = "url('images/" + _getCombatArenaMap(currentMob, tier) + "')"
    fadeToCombat(); spawnMobToken(currentMob)
    ;["mob2", "mob3"].forEach(slot => { if (combat[slot]) { _state.pendingExtraMobs[slot] = combat[slot].name; spawnExtraMobToken(combat[slot], slot) } })
    if (combat.eloSummon) spawnEloSummonToken(combat.eloSummon)
    Object.entries(combat.presentation?.positions || {}).forEach(([id, position]) => {
      const token = document.getElementById(id)
      if (token) { token.style.left = position.x + "px"; token.style.top = position.y + "px"; token.classList.toggle("faceLeft", position.facing === 1) }
    })
    window.__combatTurnState = combat.turnState || null
    window.usedThuumData = combat.usedThuum || {}
    renderAllMobPanels(); showCombatHUD(); loadPlayerCombatStats()
    if (combat.turnState) renderCombatInitiativeOverlay(combat.turnState)
    updateCombatTokenStateVisuals(); renderCombatStatusPanel()
    if (isGM) { document.getElementById("gmDamagePanel").style.display = "block"; document.getElementById("gmCombatButtons").style.display = "flex" }
  } catch (error) { showNotification("Affichage de la partie incomplet : " + error.message); console.error(error) }
}

;["click", "pointerdown", "mousedown", "keydown"].forEach(type => document.addEventListener(type, event => {
  if (window.__sessionBusy) { event.preventDefault(); event.stopImmediatePropagation() }
}, true))


async function recoverExpiredSessionLock() {
  if (window.__authRole !== "gm" || persistenceOperation) return false
  const result = await db.ref("sessionControl").transaction(current => {
    if (!current?.phase || Date.now() - (current.startedAt || 0) < 120000) return undefined
    return { revision: current.revision || null }
  })
  return result.committed
}

function resolveCharacterCurse(character, playerId, rollId, resultIndex) {
  if (playerId === "bibi" || !character || !rollId || character.lastCurseResolution?.id === rollId) return null
  const next = cloneSession(character)
  switch (resultIndex) {
    case 0: { const hp = Number.isFinite(Number(next.hp)) ? Math.max(0, Number(next.hp)) : 0; next.hp = hp === 0 ? 0 : Math.max(1, Math.floor(hp * 0.6)); break }
    case 1: { const stat = playerMainStat[playerId]; if (stat) next[stat] = Math.max(0, (Number(next[stat]) || 0) - 4); break }
    case 2: next.cursedEffect = "critOnly"; break
    case 3: { const items = String(next.inventaire || "").split("\n").filter(s => s.trim()); items.pop(); next.inventaire = items.join("\n"); break }
    default: return null
  }
  next.lastCurseResolution = { id: rollId, result: resultIndex }
  return next
}

// Portable copies contain game state only, never accounts or hero ownership.
const SAVE_FILE_MAX_BYTES = 20 * 1024 * 1024
async function saveFileDigest(text) {
  if (!globalThis.crypto?.subtle) throw Error("La vérification des fichiers nécessite une connexion HTTPS et un navigateur récent")
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,"0")).join("")
}
function portableSaveData(save) {
  const state = sessionFromSave(save)
  return {...state, _schemaVersion:SAVE_SCHEMA_VERSION, _savedAt:saveTimestamp(save), _saveName:String(save._saveName || "Copie de partie").slice(0,120), _saveDate:String(save._saveDate || "")}
}
async function encodeSaveFile(save) {
  const payload=JSON.stringify(portableSaveData(save))
  if(new TextEncoder().encode(payload).length>SAVE_FILE_MAX_BYTES)throw Error("Sauvegarde trop volumineuse pour un fichier (20 Mo maximum)")
  const file=JSON.stringify({format:"prophetie-des-mouches",version:1,mode:window.__isolatedTestMode?"test":"campaign",checksum:await saveFileDigest(payload),payload},null,2)
  if(new TextEncoder().encode(file).length>SAVE_FILE_MAX_BYTES)throw Error("Sauvegarde trop volumineuse pour un fichier (20 Mo maximum)")
  return file
}
async function decodeSaveFile(text) {
  if(typeof text!=="string"||new TextEncoder().encode(text).length>SAVE_FILE_MAX_BYTES)throw Error("Fichier trop volumineux (20 Mo maximum)")
  const safeParse=value=>JSON.parse(value,(key,child)=>{if(["__proto__","prototype","constructor"].includes(key))throw Error("Clé de fichier interdite");return child})
  let file
  try{file=safeParse(text)}catch(error){throw Error("Fichier JSON invalide ou non autorisé")}
  if(file?.format!=="prophetie-des-mouches"||file.version!==1||typeof file.payload!=="string"||typeof file.checksum!=="string")throw Error("Ce fichier n’est pas une copie de sauvegarde reconnue")
  const mode=window.__isolatedTestMode?"test":"campaign"
  if(file.mode!==mode)throw Error(mode==="campaign"?"Ce fichier provient d’un essai local. Importez-le dans une partie test.":"Ce fichier provient de la campagne. Revenez à la campagne pour l’importer.")
  if(await saveFileDigest(file.payload)!==file.checksum)throw Error("Le fichier est endommagé ou a été modifié : import refusé")
  let save
  try{save=safeParse(file.payload)}catch(error){throw Error("Contenu de sauvegarde invalide")}
  return portableSaveData(save)
}
async function exportSaveFile(id) {
  try{
    requirePersistenceGM()
    if(!validSaveId(id))throw Error("Sauvegarde invalide")
    const {entries}=await listGameSaves(),save=entries.find(([key])=>key===id)?.[1]
    if(!save)throw Error("Sauvegarde introuvable")
    const text=await encodeSaveFile(save),blob=new Blob([text],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a")
    link.href=url;link.download="prophetie-"+(window.__isolatedTestMode?"test-":"campagne-")+new Date().toISOString().replace(/[:.]/g,"-")+".json";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
    showNotification("Copie de sauvegarde téléchargée. Conservez ce fichier : il contient les fiches et notes privées.")
    return true
  }catch(error){showNotification("Export impossible : "+error.message);return false}
}
async function importSaveFile(file) {
  try{
    requirePersistenceGM()
    if(!file||file.size>SAVE_FILE_MAX_BYTES)throw Error("Fichier trop volumineux (20 Mo maximum)")
    const save=await decodeSaveFile(await file.text())
    requirePersistenceGM()
    const message="Copie vérifiée : "+save._saveName+"\n"+(save._saveDate||"Date inconnue")+"\nCarte : "+save.game.map+(save.combat?.id?"\nCombat en cours":"")+"\n\nAjouter cette copie aux sauvegardes ? La sauvegarde actuelle deviendra la précédente ; l’ancienne précédente sera remplacée. La partie en cours ne sera pas chargée automatiquement."
    if(!confirm(message))return false
    await withSessionOperation("saving",async()=>{
      const records=(await db.ref("saves").once("value")).val()||{},previous=sortedSaveEntries(records)[0]?.[1]
      const imported={...save,_savedAt:Math.max(Date.now(),saveTimestamp(previous)+1),_saveName:("Copie — "+save._saveName).slice(0,120)}
      const next={current:imported,...(previous?{previous}:{})}
      if(typeof reliablePut==="function")await reliablePut("saves",next,undefined,true);else await db.ref("saves").set(next)
      try{localStorage.setItem(persistenceStorageKey("rpg_saves"),JSON.stringify(next));localStorage.setItem(persistenceStorageKey("rpg_save"),JSON.stringify(imported))}catch(error){console.warn("Copie locale indisponible",error)}
    })
    showNotification("Copie importée. Choisissez « Charger » pour la restaurer.")
    await showSaveMenu();return true
  }catch(error){showNotification("Import impossible : "+error.message);return false}
}
function chooseSaveFile() {
  try{requirePersistenceGM()}catch(error){showNotification(error.message);return}
  const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=()=>{if(input.files?.[0])importSaveFile(input.files[0])};input.click()
}
