"use strict"

// Fiches : character-sheet.js. Boutiques : shops.js. Wanted et runes : wanted.js / rune-challenge.js.


/* ========================= */
/* COMBAT UI                 */
/* ========================= */

function loadPlayerCombatStats() {
  if (!myToken || !canAccessCharacter(myToken.id)) return
  stopCombatStatsSubscription()
  const playerId = myToken.id
  const ref = db.ref("characters/" + playerId)
  const cb = snap => {
    if (!myToken || myToken.id !== playerId || !canAccessCharacter(playerId)) return
    const raw = snap.val(); if (!raw) return
    const d = (typeof getEffectiveCharacterData === "function") ? getEffectiveCharacterData(myToken.id, raw) : raw
    window.__combatInventoryModifiers = d.__inventoryStatMods || { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
    ;["force","charme","perspi","chance","defense","hp"].forEach(k => { const el = document.getElementById("combat_"+k); if (el) el.value = d[k] || 0 })
    updateCombatHPBar(raw.hp || 0)
    if (!isGM && (combatActive || gameState === "COMBAT") && (parseInt(raw.hp, 10) || 0) <= 0 && !window.__combatOutcomeShowing) {
      if (typeof triggerLocalDefeat === "function") triggerLocalDefeat("hp")
    }
  }
  window.__combatStatsRef = ref
  window.__combatStatsCb = cb
  ref.on("value", cb)
}

async function saveCombatStats(fieldId=null) {
 const id=myToken?.id;if(!id||!canAccessCharacter(id))return false
 const stats=["force","charme","perspi","chance","defense","hp"],data={},mods=window.__combatInventoryModifiers||{}
 for(const stat of stats){if(fieldId&&fieldId!=="combat_"+stat)continue;const value=document.getElementById("combat_"+stat)?.value;if(value==null||!String(value).trim()||!Number.isSafeInteger(Number(value))||Number(value)<0){showNotification("Statistique invalide");return false}data[stat]=stat==="hp"?Number(value):getPersistedSheetStatValue(stat,value,mods)}
 if(!Object.keys(data).length)return false
 try{await persistCharacterEdits(id,data);if(myToken?.id===id){if(data.hp!=null){updateTokenGlow(id,data.hp);updateCombatHPBar(data.hp)}updateTokenStats(id)}return true}
 catch(error){showNotification("Statistiques de "+heroDisplayName(id)+" non confirmées : "+error.message);return false}
}

function updateCombatHPBar(hp) {
  const bar = document.getElementById("combatHPBar"); if (!bar) return
  const pct = Math.max(0, Math.min(100, hp)); bar.style.width = pct + "%"
  if (pct > 60)      { bar.style.background = "linear-gradient(90deg,#3cff6b,#0b8a3a)"; bar.style.boxShadow = "0 0 8px lime"; bar.style.animation = "none" }
  else if (pct > 30) { bar.style.background = "linear-gradient(90deg,#ffb347,#ff7b00)"; bar.style.boxShadow = "0 0 8px orange"; bar.style.animation = "none" }
  else               { bar.style.background = "linear-gradient(90deg,#ff4040,#8b0000)"; bar.style.boxShadow = "0 0 10px red"; bar.style.animation = "hpDangerPulse 0.7s infinite alternate" }
}

function appendAttackLine(container, label, value) {
  if (value == null || value === "") return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = label + " :"
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" " + value))
  container.appendChild(line)
}

function getCombatAssetFromAttack(attack, mobData) {
  const type = String(attack?.type || "").toLowerCase()
  const effect = String(attack?.effect || "").toLowerCase()
  const name = String(attack?.name || "").toLowerCase()
  const animation = String(attack?.animation || "").toLowerCase()
  const mobName = String(mobData?.name || "").toLowerCase()

  if (animation === "bloodmoon" || mobName.includes("vampire")) return "fang.png"
  if (animation === "howl" || mobName.includes("loup") || mobName.includes("fenrir")) return "fang.png"
  if (animation === "fire" || name.includes("feu") || name.includes("braise")) return "fire.png"
  if (animation === "storm") return "arc.png"
  if (animation === "arcane" || animation === "witch" || type.includes("sort") || type.includes("magie") || type.includes("charme") || type.includes("analyse")) return "arcane.png"
  if (animation === "spectral" || animation === "abyss" || animation === "venom" || animation === "shadow") return "shadow.png"
  if (animation === "divine" || type.includes("soin") || name.includes("prêtre") || mobName.includes("pretre") || mobName.includes("valkyrie") || mobName.includes("odin") || mobName.includes("freya")) return "holy.png"
  if (effect === "curse") return "curse.png"
  if (effect === "all") return "impact_ring.png"
  if (type.includes("distance")) return "arc.png"
  if (type.includes("invocation")) return "rune_glow.png"
  if (type.includes("spécial") || type.includes("special")) return "impact_ring.png"
  if (type.includes("mêlée") || type.includes("melee") || name.includes("morsure") || name.includes("griffe") || name.includes("crocs")) return "claw.png"
  return "slash_overlay.png"
}

function createCombatIcon(attack, mobData, className) {
  const img = document.createElement("img")
  img.className = className || "combatIcon"
  img.src = "images/" + getCombatAssetFromAttack(attack, mobData)
  img.alt = ""
  img.onerror = () => { img.style.display = "none" }
  return img
}


function appendAttackDiceLine(container, dice, stat) {
  if (!dice) return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = "Jet :"
  const diceEl = document.createElement("span")
  diceEl.className = "attackDice"
  diceEl.innerText = "d" + dice
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" "))
  line.appendChild(diceEl)
  if (stat) {
    const statEl = document.createElement("span")
    statEl.className = "attackStat"
    statEl.innerText = String(stat).toUpperCase()
    line.appendChild(document.createTextNode(" + "))
    line.appendChild(statEl)
  }
  container.appendChild(line)
}

function populateAttackBlock(block, attack) {
  const head = document.createElement("div")
  head.className = "combatAttackHead"
  head.appendChild(createCombatIcon(attack, null, "combatIcon"))
  const t = document.createElement("div")
  t.className = "combatAttack"
  t.innerText = attack.name
  head.appendChild(t)
  block.appendChild(head)
  appendAttackLine(block, "Type", attack.type)
  appendAttackDiceLine(block, attack.dice, attack.stat)
  appendAttackLine(block, "Effet", attack.effect)
  appendAttackLine(block, "Crit", attack.crit)
  if (attack.condition) appendAttackLine(block, "Condition", attack.condition)
}

function getAttackStatKey(statLabel) {
  const raw = String(statLabel || "").toLowerCase()
  if (raw.includes("force")) return "force"
  if (raw.includes("charme")) return "charme"
  if (raw.includes("chance")) return "chance"
  if (raw.includes("perspi") || raw.includes("perspic")) return "perspi"
  if (raw.includes("def")) return "defense"
  return "force"
}

function getPlayerAttackTypeKey(attack) {
  const value = String(attack?.type || "").toLowerCase()
  if (value.includes("soin")) return "heal"
  if (value.includes("sort")) return "spell"
  if (value.includes("invocation")) return "summon"
  if (value.includes("analyse")) return "analysis"
  if (value.includes("charme")) return "charm"
  if (value.includes("distance")) return "ranged"
  if (value.includes("sp")) return "special"
  return "physical"
}

function getPlayerSpecialAttack(playerId) {
  return (typeof playerSpecialAttacks !== "undefined" && playerSpecialAttacks) ? (playerSpecialAttacks[playerId] || null) : null
}

function hasPlayerUsedCombatSpecial(playerId) {
  return !!(window.__playerCombatSpecialsUsed && window.__playerCombatSpecialsUsed[playerId])
}


function hasPlayerCombatTrigger(playerId, key) {
  return !!(window.__playerCombatFlags && window.__playerCombatFlags[playerId] && window.__playerCombatFlags[playerId][key])
}

function getCharacterMaxHp(playerId, charData = {}) {
  const direct =
    parseInt(charData.maxHp ?? charData.hpMax ?? charData.hpmax, 10)
  if (Number.isFinite(direct) && direct > 0) return direct

  const lvl = Math.max(1, parseInt(charData.lvl, 10) || 1)
  if (typeof getPlayerStatsAtLevel === "function") {
    const statsAtLevel = getPlayerStatsAtLevel(playerId, lvl)
    if (statsAtLevel && Number.isFinite(parseInt(statsAtLevel.hp, 10))) {
      return parseInt(statsAtLevel.hp, 10)
    }
  }

  if (playerBaseStats && playerBaseStats[playerId] && Number.isFinite(parseInt(playerBaseStats[playerId].hp, 10))) {
    return parseInt(playerBaseStats[playerId].hp, 10)
  }

  return Math.max(1, parseInt(charData.hp, 10) || 1)
}

function parseInventoryItems(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function playerHasInventoryItem(charData, itemNeedle) {
  const needle = String(itemNeedle || "").toLowerCase().trim()
  if (!needle) return false
  return parseInventoryItems(charData?.inventaire).some(item => item === needle || item.includes(needle))
}


function isPhysicalMobAttack(attack) {
  const effect = String(attack?.effect || "").toLowerCase()
  const type = String(attack?.type || "").toLowerCase()
  const name = String(attack?.name || "").toLowerCase()
  if (effect === "all" || effect === "curse" || effect === "magic" || effect === "ranged") return false
  if (effect === "melee") return true
  if (type.includes("melee") || type.includes("physical") || type.includes("physique")) return true
  return /(coup|frappe|morsure|griffe|croc|charge|balayage|taloche|massue|lance|estoc|poing|fouet|pi[eé]tinement|entaille)/.test(name)
}

function chooseCombatTarget(playerIds,titleText){
 const combatId=window.__combatSnapshot?.id,owner=combatOwner(getCombatHUDPlayerId()),previousFocus=document.activeElement
 if(typeof combatTargetCancellation==="function")combatTargetCancellation()
 return new Promise(resolve=>{
  const picker=document.createElement("section");picker.id="combatTargetPicker";picker.className="combatTargetPickerPanel";picker.setAttribute("role","dialog");picker.setAttribute("aria-label",titleText||"Choisir une cible")
  picker.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px;z-index:2000000000;background:#101b22;border:1px solid #cda761;border-radius:10px;color:#ffe4ac;font:17px Georgia"
  const title=document.createElement("p");title.textContent=titleText||"Choisir une cible";picker.appendChild(title)
  const hint=document.createElement("p");hint.className="combatTargetPickerHint";hint.textContent="Choisir un allié lance le soin. Annuler ne consomme aucune action.";picker.appendChild(hint)
  let done=false;const finish=value=>{if(done)return;done=true;picker.remove();combatTargetCancellation=null;combatTargetRefresh=null;if(previousFocus?.isConnected)previousFocus.focus?.();resolve(value)}
  const choices=[];for(const id of playerIds){const button=document.createElement("button");button.dataset.combatTarget=id;button.style.cssText="display:block;width:100%;padding:12px;margin:8px 0";button.onclick=()=>{if(!button.disabled)finish(id)};picker.appendChild(button);choices.push([id,button])}
  const cancel=document.createElement("button");cancel.textContent="Annuler";cancel.onclick=()=>finish(null);picker.appendChild(cancel);document.body.appendChild(picker)
  combatTargetCancellation=()=>finish(null);combatTargetRefresh=()=>{if(!combatActive||window.__combatSnapshot?.id!==combatId||window.__combatSnapshot?.phase==="finished"||(owner&&window.__combatSnapshot?.turnState?.currentActorId!==owner)){finish(null);return}for(const [id,button]of choices){const hp=window.__publicCharacters?.[id]?.hp;button.disabled=hp!=null&&hp<=0;button.textContent=heroDisplayName(id)+(hp!=null?" — "+hp+" PV":"")+(button.disabled?" — KO":"")}};combatTargetRefresh();choices.find(([,b])=>!b.disabled)?.[1].focus();refreshCombatHUDContext()
 })
}

function getPlayerAttackPower(attack, roll, statValue, context = {}) {
  const type = getPlayerAttackTypeKey(attack)
  const scaling = getPlayerLevelScaling(context.playerId || context.actorId || "", context.charData || null)
  const lvl = Math.max(1, scaling.lvl || 1)
  const getTieredLevelBonus = multiplier => {
    if (lvl <= 1) return 0
    let total = 0
    for (let current = 2; current <= lvl; current += 1) {
      let perLevel = 1
      if (current >= 15) perLevel = 4
      else if (current >= 10) perLevel = 3
      else if (current >= 5) perLevel = 2
      total += perLevel
    }
    return Math.max(0, Math.round(total * multiplier))
  }

  let levelBonus = 0
  if (type === "analysis") levelBonus = getTieredLevelBonus(0.35)
  else if (type === "charm" || type === "summon") levelBonus = getTieredLevelBonus(0.7)
  else if (type === "heal") levelBonus = getTieredLevelBonus(0.85)
  else levelBonus = getTieredLevelBonus(1)

  if (attack && attack.name === "Je suis jet laguée") {
    return Math.max(1, (parseInt(roll, 10) || 0) + (parseInt(statValue, 10) || 0) + levelBonus)
  }
  const multipliers = {
    physical: 1.05,
    ranged: 1.0,
    special: 1.18,
    charm: 1.08,
    spell: 1.12,
    analysis: 0.72,
    summon: 0.94,
    heal: 1.0
  }
  const power = Math.round(roll * (multipliers[type] || 1) + statValue * 0.82 + levelBonus)
  if (type === "heal") return Math.max(8, power)
  return Math.max(1, power)
}

function getCombatHUDPlayerId() {
  if (isGM && window.__combatPreviewPlayerId) return window.__combatPreviewPlayerId
  if (myToken && myToken.id) return myToken.id
  return null
}

function setCombatPreviewPlayer(playerID) {
  if (!isGM) return
  window.__combatPreviewPlayerId = playerID || null
  showCombatHUD()
  const hud = document.getElementById("combatHUD")
  if (hud) {
    hud.style.display = "flex"
    hud.style.alignItems = "flex-start"
  }
  document.querySelectorAll(".gmPlayerTestBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.playerId === playerID)
  })
}

function closeCombatPreviewHUD() {
  window.__combatPreviewPlayerId = null
  const hud = document.getElementById("combatHUD")
  if (hud) hud.style.display = "none"
  document.querySelectorAll(".gmPlayerTestBtn").forEach(btn => btn.classList.remove("active"))
}


function getPlayerSpecialPresentation(playerId) {
  const key = String(playerId || "").toLowerCase()
  const map = {
    greg: {
      scene: "greg",
      kicker: "FINISHER",
      accent: "#d9b37c",
      glow: "rgba(217,179,124,0.38)",
      image: "gregspé.jpg",
      quoteFrame: "cadre.png"
    },
    ju: {
      scene: "yu",
      kicker: "RIPOSTE",
      accent: "#8fc9ff",
      glow: "rgba(143,201,255,0.34)",
      image: "pika.png",
      quoteFrame: "cadre.png"
    },
    elo: {
      scene: "elo",
      kicker: "INCANTATION",
      accent: "#9cf2cf",
      glow: "rgba(156,242,207,0.34)",
      image: "elospé.jpg",
      quoteFrame: "cadre.png"
    },
    bibi: {
      scene: "bibi",
      kicker: "RAGE CANINE",
      accent: "#ffd28d",
      glow: "rgba(255,210,141,0.34)",
      image: "bibispé.png",
      quoteFrame: "cadre.png"
    }
  }
  return map[key] || map.greg
}

function showPlayerSpecialCinematic(playerId, attack, outcome, meta = {}) {
  const presentation = getPlayerSpecialPresentation(playerId)
  const specialSoundMap = {
    greg: "spégreg.mp3",
    elo: "spéelo.mp3",
    bibi: "spébibi.mp3"
  }
  playSound("powSound",0.84,true)
  const overlay = document.createElement("div")
  overlay.className = "playerSpecialOverlay playerSpecialOverlay--" + presentation.scene

  const stage = document.createElement("div")
  stage.className = "playerSpecialStage"
  overlay.appendChild(stage)

  if (presentation.video) {
    const heroVideo = document.createElement("video")
    heroVideo.className = "playerSpecialVideo playerSpecialVideo--" + presentation.scene
    heroVideo.src = "images/" + presentation.video
    heroVideo.autoplay = true
    heroVideo.loop = true
    heroVideo.muted = false
    heroVideo.__specialEffect = true
    heroVideo.volume = 0.88
    heroVideo.playsInline = true
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(heroVideo, 0.88)
    heroVideo.onerror = () => heroVideo.style.display = "none"
    stage.appendChild(heroVideo)
    heroVideo.play().catch(()=>{heroVideo.muted=true;heroVideo.play().catch(()=>{})})
  } else if (presentation.image) {
    const heroImage = document.createElement("img")
    heroImage.className = "playerSpecialImage playerSpecialImage--" + presentation.scene
    heroImage.src = "images/" + presentation.image
    heroImage.alt = ""
    heroImage.onerror = () => heroImage.style.display = "none"
    stage.appendChild(heroImage)
  }

  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.alt = ""
  ring.className = "playerSpecialRing"
  stage.appendChild(ring)

  const slash = document.createElement("img")
  slash.src = "images/" + ((presentation.scene === "elo" || presentation.scene === "yu") ? "rune_glow.png" : "slash_overlay.png")
  slash.alt = ""
  slash.className = "playerSpecialSlash"
  stage.appendChild(slash)

  const box = document.createElement("div")
  box.className = "playerSpecialBox"

  const kicker = document.createElement("div")
  kicker.className = "playerSpecialKicker"
  kicker.style.color = presentation.accent
  kicker.innerText = meta.fail ? "ÉLAN BRISÉ" : meta.crit ? "MOMENT DÉCISIF" : presentation.kicker
  box.appendChild(kicker)

  const title = document.createElement("div")
  title.className = "playerSpecialTitle"
  title.innerText = String(attack.name || "SPÉCIALE").toUpperCase()
  box.appendChild(title)

  const flavorText = meta.preview ? "APERÇU — aucun dégât ni soin appliqué" : outcome.mode === "heal"
    ? heroDisplayName(playerId).toUpperCase() + " restaure " + (outcome.amount || 0) + " PV"
    : heroDisplayName(playerId).toUpperCase() + " frappe " + pikaDisplayText(outcome.targetName || "MOB") + " pour " + (outcome.amount || 0) + " dégâts"

  let flavorHost = box
  if (presentation.quoteFrame) {
    const frame = document.createElement("img")
    frame.className = "playerSpecialQuoteFrame playerSpecialQuoteFrame--" + presentation.scene
    frame.src = "images/" + presentation.quoteFrame
    frame.alt = ""
    frame.onerror = () => frame.style.display = "none"
    box.appendChild(frame)

    const quoteWrap = document.createElement("div")
    quoteWrap.className = "playerSpecialQuoteWrap playerSpecialQuoteWrap--" + presentation.scene
    box.appendChild(quoteWrap)
    flavorHost = quoteWrap
  }

  const sub = document.createElement("div")
  sub.className = "playerSpecialSub"
  sub.style.color = presentation.accent
  sub.innerText = flavorText
  flavorHost.appendChild(sub)

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  let previewVoice=null
  const specialSound = specialSoundMap[String(playerId || "").toLowerCase()]
  if (specialSound) {
    const voice = new Audio("audio/" + specialSound);voice.__specialEffect=true;if(meta.preview)previewVoice=voice
    const isEloSpecial = String(playerId || "").toLowerCase() === "elo"
    const baseVolume = isEloSpecial ? (meta.crit ? 1.25 : 1.12) : (meta.crit ? 0.96 : 0.88)
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(voice, baseVolume)
    else voice.volume = Math.min(1, baseVolume)
    voice.play().catch(() => {})
  }

  if (meta.fail) {
    playSound("critFailSound", 0.82, true)
    flashRed()
    screenShake()
  } else if (meta.crit) {
    playSound("critSound", 0.95, true)
    flashGold()
    flashGold()
    screenShakeHard()
    setTimeout(() => screenShake(), 180)
    setTimeout(() => screenShakeHard(), 360)
    powerExplosion()
  } else {
    flashGold()
    screenShake()
    setTimeout(() => screenShake(), 160)
  }

  setTimeout(() => {
    overlay.querySelectorAll("video").forEach(video=>video.pause())
    overlay.style.transition = "opacity 0.42s ease"
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), 450)
  }, 6000)
  return ()=>{overlay.querySelectorAll("video").forEach(video=>video.pause());previewVoice?.pause();overlay.remove()}
}

function showPlayerAttackImpact(playerId, attack, outcome, meta = {}) {
  if (meta.special) {
    return showPlayerSpecialCinematic(playerId, attack, outcome, meta)
  }
  const type = getPlayerAttackTypeKey(attack)
  const crit = !!meta.crit
  const fail = !!meta.fail

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999995;display:flex;align-items:center;justify-content:center;"

  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.alt = ""
  ring.style.cssText = "position:absolute;width:min(44vw,420px);opacity:0.22;filter:drop-shadow(0 0 22px rgba(255,210,120,0.28));animation:combatEventPulse 0.42s ease-out 2;"
  overlay.appendChild(ring)

  const slash = document.createElement("img")
  slash.src = "images/" + (type === "spell" || type === "analysis" || type === "summon" ? "rune_glow.png" : "slash_overlay.png")
  slash.alt = ""
  slash.style.cssText = "position:absolute;width:min(56vw,520px);opacity:0.2;transform:rotate(" + (Math.random() * 16 - 8) + "deg);filter:drop-shadow(0 0 16px rgba(255,255,255,0.14));"
  overlay.appendChild(slash)

  const box = document.createElement("div")
  const colorMap = {
    physical: "#d9b37c",
    ranged: "#c8d7ea",
    special: "#ffd28d",
    charm: "#d6a6ff",
    spell: "#8ff0d2",
    analysis: "#8fc9ff",
    summon: "#c1a0ff",
    heal: "#b8ffd2"
  }
  const accent = fail ? "#b86868" : (colorMap[type] || "#d9b37c")
  box.style.cssText = "position:relative;min-width:min(52vw,580px);max-width:72vw;padding:18px 30px;border:1px solid rgba(230,190,110,0.3);background:linear-gradient(135deg,rgba(6,14,18,0.9),rgba(12,20,24,0.84));box-shadow:0 0 30px rgba(0,0,0,0.44), inset 0 0 22px rgba(255,255,255,0.03);"

  const kicker = document.createElement("div")
  kicker.style.cssText = "font-family:Cinzel,serif;font-size:12px;letter-spacing:3px;color:" + accent + ";text-align:center;margin-bottom:6px;"
  kicker.innerText = fail ? "ÉLAN BRISÉ" : crit ? "FRAPPE CRITIQUE" : "ACTION DU JOUEUR"
  box.appendChild(kicker)

  const title = document.createElement("div")
  title.style.cssText = "font-family:'Uncial Antiqua','Cinzel',serif;font-size:30px;line-height:1.15;text-align:center;color:#f4ead2;text-shadow:0 0 16px rgba(0,0,0,0.5);"
  title.innerText = String(attack.name || "ATTAQUE").toUpperCase()
  box.appendChild(title)

  const sub = document.createElement("div")
  sub.style.cssText = "margin-top:10px;font-family:Cinzel,serif;font-size:14px;letter-spacing:1px;text-align:center;color:" + accent + ";"
  if (outcome.mode === "heal") sub.innerText = heroDisplayName(outcome.targetName || playerId).toUpperCase() + " récupère " + (outcome.amount || 0) + " PV"
  else sub.innerText = heroDisplayName(playerId).toUpperCase() + " frappe " + pikaDisplayText(outcome.targetName || "MOB") + " pour " + (outcome.amount || 0) + " dégâts"
  box.appendChild(sub)

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  if (fail) {
    playSound("critFailSound", 0.8)
    flashRed()
    screenShake()
  } else if (crit) {
    playSound("critSound", 0.9)
    flashGold()
    flashGold()
    screenShakeHard()
    powerExplosion()
  } else if (type === "heal") {
    playSound("powerSound", 0.42)
    flashGold()
  } else if (type === "spell" || type === "analysis" || type === "summon" || type === "charm") {
    playSound("powerSound", 0.5)
    flashGold()
    screenShake()
  } else {
    playSound("powerSound", 0.34)
    screenShake()
  }

  setTimeout(() => {
    overlay.style.transition = "opacity 0.35s ease"
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), 380)
  }, crit ? 2150 : 1800)
}

function isPlayerSpecialConditionMet(playerId, specialAttack, context = {}) {
  if (!specialAttack) return false
  const rule = specialAttack.rule || ""
  if(rule==="ally_below_twenty")return pikaAllyInDanger(context.players||{},playerId)
  const mob = context.mob || null
  const charData = context.charData || {}
  const players = context.players || {}

  if (rule === "mob_below_half") {
    if (!mob) return false
    const hp = parseInt(mob.hp, 10) || 0
    const maxHP = Math.max(1, parseInt(mob.maxHP, 10) || hp || 1)
    return hp <= Math.ceil(maxHP * 0.5)
  }

  if (rule === "mob_below_forty") {
    if (!mob) return false
    const hp = parseInt(mob.hp, 10) || 0
    const maxHP = Math.max(1, parseInt(mob.maxHP, 10) || hp || 1)
    return hp <= Math.ceil(maxHP * 0.4)
  }

  if (rule === "after_spider_sense") {
    return hasPlayerCombatTrigger(playerId, "spiderSense")
  }

  if (rule === "mob_used_special") {
    return !!mob?.specialUsed
  }

  if (rule === "ally_below_sixty") {
    return ["greg","ju","elo","bibi"].some(id => {
      const ally = players[id]
      if (!ally) return false
      const hp = parseInt(ally.hp, 10) || 0
      const maxHP = getCharacterMaxHp(id, ally)
      return hp <= Math.ceil(maxHP * 0.6)
    })
  }

  if (rule === "self_below_seventy") {
    const hp = parseInt(charData.hp, 10) || 0
    const maxHP = getCharacterMaxHp(playerId, charData)
    return hp <= Math.ceil(maxHP * 0.7)
  }

  if (rule === "greg_below_twenty") {
    const greg = players.greg || {}
    const hp = parseInt(greg.hp, 10) || 0
    const maxHP = getCharacterMaxHp("greg", greg)
    return hp <= Math.ceil(maxHP * 0.2)
  }

  return false
}

function getPlayerLevelScaling(playerId, charData = null) {
  const source = charData || {}
  const lvl = Math.max(1, parseInt(source.lvl, 10) || 1)
  return {
    lvl,
    damageFlat: Math.max(0, (lvl - 1) * 2),
    supportFlat: Math.max(0, Math.floor((lvl - 1) * 1.5)),
    finisherFlat: Math.max(0, (lvl - 1) * 3)
  }
}

function applyPlayerSpecialModifiers(playerId, state) {
  const pid = String(playerId || "").toLowerCase()
  const next = { ...state }
  const scaling = getPlayerLevelScaling(playerId, state.charData)
  next.levelScaling = scaling
  next.failEffectText = ""

  if (pid === "greg") {
    next.damage += 14 + scaling.finisherFlat
    next.flatBonus += 14 + scaling.finisherFlat
    if ((state.mobHpRatio || 1) <= 0.25) {
      next.damage += 8
      next.flatBonus += 8
    }
    if (state.crit) {
      next.damage += 10 + scaling.supportFlat
      next.flatBonus += 10 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = 0
      next.flatBonus = 0
      next.failEffectText = "Greg vacille et rate sa fenêtre d'exécution."
    }
  } else if (pid === "ju") {
    next.damage += 10 + scaling.damageFlat
    next.flatBonus += 10 + scaling.damageFlat
    if (state.mobSpecialUsed) {
      next.damage += 6 + scaling.supportFlat
      next.flatBonus += 6 + scaling.supportFlat
    }
    if (state.crit) {
      next.damage += 4 + scaling.supportFlat
      next.flatBonus += 4 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = Math.max(0, Math.round(state.basePower * 0.4))
      next.flatBonus = 0
      next.failEffectText = "Le plan s'effondre et Pika dévoile trop tôt son jeu."
    }
  } else if (pid === "elo") {
    next.damage += 9 + scaling.damageFlat
    next.flatBonus += 9 + scaling.damageFlat
    next.groupHeal = 6 + (parseInt(state.charData?.charme, 10) || 0) + scaling.supportFlat
    if (state.anyAllyQuarterHp) next.groupHeal += 4
    if (state.crit) next.groupHeal *= 2
    if (state.fail) {
      next.damage = 0
      next.flatBonus = 0
      next.groupHeal = Math.max(3, Math.round((6 + scaling.supportFlat) * 0.5))
      next.failEffectText = "L'incantation se brise, mais un souffle d'espoir subsiste."
    }
  } else if (pid === "bibi") {
    next.damage += 12 + scaling.damageFlat
    next.flatBonus += 12 + scaling.damageFlat
    if (state.gregCriticalHp) {
      next.damage += 8 + scaling.supportFlat
      next.flatBonus += 8 + scaling.supportFlat
    }
    if (state.crit) {
      next.damage += 6 + scaling.supportFlat
      next.flatBonus += 6 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = Math.max(0, Math.round(state.basePower * 0.5))
      next.flatBonus = 0
      next.failEffectText = "Bibi part trop tôt et s'éparpille au lieu de mordre juste."
    }
  }

  return next
}

function buildPlayerSpecialBlock(playerId, specialAttack) {
  const block = document.createElement("div")
  block.className = "combatBlock combatBlock--action combatBlock--special"
  const used = hasPlayerUsedCombatSpecial(playerId)

  populateAttackBlock(block, specialAttack)
  appendAttackLine(block, "Condition", specialAttack.conditionText)
  if (specialAttack.fail) appendAttackLine(block, "Crit fail", specialAttack.fail)

  appendAttackLine(block, "Usage", "Une utilisation par combat")

  if (used) {
    block.classList.add("combatBlock--spent")
    block.onclick = null
  } else {
    block.title = "Cliquer pour lancer l'attaque spéciale"
    block.onclick = () => resolvePlayerAttack(specialAttack, { isSpecial: true, actorId:playerId })
  }

  bindCombatActionState(block,playerId,specialAttack,true)
  return block
}

function buildPassTurnBlock(actorId, label) {
  const block = document.createElement("div")
  block.className = "combatBlock combatBlock--action combatBlock--pass"
  const title = document.createElement("div")
  title.className = "attackTitle"
  title.innerText = "Passer le tour"
  block.appendChild(title)
  appendAttackLine(block, "Action", combatOwner(actorId)==="greg"?"Terminer l’action commune de Greg et Bibi":label||heroDisplayName(actorId).toUpperCase())
  appendAttackLine(block, "Effet", "Passe l'action sans attaquer")
  block.title = "Terminer le tour de " + (label || heroDisplayName(actorId).toUpperCase())
  block.onclick=()=>requestCombatPass(actorId,false)
  bindCombatActionState(block,actorId,{name:"Passer le tour"})
  return block
}

function buildMobPassTurnBlock(actorId, label) {
  const block = document.createElement("div")
  block.style.cssText = "padding:6px 8px;margin-top:8px;background:rgba(24,16,16,0.45);border:1px solid rgba(190,140,90,0.28);border-radius:6px;cursor:pointer;"
  const title = document.createElement("div")
  title.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#f0c99d;font-weight:bold;letter-spacing:0.5px;"
  title.innerText = "Passer le tour"
  block.appendChild(title)
  const desc = document.createElement("div")
  desc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#d6b79e;"
  desc.innerText = (label || heroDisplayName(actorId).toUpperCase()) + " termine son action sans attaquer."
  block.appendChild(desc)
  block.title = "Terminer le tour de " + (label || heroDisplayName(actorId).toUpperCase())
  block.onclick=()=>requestCombatPass(actorId,true)
  bindCombatActionState(block,actorId,{name:"Passer le tour"},false,true)
  return block
}

function getCombatStatusEntries(){
 const entries=[],c=window.__combatSnapshot||{},state=c.turnState||getCombatTurnState(),actor=state?.currentActorId
 if(state?.phase==="active"&&actor)entries.push({kind:"buff",title:"Tour actif",text:(actor==="greg"?"Greg et Bibi":COMBAT_MOBS.includes(actor)?combatEnemyLabel(actor):heroDisplayName(actor))+" joue maintenant",meta:"Round "+(state.round||1)})
 if(c.heroHaste)entries.push({kind:"buff",title:"SKARO’H — "+heroDisplayName(c.heroHaste.actor),text:"Attaques basiques consécutives",meta:c.heroHaste.remaining+" attaque(s) restante(s)"})
 if(state?.phase==="rolling")entries.push({kind:"warn",title:"Initiative",text:"Les jets d’initiative sont en cours",meta:"Ordre des tours en préparation"})
 for(const slot of COMBAT_MOBS){
  const mob=c[slot];if(!mob||mob.hp<=0)continue
  const effects=[],add=(title,text,meta,kind="warn")=>effects.push({kind,title,text,meta})
  for(const [key,title,fallback]of [["playerPoison","Poison",1],["playerBleed","Saignement",1]]){const e=mob[key];if(e?.turns>0)add(title,"−"+(e.damage||fallback)+" PV à chaque fin de round",e.turns+" round(s) restant(s)")}
  if(mob.attackMalus?.turns>0)add("Attaque réduite","−"+(mob.attackMalus.amount||1)+" dégâts sur ses attaques",mob.attackMalus.turns+" round(s) restant(s)")
  if(mob.bibiRage?.turns>0)add("Le Bibi","Les attaques alliées contre cet ennemi gagnent +"+(mob.bibiRage.damage||2)+" dégâts",mob.bibiRage.turns+" round(s) restant(s)","buff")
  if(mob.yuAggro?.turns>0)add("Attiré par Pika","Ses attaques ciblées visent Pika si elle est encore debout",mob.yuAggro.turns+" round(s) restant(s)")
  if(mob.spiderSenseBuff?.active)add("Spider Sense","+10 % de dégâts alliés contre cet ennemi","Jusqu’à la fin du combat","buff")
  if(mob.revealedWeakness?.title)add("Faiblesse révélée",mob.revealedWeakness.title+(mob.revealedWeakness.text?" — "+mob.revealedWeakness.text:""),"Faiblesse de cet ennemi")
  if(mob.reihktParalyzed)add("REIHKT — Paralysie","Prochain tour complet neutralisé","1 tour à sauter")
  if(mob.pikaHypnosisTurns>0)add("Hypnose","Ses tours complets sont neutralisés",mob.pikaHypnosisTurns+" tour(s) restant(s)")
  if(effects.length){entries.push({kind:"section",title:combatEnemyLabel(slot)});entries.push(...effects)}
 }
 for(const [id,e]of Object.entries(c.heroDebuffs||{}))if(e.turns>0)entries.push({kind:"warn",title:heroDisplayName(id)+" affaibli",text:"Force et défense −"+(e.amount||2),meta:e.turns+" round(s) restant(s)"})
 for(const [id,n]of Object.entries(c.heroStuns||{}))if(n>0)entries.push({kind:"warn",title:heroDisplayName(id)+" étourdi",text:"Action neutralisée",meta:n+" action(s) à sauter"})
 for(const [id,states]of Object.entries(c.gmStates||{}))for(const [key,value]of Object.entries(states)){const def=GM_COMBAT_STATES[key];if(def)entries.push({kind:"warn",title:(COMBAT_MOBS.includes(id)?combatEnemyLabel(id):heroDisplayName(id))+" — "+def.label,text:def.description,meta:value.turns+" "+def.unit+" restant(s)"+(value.amount?" · "+value.amount+(value.mode==="percent"?" %":" points"):"")})}
 const summon=c.eloSummon;if(summon?.active)entries.push({kind:"ally",title:"John Pork",text:"Bonus D4 aux attaques d’Elo"+(summon.frenzy?", doublé et en zone":""),meta:(summon.turnsLeft||0)+" round(s) · "+(summon.hp||0)+" / "+(summon.maxHP||0)+" PV"})
 const hits=window.__combatDamageLog||[];if(hits.length)entries.push({kind:"section",title:"Derniers coups"})
 for(const hit of hits)entries.push({kind:hit.type,title:hit.from+" → "+hit.to,text:hit.type==="heal"?"+"+hit.amount+" PV":["dmg","mob"].includes(hit.type)?"−"+hit.amount+" PV":String(hit.detail||"Effet appliqué"),meta:"Round "+hit.round})
 return entries
}


let _renderCombatStatusPanelTimer = null
function renderCombatStatusPanel() {
  clearTimeout(_renderCombatStatusPanelTimer)
  _renderCombatStatusPanelTimer = setTimeout(_renderCombatStatusPanelNow, 50)
}
function _renderCombatStatusPanelNow() {
  const panel = document.getElementById("combatStatusPanel")
  if (!panel) return
  if (!combatActive) {
    panel.style.display = "none"
    panel.innerHTML = ""
    return
  }

  const entries = getCombatStatusEntries()
  panel.innerHTML = ""
  panel.style.display = "block"

  const header = document.createElement("div")
  header.className = "combatStatusHeader"
  header.innerText = "États du combat"
  panel.appendChild(header)

  const list = document.createElement("div")
  list.className = "combatStatusList"
  panel.appendChild(list)

  if (!entries.length) {
    const empty = document.createElement("div")
    empty.className = "combatStatusEmpty"
    empty.innerText = "Aucun état actif."
    list.appendChild(empty)
    return
  }

  entries.forEach(entry => {
    if (entry.kind === "section") {
      const sep = document.createElement("div")
      sep.className = "combatStatusSection"
      sep.innerText = entry.title || ""
      list.appendChild(sep)
      return
    }

    const row = document.createElement("div")
    row.className = "combatStatusItem combatStatusItem--" + (entry.kind || "buff")
    if ((entry.title || "").toLowerCase().includes("tour actif")) row.classList.add("combatStatusItem--turn")
    if ((entry.title || "").toLowerCase().includes("faiblesse")) row.classList.add("combatStatusItem--weakness")

    const icon = document.createElement("img")
    icon.className = "combatStatusIcon"
    icon.src = "images/" + sanitizeAssetName(entry.icon || "impact_ring.png")
    icon.alt = ""
    icon.onerror = () => { icon.style.display = "none" }
    row.appendChild(icon)

    const body = document.createElement("div")
    body.className = "combatStatusBody"

    const title = document.createElement("div")
    title.className = "combatStatusTitle"
    title.innerText = entry.title || "État"
    body.appendChild(title)

    const text = document.createElement("div")
    text.className = "combatStatusText"
    text.innerText = entry.text || ""
    body.appendChild(text)

    if (entry.meta) {
      const meta = document.createElement("div")
      meta.className = "combatStatusMeta"
      meta.innerText = entry.meta
      body.appendChild(meta)
    }

    row.appendChild(body)
    list.appendChild(row)
  })
}

function resolvePlayerAttack(attack, options = {}) { return requestHeroCombatAction(attack, options) }


function showCombatHUD() {
  const player = getCombatHUDPlayerId()
  if (!player) return
  const hud = document.getElementById("combatHUD")
  if (hud) {
    let bg = document.getElementById("combatHUDBg")
    if (!bg) {
      bg = document.createElement("img")
      bg.id = "combatHUDBg"
      bg.alt = ""
      bg.src = "images/menuintro.png?v=7"
      hud.prepend(bg)
    }
  }
  const playerAttacks = attacks[player]
  const specialAttack = getPlayerSpecialAttack(player)
  const currentActorId = typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null
  const meta = document.getElementById("combatHUDMeta")
  document.getElementById("combatHUDPortrait").src   = "images/" + heroPortraitFile(player)
  document.getElementById("combatHUDName").innerText  = heroDisplayName(player).toUpperCase()
  if (meta) {
    meta.replaceChildren()
    const rolePill = document.createElement("div")
    rolePill.className = "combatHUDMetaPill"
    rolePill.innerText = isGM && window.__combatPreviewPlayerId ? "Aperçu MJ" : "Combattant"
    meta.appendChild(rolePill)

    const turnPill = document.createElement("div")
    turnPill.className = "combatHUDMetaPill combatHUDMetaPill--turn"
    turnPill.innerText = currentActorId === player ? "Tour actif" : ("Tour : " + heroDisplayName(currentActorId || "—").toUpperCase())
    meta.appendChild(turnPill)

    if (isGM && window.__combatPreviewPlayerId) {
      const previewPill = document.createElement("div")
      previewPill.className = "combatHUDMetaPill combatHUDMetaPill--preview"
      previewPill.innerText = "Test MJ"
      meta.appendChild(previewPill)
    }
  }
  const box = document.getElementById("combatHUDAttacks"); box.innerHTML = ""
  const appendBasic=a=>{const block=document.createElement("div");block.className="combatBlock combatBlock--action";populateAttackBlock(block,a);block.onclick=()=>resolvePlayerAttack(a,{actorId:player});bindCombatActionState(block,player,a);box.appendChild(block)}
  const heading=text=>{const divider=document.createElement("div");divider.className="combatCompanionDivider";divider.textContent=text;box.appendChild(divider)}
  if(player==="greg")heading("Greg — attaques")
  ;(playerAttacks||[]).filter(a=>player!=="greg"||a.name!=="Le Bibi").forEach(appendBasic)
  if(specialAttack)box.appendChild(buildPlayerSpecialBlock(player,specialAttack))
  if(player==="greg"){
    heading("Bibi — même action que Greg")
    const basic=(playerAttacks||[]).find(a=>a.name==="Le Bibi");if(basic)appendBasic(basic)
    const special=getPlayerSpecialAttack("bibi");if(special){const block=buildPlayerSpecialBlock("bibi",special);block.classList.add("combatBlock--companion");box.appendChild(block)}
  }
  box.appendChild(buildPassTurnBlock(player, heroDisplayName(player).toUpperCase()))
  refreshCombatHUDContext()
  // Greg et Bibi partagent le même tour et une seule action.
  renderCombatStatusPanel()
  if (hud) hud.style.display = "none"
  const btn = document.getElementById("playerAttackBtn"); if (btn && player) btn.style.display = "flex"
}

function togglePlayerAttacks(){
 const hud=document.getElementById("combatHUD");if(!hud||!getCombatHUDPlayerId())return
 if(hud.style.display==="none"||!hud.style.display){refreshCombatActionStates();hud.style.display="flex";hud.style.alignItems="flex-start"}
 else{hud.style.display="none";if(isGM&&window.__combatPreviewPlayerId)closeCombatPreviewHUD()}
}


function openGMPlayerSheet(playerID) {
  if (!isGM) return
  if (window.__combatPreviewPlayerId === playerID) {
    if (typeof closeCombatPreviewHUD === "function") closeCombatPreviewHUD()
    return
  }
  if (typeof setCombatPreviewPlayer === "function") setCombatPreviewPlayer(playerID)
}

/* ========================= */
/* MULTI-MOBS                */
/* ========================= */

// Ciblage intelligent selon le type d'attaque


function renderAllMobPanels() {
  const ex=document.getElementById("mobAttackPanel"); if(ex) ex.remove()
  const exT=document.getElementById("mobAttackToggle"); if(exT) exT.remove()
  const active = MOB_SLOTS.filter(s => activeMobSlots[s]); if (!active.length || !combatActive) return

  const container = document.createElement("div"); container.id = "mobAttackPanel"
  container.style.cssText = "position:fixed;top:calc(96px + 38vh - 132px);right:22px;width:320px;display:flex;flex-direction:column;gap:10px;z-index:9999999;max-height:48vh;overflow-y:auto;padding:4px;"

  // Grab & drop pour le MJ
  if (isGM) {
    let pointer=null,ox=0,oy=0
    container.style.cursor="grab"
    container.addEventListener("pointerdown",e=>{
      if(e.button!==0||e.pointerType==="touch"||e.target.closest("button,input,select,textarea,[role=button]")||e.target.closest("[onclick]"))return
      pointer=e.pointerId;const rect=container.getBoundingClientRect();ox=e.clientX-rect.left;oy=e.clientY-rect.top
      container.setPointerCapture?.(pointer);container.style.cursor="grabbing";e.preventDefault()
    })
    container.addEventListener("pointermove",e=>{
      if(pointer!==e.pointerId)return
      container.style.left=Math.max(0,Math.min(window.innerWidth-container.offsetWidth,e.clientX-ox))+"px"
      container.style.top=Math.max(0,Math.min(window.innerHeight-container.offsetHeight,e.clientY-oy))+"px"
      container.style.bottom="auto";container.style.right="auto"
    })
    const stop=e=>{if(pointer!==e.pointerId)return;pointer=null;container.style.cursor="grab"}
    for(const event of ["pointerup","pointercancel","lostpointercapture"])container.addEventListener(event,stop)
  }

  document.body.appendChild(container)
  active.forEach(slot => { db.ref("combat/"+slot).once("value", snap => { if(!container.isConnected||document.getElementById("mobAttackPanel")!==container)return;const md=snap.val(); if(md) container.appendChild(buildMobSubPanel(md,slot)) }) })
}

function buildMobSubPanel(mobData, slot) {
  const panel = document.createElement("div"); panel.dataset.slot=slot; panel.style.cssText = "background:url('images/mobpanel.png') center/100% 100% no-repeat;padding:12px;filter:drop-shadow(0 12px 18px rgba(0,0,0,0.22));"
  const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
  const titleWrap = document.createElement("div"); titleWrap.style.cssText = "display:flex;align-items:center;gap:8px;min-width:0;"
  const portrait = document.createElement("img"); portrait.src = "images/" + sanitizeAssetName((mobData.name || "gobelins") + ".png"); portrait.style.cssText = "width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45));"; portrait.onerror = () => portrait.style.display = "none"; titleWrap.appendChild(portrait)
  const tEl = document.createElement("div"); tEl.style.cssText = "font-family:Cinzel,serif;font-size:12px;color:#ffb6a0;font-weight:bold;letter-spacing:1px;"; tEl.innerText = heroDisplayName(mobData.name||"MOB").toUpperCase()+"  Niv."+(mobData.lvl||1); if(mobData.balanceClass==="world")tEl.innerText+=" · World boss · 2 actions"+(mobData.hp<=mobData.maxHP*.5?" · Furie +15 %":""); if(mobData.chargingSpecial)tEl.innerText+=" · ⚠ "+mobData.chargingSpecial.name+" dès le round "+mobData.chargingSpecial.readyRound; titleWrap.appendChild(tEl); header.appendChild(titleWrap)

  if(isJormungandr(mobData)){const note=document.createElement("div");note.textContent="Invulnérable";note.style.cssText="color:#9bd8ff;font:12px Georgia";titleWrap.appendChild(note)}
  if (isGM) {
    const cBtn = document.createElement("button"); cBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(40,40,80,0.5);color:#8888ff;border:1px solid rgba(80,80,180,0.4);border-radius:3px;cursor:pointer;"; cBtn.innerText = "—"
    cBtn.onclick=()=>{ const p=panel.closest("#mobAttackPanel"); if(p) p.style.display="none"; const tg=document.getElementById("mobAttackToggle"); if(tg) tg.style.display="block" }; header.appendChild(cBtn)
    const xBtn = document.createElement("button"); xBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(120,0,0,0.5);color:#ff8888;border:1px solid rgba(180,0,0,0.4);border-radius:3px;cursor:pointer;"; xBtn.innerText = "✕"; xBtn.onclick=()=>removeMobSlot(slot); if(!isJormungandr(mobData))header.appendChild(xBtn)
  }
  panel.appendChild(header)

  const pct = Math.max(0,Math.min(100,((mobData.hp||0)/(mobData.maxHP||1))*100))
  const hpWrap = document.createElement("div"); hpWrap.style.cssText = "width:100%;height:6px;background:rgba(80,0,0,0.5);border-radius:3px;margin-bottom:8px;"
  const hpFill = document.createElement("div"); hpFill.id = "subPanelHPFill_"+slot; hpFill.style.cssText = `width:${pct}%;height:100%;background:${pct>50?"#44ff44":pct>25?"#ffaa00":"#ff3333"};border-radius:3px;transition:width 0.3s;`; hpWrap.appendChild(hpFill); panel.appendChild(hpWrap)

  const tier = mobData.tier||"weak", atks = typeof getMobAttacksForMob === "function" ? getMobAttacksForMob(mobData.name, tier) : (mobAttacks[tier]||mobAttacks.weak), mobLvl = mobData.lvl||1
  const getRange = (attack, lvl, mobTier) => {
    if (typeof getMobDamageRange === "function") return getMobDamageRange(attack, lvl, mobTier,mobData)
    const factor = 1 + Math.max(0, (lvl || 1) - 1) * 0.15
    return {
      min: Math.round((attack?.dmgMin || 0) * factor),
      max: Math.round((attack?.dmgMax || 0) * factor)
    }
  }
  const specialAtk = typeof getMobSpecialAttack === "function" ? getMobSpecialAttack(mobData.name, tier) : null
  const specialUsed = !!mobData.specialUsed

  if (isGM) {
    // Bouton aléatoire intelligent
    const rBtn = document.createElement("button"); rBtn.style.cssText = "width:100%;padding:5px;margin-bottom:5px;font-family:Cinzel,serif;font-size:10px;background:rgba(80,30,120,0.5);color:#cc88ff;border:1px solid rgba(120,50,200,0.5);border-radius:4px;cursor:pointer;"
    rBtn.innerText = "Aléatoire (ciblage auto)"
    rBtn.onclick = () => {
      requestEnemyCombatAction(null,mobData,panel,panel._manualTarget,slot)
    }
    bindCombatActionState(rBtn,slot,{name:"Aléatoire"},false,true)
    panel.appendChild(rBtn)

    atks.forEach(atk => {
      const isCD = atks.length > 1 && mobData.lastAttack===atk.name
      const btn = document.createElement("div")
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      btn.style.cssText = `padding:6px 8px;margin-bottom:4px;background:rgba(120,10,10,${isCD?"0.2":"0.4"});border:1px solid rgba(180,40,40,${isCD?"0.2":"0.4"});border-radius:4px;cursor:${isCD?"not-allowed":"pointer"};opacity:${isCD?"0.5":"1"};`
      const row = document.createElement("div")
      row.style.cssText = "display:flex;align-items:center;gap:6px;"
      row.appendChild(createCombatIcon(atk, mobData, "combatIcon combatIcon--small"))
      const name = document.createElement("span")
      name.style.cssText = `font-family:Cinzel,serif;font-size:10px;color:${isCD?"#666":"#ffcccc"};font-weight:bold;`
      name.innerText = atk.name + (isCD?" Recharge":"")
      const dmg = document.createElement("span")
      dmg.style.cssText = "font-size:9px;color:#ff8888;margin-left:auto;"
      dmg.innerText = min + "-" + max
      row.appendChild(name)
      row.appendChild(dmg)
      btn.appendChild(row)
      if (!isCD) {
        btn.onmouseenter=()=>btn.style.background="rgba(180,20,20,0.6)"
        btn.onmouseleave=()=>btn.style.background="rgba(120,10,10,0.4)"
        btn.onclick=()=>{
          const target = panel._manualTarget || null
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlot(atk, mobData, panel, target, slot)
        }
      }
      bindCombatActionState(btn,slot,atk,false,true)
      panel.appendChild(btn)
    })

    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sBtn = document.createElement("div")
      sBtn.style.cssText = `padding:8px 10px;margin:8px 0 4px;background:${specialUsed?"rgba(60,30,30,0.35)":"linear-gradient(135deg,rgba(120,20,20,0.88),rgba(40,0,0,0.96))"};border:1px solid ${specialUsed?"rgba(140,80,80,0.3)":"rgba(255,180,110,0.55)"};border-radius:6px;cursor:${specialUsed?"not-allowed":"pointer"};opacity:${specialUsed?"0.55":"1"};box-shadow:${specialUsed?"none":"0 0 24px rgba(255,120,60,0.18)"};`
      const sTop = document.createElement("div")
      sTop.style.cssText = "display:flex;align-items:center;gap:8px;"
      sTop.appendChild(createCombatIcon(specialAtk, mobData, "combatIcon"))
      const sName = document.createElement("span")
      sName.style.cssText = `font-family:Cinzel,serif;font-size:10px;color:${specialUsed?"#aa8888":"#ffd6a0"};font-weight:bold;letter-spacing:0.5px;`
      sName.innerText = specialAtk.name + (specialUsed ? " — UNIQUE DÉJÀ UTILISÉE" : "")
      const sDmg = document.createElement("span")
      sDmg.style.cssText = `font-size:9px;color:${specialUsed?"#9a6a6a":"#ffb37a"};margin-left:auto;`
      sDmg.innerText = sMin + "-" + sMax
      sTop.appendChild(sName)
      sTop.appendChild(sDmg)
      sBtn.appendChild(sTop)
      const sFlavor = document.createElement("div")
      sFlavor.style.cssText = `font-size:9px;color:${specialUsed?"#8a6a6a":"#ffb988"};margin-top:4px;line-height:1.35;`
      sFlavor.innerText = specialAtk.flavor || "Attaque signature à usage unique."
      sBtn.appendChild(sFlavor)
      if (!specialUsed) {
        sBtn.onmouseenter=()=>sBtn.style.filter="brightness(1.08)"
        sBtn.onmouseleave=()=>sBtn.style.filter=""
        sBtn.onclick=()=>{
          const target = specialAtk.effect === "all" ? "all" : (panel._manualTarget || null)
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlot(specialAtk, mobData, panel, target, slot)
        }
      }
      if(mobData.balanceClass==="world"&&!specialUsed){
        const charge=mobData.chargingSpecial,round=window.__combatSnapshot?.turnState?.round||1
        sName.innerText+=charge?(round<charge.readyRound?" — EN PRÉPARATION":" — PRÊTE"):" — ANNONCER"
        sFlavor.innerText+=" Annoncée un round avant son déclenchement."
        if(charge&&round<charge.readyRound){sBtn.onclick=null;sBtn.style.cursor="not-allowed";sBtn.style.opacity="0.5"}
      }
      bindCombatActionState(sBtn,slot,specialAtk,true,true)
      panel.appendChild(sBtn)
    }

    const autoTarget=document.createElement("button"); autoTarget.innerText="Ciblage automatique"; autoTarget.onclick=()=>{panel._manualTarget=null;panel._currentTarget=null}; panel.appendChild(autoTarget)
    // Sélection manuelle de cible (override)
    const targetRow = document.createElement("div"); targetRow.style.cssText = "display:flex;gap:3px;margin-top:6px;flex-wrap:wrap;border-top:1px solid rgba(180,40,40,0.2);padding-top:6px;"
    const label = document.createElement("div"); label.style.cssText = "width:100%;font-family:Cinzel,serif;font-size:9px;color:#5a3a3a;margin-bottom:3px;"; label.innerText = "Forcer la cible :"
    targetRow.appendChild(label)
    ;["greg","ju","elo","bibi"].forEach(pid => {
      const btn = document.createElement("button"); btn.dataset.target=pid; btn.style.cssText = "padding:2px 6px;font-family:Cinzel,serif;font-size:9px;border-radius:2px;cursor:pointer;border:1px solid rgba(180,40,40,0.4);background:rgba(60,10,10,0.6);color:#ffaaaa;"; btn.innerText = heroDisplayName(pid).toUpperCase()
      btn.onclick=()=>{ targetRow.querySelectorAll("button[data-target]").forEach(b=>{ b.style.background=b.dataset.target===pid?"rgba(180,40,40,0.6)":"rgba(60,10,10,0.6)" }); panel._currentTarget=pid; panel._manualTarget=pid }
      targetRow.appendChild(btn)
    })
    panel.appendChild(targetRow)
    panel.appendChild(buildMobPassTurnBlock(String(slot || "mob"), String(heroDisplayName(mobData.name || "MOB")).toUpperCase()))
  } else {
    // Vue lecture seule pour les joueurs
    atks.forEach(atk => {
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      const row = document.createElement("div"); row.style.cssText = "padding:5px 8px;margin-bottom:3px;background:rgba(60,5,5,0.5);border:1px solid rgba(120,20,20,0.3);border-radius:3px;opacity:0.85;"
      const line = document.createElement("div")
      line.style.cssText = "display:flex;align-items:center;gap:6px;"
      line.appendChild(createCombatIcon(atk, mobData, "combatIcon combatIcon--small"))
      const name = document.createElement("span")
      name.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#ffaaaa;"
      name.innerText = atk.name
      const dmg = document.createElement("span")
      dmg.style.cssText = "font-size:9px;color:#884444;margin-left:auto;"
      dmg.innerText = min + "-" + max
      line.appendChild(name)
      line.appendChild(dmg)
      row.appendChild(line)
      const desc = document.createElement("div")
      desc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#d3b8a0;"
      desc.innerText = atk.flavor || atk.effect || "Attaque ennemie."
      row.appendChild(desc)
      panel.appendChild(row)
    })
    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sRow = document.createElement("div")
      sRow.style.cssText = `padding:6px 8px;margin-top:6px;background:${specialUsed?"rgba(55,35,35,0.45)":"rgba(96,28,12,0.5)"};border:1px solid ${specialUsed?"rgba(140,80,80,0.28)":"rgba(255,180,110,0.32)"};border-radius:4px;opacity:0.92;`
      const sLine = document.createElement("div")
      sLine.style.cssText = "display:flex;align-items:center;gap:6px;"
      sLine.appendChild(createCombatIcon(specialAtk, mobData, "combatIcon combatIcon--small"))
      const sName = document.createElement("span")
      sName.style.cssText = `font-family:Cinzel,serif;font-size:10px;color:${specialUsed?"#b48b8b":"#ffd3a0"};`
      sName.innerText = specialAtk.name
      const sState = document.createElement("span")
      sState.style.cssText = `font-size:9px;color:${specialUsed?"#8e6767":"#c9855f"};margin-left:auto;`
      sState.innerText = specialUsed ? "UNIQUE" : (sMin + "-" + sMax)
      sLine.appendChild(sName)
      sLine.appendChild(sState)
      sRow.appendChild(sLine)
      const sDesc = document.createElement("div")
      sDesc.style.cssText = `margin-top:4px;font-size:9px;line-height:1.35;color:${specialUsed?"#b79f96":"#e2c6a2"};`
      sDesc.innerText = specialAtk.flavor || specialAtk.effect || "Attaque signature à usage unique."
      sRow.appendChild(sDesc)
      panel.appendChild(sRow)
    }
    const passRow = document.createElement("div")
    passRow.style.cssText = "padding:6px 8px;margin-top:8px;background:rgba(24,16,16,0.28);border:1px solid rgba(190,140,90,0.16);border-radius:6px;opacity:0.82;"
    const passTitle = document.createElement("div")
    passTitle.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#d8c0a0;"
    passTitle.innerText = "Passer le tour"
    const passDesc = document.createElement("div")
    passDesc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#bba28d;"
    passDesc.innerText = String(heroDisplayName(mobData.name || "MOB")).toUpperCase() + " peut aussi choisir de ne pas agir."
    passRow.appendChild(passTitle)
    passRow.appendChild(passDesc)
    panel.appendChild(passRow)
  }

  return panel
}


function launchMobAttackFromSlot(attack, mobData, panel, forcedTarget, slot) { return requestEnemyCombatAction(attack,mobData,panel,forcedTarget,slot) }

function addMobToFight(mobId, forceTier) { return addReliableCombatMob(mobId, forceTier) }

function removeMobSlot(slot) { return removeReliableCombatMob(slot) }

function spawnExtraMobToken(mobData, slot) {
  const container=document.getElementById("combatTokens"); if(!container){ if(!mobData._retryCount) mobData._retryCount=0; if(++mobData._retryCount<10) setTimeout(()=>spawnExtraMobToken(mobData,slot),300); return }
  const existing=document.getElementById("mobToken_"+slot)
  if(existing){ if(existing._slotRef&&existing._slotRefCb) existing._slotRef.off("value",existing._slotRefCb); existing.remove() }
  const tok=document.createElement("div"); tok.id="mobToken_"+slot; tok.className="token"
  const idx=slot==="mob2"?1:2, startX=Math.round((window.innerWidth-4*110)/2)
  tok.style.cssText=`position:absolute;width:70px;height:70px;left:${startX+(idx+4)*90}px;top:${Math.round(window.innerHeight*0.25)}px;z-index:200;display:flex;flex-direction:column;align-items:center;cursor:pointer;`
  const img=document.createElement("img"); img.style.cssText="width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid #cc2200;box-shadow:0 0 10px rgba(200,0,0,0.5);"; img.src="images/"+mobData.name+".png"; img.onerror=()=>img.style.display="none"; tok.appendChild(img)
  const label=document.createElement("div"); label.style.cssText="font-family:Cinzel,serif;font-size:9px;color:#ff8888;margin-top:2px;text-align:center;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:2px;"; label.innerText=heroDisplayName(mobData.name||"MOB").toUpperCase()+" "+mobData.hp+"/"+mobData.maxHP; tok.appendChild(label)
  tok.addEventListener("mousedown",e=>{ if(!isGM) return; selected=tok; lastX=tok.offsetLeft; _state.tokenDragStart={x:e.clientX,y:e.clientY}; _state.tokenDragging=false; tok._fbSlot=slot; e.preventDefault() })
  container.appendChild(tok)
}

/* ========================= */
/* PNJ                       */
/* ========================= */

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

const PNJ_NAMES = {
  "tavernier.png":         "Bjorn le Tavernier",
  "serveuse.png":          "Astrid",
  "marchand.png":          "Egil le Marchand",
  "voyantepnj.png":        "Sigrún la Voyante",
  "soulard.png":           "Gunnar l'Ivrogne",
  "garde.png":             "Halvard",
  "forgeron.png":          "Ulfrik le Forgeron",
  "child baldur.png":      "Leif",
  "forgeron1.png":         "Thormund",
  "garde baldur.png":      "Sigmar",
  "marchand2.png":         "Ragnhild la Marchande",
  "gardedunord.png":       "Ivar du Nord",
  "garde2.png":            "Ketill",
  "conseillerroinord.png": "Conseiller Hákon",
  "pretre.png":            "Frère Osvald",
  "pnj1.png":              "Un passant",
  "pnj2.png":              "Une villageoise",
  "femmepnj.png":          "Solveig",
  "femmepnj1.png":         "Ingrid",
  "femmepnj2.png":         "Brynja",
  "femmepnj3.png":         "Runa",
  "oldmessager.png":       "Orm le Vieux Messager",
  "capitaine.png":         "Capitaine Tobias",
  "serveusebrume.png":     "Lana",
  "aubergistebrume.png":   "Aubergiste Etchebest",
  "soulard1.png":          "Ren le bon",
  "pirat.png":             "Capitaine Quince",
  "mysterefemme.png":      "Femme mysterieuse",
  "mysterefemme1.png":     "Glinda",
  "heimdall.png":          "Heimdall",
  "witch.png":             "Witch",
  "ELO PION.png":          "ELO PION",
  "ju pion.png":           "Pika",
  "greg pion.png":         "GREG PION",
}

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
    clearTimeout(snd._pnjFadeDelay);clearInterval(snd._pnjFadeInterval)
    setManagedAudioBaseVolume(snd,1)
    snd.currentTime = 0
    snd.play().catch(() => {})
    snd._pnjFadeDelay=setTimeout(() => {
      snd._pnjFadeInterval=setInterval(() => {
        if (snd.__baseVolume > 0.05) setManagedAudioBaseVolume(snd,Math.max(0,snd.__baseVolume-0.05))
        else { snd.pause(); setManagedAudioBaseVolume(snd,1); clearInterval(snd._pnjFadeInterval) }
      }, 100)
    }, 2000)
  }
}

function hideStoryImage() {
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

async function toggleCurse(level) {
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!isGM && targetId !== (myToken && myToken.id)) return
  if (!targetId || targetId === "bibi") return
  if(!Number.isInteger(level)||level<0||level>8)return
  const generation=window.__sheetViewGeneration
  try{await persistCharacterEdits(targetId,{curse:level})}catch(error){showNotification("Malédiction non confirmée : "+error.message);return}
  if(generation!==window.__sheetViewGeneration||(currentSheetPlayer||myToken?.id)!==targetId)return
  const previousLevel = curseLevel
  if (level === 8) addMJLog("☠ Malédiction complète !")
  curseLevel = level
  document.querySelectorAll(".curseGem").forEach((g, i) => g.classList.toggle("active", i < level))
  const targetToken = document.getElementById(targetId)
  if (level === 8) {
    flashRed()
    screenShakeHard()
    showNotification("La malédiction est complète !")
    if (targetToken) {
      targetToken.classList.add("cursed")
      startBloodEffect(targetToken)
    }
    if (previousLevel < 8) {
      window.__curseWheelTriggeredFor = String(targetId).toLowerCase()
      showCurseIntro(targetId)

    }
  }
  if (level < 8 && targetToken) {
    targetToken.classList.remove("cursed")
    stopBloodEffect(targetToken)
  }
  if (level < 8 && window.__curseWheelTriggeredFor === String(targetId).toLowerCase()) {
    window.__curseWheelTriggeredFor = null
  }
}

function saveCurse() {
  if((currentSheetPlayer || myToken?.id)==="bibi")return
  if (!canAccessCharacter(currentSheetPlayer || myToken?.id)) return
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!targetId) return
  return persistCharacterEdits(targetId,{curse:curseLevel}).catch(error=>showNotification("Malédiction non confirmée : "+error.message))
}
async function setCorruption(level) {
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!isGM && targetId !== (myToken && myToken.id)) return
  if (!targetId) return
  if(targetId === "bibi")return
  if(!Number.isInteger(level)||level<0||level>10)return
  const generation=window.__sheetViewGeneration
  try{await persistCharacterEdits(targetId,{corruption:level})}catch(error){showNotification("Don non confirmé : "+error.message);return}
  if(generation!==window.__sheetViewGeneration||(currentSheetPlayer||myToken?.id)!==targetId)return
  corruptionLevel = level
  document.querySelectorAll(".corruptionPoint").forEach((b, i) => b.classList.toggle("active", i < level))
  const targetToken = document.getElementById(targetId)
  if (level === 10) {
    addMJLog("✨ Pouvoir activé pour " + targetId)
    flashGold()
    screenShake()
    powerExplosion()
    showNotification("Pouvoir disponible !")
    if (targetToken) targetToken.classList.add("powerReady")
    activatePowerMode(targetId)
  }
  if (level < 10 && targetToken) targetToken.classList.remove("powerReady", "powerFull")
}

function saveCorruption() {
  if((currentSheetPlayer || myToken?.id)==="bibi")return
  if (!canAccessCharacter(currentSheetPlayer || myToken?.id)) return
  const targetId = currentSheetPlayer || (myToken && myToken.id)
  if (!targetId) return
  return persistCharacterEdits(targetId,{corruption:corruptionLevel}).catch(error=>showNotification("Don non confirmé : "+error.message))
}


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


function showUsePowerBtn(playerID) { const ex=document.getElementById("usePowerBtn"); if(ex) ex.remove(); const btn=document.createElement("button"); btn.id="usePowerBtn"; btn.dataset.playerId=playerID; btn.innerText=playerID==="ju"?"APPÉTIT ABYSSAL":"LIBERER LE POUVOIR"; btn.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:14px 40px;font-family:Cinzel;font-size:20px;letter-spacing:2px;background:linear-gradient(180deg,#8a6000,#4a3000);color:gold;border:2px solid gold;border-radius:10px;cursor:pointer;z-index:999999999;box-shadow:0 0 20px gold,0 0 40px orange;animation:powerBtnPulse 1s ease-in-out infinite alternate;text-shadow:0 0 10px gold;"; btn.onclick=()=>usePower(playerID); document.body.appendChild(btn) }


/* ========================= */
/* ÉLÉMENTS MAP              */
/* ========================= */

function cleanupMapElementDragHandlers(id) {
  if (!window.__mapElementDragHandlers || !window.__mapElementDragHandlers[id]) return
  const handlers = window.__mapElementDragHandlers[id]
  document.removeEventListener("mousemove", handlers.onMove)
  document.removeEventListener("mouseup", handlers.onUp)
  delete window.__mapElementDragHandlers[id]
}

function clearAllElements() { db.ref("elements").remove() }
function renderMapElement(data) {
  cleanupMapElementDragHandlers(data.id)
  const ex=document.getElementById("elem_"+data.id); if(ex) ex.remove(); if(!document.getElementById("map")) return
  const safeImage = sanitizeAssetName(data.image)
  const el=document.createElement("div"); el.id="elem_"+data.id; el.style.cssText=`position:absolute;left:${data.x}px;top:${data.y}px;width:90px;height:90px;cursor:${isGM?"grab":data.clickable?"pointer":"default"};z-index:5000;user-select:none;transition:opacity 0.4s;opacity:0;`
  if(data.isRune){ const rs=document.createElement("div"); rs.style.cssText="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;color:#c8a050;text-shadow:0 0 15px gold;background:rgba(30,15,5,0.85);border:2px solid rgba(200,160,80,0.6);border-radius:50%;animation:tokenRingPulse 2s ease-in-out infinite;pointer-events:none;"; rs.innerText="ᚱ"; el.appendChild(rs) }
  else{ const img=document.createElement("img"); img.src="images/"+safeImage; img.style.cssText="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8));pointer-events:none;"; el.appendChild(img) }
  if(isGM){ const rb=document.createElement("div"); rb.style.cssText="position:absolute;top:-8px;right:-8px;width:20px;height:20px;background:#cc0000;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 0 6px black;z-index:10;"; rb.innerText="✕"; rb.onclick=e=>{ e.stopPropagation(); cleanupMapElementDragHandlers(data.id); db.ref("elements/"+data.id).remove() }; el.appendChild(rb) }
  if(data.clickable){ el.onclick=()=>{ if(data.isRune&&data.runeHint){ requestMapRuneHint(data.id) } else if(!isGM){ const ov=document.createElement("div"); ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999999;cursor:pointer;"; const bi=document.createElement("img"); bi.src="images/"+safeImage; bi.style.cssText="max-width:80vw;max-height:80vh;object-fit:contain;"; ov.appendChild(bi); ov.onclick=()=>ov.remove(); document.body.appendChild(ov) } } }
  if(isGM){ let dg=false,ox=0,oy=0; const onMove=e=>{ if(!dg) return; data.x=e.clientX-ox; data.y=e.clientY-oy; el.style.left=data.x+"px"; el.style.top=data.y+"px" }; const onUp=()=>{ if(!dg) return; dg=false; el.style.cursor="grab"; db.ref("elements/"+data.id+"/x").set(data.x); db.ref("elements/"+data.id+"/y").set(data.y) }; el.addEventListener("mousedown",e=>{ if(e.target===el.querySelector("div")) return; dg=true; ox=e.clientX-data.x; oy=e.clientY-data.y; el.style.cursor="grabbing"; e.stopPropagation() }); if(!window.__mapElementDragHandlers) window.__mapElementDragHandlers={}; window.__mapElementDragHandlers[data.id]={ onMove, onUp }; document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp) }
  document.body.appendChild(el); setTimeout(()=>el.style.opacity="1",20)
}


/* ========================= */
/* SAUVEGARDE UI             */
/* ========================= */

async function showSaveMenu() {
  if (!isGM || window.__authRole !== "gm") return
  document.getElementById("savePanel")?.remove()
  const panel = document.createElement("div"); panel.id = "savePanel"
  panel.style.cssText = "position:fixed;inset:12% auto auto 50%;transform:translateX(-50%);max-height:75vh;overflow:auto;z-index:2000000000;background:#15110d;border:2px solid gold;border-radius:12px;padding:24px;color:#f5e6c8;width:min(520px,90vw);font:15px Georgia,serif;"
  document.body.appendChild(panel)
  const closeSaveWindow=()=>{panel.remove();window.GameWindows?.closed(panel)}
  window.GameWindows?.register(panel,closeSaveWindow)
  const title = document.createElement("h2"); title.textContent = "Sauvegardes"; panel.appendChild(title)
  const list = document.createElement("div"); list.textContent = "Chargement…"; panel.appendChild(list)
  const button = (label, action) => { const b = document.createElement("button"); b.textContent = label; b.onclick = action; b.style.margin = "6px"; return b }
  panel.appendChild(button("Sauvegarder maintenant", () => { closeSaveWindow(); saveGame() }))
  panel.appendChild(button("Charger la plus récente", loadGame))
  panel.appendChild(button("Importer un fichier", chooseSaveFile))
  const fileHelp=document.createElement("p");fileHelp.textContent="Exportez une sauvegarde pour garder une copie sur votre ordinateur. Un import est vérifié et ne charge pas la partie automatiquement. Les fichiers d’essai et de campagne restent séparés.";panel.appendChild(fileHelp)
  panel.appendChild(button("Fermer", closeSaveWindow))
  try {
    const { entries, local } = await listGameSaves()
    if (!panel.isConnected || window.__authRole !== "gm") return
    list.replaceChildren()
    if (local) { const info = document.createElement("p"); info.textContent = "Serveur indisponible : copies locales uniquement."; list.appendChild(info) }
    if (!entries.length) list.textContent = "Aucune sauvegarde"
    entries.forEach(([id, save]) => {
      const row = document.createElement("div"); row.style.cssText = "padding:10px 0;border-bottom:1px solid #5d5038"
      const label = document.createElement("div"); label.textContent = (save._saveName || id) + " — " + (save._saveDate || "Date inconnue"); row.appendChild(label)
      row.appendChild(button("Charger", () => loadSave(id)))
      row.appendChild(button("Exporter un fichier", () => exportSaveFile(id)))
      row.appendChild(button("Supprimer", () => deleteSave(id)))
      list.appendChild(row)
    })
  } catch (error) { list.textContent = "Impossible de lire les sauvegardes : " + error.message }
}

function startSpellAura() { if(document.getElementById("spellAura")) return; const a=document.createElement("div"); a.id="spellAura"; a.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5000;opacity:0;transition:opacity 2s ease;"; const v=document.createElement("div"); v.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(150,0,255,0.5);animation:spellPulse 2s ease-in-out infinite alternate;"; a.appendChild(v); document.body.appendChild(a); setTimeout(()=>a.style.opacity="1",50) }
function stopSpellAura() { const a=document.getElementById("spellAura"); if(!a) return; a.style.transition="opacity 1.5s ease"; a.style.opacity="0"; setTimeout(()=>{ if(a.parentNode) a.remove() },1500) }

async function triggerCemeteryEvent(){
 if(!isGM||combatActive||combatStarting)return
 try{requireExplorationConnection();await transactCombatRoot(current=>{
 if(current?.game?.completedEvents?.cemetery||current?.game?.cemeterySpell?.active)return undefined
 const root=combatClone(current);root.game ||= {};root.game.cemeterySpell={active:true,time:Date.now(),glipheShown:false};return root
 })}catch(error){showNotification(error.message)}
}

function renderSpellDiceGame(data) {
  const ex=document.getElementById("spellMiniGame"); if(ex) ex.remove()
  const tries=data.tries||{}, freed=data.freed_players||[], turnIdx=data.turnIdx||0
  let realCur=SPELL_PLAYERS.filter(p=>!freed.includes(p))[0]||SPELL_PLAYERS[0]
  for(let i=0;i<SPELL_PLAYERS.length;i++){ const p=SPELL_PLAYERS[(turnIdx+i)%SPELL_PLAYERS.length]; if(!freed.includes(p)&&(tries[p]||0)<SPELL_MAX_TRIES){ realCur=p; break } }
  const ov=document.createElement("div"); ov.id="spellMiniGame"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.8s ease;overflow:hidden;background:rgba(10,0,18,0.92);"
  const ttl=document.createElement("div"); ttl.style.cssText="position:relative;z-index:1;font-family:'Cinzel Decorative',serif;font-size:22px;color:#dd66ff;letter-spacing:5px;text-shadow:0 0 30px #aa00ff;text-align:center;margin-bottom:8px;"; ttl.innerText="⛧  SORT D'EMPRISONNEMENT  ⛧"; ov.appendChild(ttl)
  const sub=document.createElement("div"); sub.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;margin-bottom:28px;text-align:center;"; sub.innerText="Lancez un D20 — seul un coup critique peut briser les chaînes..."; ov.appendChild(sub)
  const sr=document.createElement("div"); sr.style.cssText="position:relative;z-index:1;display:flex;gap:20px;margin-bottom:28px;flex-wrap:wrap;justify-content:center;"
  SPELL_PLAYERS.forEach(pid=>{ const t=tries[pid]||0,iF=freed.includes(pid),isOut=t>=SPELL_MAX_TRIES&&!iF,isCur=pid===realCur&&!iF; const card=document.createElement("div"); card.style.cssText=`display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 20px;border-radius:10px;border:2px solid ${iF?"#44ff44":isOut?"#ff4444":isCur?"#cc44ff":"rgba(150,0,255,0.4)"};background:${isCur?"rgba(120,0,180,0.3)":"rgba(0,0,0,0.3)"};min-width:100px;text-align:center;`; const n=document.createElement("div"); n.style.cssText=`font-family:Cinzel,serif;font-size:13px;letter-spacing:2px;color:${iF?"#44ff44":isOut?"#ff6666":isCur?"#dd88ff":"#9955cc"};`; n.innerText=(iF?"✓ ":isOut?"✕ ":isCur?"▶ ":"")+heroDisplayName(pid).toUpperCase(); card.appendChild(n); const dr=document.createElement("div"); dr.style.cssText="display:flex;gap:4px;"; for(let i=0;i<SPELL_MAX_TRIES;i++){ const d=document.createElement("div"); d.style.cssText="width:12px;height:12px;border-radius:2px;border:1px solid rgba(150,0,255,0.5);background:"+(i<t?(iF?"#44ff44":"rgba(180,0,80,0.6)"):"transparent")+";"; dr.appendChild(d) }; card.appendChild(dr); sr.appendChild(card) })
  ov.appendChild(sr)
  if(myToken&&myToken.id===realCur&&!freed.includes(myToken.id)){ const t=tries[myToken.id]||0; if(t<SPELL_MAX_TRIES){ const rb=document.createElement("div"); rb.id="spellRollBtn"; rb.style.cssText="position:relative;z-index:1;width:120px;height:120px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,rgba(180,0,255,0.6),rgba(80,0,150,0.3));border:3px solid rgba(200,50,255,0.8);box-shadow:0 0 30px rgba(180,0,255,0.5);cursor:pointer;margin-bottom:16px;animation:bifrostPulse 2s ease-in-out infinite alternate;"; rb.innerHTML=`<span style="font-size:36px;">🎲</span><span style="font-family:Cinzel,serif;font-size:11px;color:#cc88ff;letter-spacing:2px;margin-top:4px;">LANCER D20</span>`; rb.onclick=()=>rollSpellDice(myToken.id,t); ov.appendChild(rb); const h=document.createElement("div"); h.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:11px;color:#7733aa;font-style:italic;"; h.innerText=`Essai ${t+1} / ${SPELL_MAX_TRIES}`; ov.appendChild(h) } else { const out=document.createElement("div"); out.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:14px;color:#ff6666;text-shadow:0 0 10px red;"; out.innerText="✕ Vos essais sont épuisés..."; ov.appendChild(out) } }
  else if(myToken&&!freed.includes(myToken.id)){ const w=document.createElement("div"); w.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;"; w.innerText=`✦ Au tour de ${heroDisplayName(realCur).toUpperCase()} de briser son sort... ✦`; ov.appendChild(w) }
  else if(myToken&&freed.includes(myToken.id)){ const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:15px;color:#44ff44;text-shadow:0 0 10px lime;"; d.innerText="✓ Vous êtes libéré — attendez les autres..."; ov.appendChild(d) }
  if(isGM){ const gr=document.createElement("div"); gr.style.cssText="position:relative;z-index:1;display:flex;gap:8px;margin-top:16px;"; const lb=document.createElement("button"); lb.innerText="🔓 Libérer"; lb.style.cssText="padding:8px 18px;font-family:Cinzel,serif;font-size:12px;background:rgba(20,80,20,0.5);color:#88ff88;border:1px solid rgba(50,180,50,0.5);border-radius:4px;cursor:pointer;"; lb.onclick=finishCemeteryByGM; gr.appendChild(lb); ov.appendChild(gr) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",50)
}

function rollSpellDice(playerId) {
  const spell=window.__cemeterySpellData
  if(!spell || (!isGM && myToken?.id!==playerId))return
  return requestExplorationAction("spell",playerId,{eventTime:spell.time,revision:spell.revision||0})
}

function showSpellRollResult(roll, isCrit, isFail, playerId, cb) {
  const res=document.createElement("div"); res.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;font-family:'Cinzel Decorative',serif;"
  const color=isCrit?"#44ff44":isFail?"#ff4444":"#cc88ff"
  res.innerHTML=`<div style="font-size:48px;margin-bottom:8px;">${roll}</div><div style="font-size:24px;color:${color};text-shadow:0 0 20px ${color};letter-spacing:3px;">${isCrit?"⚡ CRITIQUE ! ⚡":isFail?"💀 ÉCHEC CRITIQUE":`D20 : ${roll}`}</div><div style="font-size:14px;color:${color};opacity:0.8;margin-top:6px;font-family:Cinzel,serif;">${isCrit?"Sort brisé !":isFail?"-10 HP":"Pas assez..."}</div>`
  document.body.appendChild(res); if(isCrit){ flashGold(); flashGold(); screenShake() }; if(isFail) screenShakeHard()
  setTimeout(()=>{ res.style.transition="opacity 0.8s"; res.style.opacity="0"; setTimeout(()=>{ res.remove(); if(cb) cb() },800) },2500)
}

function showSpellFreed() {
  stopSpellAura(); stopSpecialMusic('sortPrisonMusic')
  setTimeout(()=>{ if(currentMap&&mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap]) },1000)
  playSound("powerSound",0.8); flashGold(); flashGold(); screenShakeHard(); powerExplosion()
  const msg=document.createElement("div"); msg.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative',serif;font-size:36px;color:#cc88ff;text-shadow:0 0 30px purple;text-align:center;z-index:99999999;pointer-events:none;"
  const msgTitle = document.createElement("div")
  msgTitle.innerText = "⚡ SORT BRISÉ ⚡"
  const msgSub = document.createElement("span")
  msgSub.style.cssText = "font-size:18px;color:#aa66ff;"
  msgSub.innerText = "Les héros sont libérés !"
  msg.appendChild(msgTitle)
  msg.appendChild(msgSub)
  document.body.appendChild(msg)
  setTimeout(()=>{ msg.style.transition="opacity 1s"; msg.style.opacity="0"; setTimeout(()=>msg.remove(),1000) },4000)
}

/* ========================= */
/* AIDE RACCOURCIS MJ        */
/* ========================= */

function toggleGMShortcutHelp() {
  const existing = document.getElementById("gmShortcutHelp")
  if (existing) { if(existing.__closeHelp)existing.__closeHelp();else existing.remove(); return }

  const overlay = document.createElement("div")
  overlay.id = "gmShortcutHelp"
  overlay.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(8,20,24,0.97);
    border:1px solid #1e5a66;
    box-shadow:0 0 0 1px #8a6520,0 0 30px rgba(0,0,0,0.9);
    border-radius:3px;padding:16px 20px;
    font-family:Cinzel,serif;
    z-index:999999999;pointer-events:auto;
    display:flex;flex-direction:column;gap:6px;
    width:min(420px,calc(100vw - 32px));box-sizing:border-box;
    max-height:calc(100dvh - 130px);overflow-y:auto;
    animation:shortcutFadeIn 0.15s ease;
  `

  const title = document.createElement("div")
  title.style.cssText = "font-size:10px;letter-spacing:3px;color:#1e8a9a;margin-bottom:8px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:6px;"
  title.innerText = isGM ? "RACCOURCIS MJ" : "RACCOURCIS JOUEUR"
  overlay.appendChild(title)

  const shortcuts = [
    ...(isGM ? [
    { key:"M",   label:"Maps" },
    { key:"P",   label:"Personnages" },
    { key:"R",   label:"PNJ / High PNJ" },
    { key:"T",   label:"Mobs / PNJ Combat" },
    { key:"X",   label:"XP" },
    { key:"E",   label:"Éléments" },
    { key:"S",   label:"Sauvegarder" },
    { key:"A",   label:"Alliés (en combat)" },
    ] : []),
    { key:"I / J", label:isGM ? "Fiche / inventaire du personnage sélectionné" : "Ma fiche / mon inventaire" },
    ...(canAccessCharacter("bibi") ? [{ key:"B", label:"Fiche / inventaire de Bibi" }] : []),
    { key:"Esc", label:"Fermer / Retour" },
    { key:"?",   label:"Cette aide" },
  ]

  shortcuts.forEach(({ key, label }) => {
    const row = document.createElement("div")
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:24px;"
    const labelEl = document.createElement("span")
    labelEl.style.cssText = "font-size:12px;color:#a0c8d0;"
    labelEl.innerText = label
    const keyEl = document.createElement("span")
    keyEl.style.cssText = "background:rgba(15,42,48,0.9);border:1px solid #2e6a78;border-radius:3px;font-size:11px;color:#5a9aaa;padding:2px 8px;min-width:28px;text-align:center;"
    keyEl.innerText = key
    row.appendChild(labelEl)
    row.appendChild(keyEl)
    overlay.appendChild(row)
  })

  const inventoryHelp = document.createElement("section")
  inventoryHelp.setAttribute("aria-label", "Aide inventaire")
  inventoryHelp.style.cssText = "border-top:1px solid rgba(30,90,102,0.5);margin-top:8px;padding-top:10px;color:#c9dce0;font-family:Georgia,serif;font-size:14px;line-height:1.5;"
  const heading = document.createElement("strong")
  heading.textContent = "Inventaire — capacité : 100"
  inventoryHelp.appendChild(heading)
  for (const text of [
    "Ouvre ta fiche avec I ou J. Le formulaire Objet · Quantité · Poids unitaire ajoute une ligne avec le bouton Ajouter ou la touche Entrée.",
    "Le bouton Ajouter une caractéristique affiche cinq boutons : Force, Charme, Perspicacité, Chance et Défense. Clique sur la caractéristique souhaitée, puis indique le nombre de points. Répète pour plusieurs bonus : ils s’ajoutent à ta fiche et restent fixes quand tu montes de niveau. Ils sont comptés une fois par ligne d’objet, quelle que soit la quantité. Retirer la ligne retire ses bonus. Actuellement, les bonus des objets présents dans cet inventaire sont actifs sans bouton Équiper.",
    "Tu peux aussi écrire un objet par ligne : Épée (3), Potion x3 (0,5), Lettre (0). Le poids entre parenthèses est celui d’un seul objet, sans unité. Exemple : 3 potions de 0,5 comptent pour 1,5.",
    "Le total se calcule automatiquement sur 100. Au-delà, le personnage est surchargé et son déplacement manuel est bloqué. Si « Poids incomplet » apparaît, corrige les lignes signalées avant de te fier au total.",
    "Les raccourcis restent inactifs pendant que tu écris. Échap ferme la fiche ; l’inventaire reste privé."
  ]) {
    const paragraph = document.createElement("p")
    paragraph.textContent = text; paragraph.style.margin = "6px 0"
    inventoryHelp.appendChild(paragraph)
  }
  overlay.appendChild(inventoryHelp)

  // The close callback owns both the outside-click handler and its delayed installation.
  const outsideClick=ev=>{if(!overlay.contains(ev.target))closeHelp()}
  const closeHelp=()=>{clearTimeout(outsideTimer);document.removeEventListener("mousedown",outsideClick);overlay.remove();window.GameWindows?.closed(overlay)}
  const outsideTimer=setTimeout(()=>{if(overlay.isConnected)document.addEventListener("mousedown",outsideClick)},50)
  overlay.__closeHelp=closeHelp
  document.body.appendChild(overlay)
  window.GameWindows?.register(overlay,closeHelp)
}

// Injection style animation
;(function() {
  if (document.getElementById("gmShortcutStyle")) return
  const s = document.createElement("style")
  s.id = "gmShortcutStyle"
  s.textContent = `@keyframes shortcutFadeIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`
  document.head.appendChild(s)
})()


/* ========================= */
/* PNJ ALLIÉS — INVOCATION   */
/* ========================= */

function openAllyPNJPanel() {
  if(!combatActive)return openExplorationAlliesPanel()
  if (!isGM) return
  if(!combatHasWorldBoss({combat:window.__combatSnapshot})){showNotification("Les invocations sont réservées aux combats de world boss.");return}
  const existing = document.getElementById("allyPNJPanel")
  if (existing) {
    existing.remove()
    return
  }
  const panel = document.createElement("div"); panel.id = "allyPNJPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.97);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:16px;z-index:99999999;min-width:380px;max-width:92vw;max-height:82vh;overflow-y:auto;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#1e8a9a;margin-bottom:12px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;"
  const titleText = document.createElement("span")
  titleText.innerText = "⚔ INVOCATIONS"
  const titleClose = document.createElement("span")
  titleClose.style.cssText = "cursor:pointer;color:#ff8888;font-size:14px;"
  titleClose.innerText = "✕"
  titleClose.onclick = () => {
    const panelEl = document.getElementById("allyPNJPanel")
    if (panelEl) panelEl.remove()
  }
  title.appendChild(titleText)
  title.appendChild(titleClose)
  panel.appendChild(title)

  db.ref("combat/usedAllies").once("value", snap => {
    const used = snap.val() || {}
    ALLY_PNJS.forEach(pnj => {
      const block = document.createElement("div"); block.style.cssText = "margin-bottom:14px;border-bottom:1px solid rgba(30,90,102,0.15);padding-bottom:12px;"
      const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;"
      const img = document.createElement("img"); img.src = "images/"+pnj.image; img.style.cssText = `width:40px;height:40px;border-radius:50%;border:2px solid ${pnj.color};object-fit:contain;box-shadow:0 0 10px ${pnj.color}44;`; img.onerror=()=>img.style.opacity="0.3"
      const info = document.createElement("div")
      const infoName = document.createElement("div")
      infoName.style.cssText = `font-size:14px;color:${pnj.color};letter-spacing:2px;text-shadow:0 0 8px ${pnj.color}88;`
      infoName.innerText = pnj.name
      const infoRole = document.createElement("div")
      infoRole.style.cssText = "font-size:10px;color:#5a9aaa;"
      infoRole.innerText = pnj.role
      info.appendChild(infoName)
      info.appendChild(infoRole)
      header.appendChild(img); header.appendChild(info); block.appendChild(header)

      pnj.actions.forEach(action => {
        const isUsed = !!used[action.id]
        const typeColors = { damage:"#ff7777", heal:"#77ff99", malus:"#ffaa44", buff:"#88aaff" }
        const typeLabels = { damage:"ATQ", heal:"SOIN", malus:"MALUS", buff:"BUFF" }
        const btn = document.createElement("div")
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:5px;border-radius:2px;border:1px solid ${isUsed?"rgba(30,90,102,0.15)":pnj.color+"55"};background:${isUsed?"rgba(5,15,20,0.3)":`rgba(8,20,24,0.9)`};cursor:${isUsed?"not-allowed":"pointer"};opacity:${isUsed?"0.4":"1"};transition:background 0.15s;`
        const iconEl = document.createElement("span")
        iconEl.style.fontSize = "20px"
        iconEl.innerText = action.icon
        const center = document.createElement("div")
        center.style.flex = "1"
        const labelEl = document.createElement("div")
        labelEl.style.cssText = `font-size:12px;color:${isUsed?"#444":pnj.color};letter-spacing:1px;`
        labelEl.innerText = action.label
        if (action.dice) {
          const diceEl = document.createElement("span")
          diceEl.style.cssText = "color:#8888ff;font-size:10px;"
          diceEl.innerText = " (D" + action.dice + ")"
          labelEl.appendChild(diceEl)
        }
        const descEl = document.createElement("div")
        descEl.style.cssText = "font-size:10px;color:#5a7a8a;margin-top:2px;"
        descEl.innerText = action.desc
        center.appendChild(labelEl)
        center.appendChild(descEl)
        const badge = document.createElement("span")
        badge.style.cssText = `font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(30,90,102,0.2);color:${typeColors[action.type]};letter-spacing:1px;`
        badge.innerText = isUsed ? "UTILISÉ" : typeLabels[action.type]
        btn.appendChild(iconEl)
        btn.appendChild(center)
        btn.appendChild(badge)
        if (!isUsed) {
          btn.onmouseenter=()=>btn.style.background=`rgba(20,40,52,0.95)`
          btn.onmouseleave=()=>btn.style.background=`rgba(8,20,24,0.9)`
          btn.onclick=()=>triggerAllyAction(pnj, action, panel)

          const grantBtn = document.createElement("button")
          grantBtn.innerText = "Donner"
          grantBtn.style.cssText = "padding:5px 8px;font-family:Cinzel,serif;font-size:10px;background:rgba(70,20,90,0.75);color:#f0d0ff;border:1px solid rgba(180,120,255,0.45);border-radius:3px;cursor:pointer;margin-left:6px;white-space:nowrap;"
          grantBtn.onclick = e => {
            e.stopPropagation()
            grantAllyActionToPlayers(pnj, action)
          }
          btn.appendChild(grantBtn)
        }
        block.appendChild(btn)
      })
      panel.appendChild(block)
    })
    document.body.appendChild(panel)
  })
}

function triggerAllyAction(pnj, action, panel) {
  if(!combatActive){if(isGM){openAllyGrantPicker(pnj,action);return}return requestExplorationSummon(pnj,action)}
  if (!isGM && myToken && (action.type === "heal" || action.type === "buff")) {
    _executeAllyAction(pnj, action, myToken.id, panel)
    return
  }
  if (action.type === "heal" || action.type === "buff") { _allyChooseTarget(pnj, action, panel); return }
  _executeAllyAction(pnj, action, null, panel)
}

function _allyChooseTarget(pnj, action, panel) {
  const picker = document.createElement("div"); picker.id = "allyTargetPicker"
  picker.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid "+pnj.color+";border-radius:3px;padding:16px;z-index:999999999;font-family:Cinzel,serif;min-width:220px;"
  const pickerTitle = document.createElement("div")
  pickerTitle.style.cssText = `font-size:11px;color:${pnj.color};letter-spacing:2px;margin-bottom:12px;`
  pickerTitle.innerText = "CHOISIR LA CIBLE"
  picker.appendChild(pickerTitle)
  ;["greg","ju","elo","bibi"].forEach(pid => {
    const btn = document.createElement("button"); btn.style.cssText = "display:block;width:100%;padding:8px;margin-bottom:6px;font-family:Cinzel,serif;font-size:12px;background:rgba(10,30,38,0.8);color:#e0f0f4;border:1px solid rgba(30,90,102,0.5);border-radius:2px;cursor:pointer;text-align:left;"
    const img = document.createElement("img")
    img.src = "images/" + sanitizeAssetName(heroPortraitFile(pid))
    img.style.cssText = "width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:8px;"
    btn.appendChild(img)
    btn.appendChild(document.createTextNode(heroDisplayName(pid).toUpperCase()))
    btn.onclick=()=>{ picker.remove(); _executeAllyAction(pnj, action, pid, panel) }
    picker.appendChild(btn)
  })
  const cancel = document.createElement("button"); cancel.style.cssText = "display:block;width:100%;padding:6px;font-family:Cinzel,serif;font-size:11px;background:rgba(80,20,20,0.4);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;"
  cancel.innerText = "✕ Annuler"; cancel.onclick=()=>picker.remove(); picker.appendChild(cancel)
  document.body.appendChild(picker)
}

function _executeAllyAction(pnj, action, targetId, panel) { return requestAllyCombatAction(pnj,action,targetId,panel) }

function showAllyActionResult(data) { /* Les jets et effets sont désormais résolus par le MJ, une seule fois. */ }

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

function openAllyPNJViewer() {
  const existing = document.getElementById("allyViewerPanel"); if (existing) { existing.remove(); return }
  db.ref("game/playerAllyAccess").once("value", snap => {
    const access = snap.val()
    if (!access || (access.playerId&&access.playerId!==myToken?.id) || (access.combatId&&access.combatId!==window.__combatSnapshot?.id)) {
      showNotification("Aucune invocation donnée par le MJ à votre personnage")
      return
    }

    let granted = null
    ALLY_PNJS.forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
    if (!granted) {
      showNotification("Invocation introuvable")
      return
    }

    const panel = document.createElement("div"); panel.id = "allyViewerPanel"
    panel.style.cssText = "position:fixed;bottom:80px;left:84px;background:rgba(8,20,24,0.97);border:1px solid rgba(140,80,255,0.4);box-shadow:0 0 0 1px rgba(80,40,160,0.3),0 0 30px rgba(0,0,0,0.9);border-radius:3px;padding:14px;z-index:99999999;min-width:300px;max-width:88vw;max-height:75vh;overflow-y:auto;font-family:Cinzel,serif;"

    const title = document.createElement("div"); title.style.cssText = "font-size:10px;letter-spacing:3px;color:#a880ff;margin-bottom:12px;border-bottom:1px solid rgba(140,80,255,0.2);padding-bottom:6px;display:flex;justify-content:space-between;"
    const titleLeft = document.createElement("span")
    titleLeft.innerText = "✦ INVOCATION AUTORISÉE"
    const titleRight = document.createElement("span")
    titleRight.style.cssText = "cursor:pointer;color:#ff8888;"
    titleRight.innerText = "✕"
    titleRight.onclick = () => {
      const panelEl = document.getElementById("allyViewerPanel")
      if (panelEl) panelEl.remove()
    }
    title.appendChild(titleLeft)
    title.appendChild(titleRight)
    panel.appendChild(title)

    const block = document.createElement("div"); block.style.cssText = "margin-bottom:6px;border-bottom:1px solid rgba(140,80,255,0.1);padding-bottom:10px;"
    const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:6px;"
    const img = document.createElement("img"); img.src = "images/"+granted.pnj.image; img.style.cssText = `width:36px;height:36px;border-radius:50%;border:1px solid ${granted.pnj.color}66;object-fit:contain;filter:grayscale(20%);`; img.onerror=()=>img.style.opacity="0.3"
    const info = document.createElement("div")
    info.innerHTML = `<div style="font-size:13px;color:${granted.pnj.color};letter-spacing:1px;">${granted.pnj.name}</div><div style="font-size:9px;color:#4a6a7a;font-style:italic;margin-top:2px;">${granted.pnj.lore}</div>`
    header.appendChild(img); header.appendChild(info); block.appendChild(header)

    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:flex-start;gap:8px;padding:8px 8px;margin-bottom:3px;border-radius:2px;border:1px solid rgba(140,80,255,0.2);background:rgba(8,15,22,0.6);"
    const rowIcon = document.createElement("span")
    rowIcon.style.cssText = "font-size:16px;margin-top:1px;"
    rowIcon.innerText = granted.action.icon
    const rowCenter = document.createElement("div")
    rowCenter.style.flex = "1"
    const rowLabel = document.createElement("div")
    rowLabel.style.cssText = `font-size:11px;color:${granted.pnj.color};letter-spacing:1px;`
    rowLabel.innerText = granted.action.label + " "
    const rowDice = document.createElement("span")
    rowDice.style.cssText = "color:#5555aa;font-size:9px;"
    rowDice.innerText = "(D" + granted.action.dice + ")"
    rowLabel.appendChild(rowDice)
    const rowDesc = document.createElement("div")
    rowDesc.style.cssText = "font-size:10px;color:#3a5a6a;margin-top:3px;line-height:1.5;"
    rowDesc.innerText = granted.action.desc
    rowCenter.appendChild(rowLabel)
    rowCenter.appendChild(rowDesc)
    const rowBadge = document.createElement("span")
    rowBadge.style.cssText = "font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(80,40,160,0.25);color:#d8b0ff;letter-spacing:1px;"
    rowBadge.innerText = "AUTORISÉE"
    row.appendChild(rowIcon)
    row.appendChild(rowCenter)
    row.appendChild(rowBadge)
    row.style.cursor = "pointer"
    row.style.transition = "background 0.15s,border-color 0.15s,transform 0.15s"
    row.onmouseenter = () => { row.style.background = "rgba(20,30,48,0.85)"; row.style.borderColor = granted.pnj.color + "88"; row.style.transform = "translateX(-2px)" }
    row.onmouseleave = () => { row.style.background = "rgba(8,15,22,0.6)"; row.style.borderColor = "rgba(140,80,255,0.2)"; row.style.transform = "" }
    row.onclick = () => triggerAllyAction(granted.pnj, granted.action, panel)
    block.appendChild(row)
    panel.appendChild(block)
    document.body.appendChild(panel)
  })
}


/* ========================= */
/* JOURNAL MJ — RÉDUIRE      */
/* ========================= */

function toggleMJLog() {
  const content = document.getElementById("mjLogContent")
  const btn     = document.getElementById("mjLogToggle")
  const log     = document.getElementById("mjLog")
  if (!content || !btn) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}


function toggleDiceLog() {
  const content = document.getElementById("diceLogContent")
  const btn = document.getElementById("diceLogToggle")
  const log = document.getElementById("diceLog")
  if (!content || !btn || !log) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}


function grantAllyActionToPlayers(pnj, action, playerId) {
 if(!isGM)return Promise.resolve(false)
 if(!playerId){openAllyGrantPicker(pnj,action);return Promise.resolve(false)}
 return giveAllyActionToPlayer(pnj,action,playerId)
}
function openAllyGrantPicker(pnj,action){
 document.getElementById("allyGrantPicker")?.remove()
 const combatId=window.__combatSnapshot?.id
 const previous=document.activeElement,overlay=document.createElement("div"),box=document.createElement("div"),title=document.createElement("h3"),desc=document.createElement("p")
 overlay.id="allyGrantPicker";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","allyGrantTitle");box.className="allyGrantBox";title.id="allyGrantTitle";title.textContent="À qui donner « "+action.label+" » ?";desc.textContent=combatActive?"Autorisation pour ce combat, utilisable une fois par le personnage choisi. Elle remplace l’autorisation précédente.":"Autorisation hors combat : cinématique et pion uniquement. Le joueur choisira quand invoquer cet allié.";box.append(title,desc);overlay.appendChild(box)
 const close=()=>{overlay.remove();previous?.focus?.()}
 for(const id of ["greg","ju","elo"]){const button=document.createElement("button");button.type="button";button.textContent=heroDisplayName(id);button.dataset.hero=id;button.onclick=async()=>{for(const b of box.querySelectorAll("button"))b.disabled=true;try{if(await giveAllyActionToPlayer(pnj,action,id,combatId)){close();document.getElementById("allyPNJPanel")?.remove()}else close()}finally{for(const b of box.querySelectorAll("button"))b.disabled=false}};box.appendChild(button)}
 const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Annuler";cancel.onclick=close;box.appendChild(cancel)
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();close()}if(event.key==="Tab"){const buttons=[...box.querySelectorAll("button:not(:disabled)")],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}})
 document.body.appendChild(overlay);box.querySelector("button").focus()
}
async function giveAllyActionToPlayer(pnj,action,playerId,expectedCombatId=window.__combatSnapshot?.id){
 if(!expectedCombatId)return giveExplorationAllyAccess(pnj,action,playerId)
 try{
  requireActionAccess({gmOnly:true});requireExplorationConnection()
  if(!["greg","ju","elo"].includes(playerId))throw Error("Choisissez Greg, Pika ou Elo.")
  const combatId=expectedCombatId,uid=window.__authUid,revision=persistenceRevision||"initial"
  const result=await reliableRootTransaction(root=>{
   if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision||!combatId||root.combat?.id!==combatId||root.combat.phase!=="active"||!combatHasWorldBoss(root)||root.combat.usedAllies?.[action.id]||!root.characters?.[playerId]||Number(root.characters[playerId].hp)<=0)return undefined
   root.game||={};root.game.playerAllyAccess={pnjName:pnj.name,actionId:action.id,playerId,combatId,time:Date.now()};return root
  })
  if(!result.committed)throw Error("Combat terminé, pouvoir déjà utilisé ou personnage KO.")
  showNotification("✦ "+action.label+" autorisée pour "+heroDisplayName(playerId)+" pendant ce combat.");return true
 }catch(error){showNotification("Autorisation non donnée : "+error.message);return false}
}
function toggleCollapsiblePanel(contentId, buttonId, panelId) {
  const content = document.getElementById(contentId)
  const btn = document.getElementById(buttonId)
  const panel = document.getElementById(panelId)
  if (!content || !btn || !panel) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "▼" : "▲"
  panel.style.maxHeight = collapsed ? "260px" : "auto"
  btn.title = collapsed ? "Réduire" : "Déplier"
  btn.setAttribute("aria-expanded", String(collapsed))
  try { localStorage.setItem("rpg.panel." + panelId, collapsed ? "open" : "closed") } catch (_) {}
}

toggleMJLog = function () {
  toggleCollapsiblePanel("mjLogContent", "mjLogToggle", "mjLog")
}

toggleDiceLog = function () {
  toggleCollapsiblePanel("diceLogContent", "diceLogToggle", "diceLog")
}

/* ========================= */
/* ESSAIM DE MOUCHES         */
/* ========================= */

function showFlySwarmEffect() {
  if (document.getElementById("flySwarmOverlay")) return // déjà actif

  // Base overlay — bleu brillant pulsant
  const ov = document.createElement("div")
  ov.id = "flySwarmOverlay"
  ov.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999974;opacity:0;transition:opacity 2s ease;background:radial-gradient(ellipse at center,rgba(140,210,255,0.28) 0%,rgba(60,140,255,0.18) 45%,rgba(0,20,80,0.22) 100%);animation:flySwarmPulse 2s ease-in-out infinite;"
  document.body.appendChild(ov)
  setTimeout(() => { ov.style.opacity = "1" }, 30)

  // Lueur centrale (orbe Thu'um)
  const glow = document.createElement("div")
  glow.id = "flySwarmGlow"
  glow.style.cssText = "position:fixed;top:50%;left:50%;width:500px;height:500px;pointer-events:none;z-index:9999975;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,0.75) 0%,rgba(160,225,255,0.55) 18%,rgba(80,170,255,0.3) 45%,transparent 72%);animation:flySwarmCenterPulse 1.8s ease-in-out infinite;filter:blur(22px);opacity:0;transition:opacity 2s ease;"
  document.body.appendChild(glow)
  setTimeout(() => { glow.style.opacity = "1" }, 100)

  // Anneaux de vent tourbillonnants
  const rings = document.createElement("div")
  rings.id = "flySwarmRings"
  rings.style.cssText = "position:fixed;top:50%;left:50%;pointer-events:none;z-index:9999976;opacity:0;transition:opacity 2.5s ease;"
  const ringDefs = [
    [110, 5, "windSwirlCW",  1.6, 0.85, 0],
    [185, 7, "windSwirlCCW", 2.4, 0.75, 0.3],
    [270, 5, "windSwirlCW",  3.1, 0.65, 0.6],
    [360, 8, "windSwirlCCW", 4.2, 0.55, 0.1],
    [145, 3, "windSwirlCCW", 1.2, 0.9,  0.8],
    [230, 4, "windSwirlCW",  2.8, 0.6,  0.4],
    [310, 6, "windSwirlCCW", 3.6, 0.5,  0.2],
  ]
  ringDefs.forEach(([r, t, anim, dur, alpha, delay]) => {
    const arc1 = document.createElement("div")
    arc1.style.cssText = `position:absolute;top:${-r}px;left:${-r}px;width:${r*2}px;height:${r*2}px;border:${t}px solid transparent;border-top-color:rgba(120,215,255,${alpha});border-right-color:rgba(80,180,255,${alpha*0.4});border-radius:50%;filter:blur(2px);animation:${anim} ${dur}s linear infinite;animation-delay:-${delay}s;`
    rings.appendChild(arc1)
    const arc2 = document.createElement("div")
    arc2.style.cssText = `position:absolute;top:${-r+8}px;left:${-r+8}px;width:${r*2-16}px;height:${r*2-16}px;border:${Math.max(2,t-2)}px solid transparent;border-bottom-color:rgba(200,240,255,${alpha*0.7});border-left-color:rgba(150,220,255,${alpha*0.25});border-radius:50%;filter:blur(3px);animation:${anim==="windSwirlCW"?"windSwirlCCW":"windSwirlCW"} ${dur*1.35}s linear infinite;animation-delay:-${delay+0.5}s;`
    rings.appendChild(arc2)
  })
  document.body.appendChild(rings)
  setTimeout(() => { rings.style.opacity = "1" }, 200)

  // Vignette bleue brillante sur les bords
  const flash = document.createElement("div")
  flash.id = "flySwarmFlash"
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999977;background:radial-gradient(ellipse at center,transparent 38%,rgba(40,110,255,0.35) 72%,rgba(100,200,255,0.6) 100%);opacity:0;transition:opacity 2.5s ease;"
  document.body.appendChild(flash)
  setTimeout(() => { flash.style.opacity = "1" }, 350)

  // Mouches (sombres pour contraster avec le bleu brillant)
  const buzzes = ["flyBuzz1", "flyBuzz2", "flyBuzz3"]
  for (let i = 0; i < 50; i++) {
    const fly = document.createElement("img")
    fly.src = "images/mouche.png"
    fly.className = "fly-particle"
    const size = 13 + Math.random() * 16
    const x = Math.random() * 100
    const y = Math.random() * 100
    const anim = buzzes[Math.floor(Math.random() * 3)]
    const dur = (0.25 + Math.random() * 0.42).toFixed(2)
    const delay = (Math.random() * 2).toFixed(2)
    fly.style.cssText = `position:fixed;left:${x}%;top:${y}%;width:${size}px;height:${size}px;object-fit:contain;pointer-events:none;z-index:9999979;opacity:0;transition:opacity 1.5s ease;animation:${anim} ${dur}s linear infinite;animation-delay:-${delay}s;filter:brightness(0.15) contrast(3);`
    document.body.appendChild(fly)
    setTimeout(() => { fly.style.opacity = (0.65 + Math.random() * 0.35).toFixed(2) }, 100 + i * 35)
  }

  // Son
  const snd = document.getElementById("flySwarmSound")
  if (snd) {
    snd.currentTime = 0; setManagedAudioBaseVolume(snd,0); snd.play().catch(() => {})
    let v = 0
    const fade = setInterval(() => { v = Math.min(v + 0.05, 0.75); setManagedAudioBaseVolume(snd,v); if (v >= 0.75) clearInterval(fade) }, 100)
  }

}

function resetFlySwarmPresentation() {
  // 1. Mouches qui s'envolent
  document.querySelectorAll(".fly-particle").forEach(f => {
    const dx = ((Math.random() - 0.5) * 400).toFixed(0)
    const dy = (-(80 + Math.random() * 300)).toFixed(0)
    f.style.animation = "none"
    f.style.transition = "opacity 0.9s ease, transform 0.9s ease"
    f.style.transform = `translate(${dx}px, ${dy}px) scale(2.5)`
    f.style.opacity = "0"
    setTimeout(() => { if (f.parentNode) f.remove() }, 950)
  })

  // 2. pow.mp3 + message style Thu'um exact
  setTimeout(() => {
    const pow = new Audio("audio/pow.mp3")
    setManagedAudioBaseVolume(pow,.85)
    pow.play().catch(() => {})

    const screen = document.getElementById("thuumUnlockScreen")
    const image  = document.getElementById("thuumUnlockImage")
    const title  = document.getElementById("thuumUnlockTitle")
    const words  = document.getElementById("thuumUnlockWords")
    const player = document.getElementById("thuumUnlockPlayer")
    if (!screen || !title || !words) return

    if (image)  image.src   = "images/thuum.png"
    title.innerText          = "Un mot de pouvoir"
    words.innerText          = "apparaît gravé dans le sol"
    if (player) player.innerText = ""

    screen.style.display = "flex"
    requestAnimationFrame(() => screen.classList.add("active"))
    if (typeof screenShakeHard === "function") screenShakeHard()

    setTimeout(() => {
      screen.classList.remove("active")
      setTimeout(() => { screen.style.display = "none" }, 600)
    }, 6200)
  }, 500)

  // 3. Anneaux/lueur s'estompent pendant le message
  ;["flySwarmRings", "flySwarmGlow"].forEach(id => {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) { el.style.transition = "opacity 2s ease"; el.style.opacity = "0"; setTimeout(() => { if (el.parentNode) el.remove() }, 2100) }
    }, 4500)
  })

  // 4. Atmosphère bleue disparaît après le message
  ;["flySwarmOverlay", "flySwarmFlash"].forEach(id => {
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) { el.style.transition = "opacity 2.5s ease"; el.style.opacity = "0"; setTimeout(() => { if (el.parentNode) el.remove() }, 2600) }
    }, 6000)
  })

  // 5. Son qui s'estompe
  const snd = document.getElementById("flySwarmSound")
  if (snd) {
    setTimeout(() => {
      let v = snd.__baseVolume || 0
      const fade = setInterval(() => { v = Math.max(v - 0.03, 0); setManagedAudioBaseVolume(snd,v); if (v <= 0) { clearInterval(fade); snd.pause(); snd.currentTime = 0 } }, 100)
    }, 3000)
  }
}


// Local display preferences never change the shared game state.
function initializeMenuBehaviour() {
  for (const [panelId, contentId, buttonId] of [["diceLog", "diceLogContent", "diceLogToggle"], ["mjLog", "mjLogContent", "mjLogToggle"]]) {
    const panel = document.getElementById(panelId), content = document.getElementById(contentId), button = document.getElementById(buttonId)
    if (!panel || !content || !button) continue
    let preference = null
    try { preference = localStorage.getItem("rpg.panel." + panelId) } catch (_) {}
    const open = preference ? preference === "open" : content.style.display !== "none"
    content.style.display = open ? "block" : "none"
    panel.style.maxHeight = open ? "260px" : "auto"
    button.innerText = open ? "▼" : "▲"
    button.title = open ? "Réduire" : "Déplier"
    button.setAttribute("aria-expanded", String(open))
  }
  document.querySelectorAll(".gmSection").forEach(section => {
    if (section.dataset.autoCloseBound) return
    section.dataset.autoCloseBound = "true"
    section.addEventListener("click", event => {
      const button = event.target.closest("button")
      if (!button || button.disabled || !section.contains(button)) return
      const action = button.getAttribute("onclick") || ""
      // Navigation and placement settings are preparation, not final choices.
      if (button.matches(".pnjTab, .mapCategoryButton") || /^\s*(openPNJTab|toggleCategory|setPNJSlot)\s*\(/.test(action)) return
      if (!action) return
      // Run after the action, including handlers that stop event propagation.
      queueMicrotask(() => { section.style.display = "none" })
    }, true)
  })
}
initializeMenuBehaviour()

function combatActionAvailability(actor, attack, special=false, enemy=false) {
  const c=window.__combatSnapshot, players=window.__publicCharacters||{}, state=c?.turnState
  const blocked=label=>({disabled:true,label})
  if(attack?.name==="Le Bibi"&&gmParalyzed({combat:c},"bibi"))return blocked("Bibi est paralysée par le MJ")
  if(attack?.name!=="Passer le tour"&&!(actor==="greg"&&attack?.name==="Le Bibi"&&players.bibi?.hp>0)&&gmParalyzed({combat:c},actor))return blocked("Paralysé par le MJ — "+c.gmStates[actor].paralysis.turns+" tour(s)")
  if(!enemy&&c?.heroHaste&&attack?.name!=="Passer le tour"&&(attack?.name==="Le Bibi"||c.heroHaste.actor!==actor||special||getPlayerAttackTypeKey(attack)==="heal"))return blocked("SKARO’H : attaque basique du personnage uniquement")
  if(special&&(enemy?c?.[actor]?.specialUsed:c?.playerSpecials?.[actor]))return blocked("Déjà utilisée dans ce combat")
  if(attack?.pikaKind==="hypnosis"){const left=pikaRechargeLeft(c);if(left)return blocked("Recharge : "+left+" tour"+(left>1?"s":"")+" restant"+(left>1?"s":""))}
  if(enemy&&c?.[actor]?.lastAttack===attack?.name&&!special&&getMobAttacksForMob(c[actor].name,c[actor].tier).length>1)return blocked("Recharge : utilisez une autre attaque ou passez")
  if(window.__actionOnline===false)return blocked("Connexion perdue — actions suspendues")
  if(window.__sessionBusy)return blocked("Synchronisation de la partie")
  if(!c||c.phase==="finished")return blocked("Combat terminé")
  if(state?.phase==="rolling")return blocked("Jets d’initiative en cours")
  if(c.pendingResolution)return blocked("Décision du MJ en attente")
  if(state?.currentActorId!==combatOwner(actor))return blocked("En attente du tour de "+(enemy?heroDisplayName(c[actor]?.name):combatOwner(actor)==="greg"?"Greg et Bibi":heroDisplayName(combatOwner(actor))))
  if(window.__sharedVisualBusy||Date.now()<(window.__combatIntroUntil||0))return blocked("Animation en cours — patientez")
  if(enemy?window.__mobAttackResolving:window.__playerAttackResolving)return blocked("Action en cours — patientez")
  const bibiInstead=actor==="greg"&&["Le Bibi","Passer le tour"].includes(attack?.name)&&players.bibi?.hp>0
  if(!enemy&&players[actor]?.hp<=0&&!bibiInstead)return blocked("Personnage KO")
  if(enemy&&c[actor]?.hp<=0)return blocked("Adversaire KO")
  if(enemy&&special&&c[actor]?.balanceClass==="world"){
    const charge=c[actor].chargingSpecial,round=state?.round||1
    if(charge&&round<charge.readyRound)return blocked("Préparation : encore "+(charge.readyRound-round)+" round(s)")
    return {disabled:false,label:charge?"Prête à déclencher":"Disponible — annoncer la spéciale"}
  }
  if(special&&!enemy){
    const rule=attack.rule
    if(rule==="mob_below_half"||rule==="mob_below_forty"||rule==="mob_used_special"){
      const valid=livingMobs(c).some(id=>isPlayerSpecialConditionMet(actor,attack,{mob:c[id],players}))
      return valid?{disabled:false,label:"Disponible — choisissez une cible remplissant la condition"}:blocked("Condition manquante : "+attack.conditionText)
    }
    const known=window.__combatConditionCharacters||{}
    const ids=rule==="ally_below_twenty"?COMBAT_CHARACTERS.filter(id=>id!==actor):rule==="ally_below_sixty"?COMBAT_CHARACTERS:rule==="greg_below_twenty"?["greg"]:rule==="self_below_seventy"?[actor]:[]
    if(ids.length){
      const trusted=ids.filter(id=>known[id]&&canAccessCharacter(id))
      const partial=Object.fromEntries(trusted.map(id=>[id,known[id]]))
      const met=trusted.length>0&&(!["greg_below_twenty","self_below_seventy"].includes(rule)||trusted.length===ids.length)&&isPlayerSpecialConditionMet(actor,attack,{players:partial,charData:partial[actor]||{}})
      if(met)return {disabled:false,label:"Disponible — condition remplie"}
      if(trusted.length===ids.length)return blocked("Condition manquante : "+attack.conditionText)
      return {disabled:false,label:"Condition contrôlée au lancement"}
    }
  }
  if(!enemy&&getPlayerAttackTypeKey(attack)!=="heal"&&attack?.name!=="Passer le tour"){const slots=livingMobs(c);if(slots.length&&slots.every(slot=>!combatTargetEligibility(attack,actor,special,slot).allowed))return blocked("Aucune cible admissible — "+combatTargetEligibility(attack,actor,special,slots[0]).reason)}
  return {disabled:false,label:attack?.pikaKind==="cancan"?"Disponible — contact requis avec la cible":"Disponible"}
}
function bindCombatActionState(block,actor,attack,special=false,enemy=false) {
  const activate=block.onclick
  block.dataset.combatActor=actor;block.dataset.combatAttack=attack.name
  const status=document.createElement("div");status.className="combatActionState";status.setAttribute("aria-live","polite");block.appendChild(status)
  const target=document.createElement("div");target.className="combatActionTarget";block.appendChild(target)
  block.setAttribute("role","button");block.tabIndex=0
  block._refreshCombatAction=()=>{
    const value=combatActionAvailability(actor,attack,special,enemy)
    status.textContent=value.label
    target.textContent=combatActionTargetText(actor,attack,special,enemy)
    block.setAttribute("aria-disabled",String(value.disabled))
    block.classList.toggle("combatAction--unavailable",value.disabled)
    block.title=value.label
    return value
  }
  block.onclick=event=>{const value=block._refreshCombatAction();if(value.disabled){showNotification(value.label);return}return activate?.call(block,event)}
  block.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();block.click()}}
  block._refreshCombatAction()
}
function refreshCombatActionStates() {
  if(typeof renderWorldBossFlee==="function")renderWorldBossFlee(window.__combatSnapshot)
  refreshCombatHUDContext()
  if(typeof combatTargetRefresh==="function")combatTargetRefresh()
  document.querySelectorAll("[data-combat-actor]").forEach(block=>block._refreshCombatAction?.())
}


function stopCombatStatsSubscription(){if(window.__combatStatsRef&&window.__combatStatsCb)window.__combatStatsRef.off("value",window.__combatStatsCb);window.__combatStatsRef=null;window.__combatStatsCb=null}

function combatEnemyLabel(slot){const mob=window.__combatSnapshot?.[slot];return heroDisplayName(mob?.name||"Ennemi")+" · n° "+(COMBAT_MOBS.indexOf(slot)+1)}
function combatTargetEligibility(attack,actor,special,slot){
 const c=window.__combatSnapshot,mob=c?.[slot];if(!mob||mob.hp<=0)return {allowed:false,reason:"Adversaire KO"}
 if(special&&["mob_below_half","mob_below_forty","mob_used_special"].includes(attack?.rule)&&!isPlayerSpecialConditionMet(actor,attack,{mob}))return {allowed:false,reason:attack.conditionText||"Condition non remplie"}
 if(attack?.pikaKind==="cancan"||(actor==="greg"&&attack?.name==="Chat Bite (CaC)")){
  const tokens=window.__tokenPositions||{},a=tokens[actor],key=slot==="mob"?"mobToken":"mobToken_"+slot
  const positions=slot==="mob"?[tokens[key],mob,c.presentation?.positions?.[key]]:[mob,tokens[key],c.presentation?.positions?.[key]]
  const b=positions.find(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))
  if(!Number.isFinite(a?.x)||!Number.isFinite(a?.y)||!b)return {allowed:true,reason:"Contact vérifié au lancement"}
  if(Math.hypot(a.x-b.x,a.y-b.y)>180)return {allowed:false,reason:"Hors de portée — rapprochez votre pion"}
  return {allowed:true,reason:"Au contact"}
 }
 return {allowed:true,reason:""}
}
function combatActionTargetText(actor,attack,special=false,enemy=false){
 if(enemy||attack?.name==="Passer le tour")return ""
 if(getPlayerAttackTypeKey(attack)==="heal")return "Cible : choisissez un allié vivant"
 const slots=livingMobs(window.__combatSnapshot);if(!slots.length)return "Aucune cible vivante"
 if(slots.length===1){const value=combatTargetEligibility(attack,actor,special,slots[0]);return "Cible : "+combatEnemyLabel(slots[0])+(value.reason?" — "+value.reason:"")}
 const allowed=slots.filter(slot=>combatTargetEligibility(attack,actor,special,slot).allowed)
 return "Cible : à choisir — "+allowed.length+" / "+slots.length+" ennemi(s) admissible(s)"
}
function refreshCombatHUDContext(){
 const c=window.__combatSnapshot,state=c?.turnState,player=typeof getCombatHUDPlayerId==="function"?getCombatHUDPlayerId():null,hud=document.getElementById("combatHUD"),info=document.getElementById("combatHUDInfo")
 document.querySelectorAll(".combatTargetNumber").forEach(el=>{if(!combatActive||!c)el.remove()})
 if(combatActive&&c)COMBAT_MOBS.forEach((slot,i)=>{const token=document.getElementById(slot==="mob"?"mobToken":"mobToken_"+slot);if(!token||!c[slot])return;let badge=token.querySelector(".combatTargetNumber");if(!badge){badge=document.createElement("span");badge.className="combatTargetNumber";badge.setAttribute("aria-hidden","true");token.appendChild(badge)}badge.textContent=String(i+1);token.title=combatEnemyLabel(slot)+" — "+c[slot].hp+" / "+c[slot].maxHP+" PV"})
 if(!hud||!info||!player)return
 let summary=document.getElementById("combatHUDTurnSummary");if(!summary){summary=document.createElement("p");summary.id="combatHUDTurnSummary";summary.setAttribute("role","status");info.insertBefore(summary,document.getElementById("combatHUDAttacks"))}
 const current=state?.currentActorId,label=current==="greg"?"Greg et Bibi":COMBAT_MOBS.includes(current)?combatEnemyLabel(current):heroDisplayName(current||"—")
 const pill=document.querySelector("#combatHUDMeta .combatHUDMetaPill--turn");if(pill)pill.textContent="Round "+(state?.round||1)+" · "+(state?.phase==="rolling"?"Initiative":label)
 summary.textContent=window.__actionOnline===false?"Connexion perdue — actions suspendues.":!combatActive||c?.phase==="finished"?"Combat terminé — retour à la carte.":state?.phase==="rolling"?"Les jets d’initiative déterminent l’ordre des tours.":c?.pendingResolution?"Décision du MJ en attente.":window.__sharedVisualBusy||Date.now()<(window.__combatIntroUntil||0)?"Animation en cours — patientez.":window.__playerAttackResolving?(document.getElementById("combatEnemyTargetPicker")||document.getElementById("combatTargetPicker")?"Choisissez la cible dans la fenêtre.":"Action en cours — attendez la confirmation."):current===combatOwner(player)?(combatOwner(player)==="greg"?"À vous : une seule action pour Greg ou Bibi.":"À vous de jouer : choisissez une action."):"Au tour de "+label+". Vos actions sont en attente."
}
