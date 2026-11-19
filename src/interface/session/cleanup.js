function cleanupTransientGameUI(options = {}) {
  if(typeof closeKingProtection==="function")closeKingProtection()
  window.__cancelHelNidhoggDuo?.();window.__cancelHelWrath?.();document.getElementById("helWrathMenu")?.__close?.()
  window.__cancelAntrePassage?.()
  window.__cancelQuantumGift?.()
  if(typeof syncAntreAfterlifeView==="function")syncAntreAfterlifeView()
  if(typeof closePersonalDocument==="function")closePersonalDocument()
  if(typeof closeDocumentGrantPanel==="function")closeDocumentGrantPanel()
  if(typeof cancelSharedVisuals==="function")cancelSharedVisuals()
  if(typeof cancelCombatRetreatPresentation==="function")cancelCombatRetreatPresentation()
  if(typeof clearWorldBossFleeUI==="function")clearWorldBossFleeUI()
  if(typeof window.__cancelSpecialPreview==="function")window.__cancelSpecialPreview()
  if(typeof window.__cancelEndikakiPresentation==="function")window.__cancelEndikakiPresentation()
  if(typeof window.__cancelOregonBombardment==="function")window.__cancelOregonBombardment()
  if(typeof closeSpecialPreviewPanel==="function")closeSpecialPreviewPanel()
  if(typeof closeMobSpecialPreviewPanel==="function")closeMobSpecialPreviewPanel()
  if(typeof window.__cancelMobSpecialPresentation==="function")window.__cancelMobSpecialPresentation()
  const {
    closeSavePanel = false
  } = options

  combatActive = false
  combatStarting = false
  window.__combatOutcomeShowing = false
  window.__pendingLocalDefeat = false
  window.__combatInitiativeHidden = false

  stopCombatStatsSubscription()
  disposeHighPNJScroll()
  document.querySelectorAll("audio[id^=pnjSound_]").forEach(sound=>sound.pause())
  resetLocalCombatVisualState()
  resetMadnessPresentation()
  if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
  if (typeof closeMapLoreBookOverlay === "function") closeMapLoreBookOverlay()
  if (typeof closeCombatInitiativeOverlay === "function") closeCombatInitiativeOverlay()

  const initiativeToggle = document.getElementById("combatInitiativeToggle")
  if (initiativeToggle) initiativeToggle.remove()

  ;[
    "mobAttackPanel",
    "allyPNJPanel",
    "allyViewerPanel",
    "runeChallengeOverlay",
    "spellMiniGame",
    "curseIntroScreen",
    "curseWheelScreen",
    "documentOverlay"
  ].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.remove()
  })

  const combatArena = document.getElementById("combatArena"); if (combatArena) combatArena.style.display = "none"
  const combatGrid = document.getElementById("combatGrid"); if (combatGrid) combatGrid.style.display = "none"
  const combatFilter = document.getElementById("combatFilter"); if (combatFilter) combatFilter.style.display = "none"
  const defeatScreen = document.getElementById("defeatScreen"); if (defeatScreen) defeatScreen.style.display = "none"
  const fade = document.getElementById("fadeScreen"); if (fade) { fade.style.opacity = "0"; fade.style.pointerEvents = "none" }

  document.querySelectorAll("[id^='revive_']").forEach(btn => btn.remove())

  if (closeSavePanel) {
    const panel = document.getElementById("savePanel")
    if (panel) panel.remove()
  }

  updateMadnessVisibility()
  updateThuumButton()
}

function finalizeNewGameLocally() {
  gameStarted = false
  window.isNewGame = true
  window.__curseWheelTriggeredFor = null
  cemeteryEventDone = false
  odinVisionShown = false
  window.playerThuumData = {}
  window.playerThuumAccessData = {}
  window.mapLoreBookData = null
  window.readLoreBooksData = {}
  deadPlayers = {}
  pendingLevelUp = {}
  lastLevel = {}
  lastHP = {}
  stopAllMusic()
  cleanupTransientGameUI()
}

