function initializeMenuBehaviour() {
  for (const [panelId, contentId, buttonId] of [["diceLog", "diceLogContent", "diceLogToggle"], ["mjLog", "mjLogContent", "mjLogToggle"]]) {
    const panel = document.getElementById(panelId), content = document.getElementById(contentId), button = document.getElementById(buttonId)
    if (!panel || !content || !button) continue
    let preference = null
    try { preference = localStorage.getItem("rpg.panel." + panelId) } catch (_) {}
    const open = preference ? preference === "open" : content.style.display !== "none"
    content.style.display = open ? "block" : "none"
    panel.style.maxHeight = open ? "260px" : "auto"
    button.innerText = open ? "▼" : "▲"
    button.title = open ? "Réduire" : "Déplier"
    button.setAttribute("aria-expanded", String(open))
  }
  document.querySelectorAll(".gmSection").forEach(section => {
    if (section.dataset.autoCloseBound) return
    section.dataset.autoCloseBound = "true"
    section.addEventListener("click", event => {
      const button = event.target.closest("button")
      if (!button || button.disabled || !section.contains(button)) return
      const action = button.getAttribute("onclick") || ""
      // Navigation and placement settings are preparation, not final choices.
      if (button.matches(".pnjTab, .mapCategoryButton") || /^\s*(openPNJTab|toggleCategory|setPNJSlot)\s*\(/.test(action)) return
      if (button.dataset.keepMenuOpen === "true") return
      if (!action && typeof button.onclick !== "function" && button.dataset.closeMenu !== "true") return
      // Run after the action, including handlers that stop event propagation.
      queueMicrotask(() => { section.style.display = "none" })
    }, true)
  })
}
initializeMenuBehaviour()

