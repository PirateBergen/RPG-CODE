function startBossFireEffect() {
  const existing = document.getElementById("bossFireOverlay"); if (existing) existing.remove()
  const overlay  = document.createElement("div"); overlay.id = "bossFireOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4999;opacity:0;transition:opacity 1.5s ease;"
  overlay.style.background = [
    "radial-gradient(ellipse at bottom,rgba(255,80,0,0.6) 0%,transparent 55%)",
    "radial-gradient(ellipse at bottom left,rgba(255,50,0,0.5) 0%,transparent 45%)",
    "radial-gradient(ellipse at bottom right,rgba(255,50,0,0.5) 0%,transparent 45%)"
  ].join(",")

  for (let i = 0; i < 40; i++) {
    const spark = document.createElement("div")
    const zone  = Math.random()
    let x, startY
    if (zone < 0.4)      { x = Math.random()*100; startY = 85+Math.random()*15 }
    else if (zone < 0.7) { x = Math.random()*12;  startY = 40+Math.random()*60 }
    else                 { x = 88+Math.random()*12; startY = 40+Math.random()*60 }
    const w = 4+Math.random()*10, h = 10+Math.random()*20
    spark.style.cssText = `position:absolute;width:${w}px;height:${h}px;border-radius:50% 50% 20% 20%;background:linear-gradient(to top,transparent,#ff6600,${Math.random()>0.5?"#ffcc00":"#ff3300"});left:${x}%;top:${startY}%;animation:bossFireSpark ${1+Math.random()*2.5}s ease-in infinite;animation-delay:${Math.random()*2}s;filter:blur(${Math.random()*2}px);`
    overlay.appendChild(spark)
  }

  const vignette = document.createElement("div")
  vignette.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(200,30,0,0.5);animation:bossVignettePulse 1.5s ease-in-out infinite alternate;"
  overlay.appendChild(vignette)
  document.body.appendChild(overlay)
  setTimeout(() => { overlay.style.opacity = "1" }, 50)
}

function stopBossFireEffect() {
  const overlay = document.getElementById("bossFireOverlay"); if (!overlay) return
  overlay.style.transition = "opacity 1.5s ease"; overlay.style.opacity = "0"
  setTimeout(() => overlay.remove(), 1500)
}

/* ========================= */
/* CINÉMATIQUE INTRO         */
/* ========================= */

