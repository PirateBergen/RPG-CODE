function toggleMobDropdown(slot, triggerEl) {
  const dd = document.getElementById("mobDropdown_" + slot); if (!dd) return
  if (dd.style.display !== "none") { dd.style.display = "none"; return }
  if (!dd.dataset.built) {
    dd.dataset.built = "1"
    const none = document.createElement("div"); none.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,100,100);cursor:pointer;"; none.innerText = "— Aucun —"; none.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, "", "— Aucun —") }; dd.appendChild(none)
    MOB_SELECT_LIST.forEach(m => {
      const item = document.createElement("div"); item.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,180,180);cursor:pointer;"; item.innerText = heroDisplayName(m)
      item.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, m, item.innerText) }; item.onmouseenter = () => item.style.background = "rgb(60,10,10)"; item.onmouseleave = () => item.style.background = ""; dd.appendChild(item)
    })
  }
  const rect = triggerEl.getBoundingClientRect()
  dd.style.position = "fixed"; dd.style.top = (rect.bottom+4)+"px"; dd.style.left = rect.left+"px"; dd.style.width = rect.width+"px"; dd.style.display = "block"
}

function selectMobOption(slot, value, label) {
  const num     = slot.replace("slot", "")
  const trigger = document.getElementById("mobSlot" + num + "Select")
  if (trigger) { trigger.innerText = label; trigger.dataset.value = value }
  const dd = document.getElementById("mobDropdown_" + slot); if (dd) dd.style.display = "none"
  updateMobPreview()
}

function updateMobPreview() {
  const preview = document.getElementById("mobPreviewRow"); if (!preview) return; preview.innerHTML = ""
  const slots = [
    { name: _state.pendingMob },
    { name: document.getElementById("mobSlot2Select")?.dataset.value },
    { name: document.getElementById("mobSlot3Select")?.dataset.value }
  ].filter(s => s.name)

  slots.forEach(s => {
    const div = document.createElement("div"); div.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;"
    const img = document.createElement("img"); img.src = "images/" + s.name + ".png"; img.style.cssText = "width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid rgb(180,40,40);box-shadow:0 0 10px rgb(150,0,0);"; img.onerror = () => img.style.opacity = "0.3"; div.appendChild(img)
    const lbl = document.createElement("div"); lbl.style.cssText = "font-family:Cinzel,serif;font-size:9px;color:rgb(255,150,150);letter-spacing:1px;"; lbl.innerText = heroDisplayName(s.name).toUpperCase(); div.appendChild(lbl)
    preview.appendChild(div)
  })
}

