function startBloodEffect(token) {
  if (!token || bloodIntervals[token.id]) return
  bloodIntervals[token.id] = setInterval(() => {
    if (!token.classList.contains("cursed")) { stopBloodEffect(token); return }
    spawnBloodDrop(token)
  }, 400 + Math.random() * 300)
}

function stopBloodEffect(token) {
  if (!token) return
  if (bloodIntervals[token.id]) { clearInterval(bloodIntervals[token.id]); delete bloodIntervals[token.id] }
  token.querySelectorAll(".bloodDrop, .bloodTrail").forEach(el => el.remove())
}

function spawnBloodDrop(token) {
  const angle  = (Math.random() * 180) + 10
  const rad    = angle * Math.PI / 180
  const radius = 36
  const cx     = 50 + Math.cos(rad) * radius
  const cy     = 50 + Math.sin(rad) * radius

  const trail = document.createElement("div")
  trail.className = "bloodTrail"
  trail.style.left = cx + "%"
  trail.style.top = cy + "%"
  trail.style.height = (4 + Math.random() * 8) + "px"
  trail.style.width  = (2 + Math.random() * 2) + "px"
  trail.style.animationDuration = (1.5 + Math.random()) + "s"
  token.appendChild(trail)

  const drop = document.createElement("div")
  drop.className = "bloodDrop"
  drop.style.left  = (cx - 1.5) + "%"
  drop.style.top = cy + "%"
  drop.style.width = (3 + Math.random() * 3) + "px"
  drop.style.animationDuration = (1.2 + Math.random() * 0.8) + "s"
  token.appendChild(drop)

  const dur = parseFloat(drop.style.animationDuration) * 1000
  setTimeout(() => { drop.remove(); trail.remove() }, dur + 100)
}

/* ========================= */
/* BIBI                      */
/* ========================= */

