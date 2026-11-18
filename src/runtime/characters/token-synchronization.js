function getMaxHP(playerId, level) {
  const s = getPlayerStatsAtLevel(playerId, level || 1)
  return helAdjustedMaxHP(playerId,{},s ? s.hp : 100)
}

function isCharacterOverweight(playerId, data = null) {
  const source = data || {}
  const inventoryText = String(source.inventaire || "")
  const weight = Object.prototype.hasOwnProperty.call(source, "inventaire") && typeof _parseInventoryWeight === "function"
    ? _parseInventoryWeight(inventoryText) : Math.max(0, Number(source.carriedWeight) || 0)
  const maxWeight = getMaxCarryWeight(playerId, source.lvl, source)
  return {
    overweight: weight > maxWeight,
    weight,
    maxWeight
  }
}

function updateTokenFromDB(snapshot) {
  const id   = snapshot.key
  const data = snapshot.val()
  if (!data) return
  window.__tokenPositions ||= {}; window.__tokenPositions[id]=data
  window.__tokenPositionRevision=(window.__tokenPositionRevision||0)+1
  if (window.__sessionBusy) return
  if(combatActive&&window.__pendingCombatOutcome?.combatId===window.__localCombatId&&!window.__combatReturnInProgress)return
  if (selected?.id === id && _state.tokenDragging) return
  const token = document.getElementById(id)
  if (!token) return
  if (id === "bibi") { tokenFollowLabel(data) }
  if(!Number.isFinite(data.x)||!Number.isFinite(data.y))return
  token.style.left = data.x + "px"
  token.style.top  = data.y + "px"
  if (data.facing === 1) token.classList.add("faceLeft")
  else if (data.facing === 0) token.classList.remove("faceLeft")
  if (data.hp !== undefined) {
    if (id === "greg" && data.hp < 50) showBibiSpeech("Miiii !")
    db.ref("characters/" + id + "/lvl").once("value", lvlSnap => {
      const lvl   = parseInt(lvlSnap.val()) || 1
      const maxHP = getMaxHP(id, lvl)
      const bar   = document.getElementById("hp_" + id)
      if (bar) bar.style.width = Math.max(0, Math.min(100, (data.hp / maxHP) * 100)) + "%"
    })
    updateTokenGlow(id, data.hp)
    if (lastHP[id] !== undefined && data.hp < lastHP[id]) damageEffect(id)
    lastHP[id] = data.hp
  }
}

function syncTokenPositionsFromCache() {
  if (!gameStarted || window.__sessionBusy || window.__combatReturnInProgress || combatStarting || !["GAME","COMBAT"].includes(gameState)) return
  for (const [id,data] of Object.entries(window.__tokenPositions || {})) {
    if (["greg","ju","elo","bibi","mobToken"].includes(id)) updateTokenFromDB({key:id,val:()=>data})
  }
}

function updateTokenStats(id, characterData = null) {
  const stats = document.getElementById("stats_" + id)
  if (!stats) return
  const render = snapshot => {
    const data = snapshot.val(); if (!data) return
    const hp         = data.hp || 0
    const curse      = data.curse || 0
    const corruption = data.corruption || 0
    const lvl        = data.lvl || 1

    const token     = document.getElementById(id)
    const { weight, maxWeight, overweight } = isCharacterOverweight(id, data)
    if (token) {
      token.classList.toggle("overweight", overweight)
      if (id !== "bibi" && (data.curse || 0) >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
      else                        { token.classList.remove("cursed"); stopBloodEffect(token)  }
    }

    const maxHP   = getMaxHP(id, lvl)
    const hpColor = hp > maxHP * 0.6 ? "#3cff6b" : hp > maxHP * 0.3 ? "#ffb347" : "#ff4040"
    let curseIcons = "", powerIcon = ""
    if (id !== "bibi") {
      for (let i = 0; i < curse; i++) curseIcons += "☠"
      powerIcon = corruption >= 10 ? "✨" : ""
    }

    stats.innerHTML = `
      <div class="powerText">⭐ Niv ${lvl}</div>
      <div class="hpText" style="color:${hpColor}">❤️ ${hp}/${maxHP}</div>
      ${weight > 0 ? `<div class="weightText">🎒 ${weight}${overweight ? ` <span class="overweightInline">SURCHARGÉ</span>` : ""}</div>` : (overweight ? `<div class="overweightText">SURCHARGÉ</div>` : "")}
      ${curseIcons ? `<div class="curseText">${curseIcons}</div>` : ""}
      ${powerIcon  ? `<div class="powerText">${powerIcon}</div>` : ""}
    `

    const bar = document.getElementById("hp_" + id)
    if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
    updateTokenGlow(id, hp)
  }
  if (characterData) render({val:()=>characterData})
  else readCharacter(id, render)
}



/* ========================= */
/* PERSONNAGES                */
/* ========================= */

