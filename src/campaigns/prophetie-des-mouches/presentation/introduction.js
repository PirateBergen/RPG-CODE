function startIntro() {
  const entranceEpoch=window.__entranceEpoch
  startMenuSparks()
  stopAllMusic()
  preloadAssets()
  setGameState("INTRO")
  setTimeout(()=>{if(window.__entranceEpoch===entranceEpoch&&!gameStarted)animateGameTitle()}, 2000)
  const start = document.getElementById("startScreen")
  start.classList.add("fadeOut")
  setTimeout(() => {
    if(window.__entranceEpoch!==entranceEpoch||gameStarted)return
    start.style.display = "none"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
    showIntroLayer()
    const music = document.getElementById("music"); music.volume = 0; music.play().catch(() => {})
    if (typeof setManagedAudioBaseVolume === "function") {
      setManagedAudioBaseVolume(music, 0, "music")
      const fade = setInterval(() => {
        const base = parseFloat(music.__baseVolume) || 0
        if (base < 1) {
          const newBase = Math.min(1, base + 0.05)
          music.__baseVolume = newBase
          music.volume = (typeof getScaledAudioVolume === "function") ? getScaledAudioVolume(newBase, "music") : newBase
        } else clearInterval(fade)
      }, 200)
    } else {
      music.__baseVolume = 1; music.__audioChannel = "music"
      const targetVolume = (typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8
      let v = 0
      const fade = setInterval(() => { if (v < targetVolume) { v = Math.min(targetVolume, v + 0.05); music.volume = v } else clearInterval(fade) }, 200)
    }
  }, 2000)
}

function animateGameTitle() {
  const titleEl = document.getElementById("gameTitle"); if (!titleEl) return
  titleEl.innerText = "La Prophétie des Mouches"
  titleEl.classList.remove("visible")
  setTimeout(() => titleEl.classList.add("visible"), 50)
}

function startDialogue() {
  hideIntroLayers()
  setGameState("DIALOGUE")
  index = 0
  document.getElementById("dialogueBox").style.display = "flex"
  showDialogue()
  dialogueLock = true; setTimeout(() => { dialogueLock = false }, 300)
}

function showDialogue() {
  const d = dialogue[index]
  document.getElementById("dialoguePortrait").src = d.portrait
  document.getElementById("dialogueText").textContent = d.text
}

document.addEventListener("click", e => {
  if (gameState !== "DIALOGUE") return
  if (e.target.tagName === "BUTTON" || e.target.closest("button")) return
  index++
  if (index < dialogue.length) showDialogue()
  else { document.getElementById("dialogueBox").style.display = "none"; showTavern() }
})

// Fermer le panel de preview si clic en dehors
document.addEventListener("click", e => {
  const btn = document.getElementById("playerPreviewBtn")
  if (btn && !btn.contains(e.target)) {
    const panel = document.getElementById("playerPreviewPanel")
    if (panel) panel.classList.remove("open")
  }
})

/* ========================= */
/* GM                        */
/* ========================= */



