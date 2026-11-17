function getPlayerSpecialPresentation(playerId) {
  const key = String(playerId || "").toLowerCase()
  const map = {
    greg: {
      scene: "greg",
      kicker: "FINISHER",
      accent: "#d9b37c",
      glow: "rgba(217,179,124,0.38)",
      image: "gregspé.jpg",
      quoteFrame: "cadre.png"
    },
    ju: {
      scene: "yu",
      kicker: "RIPOSTE",
      accent: "#8fc9ff",
      glow: "rgba(143,201,255,0.34)",
      image: "pika.png",
      quoteFrame: "cadre.png"
    },
    elo: {
      scene: "elo",
      kicker: "INCANTATION",
      accent: "#9cf2cf",
      glow: "rgba(156,242,207,0.34)",
      image: "elospé.jpg",
      quoteFrame: "cadre.png"
    },
    bibi: {
      scene: "bibi",
      kicker: "RAGE CANINE",
      accent: "#ffd28d",
      glow: "rgba(255,210,141,0.34)",
      image: "bibispé.png",
      quoteFrame: "cadre.png"
    }
  }
  return map[key] || map.greg
}

function showPlayerSpecialCinematic(playerId, attack, outcome, meta = {}) {
  const scope=createPresentationScope("__cancelPlayerSpecial")
  for(const id of ["powSound","critSound","critFailSound"]){const audio=document.getElementById(id);if(audio)scope.audio(audio)}
  const presentation = getPlayerSpecialPresentation(playerId)
  const specialSoundMap = {
    greg: "spégreg.mp3",
    elo: "spéelo.mp3",
    bibi: "spébibi.mp3"
  }
  playSound("powSound",0.84,true)
  const overlay = scope.node(document.createElement("div"))
  overlay.className = "playerSpecialOverlay playerSpecialOverlay--" + presentation.scene

  const stage = document.createElement("div")
  stage.className = "playerSpecialStage"
  overlay.appendChild(stage)

  if (presentation.video) {
    const heroVideo = scope.audio(document.createElement("video"))
    heroVideo.className = "playerSpecialVideo playerSpecialVideo--" + presentation.scene
    heroVideo.src = "images/" + presentation.video
    heroVideo.autoplay = true
    heroVideo.loop = true
    heroVideo.muted = false
    heroVideo.__specialEffect = true
    heroVideo.volume = 0.88
    heroVideo.playsInline = true
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(heroVideo, 0.88)
    heroVideo.onerror = () => heroVideo.style.display = "none"
    stage.appendChild(heroVideo)
    heroVideo.play().catch(()=>{if(scope.cancelled)return;heroVideo.muted=true;heroVideo.play().catch(()=>{})})
  } else if (presentation.image) {
    const heroImage = document.createElement("img")
    heroImage.className = "playerSpecialImage playerSpecialImage--" + presentation.scene
    heroImage.src = "images/" + presentation.image
    heroImage.alt = ""
    heroImage.onerror = () => heroImage.style.display = "none"
    stage.appendChild(heroImage)
  }

  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.alt = ""
  ring.className = "playerSpecialRing"
  stage.appendChild(ring)

  const slash = document.createElement("img")
  slash.src = "images/" + ((presentation.scene === "elo" || presentation.scene === "yu") ? "rune_glow.png" : "slash_overlay.png")
  slash.alt = ""
  slash.className = "playerSpecialSlash"
  stage.appendChild(slash)

  const box = document.createElement("div")
  box.className = "playerSpecialBox"

  const kicker = document.createElement("div")
  kicker.className = "playerSpecialKicker"
  kicker.style.color = presentation.accent
  kicker.innerText = meta.fail ? "ÉLAN BRISÉ" : meta.crit ? "MOMENT DÉCISIF" : presentation.kicker
  box.appendChild(kicker)

  const title = document.createElement("div")
  title.className = "playerSpecialTitle"
  title.innerText = String(attack.name || "SPÉCIALE").toUpperCase()
  box.appendChild(title)

  let flavorText = meta.preview ? "APERÇU — aucun dégât ni soin appliqué" : outcome.mode === "heal"
    ? heroDisplayName(playerId).toUpperCase() + " restaure " + (outcome.amount || 0) + " PV"
    : heroDisplayName(playerId).toUpperCase() + " frappe " + pikaDisplayText(outcome.targetName || "MOB") + " pour " + (outcome.amount || 0) + " dégâts"

  if(!meta.preview&&outcome.groupHealAmount>0)flavorText+=" · +"+outcome.groupHealAmount+" PV rendus au groupe"
  let flavorHost = box
  if (presentation.quoteFrame) {
    const frame = document.createElement("img")
    frame.className = "playerSpecialQuoteFrame playerSpecialQuoteFrame--" + presentation.scene
    frame.src = "images/" + presentation.quoteFrame
    frame.alt = ""
    frame.onerror = () => frame.style.display = "none"
    box.appendChild(frame)

    const quoteWrap = document.createElement("div")
    quoteWrap.className = "playerSpecialQuoteWrap playerSpecialQuoteWrap--" + presentation.scene
    box.appendChild(quoteWrap)
    flavorHost = quoteWrap
  }

  const sub = document.createElement("div")
  sub.className = "playerSpecialSub"
  sub.style.color = presentation.accent
  sub.innerText = flavorText
  flavorHost.appendChild(sub)

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  const specialSound = specialSoundMap[String(playerId || "").toLowerCase()]
  if (specialSound) {
    const voice = scope.audio(new Audio("audio/" + specialSound));voice.__specialEffect=true
    const isEloSpecial = String(playerId || "").toLowerCase() === "elo"
    const baseVolume = isEloSpecial ? (meta.crit ? 1.25 : 1.12) : (meta.crit ? 0.96 : 0.88)
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(voice, baseVolume)
    else voice.volume = Math.min(1, baseVolume)
    voice.play().catch(() => {})
  }

  if (meta.fail) {
    playSound("critFailSound", 0.82, true)
    flashRed()
    screenShake()
  } else if (meta.crit) {
    playSound("critSound", 0.95, true)
    flashGold()
    flashGold()
    screenShakeHard()
    scope.later(() => screenShake(), 180)
    scope.later(() => screenShakeHard(), 360)
    powerExplosion()
  } else {
    flashGold()
    screenShake()
    scope.later(() => screenShake(), 160)
  }

  scope.later(() => {
    overlay.querySelectorAll("video").forEach(video=>video.pause())
    overlay.style.transition = "opacity 0.42s ease"
    overlay.style.opacity = "0"
    scope.later(scope.cancel,450)
  }, 6000)
  return scope.cancel
}

function showPlayerAttackImpact(playerId, attack, outcome, meta = {}) {
  if (meta.special) {
    return showPlayerSpecialCinematic(playerId, attack, outcome, meta)
  }
  const type = getPlayerAttackTypeKey(attack)
  const crit = !!meta.crit
  const fail = !!meta.fail

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999995;display:flex;align-items:center;justify-content:center;"

  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.alt = ""
  ring.style.cssText = "position:absolute;width:min(44vw,420px);opacity:0.22;filter:drop-shadow(0 0 22px rgba(255,210,120,0.28));animation:combatEventPulse 0.42s ease-out 2;"
  overlay.appendChild(ring)

  const slash = document.createElement("img")
  slash.src = "images/" + (type === "spell" || type === "analysis" || type === "summon" ? "rune_glow.png" : "slash_overlay.png")
  slash.alt = ""
  slash.style.cssText = "position:absolute;width:min(56vw,520px);opacity:0.2;transform:rotate(" + (Math.random() * 16 - 8) + "deg);filter:drop-shadow(0 0 16px rgba(255,255,255,0.14));"
  overlay.appendChild(slash)

  const box = document.createElement("div")
  const colorMap = {
    physical: "#d9b37c",
    ranged: "#c8d7ea",
    special: "#ffd28d",
    charm: "#d6a6ff",
    spell: "#8ff0d2",
    analysis: "#8fc9ff",
    summon: "#c1a0ff",
    heal: "#b8ffd2"
  }
  const accent = fail ? "#b86868" : (colorMap[type] || "#d9b37c")
  box.style.cssText = "position:relative;min-width:min(52vw,580px);max-width:72vw;padding:18px 30px;border:1px solid rgba(230,190,110,0.3);background:linear-gradient(135deg,rgba(6,14,18,0.9),rgba(12,20,24,0.84));box-shadow:0 0 30px rgba(0,0,0,0.44), inset 0 0 22px rgba(255,255,255,0.03);"

  const kicker = document.createElement("div")
  kicker.style.cssText = "font-family:Cinzel,serif;font-size:12px;letter-spacing:3px;color:" + accent + ";text-align:center;margin-bottom:6px;"
  kicker.innerText = fail ? "ÉLAN BRISÉ" : crit ? "FRAPPE CRITIQUE" : "ACTION DU JOUEUR"
  box.appendChild(kicker)

  const title = document.createElement("div")
  title.style.cssText = "font-family:'Uncial Antiqua','Cinzel',serif;font-size:30px;line-height:1.15;text-align:center;color:#f4ead2;text-shadow:0 0 16px rgba(0,0,0,0.5);"
  title.innerText = String(attack.name || "ATTAQUE").toUpperCase()
  box.appendChild(title)

  const sub = document.createElement("div")
  sub.style.cssText = "margin-top:10px;font-family:Cinzel,serif;font-size:14px;letter-spacing:1px;text-align:center;color:" + accent + ";"
  if (outcome.mode === "heal") sub.innerText = heroDisplayName(outcome.targetName || playerId).toUpperCase() + " récupère " + (outcome.amount || 0) + " PV"
  else sub.innerText = heroDisplayName(playerId).toUpperCase() + " frappe " + pikaDisplayText(outcome.targetName || "MOB") + " pour " + (outcome.amount || 0) + " dégâts"
  box.appendChild(sub)

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  if (fail) {
    playSound("critFailSound", 0.8)
    flashRed()
    screenShake()
  } else if (crit) {
    playSound("critSound", 0.9)
    flashGold()
    flashGold()
    screenShakeHard()
    powerExplosion()
  } else if (type === "heal") {
    playSound("powerSound", 0.42)
    flashGold()
  } else if (type === "spell" || type === "analysis" || type === "summon" || type === "charm") {
    playSound("powerSound", 0.5)
    flashGold()
    screenShake()
  } else {
    playSound("powerSound", 0.34)
    screenShake()
  }

  setTimeout(() => {
    overlay.style.transition = "opacity 0.35s ease"
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), 380)
  }, crit ? 2150 : 1800)
}

