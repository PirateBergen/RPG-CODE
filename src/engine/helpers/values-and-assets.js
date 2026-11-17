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

