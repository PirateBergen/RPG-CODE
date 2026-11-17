function playOpeningCinematic(callback) {
  if(typeof window.__cancelOpeningCinematic==="function")window.__cancelOpeningCinematic()
  const openingTimeouts=new Set(),openingIntervals=new Set(),openingSounds=new Set()
  let openingCancelled=false
  const openingTimeout=(fn,ms)=>{const id=setTimeout(()=>{openingTimeouts.delete(id);if(!openingCancelled)fn()},ms);openingTimeouts.add(id);return id}
  const openingInterval=(fn,ms)=>{const id=setInterval(()=>{if(!openingCancelled)fn()},ms);openingIntervals.add(id);return id}
  const openingAudio=src=>{const audio=new Audio(src);openingSounds.add(audio);return audio}
  const cancelOpening=()=>{openingCancelled=true;openingTimeouts.forEach(clearTimeout);openingIntervals.forEach(clearInterval);openingSounds.forEach(audio=>audio.pause());document.getElementById("openingCinematic")?.remove();if(window.__cancelOpeningCinematic===cancelOpening)window.__cancelOpeningCinematic=null}
  window.__cancelOpeningCinematic=cancelOpening

  const screen = document.createElement("div"); screen.id = "openingCinematic"
  screen.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999999999;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:1;"
  document.body.appendChild(screen)

  const tremb = openingAudio("audio/tremblement.mp3"); setManagedAudioBaseVolume(tremb,0.8); tremb.play().catch(() => {})
  openingTimeout(() => { let iv = openingInterval(() => { if (tremb.__baseVolume>0.05) setManagedAudioBaseVolume(tremb,Math.max(0,tremb.__baseVolume-0.05)); else { tremb.pause(); clearInterval(iv) } }, 100) }, 5500)

  let shakeCount = 0
  const shakeIv = openingInterval(() => {
    shakeCount++
    screen.style.transform = `translate(${(Math.random()-0.5)*8}px,${(Math.random()-0.5)*8}px)`
    if (shakeCount > 30) { clearInterval(shakeIv); screen.style.transform = "" }
  }, 80)

  const showCinText = (text, duration) => {
    const old = screen.querySelector(".cinText")
    if (old) { old.style.opacity = "0"; openingTimeout(() => { if (old.parentNode) old.remove() }, 1000) }
    const el = document.createElement("div"); el.className = "cinText"
    el.style.cssText = "font-family:'IM Fell English',serif;font-size:24px;color:#c8a050;text-shadow:0 0 20px rgba(200,160,50,0.6);text-align:center;letter-spacing:3px;line-height:1.8;max-width:600px;padding:0 40px;opacity:0;transition:opacity 1.5s ease;white-space:pre-line;"
    el.innerText = text; screen.appendChild(el)
    openingTimeout(() => { el.style.opacity = "1" }, 50)
    openingTimeout(() => { el.style.opacity = "0"; openingTimeout(() => { if (el.parentNode) el.remove() }, 1500) }, duration)
  }

  openingTimeout(() => {
    const flashDelays = [0,100,220,400,600]
    flashDelays.forEach(delay => {
      openingTimeout(() => {
        const flash = document.createElement("div")
        flash.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:10;"
        screen.appendChild(flash)
        requestAnimationFrame(() => {
          flash.style.transition = "opacity 0.05s"; flash.style.opacity = "1"
          openingTimeout(() => { flash.style.transition = "opacity 0.1s"; flash.style.opacity = "0"; openingTimeout(() => flash.remove(), 150) }, 50)
        })
      }, delay)
    })

    openingTimeout(() => {
      ;["fart.mp3","cribibi.mp3","ah.mp3"].forEach((s, i) => {
        openingTimeout(() => {
          const snd = openingAudio("audio/" + s); setManagedAudioBaseVolume(snd,0); snd.play().catch(() => {})
          let inIv = openingInterval(() => { if (snd.__baseVolume<0.55) setManagedAudioBaseVolume(snd,Math.min(0.55,snd.__baseVolume+0.04)); else clearInterval(inIv) }, 80)
          openingTimeout(() => { let outIv = openingInterval(() => { if (snd.__baseVolume>0.03) setManagedAudioBaseVolume(snd,Math.max(0,snd.__baseVolume-0.04)); else { snd.pause(); clearInterval(outIv) } }, 100) }, 3000)
        }, i * 200)
      })
      const gb = openingAudio("audio/grisebarbe.mp3"); setManagedAudioBaseVolume(gb,0); gb.play().catch(() => {})
      let gbIn = openingInterval(() => { if (gb.__baseVolume<0.7) setManagedAudioBaseVolume(gb,Math.min(0.7,gb.__baseVolume+0.03)); else clearInterval(gbIn) }, 100)
      openingTimeout(() => { let gbOut = openingInterval(() => { if (gb.__baseVolume>0.02) setManagedAudioBaseVolume(gb,Math.max(0,gb.__baseVolume-0.03)); else { gb.pause(); clearInterval(gbOut) } }, 100) }, 27000)
    }, 100)
  }, 6000)

  openingTimeout(() => showCinText("… alors, dans le lointain,\non entendra la fréquence sacrée.", 4000), 11000)
  openingTimeout(() => showCinText("… et les héros viendraient offrir\nune nouvelle ère de paix.", 4000), 16000)
  openingTimeout(() => {
    const old = screen.querySelector(".cinText"); if (old) { old.style.opacity = "0"; openingTimeout(() => { if (old.parentNode) old.remove() }, 1000) }
    const wrapper = document.createElement("div"); wrapper.className = "cinText"
    wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;max-width:680px;padding:0 50px;opacity:0;transition:opacity 1.5s ease;"
    const t = document.createElement("div"); t.style.cssText = "font-family:'Cinzel Decorative','Cinzel',serif;font-size:18px;letter-spacing:5px;color:#c8a050;text-shadow:0 0 15px gold;text-align:center;margin-bottom:14px;"; t.innerText = "Prophétie des Enfants de Mouches"; wrapper.appendChild(t)
    const v = document.createElement("div"); v.style.cssText = "font-family:'IM Fell English',serif;font-size:15px;color:rgba(200,160,50,0.8);line-height:2;text-align:center;font-style:italic;"; v.innerText = "— Livre I, Verset 1 —"; wrapper.appendChild(v)
    screen.appendChild(wrapper); openingTimeout(() => { wrapper.style.opacity = "1" }, 50)
    const prop = openingAudio("audio/prophetie.mp3"); setManagedAudioBaseVolume(prop,0); prop.play().catch(() => {})
    let pIv = openingInterval(() => { if (prop.__baseVolume<0.8) setManagedAudioBaseVolume(prop,Math.min(0.8,prop.__baseVolume+0.04)); else clearInterval(pIv) }, 100)
  }, 21000)

  openingTimeout(() => {
    screen.style.transition = "opacity 2s ease"; screen.style.opacity = "0"
    openingTimeout(() => { screen.remove(); if (callback) callback() }, 2000)
  }, 27000)
}

/* ========================= */
/* DROP MOB DIFFICULTÉ       */
/* ========================= */

