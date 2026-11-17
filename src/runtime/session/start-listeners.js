function safeStartIntro(event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  window.__introClickLockUntil = Date.now() + 800
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  if (start) {
    start.style.pointerEvents = "none"
    start.style.zIndex = "999999999"
  }
  if (intro) intro.style.pointerEvents = "none"
  if (typeof startIntro === "function") {
    startIntro()
  } else {
    console.error("startIntro introuvable")
  }
}

