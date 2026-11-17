/* Generated from src/source-map.json by tools/build-source.cjs. Edit the source files, then rebuild. */
"use strict"

// Menu Action : documents, alliés, cris et runes ; accès et présentation des cris.
// Les résolutions et écritures autoritaires restent dans les moteurs partagés.

function getMyThuumWords() {
  if (!myToken || !window.playerThuumData) return {}
  const exact = window.playerThuumData[myToken.id]
  if (exact) return exact

  const loose = (typeof getObjectValueLoose === "function")
    ? getObjectValueLoose(window.playerThuumData, myToken.id)
    : null
  return loose || {}
}

function getThuumDef(word) {
  return (window.THUUMS && window.THUUMS[word]) || null
}

function getUnlockedThuumWords() {
  const words = getMyThuumWords()
  return Object.keys(words).filter(word => {
    const data = words[word]
    return !!getThuumDef(word) && !!(data && data.unlocked)
  })
}

function getPrimaryThuumWord() {
  const unlocked = getUnlockedThuumWords()
  return unlocked.length ? unlocked[0] : null
}

function hasUnlockedThuum(word) {
  const words = getMyThuumWords()
  return !!(words[word] && words[word].unlocked)
}

function isThuumUsedThisCombat(word) {
  if (!myToken || !window.usedThuumData) return false
  if (window.usedThuumData[myToken.id] && window.usedThuumData[myToken.id][word]) return true

  const wanted = String(myToken.id || "").toLowerCase()
  const key = Object.keys(window.usedThuumData).find(k => String(k).toLowerCase() === wanted)
  return !!(key && window.usedThuumData[key] && window.usedThuumData[key][word])
}

function hasThuumUseAccess(word) {
  if (!myToken || !window.playerThuumAccessData) return false
  if (window.playerThuumAccessData[myToken.id] && window.playerThuumAccessData[myToken.id][word] && window.playerThuumAccessData[myToken.id][word].allowed) return true

  const wanted = String(myToken.id || "").toLowerCase()
  const key = Object.keys(window.playerThuumAccessData).find(k => String(k).toLowerCase() === wanted)
  return !!(key && window.playerThuumAccessData[key] && window.playerThuumAccessData[key][word] && window.playerThuumAccessData[key][word].allowed)
}

function hasPlayerAllyAccess() {
 const access=window.playerAllyAccessData;if(access?.actionId==="hel_nidhogg_judgment"&&!helNidhoggAvailability(currentCombatAllyContext()).allowed)return false;if(!access||!myToken||access.playerId&&access.playerId!==myToken.id)return false
 if(access.scope==="exploration")return gameStarted&&gameState==="GAME"&&!combatActive&&!!access.grantId
 return combatActive&&combatHasWorldBoss({combat:window.__combatSnapshot})&&(!access.combatId||access.combatId===window.__combatSnapshot?.id)
}

function hasActiveRuneChallenge() {
  const data = window.activeRuneChallengeData
  return !!(data && data.active)
}

function getAvailablePlayerPowerTabs() {
  const tabs = []
  if(typeof getGrantedDocuments==="function"&&getGrantedDocuments(getLocalPlayerId()).length)tabs.push("documents")
  if (hasPlayerAllyAccess() || (typeof discoveredAllies==="function"&&discoveredAllies().length)) tabs.push("ally")
  if (getUnlockedThuumWords().length) tabs.push("thuum")
  if (hasActiveRuneChallenge()) tabs.push("runes")
  return tabs
}

function getDefaultPlayerPowerTab() {
  const tabs = getAvailablePlayerPowerTabs()
  if (!tabs.length) return ""
  if (tabs.includes("thuum")) return "thuum"
  if (tabs.includes("ally")) return "ally"
  return tabs[0]
}

function closePlayerPowersPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel) return
  panel.style.display = "none"
  panel.innerHTML = ""
  delete panel.dataset.activeTab
}

function updateThuumButton() {
  const btn = document.getElementById("playerThuumBtn")
  if (!btn) return
  const unlockedWords = getUnlockedThuumWords()
  const activeWord = getPrimaryThuumWord()
  const activeDef = activeWord ? getThuumDef(activeWord) : null
  const img = btn.querySelector("img")

  const isPlayer = !isGM && !!myToken
  if (!isPlayer || !getAvailablePlayerPowerTabs().length) {
    btn.style.display = "none"
    btn.disabled = false
    btn.dataset.word = ""
    if (img) img.removeAttribute("src")
    closePlayerPowersPanel()
    return
  }

  btn.dataset.word = activeWord || ""
  if (img) img.src = (activeDef && activeDef.buttonImage) ? activeDef.buttonImage : "images/runeskraa.png"
  btn.style.display = "block"
  btn.disabled = false
  if (activeWord) {
    btn.title = combatActive && isThuumUsedThisCombat(activeWord) ? activeWord + " déjà utilisé pour ce combat" : hasThuumUseAccess(activeWord) ? activeWord + " — utilisation autorisée par le MJ" : activeWord + " — autorisation MJ nécessaire, en combat ou hors combat"
  } else btn.title = "Action — documents, cris, invocations et runes"

  renderPlayerPowersPanel()
}

function getThuumEntryState(word) {
  if(getThuumDef(word)?.combatOnly&&!combatActive)return "Combat uniquement — autorisation MJ nécessaire"
  if (combatActive) {
    if (isThuumUsedThisCombat(word)) return "Déjà utilisé pour ce combat"
    if (!hasThuumUseAccess(word)) return "En combat : autorisation MJ requise"
    return "Autorisé par le MJ"
  }
  return hasThuumUseAccess(word) ? "Autorisé par le MJ hors combat" : "Hors combat : autorisation MJ requise"
}

function canUseThuumNow(word) {
  if (!hasUnlockedThuum(word)) return false
  if(getThuumDef(word)?.combatOnly&&!combatActive)return false
  if (combatActive) return !isThuumUsedThisCombat(word) && hasThuumUseAccess(word)
  return hasThuumUseAccess(word)
}

function renderPlayerThuumEntries(panel) {
  const unlocked = getUnlockedThuumWords()
  if (!unlocked.length) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.classList.add("playerActionEmpty")
    empty.innerText = "Aucun Thu'um appris."
    panel.appendChild(empty)
    return
  }

  unlocked.forEach(word => {
    const def = getThuumDef(word)
    if (!def) return

    const entry = document.createElement("button")
    entry.className = "playerThuumEntry"
    entry.disabled = !canUseThuumNow(word)
    entry.onclick = () => usePlayerThuum(word)

    const img = document.createElement("img")
    img.src = def.buttonImage || "images/runeskraa.png"
    img.alt = word
    entry.appendChild(img)

    const text = document.createElement("div")
    text.className = "playerThuumEntryText"

    const name = document.createElement("div")
    name.className = "playerThuumEntryName"
    name.innerText = word
    text.appendChild(name)

    const words = document.createElement("div")
    words.className = "playerThuumEntryWords"
    words.innerText = (def.words || [word]).join(" • ")
    text.appendChild(words)

    const translation = document.createElement("div")
    translation.className = "playerThuumEntryState"
    translation.classList.add("playerActionTranslation")
    translation.innerText = def.translation || def.description || ""
    if (translation.innerText) text.appendChild(translation)
    const description=document.createElement("div");description.className="playerThuumEntryState";description.textContent=thuumEffectDescription(word,getMyThuumWords()[word]?.rank||1);text.appendChild(description)

    const state = document.createElement("div")
    state.className = "playerThuumEntryState"
    state.innerText = getThuumEntryState(word)
    text.appendChild(state)

    entry.appendChild(text)
    panel.appendChild(entry)
  })
}

function renderPlayerAllyEntry(panel) {
  const access = window.playerAllyAccessData
  if(typeof renderDiscoveredAllies==="function")renderDiscoveredAllies(panel)
  if (!access || !hasPlayerAllyAccess()) return

  let granted = null
  if (typeof ALLY_PNJS !== "undefined") {
    combatAllyOptions().forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
  }

  if (!granted) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.classList.add("playerActionEmpty")
    empty.innerText = "Invocation introuvable."
    panel.appendChild(empty)
    return
  }

  const entry = document.createElement("button")
  entry.className = "playerThuumEntry"
  entry.onclick = () => {
    if (typeof triggerAllyAction === "function") triggerAllyAction(granted.pnj, granted.action)
  }

  const img = document.createElement("img")
  img.src = "images/" + granted.pnj.image
  img.alt = granted.pnj.name
  entry.appendChild(img)

  const text = document.createElement("div")
  text.className = "playerThuumEntryText"

  const name = document.createElement("div")
  name.className = "playerThuumEntryName"
  name.innerText = granted.action.label
  text.appendChild(name)

  const words = document.createElement("div")
  words.className = "playerThuumEntryWords"
  words.innerText = granted.pnj.name
  text.appendChild(words)

  const desc = document.createElement("div")
  desc.className = "playerThuumEntryState"
  desc.classList.add("playerActionDescription")
  desc.innerText = window.playerAllyAccessData?.scope==="exploration"?"Fait apparaître un pion sur cette carte, sans dégâts ni soins. Le MJ pourra le retirer.":(typeof allyActionDescription==="function"?allyActionDescription(granted.pnj,granted.action):granted.action.desc)
  text.appendChild(desc)

  const state = document.createElement("div")
  state.className = "playerThuumEntryState"
  state.innerText = "Autorisée par le MJ"
  text.appendChild(state)

  entry.appendChild(text)
  panel.appendChild(entry)
}

function renderPlayerRuneEntry(panel) {
  const data = window.activeRuneChallengeData
  if (!data || !data.active) return

  const entry = document.createElement("button")
  entry.className = "playerThuumEntry"
  entry.onclick = () => toggleRuneOverlay(data)

  const icon = document.createElement("div")
  icon.className = "playerActionRuneIcon"
  icon.innerText = "ᚱ"
  entry.appendChild(icon)

  const text = document.createElement("div")
  text.className = "playerThuumEntryText"

  const name = document.createElement("div")
  name.className = "playerThuumEntryName"
  name.innerText = "Runes"
  text.appendChild(name)

  const words = document.createElement("div")
  words.className = "playerThuumEntryWords"
  words.innerText = "Défi runique actif"
  text.appendChild(words)

  const state = document.createElement("div")
  state.className = "playerThuumEntryState"
  state.innerText = "Ouvrir le jeu de runes"
  text.appendChild(state)

  entry.appendChild(text)
  panel.appendChild(entry)
}

function renderPlayerPowersPanel(targetPanel=null,preview=null) {
  const panel = targetPanel || document.getElementById("playerThuumPanel")
  if (!panel || panel.style.display === "none") return
  panel.innerHTML = ""
  panel.classList.add("playerActionMenu")
  const powerTabs = preview?getPreviewPlayerActionTabs(preview.actor,preview.root):getAvailablePlayerPowerTabs()
  const tabs = [...powerTabs, "fiche"]

  const title = document.createElement("div")
  if(!preview)title.id = "playerThuumPanelTitle"
  title.className="playerActionTitle"
  title.innerText = "Menu Action"
  panel.appendChild(title)
  if(!preview){const close=document.createElement("button");close.type="button";close.textContent="Fermer ✕";close.className="playerActionClose";close.onclick=closePlayerPowersPanel;panel.appendChild(close)}

  const tabRow = document.createElement("div")
  tabRow.className = "playerActionTabs"
  panel.appendChild(tabRow)

  const content = document.createElement("div")
  if(!preview)content.id = "playerPowerPanelContent"
  content.className="playerActionContent"
  panel.appendChild(content)

  const allTabs = [...tabs]
  const defaultTab = panel.dataset.activeTab && allTabs.includes(panel.dataset.activeTab)
    ? panel.dataset.activeTab
    : (preview?(powerTabs.includes("thuum")?"thuum":powerTabs[0]||"fiche"):(powerTabs.length ? getDefaultPlayerPowerTab() : "fiche"))
  panel.dataset.activeTab = defaultTab

  function paintTab(tab) {
    content.innerHTML = ""
    panel.dataset.activeTab = tab
    Array.from(tabRow.children).forEach(btn => {
      btn.classList.toggle("is-active",btn.dataset.tab === tab)
    })

    if(preview){renderPreviewPlayerActionTab(content,tab,preview.actor,preview.root);return}
    if(tab === "documents")renderGrantedDocuments(content)
    else if (tab === "ally") renderPlayerAllyEntry(content)
    else if (tab === "thuum") renderPlayerThuumEntries(content)
    else if (tab === "runes") renderPlayerRuneEntry(content)
    else if (tab === "fiche") {
      const btn = document.createElement("button")
      btn.innerText = "Ouvrir la fiche"
      btn.className = "playerActionSheetButton"
      btn.onclick = () => { closePlayerPowersPanel(); openCharacterSheet() }
      content.appendChild(btn)
    }
  }

  tabs.forEach(tab => {
    const btn = document.createElement("button")
    btn.dataset.tab = tab
    btn.className = "playerActionTab"
    btn.innerText = tab === "documents" ? "Documents" : tab === "ally" ? "Invocations" : tab === "thuum" ? "Cris" : tab === "runes" ? "Runes" : "Fiche"
    btn.onclick = () => paintTab(tab)
    tabRow.appendChild(btn)
  })

  paintTab(defaultTab)
}

function togglePlayerThuumPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel) return
  if (panel.style.display === "block") {
    closePlayerPowersPanel()
    return
  }
  panel.style.display = "block"
  renderPlayerPowersPanel()
}

function showThuumUnlockCinematic(data) {
    const screen = document.getElementById("thuumUnlockScreen")
    const image = document.getElementById("thuumUnlockImage")
    const title = document.getElementById("thuumUnlockTitle")
    const words = document.getElementById("thuumUnlockWords")
    const player = document.getElementById("thuumUnlockPlayer")
    if (!screen || !title || !words || !player) return

    const def = getThuumDef(data.word)
    if (image) image.src = "images/thuum.png"
    title.innerText = "Nouveau Cri de Mouches appris : " + data.word
    words.innerText = (data.words && data.words.length ? data.words.join(" • ") : ((def && def.words) ? def.words.join(" • ") : data.word))
    player.innerText = data.playerId ? ("Porteur choisi : " + heroDisplayName(data.playerId).toUpperCase()) : ""
  if (myToken && data.playerId && String(myToken.id).toLowerCase() === String(data.playerId).toLowerCase()) {
    showNotification((data.word || "Cri") + " est maintenant a vous")
  }

  const snd = document.getElementById("thuumSound")
  if (snd) {
    snd.currentTime = 0
    setManagedAudioBaseVolume(snd,0.85,"effects")
    snd.play().catch(() => {})
  }

  screen.style.display = "flex"
  requestAnimationFrame(() => screen.classList.add("active"))
  flashGold()
  flashGold()
  screenShakeHard()

  setTimeout(() => {
    screen.classList.remove("active")
    setTimeout(() => { screen.style.display = "none" }, 600)
  }, 6200)
}

function playThuumCastEffect(data) {
  const snd = document.getElementById("criSound")
  if (snd) {
    snd.currentTime = 0
    setManagedAudioBaseVolume(snd,0.85,"effects")
    snd.play().catch(() => {})
  }
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999999998;background:radial-gradient(circle at center,rgba(190,220,255,0.85) 0%,rgba(120,180,255,0.42) 22%,rgba(255,255,255,0.22) 38%,rgba(170,0,0,0.18) 68%,rgba(0,0,0,0) 100%);opacity:0;mix-blend-mode:screen;transition:opacity 0.08s ease;"
  document.body.appendChild(flash)
  requestAnimationFrame(() => { flash.style.opacity = "1" })
  setTimeout(() => {
    flash.style.transition = "opacity 0.55s ease"
    flash.style.opacity = "0"
  }, 110)
  setTimeout(() => flash.remove(), 760)

  flashRed()
  setTimeout(() => flashRed(), 90)
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  const casterId = String(data.playerId || "").toLowerCase()
  if (casterId) {
    const casterToken = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === casterId)
    if (casterToken) {
      let flame = casterToken.querySelector(".thuumBlueFlame")
      if (!flame) {
        flame = document.createElement("div")
        flame.className = "thuumBlueFlame"
        flame.style.cssText = "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:84px;height:118px;border-radius:50% 50% 42% 42%;background:radial-gradient(ellipse at 50% 82%, rgba(180,245,255,0.92) 0%, rgba(88,205,255,0.8) 18%, rgba(45,126,255,0.64) 46%, rgba(24,62,170,0.18) 70%, transparent 100%);mix-blend-mode:screen;filter:blur(6px);opacity:0;"
        casterToken.appendChild(flame)
      }
      casterToken.classList.remove("thuumCaster")
      void casterToken.offsetWidth
      casterToken.classList.add("thuumCaster")
      setTimeout(() => {
        casterToken.classList.remove("thuumCaster")
        if (flame) flame.style.opacity = "0"
      }, 1700)
    }
  }
  showNotification("ᚦ " + (data.word || "SKRAA") + " - " + heroDisplayName(data.playerId).toUpperCase())
}

function grantThuumToPlayer(playerId, word) {
  if (!isGM) return
  const def = getThuumDef(word)
  if (!def) return
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
  if (def.unlockMap && currentMap !== def.unlockMap) {
    showNotification(word + " ne peut etre revele que sur " + def.unlockMap)
    return
  }

  db.ref("game/playerThuum/" + playerId + "/" + word).once("value", snap => {
    const existing = snap.val()
    if (existing && existing.unlocked) {
      showNotification(word + " deja appris par " + heroDisplayName(playerId).toUpperCase())
      return
    }

    db.ref("game/playerThuum/" + playerId + "/" + word).set({
      unlocked: true,
      rank: 1,
      words: def.words || [word],
      time: Date.now()
    }).then(() => {
      db.ref("game/thuumUnlockEvent").set({
        playerId,
        word,
        words: def.words || [word],
        time: Date.now()
      })
      setTimeout(() => void 0, 2000)
      showNotification(word + " donné à " + heroDisplayName(playerId).toUpperCase())
    })
  })
}

function grantThuumUseToPlayer(playerId, word) {
  if (!isGM) return
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
  db.ref("game/playerThuumAccess/" + playerId + "/" + word).set({
    allowed: true,
    time: Date.now()
  }).then(() => {
    showNotification(word + " autorisé pour une utilisation, en combat ou hors combat : " + heroDisplayName(playerId).toUpperCase())
  })
}

async function usePlayerThuum(forcedWord) {
  if (!myToken) return
  const activeWord = forcedWord || getPrimaryThuumWord()
  const def = activeWord ? getThuumDef(activeWord) : null
  if (!activeWord || !def || !hasUnlockedThuum(activeWord)) return
  if (combatActive && isThuumUsedThisCombat(activeWord)) {
    showNotification(activeWord + " est déjà utilisé pour ce combat")
    return
  }
  if (combatActive && !hasThuumUseAccess(activeWord)) {
    showNotification("Le MJ doit autoriser " + activeWord + " en combat")
    return
  }

  const playerId = myToken.id
  if (!combatActive) {
    if (!hasThuumUseAccess(activeWord)) {
      showNotification("Le MJ doit autoriser " + activeWord + " hors combat")
      return
    }
    const result = await requestCharacterEffect("thuum-outside", playerId, {word:activeWord})
    if (result) { closePlayerPowersPanel(); updateThuumButton() }
    return
  }

  requestPlayerThuumAction(activeWord)
}


