function _startCombatSequence(mob, tierMob) {
  const keepMapMusic =
    (mob === "kraken" && currentMap === "tourbillon.jpg") ||
    (mob === "balraug" && currentMap === "balraug.jpg")

  if (!keepMapMusic) {
    fadeMusicOut(() => {
      const track = tierMob === "boss"
        ? "audio/worldboss.mp3"
        : tierMob === "high"
        ? "audio/highcombat.mp3"
        : "audio/lowcombat.mp3"
      setTimeout(() => crossfadeMusic(track), 100)
    })
  }

  const intro = document.getElementById("combatIntro"); intro.style.display = "flex"
  const cf    = document.getElementById("combatFilter")
  cf.style.display = "block"; cf.style.opacity = "1"; cf.style.transition = "none"

  if (tierMob === "boss")       { cf.style.background = "rgba(120,0,0,0.7)"; screenShakeHard(); setTimeout(() => screenShakeHard(), 400); setTimeout(() => screenShakeHard(), 800) }
  else if (tierMob === "high")  { cf.style.background = "rgba(80,0,0,0.6)";  screenShakeHard(); setTimeout(() => screenShake(), 500) }
  else                          { cf.style.background = "rgba(60,0,0,0.5)";  screenShake() }
  playSound("combatSound", 0.4)

  setTimeout(() => {
    intro.style.display = "none"
    showMobIntro(mob)

    setTimeout(() => {
      const fade = document.getElementById("fadeScreen")
      fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = "1"

      setTimeout(() => {
        const map = document.getElementById("map")
        map.style.backgroundImage = "url('images/" + _getCombatArenaMap(currentMob, tierMob) + "')"
        fadeToCombat()
        cf.style.display = "none"; cf.style.opacity = "1"
        fade.style.transition = "opacity 1s ease"; fade.style.opacity = "0"

        setTimeout(() => {
          spawnMobToken(mob)
          // Extra mobs
          ;["mob2","mob3"].forEach(slot => {
            if (_state.pendingExtraMobs && _state.pendingExtraMobs[slot]) {
              db.ref("combat/" + slot).once("value", snap => {
                const md = snap.val()
                if (md) { const ex = document.getElementById("mobToken_" + slot); if (ex) ex.remove(); spawnExtraMobToken(md, slot) }
              })
            }
          })

            if (tierMob === "boss") startBossFireEffect()
            const allyBtn = document.getElementById("allyBtn"); if (allyBtn && isGM) allyBtn.style.display = "flex"
            showCombatHUD()
            if (typeof updateThuumButton === "function") updateThuumButton()
            if (isGM) initCombatTurnState()

          db.ref("combat/mob").once("value", () => {
            activeMobSlots["mob"] = true
            if (!document.getElementById("mobAttackPanel")) renderAllMobPanels()
            if (isGM) {
              const ap = document.getElementById("addMobPanel")
              if (ap) {
                ap.style.display = "block"
                const btnsDiv = document.getElementById("addMobButtons")
                if (btnsDiv && !btnsDiv.dataset.built) {
                  btnsDiv.dataset.built = "1"
                  ;["gobelins","loup","draugr","garde","bandit","ogre","valkyrie","golem","zombie","zombie2"].forEach(m => {
                    const b = document.createElement("button")
                    b.style.cssText = "padding:3px 8px;font-family:Cinzel,serif;font-size:9px;background:rgba(120,10,10,0.5);color:#ffaaaa;border:1px solid rgba(180,40,40,0.4);border-radius:3px;cursor:pointer;"
                    b.innerText = m; b.onclick = () => addMobToFight(m); btnsDiv.appendChild(b)
                  })
                }
              }
            }
          })


          loadPlayerCombatStats()
          if (isGM) {
            document.getElementById("gmDamagePanel").style.display = "block"
            if (typeof toggleGMDamageControls === "function") toggleGMDamageControls(true)
            document.getElementById("gmCombatButtons").style.display = "flex"
          }
        }, 600)
      }, 800)
    }, 2500)
  }, 2000)
}

/* ========================= */
/* INTRO MOB                 */
/* ========================= */

function showMobIntro(mob) {
  window.__cancelBalrogIntroSound?.()
  window.__witchIntroSoundPlaying = false
  const mobs = [mob]
  if (_state.pendingExtraMobs) {
    ;["mob2","mob3"].forEach(slot => { const m = _state.pendingExtraMobs[slot]; if (m) mobs.push(m) })
  }
  const slots   = [{ box:"storyImage", img:"storyImageContent" }, { box:"storyImage2", img:"storyImageContent2" }, { box:"storyImage3", img:"storyImageContent3" }]
  const posMap  = {
    1: [{ left:"50%", transform:"translateX(-50%)", right:"auto" }],
    2: [{ left:"25%", transform:"translateX(-50%)", right:"auto" }, { left:"75%", transform:"translateX(-50%)", right:"auto" }],
    3: [{ left:"20%", transform:"translateX(-50%)", right:"auto" }, { left:"50%", transform:"translateX(-50%)", right:"auto" }, { left:"80%", transform:"translateX(-50%)", right:"auto" }]
  }
  const posSet = posMap[Math.min(mobs.length, 3)]

    mobs.forEach((mobName, i) => {
      if (i >= slots.length) return
      const s = slots[i]; const p = posSet[i]
      const box = document.getElementById(s.box); const img = document.getElementById(s.img)
      if (!box || !img) return
      box.style.left = p.left; box.style.transform = p.transform; box.style.right = p.right || "auto"
      box.style.display = "flex"; box.style.opacity = "1"
      img.src = "images/" + mobName + ".png"
      if (mobName === "witch" && !window.__witchIntroSoundPlaying) {
        window.__witchIntroSoundPlaying = true
        const witchSound = new Audio("audio/witch.mp3")
        setManagedAudioBaseVolume(witchSound,.9)
        witchSound.play().catch(() => {})
        setTimeout(() => {
          const fadeIv = setInterval(() => {
            if (witchSound.__baseVolume > 0.08) setManagedAudioBaseVolume(witchSound,Math.max(0,witchSound.__baseVolume-0.09))
            else {
              witchSound.pause()
              window.__witchIntroSoundPlaying = false
              clearInterval(fadeIv)
            }
          }, 100)
        }, 4000)
      }
      const title = document.createElement("div")
      title.innerText = heroDisplayName(mobName).toUpperCase()
      title.style.cssText = "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:clamp(20px,3vw,40px);color:red;text-shadow:0 0 10px red;white-space:nowrap;"
      box.appendChild(title)
      if(["balraug","balrog"].includes(mobName)){const scope=createPresentationScope("__cancelBalrogIntroSound"),definition=getMobSpecialPresentation("balraug"),sound=scope.audio(new Audio("audio/"+(definition?.sound||"balrog.mp3")));sound.__specialEffect=true;setManagedAudioBaseVolume(sound,definition?.soundVolume||.8);sound.play().catch(()=>{});scope.later(scope.cancel,4000)}
    setTimeout(() => {
      box.style.transition = "opacity 1s"; box.style.opacity = "0"
      setTimeout(() => { box.style.display = "none"; if (title.parentNode) title.remove(); box.style.opacity = "1"; box.style.transition = "" }, 1000)
    }, 3000)
  })
}

/* ========================= */
/* ARÈNE                     */
/* ========================= */

function fadeToCombat() {
  const arena     = document.getElementById("combatArena")
  const tokenZone = document.getElementById("combatTokens")
  arena.style.cssText = "display:block;position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;"
  tokenZone.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"

  ;["greg","ju","elo","bibi"].forEach((id, i) => {
    const token = document.getElementById(id)
    if (!token) return
    tokenZone.appendChild(token)
    token.style.transition = "none"; token.style.position = "absolute"; token.style.display = "flex"
    const startX = Math.round((window.innerWidth - 4 * 110) / 2)
      token.style.left   = (startX + i * 110) + "px"
      token.style.top    = Math.round(window.innerHeight * 0.65) + "px"
      token.style.zIndex = "200"; token.style.width = "70px"; token.style.height = "70px"
      token.style.pointerEvents = "auto"
      setTimeout(() => { token.style.transition = "" }, 50)
    })

  const mob = document.getElementById("mobToken")
  if (mob) {
    tokenZone.appendChild(mob)
    mob.style.cssText = "position:absolute;left:650px;top:180px;display:flex;z-index:200;"
  }
  const positions=resolveCombatTokenPositions(window.__combatSnapshot,window.__tokenPositions)
  Object.entries(positions).forEach(([id,pos])=>{const token=document.getElementById(id);if(token){token.style.left=pos.x+"px";token.style.top=pos.y+"px"}})
}

