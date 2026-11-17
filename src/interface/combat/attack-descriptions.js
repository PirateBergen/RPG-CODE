function appendAttackDiceLine(container, dice, stat) {
  if (!dice) return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = "Jet :"
  const diceEl = document.createElement("span")
  diceEl.className = "attackDice"
  diceEl.innerText = "d" + dice
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" "))
  line.appendChild(diceEl)
  if (stat) {
    const statEl = document.createElement("span")
    statEl.className = "attackStat"
    statEl.innerText = String(stat).toUpperCase()
    line.appendChild(document.createTextNode(window.__combatSnapshot?.balanceVersion===3?" · puissance : ":" + "))
    line.appendChild(statEl)
  }
  container.appendChild(line)
}

function populateAttackBlock(block, attack) {
  const head = document.createElement("div")
  head.className = "combatAttackHead"
  head.appendChild(createCombatIcon(attack, null, "combatIcon"))
  const t = document.createElement("div")
  t.className = "combatAttack"
  t.innerText = attack.name
  head.appendChild(t)
  block.appendChild(head)
  appendAttackLine(block, "Type", attack.type)
  appendAttackDiceLine(block, attack.dice, attack.stat)
  const calibrated=window.__combatSnapshot?.balanceVersion===3
  appendAttackLine(block, "Effet", calibrated?calibratedAttackDescription(attack):attack.effect)
  appendAttackLine(block, "Crit", calibrated&&(attack.pikaKind==="endikaki"||!attack.pikaKind&&getPlayerAttackTypeKey(attack)!=="summon")?"Maximum naturel : puissance ×"+combatCriticalMultiplier(window.__combatSnapshot)+" ; effets propres conservés":attack.crit)
  if (attack.condition) appendAttackLine(block, "Condition", attack.condition)
}

