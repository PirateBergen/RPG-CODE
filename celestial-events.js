"use strict"

// Aurore, visions d’Odin et passage du Bifrost.
async function triggerAurora(){
  if(!isGM||window.__authRole!=="gm")return
  try{await reliableRootTransaction(root=>{
    if(root?.events?.aurora?.active)return undefined
    root.events||={};root.events.aurora={active:true,time:Date.now()};return root
  });document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")}
  catch(error){showNotification(error.message)}
}

function clearAuroraTimers() {
  cancelCelestialTimers("aurora");clearTimeout(window.__odinCheckTimer);clearTimeout(window.__odinTriggerTimer)
  ;["__auroraMsgTimer", "__auroraRemoveMsgTimer", "__auroraAutoEndTimer", "__auroraFinalCleanupTimer"].forEach(key => {
    if (window[key]) {
      clearTimeout(window[key])
      window[key] = null
    }
  })
  if (window.__auroraFadeInInterval) {
    clearInterval(window.__auroraFadeInInterval)
    window.__auroraFadeInInterval = null
  }
  if (window.__auroraFadeOutInterval) {
    clearInterval(window.__auroraFadeOutInterval)
    window.__auroraFadeOutInterval = null
  }
}

function startAuroraMusic() {
  clearInterval(window.__auroraFadeInInterval)
  const aurora = document.getElementById("auroraMusic")
  if (!aurora) return
  if (window.__auroraFadeOutInterval) {
    clearInterval(window.__auroraFadeOutInterval)
    window.__auroraFadeOutInterval = null
  }
  try { aurora.pause() } catch (_) {}
  aurora.currentTime = 0
  setManagedAudioBaseVolume(aurora,0,"music")
  aurora.play().catch(()=>{})
  window.__auroraFadeInInterval = setInterval(() => {
    if (aurora.__baseVolume < 0.35) setManagedAudioBaseVolume(aurora,Math.min(0.35,aurora.__baseVolume+0.03),"music")
    else {
      clearInterval(window.__auroraFadeInInterval)
      window.__auroraFadeInInterval = null
    }
  }, 100)
}

function stopAuroraMusic(fade, onDone) {
  clearInterval(window.__auroraFadeOutInterval);window.__auroraFadeOutInterval=null
  const aurora = document.getElementById("auroraMusic")
  if (!aurora) {
    if (onDone) onDone()
    return
  }
  if (window.__auroraFadeInInterval) {
    clearInterval(window.__auroraFadeInInterval)
    window.__auroraFadeInInterval = null
  }
  if (!fade) {
    try { aurora.pause() } catch (_) {}
    aurora.currentTime = 0
    setManagedAudioBaseVolume(aurora,0,"music")
    if (onDone) onDone()
    return
  }
  window.__auroraFadeOutInterval = setInterval(() => {
    if (aurora.__baseVolume > 0.04) setManagedAudioBaseVolume(aurora,Math.max(0,aurora.__baseVolume-0.04),"music")
    else {
      clearInterval(window.__auroraFadeOutInterval)
      window.__auroraFadeOutInterval = null
      try { aurora.pause() } catch (_) {}
      aurora.currentTime = 0
      setManagedAudioBaseVolume(aurora,0,"music")
      if (onDone) onDone()
    }
  }, 100)
}

function resetAuroraPresentation() {
  window.__auroraPresentedEvent=null;window.__auroraClosing=false;cancelAuroraExpiry();resetOdinPresentation();stopBifrostFlashSound()
  clearAuroraTimers()
  auroraActive = false
  const overlay = document.getElementById("auroraOverlay")
  if (overlay && overlay.parentNode) overlay.remove()
  const msg = document.getElementById("auroraMessage")
  if (msg && msg.parentNode) msg.remove()
  const bifrostBtn = document.getElementById("bifrostBtn")
  if (bifrostBtn && bifrostBtn.parentNode) bifrostBtn.remove()
  const end = document.getElementById("auroraEndMessage")
  if (end && end.parentNode) end.remove()
  stopAuroraMusic(false)
}

function showAuroraEvent(event=window.__explorationWorldEvents?.aurora) {
  clearAuroraTimers();if(window.__auroraPresentedEvent!==event?.time)resetOdinPresentation();window.__auroraPresentedEvent=event?.time;window.__auroraClosing=false;document.getElementById("auroraEndMessage")?.remove();scheduleAuroraExpiry(event);if(isGM)window.__odinCheckTimer=celestialAfter("aurora",()=>checkOdinVision(),5000)
  if(document.getElementById("auroraOverlay")) {
    auroraActive = true
    document.getElementById("auroraOverlay").style.opacity="1"
    updateBifrostBtn()
    const aurora = document.getElementById("auroraMusic")
    if (aurora && aurora.paused && currentMap !== "bifrost.jpg") startAuroraMusic()
    return
  }
  auroraActive=true; updateBifrostBtn()
  const ov=document.createElement("div"); ov.id="auroraOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999990;opacity:0;transition:opacity 3s ease;"; document.body.appendChild(ov)
  const colors=["rgba(0,255,150,0.22)","rgba(0,220,255,0.18)","rgba(120,60,255,0.16)","rgba(0,255,180,0.20)","rgba(40,180,255,0.17)"]
  for(let i=0;i<8;i++){ const b=document.createElement("div"); b.style.cssText=`position:absolute;top:${Math.random()*60}%;left:-20%;width:140%;height:${80+Math.random()*160}px;background:linear-gradient(90deg,transparent,${colors[i%colors.length]},transparent);border-radius:50%;transform:rotate(${-15+Math.random()*30}deg);animation:auroraDance ${4+Math.random()*6}s ease-in-out infinite;animation-delay:${Math.random()*3}s;filter:blur(8px);`; ov.appendChild(b) }
  const msg=document.createElement("div"); msg.id="auroraMessage"; msg.style.cssText="position:fixed;top:12%;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:9999995;opacity:0;transition:opacity 2s ease;"; const msgIcon=document.createElement("div"); msgIcon.style.cssText="font-size:42px;margin-bottom:16px;"; msgIcon.innerText="✨"; const msgTitle=document.createElement("div"); msgTitle.style.cssText="font-family:Cinzel Decorative,Cinzel,serif;font-size:28px;letter-spacing:4px;margin-bottom:12px;color:#a0ffcc;text-shadow:0 0 20px #00ffaa;"; msgTitle.innerText="AURORES BORÉALES"; const msgText=document.createElement("div"); msgText.style.cssText="font-family:IM Fell English,serif;font-size:18px;color:#c0fff0;opacity:0.9;line-height:1.6;max-width:500px;text-align:center;"; msgText.innerText="Les cieux s'embrasent de lumières mystiques..."; msg.appendChild(msgIcon); msg.appendChild(msgTitle); msg.appendChild(msgText); document.body.appendChild(msg)
  celestialAfter("aurora",()=>{ ov.style.opacity="1"; msg.style.opacity="1" },100)
  startAuroraMusic()
  fadeMusicOut(()=>{})
  window.__auroraMsgTimer = celestialAfter("aurora",()=>{
    msg.style.opacity="0"
    window.__auroraRemoveMsgTimer = celestialAfter("aurora",()=>msg.remove(),2000)
  },5000)

}

function showAuroraEndSequence() {
  clearAuroraTimers()
  auroraActive = false
  updateBifrostBtn()

  const ov = document.getElementById("auroraOverlay")
  const msg = document.getElementById("auroraMessage")
  if (msg && msg.parentNode) msg.remove()

  let end = document.getElementById("auroraEndMessage")
  if (!end) {
    end = document.createElement("div")
    end.id = "auroraEndMessage"
    const endIcon=document.createElement("div"); endIcon.style.cssText="font-size:34px;margin-bottom:12px;"; endIcon.innerText="✦"
    const endTitle=document.createElement("div"); endTitle.style.cssText="font-family:Cinzel Decorative,Cinzel,serif;font-size:24px;letter-spacing:4px;margin-bottom:10px;color:#d9fff1;text-shadow:0 0 20px rgba(120,255,220,0.8);"; endTitle.innerText="LES AURORES S'ÉTEIGNENT"
    const endText=document.createElement("div"); endText.style.cssText="font-family:IM Fell English,serif;font-size:18px;color:#d8fff8;opacity:0.92;line-height:1.6;max-width:520px;text-align:center;"; endText.innerText="Le ciel reprend lentement son souffle."
    end.appendChild(endIcon); end.appendChild(endTitle); end.appendChild(endText)
    end.style.cssText = "position:fixed;top:14%;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:99999999;opacity:0;transition:opacity 2s ease;"
    document.body.appendChild(end)
  }

  celestialAfter("aurora",() => { end.style.opacity = "1" }, 50)
  if (ov) {
    ov.style.transition = "opacity 5s ease"
    ov.style.opacity = "0"
  }
  screenShake()

  stopAuroraMusic(true, () => {
    if (ov && ov.parentNode) ov.remove()
    if (end && end.parentNode) {
      celestialAfter("aurora",() => {
        end.style.opacity = "0"
        celestialAfter("aurora",() => { if (end.parentNode) end.remove() }, 2200)
      }, 4000)
    }
    if (currentMap && mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap])
  })
}

function updateBifrostBtn() {
  const ex=document.getElementById("bifrostBtn"), should=auroraActive&&currentMap==="arbre.jpg"
  if(should&&!ex){ const btn=document.createElement("div"); btn.id="bifrostBtn"; btn.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;cursor:"+(isGM?"pointer":"default")+";pointer-events:"+(isGM?"auto":"none")+";text-align:center;opacity:0;transition:opacity 1.5s ease;"; btn.innerHTML=`<div style="font-family:'Cinzel Decorative','Cinzel',serif;font-size:30px;color:#44ccff;text-shadow:0 0 20px #0099ff;letter-spacing:10px;padding:20px 40px;background:rgba(0,50,100,0.5);border:2px solid rgba(100,200,255,0.5);border-radius:12px;box-shadow:0 0 30px rgba(0,150,255,0.4);">BIFROST<br><span style="font-size:12px;letter-spacing:4px;opacity:0.7;">✦ LE PONT ARC-EN-CIEL ✦</span></div>`; if(isGM) btn.onclick=()=>triggerBifrostFlash(); document.body.appendChild(btn); celestialAfter("aurora",()=>btn.style.opacity="1",50) }
  else if(!should&&ex){ ex.style.transition="opacity 1s"; ex.style.opacity="0"; celestialAfter("aurora",()=>{ if(ex.parentNode) ex.remove() },1000) }
}

async function triggerBifrostFlash(){
  if(!isGM||window.__authRole!=="gm")return
  try{await reliableRootTransaction(root=>{
    if(root?.game?.combatState?.active)throw Error("Terminez le combat avant le passage")
    const previous=root?.game?.bifrostFlash
    if(previous&&!previous.completedAt&&Date.now()-previous.time<15000)return undefined
    root.game||={};root.game.bifrostFlash={time:Date.now(),sourceMap:root.game.map,sessionRevision:root.sessionControl?.revision||"initial"};return root
  })}catch(error){showNotification(error.message)}
}

function stopBifrostFlashSound(){
  cancelCelestialTimers("bifrost");window.__bifrostGeneration=(window.__bifrostGeneration||0)+1
  clearTimeout(window.__bifrostTrembleFadeDelay);clearInterval(window.__bifrostTrembleFade)
  for(const key of ["__bifrostFlashSound","__bifrostTrembleSound"]){const sound=window[key];if(sound){try{sound.pause();sound.currentTime=0}catch(_){}window[key]=null}}
  document.querySelectorAll(".celestialBifrostFlash").forEach(node=>node.remove())
}

function doBifrostFlash(event={}){
  stopBifrostFlashSound()
  const generation=window.__bifrostGeneration,origin=event.sourceMap||currentMap,revision=event.sessionRevision||persistenceRevision||"initial"
  fadeMusicOut(()=>{})
  const tremble=new Audio("audio/tremblement.mp3");window.__bifrostTrembleSound=tremble;let volume=.8;setManagedAudioBaseVolume(tremble,volume);tremble.play().catch(()=>{})
  window.__bifrostTrembleFadeDelay=celestialAfter("bifrost",()=>{window.__bifrostTrembleFade=setInterval(()=>{volume=Math.max(0,volume-.05);setManagedAudioBaseVolume(tremble,volume);if(volume===0){tremble.pause();clearInterval(window.__bifrostTrembleFade)}},100)},4500)
  const sound=new Audio("audio/bifrost.mp3");window.__bifrostFlashSound=sound;setManagedAudioBaseVolume(sound,1);sound.play().catch(()=>{})
  const flashes=[{c:"rgba(200,230,255,.4)",d:80},{c:"rgba(255,255,255,.5)",d:120},{c:"rgba(100,180,255,.9)",d:200},{c:"white",d:400}]
  let delay=0
  flashes.forEach(f=>{celestialAfter("bifrost",()=>{const flash=document.createElement("div");flash.className="celestialBifrostFlash";flash.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:99999998;background:"+f.c;document.body.appendChild(flash);celestialAfter("bifrost",()=>{flash.style.transition="opacity "+f.d*1.5+"ms ease";flash.style.opacity="0";celestialAfter("bifrost",()=>flash.remove(),f.d*2)},f.d*.3)},delay);delay+=f.d+60})
  screenShake();celestialAfter("bifrost",screenShakeHard,300);celestialAfter("bifrost",screenShakeHard,700);celestialAfter("bifrost",flashGold,delay-200)
  celestialAfter("bifrost",async()=>{
    if(!isGM||generation!==window.__bifrostGeneration||currentMap!==origin||window.__sessionBusy)return
    try{const result=await reliableRootTransaction(root=>{
      const current=root?.game?.bifrostFlash
      if(generation!==window.__bifrostGeneration||root?.sessionControl?.phase||root?.game?.combatState?.active||(root?.sessionControl?.revision||"initial")!==revision||!event.time||current?.time!==event.time||current.completedAt||root.game.map!==origin)return undefined
      root.game.map="bifrost.jpg";delete root.game.mapAudio;current.completedAt=Date.now();return root
    });if(result.committed){maybeSpawnMapLoreBook("bifrost.jpg");document.querySelectorAll(".gmSection").forEach(node=>node.style.display="none")}}
    catch(error){console.warn("Passage du Bifrost",error)}
  },delay+400)
}

async function checkOdinVision(){
  if(!isGM||odinVisionShown||window.__sessionBusy)return
  const revision=persistenceRevision
  try{
    const aurora=(await db.ref("events/aurora").once("value")).val(),rune=(await db.ref("game/runeChallenge").once("value")).val()
    if(!aurora?.active||!rune?.active||revision!==persistenceRevision||window.__sessionBusy)return
    clearTimeout(window.__odinTriggerTimer);odinVisionShown=true
    window.__odinTriggerTimer=setTimeout(()=>{if(revision===persistenceRevision&&!window.__sessionBusy)triggerOdinVision(aurora.time,rune.time)},2000+Math.random()*5000)
  }catch(error){console.warn("Préparation de vision",error)}
}

async function triggerOdinVision(expectedAuroraTime,expectedRuneTime){
 if(!isGM)return
 const seed=Math.floor(Math.random()*4294967296)
 try{await transactCombatRoot(current=>{
 const aurora=current?.events?.aurora,challenge=current?.game?.runeChallenge
 if(!aurora?.active||!challenge?.active||(Number.isFinite(expectedAuroraTime)&&aurora.time!==expectedAuroraTime)||(Number.isFinite(expectedRuneTime)&&challenge.time!==expectedRuneTime))return undefined
 const key=aurora.time+":"+challenge.time
 if(current.game.lastOdinVisionKey===key)return undefined
 const root=combatClone(current),dice=combatRandom(seed)
 root.game.lastOdinVisionKey=key;root.game.odinVision={id:key,msg:ODIN_VISIONS[dice(ODIN_VISIONS.length)-1],time:Date.now()}
 const letters=root.game.runeChallenge.revealedLetters||[],available="ABCDEFGHIJKLMNOPRSTUVWXYZ".split("").filter(l=>!letters.includes(l))
 if(available.length)root.game.runeChallenge.revealedLetters=[...letters,available[dice(available.length)-1]]
 return root
 })}catch(error){showNotification(error.message)}
}

function showOdinVision(msg,event) { const revision=persistenceRevision||"initial";cancelCelestialTimers("odin"); document.getElementById("odinVisionOverlay")?.remove(); const ov=document.createElement("div"); ov.id="odinVisionOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999990;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 1.5s ease;"; const bg=document.createElement("div"); bg.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center,rgba(30,0,80,0.7) 0%,rgba(0,0,40,0.5) 100%);"; ov.appendChild(bg); const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;text-align:center;max-width:560px;padding:36px 40px;background:rgba(10,5,30,0.75);border:1px solid rgba(160,120,255,0.3);border-radius:12px;"; const img=document.createElement("img"); img.src="images/odin.png"; img.style.cssText="width:90px;height:90px;object-fit:contain;border-radius:50%;border:2px solid rgba(180,150,255,0.4);margin-bottom:16px;opacity:0.9;"; img.onerror=()=>img.style.display="none"; d.appendChild(img); const t=document.createElement("div"); t.style.cssText="font-family:'Cinzel Decorative',serif;font-size:14px;color:rgba(220,200,255,0.7);letter-spacing:6px;margin-bottom:16px;"; t.innerText="✦ Odin vous parle ✦"; d.appendChild(t); const m=document.createElement("div"); m.style.cssText="font-family:'IM Fell English',serif;font-size:22px;color:rgba(255,245,220,0.97);font-style:italic;line-height:1.7;"; m.innerText=msg; d.appendChild(m); ov.appendChild(d); document.body.appendChild(ov); celestialAfter("odin",()=>ov.style.opacity="1",50); celestialAfter("odin",()=>{ ov.style.opacity="0"; celestialAfter("odin",()=>{ if(ov.parentNode) ov.remove() },1500); finishOdinVision(event,revision); odinVisionShown=false },7000) }

function celestialAfter(group,callback,delay){
  window.__celestialTimers||={};window.__celestialTimers[group]||=new Set()
  const timer=setTimeout(()=>{window.__celestialTimers[group].delete(timer);callback()},Math.max(0,delay))
  window.__celestialTimers[group].add(timer);return timer
}

function cancelCelestialTimers(group){
  for(const timer of window.__celestialTimers?.[group]||[])clearTimeout(timer)
  window.__celestialTimers?.[group]?.clear()
}

function resetOdinPresentation(){
  cancelCelestialTimers("odin");clearTimeout(window.__odinCheckTimer);clearTimeout(window.__odinTriggerTimer)
  document.getElementById("odinVisionOverlay")?.remove();odinVisionShown=false
}

function cancelAuroraExpiry(){
  clearTimeout(window.__auroraExpiryTimer);window.__auroraExpiryTimer=null;window.__auroraExpiryKey=null;window.__auroraExpiryDeadline=null
}

function scheduleAuroraExpiry(event){
  if(!event?.active){cancelAuroraExpiry();return}
  if(window.__authRole!=="gm"||!Number.isFinite(event.time))return
  const revision=persistenceRevision||"initial",key=event.time+":"+revision
  if(window.__auroraExpiryKey===key&&window.__auroraExpiryTimer)return
  const deadline=window.__auroraExpiryKey===key&&Number.isFinite(window.__auroraExpiryDeadline)?window.__auroraExpiryDeadline:Date.now()+55000
  cancelAuroraExpiry();window.__auroraExpiryKey=key;window.__auroraExpiryDeadline=deadline
  const expire=async()=>{
    if(window.__sessionBusy){window.__auroraExpiryTimer=setTimeout(expire,1000);return}
    window.__auroraExpiryTimer=null
    try{await reliableRootTransaction(root=>{
      if(root?.sessionControl?.phase||(root?.sessionControl?.revision||"initial")!==revision||root?.events?.aurora?.time!==event.time)return undefined
      delete root.events.aurora;return root
    })}catch(error){console.warn("Fin d’aurore",error)}
  }
  window.__auroraExpiryTimer=setTimeout(expire,Math.max(100,deadline-Date.now()))
}

async function finishOdinVision(event,revision){
  if(!isGM||!event?.time)return
  try{await reliableRootTransaction(root=>{
    const current=root?.game?.odinVision
    if(root?.sessionControl?.phase||(root?.sessionControl?.revision||"initial")!==revision||current?.time!==event.time||current?.id!==event.id)return undefined
    delete root.game.odinVision;return root
  })}catch(error){console.warn("Fin de vision",error)}
}

// Reprendre une échéance manquée pendant une coupure, sans rejouer le passage.
document.addEventListener("DOMContentLoaded",()=>{db.ref(".info/connected").on("value",snap=>{if(snap.val()&&gameStarted)scheduleAuroraExpiry(window.__explorationWorldEvents?.aurora)})})
