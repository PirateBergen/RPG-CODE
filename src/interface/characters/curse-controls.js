async function toggleCurse(level) {
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!isGM && targetId !== (myToken && myToken.id)) return
  if (!targetId || targetId === "bibi") return
  if(!Number.isInteger(level)||level<0||level>8)return
  const generation=window.__sheetViewGeneration
  try{await persistCharacterEdits(targetId,{curse:level})}catch(error){showNotification("Malédiction non confirmée : "+error.message);return}
  if(generation!==window.__sheetViewGeneration||(currentSheetPlayer||myToken?.id)!==targetId)return
  const previousLevel = curseLevel
  if (level === 8) addMJLog("☠ Malédiction complète !")
  curseLevel = level
  document.querySelectorAll(".curseGem").forEach((g, i) => g.classList.toggle("active", i < level))
  const targetToken = document.getElementById(targetId)
  if (level === 8) {
    flashRed()
    screenShakeHard()
    showNotification("La malédiction est complète !")
    if (targetToken) {
      targetToken.classList.add("cursed")
      startBloodEffect(targetToken)
    }
    if (previousLevel < 8) {
      window.__curseWheelTriggeredFor = String(targetId).toLowerCase()
      showCurseIntro(targetId)

    }
  }
  if (level < 8 && targetToken) {
    targetToken.classList.remove("cursed")
    stopBloodEffect(targetToken)
  }
  if (level < 8 && window.__curseWheelTriggeredFor === String(targetId).toLowerCase()) {
    window.__curseWheelTriggeredFor = null
  }
}


async function setCorruption(level) {
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!isGM && targetId !== (myToken && myToken.id)) return
  if (!targetId) return
  if(targetId === "bibi")return
  if(!Number.isInteger(level)||level<0||level>10)return
  const generation=window.__sheetViewGeneration
  try{await persistCharacterEdits(targetId,{corruption:level})}catch(error){showNotification("Don non confirmé : "+error.message);return}
  if(generation!==window.__sheetViewGeneration||(currentSheetPlayer||myToken?.id)!==targetId)return
  corruptionLevel = level
  document.querySelectorAll(".corruptionPoint").forEach((b, i) => b.classList.toggle("active", i < level))
  const targetToken = document.getElementById(targetId)
  if (level === 10) {
    addMJLog("✨ Pouvoir activé pour " + targetId)
    flashGold()
    screenShake()
    powerExplosion()
    showNotification("Pouvoir disponible !")
    if (targetToken) targetToken.classList.add("powerReady")
    activatePowerMode(targetId)
  }
  if (level < 10 && targetToken) targetToken.classList.remove("powerReady", "powerFull")
}




