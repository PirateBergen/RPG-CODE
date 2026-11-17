function addMJLog(text) {
  text = pikaDisplayText(text)
  const log = document.getElementById("mjLogContent")
  if (!log) return
  const entry = document.createElement("div")
  entry.className = "mjEntry"
  entry.innerText = text
  log.prepend(entry)
}

function pushCombatHit(from, to, amount, type, detail) {
  const turnState = typeof getCombatTurnState === "function" ? getCombatTurnState() : null
  const round = turnState ? (parseInt(turnState.round, 10) || 1) : 1
  const entry = { from, to, amount: parseInt(amount, 10) || 0, type, round, time: Date.now() }
  if (detail) entry.detail = String(detail)
  db.ref("combat/hits").push(entry).catch(err => console.error("pushCombatHit failed:", err))
}

function addCombatLog(text) {
  text = pikaDisplayText(text)
  const content = document.getElementById("diceLogContent")
  if (!content) return
  const entry = document.createElement("div")
  entry.className = "logEntry logCombat"
  entry.innerText = text
  content.prepend(entry)
  while (content.children.length > 30) content.removeChild(content.lastChild)

}

function addDiceLog(player, dice, result, details={}) {
  player = heroDisplayName(player)
  const log = document.getElementById("diceLog")
  const content = document.getElementById("diceLogContent") || log
  if (!content) return
  const entry = document.createElement("div")
  entry.classList.add("logEntry")
  if (player === "MJ") entry.classList.add("logMJ")
  let text = player + (details.diceKind==="chance"?" · Chance":"") + " → 🎲 d" + dice + " → " + (details.diceKind==="chance"?details.rawRoll+" + "+details.bonus+" = "+result:result)
  const natural=details.rawRoll??result
  if (natural === dice) { text += " CRIT"; entry.classList.add("logCrit") }
  if (natural === 1)    { text += " FAIL";  entry.classList.add("logFail") }
  entry.innerText = text
  content.prepend(entry)
  addMJLog(text)
  while (content.children.length > 20) content.removeChild(content.lastChild)
}

