function playRoiIntro(mob, tierMob) {
  if(isKingEncounter(window.__combatSnapshot?.mob)){_startCombatSequence(mob,tierMob);return}
  stopAllMusic()
  const intro = document.getElementById("combatIntro"); intro.style.display = "flex"
  const cf    = document.getElementById("combatFilter")
  cf.style.cssText = "display:block;opacity:1;transition:none;background:rgba(120,0,0,0.7);"
  screenShakeHard(); setTimeout(() => screenShakeHard(), 400); setTimeout(() => screenShakeHard(), 800)
  playSound("combatSound", 0.4)

  setTimeout(() => {
    intro.style.display = "none"
    cf.style.opacity = "0.5"; cf.style.background = "rgba(120,0,0,0.5)"
    const box = document.getElementById("storyImage"); const img = document.getElementById("storyImageContent")
    if (box && img) {
      img.src = "images/roi.png"; box.style.opacity = "0"; box.style.left = "50%"
      box.style.transform = "translateX(-50%)"; box.style.right = "auto"; box.style.display = "flex"
      setTimeout(() => { box.style.transition = "opacity 0.8s"; box.style.opacity = "1" }, 50)
    }
    const roiSnd = new Audio("audio/roi.mp3"); setManagedAudioBaseVolume(roiSnd,1); roiSnd.play().catch(() => {})
    setTimeout(() => {
      let iv = setInterval(() => { if (roiSnd.__baseVolume > 0.04) setManagedAudioBaseVolume(roiSnd,Math.max(0,roiSnd.__baseVolume-0.05)); else { roiSnd.pause(); clearInterval(iv) } }, 80)
    }, 15000)
    setTimeout(() => {
      if(isGM)db.ref("game/storyImage").remove()
      if (box) { box.style.transition = "opacity 1s ease"; box.style.opacity = "0" }
      cf.style.transition = "opacity 1s ease"; cf.style.opacity = "0"
    }, 15000)
    setTimeout(() => {
      if (box) { box.style.display = "none"; box.style.opacity = "" }
      cf.style.transition = "none"; cf.style.display = "none"; cf.style.opacity = "1"; cf.style.background = ""
      _startCombatSequence(mob, tierMob)
    }, 16000)
  }, 2000)
}

