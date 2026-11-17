const _DICE_FACE_ROTS = { 1:{rx:0,ry:0}, 2:{rx:90,ry:0}, 3:{rx:0,ry:-90}, 4:{rx:0,ry:90}, 5:{rx:-90,ry:0}, 6:{rx:0,ry:180} }

function _buildDice3D(resultBox) {
  resultBox.innerHTML = ""
  const label = document.createElement("div")
  label.className = "dice-player-label"
  label.id = "dicePlayerLabel"
  resultBox.appendChild(label)

  const wrap = document.createElement("div")
  wrap.className = "dice-3d-wrap"
  const cube = document.createElement("div")
  cube.className = "dice-3d"
  cube.id = "dice3d"
  const faceVals = [1, 6, 3, 4, 5, 2]
  const faceClasses = ["df1","df2","df3","df4","df5","df6"]
  faceClasses.forEach((cls, i) => {
    const f = document.createElement("div")
    f.className = "dice-face " + cls
    f.textContent = faceVals[i]
    cube.appendChild(f)
  })
  wrap.appendChild(cube)
  resultBox.appendChild(wrap)

  const resLabel = document.createElement("div")
  resLabel.className = "dice-result-label"
  resLabel.id = "diceResultLabel"
  resultBox.appendChild(resLabel)
  return { cube, label, resLabel }
}

function _showDiceAnimationNow(playerName, max, final, rawRoll, rollMeta = {}) {
  window.__diceResolutionUntil = Date.now() + 2600
  const resultBox = document.getElementById("diceResult")
  const scope=createPresentationScope("__cancelDicePresentation",()=>{resultBox.style.display="none";resultBox.classList.remove("crit","fail","mjRoll");window.__diceResolutionUntil=0})
  scope.later(scope.cancel,4500)
  resultBox.classList.remove("crit", "fail", "mjRoll")
  resultBox.style.display = "flex"
  resultBox.style.transform = "translate(-50%, -50%)"
  resultBox.offsetHeight

  const safeName = pikaDisplayText(playerName).replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const naturalRoll = Number.isFinite(parseInt(rawRoll, 10)) ? parseInt(rawRoll, 10) : final
  const isCritical = rollMeta.crit ?? (Number.isInteger(naturalRoll) && Number.isInteger(max) && naturalRoll === max && naturalRoll > 1)
  const isFailure = rollMeta.fail ?? (Number.isInteger(naturalRoll) && naturalRoll === 1)
  const { cube, label, resLabel } = _buildDice3D(resultBox)

  label.textContent = safeName + (rollMeta.diceKind==="chance"?" — Chance":"") + " — d" + max
  resLabel.textContent = ""
  resultBox.style.opacity = 1

  // Rotation rapide pendant 1.8s
  let t = 0
  cube.style.transition = "none"
  const spin = scope.every(() => {
    t += 0.15
    cube.style.transform = "rotateX(" + (t*137) + "deg) rotateY(" + (t*247) + "deg) rotateZ(" + (t*83) + "deg)"
  }, 16)

  scope.later(() => {
    clearInterval(spin)
    // Aligner la face sur le résultat
    const displayVal = ((final - 1) % 6) + 1
    const rot = _DICE_FACE_ROTS[displayVal]
    cube.style.transition = "transform 0.45s cubic-bezier(0.2,0.8,0.3,1.15)"
    cube.style.transform = "rotateX(" + rot.rx + "deg) rotateY(" + rot.ry + "deg)"

    scope.later(() => {
      resLabel.textContent = rollMeta.bonus?naturalRoll+" + "+rollMeta.bonus+" Chance = "+final:String(final)
      if(rollMeta.diceKind==="chance")addDiceLog(playerName,max,final,{diceKind:"chance",rawRoll:naturalRoll,bonus:rollMeta.bonus||0});else addDiceLog(playerName,max,final)

      if (playerName === "MJ") { resultBox.classList.add("mjRoll"); flashGold(); screenShake() }

      if (isCritical) {
        resultBox.classList.add("crit")
        resLabel.textContent = "✦ " + final + " ✦"
        playSound("critSound"); screenShake(); flashGold()
        if(isGM && rollMeta.eventId)tryRuneEventOnDice(rollMeta.eventId)
        if (playerName !== "MJ" && playerName !== "MOB") {
          // Conséquence appliquée une seule fois par le lanceur ou le moteur de combat.
        }
      }

      if (isFailure) {
        resultBox.classList.add("fail")
        playSound("critFailSound"); screenShakeHard(); flashRed()
        if(isGM && rollMeta.eventId)tryRuneEventOnDice(rollMeta.eventId)
        if (playerName !== "MJ" && playerName !== "MOB") {
          // Conséquence appliquée une seule fois par le lanceur ou le moteur de combat.
        }
      }

      // Idle après affichage
      scope.later(() => {
        cube.style.transition = ""
        cube.style.animation = "diceIdle 10s linear infinite"
      }, 500)

      // Disparition
      scope.later(() => {
        resultBox.style.opacity = 0
        scope.later(() => {
          resultBox.style.display = "none"
          resultBox.classList.remove("crit","fail","mjRoll")
          cube.style.animation = ""
        }, 500)
      }, 1800)
    }, 300)
  }, 1800)
}

