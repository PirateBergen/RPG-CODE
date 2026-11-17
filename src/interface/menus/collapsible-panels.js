function toggleCollapsiblePanel(contentId, buttonId, panelId) {
  const content = document.getElementById(contentId)
  const btn = document.getElementById(buttonId)
  const panel = document.getElementById(panelId)
  if (!content || !btn || !panel) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  panel.style.maxHeight = collapsed ? "260px" : "auto"
  btn.title = collapsed ? "Réduire" : "Déplier"
  btn.setAttribute("aria-expanded", String(collapsed))
  try { localStorage.setItem("rpg.panel." + panelId, collapsed ? "open" : "closed") } catch (_) {}
}

toggleMJLog = function () {
  toggleCollapsiblePanel("mjLogContent", "mjLogToggle", "mjLog")
}

toggleDiceLog = function () {
  toggleCollapsiblePanel("diceLogContent", "diceLogToggle", "diceLog")
}

/* ========================= */
/* ESSAIM DE MOUCHES         */
/* ========================= */

