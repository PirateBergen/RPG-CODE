function showFlySwarmEffect() {
  if (document.getElementById("flySwarmOverlay")&&!window.__flySwarmScope?.resetting) return // déjà actif

  const scope=createPresentationScope("__cancelFlySwarm",()=>{
    if(scope.wordScreen){scope.wordScreen.classList.remove("active");scope.wordScreen.style.display="none"}
    if(window.__flySwarmScope===scope)window.__flySwarmScope=null
  })
  window.__flySwarmScope=scope

  // Base overlay — bleu brillant pulsant
  const ov = document.createElement("div")
  ov.id = "flySwarmOverlay"
  ov.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999974;opacity:0;transition:opacity 2s ease;background:radial-gradient(ellipse at center,rgba(140,210,255,0.28) 0%,rgba(60,140,255,0.18) 45%,rgba(0,20,80,0.22) 100%);animation:flySwarmPulse 2s ease-in-out infinite;"
  document.body.appendChild(scope.node(ov))
  scope.later(() => { ov.style.opacity = "1" }, 30)

  // Lueur centrale (orbe Thu'um)
  const glow = document.createElement("div")
  glow.id = "flySwarmGlow"
  glow.style.cssText = "position:fixed;top:50%;left:50%;width:500px;height:500px;pointer-events:none;z-index:9999975;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,0.75) 0%,rgba(160,225,255,0.55) 18%,rgba(80,170,255,0.3) 45%,transparent 72%);animation:flySwarmCenterPulse 1.8s ease-in-out infinite;filter:blur(22px);opacity:0;transition:opacity 2s ease;"
  document.body.appendChild(scope.node(glow))
  scope.later(() => { glow.style.opacity = "1" }, 100)

  // Anneaux de vent tourbillonnants
  const rings = document.createElement("div")
  rings.id = "flySwarmRings"
  rings.style.cssText = "position:fixed;top:50%;left:50%;pointer-events:none;z-index:9999976;opacity:0;transition:opacity 2.5s ease;"
  const ringDefs = [
    [110, 5, "windSwirlCW",  1.6, 0.85, 0],
    [185, 7, "windSwirlCCW", 2.4, 0.75, 0.3],
    [270, 5, "windSwirlCW",  3.1, 0.65, 0.6],
    [360, 8, "windSwirlCCW", 4.2, 0.55, 0.1],
    [145, 3, "windSwirlCCW", 1.2, 0.9,  0.8],
    [230, 4, "windSwirlCW",  2.8, 0.6,  0.4],
    [310, 6, "windSwirlCCW", 3.6, 0.5,  0.2],
  ]
  ringDefs.forEach(([r, t, anim, dur, alpha, delay]) => {
    const arc1 = document.createElement("div")
    arc1.style.cssText = `position:absolute;top:${-r}px;left:${-r}px;width:${r*2}px;height:${r*2}px;border:${t}px solid transparent;border-top-color:rgba(120,215,255,${alpha});border-right-color:rgba(80,180,255,${alpha*0.4});border-radius:50%;filter:blur(2px);animation:${anim} ${dur}s linear infinite;animation-delay:-${delay}s;`
    rings.appendChild(arc1)
    const arc2 = document.createElement("div")
    arc2.style.cssText = `position:absolute;top:${-r+8}px;left:${-r+8}px;width:${r*2-16}px;height:${r*2-16}px;border:${Math.max(2,t-2)}px solid transparent;border-bottom-color:rgba(200,240,255,${alpha*0.7});border-left-color:rgba(150,220,255,${alpha*0.25});border-radius:50%;filter:blur(3px);animation:${anim==="windSwirlCW"?"windSwirlCCW":"windSwirlCW"} ${dur*1.35}s linear infinite;animation-delay:-${delay+0.5}s;`
    rings.appendChild(arc2)
  })
  document.body.appendChild(scope.node(rings))
  scope.later(() => { rings.style.opacity = "1" }, 200)

  // Vignette bleue brillante sur les bords
  const flash = document.createElement("div")
  flash.id = "flySwarmFlash"
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999977;background:radial-gradient(ellipse at center,transparent 38%,rgba(40,110,255,0.35) 72%,rgba(100,200,255,0.6) 100%);opacity:0;transition:opacity 2.5s ease;"
  document.body.appendChild(scope.node(flash))
  scope.later(() => { flash.style.opacity = "1" }, 350)

  // Mouches (sombres pour contraster avec le bleu brillant)
  const buzzes = ["flyBuzz1", "flyBuzz2", "flyBuzz3"]
  for (let i = 0; i < 50; i++) {
    const fly = document.createElement("img")
    fly.src = "images/mouche.png"
    fly.className = "fly-particle"
    const size = 13 + Math.random() * 16
    const x = Math.random() * 100
    const y = Math.random() * 100
    const anim = buzzes[Math.floor(Math.random() * 3)]
    const dur = (0.25 + Math.random() * 0.42).toFixed(2)
    const delay = (Math.random() * 2).toFixed(2)
    fly.style.cssText = `position:fixed;left:${x}%;top:${y}%;width:${size}px;height:${size}px;object-fit:contain;pointer-events:none;z-index:9999979;opacity:0;transition:opacity 1.5s ease;animation:${anim} ${dur}s linear infinite;animation-delay:-${delay}s;filter:brightness(0.15) contrast(3);`
    document.body.appendChild(scope.node(fly))
    scope.later(() => { fly.style.opacity = (0.65 + Math.random() * 0.35).toFixed(2) }, 100 + i * 35)
  }

  // Son
  const snd = document.getElementById("flySwarmSound")
  if (snd) {
    scope.audio(snd);snd.currentTime = 0; setManagedAudioBaseVolume(snd,0); snd.play().catch(() => {})
    let v = 0
    const fade = scope.every(() => { v = Math.min(v + 0.05, 0.75); setManagedAudioBaseVolume(snd,v); if (v >= 0.75) clearInterval(fade) }, 100)
  }

}

function resetFlySwarmPresentation() {
  const scope=window.__flySwarmScope
  if(!scope||scope.cancelled||scope.resetting)return
  scope.resetting=true;scope.stopTimers()
  // 1. Mouches qui s'envolent
  document.querySelectorAll(".fly-particle").forEach(f => {
    const dx = ((Math.random() - 0.5) * 400).toFixed(0)
    const dy = (-(80 + Math.random() * 300)).toFixed(0)
    f.style.animation = "none"
    f.style.transition = "opacity 0.9s ease, transform 0.9s ease"
    f.style.transform = `translate(${dx}px, ${dy}px) scale(2.5)`
    f.style.opacity = "0"
    scope.later(() => { if (f.parentNode) f.remove() }, 950)
  })

  // 2. pow.mp3 + message style Thu'um exact
  scope.later(() => {
    const pow = scope.audio(new Audio("audio/pow.mp3"))
    setManagedAudioBaseVolume(pow,.85)
    pow.play().catch(() => {})

    const screen = document.getElementById("thuumUnlockScreen")
    const image  = document.getElementById("thuumUnlockImage")
    const title  = document.getElementById("thuumUnlockTitle")
    const words  = document.getElementById("thuumUnlockWords")
    const player = document.getElementById("thuumUnlockPlayer")
    if (!screen || !title || !words) return

    if (image)  image.src   = "images/thuum.png"
    title.innerText          = "Un mot de pouvoir"
    words.innerText          = "apparaît gravé dans le sol"
    if (player) player.innerText = ""

    scope.wordScreen=screen
    screen.style.display = "flex"
    scope.frame(() => screen.classList.add("active"))
    if (typeof screenShakeHard === "function") screenShakeHard()

    scope.later(() => {
      screen.classList.remove("active")
      scope.later(() => { screen.style.display = "none" }, 600)
    }, 6200)
  }, 500)

  // 3. Anneaux/lueur s'estompent pendant le message
  ;["flySwarmRings", "flySwarmGlow"].forEach(id => {
    scope.later(() => {
      const el = document.getElementById(id)
      if (el) { el.style.transition = "opacity 2s ease"; el.style.opacity = "0"; scope.later(() => { if (el.parentNode) el.remove() }, 2100) }
    }, 4500)
  })

  // 4. Atmosphère bleue disparaît après le message
  ;["flySwarmOverlay", "flySwarmFlash"].forEach(id => {
    scope.later(() => {
      const el = document.getElementById(id)
      if (el) { el.style.transition = "opacity 2.5s ease"; el.style.opacity = "0"; scope.later(() => { if (el.parentNode) el.remove() }, 2600) }
    }, 6000)
  })

  // 5. Son qui s'estompe
  const snd = document.getElementById("flySwarmSound")
  if (snd) {
    scope.later(() => {
      let v = snd.__baseVolume || 0
      const fade = scope.every(() => { v = Math.max(v - 0.03, 0); setManagedAudioBaseVolume(snd,v); if (v <= 0) { clearInterval(fade); snd.pause(); snd.currentTime = 0 } }, 100)
    }, 3000)
  }
  scope.later(scope.cancel,8700)
}


// Local display preferences never change the shared game state.
