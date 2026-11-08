"use strict"

/* ========================= */
/* HELPERS GÉNÉRAUX         */
/* ========================= */

// Shared lifecycle for local windows. Closing delegates to each window's save/cleanup rules.
window.GameWindows=(()=>{
 const entries=new Map();let order=0
 const visible=el=>{if(!el?.isConnected)return false;for(let node=el;node&&node.nodeType===1;node=node.parentElement){const css=getComputedStyle(node);if(node.hidden||css.display==="none"||css.visibility==="hidden")return false}return true}
 const prune=()=>{for(const el of entries.keys())if(!el.isConnected)entries.delete(el)}
 const top=()=>{prune();return [...entries.values()].filter(e=>visible(e.element)).sort((a,b)=>(parseInt(getComputedStyle(b.element).zIndex)||0)-(parseInt(getComputedStyle(a.element).zIndex)||0)||b.order-a.order)[0]}
 const focus=el=>{if(!visible(el)||el.disabled)return false;if(!el.matches("button,input,select,textarea,a[href],[tabindex]"))el.tabIndex=-1;el.focus({preventScroll:true});return document.activeElement===el}
 return {
  register(element,close,{returnFocus=document.activeElement,focusOnOpen=true}={}){if(!element)return;prune();const previous=entries.get(element);entries.set(element,{element,close,returnFocus:previous?.returnFocus||returnFocus,order:++order});element.__windowReturnFocus=previous?.returnFocus||returnFocus;if(focusOnOpen)focus(element)},
  closed(element,{restoreFocus=true}={}){const entry=entries.get(element);entries.delete(element);prune();if(!restoreFocus||!entry)return;const active=document.activeElement;if(active&&active!==document.body&&active.isConnected&&!element.contains(active))return;if(!focus(entry.returnFocus))focus(top()?.element)},
  closeTop(){const entry=top();if(!entry)return false;entry.close();return true}
 }
})()

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

function getEffectiveCharacterData(playerId, rawData = {}) {
  const data = { ...(rawData || {}) }
  const mods = Object.prototype.hasOwnProperty.call(data, "inventaire")
    ? getInventoryStatModifiers(data.inventaire || "")
    : (data.equipmentModifiers || {})
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


function getObjectKeyLoose(obj, wantedKey) {
  if (!obj || typeof obj !== "object") return null
  const wanted = String(wantedKey || "").toLowerCase()
  return Object.keys(obj).find(k => String(k || "").toLowerCase() === wanted) || null
}

function getObjectValueLoose(obj, wantedKey) {
  const key = getObjectKeyLoose(obj, wantedKey)
  return key ? obj[key] : null
}

function resolveImagePath(path) {
  if (/(?:^|\/)(?:ju(?: pion)?\.png|yusheet\.jpg)$/i.test(String(path || ""))) return /yusheet/i.test(path) ? "images/pika-sheet.svg" : /ju pion/i.test(path) ? "images/pika-full.png" : "images/pika-token.svg"
  const src = String(path || "")
  if (!src) return ""
  if (/^(https?:|data:|blob:|\/|images\/)/i.test(src)) return src
  return "images/" + src
}

function resolveAudioPath(path) {
  const src = String(path || "")
  if (!src) return ""
  if (/^(https?:|data:|blob:|\/|audio\/)/i.test(src)) return src
  return "audio/" + src
}

function sanitizeAssetName(name) {
  const value = String(name || "").trim()
  if (!value) return ""
  if (/^(https?:|data:|blob:|javascript:)/i.test(value)) return ""
  if (value.includes("..") || /[\\/]/.test(value)) return ""
  return value.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim()
}

function clampInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

function parseLocalStorageJSON(key, fallback) {
  if (typeof rpgStorageKey === "function") key = rpgStorageKey(key)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch (e) {
    console.warn("Invalid localStorage JSON for", key, e)
    return fallback
  }
}

function safeRemoveElement(id) {
  const el = typeof id === "string" ? document.getElementById(id) : id
  if (el && el.parentNode) el.parentNode.removeChild(el)
}

/* ========================= */
/* NOTIFICATIONS             */
/* ========================= */

function inferNotificationType(text) {
  const normalized = String(text || "").toLowerCase()
  if (
    normalized.includes("erreur") ||
    normalized.includes("incomplet") ||
    normalized.includes("introuvable") ||
    normalized.includes("corrompue") ||
    normalized.includes("corrompu") ||
    normalized.includes("refusé") ||
    normalized.includes("refuse") ||
    normalized.includes("ko") ||
    normalized.includes("tombé") ||
    normalized.includes("ne peut pas") ||
    normalized.includes("condition non remplie") ||
    normalized.includes("surchargé") ||
    normalized.includes("surcharge") ||
    normalized.includes("empoisonné") ||
    normalized.includes("saigne")
  ) return "danger"

  if (
    normalized.includes("gagne") ||
    normalized.includes("récupère") ||
    normalized.includes("recupere") ||
    normalized.includes("pièces d'or") ||
    normalized.includes("pieces d'or") ||
    normalized.includes("level up") ||
    normalized.includes("revient à la vie") ||
    normalized.includes("revient a la vie") ||
    normalized.includes("sauvegardé") ||
    normalized.includes("sauvegarde") ||
    normalized.includes("donnée aux joueurs") ||
    normalized.includes("donné aux joueurs")
  ) return "gain"

  if (
    normalized.includes("spéciale") ||
    normalized.includes("speciale") ||
    normalized.includes("faiblesse révélée") ||
    normalized.includes("faiblesse revelee") ||
    normalized.includes("pouvoir") ||
    normalized.includes("malédiction") ||
    normalized.includes("malediction") ||
    normalized.includes("skraa") ||
    normalized.includes("reihkt") ||
    normalized.includes("cri")
  ) return "special"

  return "info"
}

function showNotification(text, type) {
  text=pikaDisplayText(text)
  const box = document.getElementById("notification")
  if (!box) return
  const resolvedType = type || inferNotificationType(text)
  if (box.__hideTimer) clearTimeout(box.__hideTimer)
  box.dataset.type = resolvedType
  box.innerText = text
  box.style.opacity = 1
  box.__hideTimer = setTimeout(() => {
    box.style.opacity = 0
    box.dataset.type = ""
  }, 3000)
}

function addMJLog(text) {
  text = pikaDisplayText(text)
  const log = document.getElementById("mjLogContent")
  if (!log) return
  const entry = document.createElement("div")
  entry.className = "mjEntry"
  entry.innerText = text
  log.prepend(entry)
}

function pushCombatHit(from, to, amount, type, detail) {
  const turnState = typeof getCombatTurnState === "function" ? getCombatTurnState() : null
  const round = turnState ? (parseInt(turnState.round, 10) || 1) : 1
  const entry = { from, to, amount: parseInt(amount, 10) || 0, type, round, time: Date.now() }
  if (detail) entry.detail = String(detail)
  db.ref("combat/hits").push(entry).catch(err => console.error("pushCombatHit failed:", err))
}

function addCombatLog(text) {
  text = pikaDisplayText(text)
  const content = document.getElementById("diceLogContent")
  if (!content) return
  const entry = document.createElement("div")
  entry.className = "logEntry logCombat"
  entry.innerText = text
  content.prepend(entry)
  while (content.children.length > 30) content.removeChild(content.lastChild)

}

function addDiceLog(player, dice, result) {
  player = heroDisplayName(player)
  const log = document.getElementById("diceLog")
  const content = document.getElementById("diceLogContent") || log
  if (!content) return
  const entry = document.createElement("div")
  entry.classList.add("logEntry")
  if (player === "MJ") entry.classList.add("logMJ")
  let text = player + " → 🎲 d" + dice + " → " + result
  if (result === dice) { text += " CRIT"; entry.classList.add("logCrit") }
  if (result === 1)    { text += " FAIL";  entry.classList.add("logFail") }
  entry.innerText = text
  content.prepend(entry)
  addMJLog(text)
  while (content.children.length > 20) content.removeChild(content.lastChild)
}

function showXPMessage(amount) {
  const msg = document.createElement("div")
  msg.innerText = "+" + amount + " XP pour le groupe"
  msg.style.cssText = "position:fixed;left:50%;top:55%;transform:translate(-50%,0);font-family:Cinzel;font-size:40px;color:gold;text-shadow:0 0 10px gold,0 0 20px orange,0 0 40px gold;pointer-events:none;z-index:999999999;opacity:0;transition:all 1s ease;"
  document.body.appendChild(msg)
  setTimeout(() => { msg.style.opacity = "1"; msg.style.transform = "translate(-50%,-40px)" }, 50)
  setTimeout(() => { msg.style.opacity = "0"; msg.style.transform = "translate(-50%,-120px)" }, 2500)
  setTimeout(() => msg.remove(), 3500)
}

function typeWriter(text, element, speed = 60) {
  // Cancel any animation already running on this element
  if (element.__typeWriterTimer) { clearTimeout(element.__typeWriterTimer); element.__typeWriterTimer = null }
  element.textContent = ""
  const chars = Array.from(String(text || ""))   // split by Unicode code point, not UTF-16 unit
  let i = 0
  function type() {
    if (i < chars.length) {
      element.textContent += chars[i]
      i++
      element.__typeWriterTimer = setTimeout(type, speed)
    } else {
      element.__typeWriterTimer = null
    }
  }
  type()
}

/* ========================= */
/* EFFETS VISUELS            */
/* ========================= */

function screenShake() {
  const wrapper = document.getElementById("camera")
  if (!wrapper) return
  const intensity = 8, duration = 400, start = Date.now()
  function shake() {
    if (Date.now() - start < duration) {
      const x = (Math.random() - 0.5) * intensity
      const y = (Math.random() - 0.5) * intensity
      wrapper.style.transform = `scale(${cameraZoom}) translate(${cameraX + x}px, ${cameraY + y}px)`
      requestAnimationFrame(shake)
    } else { updateCamera() }
  }
  shake()
}

function screenShakeHard() {
  const camera = document.getElementById("camera")
  if (!camera) return
  let i = 0
  const interval = setInterval(() => {
    camera.style.transform = `scale(${cameraZoom * 1.01}) translate(${cameraX + (Math.random() * 20 - 10)}px, ${cameraY + (Math.random() * 20 - 10)}px)`
    if (++i > 25) { clearInterval(interval); updateCamera() }
  }, 40)
}

function flashGold() {
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:gold;opacity:0.4;pointer-events:none;z-index:4000;"
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 150)
}

function flashRed() {
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:red;opacity:0.4;pointer-events:none;z-index:8000;"
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 200)
}

function powerExplosion() {
  const exp = document.createElement("div")
  exp.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(circle,gold 0%,rgba(255,215,0,0.8) 30%,rgba(255,215,0,0.2) 60%,transparent 80%);border-radius:50%;pointer-events:none;z-index:9000;animation:explodePower 0.8s ease-out;"
  document.body.appendChild(exp)
  setTimeout(() => exp.remove(), 800)
}

function damageEffect(id) {
  const token = document.getElementById(id)
  if (!token) return
  token.classList.add("damageFlash")
  setTimeout(() => token.classList.remove("damageFlash"), 400)
}

function updateTokenGlow(id, hp) {
  const token = document.getElementById(id)
  if (!token) return
  token.classList.remove("lowHP", "midHP", "fullHP")
  if (hp > 60)      token.classList.add("fullHP")
  else if (hp > 30) token.classList.add("midHP")
  else              token.classList.add("lowHP")
}

function spawnPortal(tokenID) {
  const token = document.getElementById(tokenID)
  if (!token) return
  const portal = document.createElement("div")
  portal.className = "portalEffect"
  token.appendChild(portal)
  setTimeout(() => portal.remove(), 1500)
}

function spawnVictoryParticles() {
  const box = document.getElementById("storyImage")
  if (!box) return
  for (let i = 0; i < 25; i++) {
    const p = document.createElement("div")
    p.className = "victoryParticle"
    p.style.left = (40 + Math.random() * 20) + "%"
    p.style.top  = (50 + Math.random() * 10) + "%"
    p.style.animationDuration = (1 + Math.random() * 1.5) + "s"
    box.appendChild(p)
    setTimeout(() => p.remove(), 1500)
  }
}

function spawnParticles() {
  const container = document.getElementById("locationParticles")
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div")
    p.className = "particle"
    p.style.left = Math.random() * 100 + "%"
    p.style.bottom = "0px"
    p.style.animationDuration = (2 + Math.random() * 2) + "s"
    container.appendChild(p)
    setTimeout(() => p.remove(), 4000)
  }
}

function showLevelUpEffect(playerID) {
  const token = document.getElementById(playerID)
  if (!token) return
  const container = document.createElement("div")
  container.className = "levelUpContainer"
  const beam = document.createElement("div")
  beam.className = "levelBeam"
  container.appendChild(beam)
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div")
    p.className = "levelParticle"
    p.style.left = (Math.random() * 140 - 70) + "px"
    p.style.bottom = "0px"
    p.style.animationDuration = (1 + Math.random()) + "s"
    container.appendChild(p)
  }
  token.appendChild(container)
  setTimeout(() => container.remove(), 2000)
}

function showLevelUpText(player) {
  const msg = document.createElement("div")
  msg.innerText = "LEVEL UP"
  msg.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(0.5);font-family:Cinzel;font-size:80px;color:gold;text-shadow:0 0 10px gold,0 0 30px orange,0 0 60px gold;pointer-events:none;z-index:999999999;opacity:0;transition:all 0.6s ease;"
  document.body.appendChild(msg)
  setTimeout(() => { msg.style.opacity = "1"; msg.style.transform = "translate(-50%,-50%) scale(1.2)" }, 50)
  setTimeout(() => { msg.style.opacity = "0"; msg.style.transform = "translate(-50%,-50%) scale(1.8)" }, 2000)
  setTimeout(() => msg.remove(), 3000)
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

/* ========================= */
/* CAMÉRA                    */
/* ========================= */

function calculateMinZoom(){const map=document.getElementById("map");minZoom=map?.offsetWidth&&map?.offsetHeight?Math.max(window.innerWidth/map.offsetWidth,window.innerHeight/map.offsetHeight):1}

function clampCamera(){const map=document.getElementById("map");if(!map)return;const scale=cameraZoom||1;cameraX=Math.max(Math.min(0,(window.innerWidth-map.offsetWidth*scale)/scale),Math.min(0,cameraX));cameraY=Math.max(Math.min(0,(window.innerHeight-map.offsetHeight*scale)/scale),Math.min(0,cameraY))}

function updateCamera() {
  clampCamera()
  document.getElementById("camera").style.transform = `scale(${cameraZoom}) translate(${cameraX}px, ${cameraY}px)`
}

function syncCameraZoomToPlayers() { /* Zoom interactif désactivé. */ }

/* ========================= */
/* AUDIO                     */
/* ========================= */

function getUserEffectsVolume() {
  const raw = window.__userEffectsVolume
  const parsed = typeof raw === "number" ? raw : parseFloat(raw)
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed))
  return 0.8
}

function setUserEffectsVolume(volume) {
  const normalized = Math.max(0, Math.min(1, parseFloat(volume)))
  window.__userEffectsVolume = Number.isFinite(normalized) ? normalized : 0.8
  try { localStorage.setItem("rpg_effects_volume", String(window.__userEffectsVolume)) } catch (e) {}
  return window.__userEffectsVolume
}

function getUserMusicVolume() {
  const raw = window.__userMusicVolume
  const parsed = typeof raw === "number" ? raw : parseFloat(raw)
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed))
  return 0.8
}

function setUserMusicVolume(volume) {
  const normalized = Math.max(0, Math.min(1, parseFloat(volume)))
  window.__userMusicVolume = Number.isFinite(normalized) ? normalized : 0.8
  try { localStorage.setItem("rpg_music_volume", String(window.__userMusicVolume)) } catch (e) {}
  return window.__userMusicVolume
}

function getUserAudioVolume() {
  return getUserEffectsVolume()
}

function setUserAudioVolume(volume) {
  return setUserEffectsVolume(volume)
}

const EFFECTS_CLIP_GAINS={
  "spébibi.mp3": 0.5,
  "fart.mp3": 0.5,
  "krakenspé.mp3": 0.5,
  "whip.mp3": 0.5,
  "jormspé.mp3": 0.5,
  "spéju.mp3": 0.5,
  "roi.mp3": 0.5,
  "melenchon1.mp3": 0.5,
  "bombe.mp3": 0.5,
  "diceinv.mp3": 0.5,
  "pow.mp3": 0.5,
  "witch1.mp3": 0.5,
  "draugr.mp3": 0.5,
  "vampire spé.mp3": 0.5,
  "bandit.mp3": 0.5,
  "fantome.mp3": 0.5,
  "spéelo.mp3": 0.5,
  "victoire.mp3": 0.5,
  "combat.mp3": 0.5,
  "garde.mp3": 0.5,
  "fenrir.mp3": 0.5,
  "gobelinspé.mp3": 0.5,
  "generalmelenchon.mp3": 0.5,
  "crit.mp3": 0.5,
  "balrog.mp3": 0.5,
  "chnaws.mp3": 0.55,
  "curse1.mp3": 0.55,
  "cri.mp3": 0.55,
  "lvlup.mp3": 0.57,
  "jupower.mp3": 0.58,
  "impact.mp3": 0.58,
  "trine.mp3": 0.59,
  "gregpower.mp3": 0.6,
  "liquorice.mp3": 0.61,
  "curse.mp3": 0.61,
  "spell_cast.mp3": 0.64,
  "ogre.mp3": 0.66,
  "thuum.mp3": 0.66,
  "bark.mp3": 0.69,
  "dragonspé.mp3": 0.7,
  "pork.mp3": 0.7,
  "spell.mp3": 0.71,
  "ah.mp3": 0.71,
  "crit_player.mp3": 0.73,
  "nispé.mp3": 0.75,
  "curse2.mp3": 0.77,
  "defaite.mp3": 0.79,
  "power.mp3": 0.81
}
function getEffectsClipGain(audio){
 if(!audio)return 1
 const src=audio.currentSrc||audio.src||audio.querySelector?.('source')?.src||""
 let file=String(src).split(/[?#]/)[0].split('/').pop()||"";try{file=decodeURIComponent(file)}catch(e){}
 return EFFECTS_CLIP_GAINS[file.toLowerCase().normalize('NFC')]||1
}
function getScaledAudioVolume(volume = 1, channel = "effects", audio = null) {
  const base = Number.isFinite(parseFloat(volume)) ? Math.max(0, Math.min(1, parseFloat(volume))) : 1
  const userVolume = channel === "music" ? getUserMusicVolume() : getUserEffectsVolume()
  // Effects are deliberately quieter, including with previously saved sliders.
  const mixGain = channel === "music" ? 1 : 0.35
  return Math.max(0, Math.min(1, base * userVolume * mixGain * (channel === "music" ? 1 : getEffectsClipGain(audio))))
}

const managedAudioReferences=new WeakMap()
function trackManagedAudio(audio){
  window.__managedAudioInstances ||= new Set()
  let entry=managedAudioReferences.get(audio)
  if(!entry){
    entry=typeof WeakRef==="function"?new WeakRef(audio):audio;managedAudioReferences.set(audio,entry)
    const release=()=>window.__managedAudioInstances.delete(entry)
    audio.addEventListener?.("ended",release);audio.addEventListener?.("error",release)
    audio.addEventListener?.("pause",()=>{if(!audio.isConnected)release()})
    audio.addEventListener?.("play",()=>{window.__managedAudioInstances.add(entry);audio.volume=getScaledAudioVolume(audio.__baseVolume,audio.__audioChannel,audio)})
  }
  for(const item of window.__managedAudioInstances)if(typeof item?.deref==="function"&&!item.deref())window.__managedAudioInstances.delete(item)
  window.__managedAudioInstances.add(entry)
}

function setManagedAudioBaseVolume(audio, volume = 1, channel = "effects") {
  if (!audio) return audio
  audio.__baseVolume = Number.isFinite(parseFloat(volume)) ? Math.max(0, Math.min(1, parseFloat(volume))) : 1
  audio.__audioChannel = channel === "music" ? "music" : "effects"
  audio.volume = getScaledAudioVolume(audio.__baseVolume, audio.__audioChannel,audio)
  trackManagedAudio(audio)
  return audio
}

function inferAudioChannel(audio) {
  const id = String(audio?.id || "")
  if (["music", "musicA", "musicB", "auroraMusic", "forsureMusic", "sortPrisonMusic", "madnessLow", "madnessMid", "madnessHigh", "madnessPeak"].includes(id)) return "music"
  return "effects"
}

function syncManagedAudioVolumes() {
  document.querySelectorAll("audio").forEach(s => {
    const base = Number.isFinite(parseFloat(s.__baseVolume)) ? parseFloat(s.__baseVolume) : s.volume
    const channel = s.__audioChannel || inferAudioChannel(s)
    s.__baseVolume = base
    s.__audioChannel = channel
    s.volume = getScaledAudioVolume(base, channel,s)
  })
  if (!window.__managedAudioInstances) return
  Array.from(window.__managedAudioInstances).forEach(entry => {
    const audio=typeof entry?.deref==="function"?entry.deref():entry
    if (!audio || audio.ended) {
      window.__managedAudioInstances.delete(entry)
      return
    }
    const base = Number.isFinite(parseFloat(audio.__baseVolume)) ? parseFloat(audio.__baseVolume) : audio.volume
    const channel = audio.__audioChannel || inferAudioChannel(audio)
    audio.__baseVolume = base
    audio.__audioChannel = channel
    audio.volume = getScaledAudioVolume(base, channel,audio)
  })
}

function crossfadeMusic(newMusic) {
  if (
    auroraActive &&
    newMusic !== "aurore.mp3" &&
    newMusic !== "audio/aurore.mp3" &&
    newMusic !== "bifrost.mp3" &&
    newMusic !== "audio/bifrost.mp3"
  ) return

  const musicA = document.getElementById("musicA")
  const musicB = document.getElementById("musicB")
  if (!musicA || !musicB) return

  const normalizedMusic = /^(https?:|data:|blob:|\/|audio\/)/i.test(newMusic) ? newMusic : "audio/" + newMusic
  const targetVolume = getUserMusicVolume()

  const active = currentMusic === "A" ? musicA : musicB
  const activeSrc = active.src ? decodeURIComponent(active.src.replace(/.*\//, "").replace(/%20/g," ")) : ""
  const newSrc = normalizedMusic.replace(/.*\//, "").replace(/%20/g," ")

  if (activeSrc === newSrc && !active.paused && active.volume > Math.max(0.2, targetVolume * 0.4)) return

  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  _musicTransitioning = false
  _pendingMusic = null

  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  if (mA && mA !== active) { mA.pause(); mA.volume = 0 }
  if (mB && mB !== active) { mB.pause(); mB.volume = 0 }
  _musicTransitioning = true

  const next = currentMusic === "A" ? musicB : musicA
  next.pause()
  next.__baseVolume=1;next.__audioChannel="music";next.volume = 0

  const fadeOutIv = setInterval(() => {
    if (active.volume > 0.06) {
      active.volume = Math.max(0, active.volume - 0.1)
    } else {
      active.pause()
      active.volume = 0
      clearInterval(fadeOutIv)
      next.src = normalizedMusic
      next.loop = false
      next.__baseVolume=1;next.__audioChannel="music";next.volume = 0
      next.currentTime = 0
      next.play().catch(() => {})

      next.onended = null
      next._loopFadeSetup = true
      next.addEventListener("timeupdate", function _loopFade() {
        if (!next._loopFadeSetup) { next.removeEventListener("timeupdate", _loopFade); return }
        if (next.duration && next.currentTime > next.duration - 3 && !next._fading) {
          next._fading = true
          const fadeIv = setInterval(() => {
            if (next.volume > 0.05) {
              next.volume = Math.max(0, next.volume - 0.04)
            } else {
              clearInterval(fadeIv)
              next.currentTime = 0
              next.__baseVolume=1;next.__audioChannel="music";next.volume = 0
              next._fading = false
              next.play().catch(() => {})
              const fi = setInterval(() => {
                if (next.volume < getUserMusicVolume()) next.volume = Math.min(getUserMusicVolume(), next.volume + 0.05)
                else clearInterval(fi)
              }, 100)
            }
          }, 80)
        }
      })

      musicFadeInterval = setInterval(() => {
        if (next.volume < getUserMusicVolume()) {
          next.volume = Math.min(getUserMusicVolume(), next.volume + 0.05)
        } else {
          clearInterval(musicFadeInterval)
          musicFadeInterval = null
          currentMusic = currentMusic === "A" ? "B" : "A"
          _musicTransitioning = false
          if (_pendingMusic) {
            const pm = _pendingMusic
            _pendingMusic = null
            crossfadeMusic(pm)
          }
        }
      }, 150)
    }
  }, 60)
}

function stopAllMusic() {
  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  if (typeof clearAuroraTimers === "function") clearAuroraTimers()
  if (typeof stopAuroraMusic === "function") stopAuroraMusic(false)
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  if (mA) { mA.pause(); mA.volume = 0 }
  if (mB) { mB.pause(); mB.volume = 0 }
  ;["sortPrisonMusic", "auroraMusic", "forsureMusic"].forEach(id => {
    const el = document.getElementById(id)
    if (el) {
      try { el.pause() } catch (_) {}
      el.currentTime = 0
      el.volume = 0
    }
  })
  _musicTransitioning = false
  _pendingMusic = null
  currentMusic = "A"
}

function stopSpecialMusic(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (el.paused) return
  const iv = setInterval(() => {
    if (el.volume > 0.04) el.volume = Math.max(0, el.volume - 0.04)
    else { el.pause(); el.volume = 0; clearInterval(iv) }
  }, 80)
}

function fadeMusicOut(callback) {
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  let done = 0
  function fadeOne(m) {
    if (!m) { done++; if (done === 2 && callback) callback(); return }
    const iv = setInterval(() => {
      if (m.volume > 0.05) m.volume -= 0.05
      else { m.pause(); m.volume = 0; clearInterval(iv); done++; if (done === 2 && callback) callback() }
    }, 150)
  }
  fadeOne(mA)
  fadeOne(mB)
}

function playSound(id, volume = 0.8) {
  const snd = document.getElementById(id)
  if (!snd) return
  snd.currentTime = 0
  snd.__baseVolume = volume
  snd.__audioChannel = "effects"
  snd.volume = getScaledAudioVolume(volume, "effects",snd)
  snd.play().catch(() => {})
}

/* ========================= */
/* SANG / MALÉDICTION        */
/* ========================= */

function startBloodEffect(token) {
  if (!token || bloodIntervals[token.id]) return
  bloodIntervals[token.id] = setInterval(() => {
    if (!token.classList.contains("cursed")) { stopBloodEffect(token); return }
    spawnBloodDrop(token)
  }, 400 + Math.random() * 300)
}

function stopBloodEffect(token) {
  if (!token) return
  if (bloodIntervals[token.id]) { clearInterval(bloodIntervals[token.id]); delete bloodIntervals[token.id] }
  token.querySelectorAll(".bloodDrop, .bloodTrail").forEach(el => el.remove())
}

function spawnBloodDrop(token) {
  const angle  = (Math.random() * 180) + 10
  const rad    = angle * Math.PI / 180
  const radius = 36
  const cx     = 50 + Math.cos(rad) * radius
  const cy     = 50 + Math.sin(rad) * radius

  const trail = document.createElement("div")
  trail.className = "bloodTrail"
  trail.style.left = cx + "%"
  trail.style.top = cy + "%"
  trail.style.height = (4 + Math.random() * 8) + "px"
  trail.style.width  = (2 + Math.random() * 2) + "px"
  trail.style.animationDuration = (1.5 + Math.random()) + "s"
  token.appendChild(trail)

  const drop = document.createElement("div")
  drop.className = "bloodDrop"
  drop.style.left  = (cx - 1.5) + "%"
  drop.style.top = cy + "%"
  drop.style.width = (3 + Math.random() * 3) + "px"
  drop.style.animationDuration = (1.2 + Math.random() * 0.8) + "s"
  token.appendChild(drop)

  const dur = parseFloat(drop.style.animationDuration) * 1000
  setTimeout(() => { drop.remove(); trail.remove() }, dur + 100)
}

/* ========================= */
/* BIBI                      */
/* ========================= */

function tryBark() {
  const now = Date.now()
  if (now - lastBarkTime < barkCooldown) return
  if (Math.floor(Math.random() * 10) !== 0) return
  lastBarkTime = now
  const bark = document.getElementById("bark")
  if (bark) { bark.currentTime = 0; bark.__baseVolume = 0.35; bark.__audioChannel = "effects"; bark.volume = getScaledAudioVolume(0.35, "effects",bark); bark.play().catch(() => {}) }
  const barks = ["Wouf !", "Rrr !", "Snif !", "Miii !"]
  showBibiSpeech(barks[Math.floor(Math.random() * barks.length)])
}

function showBibiSpeech(text) {
  addMJLog("🐶 Bibi : " + text)
  const bibi = document.getElementById("bibi")
  if (!bibi) return
  const bubble = document.createElement("div")
  bubble.className = "speechBubble"
  bubble.innerText = text
  bibi.appendChild(bubble)
  setTimeout(() => bubble.remove(), 3000)
}

/* ========================= */
/* DRAG UTILITAIRE           */
/* ========================= */

function makeDraggable(element) {
  let isDragging = false, offsetX = 0, offsetY = 0
  element.addEventListener("mousedown", e => {
    isDragging = true
    offsetX = e.clientX - element.offsetLeft
    offsetY = e.clientY - element.offsetTop
    element.style.position = "fixed"
    element.style.zIndex   = 9999999
  })
  document.addEventListener("mousemove", e => {
    if (!isDragging) return
    element.style.left = (e.clientX - offsetX) + "px"
    element.style.top  = (e.clientY - offsetY) + "px"
  })
  document.addEventListener("mouseup", () => { isDragging = false })
}

/* ========================= */
/* MENU ÉTINCELLES           */
/* ========================= */

let menuSparkInterval = null

function spawnMenuSparks() {
  const count = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const spark = document.createElement("div")
      spark.className = "menuSpark"
      spark.style.left = (Math.random() * 96) + "%"
      spark.style.top  = (Math.random() * 96) + "%"
      spark.style.animationDuration = (0.8 + Math.random() * 0.7) + "s"
      const angle = Math.random() * Math.PI * 2
      spark.style.setProperty("--dx", Math.cos(angle).toFixed(2))
      spark.style.setProperty("--dy", Math.sin(angle).toFixed(2))
      const size = (3 + Math.random() * 5).toFixed(1) + "px"
      spark.style.width = size
      spark.style.height = size
      const colors = ["gold","#fff8c0","#ffd700","#ffcc44","#ffe88a","white","#ffaa00"]
      const c = colors[Math.floor(Math.random() * colors.length)]
      spark.style.background = c
      spark.style.boxShadow  = "0 0 6px " + c + ", 0 0 12px gold, 0 0 20px orange"
      document.body.appendChild(spark)
      setTimeout(() => spark.remove(), 1500)
    }, i * 120)
  }
}

function startMenuSparks() {
  if (menuSparkInterval) clearInterval(menuSparkInterval)
  menuSparkInterval = setInterval(spawnMenuSparks, 350)
}

function stopMenuSparks() {
  if (menuSparkInterval) { clearInterval(menuSparkInterval); menuSparkInterval = null }
  document.querySelectorAll(".menuSpark").forEach(s => s.remove())
}

/* ========================= */
/* BANDEROLE LIEU            */
/* ========================= */

let __showLocationDebounce = null
function showLocation(name) {
  if (__showLocationDebounce) { clearTimeout(__showLocationDebounce); __showLocationDebounce = null }
  __showLocationDebounce = setTimeout(() => { __showLocationDebounce = null; _showLocationImpl(name) }, 120)
}
function _showLocationImpl(name) {
  const banner = document.getElementById("locationBanner")
  const paper  = document.getElementById("locationPaper")
  const text   = document.getElementById("locationText")
  if (!banner || !paper || !text) return

  banner.style.display = "flex"
  banner.classList.add("visible")
  banner.style.opacity = "1"
  paper.style.width    = "540px"
  paper.style.height    = "360px"
  paper.style.minWidth = "540px"
  paper.style.minHeight = "360px"
  paper.classList.remove("open")
  text.classList.remove("show")
  text.innerHTML = ""

  spawnParticles()
  setTimeout(() => paper.classList.add("open"), 200)
  setTimeout(() => { text.classList.add("show"); typeWriter(name, text, 70) }, 800)
  setTimeout(() => {
    banner.style.opacity = "0"
    setTimeout(() => { banner.style.display = "none"; banner.classList.remove("visible") }, 1000)
    paper.classList.remove("open")
  }, 5000)
}

/* ========================= */
/* CHARGEMENT ASSETS         */
/* ========================= */

function preloadAssets() {
  Object.keys(mapMusic).forEach(map => {
    const img = new Image()
    img.src = "images/" + map
  })
  Object.values(mapMusic).forEach(aud => {
    const a = new Audio()
    a.src = aud.startsWith("audio/") ? aud : "audio/" + aud
  })
}

function scanAssets() {
  const images = Object.keys(mapMusic).concat([
    "greg.png","pika.png","pika-token.svg","pika-full.png","elo.png","bibi.png",
    "gregsheet.jpg","pika-sheet.svg","elosheet.jpg","bibisheet.jpg",
    "paper.png","paper1.png"
  ])
  images.forEach(img => {
    const test = new Image()
    test.onerror = () => console.warn("❌ IMAGE MANQUANTE → " + img)
    test.src = "images/" + img
  })
}

/* ========================= */
/* VOLUME SLIDER             */
/* ========================= */

document.addEventListener("DOMContentLoaded", () => {
  const musicSlider = document.getElementById("musicVolumeSlider")
  const effectsSlider = document.getElementById("effectsVolumeSlider")
  let initialMusicVolume = 0.8
  let initialEffectsVolume = 0.8
  try {
    const storedMusicVolume = parseFloat(localStorage.getItem("rpg_music_volume"))
    const storedEffectsVolume = parseFloat(localStorage.getItem("rpg_effects_volume"))
    const legacyVolume = parseFloat(localStorage.getItem("rpg_volume"))
    if (Number.isFinite(storedMusicVolume)) initialMusicVolume = Math.max(0, Math.min(1, storedMusicVolume))
    else if (Number.isFinite(legacyVolume)) initialMusicVolume = Math.max(0, Math.min(1, legacyVolume))
    if (Number.isFinite(storedEffectsVolume)) initialEffectsVolume = Math.max(0, Math.min(1, storedEffectsVolume))
    else if (Number.isFinite(legacyVolume)) initialEffectsVolume = Math.max(0, Math.min(1, legacyVolume))
  } catch (e) {}

  setUserMusicVolume(initialMusicVolume)
  setUserEffectsVolume(initialEffectsVolume)
  if (musicSlider) musicSlider.value = String(initialMusicVolume)
  if (effectsSlider) effectsSlider.value = String(initialEffectsVolume)
  syncManagedAudioVolumes()

  if (musicSlider) {
    musicSlider.addEventListener("input", () => {
      setUserMusicVolume(musicSlider.value)
      syncManagedAudioVolumes()
    })
  }

  if (effectsSlider) {
    effectsSlider.addEventListener("input", () => {
      setUserEffectsVolume(effectsSlider.value)
      syncManagedAudioVolumes()
    })
  }

  const sheet = document.getElementById("characterSheet")
  if (sheet) {
    sheet.addEventListener("wheel",     e => e.stopPropagation(), { passive: true })
    sheet.addEventListener("touchmove", e => e.stopPropagation(), { passive: true })
  }

  const combatPanel = document.getElementById("playerCombatPanel")
  if (combatPanel) {
    combatPanel.addEventListener("wheel",     e => e.stopPropagation(), { passive: true })
    combatPanel.addEventListener("touchmove", e => e.stopPropagation(), { passive: true })
  }

  document.querySelectorAll(".sheetField").forEach(field => {
    const isLongTextField = field.id === "inventaire" || field.id === "notes"
    field.addEventListener("input", () => {
      if (!isLongTextField) {
        if (typeof queueCharacterAutoSave === "function") queueCharacterAutoSave()
        else autoSaveCharacter()
      }
      updateWeightBar()
    })
    if (isLongTextField) {
      field.addEventListener("blur", () => {
        if (typeof queueCharacterAutoSave === "function") queueCharacterAutoSave(0)
        else autoSaveCharacter()
      })
      // Sur écran tactile : ouvrir l'éditeur flottant au lieu du clavier natif
      if (navigator.maxTouchPoints > 0) {
        field.setAttribute("readonly", "readonly")
        field.style.cursor = "pointer"
        field.addEventListener("touchend", e => {
          e.preventDefault()
          if (typeof openNotesEditor === "function") openNotesEditor(field)
        }, { passive: false })
      }
    }
  })

  document.querySelectorAll("#playerCombatPanel input").forEach(field => {
    field.addEventListener("input", () => saveCombatStats(field.id))
  })

  const input = document.getElementById("mobDamageInput")
  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return
      if (!isGM) return
      const damage = parseInt(input.value)
      if (isNaN(damage) || damage <= 0) return
      submitCombatAction("manualDamage",getCurrentCombatActorId()||"greg",{amount:damage,target:livingMobs(window.__combatSnapshot)[0]}).catch(error=>showNotification(error.message))
      input.value = ""
    })
  }

  document.addEventListener("click", e => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") document.body.focus()
  })
  document.addEventListener("mouseup", e => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      setTimeout(() => document.body.focus(), 0)
    }
  })
})
