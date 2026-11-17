function spawnEloSummonToken(data) {
  const tokenZone = document.getElementById("combatTokens")
  if (!tokenZone) return

  let token = document.getElementById("eloSummonToken")
  if (!token) {
    token = document.createElement("div")
    token.id = "eloSummonToken"
    token.className = "token"
    token.style.cssText = "position:absolute;left:720px;top:430px;display:flex;z-index:160;"

    const stats = document.createElement("div")
    stats.className = "tokenStats"
    stats.id = "stats_eloSummon"
    token.appendChild(stats)

    const hpWrap = document.createElement("div")
    hpWrap.className = "hpBarToken"
    const hpFill = document.createElement("div")
    hpFill.className = "hpBarFill"
    hpFill.id = "hp_eloSummon"
    hpWrap.appendChild(hpFill)
    token.appendChild(hpWrap)

    const img = document.createElement("img")
    img.id = "eloSummonTokenImg"
    img.src = "images/pork.png"
    img.style.cssText = "object-fit:cover;"
    token.appendChild(img)

    const name = document.createElement("div")
    name.className = "nameTag"
    name.innerText = "John Pork"
    token.appendChild(name)

    token.addEventListener("mousedown", e => {
      if (!isGM && (!myToken || myToken.id !== "elo")) return
      selected = token
      lastX = token.offsetLeft
      _state.tokenDragStart = { x: e.clientX, y: e.clientY }
      _state.tokenDragging = false
      e.preventDefault()
      e.stopPropagation()
    })

    tokenZone.appendChild(token)
  }

  token.style.left = ((data && data.x) || 720) + "px"
  token.style.top = ((data && data.y) || 430) + "px"
  token.style.display = data && data.active ? "flex" : "none"
  token.style.opacity = data && data.active ? "1" : "0"
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()

  const hpFill = document.getElementById("hp_eloSummon")
  if (hpFill) {
    const pct = Math.max(0, Math.min(100, ((data?.hp || 0) / Math.max(1, data?.maxHP || 1)) * 100))
    hpFill.style.width = pct + "%"
  }

  const stats = document.getElementById("stats_eloSummon")
  if (stats) {
    stats.innerHTML = ""
    const hpText = document.createElement("div")
    hpText.className = "hpText"
    hpText.innerText = "❤ " + (data?.hp || 0) + "/" + (data?.maxHP || 0)
    stats.appendChild(hpText)
  }
}

/* ========================= */
/* VICTOIRE / DÉFAITE        */
/* ========================= */

