function watchCharacter(snapshot) {
  if (window.__sessionBusy) return
  const playerID = snapshot.key
  const rawData  = snapshot.val()
  const data = rawData && (playerID === "bibi" ? {...rawData,curse:0,corruption:0} : rawData)
  if (!data) return
  window.__publicCharacters ||= {}; window.__publicCharacters[playerID] = {hp:data.hp,lvl:data.lvl}
  window.__combatConditionCharacters ||= {}; window.__combatConditionCharacters[playerID]={hp:data.hp,lvl:data.lvl,...(canAccessCharacter(playerID)?{maxHp:getCharacterMaxHp(playerID,data)}:{})}
  if(typeof refreshCombatActionStates==="function")refreshCombatActionStates()

  updateTokenStats(playerID)
  updateGMStats(playerID, data)

  const xp         = parseInt(data.xp)        || 0
  const lvl        = parseInt(data.lvl)        || 1
  const hp         = parseInt(data.hp)         || 0
  const corruption = parseInt(data.corruption) || 0

  const maxHP = getMaxHP(playerID, lvl)
  const bar   = document.getElementById("hp_" + playerID)
  if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
  updateTokenGlow(playerID, hp)

  const token = document.getElementById(playerID)
  if (token) {
    const wasDead = !!deadPlayers[playerID]
    if (hp <= 0) {
      token.classList.add("playerDead")
      deadPlayers[playerID] = true
      if (!document.getElementById("skull_" + playerID)) {
        const skull = document.createElement("div")
        skull.id = "skull_" + playerID
        skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
        skull.innerText = "mort"
        token.appendChild(skull)
      }
      if(!wasDead&&Number.isFinite(data.hp)&&gameStarted&&(combatActive||gameState==="GAME")){
        showNotification(heroDisplayName(playerID).toUpperCase()+" est KO.")
        playSound("defeatSound",.35)
      }
    } else {
      token.classList.remove("playerDead")
      deadPlayers[playerID] = false
      const skull = document.getElementById("skull_" + playerID)
      if (skull) skull.remove()
    }
    if (corruption >= 10) {
      token.classList.add("powerReady")
      if (myToken && myToken.id === playerID && (!powerModeActive || !document.getElementById("usePowerBtn"))) activatePowerMode(playerID)
    } else {
      token.classList.remove("powerReady", "powerFull")
      if (myToken && myToken.id === playerID) powerModeActive = false
      if(myToken?.id===playerID)document.getElementById("usePowerBtn")?.remove()
      const p1 = document.getElementById("power1Sound")
      if (p1 && myToken && myToken.id === playerID) { p1.pause(); p1.currentTime = 0 }
    }
    const curseVal = parseInt(data.curse) || 0
    if (curseVal >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
    else               { token.classList.remove("cursed"); stopBloodEffect(token)  }
  }

  const localId = getLocalPlayerId()
  const localCurse = parseInt(data.curse) || 0
  if (
    !isGM &&
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse >= 8 &&
    !window.__curseWheelTriggeredFor
  ) {
    window.__curseWheelTriggeredFor = localId

  } else if (
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse < 8 &&
    window.__curseWheelTriggeredFor === localId
  ) {
    window.__curseWheelTriggeredFor = null
  }

  // Les mises à jour publiques ne doivent jamais modifier un autre héros.
  if (!canAccessCharacter(playerID)) return
  if (playerID === "bibi") _state.bibiData = { ...data }

  const previousLevel = lastLevel[playerID]
  const previousXP = window.__lastProgressionXP?.[playerID]
  if (!window.__lastProgressionXP) window.__lastProgressionXP = {}
  window.__lastProgressionXP[playerID] = xp
  lastLevel[playerID] = lvl
  if (isGM && previousXP !== undefined && xp > previousXP) {
    reconcilePartyProgression().catch(error => showNotification("Progression non confirmée : " + error.message))
  }
  if (previousLevel !== undefined && lvl > previousLevel && !window.__sessionBusy) triggerLevelUp(playerID)
}

function triggerLevelUp(playerID) {
  if (!canAccessCharacter(playerID) || window.__sessionBusy) return
  // Présentation seulement : les points sont attribués une seule fois par transaction.
  showNotification(heroDisplayName(playerID).toUpperCase() + " LEVEL UP !")
  showLevelUpEffect(playerID); showLevelUpText(playerID); playSound("levelUpSound")
}

function updateGMStats(playerID, data) {
  const box = document.getElementById("gmStats_" + playerID)
  if (!box) return
  if(playerID === "bibi")data={...data,curse:0,corruption:0}
  let curseIcons = ""
  for (let i = 0; i < (data.curse || 0); i++) curseIcons += "☠"
  box.innerHTML = `<div class="gmMiniHPText">❤️ ${data.hp || 0}</div><div class="gmMiniCurse">${curseIcons}</div><div class="gmMiniPower">${(data.corruption || 0) >= 10 ? "✨" : ""}</div>`
}


