function getEffectsClipGain(audio){
 if(!audio)return 1
 const src=audio.currentSrc||audio.src||audio.querySelector?.('source')?.src||""
 let file=String(src).split(/[?#]/)[0].split('/').pop()||"";try{file=decodeURIComponent(file)}catch(e){}
 return EFFECTS_CLIP_GAINS[file.toLowerCase().normalize('NFC')]||1
}
function getScaledAudioVolume(volume = 1, channel = "effects", audio = null) {
  const base = Number.isFinite(parseFloat(volume)) ? Math.max(0, Math.min(1, parseFloat(volume))) : 1
  const userVolume = channel === "music" ? getUserMusicVolume() : getUserEffectsVolume()
  // Specials are more present; ordinary effects retain their existing mix.
  const mixGain = channel === "music" ? 1 : audio?.__specialEffect ? 0.63 : 0.35
  return Math.max(0, Math.min(1, base * userVolume * mixGain * (channel === "music" ? 1 : getEffectsClipGain(audio))))
}

const managedAudioReferences=new WeakMap()
function trackManagedAudio(audio){
  window.__managedAudioInstances ||= new Set()
  let entry=managedAudioReferences.get(audio)
  if(!entry){
    entry=typeof WeakRef==="function"?new WeakRef(audio):audio;managedAudioReferences.set(audio,entry)
    const release=()=>window.__managedAudioInstances.delete(entry)
    audio.addEventListener?.("ended",release);audio.addEventListener?.("error",release)
    audio.addEventListener?.("pause",()=>{if(!audio.isConnected)release()})
    audio.addEventListener?.("play",()=>{window.__managedAudioInstances.add(entry);audio.volume=getScaledAudioVolume(audio.__baseVolume,audio.__audioChannel,audio)})
  }
  for(const item of window.__managedAudioInstances)if(typeof item?.deref==="function"&&!item.deref())window.__managedAudioInstances.delete(item)
  window.__managedAudioInstances.add(entry)
}

function setManagedAudioBaseVolume(audio, volume = 1, channel = "effects") {
  if (!audio) return audio
  audio.__baseVolume = Number.isFinite(parseFloat(volume)) ? Math.max(0, Math.min(1, parseFloat(volume))) : 1
  audio.__audioChannel = channel === "music" ? "music" : "effects"
  audio.volume = getScaledAudioVolume(audio.__baseVolume, audio.__audioChannel,audio)
  trackManagedAudio(audio)
  return audio
}

function inferAudioChannel(audio) {
  const id = String(audio?.id || "")
  if (["music", "musicA", "musicB", "oregonVoyageMusic", "auroraMusic", "forsureMusic", "sortPrisonMusic", "madnessLow", "madnessMid", "madnessHigh", "madnessPeak"].includes(id)) return "music"
  return "effects"
}

function syncManagedAudioVolumes() {
  document.querySelectorAll("audio").forEach(s => {
    const base = Number.isFinite(parseFloat(s.__baseVolume)) ? parseFloat(s.__baseVolume) : s.volume
    const channel = s.__audioChannel || inferAudioChannel(s)
    s.__baseVolume = base
    s.__audioChannel = channel
    s.volume = getScaledAudioVolume(base, channel,s)
  })
  if (!window.__managedAudioInstances) return
  Array.from(window.__managedAudioInstances).forEach(entry => {
    const audio=typeof entry?.deref==="function"?entry.deref():entry
    if (!audio || audio.ended) {
      window.__managedAudioInstances.delete(entry)
      return
    }
    const base = Number.isFinite(parseFloat(audio.__baseVolume)) ? parseFloat(audio.__baseVolume) : audio.volume
    const channel = audio.__audioChannel || inferAudioChannel(audio)
    audio.__baseVolume = base
    audio.__audioChannel = channel
    audio.volume = getScaledAudioVolume(base, channel,audio)
  })
}

function crossfadeMusic(newMusic) {
  if(window.__kingIntroAudioCombatId&&window.__kingIntroAudioCombatId===window.__combatSnapshot?.id&&combatActive)return
  if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
  if (
    auroraActive &&
    newMusic !== "aurore.mp3" &&
    newMusic !== "audio/aurore.mp3" &&
    newMusic !== "bifrost.mp3" &&
    newMusic !== "audio/bifrost.mp3"
  ) return

  const musicA = document.getElementById("musicA")
  const musicB = document.getElementById("musicB")
  if (!musicA || !musicB) return

  const normalizedMusic = /^(https?:|data:|blob:|\/|audio\/)/i.test(newMusic) ? newMusic : "audio/" + newMusic
  const targetVolume = getUserMusicVolume()

  const active = currentMusic === "A" ? musicA : musicB
  const activeSrc = active.src ? decodeURIComponent(active.src.replace(/.*\//, "").replace(/%20/g," ")) : ""
  const newSrc = normalizedMusic.replace(/.*\//, "").replace(/%20/g," ")

  if (activeSrc === newSrc && !active.paused && active.volume > Math.max(0.2, targetVolume * 0.4)) return

  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  _musicTransitioning = false
  _pendingMusic = null

  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  if (mA && mA !== active) { mA.pause(); mA.volume = 0 }
  if (mB && mB !== active) { mB.pause(); mB.volume = 0 }
  _musicTransitioning = true

  const next = currentMusic === "A" ? musicB : musicA
  next.pause()
  next.__baseVolume=1;next.__audioChannel="music";next.volume = 0

  const fadeOutIv = setInterval(() => {
    if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){clearInterval(fadeOutIv);_musicTransitioning=false;ensureOregonVoyageMusic();return}
    if (active.volume > 0.06) {
      active.volume = Math.max(0, active.volume - 0.1)
    } else {
      active.pause()
      active.volume = 0
      clearInterval(fadeOutIv)
      next.src = normalizedMusic
      next.loop = false
      next.__baseVolume=1;next.__audioChannel="music";next.volume = 0
      next.currentTime = 0
      next.play().catch(() => {})

      next.onended = null
      next._loopFadeSetup = true
      next.addEventListener("timeupdate", function _loopFade() {
        if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
        if (!next._loopFadeSetup) { next.removeEventListener("timeupdate", _loopFade); return }
        if (next.duration && next.currentTime > next.duration - 3 && !next._fading) {
          next._fading = true
          const fadeIv = setInterval(() => {
            if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){clearInterval(fadeIv);next._fading=false;ensureOregonVoyageMusic();return}
            if (next.volume > 0.05) {
              next.volume = Math.max(0, next.volume - 0.04)
            } else {
              clearInterval(fadeIv)
              next.currentTime = 0
              next.__baseVolume=1;next.__audioChannel="music";next.volume = 0
              next._fading = false
              next.play().catch(() => {})
              const fi = setInterval(() => {
                if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){clearInterval(fi);ensureOregonVoyageMusic();return}
                if (next.volume < getUserMusicVolume()) next.volume = Math.min(getUserMusicVolume(), next.volume + 0.05)
                else clearInterval(fi)
              }, 100)
            }
          }, 80)
        }
      })

      musicFadeInterval = setInterval(() => {
        if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){clearInterval(musicFadeInterval);musicFadeInterval=null;_musicTransitioning=false;ensureOregonVoyageMusic();return}
        if (next.volume < getUserMusicVolume()) {
          next.volume = Math.min(getUserMusicVolume(), next.volume + 0.05)
        } else {
          clearInterval(musicFadeInterval)
          musicFadeInterval = null
          currentMusic = currentMusic === "A" ? "B" : "A"
          _musicTransitioning = false
          if (_pendingMusic) {
            const pm = _pendingMusic
            _pendingMusic = null
            crossfadeMusic(pm)
          }
        }
      }, 150)
    }
  }, 60)
}

function stopAllMusic() {
  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  if (typeof clearAuroraTimers === "function") clearAuroraTimers()
  if (typeof stopAuroraMusic === "function") stopAuroraMusic(false)
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  if (mA) { mA.pause(); mA.volume = 0 }
  if (mB) { mB.pause(); mB.volume = 0 }
  ;["sortPrisonMusic", "auroraMusic", "forsureMusic"].forEach(id => {
    const el = document.getElementById(id)
    if (el) {
      try { el.pause() } catch (_) {}
      el.currentTime = 0
      el.volume = 0
    }
  })
  _musicTransitioning = false
  _pendingMusic = null
  currentMusic = "A"
}

function stopSpecialMusic(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (el.paused) return
  const iv = setInterval(() => {
    if (el.volume > 0.04) el.volume = Math.max(0, el.volume - 0.04)
    else { el.pause(); el.volume = 0; clearInterval(iv) }
  }, 80)
}

function fadeMusicOut(callback) {
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  let done = 0
  function fadeOne(m) {
    if (!m) { done++; if (done === 2 && callback) callback(); return }
    const iv = setInterval(() => {
      if (m.volume > 0.05) m.volume -= 0.05
      else { m.pause(); m.volume = 0; clearInterval(iv); done++; if (done === 2 && callback) callback() }
    }, 150)
  }
  fadeOne(mA)
  fadeOne(mB)
}

function playSound(id, volume = 0.8, special = false) {
  const snd = document.getElementById(id)
  if (!snd) return
  snd.currentTime = 0
  snd.__specialEffect = special
  snd.__baseVolume = volume
  snd.__audioChannel = "effects"
  snd.volume = getScaledAudioVolume(volume, "effects",snd)
  snd.play().catch(() => {})
}

/* ========================= */
/* SANG / MALÉDICTION        */
/* ========================= */

