"use strict"

// Local keyboard controls and their help. Binding stays in the original startup position.
function handleGameShortcut(e) {
  if (e.defaultPrevented || e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
  const key    = e.key.toLowerCase()
  const active = document.activeElement
  if (active && (active.matches("input, textarea, select") || active.isContentEditable)) {
    if (key !== "escape") return
    // Keep focus until the window has applied its own close/save policy.
  }

  if (key === "escape") {
    const gmAuthModal = document.getElementById("gmAuthModal"); if (gmAuthModal) { closeGMAuthModal(); return }
    const playerAuthModal = document.getElementById("playerAuthModal"); if (playerAuthModal) { closePlayerAuthModal(); return }
    e.preventDefault()
    if((document.getElementById("combatEnemyTargetPicker")||document.getElementById("combatTargetPicker"))&&typeof combatTargetCancellation==="function"){combatTargetCancellation();return}
    if(window.GameWindows?.closeTop())return
    const arbitrationModal=document.getElementById("gmArbitrationModal");if(arbitrationModal&&typeof gmArbitrationClose==="function"){gmArbitrationClose();return}
    const sessionJournal=document.getElementById("sessionLogPanel");if(sessionJournal?.style.display==="flex"){closeSessionLog();return}
    const notesEditor = document.getElementById("notesEditorPanel"); if (notesEditor) { notesEditor.remove(); return }
    if(document.getElementById("gmDiagnosticsPanel")&&typeof closeGMDiagnostics==="function"){closeGMDiagnostics();return}
    const shortcutHelp = document.getElementById("gmShortcutHelp"); if (shortcutHelp) { shortcutHelp.remove(); return }
    const privateSheet = document.getElementById("characterSheet")
    if (privateSheet && privateSheet.style.display !== "none" && privateSheet.style.display !== "") { closeCharacterSheet(); return }
    const diceLogContent = document.getElementById("diceLogContent")
    if (diceLogContent && diceLogContent.style.display !== "none") { if (typeof toggleDiceLog === "function") toggleDiceLog(); return }
    const savePanel = document.getElementById("savePanel"); if (savePanel) { savePanel.remove(); return }
    const combatInitiativeOverlay = document.getElementById("combatInitiativeOverlay")
    if (combatInitiativeOverlay) {
      window.__combatInitiativeHidden = true
      if (typeof closeCombatInitiativeOverlay === "function") closeCombatInitiativeOverlay()
      if (typeof renderCombatInitiativeToggle === "function" && typeof getCombatTurnState === "function") {
        renderCombatInitiativeToggle(getCombatTurnState())
      }
      return
    }
    const wantedEditor = document.getElementById("wantedEditor"); if (wantedEditor && wantedEditor.style.display !== "none") { wantedEditor.style.display = "none"; return }
    const mobSelectionMenu = document.getElementById("mobSelectionMenu"); if (mobSelectionMenu && mobSelectionMenu.style.display !== "none") { mobSelectionMenu.style.display = "none"; return }
    const wantedBoard = document.getElementById("wantedBoardOverlay")
    const wantedOverlay = document.getElementById("wantedOverlay")
    if (wantedBoard && wantedOverlay) { if (typeof closeWantedBoard === "function") closeWantedBoard(); else wantedBoard.remove(); return }
    if (wantedBoard) { if (typeof closeWantedBoard === "function") closeWantedBoard(); else wantedBoard.remove(); return }
    let anyGMOpen = false
    document.querySelectorAll(".gmSection").forEach(sec => { if (sec.style.display !== "none" && sec.style.display !== "") anyGMOpen = true })
    if (anyGMOpen) { document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" }); return }
    const playerMenu = document.getElementById("playerMenu"); if (playerMenu && playerMenu.classList.contains("open")) { playerMenu.classList.remove("open"); return }
    const freePointsPanel = document.getElementById("freePointsPanel"); if (freePointsPanel) { freePointsPanel.remove(); return }
    const allyPNJPanel = document.getElementById("allyPNJPanel"); if (allyPNJPanel) { allyPNJPanel.remove(); return }
    const allyViewerPanel = document.getElementById("allyViewerPanel"); if (allyViewerPanel) { allyViewerPanel.remove(); return }
    const powersPanel = document.getElementById("playerThuumPanel"); if (powersPanel && powersPanel.style.display === "block") { closePlayerPowersPanel(); return }
    const docOverlay = document.getElementById("documentOverlay"); if (docOverlay && isGM) { hideDocument(); return }
    const loreOverlay = document.getElementById("mapLoreBookOverlay"); if (loreOverlay) { closeMapLoreBookOverlay(); return }
    const runeOverlay = document.getElementById("runeChallengeOverlay"); if (runeOverlay) { if (typeof closeRuneChallenge === "function") closeRuneChallenge(); else { runeOverlay.remove(); _state.runeJustOpened = false } return }
    const sheet = document.getElementById("characterSheet"); if (sheet && sheet.style.display !== "none" && sheet.style.display !== "") { closeCharacterSheet(); return }
    const shopEditor = document.getElementById("shopItemEditor"); if(shopEditor){shopEditor.remove();return}
    const shopOverlay = document.getElementById("shopOverlay"); if (shopOverlay && isGM) { closeShop(); return }
    if (wantedOverlay) { wantedOverlay.remove(); return }
    const combatHUD = document.getElementById("combatHUD")
    if (combatHUD && combatHUD.style.display === "flex") {
      if (isGM && window.__combatPreviewPlayerId && typeof closeCombatPreviewHUD === "function") closeCombatPreviewHUD()
      else combatHUD.style.display = "none"
      return
    }
    if (isGM && pnjSlotOrder && pnjSlotOrder.length) {
      if (typeof hideHighPNJScrollImmediate === "function") hideHighPNJScrollImmediate()
      db.ref("game/highPNJName").remove()
      closeLastPNJ()
      return
    }
    return
  }

  if (isGM) {
    if (key === "m") { toggleGMSection("mapMenu"); return }
    if (key === "r") { toggleGMSection("pnjMenu"); return }
    if (key === "p") { toggleGMSection("gmCharacters"); return }
    if (key === "x") { toggleGMSection("xpMenu"); return }
    if (key === "e") { toggleGMSection("elementsMenu"); return }
    if (key === "t") { toggleGMSection("mobMenu2"); return }
    if (key === "a" && combatActive) { openAllyPNJPanel(); return }
    if (key === "s" && !e.ctrlKey) { showSaveMenu(); return }

  }

  if (key === "?") { toggleGMShortcutHelp(); return }

  if (key === "b") {
    if (!canAccessCharacter("bibi")) return
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") closeCharacterSheet()
    else {
      if (!isGM && !myToken) { showNotification("Choisissez un personnage 🎭"); return }
      openCharacterSheet("bibi")
    }
    return
  }

  if (key === "i" || key === "j") {
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") { closeCharacterSheet(); return }
    if (isGM) {
      if (selected) openCharacterSheet(selected.id)
      else if (currentSheetPlayer) openCharacterSheet(currentSheetPlayer)
      else openCharacterSheet("greg")
      return
    }
    if (myToken) { openCharacterSheet(); return }
    showNotification("Choisissez un personnage 🎭")
  }
}

function toggleGMShortcutHelp() {
  const existing = document.getElementById("gmShortcutHelp")
  if (existing) { if(existing.__closeHelp)existing.__closeHelp();else existing.remove(); return }

  const overlay = document.createElement("div")
  overlay.id = "gmShortcutHelp"
  overlay.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(8,20,24,0.97);
    border:1px solid #1e5a66;
    box-shadow:0 0 0 1px #8a6520,0 0 30px rgba(0,0,0,0.9);
    border-radius:3px;padding:16px 20px;
    font-family:Cinzel,serif;
    z-index:999999999;pointer-events:auto;
    display:flex;flex-direction:column;gap:6px;
    width:min(420px,calc(100vw - 32px));box-sizing:border-box;
    max-height:calc(100dvh - 130px);overflow-y:auto;
    animation:shortcutFadeIn 0.15s ease;
  `

  const title = document.createElement("div")
  title.style.cssText = "font-size:10px;letter-spacing:3px;color:#1e8a9a;margin-bottom:8px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:6px;"
  title.innerText = isGM ? "RACCOURCIS MJ" : "RACCOURCIS JOUEUR"
  overlay.appendChild(title)

  const shortcuts = [
    ...(isGM ? [
    { key:"M",   label:"Maps" },
    { key:"P",   label:"Personnages" },
    { key:"R",   label:"PNJ / High PNJ" },
    { key:"T",   label:"Mobs / PNJ Combat" },
    { key:"X",   label:"XP" },
    { key:"E",   label:"Éléments" },
    { key:"S",   label:"Sauvegarder" },
    { key:"A",   label:"Alliés (en combat)" },
    ] : []),
    { key:"I / J", label:isGM ? "Fiche / inventaire du personnage sélectionné" : "Ma fiche / mon inventaire" },
    ...(canAccessCharacter("bibi") ? [{ key:"B", label:"Fiche / inventaire de Bibi" }] : []),
    { key:"Esc", label:"Fermer / Retour" },
    { key:"?",   label:"Cette aide" },
  ]

  shortcuts.forEach(({ key, label }) => {
    const row = document.createElement("div")
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:24px;"
    const labelEl = document.createElement("span")
    labelEl.style.cssText = "font-size:12px;color:#a0c8d0;"
    labelEl.innerText = label
    const keyEl = document.createElement("span")
    keyEl.style.cssText = "background:rgba(15,42,48,0.9);border:1px solid #2e6a78;border-radius:3px;font-size:11px;color:#5a9aaa;padding:2px 8px;min-width:28px;text-align:center;"
    keyEl.innerText = key
    row.appendChild(labelEl)
    row.appendChild(keyEl)
    overlay.appendChild(row)
  })

  const inventoryHelp = document.createElement("section")
  inventoryHelp.setAttribute("aria-label", "Aide inventaire")
  inventoryHelp.style.cssText = "border-top:1px solid rgba(30,90,102,0.5);margin-top:8px;padding-top:10px;color:#c9dce0;font-family:Georgia,serif;font-size:14px;line-height:1.5;"
  const heading = document.createElement("strong")
  heading.textContent = "Inventaire — capacité : 100"
  inventoryHelp.appendChild(heading)
  for (const text of [
    "Ouvre ta fiche avec I ou J. Le formulaire Objet · Quantité · Poids unitaire ajoute une ligne avec le bouton Ajouter ou la touche Entrée.",
    "Le bouton Ajouter une caractéristique affiche cinq boutons : Force, Charme, Perspicacité, Chance et Défense. Clique sur la caractéristique souhaitée, puis indique le nombre de points. Répète pour plusieurs bonus : ils s’ajoutent à ta fiche et restent fixes quand tu montes de niveau. Ils sont comptés une fois par ligne d’objet, quelle que soit la quantité. Retirer la ligne retire ses bonus. Actuellement, les bonus des objets présents dans cet inventaire sont actifs sans bouton Équiper.",
    "Tu peux aussi écrire un objet par ligne : Épée (3), Potion x3 (0,5), Lettre (0). Le poids entre parenthèses est celui d’un seul objet, sans unité. Exemple : 3 potions de 0,5 comptent pour 1,5.",
    "Le total se calcule automatiquement sur 100. Au-delà, le personnage est surchargé et son déplacement manuel est bloqué. Si « Poids incomplet » apparaît, corrige les lignes signalées avant de te fier au total.",
    "Les raccourcis restent inactifs pendant que tu écris. Échap ferme la fiche ; l’inventaire reste privé."
  ]) {
    const paragraph = document.createElement("p")
    paragraph.textContent = text; paragraph.style.margin = "6px 0"
    inventoryHelp.appendChild(paragraph)
  }
  overlay.appendChild(inventoryHelp)

  // The close callback owns both the outside-click handler and its delayed installation.
  const outsideClick=ev=>{if(!overlay.contains(ev.target))closeHelp()}
  const closeHelp=()=>{clearTimeout(outsideTimer);document.removeEventListener("mousedown",outsideClick);overlay.remove();window.GameWindows?.closed(overlay)}
  const outsideTimer=setTimeout(()=>{if(overlay.isConnected)document.addEventListener("mousedown",outsideClick)},50)
  overlay.__closeHelp=closeHelp
  document.body.appendChild(overlay)
  window.GameWindows?.register(overlay,closeHelp)
}

function installGameShortcuts() {
  document.addEventListener("keydown", handleGameShortcut)
}

// Injection style animation
;(function() {
  if (document.getElementById("gmShortcutStyle")) return
  const s = document.createElement("style")
  s.id = "gmShortcutStyle"
  s.textContent = `@keyframes shortcutFadeIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`
  document.head.appendChild(s)
})()
