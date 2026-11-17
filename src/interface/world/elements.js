function cleanupMapElementDragHandlers(id) {
  if (!window.__mapElementDragHandlers || !window.__mapElementDragHandlers[id]) return
  const handlers = window.__mapElementDragHandlers[id]
  document.removeEventListener("mousemove", handlers.onMove)
  document.removeEventListener("mouseup", handlers.onUp)
  delete window.__mapElementDragHandlers[id]
}

function clearAllElements() { db.ref("elements").remove() }
function renderMapElement(data) {
  cleanupMapElementDragHandlers(data.id)
  const ex=document.getElementById("elem_"+data.id); if(ex) ex.remove(); if(!document.getElementById("map")) return
  const safeImage = sanitizeAssetName(data.image)
  const el=document.createElement("div"); el.id="elem_"+data.id; el.style.cssText=`position:absolute;left:${data.x}px;top:${data.y}px;width:90px;height:90px;cursor:${isGM?"grab":data.clickable?"pointer":"default"};z-index:5000;user-select:none;transition:opacity 0.4s;opacity:0;`
  if(data.isRune){ const rs=document.createElement("div"); rs.style.cssText="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;color:#c8a050;text-shadow:0 0 15px gold;background:rgba(30,15,5,0.85);border:2px solid rgba(200,160,80,0.6);border-radius:50%;animation:tokenRingPulse 2s ease-in-out infinite;pointer-events:none;"; rs.innerText="ᚱ"; el.appendChild(rs) }
  else{ const img=document.createElement("img"); img.src="images/"+safeImage; img.style.cssText="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8));pointer-events:none;"; el.appendChild(img) }
  if(isGM){ const rb=document.createElement("div"); rb.style.cssText="position:absolute;top:-8px;right:-8px;width:20px;height:20px;background:#cc0000;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 0 6px black;z-index:10;"; rb.innerText="✕"; rb.onclick=e=>{ e.stopPropagation(); cleanupMapElementDragHandlers(data.id); db.ref("elements/"+data.id).remove() }; el.appendChild(rb) }
  if(data.clickable){ el.onclick=()=>{ if(data.isRune&&data.runeHint){ requestMapRuneHint(data.id) } else if(!isGM){ const ov=document.createElement("div"); ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999999;cursor:pointer;"; const bi=document.createElement("img"); bi.src="images/"+safeImage; bi.style.cssText="max-width:80vw;max-height:80vh;object-fit:contain;"; ov.appendChild(bi); ov.onclick=()=>ov.remove(); document.body.appendChild(ov) } } }
  if(isGM){ let dg=false,ox=0,oy=0; const onMove=e=>{ if(!dg) return; data.x=e.clientX-ox; data.y=e.clientY-oy; el.style.left=data.x+"px"; el.style.top=data.y+"px" }; const onUp=()=>{ if(!dg) return; dg=false; el.style.cursor="grab"; db.ref("elements/"+data.id+"/x").set(data.x); db.ref("elements/"+data.id+"/y").set(data.y) }; el.addEventListener("mousedown",e=>{ if(e.target===el.querySelector("div")) return; dg=true; ox=e.clientX-data.x; oy=e.clientY-data.y; el.style.cursor="grabbing"; e.stopPropagation() }); if(!window.__mapElementDragHandlers) window.__mapElementDragHandlers={}; window.__mapElementDragHandlers[data.id]={ onMove, onUp }; document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp) }
  document.body.appendChild(el); setTimeout(()=>el.style.opacity="1",20)
}


/* ========================= */
/* SAUVEGARDE UI             */
/* ========================= */

