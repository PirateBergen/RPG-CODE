function showCurseWheelScreen(playerID) {
  const isCursed = window.__authRole !== "gm" && window.__authPlayerId === playerID
  let s = document.getElementById("curseWheelScreen")
  if (!s) { s = document.createElement("div"); s.id = "curseWheelScreen"; document.body.appendChild(s) }
  s.innerHTML = ""
  // Pas de overflow-y:auto ici — ça casse pointerup/click sur iOS
  s.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;padding:12px;box-sizing:border-box;gap:12px;"

  const t = document.createElement("div")
  t.innerText = "LA ROUE DU DESTIN"
  t.style.cssText = "font-family:Cinzel;font-size:clamp(18px,3.5vw,36px);color:#cc0000;text-shadow:0 0 20px red;text-align:center;flex-shrink:0;"
  s.appendChild(t)

  const canvas = document.createElement("canvas")
  canvas.id = "curseWheelCanvas"
  canvas.width = 500; canvas.height = 500
  // Canvas responsive sans overflow : 55vmin laisse la place au titre + bouton
  canvas.style.cssText = "filter:drop-shadow(0 0 20px darkred);width:min(500px,55vmin);height:min(500px,55vmin);flex-shrink:0;touch-action:none;"
  s.appendChild(canvas)

  const btn = document.createElement("button")
  btn.id = "curseWheelBtn"
  btn.disabled = !isCursed
  btn.innerText = isCursed ? "Tourner la roue" : "En attente de " + heroDisplayName(playerID).toUpperCase() + "..."
  btn.style.cssText = "padding:16px 44px;font-family:Cinzel;font-size:clamp(14px,2vw,18px);background:linear-gradient(#5a0000,#2a0000);color:#ff6060;border:2px solid #aa0000;border-radius:8px;cursor:" + (isCursed ? "pointer" : "default") + ";opacity:" + (isCursed ? "1" : "0.4") + ";touch-action:manipulation;flex-shrink:0;-webkit-appearance:none;"
  if (isCursed) {
    btn.addEventListener("click", () => {
      if (btn.disabled) return
      btn.disabled = true; btn.style.opacity = "0.4"
      spinCurseWheel(playerID)
    })
  }
  s.appendChild(btn)

  drawCurseWheel(canvas, 0)
}

function drawCurseWheel(canvas, rotation) {
  const ctx=canvas.getContext("2d"),cx=250,cy=250,radius=190,n=curseWheelChoices.length,arc=(Math.PI*2)/n
  ctx.clearRect(0,0,500,500); ctx.beginPath(); ctx.arc(cx,cy,radius+14,0,Math.PI*2); ctx.fillStyle="#3a0000"; ctx.fill(); ctx.strokeStyle="#ff4040"; ctx.lineWidth=3; ctx.stroke()
  curseWheelChoices.forEach((ch,i)=>{ const start=rotation+i*arc-Math.PI/2,end=start+arc,mid=start+arc/2; const gx=cx+Math.cos(mid)*radius*0.5,gy=cy+Math.sin(mid)*radius*0.5; const grad=ctx.createRadialGradient(gx,gy,0,cx,cy,radius); grad.addColorStop(0,shadeColor(ch.color,40)); grad.addColorStop(1,ch.color); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath(); ctx.fillStyle=grad; ctx.fill(); ctx.strokeStyle="rgba(255,80,80,0.8)"; ctx.lineWidth=2; ctx.stroke(); ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid); ctx.shadowColor="black"; ctx.shadowBlur=8; ctx.font="32px serif"; ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(ch.icon,radius*0.65,-18); ctx.font="bold 16px serif"; ctx.fillText(ch.label.split(" ").slice(0,2).join(" "),radius*0.65,8); if(ch.label.split(" ").length>2){ ctx.font="bold 14px serif"; ctx.fillText(ch.label.split(" ").slice(2).join(" "),radius*0.65,26) }; ctx.shadowBlur=0; ctx.restore() })
  ctx.beginPath(); ctx.arc(cx,cy,36,0,Math.PI*2); const cg=ctx.createRadialGradient(cx-8,cy-8,0,cx,cy,36); cg.addColorStop(0,"#ff4040"); cg.addColorStop(1,"#330000"); ctx.fillStyle=cg; ctx.fill(); ctx.strokeStyle="#ff6060"; ctx.lineWidth=3; ctx.stroke(); ctx.font="26px serif"; ctx.fillStyle="white"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("☠",cx,cy)
  ctx.save(); ctx.translate(cx,cy-radius-20); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-16,-26); ctx.lineTo(16,-26); ctx.closePath(); ctx.fillStyle="#cc0000"; ctx.fill(); ctx.restore()
}


function showCurseResult(playerID, resultIndex) {
  const safeIndex = Math.max(0, Math.min(curseWheelChoices.length - 1, parseInt(resultIndex, 10) || 0))
  const ch=curseWheelChoices[safeIndex]; const ws=document.getElementById("curseWheelScreen"); if(ws) ws.remove(); playSound("curseSound"); playSound("curse2Sound")
  const s=document.createElement("div"); s.id="curseResultScreen"; s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;padding:20px;box-sizing:border-box;"; document.body.appendChild(s); flashRed(); screenShakeHard()
  const ic=document.createElement("div"); ic.innerText=ch.icon; ic.style.cssText="font-size:clamp(60px,12vmin,100px);margin-bottom:16px;animation:curseResultPop 0.5s ease-out;"; s.appendChild(ic)
  const t=document.createElement("div"); t.innerText=ch.label; t.style.cssText="font-family:Cinzel;font-size:clamp(28px,6vw,56px);color:#ff0000;text-shadow:0 0 20px red;margin-bottom:12px;text-align:center;animation:curseResultPop 0.6s ease-out;"; s.appendChild(t)
  const d=document.createElement("div"); d.innerText=ch.description; d.style.cssText="font-family:IM Fell English;font-size:clamp(16px,2.5vw,22px);color:#cc6666;text-align:center;margin-bottom:30px;"; s.appendChild(d)


}


/* ========================= */
/* POUVOIR                   */
/* ========================= */


