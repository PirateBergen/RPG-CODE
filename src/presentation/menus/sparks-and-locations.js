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

// Prepare only the requested map. Music is loaded by its real playback channel.
const preparedMapAssets = new Set()
let pendingMapAsset = null
function preloadAssets(mapName = typeof currentMap === "string" ? currentMap : null) {
  if (typeof mapName !== "string" || !/^[^/\\?#]+\.(?:jpe?g|png|webp|svg)$/i.test(mapName)) return
  if (pendingMapAsset?.mapName === mapName) return
  if (pendingMapAsset) {
    pendingMapAsset.image.onload = pendingMapAsset.image.onerror = null
    pendingMapAsset.image.removeAttribute("src")
    pendingMapAsset = null
  }
  if (preparedMapAssets.has(mapName)) return
  const image = new Image()
  image.decoding = "async"
  image.fetchPriority = "low"
  pendingMapAsset = { mapName, image }
  const finish = loaded => {
    if (pendingMapAsset?.image !== image) return
    pendingMapAsset = null
    image.onload = image.onerror = null
    if (loaded) {
      preparedMapAssets.add(mapName)
      while (preparedMapAssets.size > 8) preparedMapAssets.delete(preparedMapAssets.values().next().value)
    }
  }
  image.onload = () => finish(true)
  image.onerror = () => finish(false)
  image.src = "images/" + mapName
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


})
