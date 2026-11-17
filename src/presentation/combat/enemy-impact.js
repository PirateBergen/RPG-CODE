function showMobAttackPresentation(data) {
  if (data.special) {
    showMobSpecialAttackEvent(data)
    return
  }
  const notif = document.createElement("div")
  notif.className = "combatEventCard"
  notif.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;opacity:0;transition:opacity 0.3s ease;"
  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.className = "combatEventRing"
  ring.alt = ""
  ring.onerror = () => ring.style.display = "none"
  notif.appendChild(ring)
  const slash = document.createElement("img")
  slash.src = "images/slash_overlay.png"
  slash.className = "combatEventSlash"
  slash.alt = ""
  slash.onerror = () => slash.style.display = "none"
  notif.appendChild(slash)
  const panel = document.createElement("div")
  panel.className = "combatEventPanel"
  const icon = document.createElement("img")
  if (typeof createCombatIcon === "function") {
    const mapped = createCombatIcon({ name:data.attackName, effect:data.effect, type:data.type, animation:data.animation }, { name:data.mobName }, "combatEventIcon")
    icon.src = mapped.getAttribute("src") || ""
  } else {
    icon.src = "images/slash_overlay.png"
  }
  icon.className = "combatEventIcon"
  icon.alt = ""
  icon.onerror = () => icon.style.display = "none"
  panel.appendChild(icon)
  if (data.mobName) {
    const mobName = document.createElement("div")
    mobName.className = "combatEventMobName"
    mobName.innerText = pikaDisplayText(data.mobName)
    panel.appendChild(mobName)
  }
  const attackName = document.createElement("div")
  attackName.className = "combatEventAttackName"
  attackName.innerText = pikaDisplayText(data.attackName || "")
  panel.appendChild(attackName)
  const targetLine = document.createElement("div")
  targetLine.className = "combatEventTarget"
  targetLine.appendChild(document.createTextNode("Cible "))
  const targetStrong = document.createElement("span")
  targetStrong.className = "combatEventTargetName"
  targetStrong.innerText = pikaDisplayText(data.target || "")
  targetLine.appendChild(targetStrong)
  panel.appendChild(targetLine)
  const damage = document.createElement("div")
  damage.className = "combatEventDamage"
  damage.innerText = data.damageSummary || "-" + clampInteger(data.dmg, 0, 9999) + " HP"
  if(data.target==="TOUS")damage.style.fontSize="clamp(16px,2vw,24px)"
  panel.appendChild(damage)
  notif.appendChild(panel)
  document.body.appendChild(notif)
  setTimeout(() => { notif.style.opacity = "1" }, 30)
  setTimeout(() => {
    notif.style.opacity = "0"
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 500)

  }, 2800)
  screenShakeHard()
  playSound("powerSound", 0.52)

}
window.showMobAttackPresentation=showMobAttackPresentation
db.ref("game/mobAttackEvent").on("value",snap=>{
  const data=snap.val()
  if(!window.__sessionBusy && data?.time >= (window.__pageLoadTime||0))enqueueSharedVisual("legacy-mob-"+data.time,()=>showMobAttackPresentation(data),data.special?7000:3400)
})

// ─── curse/wheel ───
db.ref("curse/wheel").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) {
    window.__curseWheelTriggeredFor = null
    window.__activeCurseWheel = null
    if(typeof presentSavedCurseWheel==="function")presentSavedCurseWheel(null)
    return
  }
  if(typeof presentSavedCurseWheel==="function")presentSavedCurseWheel(data)
})


// ─── runeChallenge ───
db.ref("game/runeChallenge").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  const hadSnapshot=window.__runeChallengeSnapshotSeen===true
  window.__runeChallengeSnapshotSeen=true
  const previous = window.activeRuneChallengeData || null
  window.activeRuneChallengeData = data || null
  if (!data || !data.active) {
    cleanupRuneChallengeUI()
    updateRuneMenuBtn(false)
    updateThuumButton()
    return
  }
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  updateRuneMenuBtn(true)
  const overlay = document.getElementById("runeChallengeOverlay")
  // Initial snapshots and saved events restore progress, not a local open window.
  const shouldOpenFresh = hadSnapshot && Number(data.time)>=(window.__pageLoadTime||0) && (
    !previous || !previous.active || previous.time !== data.time
  )
  if (overlay) {
    overlay.remove()
    renderRuneChallenge(data)
  } else if (shouldOpenFresh) {
    renderRuneChallenge(data)
  }
  if (isGM && shouldOpenFresh && !_state.runeJustOpened) _state.runeJustOpened = true
  updateThuumButton()
})

