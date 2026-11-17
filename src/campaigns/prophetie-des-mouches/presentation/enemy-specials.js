function showMobSpecialAttackEvent(data) {
  let overlay=null
  const scope=createPresentationScope("__cancelMobSpecialPresentation",()=>overlay?.querySelectorAll("audio,video").forEach(el=>el.pause()))
  const cleanup=scope.cancel,later=scope.later
  const pow=document.getElementById("powSound");if(pow)scope.audio(pow)
  const makeAudio=src=>{const audio=scope.audio(new Audio(src));audio.__specialEffect=true;return audio}

  const baseStyle = typeof getMobAnimationStyle === "function" ? getMobAnimationStyle(data.animation) : { accent:"#ff9966", glow:"rgba(255,120,60,0.55)", bg:"radial-gradient(circle at center,rgba(70,15,0,0.94) 0%,rgba(10,0,0,0.98) 72%)" }
  const presentation = typeof getMobSpecialPresentation === "function" ? getMobSpecialPresentation(data.mobName) : null
  const scene = String((presentation && presentation.scene) || "").toLowerCase()
  const style = scene === "vampire"
    ? {
        accent: "#8fd1ff",
        glow: "rgba(143,209,255,0.55)",
        bg: "radial-gradient(circle at center,rgba(26,52,98,0.86) 0%,rgba(8,18,42,0.94) 55%,rgba(2,6,18,0.99) 100%)"
      }
    : scene === "loup"
    ? {
        accent: "#a8c8f0",
        glow: "rgba(140,190,240,0.6)",
        bg: "radial-gradient(circle at 50% 40%,rgba(12,22,44,0.96) 0%,rgba(6,12,26,0.98) 55%,rgba(2,5,12,1) 100%)"
      }
    : scene === "gobelins"
    ? {
        accent: "#b8e060",
        glow: "rgba(140,200,60,0.55)",
        bg: "radial-gradient(circle at center,rgba(18,30,8,0.96) 0%,rgba(5,12,2,0.98) 60%,rgba(2,6,1,1) 100%)"
      }
    : scene === "valkyrie"
    ? {
        accent: "#ffe090",
        glow: "rgba(255,220,120,0.60)",
        bg: "radial-gradient(circle at 50% 30%,rgba(255,245,200,0.14) 0%,rgba(30,20,8,0.96) 28%,rgba(6,4,1,1) 100%)"
      }
    : scene === "liquorice"
    ? {
        accent: "#f0f0ff",
        glow: "rgba(220,220,255,0.55)",
        bg: "radial-gradient(circle at center,rgba(16,12,28,0.97) 0%,rgba(6,4,14,0.99) 60%,rgba(1,1,4,1) 100%)"
      }
    : scene === "garde"
    ? {
        accent: "#b0b8c8",
        glow: "rgba(160,170,190,0.50)",
        bg: "radial-gradient(circle at center,rgba(18,20,26,0.97) 0%,rgba(8,10,14,0.99) 60%,rgba(2,3,5,1) 100%)"
      }
    : scene === "bandit"
    ? {
        accent: "#c8a060",
        glow: "rgba(180,130,60,0.55)",
        bg: "radial-gradient(circle at center,rgba(14,10,4,0.97) 0%,rgba(4,3,1,0.99) 55%,rgba(0,0,0,1) 100%)"
      }
    : baseStyle
  overlay = scope.node(document.createElement("div"))
  overlay.className = "mobSpecialOverlay" + (scene ? " mobSpecialOverlay--" + scene : "")
  overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:999999999;background:" + style.bg + ";opacity:0;transition:opacity 0.22s ease;"

  if (scene === "vampire") {
    const blueWash = document.createElement("div")
    blueWash.className = "mobSpecialBlueWash"
    overlay.appendChild(blueWash)
  }
  if (scene === "witch") {
    const wickedWash = document.createElement("div")
    wickedWash.className = "mobSpecialWickedWash"
    overlay.appendChild(wickedWash)
  }
  if (scene === "ogre") {
    const ogreWash = document.createElement("div")
    ogreWash.className = "mobSpecialOgreWash"
    overlay.appendChild(ogreWash)
  }
  if (scene === "pretre") {
    const divineWash = document.createElement("div")
    divineWash.className = "mobSpecialDivineWash"
    overlay.appendChild(divineWash)
  }
  if (scene === "chnaw") {
    const chnawWash = document.createElement("div")
    chnawWash.className = "mobSpecialChnawWash"
    overlay.appendChild(chnawWash)
  }
  if (scene === "fantome") {
    const discoWash = document.createElement("div")
    discoWash.className = "mobSpecialDiscoWash"
    overlay.appendChild(discoWash)
  }
  if (scene === "jormungand") {
    const tideWash = document.createElement("div")
    tideWash.className = "mobSpecialTideWash"
    overlay.appendChild(tideWash)
  }
  if (scene === "kraken") {
    const krakenWash = document.createElement("div")
    krakenWash.className = "mobSpecialKrakenWash"
    overlay.appendChild(krakenWash)
  }
  if (scene === "nhiddog") {
    const bloodWash = document.createElement("div")
    bloodWash.className = "mobSpecialBloodWash"
    overlay.appendChild(bloodWash)
  }
  if (scene === "fenrir") {
    const fenrirWash = document.createElement("div")
    fenrirWash.className = "mobSpecialFenrirWash"
    overlay.appendChild(fenrirWash)
  }
  if (scene === "melenchon") {
    const tricolorWash = document.createElement("div")
    tricolorWash.className = "mobSpecialTricolorWash"
    overlay.appendChild(tricolorWash)
  }

  const stage = document.createElement("div")
  stage.className = "mobSpecialStage"
  overlay.appendChild(stage)

  if (presentation && presentation.video) {
    const stageVideo = document.createElement("video")
    stageVideo.className = "mobSpecialVideo" + (scene ? " mobSpecialVideo--" + scene : "")
    stageVideo.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.video) : "images/" + presentation.video
    stageVideo.autoplay = true
    stageVideo.loop = true
    stageVideo.muted = true
    stageVideo.playsInline = true
    stageVideo.setAttribute("playsinline", "")
    stageVideo.setAttribute("muted", "")
    overlay.appendChild(stageVideo)
    stageVideo.play().catch(() => {})
  }

  const ring = document.createElement("div")
  ring.className = "mobSpecialRing" + (scene ? " mobSpecialRing--" + scene : "")
  ring.style.cssText = "position:absolute;width:min(70vw,520px);height:min(70vw,520px);border-radius:50%;border:2px solid " + style.accent + ";box-shadow:0 0 60px " + style.glow + ", inset 0 0 50px rgba(255,255,255,0.05);animation:mobSpecialPulse 0.9s ease-in-out infinite alternate;"
  overlay.appendChild(ring)

  const box = document.createElement("div")
  box.className = "mobSpecialBox" + (scene ? " mobSpecialBox--" + scene : "")
  box.style.cssText = "position:relative;z-index:1;width:min(760px,88vw);padding:36px 34px;border:1px solid " + style.accent + ";border-radius:18px;background:linear-gradient(180deg,rgba(8,8,10,0.78),rgba(0,0,0,0.9));box-shadow:0 0 80px " + style.glow + ";text-align:center;overflow:hidden;"
  overlay.appendChild(box)

  if (presentation && presentation.image) {
    const heroImage = document.createElement("img")
    heroImage.className = "mobSpecialImage" + (scene ? " mobSpecialImage--" + scene : "")
    heroImage.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.image) : "images/" + presentation.image
    heroImage.alt = ""
    overlay.appendChild(heroImage)
  }

  if (presentation && presentation.sparkleImage) {
    const sparkle = document.createElement("img")
    sparkle.className = "mobSpecialSparkles" + (scene ? " mobSpecialSparkles--" + scene : "")
    sparkle.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.sparkleImage) : "images/" + presentation.sparkleImage
    sparkle.alt = ""
    sparkle.onerror = () => sparkle.style.display = "none"
    box.appendChild(sparkle)
  }

  if (presentation && Array.isArray(presentation.particles)) {
    presentation.particles.forEach((particle, idx) => {
      const glyph = document.createElement("div")
      glyph.className = "mobSpecialGlyph" + (scene ? " mobSpecialGlyph--" + scene : "")
      glyph.style.left = (18 + idx * 24) + "%"
      glyph.style.animationDelay = (idx * 0.16) + "s"
      glyph.innerText = particle
      stage.appendChild(glyph)
    })
  }

  if (scene === "witch") {
    const runeLeft = document.createElement("div")
    runeLeft.className = "mobSpecialRune mobSpecialRune--left"
    runeLeft.innerText = "✦"
    stage.appendChild(runeLeft)
    const runeRight = document.createElement("div")
    runeRight.className = "mobSpecialRune mobSpecialRune--right"
    runeRight.innerText = "✧"
    stage.appendChild(runeRight)
  }

  if (scene === "melenchon") {
    const crowd = document.createElement("div")
    crowd.className = "mobSpecialCrowd"
    stage.appendChild(crowd)
  }

  if (scene === "balraug") {
    const fissure = document.createElement("div")
    fissure.className = "mobSpecialFissure"
    stage.appendChild(fissure)
    const whip = document.createElement("div")
    whip.className = "mobSpecialWhip"
    stage.appendChild(whip)
  }

  if (scene === "jormungand") {
    const wave = document.createElement("div")
    wave.className = "mobSpecialWave"
    stage.appendChild(wave)
  }

  if (scene === "kraken") {
    const wave = document.createElement("div")
    wave.className = "mobSpecialKrakenWave"
    stage.appendChild(wave)
    const crack = document.createElement("div")
    crack.className = "mobSpecialScreenCrack"
    stage.appendChild(crack)
  }

  if (scene === "nhiddog") {
    const bloodSplash = document.createElement("img")
    bloodSplash.className = "mobSpecialBloodSplash"
    bloodSplash.src = typeof resolveImagePath === "function" ? resolveImagePath("blood_splash.png") : "images/blood_splash.png"
    bloodSplash.alt = ""
    stage.appendChild(bloodSplash)
  }

  if (scene === "chnaw") {
    for (let i = 0; i < 18; i++) {
      const clone = document.createElement("img")
      clone.className = "mobSpecialClone mobSpecialClone--chnaw"
      clone.src = typeof resolveImagePath === "function" ? resolveImagePath("chnaw.png") : "images/chnaw.png"
      clone.alt = ""
      clone.style.left = (Math.random() * 88 + 2) + "%"
      clone.style.top = (Math.random() * 78 + 6) + "%"
      clone.style.animationDelay = (Math.random() * 0.72).toFixed(2) + "s"
      clone.style.animationDuration = (0.45 + Math.random() * 0.42).toFixed(2) + "s"
      clone.style.setProperty("--chnaw-rot", (Math.random() * 30 - 15).toFixed(1) + "deg")
      stage.appendChild(clone)
    }
    const photoFlash = document.createElement("div")
    photoFlash.className = "mobSpecialCameraFlash"
    overlay.appendChild(photoFlash)
  }

  if (scene === "loup" || scene === "fenrir") {
    const moonWash = document.createElement("div")
    moonWash.className = "mobSpecialMoonWash"
    overlay.appendChild(moonWash)
    const moonDisc = document.createElement("div")
    moonDisc.className = "mobSpecialMoonDisc"
    overlay.appendChild(moonDisc)
  }

  if (scene === "valkyrie") {
    // Lance qui traverse l'écran en diagonale
    const spear = document.createElement("div")
    spear.className = "mobSpecialValkyireSpear"
    overlay.appendChild(spear)

    // Flash divin au moment de l'impact
    later(() => {
      const divFlash = document.createElement("div")
      divFlash.className = "mobSpecialValkyrieDivineFlash"
      overlay.appendChild(divFlash)
      later(() => divFlash.remove(), 800)
    }, 520)

    // Plumes qui tombent
    for (let i = 0; i < 22; i++) {
      const feather = document.createElement("div")
      feather.className = "mobSpecialFeather"
      feather.style.left = (Math.random() * 100) + "%"
      feather.style.animationDuration = (2.0 + Math.random() * 2.5) + "s"
      feather.style.animationDelay = (0.4 + Math.random() * 3.0) + "s"
      feather.style.fontSize = (10 + Math.random() * 10) + "px"
      feather.style.opacity = String(0.4 + Math.random() * 0.5)
      feather.innerText = "❧"
      overlay.appendChild(feather)
    }
  }

  if (scene === "liquorice") {
    const saltCount = 60
    for (let i = 0; i < saltCount; i++) {
      const grain = document.createElement("div")
      grain.className = "mobSpecialSaltGrain"
      grain.style.left = (Math.random() * 100) + "%"
      grain.style.animationDuration = (1.2 + Math.random() * 2.2) + "s"
      grain.style.animationDelay = (Math.random() * 3.5) + "s"
      grain.style.width = grain.style.height = (2 + Math.random() * 3) + "px"
      grain.style.opacity = String(0.5 + Math.random() * 0.5)
      overlay.appendChild(grain)
    }
  }

  if (scene === "bandit" && presentation && Array.isArray(presentation.slideImages) && presentation.slideImages.length) {
    // Positions éparpillées : [left%, top%, rotation]
    const positions = [
      [10,  6,  -6],
      [62, 4,   5],
      [12,  50, -4],
      [64, 48,  7]
    ]
    presentation.slideImages.forEach((src, i) => {
      const [l, t, r] = positions[i] || [10 + i * 22, 10 + i * 18, 0]
      const wrap = document.createElement("div")
      wrap.style.cssText = "position:absolute;left:" + l + "%;top:" + t + "%;transform:rotate(" + r + "deg);z-index:0;pointer-events:none;"
      const img = document.createElement("img")
      img.className = "mobSpecialBanditImg"
      img.alt = ""
      img.src = (typeof resolveImagePath === "function") ? resolveImagePath(src) : "images/" + src
      img.style.animationDelay = (i * 0.1) + "s"
      wrap.appendChild(img)
      overlay.appendChild(wrap)
    })
  }

  if (scene === "gobelins") {
    const bombXs = [18, 46, 72]
    bombXs.forEach((xPct, i) => {
      const bomb = document.createElement("img")
      bomb.className = "mobSpecialBomb"
      bomb.src = "images/bombe.png"
      bomb.alt = ""
      bomb.onerror = () => bomb.style.display = "none"
      bomb.style.left = xPct + "%"
      bomb.style.animationDelay = (i * 0.3) + "s"
      overlay.appendChild(bomb)

      const expl = document.createElement("div")
      expl.className = "mobSpecialExplosion"
      expl.style.left = xPct + "%"
      expl.style.animationDelay = (0.48 + i * 0.3) + "s"
      overlay.appendChild(expl)

      // Fumée principale
      const smoke = document.createElement("div")
      smoke.className = "mobSpecialSmoke"
      smoke.style.left = xPct + "%"
      smoke.style.animationDelay = (0.62 + i * 0.3) + "s"
      overlay.appendChild(smoke)

      // 2e nuage plus large
      const smoke2 = document.createElement("div")
      smoke2.className = "mobSpecialSmoke mobSpecialSmoke--wide"
      smoke2.style.left = xPct + "%"
      smoke2.style.animationDelay = (0.74 + i * 0.3) + "s"
      overlay.appendChild(smoke2)

      // Son bombe au moment de l'impact
      later(() => {
        const bSnd = makeAudio((typeof resolveAudioPath === "function") ? resolveAudioPath("bombe.mp3") : "audio/bombe.mp3")
        if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(bSnd, 0.68)
        bSnd.play().catch(() => {})
      }, 480 + i * 300)
    })
  }

  if (!["vampire", "melenchon", "ogre", "pretre", "chnaw", "fantome", "fenrir", "jormungand", "kraken", "nhiddog"].includes(scene)) {
    const icon = document.createElement("div")
    icon.style.cssText = "position:relative;z-index:2;font-size:64px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 0 18px " + style.accent + ");"
    icon.innerText = String(data.icon || "✦")
    box.appendChild(icon)
  }

  const mobName = document.createElement("div")
  mobName.style.cssText = "position:relative;z-index:2;font-family:Cinzel,serif;font-size:12px;letter-spacing:4px;color:" + style.accent + ";margin-bottom:10px;"
  mobName.innerText = pikaDisplayText(data.mobName || "")
  box.appendChild(mobName)

  const title = document.createElement("div")
  title.style.cssText = "position:relative;z-index:2;font-family:'Cinzel Decorative',serif;font-size:clamp(26px,3.8vw,42px);color:#fff3df;text-shadow:0 0 22px " + style.accent + ";margin-bottom:14px;"
  title.innerText = String(data.attackName || "")
  box.appendChild(title)

  if (presentation && presentation.kicker) {
    const kicker = document.createElement("div")
    kicker.className = "mobSpecialKicker"
    kicker.style.color = style.accent
    kicker.innerText = String(presentation.kicker)
    box.appendChild(kicker)
  }

  if (data.flavor) {
    let flavorHost = box
    if (presentation && presentation.quoteFrame) {
      const frame = document.createElement("img")
      frame.className = "mobSpecialQuoteFrame" + (scene ? " mobSpecialQuoteFrame--" + scene : "")
      frame.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.quoteFrame) : "images/" + presentation.quoteFrame
      frame.alt = ""
      frame.onerror = () => frame.style.display = "none"
      box.appendChild(frame)
      const quoteWrap = document.createElement("div")
      quoteWrap.className = "mobSpecialQuoteWrap" + (scene ? " mobSpecialQuoteWrap--" + scene : "")
      box.appendChild(quoteWrap)
      flavorHost = quoteWrap
    }
    const flavor = document.createElement("div")
    flavor.style.cssText = "position:relative;z-index:2;font-family:'IM Fell English',serif;font-size:clamp(18px,2.5vw,28px);line-height:1.45;color:#ffd7c2;max-width:620px;margin:0 auto 18px auto;"
    flavor.innerText = pikaDisplayText(data.flavor)
    flavorHost.appendChild(flavor)
  }

  const damage = document.createElement("div")
  damage.style.cssText = "position:relative;z-index:2;font-family:Cinzel,serif;font-size:30px;font-weight:bold;color:" + style.accent + ";text-shadow:0 0 18px " + style.accent + ";"
  damage.innerText = data.preview ? "APERÇU — animation et son uniquement" : data.damageSummary || "→ " + pikaDisplayText(data.target || "") + "  •  -" + clampInteger(data.dmg, 0, 9999) + " HP"
  box.appendChild(damage)

  let sceneAudio = null
  if (presentation && presentation.sound) {
    sceneAudio = makeAudio((typeof resolveAudioPath === "function") ? resolveAudioPath(presentation.sound) : "audio/" + presentation.sound)
    const specialVolume = Number.isFinite(parseFloat(presentation.soundVolume)) ? parseFloat(presentation.soundVolume) : 0.82
    setManagedAudioBaseVolume(sceneAudio, specialVolume)
    sceneAudio.play().catch(() => {})
  }
  if (scene === "balraug") {
    later(() => {
      const whipAudio = makeAudio((typeof resolveAudioPath === "function") ? resolveAudioPath("whip.mp3") : "audio/whip.mp3")
      if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(whipAudio, 0.88)
      else whipAudio.volume = 0.88
      whipAudio.play().catch(() => {})
    }, 140)
  }

  const impactFlash = document.createElement("div")
  impactFlash.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at center, rgba(255,255,255,0.22), rgba(255,255,255,0.06) 28%, transparent 62%);mix-blend-mode:screen;"
  overlay.appendChild(impactFlash)

  document.body.appendChild(overlay)
  later(() => { overlay.style.opacity = "1" }, 20)
  later(() => { playSound("powSound", 0.84, true) }, 80)
  later(() => {
    impactFlash.style.transition = "opacity 0.12s ease"
    impactFlash.style.opacity = "1"
    later(() => {
      impactFlash.style.transition = "opacity 0.4s ease"
      impactFlash.style.opacity = "0"
    }, 90)
  }, 75)
  later(() => screenShakeHard(), 40)
  later(() => screenShakeHard(), 150)
  later(() => screenShake(), 310)
  later(() => screenShakeHard(), 520)
  later(() => screenShake(), 760)
  if (scene === "gobelins") {
    later(() => screenShakeHard(), 480)
    later(() => screenShakeHard(), 780)
    later(() => screenShakeHard(), 1080)
  }
  later(() => {
    overlay.style.opacity = "0"
    later(cleanup,450)

  }, 6000)
  screenShakeHard()
  if (!scene || ["draugr", "ogre", "melenchon", "balraug", "dragon", "gobelins", "fenrir", "kraken", "jormungand", "nhiddog"].includes(scene)) screenShakeHard()
  return cleanup
}

// ─── mobAttackEvent ───
