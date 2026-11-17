function togglePlayerPreviewPanel() {
  const panel = document.getElementById("playerPreviewPanel")
  if (panel) panel.classList.toggle("open")
}

function enterPlayerPreview(playerId) {
  if (!isGM) return
  const panel = document.getElementById("playerPreviewPanel")
  if (panel) panel.classList.remove("open")

  window._previewSavedMyToken = myToken
  isGM = false
  myToken = document.getElementById(playerId)

  // UI MJ générale
  document.getElementById("gmBar").style.display  = "none"
  document.getElementById("mjLog").style.display  = "none"
  document.getElementById("playerPreviewBtn").style.display = "none"
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")

  // UI MJ combat (pas des gmSection)
  const gdp = document.getElementById("gmDamagePanel"); if (gdp) gdp.style.display = "none"

  // Bandeau
  const banner = document.getElementById("playerPreviewBanner")
  const names  = { greg:"Greg", ju:"Pika", elo:"Elo", bibi:"Bibi" }
  document.getElementById("previewPlayerName").innerText = names[playerId] || playerId
  banner.style.display = "flex"

  // Token sélectionné
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
  if (myToken) myToken.classList.add("selectedPlayer")

  // Fiche personnage
  document.getElementById("characterSheet").style.display = "none"
  if (typeof openCharacterSheet === "function") openCharacterSheet(playerId)

  // Stats combat (recharge le listener pour le bon joueur)
  if ((combatActive || gameState === "COMBAT") && typeof loadPlayerCombatStats === "function") {
    loadPlayerCombatStats()
  }
  if ((combatActive || gameState === "COMBAT") && typeof showCombatHUD === "function") {
    showCombatHUD()
  }

  // Bouton Thu'um
  if (typeof updateThuumButton === "function") updateThuumButton()
}

function exitPlayerPreview() {
  isGM = true
  myToken = window._previewSavedMyToken || null
  window._previewSavedMyToken = null

  // UI MJ générale
  document.getElementById("gmBar").style.display  = "flex"
  document.getElementById("mjLog").style.display  = "block"
  document.getElementById("playerPreviewBtn").style.display = "block"
  document.getElementById("playerPreviewBanner").style.display = "none"
  document.getElementById("characterSheet").style.display = "none"

  // UI MJ combat
  if (combatActive || gameState === "COMBAT") {
    const gdp = document.getElementById("gmDamagePanel"); if (gdp) gdp.style.display = "block"
  }

  // Token sélectionné
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
  if (myToken) myToken.classList.add("selectedPlayer")

  // Restaurer les stats combat sur le token MJ (si applicable)
  if ((combatActive || gameState === "COMBAT") && myToken && typeof loadPlayerCombatStats === "function") {
    loadPlayerCombatStats()
  }

  if (typeof updateThuumButton === "function") updateThuumButton()
}

