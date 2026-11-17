function triggerFlySwarm() {
  if(!isGM)return
  db.ref("events/flySwarm").set({ active: true, time: Date.now() })
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
}

function stopFlySwarm() {
  if(!isGM)return
  db.ref("events/flySwarm").remove()
}

/* ========================= */
/* TOKENS                    */
/* ========================= */

