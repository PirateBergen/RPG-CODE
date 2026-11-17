function refreshActivePNJs() {
  db.ref("game/storyImage").once("value", snap => {
    const image = snap.val()
    if (image && typeof showStoryImage === "function") showStoryImage(image)
  })
  db.ref("game/storyImage2").once("value", snap => {
    const image = snap.val()
    const box2 = document.getElementById("storyImage2")
    const img2 = document.getElementById("storyImageContent2")
    if (!image || !box2 || !img2) return
    img2.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : "images/" + image
    box2.style.opacity = "0"; box2.style.left = "0"; box2.style.right = "auto"; box2.style.transform = ""; box2.style.display = "flex"
    if (!pnjSlotOrder.includes(2)) pnjSlotOrder.push(2)
    updatePNJPositions()
    setTimeout(() => { box2.style.opacity = "1" }, 60)
  })
  db.ref("game/storyImage3").once("value", snap => {
    const image = snap.val()
    const box3 = document.getElementById("storyImage3")
    const img3 = document.getElementById("storyImageContent3")
    if (!image || !box3 || !img3) return
    img3.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : "images/" + image
    box3.style.opacity = "0"; box3.style.right = "0"; box3.style.left = "auto"; box3.style.transform = ""; box3.style.display = "flex"
    if (!pnjSlotOrder.includes(3)) pnjSlotOrder.push(3)
    updatePNJPositions()
    setTimeout(() => { box3.style.opacity = "1" }, 60)
  })
  db.ref("game/highPNJName").once("value", snap => {
    const data = snap.val()
    if (data && data.name && typeof showHighPNJScroll === "function") showHighPNJScroll(data.name,data.time)
  })
  db.ref("game/cemeterySpell").once("value", snap => {
    const data = snap.val()
    if (!data) return
    if (data.active && !data.glipheShown && typeof ensureCemeteryGlyphIntro === "function") { ensureCemeteryGlyphIntro(); return }
    if (data.glipheShown && !data.freed && typeof renderSpellDiceGame === "function") renderSpellDiceGame(data)
  })
}

  function setGameState(state) {
    const previousState=gameState
    gameState = state
    if(!["GAME","COMBAT"].includes(state)&&typeof clearAllyDiscoveryAnimation==="function"){clearAllyDiscoveryAnimation();document.getElementById("allyDiscoveryPanel")?.remove()}
    if(state!=="COMBAT")document.getElementById("allyGrantPicker")?.remove()
    if(typeof renderWorldBossFlee==="function")renderWorldBossFlee(window.__combatSnapshot)
    if(typeof syncWorldPartyMarker==="function")syncWorldPartyMarker()
  if(typeof syncOregonVoyage==="function")syncOregonVoyage()
  if(typeof syncNightMode==="function")syncNightMode()
    if(state==="COMBAT"&&previousState!=="COMBAT"&&typeof suspendExplorationForCombat==="function")suspendExplorationForCombat()
  if (state !== "GAME" && state !== "COMBAT" && typeof cleanupRuneChallengeUI === "function") cleanupRuneChallengeUI()
  switch (state) {
    case "MENU":
      document.getElementById("intro").style.display    = "flex"
      document.getElementById("camera").style.display   = "none"
      document.getElementById("playerSelect").style.display = "none"
      startMenuSparks()
      break
    case "INTRO":
      document.getElementById("intro").style.display  = "flex"
      document.getElementById("camera").style.display = "none"
      ;["storyImage","storyImage2","storyImage3"].forEach(id => { const el=document.getElementById(id); if(el) { el.style.display="none"; el.style.opacity="0" } })
      document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
      break
    case "DIALOGUE":
      document.getElementById("dialogueBox").style.display = "flex"
      document.getElementById("intro").style.display       = "none"
      break
    case "GAME":
      document.getElementById("camera").style.display = "block"
      document.body.classList.remove("in-combat")
      // Ne montrer le menu de sélection que si le joueur n'a pas encore choisi
      if (!myToken) document.getElementById("playerSelect").style.display = "none"
      setTimeout(updateThuumButton, 500)
      setTimeout(refreshActivePNJs, 150)
      break
    case "COMBAT":
      document.body.classList.add("in-combat")
      setTimeout(refreshActivePNJs, 150)
      break
    }
    if (state !== "GAME") closeMapLoreBookOverlay()
    setTimeout(updateMadnessVisibility, 30)
    setTimeout(updateThuumButton, 30)
    setTimeout(updateMapLoreBookVisibility, 30)
  }

function hideIntroLayers() {
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")

  if (start) {
    start.style.display = "none"
    start.style.opacity = "0"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
  }

  if (intro) {
    intro.style.display = "none"
    intro.style.opacity = "0"
    intro.style.pointerEvents = "none"
    intro.style.visibility = "hidden"
    intro.style.zIndex = "-1"
  }
  if (introBox) {
    introBox.style.display = ""
    introBox.style.opacity = ""
    introBox.style.visibility = ""
    introBox.style.pointerEvents = ""
  }
}

