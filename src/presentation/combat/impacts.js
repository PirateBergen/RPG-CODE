function screenShake() {
  const wrapper = document.getElementById("camera")
  if (!wrapper) return
  const intensity = 8, duration = 400, start = Date.now()
  function shake() {
    if (Date.now() - start < duration) {
      const x = (Math.random() - 0.5) * intensity
      const y = (Math.random() - 0.5) * intensity
      wrapper.style.transform = `scale(${cameraZoom}) translate(${cameraX + x}px, ${cameraY + y}px)`
      requestAnimationFrame(shake)
    } else { updateCamera() }
  }
  shake()
}

function screenShakeHard() {
  const camera = document.getElementById("camera")
  if (!camera) return
  let i = 0
  const interval = setInterval(() => {
    camera.style.transform = `scale(${cameraZoom * 1.01}) translate(${cameraX + (Math.random() * 20 - 10)}px, ${cameraY + (Math.random() * 20 - 10)}px)`
    if (++i > 25) { clearInterval(interval); updateCamera() }
  }, 40)
}

function flashGold() {
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:gold;opacity:0.4;pointer-events:none;z-index:4000;"
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 150)
}

function flashRed() {
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:red;opacity:0.4;pointer-events:none;z-index:8000;"
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 200)
}

function powerExplosion() {
  const exp = document.createElement("div")
  exp.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(circle,gold 0%,rgba(255,215,0,0.8) 30%,rgba(255,215,0,0.2) 60%,transparent 80%);border-radius:50%;pointer-events:none;z-index:9000;animation:explodePower 0.8s ease-out;"
  document.body.appendChild(exp)
  setTimeout(() => exp.remove(), 800)
}

function damageEffect(id) {
  const token = document.getElementById(id)
  if (!token) return
  token.classList.add("damageFlash")
  setTimeout(() => token.classList.remove("damageFlash"), 400)
}

function updateTokenGlow(id, hp) {
  const token = document.getElementById(id)
  if (!token) return
  token.classList.remove("lowHP", "midHP", "fullHP")
  if (hp > 60)      token.classList.add("fullHP")
  else if (hp > 30) token.classList.add("midHP")
  else              token.classList.add("lowHP")
}

function spawnPortal(tokenID) {
  if((document.body.classList.contains("worldPartyView")||document.body.classList.contains("oregonVoyageView"))&&["greg","ju","elo","bibi"].includes(tokenID))return
  const token = document.getElementById(tokenID)
  if (!token) return
  const portal = document.createElement("div")
  portal.className = "portalEffect"
  token.appendChild(portal)
  setTimeout(() => portal.remove(), 1500)
}

function spawnVictoryParticles() {
  const box = document.getElementById("storyImage")
  if (!box) return
  for (let i = 0; i < 25; i++) {
    const p = document.createElement("div")
    p.className = "victoryParticle"
    p.style.left = (40 + Math.random() * 20) + "%"
    p.style.top  = (50 + Math.random() * 10) + "%"
    p.style.animationDuration = (1 + Math.random() * 1.5) + "s"
    box.appendChild(p)
    setTimeout(() => p.remove(), 1500)
  }
}

function spawnParticles() {
  const container = document.getElementById("locationParticles")
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div")
    p.className = "particle"
    p.style.left = Math.random() * 100 + "%"
    p.style.bottom = "0px"
    p.style.animationDuration = (2 + Math.random() * 2) + "s"
    container.appendChild(p)
    setTimeout(() => p.remove(), 4000)
  }
}

function showLevelUpEffect(playerID) {
  const token = document.getElementById(playerID)
  if (!token) return
  const container = document.createElement("div")
  container.className = "levelUpContainer"
  const beam = document.createElement("div")
  beam.className = "levelBeam"
  container.appendChild(beam)
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div")
    p.className = "levelParticle"
    p.style.left = (Math.random() * 140 - 70) + "px"
    p.style.bottom = "0px"
    p.style.animationDuration = (1 + Math.random()) + "s"
    container.appendChild(p)
  }
  token.appendChild(container)
  setTimeout(() => container.remove(), 2000)
}

function showLevelUpText(player) {
  const msg = document.createElement("div")
  msg.innerText = "LEVEL UP"
  msg.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(0.5);font-family:Cinzel;font-size:80px;color:gold;text-shadow:0 0 10px gold,0 0 30px orange,0 0 60px gold;pointer-events:none;z-index:999999999;opacity:0;transition:all 0.6s ease;"
  document.body.appendChild(msg)
  setTimeout(() => { msg.style.opacity = "1"; msg.style.transform = "translate(-50%,-50%) scale(1.2)" }, 50)
  setTimeout(() => { msg.style.opacity = "0"; msg.style.transform = "translate(-50%,-50%) scale(1.8)" }, 2000)
  setTimeout(() => msg.remove(), 3000)
}

