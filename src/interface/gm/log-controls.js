function toggleMJLog() {
  const content = document.getElementById("mjLogContent")
  const btn     = document.getElementById("mjLogToggle")
  const log     = document.getElementById("mjLog")
  if (!content || !btn) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}


function toggleDiceLog() {
  const content = document.getElementById("diceLogContent")
  const btn = document.getElementById("diceLogToggle")
  const log = document.getElementById("diceLog")
  if (!content || !btn || !log) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}


