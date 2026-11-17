function makeDraggable(element) {
  let isDragging = false, offsetX = 0, offsetY = 0
  element.addEventListener("mousedown", e => {
    isDragging = true
    offsetX = e.clientX - element.offsetLeft
    offsetY = e.clientY - element.offsetTop
    element.style.position = "fixed"
    element.style.zIndex   = 9999999
  })
  document.addEventListener("mousemove", e => {
    if (!isDragging) return
    element.style.left = (e.clientX - offsetX) + "px"
    element.style.top  = (e.clientY - offsetY) + "px"
  })
  document.addEventListener("mouseup", () => { isDragging = false })
}

/* ========================= */
/* MENU ÉTINCELLES           */
/* ========================= */

