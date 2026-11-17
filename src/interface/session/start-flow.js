function showIntroLayer() {
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")
  if (!intro) return
  intro.style.display = "flex"
  intro.style.opacity = "1"
  intro.style.pointerEvents = "auto"
  intro.style.visibility = "visible"
  intro.style.zIndex = "15"
  if (introBox) {
    introBox.style.display = "flex"
    introBox.style.opacity = "1"
    introBox.style.visibility = "visible"
    introBox.style.pointerEvents = "auto"
  }
}

function startGame() {
  if (gameStarted || window.__sessionBusy) return
  // Continuer ne doit jamais effacer la partie persistée.
  stopMenuSparks()
  const titleEl = document.getElementById("gameTitle")
  if (titleEl) { titleEl.classList.remove("visible"); titleEl.innerText = "" }
  document.body.focus()
  if (gameStarted) return
  gameStarted = true
  hideIntroLayers()
  setGameState(GAME_STATE.INTRO)
  const fade = document.getElementById("fadeScreen"); fade.style.opacity = 1
  const music = document.getElementById("music"); if (music) { music.pause(); music.currentTime = 0 }
  db.ref("game/map").once("value", snapshot => {
    const mapName = snapshot.val()
    if (mapName) {
      const map = document.getElementById("map")
      map.style.backgroundImage = "url('images/" + mapName + "')"
      calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
    }
  })
  setTimeout(() => {
    if(gameState !== GAME_STATE.INTRO)return
    if (isGM) {
      // MJ : cinématique si newGame() vient d'être appelé
      if (window.isNewGame) {
        window.isNewGame = false
        stopAllMusic()
        playOpeningCinematic(startDialogue)
      }
      else showTavern()
    } else {
      if (window.isNewGame) {
        window.isNewGame = false
        stopAllMusic()
        playOpeningCinematic(startDialogue)
      } else {
        showTavern()
      }
    }
  }, 1500)
}

function fadeOut() {
  const fade = document.getElementById("fadeScreen"); if (!fade) return; fade.style.opacity = 0
}

function showTavern() {
  hideIntroLayers()
  setGameState("GAME")
  const fade = document.getElementById("fadeScreen"); const map = document.getElementById("map")
  primeMapMusicChannels()
  // Démarrer la musique immédiatement (dans la fenêtre du geste utilisateur)
  const earlyMap = currentMap || "taverne.jpg"
  if (mapMusic[earlyMap]) playInitialMapMusic(earlyMap)
  fadeOut()
  document.getElementById("camera").style.display  = "block"
  document.getElementById("diceBar").style.display  = "flex"
  document.getElementById("diceLog").style.display  = "block"
  tryAutoSelectAuthenticatedPlayer()
  // Ne montrer le menu de sélection que si le joueur n'a pas encore choisi
  if (!isGM && !myToken) {
    document.getElementById("playerSelect").style.display = "none"
    setTimeout(openPlayerMenuOnStart, 100)
  }
  // Lire la vraie map depuis Firebase plutôt que forcer la taverne
  db.ref("game/map").once("value", snap => {
    const mapName = snap.val() || "taverne.jpg"
    map.style.backgroundImage = "url('images/" + mapName + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    currentMap = mapName
    if(typeof syncWorldPartyMarker==="function")syncWorldPartyMarker()
  if(typeof syncOregonVoyage==="function")syncOregonVoyage()
  if(typeof syncNightMode==="function")syncNightMode()
    calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
    // Le zoom sauvegardé sera restauré sans réécrire la session.
    if (isGM && window.isNewGame) maybeSpawnMapLoreBook(mapName)
    syncMapElementsFromDB()
    syncWantedStateFromDB()
    if (mapName !== earlyMap) playInitialMapMusic(mapName)
    ensureMapMusicPlayback(mapName, 0)
    setTimeout(() => { fade.style.opacity = 0 }, 500)
    ensureMapMusicPlayback(mapName, 800)
    awaitResumeSessionPresentation()
    setTimeout(() => { if (mapNames[mapName]) showLocation(mapNames[mapName]) }, 2000)
    // Forcer rechargement des stats et positions des tokens
    setTimeout(() => {
      ;["greg","ju","elo","bibi"].forEach(pid => updateTokenStats(pid))
    }, 600)
  })
}

