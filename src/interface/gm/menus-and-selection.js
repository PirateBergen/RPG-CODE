function activateGM(fromFirebaseRole = false) {
  if (window.__authRole !== "gm" || isGM) return
  isGM = true
  document.getElementById("gmBar").style.display     = "flex"
  document.getElementById("mjLog").style.display     = "block"
  const gmSaveBar = document.getElementById("gmSaveBar")
  if (gmSaveBar) gmSaveBar.style.display = "none"
  const previewBtn = document.getElementById("playerPreviewBtn")
  if (previewBtn) previewBtn.style.display = "block"
  ensureMadnessGMButton()
  updateThuumButton()
  showNotification(fromFirebaseRole ? "🎲 Mode MJ activé (Firebase)" : "🎲 Mode MJ activé")
  // Fermer et masquer complètement le menu de sélection
  const select = document.getElementById("playerSelect")
  if (select) {
    select.style.transition = "opacity 0.4s ease"
    select.style.opacity = "0"
    setTimeout(() => { select.style.display = "none" }, 400)
  }
  setTimeout(syncWantedStateFromDB, 60)
}

function toggleGMSection(id) {
  const section = document.getElementById(id); if (!section) return
  const isOpen  = section.style.display === "block"
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  if (!isOpen) section.style.display = "block"
}

function toggleCategory(id, button) {
  const cat     = document.getElementById(id)
  if (!cat) return
  const opening = cat.style.display !== "block"

  // Trouve le panel parent (gmSection ou pnjTabContent)
  const parent = button.closest(".gmSection, .pnjTabContent")

  // Ferme tous les sous-menus du même panel parent seulement
  const scope = parent || document
  scope.querySelectorAll(".mapCategory").forEach(c => {
    if (c !== cat) {
      c.style.display = "none"
      c.style.maxHeight = ""
    }
  })
  scope.querySelectorAll(".mapCategoryButton").forEach(btn => {
    if (btn !== button) { btn.classList.remove("active"); const a = btn.querySelector(".arrow"); if (a) a.classList.remove("open") }
  })

  // Ouvre/ferme la cible avec animation
  if (opening) {
    cat.style.display = "block"
    cat.style.maxHeight = "0px"
    cat.style.overflow  = "hidden"
    cat.style.transition = "max-height 0.25s ease"
    requestAnimationFrame(() => { cat.style.maxHeight = cat.scrollHeight + "px" })
    button.classList.add("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.add("open")
  } else {
    cat.style.transition = "max-height 0.2s ease"
    cat.style.maxHeight  = "0px"
    setTimeout(() => { cat.style.display = "none"; cat.style.maxHeight = "" }, 200)
    button.classList.remove("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.remove("open")
  }
}

function openPNJTab(id, el) {
  if (window.event) window.event.stopPropagation()
  document.querySelectorAll(".pnjTabContent").forEach(tab => { tab.style.display = "none"; tab.classList.remove("active") })
  document.querySelectorAll(".pnjTab").forEach(tab => tab.classList.remove("active"))
  const target = document.getElementById(id)
  if (target) { target.style.display = "block"; target.classList.add("active") }
  el.classList.add("active")
}

function watchFreePoints(playerId) {
  if (window.__freePointsRef && window.__freePointsCb) {
    window.__freePointsRef.off("value", window.__freePointsCb)
  }
  const ref = db.ref("characters/" + playerId + "/freePoints")
  const cb = snap => {
    const pts = parseInt(snap.val()) || 0
    if (pts > 0 && typeof showFreePointsPanel === "function") {
      const localId = getLocalPlayerId()
      if (localId && localId === String(playerId).toLowerCase()) {
        showFreePointsPanel(playerId, pts)
      }
    }
  }
  window.__freePointsRef = ref
  window.__freePointsCb = cb
  ref.on("value", cb)
}

async function choosePlayer(id) {
  if (!CHARACTER_IDS.includes(id)) return
  if (isGM && window.__authRole === "gm") {
    myToken = document.getElementById(id); window.myToken = myToken
    selected = null; _state.tokenDragging = false; _state.tokenDragStart = null
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer", "gmSelected"))
    if (myToken) myToken.classList.add("selectedPlayer")
    showNotification("MJ joue : " + heroDisplayName(id).toUpperCase())
    watchLocalPlayerDefeat(id); updateThuumButton(); _collapsePlayerMenu(id)
    setTimeout(() => openCharacterSheet(id), 50)
    return
  }
  if (!PLAYABLE_HEROES.includes(id)) { showNotification("Bibi est le familier de Greg."); return }
  if (myToken || window.__playerSelectionPending) return
  const token = document.getElementById(id)
  if (!token) return
  window.__playerSelectionPending = true
  try {
    await initFirebaseAnonymousAuth()
    const uid = auth?.currentUser?.uid || window.__authUid
    if (!uid || uid !== window.__authUid) throw new Error("Connexion nécessaire pour choisir un héros")
    if (window.__authPlayerId && window.__authPlayerId !== id) throw new Error("Ce compte est déjà lié à " + heroDisplayName(window.__authPlayerId).toUpperCase())
    if(typeof claimReservedHero==="function")await claimReservedHero(id,uid)
    else {const result=await db.ref("profiles/"+uid+"/playerId").transaction(current=>current===null||current===id?id:undefined);if(!result.committed)throw Error("Ce compte possède déjà un autre héros")}
    if (window.__authUid !== uid) return
    window.__authPlayerId = id
    myToken = token; window.myToken = token
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
    token.classList.add("selectedPlayer")
    syncCharacterSubscriptions()
    watchLocalPlayerDefeat(id); watchFreePoints(id); updateThuumButton()
    updatePlayerAuthMenuState(); _collapsePlayerMenu(id)
    showNotification("Votre héros est : " + heroDisplayName(id).toUpperCase())
    if (window.__activeCurseWheel) presentSavedCurseWheel(window.__activeCurseWheel)
  } catch (error) {
    showNotification(error?.message || "Choix du héros impossible")
  } finally {
    window.__playerSelectionPending = false
  }
}

function _collapsePlayerMenu(id) {
  const select = document.getElementById("playerSelect")
  if (!select) return
  // Disparition complète après choix du personnage
  select.style.transition = "opacity 0.4s ease"
  select.style.opacity = "0"
  setTimeout(() => { if (myToken?.id === id) select.style.display = "none" }, 400)
}



function openPlayerMenuOnStart() {
  const menu = document.getElementById("playerMenu")
  updatePlayerAuthMenuState()
  if (menu && !myToken) menu.classList.add("open")
}

/* ========================= */
/* BRANCHEMENT DU CLAVIER    */
/* ========================= */

installGameShortcuts()
