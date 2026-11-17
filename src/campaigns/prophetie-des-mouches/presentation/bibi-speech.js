function tryBark() {
  const now = Date.now()
  if (now - lastBarkTime < barkCooldown) return
  if (Math.floor(Math.random() * 10) !== 0) return
  lastBarkTime = now
  const bark = document.getElementById("bark")
  if (bark) { bark.currentTime = 0; bark.__baseVolume = 0.35; bark.__audioChannel = "effects"; bark.volume = getScaledAudioVolume(0.35, "effects",bark); bark.play().catch(() => {}) }
  const barks = ["Wouf !", "Rrr !", "Snif !", "Miii !"]
  showBibiSpeech(barks[Math.floor(Math.random() * barks.length)])
}

function showBibiSpeech(text) {
  addMJLog("🐶 Bibi : " + text)
  const bibi = document.getElementById("bibi")
  if (!bibi) return
  const bubble = document.createElement("div")
  bubble.className = "speechBubble"
  bubble.innerText = text
  bibi.appendChild(bubble)
  setTimeout(() => bubble.remove(), 3000)
}

/* ========================= */
/* DRAG UTILITAIRE           */
/* ========================= */

