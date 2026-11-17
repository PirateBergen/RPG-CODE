function getLocalPlayerId() {
  if (window.__localPlayerId) return String(window.__localPlayerId).toLowerCase()
  if (myToken && myToken.id) return String(myToken.id).toLowerCase()
  const selectedToken = document.querySelector(".token.selectedPlayer")
  if (selectedToken && selectedToken.id) return String(selectedToken.id).toLowerCase()
  const menuMini = document.getElementById("playerMenuMini")
  if (menuMini && menuMini.dataset && menuMini.dataset.playerId) return String(menuMini.dataset.playerId).toLowerCase()
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.dataset && sheet.dataset.playerId) return String(sheet.dataset.playerId).toLowerCase()
  try {
    const stored = localStorage.getItem("rpg_local_player")
    if (stored) return String(stored).toLowerCase()
  } catch (e) {}
  return ""
}

