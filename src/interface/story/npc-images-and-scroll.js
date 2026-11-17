function getPNJDisplayName(image) {
  if (PNJ_NAMES[image]) return PNJ_NAMES[image]
  const base = String(image || "").replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "")
  if (!base) return ""
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function resolvePNJImageSrc(image) {
  const src = String(image || "")
  if (!src) return ""
  if (typeof resolveImagePath === "function") return resolveImagePath(src)
  if (/^(https?:|data:|blob:|\/|images\/)/i.test(src)) return src
  return "images/" + src
}

function showStoryImage(image) {
  window.__cancelPNJVoice?.()
  const box=document.getElementById("storyImage"), img=document.getElementById("storyImageContent")
  if(!image){ box.style.display="none"; return }
  img.src=resolvePNJImageSrc(image); box.style.opacity="0"; box.style.left="50%"; box.style.transform="translateX(-50%)"; box.style.right="auto"; box.style.display="flex"
  if(!pnjSlotOrder.includes(1)) pnjSlotOrder.push(1); setTimeout(updatePNJPositions,50); setTimeout(()=>box.style.opacity="1",60)

  // Afficher le nom si défini — délai pour laisser passer le set(null) initial
  const pnjName = getPNJDisplayName(image)
  if (pnjName) {
    document.querySelectorAll("[id^='pnjNameTag']").forEach(el => el.remove())
    const tag = document.createElement("div")
    tag.id = "pnjNameTag_" + image.replace(/[^a-z0-9]/g, "")
    tag.innerText = pnjName
    tag.style.cssText = "position:fixed;bottom:12%;left:50%;transform:translateX(-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:20px;color:#f0e8c8;letter-spacing:3px;text-shadow:0 0 8px rgba(30,160,180,0.6),1px 1px 4px black;pointer-events:none;z-index:2147483647;opacity:0;transition:opacity 0.6s ease;background:rgba(8,20,24,0.9);border:1px solid rgba(30,90,102,0.5);border-radius:3px;padding:6px 20px;white-space:nowrap;"
    document.body.appendChild(tag)
    setTimeout(() => { tag.style.opacity = "1" }, 100)
  }

  const soundKey = String(image || "").replace(/^.*[\\/]/, "")
  const pnjSounds = { "generalmelenchon.png": "generalmelenchon.mp3", "intendantbrume.png": "macron.mp3" }
  if (pnjSounds[soundKey]) {
    const sid = "pnjSound_" + soundKey.replace(/[^a-z]/gi, "")
    let snd = document.getElementById(sid)
    if (!snd) {
      snd = document.createElement("audio")
      snd.id = sid
      snd.src = "audio/" + pnjSounds[soundKey]
      setManagedAudioBaseVolume(snd,1)
      document.body.appendChild(snd)
    }
    const scope=createPresentationScope("__cancelPNJVoice")
    scope.audio(snd);setManagedAudioBaseVolume(snd,1);snd.currentTime=0;snd.play().catch(scope.cancel)
    scope.listen(snd,"ended",scope.cancel);scope.listen(snd,"error",scope.cancel)
    scope.later(()=>{
      const fade=scope.every(()=>{
        if(snd.__baseVolume>.05)setManagedAudioBaseVolume(snd,Math.max(0,snd.__baseVolume-.05))
        else{clearInterval(fade);scope.cancel();setManagedAudioBaseVolume(snd,1)}
      },100)
    },2000)
  }
}

function hideStoryImage() {
  window.__cancelPNJVoice?.()
  const box=document.getElementById("storyImage"); if(!box) return
  box.style.opacity="0"
  // Retirer le tag nom seulement si aucun autre PNJ n'est affiché
  setTimeout(() => {
    const b2 = document.getElementById("storyImage2")
    const b3 = document.getElementById("storyImage3")
    if ((!b2 || b2.style.display === "none") && (!b3 || b3.style.display === "none")) {
      document.querySelectorAll("[id^='pnjNameTag']").forEach(tag=>{ tag.style.opacity="0"; setTimeout(()=>{ if(tag.parentNode) tag.remove() },600) })
    }
  }, 300)
  setTimeout(()=>{ box.style.display="none"; updatePNJPositions() },500); pnjSlotOrder=pnjSlotOrder.filter(s=>s!==1)
}

function showHighPNJ(image, name) {
  openPNJ(image, { slot: 1, forceSlot: true, name, scrollName: true })
}
function disposeHighPNJScroll(){
  for(const timer of window.__highPNJScrollTimers||[])clearTimeout(timer)
  window.__highPNJScrollTimers=[]
  document.getElementById("highPNJScroll")?.remove()
}
function showHighPNJScroll(name,eventTime){
  disposeHighPNJScroll()
  const scroll=document.createElement("div");scroll.id="highPNJScroll";scroll.style.cssText="position:fixed;bottom:8%;left:50%;transform:translateX(-50%);pointer-events:none;z-index:99999999;"
  const text=document.createElement("div");text.textContent=name;text.style.cssText="font-family:Cinzel,serif;font-size:32px;color:#f5e6c8;text-shadow:0 0 10px black;text-align:center;opacity:0;transition:opacity .5s";scroll.appendChild(text);document.body.appendChild(scroll)
  const schedule=(fn,ms)=>window.__highPNJScrollTimers.push(setTimeout(fn,ms))
  schedule(()=>text.style.opacity="1",20)
  schedule(()=>{text.style.opacity="0";schedule(()=>{
    if(document.getElementById("highPNJScroll")!==scroll)return
    scroll.remove()
    if(isGM&&Number.isFinite(eventTime))reliableRootTransaction(root=>{
      const event=root?.game?.highPNJName
      if(root?.sessionControl?.phase||event?.name!==name||event?.time!==eventTime)return undefined
      delete root.game.highPNJName;return root
    }).catch(error=>console.warn("Fin d’annonce PNJ",error))
  },500)},5000)
}


/* ========================= */
/* MALÉDICTION               */
/* ========================= */

