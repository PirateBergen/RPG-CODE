function applyCollapsiblePanelState(content, button, panel, open) {
  content.style.display = open ? "block" : "none"
  button.innerText = open ? "▼" : "▲"
  panel.style.maxHeight = open ? "260px" : "auto"
  button.title = open ? "Réduire" : "Déplier"
  button.setAttribute("aria-expanded", String(open))
}

function toggleCollapsiblePanel(contentId, buttonId, panelId) {
  const content = document.getElementById(contentId)
  const btn = document.getElementById(buttonId)
  const panel = document.getElementById(panelId)
  if (!content || !btn || !panel) return
  const open = content.style.display === "none"
  applyCollapsiblePanelState(content, btn, panel, open)
  try { localStorage.setItem("rpg.panel." + panelId, open ? "open" : "closed") } catch (_) {}
}

toggleMJLog = function () {
  toggleCollapsiblePanel("mjLogContent", "mjLogToggle", "mjLog")
}

toggleDiceLog = function () {
  toggleCollapsiblePanel("diceLogContent", "diceLogToggle", "diceLog")
}

