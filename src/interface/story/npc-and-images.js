function setPNJSlot(slot) {
  currentPNJSlot=slot
  ;["slot1Btn","slot2Btn","slot3Btn"].forEach((id,i)=>{ const btn=document.getElementById(id); if(!btn) return; const a=(i+1)===slot; btn.style.background=a?"rgba(200,160,50,0.3)":"rgba(80,80,80,0.2)"; btn.style.color=a?"#c8a050":"#aaa"; btn.style.borderColor=a?"gold":"#555" })
}

function getPNJSlotRef(slot) {
  return slot === 2 ? "game/storyImage2" : slot === 3 ? "game/storyImage3" : "game/storyImage"
}

function resolvePNJTargetSlot(slots, preferredSlot, forceSlot) {
  if (forceSlot) return preferredSlot || 1
  let targetSlot = preferredSlot || 1
  if (!slots[targetSlot]) return targetSlot
  const freeSlot = [1, 2, 3].find(slot => !slots[slot])
  return freeSlot || targetSlot
}

function openPNJ(image, options) {
  const opts = options || {}
  const preferredSlot = opts.slot || currentPNJSlot || 1
  const forceSlot = !!opts.forceSlot
  const displayName = opts.name || getPNJDisplayName(image)
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })

  Promise.all([
    db.ref("game/storyImage").once("value"),
    db.ref("game/storyImage2").once("value"),
    db.ref("game/storyImage3").once("value")
  ]).then(([s1, s2, s3]) => {
    const slots = {
      1: s1.val(),
      2: s2.val(),
      3: s3.val()
    }

    const targetSlot = resolvePNJTargetSlot(slots, preferredSlot, forceSlot)
    const targetRef = getPNJSlotRef(targetSlot)

    storyType = "pnj"
    if (slots[targetSlot] === image) {
      if (targetSlot === 1) showStoryImage(image)
      else {
        db.ref(targetRef).remove().then(() => db.ref(targetRef).set(image)).catch(() => {})
      }
    } else {
      db.ref(targetRef).set(image)
    }
    if (!pnjSlotOrder.includes(targetSlot)) pnjSlotOrder.push(targetSlot)

    if (displayName) {
      db.ref("game/highPNJName").set({ name: displayName, time: Date.now() })
    }
  })
}

function setPNJImage(img) {
  openPNJ(img, { slot: currentPNJSlot || 1 })
}

function updatePNJPositions() {
  const b1=document.getElementById("storyImage"), b2=document.getElementById("storyImage2"), b3=document.getElementById("storyImage3")
  const v1=b1&&b1.style.display==="flex", v2=b2&&b2.style.display==="flex", v3=b3&&b3.style.display==="flex"
  const count=[v1,v2,v3].filter(Boolean).length, nt=el=>{el.style.transition="opacity 0.5s ease"}
  if(count===1){ if(v1){nt(b1);b1.style.left="50%";b1.style.right="auto";b1.style.transform="translateX(-50%)"} if(v2){nt(b2);b2.style.left="50%";b2.style.right="auto";b2.style.transform="translateX(-50%)"} if(v3){nt(b3);b3.style.left="50%";b3.style.right="auto";b3.style.transform="translateX(-50%)"} }
  else if(count===2){ const boxes=[[v1,b1],[v2,b2],[v3,b3]].filter(([v])=>v).map(([,b])=>b); nt(boxes[0]);boxes[0].style.left="0";boxes[0].style.right="auto";boxes[0].style.transform=""; nt(boxes[1]);boxes[1].style.right="0";boxes[1].style.left="auto";boxes[1].style.transform="" }
  else if(count===3){ nt(b2);b2.style.left="0";b2.style.right="auto";b2.style.transform=""; nt(b1);b1.style.left="50%";b1.style.right="auto";b1.style.transform="translateX(-50%)"; nt(b3);b3.style.right="0";b3.style.left="auto";b3.style.transform="" }
}

function hideHighPNJScrollImmediate() {
  const scroll=document.getElementById("highPNJScroll")
  if (scroll) {
    scroll.style.opacity="0"
    setTimeout(()=>{ if(scroll.parentNode) scroll.remove() },180)
  }
}

function closePNJBySlot(slot) {
  const r={1:"game/storyImage",2:"game/storyImage2",3:"game/storyImage3"}
  db.ref(r[slot]).remove()
  pnjSlotOrder=pnjSlotOrder.filter(s=>s!==slot)
}
function closeLastPNJ() { if(!pnjSlotOrder.length) return false; closePNJBySlot(pnjSlotOrder[pnjSlotOrder.length-1]); return true }

