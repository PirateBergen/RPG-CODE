function resolvePlayerAttack(attack, options = {}) { return requestHeroCombatAction(attack, options) }


function showCombatHUD() {
  const player = getCombatHUDPlayerId()
  if (!player) return
  const hud = document.getElementById("combatHUD")
  if (hud) {
    let bg = document.getElementById("combatHUDBg")
    if (!bg) {
      bg = document.createElement("img")
      bg.id = "combatHUDBg"
      bg.alt = ""
      bg.src = "images/menuintro.png?v=7"
      hud.prepend(bg)
    }
  }
  const playerAttacks = attacks[player]
  const specialAttack = getPlayerSpecialAttack(player)
  const currentActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
  const meta = document.getElementById("combatHUDMeta")
  document.getElementById("combatHUDPortrait").src   = "images/" + heroPortraitFile(player)
  document.getElementById("combatHUDName").innerText  = heroDisplayName(player).toUpperCase()
  if (meta) {
    meta.replaceChildren()
    const rolePill = document.createElement("div")
    rolePill.className = "combatHUDMetaPill"
    rolePill.innerText = isGM && window.__combatPreviewPlayerId ? "Aperçu MJ" : "Combattant"
    meta.appendChild(rolePill)

    const turnPill = document.createElement("div")
    turnPill.className = "combatHUDMetaPill combatHUDMetaPill--turn"
    turnPill.innerText = currentActorId === player ? "Tour actif" : ("Tour : " + heroDisplayName(currentActorId || "—").toUpperCase())
    meta.appendChild(turnPill)

    if (isGM && window.__combatPreviewPlayerId) {
      const previewPill = document.createElement("div")
      previewPill.className = "combatHUDMetaPill combatHUDMetaPill--preview"
      previewPill.innerText = "Test MJ"
      meta.appendChild(previewPill)
    }
  }
  const box = document.getElementById("combatHUDAttacks"); box.innerHTML = ""
  const appendBasic=a=>{const block=document.createElement("div");block.className="combatBlock combatBlock--action";populateAttackBlock(block,a);block.onclick=()=>resolvePlayerAttack(a,{actorId:player});bindCombatActionState(block,player,a);box.appendChild(block)}
  const heading=text=>{const divider=document.createElement("div");divider.className="combatCompanionDivider";divider.textContent=text;box.appendChild(divider)}
  if(player==="greg")heading("Greg — attaques")
  ;(playerAttacks||[]).filter(a=>player!=="greg"||a.name!=="Le Bibi").forEach(appendBasic)
  if(specialAttack)box.appendChild(buildPlayerSpecialBlock(player,specialAttack))
  if(player==="greg"){
    heading("Bibi — même action que Greg")
    const basic=(playerAttacks||[]).find(a=>a.name==="Le Bibi");if(basic)appendBasic(basic)
    const special=getPlayerSpecialAttack("bibi");if(special){const block=buildPlayerSpecialBlock("bibi",special);block.classList.add("combatBlock--companion");box.appendChild(block)}
  }
  box.appendChild(buildPassTurnBlock(player, heroDisplayName(player).toUpperCase()))
  refreshCombatHUDContext()
  // Greg et Bibi partagent le même tour et une seule action.
  renderCombatStatusPanel()
  if (hud) hud.style.display = "none"
  const btn = document.getElementById("playerAttackBtn"); if (btn && player) btn.style.display = "flex"
}

function togglePlayerAttacks(){
 const hud=document.getElementById("combatHUD");if(!hud||!getCombatHUDPlayerId())return
 if(hud.style.display==="none"||!hud.style.display){refreshCombatActionStates();hud.style.display="flex";hud.style.alignItems="flex-start"}
 else{hud.style.display="none";if(isGM&&window.__combatPreviewPlayerId)closeCombatPreviewHUD()}
}




/* ========================= */
/* MULTI-MOBS                */
/* ========================= */

// Ciblage intelligent selon le type d'attaque


