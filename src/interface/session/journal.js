function addSessionLog(text) {
  const t = new Date()
  const hh = t.getHours().toString().padStart(2,"0")
  const mm = t.getMinutes().toString().padStart(2,"0")
  db.ref("game/sessionLog").push({ text: String(text), time: Date.now(), display: hh + ":" + mm })
}

function openSessionLog() {
  const panel = document.getElementById("sessionLogPanel")
  if (!panel) return
  if (panel.style.display === "flex") { closeSessionLog(); return }
  panel.style.display = "flex"
  window.GameWindows?.register(panel,closeSessionLog)
  const content = document.getElementById("sessionLogContent")
  if (panel.__logQuery && panel.__logListener) panel.__logQuery.off("value",panel.__logListener)
  panel.__logQuery=db.ref("game/sessionLog").orderByChild("time").limitToLast(80)
  panel.__logListener=snap=>{
    if(panel.style.display!=="flex")return
    content.replaceChildren()
    const entries=[];snap.forEach(child=>entries.unshift(child.val()))
    for(const e of entries){
      const row=document.createElement("div");row.style.cssText="font-size:12px;color:#c8d8d0;padding:6px 0;border-bottom:1px solid rgba(30,90,102,0.15);line-height:1.5"
      const ts=document.createElement("span");ts.style.cssText="color:#1e8a9a;margin-right:8px";ts.textContent="["+(e.display||"--:--")+"] "+(e.status==="applied"?"✓ ":"")
      const msg=document.createElement("span");msg.textContent=pikaDisplayText(e.text);row.append(ts,msg);content.appendChild(row)
    }
    if(!entries.length){const empty=document.createElement("div");empty.className="logEmpty";empty.textContent="Aucune entrée";content.appendChild(empty)}
  }
  panel.__logQuery.on("value",panel.__logListener,()=>{content.textContent="Journal indisponible. Vérifiez la connexion et rouvrez-le."})
}

function closeSessionLog() {
  const panel = document.getElementById("sessionLogPanel")
  if (!panel) return
  if (panel.__logListener && panel.__logQuery) { panel.__logQuery.off("value", panel.__logListener); panel.__logListener = null; panel.__logQuery=null }
  panel.style.display = "none"
  window.GameWindows?.closed(panel)
}

function clearSessionLog() {
  if (!isGM) return
  if (!confirm("Effacer tout le journal de session ?")) return
  db.ref("game/sessionLog").remove()
  const content = document.getElementById("sessionLogContent")
  if (content) content.innerHTML = '<div class="logEmpty" style="color:#555;font-size:11px;text-align:center;padding:20px;">Aucune entrée</div>'
}

