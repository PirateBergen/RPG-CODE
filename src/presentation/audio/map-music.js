function ensureMapMusicPlayback(mapName, delay = 0) {
  setTimeout(() => {
    if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
    if (!mapName || !mapMusic[mapName]) return
    crossfadeMusic(mapMusic[mapName])
    setTimeout(() => {
      if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
      const active = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const hasPlayback = !!(active && !active.paused && active.src && active.volume > 0.01)
      if (!hasPlayback) {
        crossfadeMusic(mapMusic[mapName])
        setTimeout(() => {
          if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
          const retryActive = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
          const retryOk = !!(retryActive && !retryActive.paused && retryActive.src && retryActive.volume > 0.01)
          if (retryOk) return
          const direct = document.getElementById("musicA")
          if (!direct) return
          const src = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
          stopAllMusic()
          direct.src = src
          direct.loop = true
          direct.currentTime = 0
          direct.__baseVolume = 1
          direct.__audioChannel = "music"
          direct.volume = (typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8
          direct.play().catch(() => {})
          currentMusic = "A"
        }, 700)
      }
    }, 1200)
  }, delay)
}

function playInitialMapMusic(mapName) {
  if(typeof oregonVoyageMusicPriority==="function"&&oregonVoyageMusicPriority()){ensureOregonVoyageMusic();return}
  if (!mapName || !mapMusic[mapName]) return
  const direct = document.getElementById("musicA")
  if (!direct) return
  const src = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
  stopAllMusic()
  direct.src = src
  direct.loop = true
  direct.currentTime = 0
  direct.__baseVolume = 1
  direct.__audioChannel = "music"
  direct.volume = (typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8
  direct.play().catch(() => {})
  currentMusic = "A"
}

function primeMapMusicChannels() {
  ;["musicA", "musicB"].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    try {
      el.muted = true
      el.volume = 0
      const maybePromise = el.play()
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(() => {
          try { el.pause() } catch (_) {}
          try { el.currentTime = 0 } catch (_) {}
          el.muted = false
        }).catch(() => {
          el.muted = false
        })
      } else {
        try { el.pause() } catch (_) {}
        try { el.currentTime = 0 } catch (_) {}
        el.muted = false
      }
    } catch (_) {
      el.muted = false
    }
  })
}

