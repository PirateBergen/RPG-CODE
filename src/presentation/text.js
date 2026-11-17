function typeWriter(text, element, speed = 60) {
  // Cancel any animation already running on this element
  if (element.__typeWriterTimer) { clearTimeout(element.__typeWriterTimer); element.__typeWriterTimer = null }
  element.textContent = ""
  const chars = Array.from(String(text || ""))   // split by Unicode code point, not UTF-16 unit
  let i = 0
  function type() {
    if (i < chars.length) {
      element.textContent += chars[i]
      i++
      element.__typeWriterTimer = setTimeout(type, speed)
    } else {
      element.__typeWriterTimer = null
    }
  }
  type()
}

/* ========================= */
/* EFFETS VISUELS            */
/* ========================= */

