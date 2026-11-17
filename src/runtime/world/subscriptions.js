function syncMapElementsFromDB() {
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  document.querySelectorAll("[id^='elem_']").forEach(el => el.remove())
  db.ref("elements").once("value", snap => {
    const data = snap.val()
    if (!data) return
    Object.values(data).forEach(item => {
      if (item) renderMapElement(item)
    })
  })
}

function syncWantedStateFromDB() {
  return db.ref("game").once("value").then(snap=>syncSharedExplorationState(snap.val()||{}))
}

// ─── wantedPosters ───
// game/wantedPosters : synchronisation dans exploration.js

// ─── wantedOpen ───
// game/wantedOpen : synchronisation dans exploration.js

// ─── wantedBoardOpen ───
// game/wantedBoardOpen : synchronisation dans exploration.js

// ─── simonState ───
db.ref("game/simonState").on("value", snap => {
  if (window.__sessionBusy) return
  const simon = snap.val(); if (!simon || gameState !== "GAME") return
  db.ref("game/cemeterySpell").once("value", s => {
    const spell = s.val()
    if (!spell || !spell.glipheShown || spell.freed) return
    if(typeof showSimonGame==="function")showSimonGame(spell,simon)
  })
})

// ─── document — indices / notes ───
// game/document : synchronisation dans exploration.js

// ─── playerAllyAccess — bouton invocations donné par le MJ ───
db.ref("game/playerAllyAccess").on("value", snap => {
  if (window.__sessionBusy) return
  if (isGM) return
  const data = snap.val()
  window.playerAllyAccessData = data || null
  const existing = document.getElementById("allyViewerPanel")

  if (existing) existing.remove()
  updateThuumButton()
})

// ─── playerThuum — cris débloqués ───
db.ref("game/playerThuum").on("value", snap => {
  if (window.__sessionBusy) return
  window.playerThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

db.ref("game/playerThuumAccess").on("value", snap => {
  if (window.__sessionBusy) return
  window.playerThuumAccessData = snap.val() || {}
  updateThuumButton()
})

// ─── usedThuum — cooldown par combat ───
db.ref("combat/usedThuum").on("value", snap => {
  if (window.__sessionBusy) return
  window.usedThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

// ─── thuumUnlockEvent — découverte globale ───
db.ref("game/thuumUnlockEvent").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumUnlockTime) return
  if (Date.now() - data.time > 8000) { void 0; return } // purge donnée obsolète
  window.__lastThuumUnlockTime = data.time
  showThuumUnlockCinematic(data)
  setTimeout(updateThuumButton, 250)
  setTimeout(updateThuumButton, 1200)
})

// ─── thuumCast — utilisation globale ───
db.ref("game/thuumCast").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time < (window.__pageLoadTime || 0) || data.time <= window.__lastThuumCastTime) return
  window.__lastThuumCastTime = data.time
  if(data.outsideCombat !== false)enqueueSharedVisual("thuum-"+data.time,()=>playThuumCastEffect(data),2000)
})

// ─── allyBroadcast — cinématique invocation alliée (visible par tous) ───
db.ref("combat/allyBroadcast").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (typeof showAllyActionResult === "function") showAllyActionResult(data)
})

// ─── allyAction — PNJ allié en combat (legacy, gardé pour compatibilité) ───
db.ref("game/allyAction").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (typeof showAllyActionResult === "function") showAllyActionResult(data)
})

// ─── mapAudio — musique spécifique à la map ───
// game/mapAudio : contrôleur de reprise partagé.

