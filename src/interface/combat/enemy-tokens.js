function spawnMobToken(mob) {
  const tokenZone = document.getElementById("combatTokens")
  const token     = document.getElementById("mobToken")
  const img       = document.getElementById("mobTokenImg")
  if (!token || !img) return

  token.style.pointerEvents = "auto"; token.style.cursor = "grab"
  if (tokenZone) tokenZone.appendChild(token)
  img.src = "images/" + mob + ".png"
  token.style.width = "130px"; token.style.height = "130px"
  img.style.width   = "130px"; img.style.height  = "130px"
  token.style.left  = "600px"; token.style.top   = "180px"
  token.style.display = "flex"; token.style.zIndex = "200"; token.style.position = "absolute"

  const oldName = token.querySelector(".mobNameTag"); if (oldName) oldName.remove()
  const nameTag = document.createElement("div")
  nameTag.className = "mobNameTag"; nameTag.innerText = heroDisplayName(mob).toUpperCase()
  nameTag.style.cssText = "position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:22px;color:red;text-shadow:0 0 10px darkred;white-space:nowrap;"
  token.appendChild(nameTag)

  token.style.opacity = "0"; token.style.transform = "scale(0.1) rotate(-15deg)"; token.style.filter = "brightness(5) saturate(3)"
  const portal = document.createElement("div")
  portal.className = "mobPortal"
  portal.style.cssText = "position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(150,0,0,0.95) 0%,rgba(80,0,0,0.6) 50%,transparent 75%);box-shadow:0 0 40px red,0 0 80px darkred;z-index:-1;"
  token.appendChild(portal)

  setTimeout(() => {
    flashRed(); flashRed(); screenShakeHard()
    token.style.transition = "all 0.5s cubic-bezier(0.17,0.67,0.35,1.4)"
    token.style.opacity = "1"; token.style.transform = "scale(1.3) rotate(0deg)"; token.style.filter = "brightness(2) saturate(2)"
    setTimeout(() => { token.style.transition = "all 0.3s ease"; token.style.transform = "scale(1)"; token.style.filter = "brightness(1)"; portal.remove() }, 500)
    if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
  }, 100)
}

