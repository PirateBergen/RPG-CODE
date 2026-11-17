function buildPlayerSpecialBlock(playerId, specialAttack) {
  const block = document.createElement("div")
  block.className = "combatBlock combatBlock--action combatBlock--special"
  const used = hasPlayerUsedCombatSpecial(playerId)

  populateAttackBlock(block, specialAttack)
  appendAttackLine(block, "Condition", specialAttack.conditionText)
  if (specialAttack.fail) appendAttackLine(block, "Crit fail", specialAttack.fail)

  appendAttackLine(block, "Usage", "Une utilisation par combat")

  if (used) {
    block.classList.add("combatBlock--spent")
    block.onclick = null
  } else {
    block.title = "Cliquer pour lancer l'attaque spéciale"
    block.onclick = () => resolvePlayerAttack(specialAttack, { isSpecial: true, actorId:playerId })
  }

  bindCombatActionState(block,playerId,specialAttack,true)
  return block
}

function buildPassTurnBlock(actorId, label) {
  const block = document.createElement("div")
  block.className = "combatBlock combatBlock--action combatBlock--pass"
  const title = document.createElement("div")
  title.className = "attackTitle"
  title.innerText = "Passer le tour"
  block.appendChild(title)
  appendAttackLine(block, "Action", combatOwner(actorId)==="greg"?"Terminer l’action commune de Greg et Bibi":label||heroDisplayName(actorId).toUpperCase())
  appendAttackLine(block, "Effet", "Passe l'action sans attaquer")
  block.title = "Terminer le tour de " + (label || heroDisplayName(actorId).toUpperCase())
  block.onclick=()=>requestCombatPass(actorId,false)
  bindCombatActionState(block,actorId,{name:"Passer le tour"})
  return block
}

function buildMobPassTurnBlock(actorId, label) {
  const block = document.createElement("div")
  block.style.cssText = "padding:6px 8px;margin-top:8px;background:rgba(24,16,16,0.45);border:1px solid rgba(190,140,90,0.28);border-radius:6px;cursor:pointer;"
  const title = document.createElement("div")
  title.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#f0c99d;font-weight:bold;letter-spacing:0.5px;"
  title.innerText = "Passer le tour"
  block.appendChild(title)
  const desc = document.createElement("div")
  desc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#d6b79e;"
  desc.innerText = (label || heroDisplayName(actorId).toUpperCase()) + " termine son action sans attaquer."
  block.appendChild(desc)
  block.title = "Terminer le tour de " + (label || heroDisplayName(actorId).toUpperCase())
  block.onclick=()=>requestCombatPass(actorId,true)
  bindCombatActionState(block,actorId,{name:"Passer le tour"},false,true)
  return block
}

