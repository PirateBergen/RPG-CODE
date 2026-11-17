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





