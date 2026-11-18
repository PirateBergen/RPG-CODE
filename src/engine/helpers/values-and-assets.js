function resolveCombatTokenPositions(combat, tokens = {}) {
  const positions={}
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
  for(const id of ["greg","ju","elo","bibi","mobToken","mobToken_mob2","mobToken_mob3","eloSummonToken"]){
    const saved=combat?.presentation?.positions?.[id]
    const live=id==="mobToken_mob2"?combat?.mob2:id==="mobToken_mob3"?combat?.mob3:id==="eloSummonToken"?combat?.eloSummon:tokens?.[id]
    const p=valid(live)?live:valid(saved)?saved:null
    if(p)positions[id]={x:p.x,y:p.y,facing:p.facing===1?1:0}
  }
  return positions
}

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



/* ========================= */
/* NOTIFICATIONS             */
/* ========================= */

