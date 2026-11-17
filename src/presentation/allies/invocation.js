function _allyInvocationCinematic(pnj, action, targetId, onComplete) {
  playSound("powSound",.84,true)
  if(pnj.id==="melenchon")return playOregonBombardment(pnj,action,targetId,onComplete)
  const scope=createPresentationScope("__cancelAllyPresentation")
  scope.later(scope.cancel,6500)
  // ÉTAPE 1 — Tremblement + flash
  screenShakeHard()
  scope.later(()=>screenShakeHard(), 300)
  const flash = document.createElement("div"); flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:999999990;transition:opacity 0.05s;"
  document.body.appendChild(scope.node(flash))
  scope.later(()=>{ flash.style.opacity="0.7"; scope.later(()=>{ flash.style.transition="opacity 0.4s"; flash.style.opacity="0"; scope.later(()=>flash.remove(),400) },80) },50)

  // ÉTAPE 2 — Image du dieu + message solennel (après 600ms)
  scope.later(()=>{
    const cinScreen = document.createElement("div"); cinScreen.id = "allyCinScreen"
    cinScreen.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999995;opacity:0;transition:opacity 0.6s ease;`

    // Image du dieu
    const img = document.createElement("img");img.className="allyInvocationBackdrop"; img.src = "images/"+pnj.image
    img.style.cssText = `max-height:45vh;object-fit:contain;filter:drop-shadow(0 0 30px ${pnj.color});opacity:0;transition:opacity 0.8s ease;margin-bottom:30px;`
    cinScreen.appendChild(img)

    // Nom du dieu
    const nameEl = document.createElement("div")
    nameEl.style.cssText = `font-family:'Cinzel Decorative','Cinzel',serif;font-size:36px;color:${pnj.color};letter-spacing:8px;text-shadow:0 0 20px ${pnj.color};opacity:0;transition:opacity 0.8s ease 0.3s;margin-bottom:14px;`
    nameEl.innerText = pnj.name.toUpperCase()
    cinScreen.appendChild(nameEl)

    // Message invocation
    const msgEl = document.createElement("div")
    msgEl.style.cssText = `font-family:'IM Fell English',serif;font-size:18px;color:rgba(220,210,255,0.85);font-style:italic;letter-spacing:2px;opacity:0;transition:opacity 0.8s ease 0.6s;text-align:center;max-width:500px;padding:0 20px;`
    msgEl.innerText = action.dialogue
    cinScreen.appendChild(msgEl)

    document.body.appendChild(scope.node(cinScreen))

    // Son impact — fade out après 2s
    const impact = scope.audio(new Audio("audio/impact.mp3")); impact.__specialEffect=true; setManagedAudioBaseVolume(impact, 0.85); impact.play().catch(()=>{})
    scope.later(()=>{ let iv=scope.every(()=>{ if(impact.volume>0.05) impact.volume=Math.max(0,impact.volume-0.06); else{ impact.pause(); clearInterval(iv) } },100) }, 2000)

    scope.later(()=>{
      cinScreen.style.opacity = "1"
      scope.later(()=>{ img.style.opacity="1"; nameEl.style.opacity="1"; msgEl.style.opacity="1" }, 50)
    }, 20)

    // ÉTAPE 3 — Après 4s, lancer le dé
    scope.later(()=>{
      cinScreen.style.opacity = "0"
      scope.later(()=>{ cinScreen.remove(); if(typeof onComplete==="function")onComplete() }, 600)
    }, 4000)
  }, 600)
}

// Aucun jet local après une invocation : le résultat partagé est présenté par presentation.js.


function _playAllyAnim(animType, color, isCrit) {
  const scope=createPresentationScope("__cancelAllyEffect")
  scope.later(scope.cancel,6000)
  // Animation solennelle — voile coloré + particules lentes
  const overlay = document.createElement("div"); overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999990;opacity:0;transition:opacity 1.5s ease;`
  document.body.appendChild(scope.node(overlay))

  // Voile de couleur discret
  const veil = document.createElement("div"); veil.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center, ${color}18 0%, transparent 70%);`
  overlay.appendChild(veil)

  // Particules lentes et rares
  const count = isCrit ? 12 : 6
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div")
    const size = 3 + Math.random() * 5
    p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};left:${10+Math.random()*80}%;top:${20+Math.random()*60}%;opacity:0;animation:allyParticle ${2+Math.random()*2}s ease-out ${Math.random()*1.5}s forwards;`
    overlay.appendChild(p)
  }

  // Ligne horizontale solennelle
  const line = document.createElement("div"); line.style.cssText = `position:absolute;top:50%;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,${color}66,transparent);transform:scaleX(0);transition:transform 1.2s ease;transform-origin:center;`
  overlay.appendChild(line)

  scope.later(() => { overlay.style.opacity = "1"; line.style.transform = "scaleX(1)" }, 20)
  if (isCrit) { flashGold(); screenShakeHard() } else screenShake()
  scope.later(() => { overlay.style.transition = "opacity 2s ease"; overlay.style.opacity = "0"; scope.later(() => overlay.remove(), 2000) }, isCrit ? 3500 : 2500)
}

;(function(){
  if (document.getElementById("allyAnimStyle")) return
  const s = document.createElement("style"); s.id = "allyAnimStyle"
  s.textContent = `@keyframes allyParticle { 0%{opacity:0;transform:translateY(0) scale(0.5)} 20%{opacity:0.9} 100%{opacity:0;transform:translateY(-80px) scale(1.2)} }`
  document.head.appendChild(s)
})()

/* ========================= */
/* VUE LECTURE SEULE JOUEUR  */
/* ========================= */




/* ========================= */
/* JOURNAL MJ — RÉDUIRE      */
/* ========================= */

