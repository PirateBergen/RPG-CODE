"use strict"

/* ========================= */
/* FIREBASE INIT             */
/* ========================= */

const firebaseConfig = {
  apiKey:            "AIzaSyCRdh9-vOZn-u-FrVwkCX8uE3jHZ9q9ppY",
  authDomain:        "la-prophetie-des-mouches.firebaseapp.com",
  databaseURL:       "https://la-prophetie-des-mouches-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "la-prophetie-des-mouches",
  storageBucket:     "la-prophetie-des-mouches.firebasestorage.app",
  messagingSenderId: "61052402165",
  appId:             "1:61052402165:web:376cb5aa9a156bc02cc8bc"
}

firebase.initializeApp(firebaseConfig)
firebase.database().goOnline()
const db   = firebase.database()
installSessionWriteTracking(db)
const auth = typeof firebase.auth === "function" ? firebase.auth() : null

window.__authReady        = false
window.__authUid          = null
window.__authLoginStarted = false
window.__authLoginPromise = null
window.__authRole         = null
window.__authPlayerId     = null
window.__authRoleRef      = null
window.__authRoleCb       = null
window.__authProfileRef   = null
window.__authProfileCb    = null
window.__gmAuthBusy       = false
window.__playerAuthBusy   = false

function detachFirebaseAccessSync() {
  if (window.__authRoleRef && window.__authRoleCb) window.__authRoleRef.off("value", window.__authRoleCb)
  if (window.__authProfileRef && window.__authProfileCb) window.__authProfileRef.off("value", window.__authProfileCb)
  window.__authRoleRef = null; window.__authRoleCb = null
  window.__authProfileRef = null; window.__authProfileCb = null
  window.__authRole = null; window.__authPlayerId = null
  if (typeof syncCombatCoordinator === "function") syncCombatCoordinator()
  if(typeof syncCombatExitCoordinator==="function")syncCombatExitCoordinator()
  if(typeof syncCharacterEffects==="function")syncCharacterEffects()
  if(typeof syncExplorationCoordinator === "function") syncExplorationCoordinator()
  stopCharacterSubscriptions()
  stopPersistenceSync()
}

function syncFirebaseAccessForUser(uid) {
  detachFirebaseAccessSync()
  if (!uid) return
  startPersistenceSync(uid)
  const roleRef = db.ref("roles/" + uid)
  const roleCb = snap => {
    const role = snap.val()
    const previousRole = window.__authRole
    window.__authRole = typeof role === "string" ? role : null
    if(typeof syncExplorationCoordinator === "function")syncExplorationCoordinator()
    if (typeof syncCombatCoordinator === "function") syncCombatCoordinator()
    if(typeof syncCombatExitCoordinator==="function")syncCombatExitCoordinator()
  if(typeof syncCharacterEffects==="function")syncCharacterEffects()
    if (window.__sessionBusy) recoverExpiredSessionLock().catch(error => console.warn(error))
    if (previousRole === "gm" && window.__authRole !== "gm") resetLocalCharacterAccess()
    syncCharacterSubscriptions()
    if (window.__authRole === "gm" && !isGM) activateGM(true)
    if(window.__authRole==="gm" && typeof cleanupLegacyWantedElements==="function")cleanupLegacyWantedElements().catch(error=>console.warn(error))
    updateIntroLogoutBtn()
  }
  const profileRef = db.ref("profiles/" + uid + "/playerId")
  const profileCb = snap => {
    const playerId = snap.val()
    const previousPlayer = window.__authPlayerId
    const nextPlayer = typeof playerId === "string" ? playerId : null
    if (previousPlayer && previousPlayer !== nextPlayer && window.__authRole !== "gm") resetLocalCharacterAccess()
    window.__authPlayerId = nextPlayer
    syncCharacterSubscriptions()
    updatePlayerAuthMenuState()
    if (window.__authPlayerId) setTimeout(() => { tryAutoSelectAuthenticatedPlayer() }, 60)
  }
  window.__authRoleRef = roleRef; window.__authRoleCb = roleCb
  window.__authProfileRef = profileRef; window.__authProfileCb = profileCb
  roleRef.on("value", roleCb)
  profileRef.on("value", profileCb)
}

function initFirebaseAnonymousAuth() {
  if (!auth) return Promise.resolve(null)
  if (auth.currentUser && window.__authReady) return Promise.resolve(auth.currentUser)
  if (window.__authLoginPromise) return window.__authLoginPromise
  window.__authLoginPromise = new Promise(resolve => {
    let resolved = false
    const finish = user => { if (resolved) return; resolved = true; resolve(user || null) }
    auth.onAuthStateChanged(user => {
      if (window.__authUid !== (user?.uid || null)) resetLocalCharacterAccess()
      window.__authReady = !!user
      window.__authUid = user?.uid || null
      syncFirebaseAccessForUser(window.__authUid)
      if (user) finish(user)
    }, error => { console.warn("Firebase auth state error:", error); detachFirebaseAccessSync(); finish(null) })
    if (auth.currentUser) {
      window.__authReady = true; window.__authUid = auth.currentUser.uid
      syncFirebaseAccessForUser(window.__authUid); finish(auth.currentUser); return
    }
    window.__authLoginStarted = true
    auth.signInAnonymously().catch(error => { console.warn("Firebase anonymous auth failed:", error); finish(null) })
  })
  return window.__authLoginPromise
}

/* ========================= */
/* AUTH MJ                   */
/* ========================= */

function closeGMAuthModal() {
  const modal = document.getElementById("gmAuthModal")
  if (modal) modal.remove()
  window.__gmAuthBusy = false
}

function showGMAuthMessage(message, isError = false) {
  const feedback = document.getElementById("gmAuthFeedback")
  if (!feedback) return
  feedback.style.display = "block"
  feedback.style.color = isError ? "#ff8a8a" : "#d6c28a"
  feedback.innerText = message
}

function handleGMEmailPasswordAuth(mode) {
  if (!auth || window.__gmAuthBusy) return
  const emailEl = document.getElementById("gmAuthEmail")
  const passwordEl = document.getElementById("gmAuthPassword")
  if (!emailEl || !passwordEl) return
  const email = String(emailEl.value || "").trim()
  const password = String(passwordEl.value || "")
  if (!email || !password) { showGMAuthMessage("Email et mot de passe requis", true); return }
  window.__gmAuthBusy = true
  showGMAuthMessage(mode === "create" ? "Création du compte MJ..." : "Connexion MJ...")
  const action = mode === "create"
    ? auth.createUserWithEmailAndPassword(email, password)
    : auth.signInWithEmailAndPassword(email, password)
  action.then(cred => {
    try { localStorage.setItem("rpg_gm_email", email) } catch (e) {}
    const uid = cred?.user?.uid || window.__authUid || ""
    if (mode === "create") {
      showGMAuthMessage("Compte MJ créé. UID : " + uid + " — pense à lui donner le rôle gm dans Firebase.")
      showNotification("Compte MJ créé — attribue le rôle gm dans Firebase")
    } else {
      showGMAuthMessage("Connexion MJ réussie")
      showNotification("Connexion MJ réussie")
      setTimeout(() => {
        if (window.__authRole === "gm") { activateGM(true); closeGMAuthModal() }
        else showGMAuthMessage("Compte connecté, mais rôle gm non détecté. Vérifie roles/<uid> = gm dans Firebase.", true)
      }, 300)
    }
  }).catch(error => {
    console.warn("GM auth error:", error)
    showGMAuthMessage(error?.message || "Erreur d'authentification MJ", true)
  }).finally(() => { window.__gmAuthBusy = false })
}

function showGMAuthModal() {
  const existing = document.getElementById("gmAuthModal")
  if (existing) existing.remove()
  const overlay = document.createElement("div")
  overlay.id = "gmAuthModal"
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:1000000006;"
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) closeGMAuthModal() })
  const box = document.createElement("div")
  box.style.cssText = "width:min(460px,90vw);background:linear-gradient(180deg,rgba(28,20,12,0.98),rgba(10,8,8,0.99));border:1px solid rgba(210,178,108,0.6);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.85);padding:24px 24px 20px 24px;color:#f5e6c8;font-family:Cinzel,serif;"
  overlay.appendChild(box)
  const title = document.createElement("div")
  title.style.cssText = "font-family:'Cinzel Decorative','Cinzel',serif;font-size:26px;letter-spacing:3px;text-align:center;color:#f0d087;margin-bottom:10px;"
  title.innerText = "Connexion MJ"
  box.appendChild(title)
  const sub = document.createElement("div")
  sub.style.cssText = "font-size:13px;line-height:1.55;text-align:center;color:#d9c39a;margin-bottom:18px;"
  sub.innerText = "Utilise un compte Firebase stable pour éviter de remapper le rôle gm à chaque nouvelle session."
  box.appendChild(sub)
  const email = document.createElement("input")
  email.id = "gmAuthEmail"; email.type = "email"; email.placeholder = "Email MJ"; email.autocomplete = "username"
  email.style.cssText = "width:100%;padding:12px 14px;margin-bottom:10px;background:rgba(8,8,8,0.92);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;"
  try { email.value = localStorage.getItem("rpg_gm_email") || "" } catch (e) {}
  box.appendChild(email)
  const password = document.createElement("input")
  password.id = "gmAuthPassword"; password.type = "password"; password.placeholder = "Mot de passe MJ"; password.autocomplete = "current-password"
  password.style.cssText = "width:100%;padding:12px 14px;margin-bottom:14px;background:rgba(8,8,8,0.92);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;"
  box.appendChild(password)
  const feedback = document.createElement("div")
  feedback.id = "gmAuthFeedback"
  feedback.style.cssText = "display:none;min-height:20px;margin-bottom:12px;font-size:12px;line-height:1.4;"
  box.appendChild(feedback)
  const row = document.createElement("div")
  row.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;justify-content:center;"
  box.appendChild(row)
  const loginBtn = document.createElement("button")
  loginBtn.innerText = "Connexion"
  loginBtn.style.cssText = "padding:10px 18px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  loginBtn.onclick = () => handleGMEmailPasswordAuth("login")
  row.appendChild(loginBtn)
  const createBtn = document.createElement("button")
  createBtn.innerText = "Créer compte MJ"
  createBtn.style.cssText = "padding:10px 18px;background:linear-gradient(#3b5b7a,#20354a);color:#dcecff;border:1px solid #7ea7c9;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  createBtn.onclick = () => handleGMEmailPasswordAuth("create")
  row.appendChild(createBtn)
  const cancelBtn = document.createElement("button")
  cancelBtn.innerText = "Annuler"
  cancelBtn.style.cssText = "padding:10px 18px;background:#222;color:#d0c4ae;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  cancelBtn.onclick = closeGMAuthModal
  row.appendChild(cancelBtn)
  const hint = document.createElement("div")
  hint.style.cssText = "margin-top:14px;font-size:11px;line-height:1.5;color:#b9a786;text-align:center;"
  hint.innerText = "Après création du compte, ajoute une seule fois son UID dans Firebase : roles/<uid> = gm."
  box.appendChild(hint)
  password.addEventListener("keydown", e => { if (e.key === "Enter") handleGMEmailPasswordAuth("login") })
  email.addEventListener("keydown", e => { if (e.key === "Enter") password.focus() })
  document.body.appendChild(overlay)
  setTimeout(() => email.focus(), 30)
}

/* ========================= */
/* AUTH JOUEURS              */
/* ========================= */

function tryAutoSelectAuthenticatedPlayer() {
  if (isGM || myToken || !window.__authPlayerId) return false
  if (!gameStarted || gameState !== "GAME") return false
  const token = document.getElementById(window.__authPlayerId)
  if (!token) return false
  choosePlayer(window.__authPlayerId)
  return true
}

function updatePlayerAuthMenuState() {
  const status = document.getElementById("playerAuthStatus")
  const choiceLabel = document.querySelector("#playerMenu .menuLabel:not(#playerAuthStatus)")
  const choiceButtons = Array.from(document.querySelectorAll("#playerMenu .playerChoiceBtn"))
  const authButton = document.querySelector("#playerMenu button[onclick=\"requestPlayerAuth()\"]")
  const authPlayer = window.__authPlayerId
  if (status) {
    if (authPlayer) { status.style.display = "block"; status.innerText = "Connecté en tant que " + authPlayer.toUpperCase() }
    else { status.style.display = "none"; status.innerText = "" }
  }
  if (authButton) authButton.innerText = authPlayer ? "🔑 Reconnexion" : "🔑 Connexion"
  if (choiceLabel) choiceLabel.style.display = authPlayer ? "none" : "block"
  choiceButtons.forEach(btn => {
    const isAssigned = authPlayer && btn.dataset.playerChoice === authPlayer
    btn.style.display = authPlayer ? (isAssigned ? "block" : "none") : "block"
    btn.disabled = !!(authPlayer && !isAssigned)
  })
  updateIntroLogoutBtn()
}

function closePlayerAuthModal() {
  const modal = document.getElementById("playerAuthModal")
  if (modal) modal.remove()
  window.__playerAuthBusy = false
}

function showPlayerAuthMessage(message, isError = false) {
  const feedback = document.getElementById("playerAuthFeedback")
  if (!feedback) return
  feedback.style.display = "block"
  feedback.style.color = isError ? "#ff9d9d" : "#d6c28a"
  feedback.innerText = message
}

function handlePlayerEmailPasswordAuth(mode) {
  if (!auth || window.__playerAuthBusy) return
  const emailEl = document.getElementById("playerAuthEmail")
  const passwordEl = document.getElementById("playerAuthPassword")
  const playerEl = document.getElementById("playerAuthCharacter")
  if (!emailEl || !passwordEl) return
  const email = String(emailEl.value || "").trim()
  const password = String(passwordEl.value || "")
  const chosenPlayer = playerEl ? String(playerEl.value || "").trim().toLowerCase() : ""
  if (!email || !password) { showPlayerAuthMessage("Email et mot de passe requis", true); return }
  if (mode === "create" && !PLAYABLE_HEROES.includes(chosenPlayer)) { showPlayerAuthMessage("Choisis un personnage pour créer le compte", true); return }
  window.__playerAuthBusy = true
  showPlayerAuthMessage(mode === "create" ? "Création du compte joueur..." : "Connexion joueur...")
  const action = mode === "create"
    ? auth.createUserWithEmailAndPassword(email, password)
    : auth.signInWithEmailAndPassword(email, password)
  action.then(cred => {
    try { localStorage.setItem("rpg_player_email", email) } catch (e) {}
    if (mode === "create") {
      const uid = cred?.user?.uid || window.__authUid || ""
      return db.ref("profiles/" + uid + "/playerId").set(chosenPlayer).then(() => {
        showPlayerAuthMessage("Compte joueur créé et lié à " + chosenPlayer.toUpperCase())
        showNotification("Compte joueur créé : " + chosenPlayer.toUpperCase())
      })
    }
    showPlayerAuthMessage("Connexion joueur réussie")
    showNotification("Connexion joueur réussie")
    setTimeout(() => {
      if (window.__authPlayerId) { tryAutoSelectAuthenticatedPlayer(); closePlayerAuthModal() }
      else showPlayerAuthMessage("Compte connecté, mais aucun playerId n'est défini dans profiles/<uid>/playerId.", true)
    }, 300)
    return null
  }).catch(error => {
    console.warn("Player auth error:", error)
    showPlayerAuthMessage(error?.message || "Erreur d'authentification joueur", true)
  }).finally(() => { window.__playerAuthBusy = false })
}

function showPlayerAuthModal() {
  const existing = document.getElementById("playerAuthModal")
  if (existing) existing.remove()
  const overlay = document.createElement("div")
  overlay.id = "playerAuthModal"
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:1000000006;"
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) closePlayerAuthModal() })
  const box = document.createElement("div")
  box.style.cssText = "width:min(460px,90vw);background:linear-gradient(180deg,rgba(18,20,30,0.98),rgba(8,8,12,0.99));border:1px solid rgba(120,160,210,0.6);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.85);padding:24px 24px 20px 24px;color:#f5e6c8;font-family:Cinzel,serif;"
  overlay.appendChild(box)
  const title = document.createElement("div")
  title.style.cssText = "font-family:'Cinzel Decorative','Cinzel',serif;font-size:24px;letter-spacing:3px;text-align:center;color:#cfe2ff;margin-bottom:10px;"
  title.innerText = "Connexion Joueur"
  box.appendChild(title)
  const sub = document.createElement("div")
  sub.style.cssText = "font-size:13px;line-height:1.55;text-align:center;color:#c7d3e8;margin-bottom:18px;"
  sub.innerText = "Un compte stable évite de reconfigurer ton personnage à chaque nouvelle session."
  box.appendChild(sub)
  const email = document.createElement("input")
  email.id = "playerAuthEmail"; email.type = "email"; email.placeholder = "Email joueur"; email.autocomplete = "username"
  email.style.cssText = "width:100%;padding:12px 14px;margin-bottom:10px;background:rgba(8,8,8,0.92);border:1px solid rgba(120,160,210,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;"
  try { email.value = localStorage.getItem("rpg_player_email") || "" } catch (e) {}
  box.appendChild(email)
  const password = document.createElement("input")
  password.id = "playerAuthPassword"; password.type = "password"; password.placeholder = "Mot de passe joueur"; password.autocomplete = "current-password"
  password.style.cssText = "width:100%;padding:12px 14px;margin-bottom:10px;background:rgba(8,8,8,0.92);border:1px solid rgba(120,160,210,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;"
  box.appendChild(password)
  // Choix du personnage (pour création de compte) — boutons tactiles, pas de <select>
  const charLabel = document.createElement("div")
  charLabel.style.cssText = "font-size:11px;color:#8aabcf;margin-bottom:6px;letter-spacing:1px;"
  charLabel.innerText = "Personnage (création uniquement)"
  box.appendChild(charLabel)
  const charRow = document.createElement("div")
  charRow.style.cssText = "display:flex;gap:8px;margin-bottom:14px;justify-content:center;"
  box.appendChild(charRow)
  // champ caché qui stocke la valeur sélectionnée
  const charInput = document.createElement("input")
  charInput.id = "playerAuthCharacter"; charInput.type = "hidden"; charInput.value = ""
  box.appendChild(charInput)
  ;[{value:"greg",label:"Greg"},{value:"ju",label:"Yu"},{value:"elo",label:"Elo"}].forEach(o => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.innerText = o.label
    btn.dataset.charValue = o.value
    btn.style.cssText = "flex:1;padding:12px 8px;background:rgba(20,30,50,0.9);border:1px solid rgba(120,160,210,0.35);border-radius:8px;color:#c7d3e8;font-family:Cinzel,serif;font-size:13px;cursor:pointer;transition:background 0.15s,border-color 0.15s;"
    btn.addEventListener("pointerdown", e => {
      e.stopPropagation()
      charRow.querySelectorAll("button").forEach(b => {
        b.style.background = "rgba(20,30,50,0.9)"
        b.style.borderColor = "rgba(120,160,210,0.35)"
        b.style.color = "#c7d3e8"
      })
      btn.style.background = "rgba(40,80,140,0.85)"
      btn.style.borderColor = "#89a9cf"
      btn.style.color = "#fff"
      charInput.value = o.value
    })
    charRow.appendChild(btn)
  })
  const feedback = document.createElement("div")
  feedback.id = "playerAuthFeedback"
  feedback.style.cssText = "display:none;min-height:20px;margin-bottom:12px;font-size:12px;line-height:1.4;"
  box.appendChild(feedback)
  const row = document.createElement("div")
  row.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;justify-content:center;"
  box.appendChild(row)
  const loginBtn = document.createElement("button")
  loginBtn.innerText = "Connexion"
  loginBtn.style.cssText = "padding:10px 18px;background:linear-gradient(#4d6f96,#2d4561);color:#eef5ff;border:1px solid #89a9cf;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  loginBtn.onclick = () => handlePlayerEmailPasswordAuth("login")
  row.appendChild(loginBtn)
  const createBtn = document.createElement("button")
  createBtn.innerText = "Créer compte joueur"
  createBtn.style.cssText = "padding:10px 18px;background:linear-gradient(#3d5d44,#233526);color:#e8f4e0;border:1px solid #87aa86;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  createBtn.onclick = () => handlePlayerEmailPasswordAuth("create")
  row.appendChild(createBtn)
  const cancelBtn = document.createElement("button")
  cancelBtn.innerText = "Annuler"
  cancelBtn.style.cssText = "padding:10px 18px;background:#222;color:#d0c4ae;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  cancelBtn.onclick = closePlayerAuthModal
  row.appendChild(cancelBtn)
  const gmRow = document.createElement("div")
  gmRow.style.cssText = "margin-top:14px;padding-top:14px;border-top:1px solid rgba(140,170,210,0.2);display:flex;justify-content:center;"
  box.appendChild(gmRow)
  const gmBtn = document.createElement("button")
  gmBtn.innerText = "Connexion MJ"
  gmBtn.style.cssText = "padding:10px 18px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;"
  gmBtn.onclick = () => { closePlayerAuthModal(); setTimeout(() => showGMAuthModal(), 20) }
  gmRow.appendChild(gmBtn)
  document.body.appendChild(overlay)
  setTimeout(() => email.focus(), 30)
}

function requestPlayerAuth() {
  if (window.__authRole === "gm") { activateGM(true); return }
  if (window.__authPlayerId) {
    if (tryAutoSelectAuthenticatedPlayer()) return
    showNotification("Compte joueur déjà connecté : " + window.__authPlayerId.toUpperCase()); return
  }
  showPlayerAuthModal()
}

function logoutPlayer() {
  if (!auth) return
  auth.signOut().then(() => {
    resetLocalCharacterAccess()
    if (isGM) {
      isGM = false
      const gmBar = document.getElementById("gmBar"); const mjLog = document.getElementById("mjLog"); const previewBtn = document.getElementById("playerPreviewBtn")
      if (gmBar) gmBar.style.display = "none"; if (mjLog) mjLog.style.display = "none"; if (previewBtn) previewBtn.style.display = "none"
      document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
    }
    window.__authPlayerId = null; window.__authRole = null
    detachFirebaseAccessSync()
    showNotification("Déconnexion réussie")
    updateIntroLogoutBtn()
    window.__authLoginPromise = null
    auth.signInAnonymously().catch(() => {})
  }).catch(err => { showNotification("Erreur lors de la déconnexion : " + (err?.message || err)) })
}

function updateIntroLogoutBtn() {
  const isAuth = !!(window.__authPlayerId || window.__authRole === "gm")
  const introBtn = document.getElementById("introLogoutBtn")
  const menuBtn = document.getElementById("playerMenuLogoutBtn")
  if (introBtn) introBtn.style.display = isAuth ? "" : "none"
  if (menuBtn) menuBtn.style.display = isAuth ? "" : "none"
}

initFirebaseAnonymousAuth()

window.groupMadness = 0
window.groupMadnessTier = 0
window.madnessShakeInterval = null
window.currentMadnessLoopId = null
window.worldMapFogTopLeftHidden = false
window.__worldMapFogTopLeftReady = false
window.playerThuumData = {}
window.playerThuumAccessData = {}
window.playerAllyAccessData = null
window.activeRuneChallengeData = null
window.mapLoreBookData = null
window.readLoreBooksData = {}
window.__openedMapLoreBookId = null
window.__shopWasOpen = false
window.__shopInitDone = false
window.__lastShopSoundState = null
window.__lastShopSoundAt = 0
window.__lastShopEventSignature = null
window.__lastOpenedShopTime = null
window.__lastPublishedCameraZoom = null

const MAP_LORE_BOOK_MAPS = [
  "taverne.jpg",
  "tavernebrume.png",
  "palaisville.jpg",
  "mairemaison.jpg",
  "marche.jpg",
  "marche1.jpg",
  "interieurmine.jpg"
]

const MAP_LORE_BOOK_IMAGES = ["livre.png", "livre1.png", "livre2.png"]

const MAP_LORE_BOOK_ENTRIES = {
  revenus: {
    id: "revenus",
    text: "Ils sont revenus.\nIls sont revenus.\nIls sont revenus.",
    reward: null
  },
  logique: {
    id: "logique",
    text: "Jour 12 : je suis persuadé que ce lieu a une logique.\nJour 19 : je suis persuadé que cette logique m'échappe.\nJour 23 : je ne suis plus sûr de vouloir comprendre.",
    reward: { stat: "perspi", amount: 1, label: "Intelligence" }
  },
  subtile: {
    id: "subtile",
    text: "Certains apprennent à éviter les coups.\nD'autres apprennent à ne jamais être là quand ils arrivent.\nLa différence est subtile, mais elle sauve des vies.",
    reward: { stat: "defense", amount: 1, label: "Dextérité" }
  },
  danger: {
    id: "danger",
    text: "Si vous lisez ceci, c'est que vous êtes probablement en danger.\nSi vous n'êtes pas en danger, reposez ce livre immédiatement, vous allez l'être.",
    reward: { stat: "curse", amount: 1, label: "Malédiction" }
  }
}

function isMapLoreBookMap(mapName) {
  return MAP_LORE_BOOK_MAPS.includes(mapName)
}

function getMapLoreBookPosition(mapName) {
  const positions = {
    "taverne.jpg":       { left: "20%", bottom: "18%" },
    "tavernebrume.png":  { left: "18%", bottom: "18%" },
    "palaisville.jpg":   { left: "76%", bottom: "16%" },
    "mairemaison.jpg":   { left: "24%", bottom: "20%" },
    "marche.jpg":        { left: "30%", bottom: "16%" },
    "marche1.jpg":       { left: "26%", bottom: "18%" },
    "interieurmine.jpg": { left: "74%", bottom: "15%" }
  }
  return positions[mapName] || { left: "22%", bottom: "18%" }
}

function closeMapLoreBookOverlay() {
  const overlay = document.getElementById("mapLoreBookOverlay")
  if (overlay) overlay.remove()
  window.__openedMapLoreBookId = null
}

function updateMapLoreBookVisibility() {
  const existing = document.getElementById("mapLoreBookToken")
  const data = window.mapLoreBookData
  const shouldShow = !!(
    data &&
    data.active &&
    !data.claimedBy &&
    data.map === currentMap &&
    gameState === "GAME" &&
    !combatActive
  )

  if (!shouldShow) {
    if (existing) existing.remove()
    return
  }

  const mapEl = document.getElementById("map")
  if (!mapEl) return
  const pos = getMapLoreBookPosition(currentMap)
  const token = existing || document.createElement("img")

  if (!existing) {
    token.id = "mapLoreBookToken"
    token.style.position = "absolute"
    token.style.width = "88px"
    token.style.height = "88px"
    token.style.objectFit = "contain"
    token.style.cursor = "pointer"
    token.style.pointerEvents = "auto"
    token.draggable = false
    token.style.zIndex = "58"
    token.style.filter = "drop-shadow(0 10px 16px rgba(0,0,0,0.82))"
    token.style.animation = "bookFloatIdle 2.8s ease-in-out infinite"
    token.onmousedown = e => { e.stopPropagation() }
    token.onclick = e => { e.stopPropagation(); tryOpenMapLoreBook() }
    mapEl.appendChild(token)
  }

  token.src = "images/" + (data.image || "livre.png")
  token.style.left = pos.left
  token.style.bottom = pos.bottom
}

function applyMapLoreBookReward() { /* Récompense atomique attribuée par le MJ dans exploration-core.js. */ }

function getLocalPlayerId() {
  if (window.__localPlayerId) return String(window.__localPlayerId).toLowerCase()
  if (myToken && myToken.id) return String(myToken.id).toLowerCase()
  const selectedToken = document.querySelector(".token.selectedPlayer")
  if (selectedToken && selectedToken.id) return String(selectedToken.id).toLowerCase()
  const menuMini = document.getElementById("playerMenuMini")
  if (menuMini && menuMini.dataset && menuMini.dataset.playerId) return String(menuMini.dataset.playerId).toLowerCase()
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.dataset && sheet.dataset.playerId) return String(sheet.dataset.playerId).toLowerCase()
  try {
    const stored = localStorage.getItem("rpg_local_player")
    if (stored) return String(stored).toLowerCase()
  } catch (e) {}
  return ""
}

function triggerLocalDefeat(){
 const outcome=window.__pendingCombatOutcome
 if(outcome?.type==="defeat"&&outcome.combatId===(window.__localCombatId||window.__combatSnapshot?.id)){observeCombatEnding(outcome);return true}
 return false
}

function watchLocalPlayerDefeat(playerId) {
  const pid = String(playerId || "").toLowerCase()
  if (!pid) return

  window.__localPlayerId = pid
  try { localStorage.setItem("rpg_local_player", pid) } catch (e) {}

  if (window.__localDefeatRef && window.__localDefeatCb) {
    window.__localDefeatRef.off("value", window.__localDefeatCb)
  }

  const ref = db.ref("characters/" + pid + "/hp")
  const cb = snap => {
    const hp = parseInt(snap.val(), 10) || 0
    if (!isGM && hp <= 0 && (combatActive || gameState === "COMBAT") && !window.__combatOutcomeShowing) {
      triggerLocalDefeat("hp-watch")
    }
  }

  window.__localDefeatRef = ref
  window.__localDefeatCb = cb
  ref.on("value", cb)
}

function showMapLoreBookOverlay(bookData) {
  const entry = MAP_LORE_BOOK_ENTRIES[bookData?.id]
  if (!entry) return
  closeMapLoreBookOverlay()
  playSound("parcheminSound", 0.85)

  const overlay = document.createElement("div")
  overlay.id = "mapLoreBookOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.58);z-index:9999996;opacity:0;transition:opacity 0.4s ease;"

  const box = document.createElement("div")
  box.style.cssText = "position:relative;width:min(760px,86vw);height:min(640px,84vh);display:flex;align-items:center;justify-content:center;"

  const img = document.createElement("img")
  img.src = "images/paper1.png"
  img.style.cssText = "width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 18px 42px rgba(0,0,0,0.9));pointer-events:none;"
  box.appendChild(img)

  const text = document.createElement("div")
  text.style.cssText = "position:absolute;left:18%;top:24%;width:64%;height:46%;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;font-family:'IM Fell English',serif;font-size:clamp(22px,2vw,34px);line-height:1.45;color:#3c2713;text-shadow:0 1px 0 rgba(255,235,190,0.2);padding:34px 40px;box-sizing:border-box;background:url('images/paper1.png') center/100% 100% no-repeat;"
  text.innerText = entry.text
  box.appendChild(text)

  if (entry.reward) {
    const reward = document.createElement("div")
    reward.style.cssText = "position:absolute;left:20%;bottom:18%;width:60%;text-align:center;font-family:'Cinzel',serif;font-size:clamp(14px,1.2vw,18px);letter-spacing:2px;color:#68451f;"
    reward.innerText = "+1 " + entry.reward.label
    box.appendChild(reward)
  }

  // Fermer en cliquant sur le fond
  overlay.addEventListener("pointerdown", e => { if (e.target === overlay) closeMapLoreBookOverlay() })

  // Bouton fermer (tablettes sans Echap)
  const closeBtn = document.createElement("button")
  closeBtn.innerText = "✕"
  closeBtn.style.cssText = "position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;background:rgba(20,12,8,0.95);border:1px solid rgba(212,168,53,0.6);color:#d4a835;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.7);touch-action:manipulation;"
  closeBtn.onclick = closeMapLoreBookOverlay
  box.appendChild(closeBtn)

  overlay.appendChild(box)
  document.body.appendChild(overlay)
  window.__openedMapLoreBookId = bookData.id
  setTimeout(() => { overlay.style.opacity = "1" }, 30)
}

function tryOpenMapLoreBook() {
  const book=window.mapLoreBookData,actor=getLocalPlayerId()
  if(isGM||!SPELL_PLAYERS.includes(actor)||!book?.active)return
  return requestExplorationAction("book",actor,{bookId:book.id,bookTime:book.time})
}

function maybeSpawnMapLoreBook(mapName) {
  if (!isGM) return
  db.ref("game/mapLoreBook").remove()
  if (!isMapLoreBookMap(mapName)) return
  if (Math.random() >= 0.2) return
  db.ref("game/readLoreBooks").once("value", snap => {
    const read = snap.val() || {}
    const pool = Object.values(MAP_LORE_BOOK_ENTRIES).filter(entry => !read[entry.id])
    if (!pool.length) return
    const entry = pool[Math.floor(Math.random() * pool.length)]
    const image = MAP_LORE_BOOK_IMAGES[Math.floor(Math.random() * MAP_LORE_BOOK_IMAGES.length)]
    db.ref("game/mapLoreBook").set({
      id: entry.id,
      image,
      map: mapName,
      active: true,
      time: Date.now()
    })
  })
}
window.usedThuumData = {}
window.__lastThuumUnlockTime = 0
window.__lastThuumCastTime = 0
window.THUUMS = {
  SKRAA: {
    word: "SKRAA",
    words: ["SKRAA", "VORTH", "NAAK"],
    translation: "Fragmentation • Rupture • Dispersion finale",
    description: "Fracasse la cible principale et blesse les ennemis autour.",
    unlockMap: "prebalraug.jpg",
    buttonImage: "images/runeskraa.png",
    combatDamageByRank: rank => ({ main: 8 + rank * 4, splash: 3 + rank * 2 }),
    outsideCombatMessage: "SKRAA retentit hors combat"
  },
  REIHKT: {
    word: "REIHKT",
    words: ["REIHKT", "MUUR", "ZAAL"],
    translation: "Terreur • Paralysie • Effondrement",
    description: "Réduit la puissance des attaques de la cible pendant deux rounds.",
    unlockMap: "epouventail.jpg",
    buttonImage: "images/runeskraa.png",
    combatDamageByRank: rank => ({ main: 6 + rank * 3, splash: 0 }),
    outsideCombatMessage: "REIHKT retentit hors combat"
  }
}

function getMadnessZoneFactor() {
  const map = (currentMap || "").toLowerCase()
  if (map.includes("foret")) return 1.35
  if (map.includes("portail")) return 1.1
  return 1
}

function isMadnessActiveMap() {
  const map = (currentMap || "").toLowerCase()
  return map.includes("foret") || map.includes("portail")
}

function getMadnessTier(value) {
  if (value >= 100) return 4
  if (value >= 75) return 3
  if (value >= 50) return 2
  if (value >= 25) return 1
  return 0
}

function stopMadnessLoops() {
  ;["madnessLow", "madnessMid", "madnessHigh", "madnessPeak"].forEach(id => {
    const audio = document.getElementById(id)
    if (!audio) return
    audio.volume = 0
    audio.pause()
    audio.currentTime = 0
  })
  window.currentMadnessLoopId = null
}

function clearMadnessResidualEffects() {
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")

  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }

  if (overlay) {
    overlay.style.display = "none"
    overlay.style.opacity = "0"
    overlay.style.background = ""
    overlay.classList.remove("active", "pulse")
  }

  if (cameraEl) {
    cameraEl.style.filter = ""
    cameraEl.classList.remove("madnessWarp")
    cameraEl.style.transform = ""
  }
}

function playMadnessLoopForTier(tier, value) {
  if (tier <= 0 || !isMadnessActiveMap() || combatActive || gameState !== "GAME") {
    stopMadnessLoops()
    return
  }

  const audioMap = {
    1: document.getElementById("madnessLow"),
    2: document.getElementById("madnessMid"),
    3: document.getElementById("madnessHigh"),
    4: document.getElementById("madnessPeak")
  }
  const audio = audioMap[tier]
  const targetId = audio ? audio.id : null
  if (!audio) {
    stopMadnessLoops()
    return
  }

  const targetVolume = Math.min(0.85, (0.18 + value / 180) * getMadnessZoneFactor())

  if (window.currentMadnessLoopId === targetId && !audio.paused) {
    audio.volume = targetVolume
    return
  }

  stopMadnessLoops()
  window.currentMadnessLoopId = targetId
  audio.currentTime = 0
  audio.loop = true
  audio.volume = targetVolume
  audio.play().catch(() => {})
}

function playMadnessHit() {
  const hit = document.getElementById("whisperHit")
  if (!hit || combatActive || gameState !== "GAME") return
  hit.currentTime = 0
  hit.volume = Math.min(0.95, 0.45 * getMadnessZoneFactor())
  hit.play().catch(() => {})
}

function updateWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog) return
  const shouldShow = currentMap === "MAPMONDE.jpg" && !window.worldMapFogTopLeftHidden && gameState === "GAME"
  fog.style.transition = "opacity 0.5s ease"
  fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
  fog.style.display = shouldShow ? "block" : "none"
  fog.style.opacity = shouldShow ? "0.98" : "0"
}

function toggleWorldMapFogTopLeft() {
  if (!isGM) return
  db.ref("game/worldMapFogTopLeftHidden").set(!window.worldMapFogTopLeftHidden)
}

function revealWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog || currentMap !== "MAPMONDE.jpg" || gameState !== "GAME") return
  fog.style.display = "block"
  fog.style.opacity = "0.98"
  fog.style.transition = "opacity 2s ease, filter 2s ease, transform 0.18s ease"
  fog.style.filter = "brightness(1.4) drop-shadow(0 0 26px rgba(255,220,160,0.55))"
  fog.style.transform = "scale(1.03)"
  const revealSnd = new Audio("audio/pow.mp3")
  setManagedAudioBaseVolume(revealSnd, 0.85)
  revealSnd.play().catch(() => {})
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  requestAnimationFrame(() => {
    fog.style.opacity = "0"
    fog.style.filter = "brightness(1.05) drop-shadow(0 0 10px rgba(255,220,160,0.18))"
    fog.style.transform = "scale(1)"
  })
  setTimeout(() => {
    fog.style.display = "none"
    fog.style.transition = "opacity 0.5s ease"
    fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
    fog.style.transform = ""
  }, 2050)
}

function startMadnessShake(tier) {
  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }
  if (tier < 2) return

  const interval = tier >= 4 ? 2200 : tier === 3 ? 3400 : 5200
  window.madnessShakeInterval = setInterval(() => {
    if (combatActive || gameState !== "GAME") return
    if (tier >= 4) screenShakeHard()
    else screenShake()
  }, interval)
}

function updateMadnessVisibility() {
  const gauge = document.getElementById("madnessGauge")
  const overlay = document.getElementById("madnessOverlay")
  if (!gauge || !overlay) return

  const visible = gameState === "GAME" && !combatActive && isMadnessActiveMap()
  gauge.style.display = visible ? "flex" : "none"
  overlay.style.display = visible ? "block" : "none"

  if (!visible) {
    stopMadnessLoops()
    clearMadnessResidualEffects()
  }
  else playMadnessLoopForTier(window.groupMadnessTier, window.groupMadness)
}

function resetMadnessPresentation() {
  const gauge = document.getElementById("madnessGauge")
  stopMadnessLoops()
  if (gauge) gauge.style.display = "none"
  clearMadnessResidualEffects()
}

function updateMadnessUI(value) {
  const gauge = document.getElementById("madnessGauge")
  const fill = document.getElementById("madnessGaugeFill")
  const glow = document.getElementById("madnessGaugeGlow")
  const label = document.getElementById("madnessGaugeValue")
  const mjValues = document.querySelectorAll("#madnessMJValue")
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")
  if (!gauge || !fill || !glow || !label || !overlay) return

  if (!isMadnessActiveMap()) {
    gauge.style.display = "none"
    stopMadnessLoops()
    clearMadnessResidualEffects()
    mjValues.forEach(el => { el.innerText = Math.max(0, Math.min(100, value)) + " / 100" })
    return
  }

  const pct = Math.max(0, Math.min(100, value))
  const tier = getMadnessTier(pct)
  const zoneFactor = getMadnessZoneFactor()

  gauge.classList.remove("tier-0", "tier-1", "tier-2", "tier-3", "tier-4")
  gauge.classList.add("tier-" + tier)
  fill.style.width = pct + "%"
  glow.style.width = pct + "%"
  label.innerText = pct + " / 100"
  mjValues.forEach(el => { el.innerText = pct + " / 100" })

  overlay.classList.toggle("active", pct > 0)
  overlay.classList.toggle("pulse", tier >= 2)
  overlay.style.opacity = pct <= 0 ? "0" : String(Math.min(0.82, (pct / 140) * zoneFactor))
  if (cameraEl) {
    const blur = pct >= 75 ? 1.6 : pct >= 50 ? 1.1 : pct >= 25 ? 0.5 : 0
    const brightness = pct >= 75 ? 0.82 : pct >= 50 ? 0.9 : pct >= 25 ? 0.96 : 1
    cameraEl.style.filter = combatActive ? "" : `blur(${blur}px) brightness(${brightness}) saturate(${1 + pct / 250})`
    if (pct >= 75 && gameState === "GAME" && !combatActive) {
      cameraEl.classList.add("madnessWarp")
      setTimeout(() => cameraEl.classList.remove("madnessWarp"), 350)
    }
  }

  if (tier >= 4) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(150,20,20,0.14) 0%, rgba(50,0,0,0.24) 42%, rgba(0,0,0,0.64) 100%)"
  } else if (tier >= 2) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(110,30,20,0.1) 0%, rgba(24,0,0,0.16) 48%, rgba(0,0,0,0.48) 100%)"
  } else {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(90,40,20,0.06) 0%, rgba(12,0,0,0.12) 48%, rgba(0,0,0,0.38) 100%)"
  }

  if (tier !== window.groupMadnessTier) {
    if (tier > 0) playMadnessHit()
    window.groupMadnessTier = tier
  }

  playMadnessLoopForTier(tier, pct)
  startMadnessShake(tier)
  updateMadnessVisibility()
}

function setGroupMadness(value) {
  if (!isGM) return
  const clamped = Math.max(0, Math.min(100, value))
  db.ref("game/groupMadness").set(clamped)
}

function changeGroupMadness(delta) {
  if (!isGM) return
  db.ref("game/groupMadness").transaction(current => {
    return Math.max(0, Math.min(100, (parseInt(current, 10) || 0) + delta))
  }, err => { if (err) console.error("changeGroupMadness transaction failed:", err) })
}

function resetGroupMadness() {
  setGroupMadness(0)
}

function ensureMadnessGMButton() {}

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
  return !!window.playerAllyAccessData
}

function hasActiveRuneChallenge() {
  const data = window.activeRuneChallengeData
  return !!(data && data.active)
}

function getAvailablePlayerPowerTabs() {
  const tabs = []
  if (hasPlayerAllyAccess()) tabs.push("ally")
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
  if (!isPlayer) {
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
  if (activeWord && !combatActive) {
    const allowedOutside = hasThuumUseAccess(activeWord)
    btn.title = allowedOutside ? activeWord + " autorise par le MJ hors combat" : activeWord + " disponible en combat ou avec autorisation MJ"
  } else if (activeWord) {
    const used = isThuumUsedThisCombat(activeWord)
    btn.title = used ? activeWord + " deja utilise pour ce combat" : activeWord + " pret a etre lance"
  } else if (hasPlayerAllyAccess()) {
    btn.title = "Pouvoirs : invocation autorisee"
  } else {
    btn.title = "Pouvoirs : runes"
  }
  renderPlayerPowersPanel()
}

function getThuumEntryState(word) {
  if (combatActive) {
    if (isThuumUsedThisCombat(word)) return "Déjà utilisé pour ce combat"
    if (!hasThuumUseAccess(word)) return "En combat : autorisation MJ requise"
    return "Autorisé par le MJ"
  }
  return hasThuumUseAccess(word) ? "Autorisé par le MJ hors combat" : "Hors combat : autorisation MJ requise"
}

function canUseThuumNow(word) {
  if (!hasUnlockedThuum(word)) return false
  if (combatActive) return !isThuumUsedThisCombat(word) && hasThuumUseAccess(word)
  return hasThuumUseAccess(word)
}

function renderPlayerThuumEntries(panel) {
  const unlocked = getUnlockedThuumWords()
  if (!unlocked.length) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.style.padding = "10px 0"
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
    translation.style.color = "#d8c28a"
    translation.style.fontStyle = "italic"
    translation.style.opacity = "0.92"
    translation.innerText = def.translation || def.description || ""
    if (translation.innerText) text.appendChild(translation)

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
  if (!access) return

  let granted = null
  if (typeof ALLY_PNJS !== "undefined") {
    ALLY_PNJS.forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
  }

  if (!granted) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.style.padding = "10px 0"
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
  desc.style.color = "#d8c28a"
  desc.innerText = granted.action.desc
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
  icon.style.cssText = "width:58px;height:58px;display:flex;align-items:center;justify-content:center;font-family:'Cinzel Decorative','Cinzel',serif;font-size:28px;color:#c8a050;"
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

function renderPlayerPowersPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel || panel.style.display === "none") return
  panel.innerHTML = ""
  const powerTabs = getAvailablePlayerPowerTabs()
  const tabs = [...powerTabs, "fiche"]

  const title = document.createElement("div")
  title.id = "playerThuumPanelTitle"
  title.innerText = "Pouvoirs"
  panel.appendChild(title)

  const tabRow = document.createElement("div")
  tabRow.style.cssText = "display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;"
  panel.appendChild(tabRow)

  const content = document.createElement("div")
  content.id = "playerPowerPanelContent"
  panel.appendChild(content)

  const allTabs = [...tabs]
  const defaultTab = panel.dataset.activeTab && allTabs.includes(panel.dataset.activeTab)
    ? panel.dataset.activeTab
    : (powerTabs.length ? getDefaultPlayerPowerTab() : "fiche")
  panel.dataset.activeTab = defaultTab

  function paintTab(tab) {
    content.innerHTML = ""
    panel.dataset.activeTab = tab
    Array.from(tabRow.children).forEach(btn => {
      btn.style.background = btn.dataset.tab === tab ? "rgba(190,150,72,0.22)" : "rgba(18,14,10,0.65)"
      btn.style.borderColor = btn.dataset.tab === tab ? "rgba(205,170,92,0.8)" : "rgba(120,92,44,0.38)"
      btn.style.color = btn.dataset.tab === tab ? "#f6e2a8" : "#d5c39a"
    })

    if (tab === "ally") renderPlayerAllyEntry(content)
    else if (tab === "thuum") renderPlayerThuumEntries(content)
    else if (tab === "runes") renderPlayerRuneEntry(content)
    else if (tab === "fiche") {
      const btn = document.createElement("button")
      btn.innerText = "Ouvrir la fiche"
      btn.style.cssText = "width:100%;padding:14px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;border:1px solid rgba(205,170,92,0.6);border-radius:10px;background:linear-gradient(180deg,rgba(60,38,16,0.85),rgba(28,16,8,0.9));color:#f5e2b0;cursor:pointer;margin-top:8px;"
      btn.onclick = () => { closePlayerPowersPanel(); openCharacterSheet() }
      content.appendChild(btn)
    }
  }

  tabs.forEach(tab => {
    const btn = document.createElement("button")
    btn.dataset.tab = tab
    btn.style.cssText = "padding:6px 12px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:1px;border:1px solid rgba(120,92,44,0.38);border-radius:999px;background:rgba(18,14,10,0.65);color:#d5c39a;cursor:pointer;"
    btn.innerText = tab === "ally" ? "Invoc" : tab === "thuum" ? "Thu'um" : tab === "runes" ? "Runes" : "Fiche"
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
    player.innerText = data.playerId ? ("Porteur choisi : " + data.playerId.toUpperCase()) : ""
  if (myToken && data.playerId && String(myToken.id).toLowerCase() === String(data.playerId).toLowerCase()) {
    showNotification((data.word || "Cri") + " est maintenant a vous")
  }

  const snd = document.getElementById("thuumSound")
  if (snd) {
    snd.currentTime = 0
    snd.volume = 0.85
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
    snd.volume = 0.85
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
  showNotification("ᚦ " + (data.word || "SKRAA") + " - " + (data.playerId || "").toUpperCase())
}

function grantThuumToPlayer(playerId, word) {
  if (!isGM) return
  const def = getThuumDef(word)
  if (!def) return
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
  if (currentMap !== def.unlockMap) {
    showNotification(word + " ne peut etre revele que sur " + def.unlockMap)
    return
  }

  db.ref("game/playerThuum/" + playerId + "/" + word).once("value", snap => {
    const existing = snap.val()
    if (existing && existing.unlocked) {
      showNotification(word + " deja appris par " + playerId.toUpperCase())
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
      showNotification("SKRAA donne a " + playerId.toUpperCase())
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
    showNotification(word + " autorise hors combat pour " + playerId.toUpperCase())
  })
}

function usePlayerThuum(forcedWord) {
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
    db.ref("game/playerThuumAccess/" + playerId + "/" + activeWord).remove()
    db.ref("game/thuumCast").set({
      playerId,
      word: activeWord,
      time: Date.now(),
      outsideCombat: true
    })
    setTimeout(() => db.ref("game/thuumCast").remove(), 1500)
    addSessionLog("ᚱ " + playerId.toUpperCase() + " utilise " + activeWord + " (hors combat)")
    showNotification(def.outsideCombatMessage || (activeWord + " retentit hors combat"))
    closePlayerPowersPanel()
    updateThuumButton()
    return
  }

  requestPlayerThuumAction(activeWord)
}


/* ========================= */
/* FIREBASE LISTENERS        */
/* UN SEUL par chemin        */
/* Initialisés après chargement complet (ui.js + combat.js disponibles) */
/* ========================= */

function safeStartIntro(event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  window.__introClickLockUntil = Date.now() + 800
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  if (start) {
    start.style.pointerEvents = "none"
    start.style.zIndex = "999999999"
  }
  if (intro) intro.style.pointerEvents = "none"
  if (typeof startIntro === "function") {
    startIntro()
  } else {
    console.error("startIntro introuvable")
  }
}

document.addEventListener("DOMContentLoaded", () => {
Object.assign(window,{showMobSpecialAttackEvent,showMobAttackPresentation,cleanupRuneChallengeUI,ensureCemeteryGlyphIntro,ensureTokenStateBadgeContainer,setTokenStateBadges,clearCombatTokenStateVisuals,resetLocalCombatVisualState,cleanupTransientGameUI,finalizeNewGameLocally,updateCombatTokenStateVisuals,syncMapElementsFromDB,syncWantedStateFromDB})
window.__pageLoadTime = Date.now()
try { window.isNewGame = sessionStorage.getItem("rpg_session_transition") === "new"; sessionStorage.removeItem("rpg_session_transition") } catch (e) {}
window.__introClickLockUntil = 0

// ─── startScreen : un seul handler pointerdown, pas d'onclick inline ───
const startScreen = document.getElementById("startScreen")
if (startScreen) {
  startScreen.style.zIndex = "999999999"
  startScreen.style.pointerEvents = "auto"
  startScreen.addEventListener("pointerdown", safeStartIntro, { passive: false })
}
document.addEventListener("click", function(event) {
  if (Date.now() < (window.__introClickLockUntil || 0)) {
    const intro = document.getElementById("intro")
    if (intro && intro.contains(event.target)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}, true)

initGMCombatPanelsDrag()
  
// Masquer les PNJ immédiatement au chargement
;["storyImage","storyImage2","storyImage3"].forEach(id => {
  const el = document.getElementById(id)
  if (el) { el.style.display = "none"; el.style.opacity = "0" }
})

const madnessGauge = document.getElementById("madnessGauge")
if (madnessGauge) madnessGauge.style.display = "none"
resetMadnessPresentation()
if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()

// ─── combat/hits — log des dégâts (sync tous les clients) ───
db.ref("combat/hits").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) {
    window.__combatDamageLog = []
    window.__combatHitLogSeen = {}
    if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
    return
  }
  const hits = Object.values(data).sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 6)
  window.__combatDamageLog = hits
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
})

db.ref("combat/hits").on("child_added", snap => {
  if (window.__sessionBusy) return
  const hit = snap.val()
  if (!hit || !hit.detail) return
  if (hit.time && hit.time < gameStartTime) return
  window.__combatHitLogSeen = window.__combatHitLogSeen || {}
  if (window.__combatHitLogSeen[snap.key]) return
  window.__combatHitLogSeen[snap.key] = true
  if (typeof addCombatLog === "function") addCombatLog(String(hit.detail))
})

// ─── combat/mob — listener unique fusionné ───
db.ref("combat/mob").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  activeMobSlots["mob"] = !!data

  // Barre HP panneau MJ
  const topBar  = document.getElementById("mobHPBarTopFill")
  const topText = document.getElementById("mobHPTopText")
  if (topBar && topText && data) {
    const pct = Math.max(0, Math.min(100, (data.hp / data.maxHP) * 100))
    topBar.style.width = pct + "%"
    topText.innerText  = data.name.toUpperCase() + "  " + data.hp + " / " + data.maxHP + "  (Niv " + (data.lvl || "?") + ")"
    topBar.style.background = pct > 60 ? "linear-gradient(90deg,#3cff6b,#0b8a3a)" : pct > 30 ? "linear-gradient(90deg,#ffb347,#ff7b00)" : "linear-gradient(90deg,#ff4040,#8b0000)"
  }

  const hud = document.getElementById("mobHUD")
  if (!combatActive || !data) {
    if (hud) hud.style.display = "none"
    const token = document.getElementById("mobToken")
    if (token) token.style.display = "none"
    const mobAttackPanel = document.getElementById("mobAttackPanel")
    if (mobAttackPanel) mobAttackPanel.remove()
    const mobAttackToggle = document.getElementById("mobAttackToggle")
    if (mobAttackToggle) mobAttackToggle.remove()
    return
  }

  // Token HUD (barre au-dessus du token)
  const tokenBar  = document.getElementById("mobTokenHPBar")
  const tokenText = document.getElementById("mobTokenHPText")
  if (tokenBar && tokenText) {
    const pct = (data.hp / data.maxHP) * 100
    tokenBar.style.width = pct + "%"
    tokenText.innerText  = data.hp + " / " + data.maxHP
  }

  const nameEl = document.getElementById("mobName")
  if (nameEl) nameEl.innerText = data.name.toUpperCase() + "  •  NIV " + (data.lvl || "?")
  const hpText = document.getElementById("mobHPText")
  if (hpText) hpText.innerText = "HP " + data.hp + " / " + data.maxHP

    if (isGM) {
      hud.style.display = "block"
      activeMobSlots["mob"] = true
      const mobAttackPanel = document.getElementById("mobAttackPanel")
      const mobPanelMissing = !mobAttackPanel || mobAttackPanel.style.display === "none"
      if (typeof renderAllMobPanels === "function" && mobPanelMissing) {
        setTimeout(() => renderAllMobPanels(), 40)
      } else {
        const spFill = document.getElementById("subPanelHPFill_mob")
        if (spFill) {
          const spPct = Math.max(0, Math.min(100, (data.hp / data.maxHP) * 100))
          spFill.style.width = spPct + "%"
          spFill.style.background = spPct > 50 ? "#44ff44" : spPct > 25 ? "#ffaa00" : "#ff3333"
        }
      }
      if (lastMobHP !== null && data.hp < lastMobHP) { flashRed(); screenShake() }
      // L’issue collective est publiée par le coordinateur du combat.
      lastMobHP = data.hp
    } else {
      if (combatActive) {
        hud.style.display = "block"
        activeMobSlots["mob"] = true
      }
      // Ne pas déduire une victoire du seul ennemi principal.
    }
})

// ─── diceRoll ───
db.ref("diceRoll").on("child_added", snap => {
  if (!window.__sessionBusy) presentSharedDice(snap.key,snap.val())
})

db.ref("game/runeDiceEvent").on("value",snap=>{
  const data=snap.val()
  if(!window.__sessionBusy && data?.id && data.time >= (window.__pageLoadTime||0))enqueueSharedVisual("rune-"+data.id,()=>showRuneBubble(data.dialogue,data.letter,data.rune),6800)
})

// ─── storyImage slots ───
db.ref("game/storyImage").on("value", snap => {
  if (window.__sessionBusy) return
  const image = snap.val()
  // Masquer le PNJ sur tous les écrans sauf GAME et COMBAT
  const box = document.getElementById("storyImage")
  if (gameState !== "GAME" && gameState !== "COMBAT") {
    if (box) { box.style.display = "none"; box.style.opacity = "0" }
    document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
    return
  }
  if (image) showStoryImage(image)
  else       hideStoryImage()
})

db.ref("game/storyImage2").on("value", snap => {
  if (window.__sessionBusy) return
  const image = snap.val()
  const box2  = document.getElementById("storyImage2")
  const img2  = document.getElementById("storyImageContent2")
  if (!box2 || !img2) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box2.style.display="none"; box2.style.opacity="0"; return }
  if (image) {
    img2.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box2.style.opacity = "0"; box2.style.left = "0"; box2.style.right = "auto"; box2.style.transform = ""; box2.style.display = "flex"
    if (!pnjSlotOrder.includes(2)) pnjSlotOrder.push(2)
    updatePNJPositions()
    setTimeout(() => { box2.style.opacity = "1" }, 60)
  } else {
    box2.style.opacity = "0"
    setTimeout(() => { box2.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 2); updatePNJPositions() }, 500)
  }
})

db.ref("game/storyImage3").on("value", snap => {
  if (window.__sessionBusy) return
  const image = snap.val()
  const box3  = document.getElementById("storyImage3")
  const img3  = document.getElementById("storyImageContent3")
  if (!box3 || !img3) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box3.style.display="none"; box3.style.opacity="0"; return }
  if (image) {
    img3.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box3.style.opacity = "0"; box3.style.right = "0"; box3.style.left = "auto"; box3.style.transform = ""; box3.style.display = "flex"
    if (!pnjSlotOrder.includes(3)) pnjSlotOrder.push(3)
    updatePNJPositions()
    setTimeout(() => { box3.style.opacity = "1" }, 60)
  } else {
    box3.style.opacity = "0"
    setTimeout(() => { box3.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 3); updatePNJPositions() }, 500)
  }
})

// ─── tokens ───
db.ref("tokens").on("child_added",   updateTokenFromDB)
db.ref("tokens").on("child_changed", updateTokenFromDB)

// ─── characters ───
syncCharacterSubscriptions()

// ─── map ───
db.ref("game/map").on("value", snap => {
  if (window.__sessionBusy) return
  const mapName = snap.val()
  if (!mapName) return
  window.__latestMapValue = mapName
  if(combatActive&&window.__pendingCombatOutcome?.combatId===window.__localCombatId&&!window.__combatReturnInProgress)return
  if (gameState !== GAME_STATE.GAME && gameState !== GAME_STATE.COMBAT) return

  const map  = document.getElementById("map")
  const fade = document.getElementById("fadeScreen")
  if (parseFloat(fade.style.opacity) >= 1) return

  const previousMap = currentMap
  const isFirst = firstMapLoad
  if (isFirst) firstMapLoad = false
  currentMap = mapName
  if(typeof refreshExplorationMapEvents==="function")refreshExplorationMapEvents()
  if(typeof playSharedMapAudio==="function")playSharedMapAudio(window.__explorationState?.mapAudio)
  if (previousMap && previousMap !== mapName) { closeMapLoreBookOverlay(); if (isGM) addSessionLog("🗺 Carte : " + (mapNames[mapName] || mapName)) }
  if (typeof stopBifrostFlashSound === "function") stopBifrostFlashSound()
  updateMadnessUI(window.groupMadness || 0)
  updateWorldMapFogTopLeft()
  updateMapLoreBookVisibility()
  setTimeout(() => updateBifrostBtn(), 100)

  fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = 1; fade.style.pointerEvents = "none"

  setTimeout(() => {
    map.style.backgroundImage = "url('images/" + mapName + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    updateWorldMapFogTopLeft()
    updateMapLoreBookVisibility()
    calculateMinZoom(); cameraZoom = minZoom; updateCamera()
    document.querySelectorAll(".token").forEach(t => spawnPortal(t.id))
    if (mapMusic[mapName] && !_state._pendingMapAudio) {
      const shouldKeepAuroraMusic = auroraActive && mapName !== "bifrost.jpg"
      const wantedMusic = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
      const activeMusic = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const activeName = activeMusic && activeMusic.src ? decodeURIComponent(activeMusic.src.replace(/.*\//, "").replace(/%20/g, " ")) : ""
      const wantedName = wantedMusic.replace(/.*\//, "").replace(/%20/g, " ")

      if (!shouldKeepAuroraMusic && !(activeName === wantedName && activeMusic && !activeMusic.paused && activeMusic.volume > 0.05)) {
        _musicTransitioning = false; _pendingMusic = null
        if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
        if (auroraActive && mapName === "bifrost.jpg") {
          const aurora = document.getElementById("auroraMusic")
          if (aurora) {
            aurora.pause()
            aurora.currentTime = 0
            aurora.volume = 0
          }
        }
        stopAllMusic()
        ensureMapMusicPlayback(mapName, 200)
      }
    }
  }, 800)

  setTimeout(() => {
    fade.style.transition = "opacity 1s ease"; fade.style.opacity = 0; fade.style.pointerEvents = "none"
    setTimeout(() => document.body.focus(), 100)
  }, 1200)

  setTimeout(() => {
    if (mapNames[mapName]) showLocation(mapNames[mapName])
    if (isGM && !auroraActive && Math.random() < 0.03) triggerAurora()
    if (isGM && mapName === "cimetiere.jpg" && !cemeteryEventDone) setTimeout(() => triggerCemeteryEvent(), 1500)
  }, 2200)
})

// ─── Connexion Firebase ───
db.ref(".info/connected").on("value", snap => {
  if (window.__sessionBusy) return
  const connected = !!snap.val()
  const dot   = document.getElementById("firebaseDot")
  const label = document.getElementById("firebaseDotLabel")
  if (dot) { dot.style.background = connected ? "#44ff88" : "#ff4444"; dot.style.boxShadow = connected ? "0 0 6px #44ff88" : "0 0 6px #ff4444" }
  if (label) label.textContent = connected ? "connecté" : "déconnecté"


})

// ─── endSession — signal fin de session pour les joueurs ───
db.ref("game/endSession").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  const snd  = document.getElementById("endingSound")
  const bg   = document.getElementById("endSessionBg")
  const logo = document.getElementById("endSessionLogo")
  if (isGM) return

  // Signal supprimé ou désactivé → fermer chez les joueurs aussi
  if (!data || !data.time || data.active === false) {
    if (snd) { snd.pause(); snd.currentTime = 0 }
    if (bg)   bg.style.display = "none"
    if (logo) logo.style.display = "none"
    return
  }

  if (!gameStarted) return
  if (Date.now() - data.time > 5 * 60 * 1000) return
  if (!snd || !bg || !logo) return

  stopAllMusic()
  setManagedAudioBaseVolume(snd, 1, "music")
  snd.currentTime = 0
  snd.play().catch(() => {})
  setTimeout(() => { bg.style.display = "block"; logo.style.display = "block" }, 3700)
})

// ─── newGame — signal nouvelle partie ───
db.ref("game/newGame").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time < (window.__pageLoadTime || 0)) return  // event antérieur au chargement, ignorer
  if (isGM) return  // le MJ gère lui-même
  // Réinitialiser l'état local et revenir à l'écran d'intro
  if (typeof forceCloseCharacterSheetWithoutSave === "function") forceCloseCharacterSheetWithoutSave()
  gameStarted = false
  window.isNewGame = true
  combatActive = false
  combatStarting = false
  window.__combatOutcomeShowing = false
  window.__pendingLocalDefeat = false
  myToken = null
  window.myToken = null
  stopAllMusic()
  setGameState("MENU")
  startIntro()
  showNotification("Nouvelle partie lancée par le MJ")
})

// ─── groupMadness — jauge folie du groupe ───
db.ref("game/groupMadness").on("value", snap => {
  if (window.__sessionBusy) return
  const value = Math.max(0, Math.min(100, parseInt(snap.val(), 10) || 0))
  window.groupMadness = value
  updateMadnessUI(value)
})

db.ref("game/worldMapFogTopLeftHidden").on("value", snap => {
  if (window.__sessionBusy) return
  const prevHidden = !!window.worldMapFogTopLeftHidden
  const nextHidden = !!snap.val()
  window.worldMapFogTopLeftHidden = nextHidden
  if (window.__worldMapFogTopLeftReady && !prevHidden && nextHidden) {
    revealWorldMapFogTopLeft()
  }
  window.__worldMapFogTopLeftReady = true
  updateWorldMapFogTopLeft()
})

// Le zoom sauvegardé n’est plus imposé aux participants.

db.ref("game/readLoreBooks").on("value", snap => {
  if (window.__sessionBusy) return
  window.readLoreBooksData = snap.val() || {}
})

// game/mapLoreBook : synchronisation dans exploration.js

// ─── shop ───
// game/shop : synchronisation dans exploration.js

// ─── highPNJName ───
db.ref("game/highPNJName").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.name) return
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  showHighPNJScroll(data.name)
})

// ─── fly swarm listener ───
// events/flySwarm : contrôleur de reprise partagé.

// ─── aurora ───
// events/aurora : contrôleur de reprise partagé.

// ─── bifrostFlash ───
db.ref("game/bifrostFlash").on("value", snap => {
  if (window.__sessionBusy) return
  const d = snap.val()
  if (!d) return
  if (!d.time || d.time < (window.__pageLoadTime || 0)) { void 0; return }
  doBifrostFlash()
  void 0
})

// ─── odinVision ───
db.ref("game/odinVision").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) return
  showOdinVision(data.msg)
})

// ─── powerSound ───
db.ref("game/powerSound").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) { void 0; return }
  const pInfo = playerPowerSounds[data.player]
  if (!pInfo) return
  const snd = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath(pInfo.file) : (/^(https?:|data:|blob:|\/|audio\/)/i.test(String(pInfo.file || "")) ? String(pInfo.file || "") : "audio/" + pInfo.file))
  let sndBase = 0
  setManagedAudioBaseVolume(snd, sndBase)
  snd.play().catch(() => {})
  const inIv = setInterval(() => {
    if (sndBase < 0.85) {
      sndBase = Math.min(0.85, sndBase + 0.06)
      setManagedAudioBaseVolume(snd, sndBase)
    } else clearInterval(inIv)
  }, 80)
  if (pInfo.fadeAt) {
    setTimeout(() => {
      const outIv = setInterval(() => {
        if (sndBase > 0.01) {
          sndBase = Math.max(0, sndBase - 0.06)
          setManagedAudioBaseVolume(snd, sndBase)
        } else { snd.pause(); clearInterval(outIv) }
      }, 80)
    }, pInfo.fadeAt)
  }
  void 0
})

function showMobSpecialAttackEvent(data) {
  const baseStyle = typeof getMobAnimationStyle === "function" ? getMobAnimationStyle(data.animation) : { accent:"#ff9966", glow:"rgba(255,120,60,0.55)", bg:"radial-gradient(circle at center,rgba(70,15,0,0.94) 0%,rgba(10,0,0,0.98) 72%)" }
  const presentation = typeof getMobSpecialPresentation === "function" ? getMobSpecialPresentation(data.mobName) : null
  const scene = String((presentation && presentation.scene) || "").toLowerCase()
  const style = scene === "vampire"
    ? {
        accent: "#8fd1ff",
        glow: "rgba(143,209,255,0.55)",
        bg: "radial-gradient(circle at center,rgba(26,52,98,0.86) 0%,rgba(8,18,42,0.94) 55%,rgba(2,6,18,0.99) 100%)"
      }
    : scene === "loup"
    ? {
        accent: "#a8c8f0",
        glow: "rgba(140,190,240,0.6)",
        bg: "radial-gradient(circle at 50% 40%,rgba(12,22,44,0.96) 0%,rgba(6,12,26,0.98) 55%,rgba(2,5,12,1) 100%)"
      }
    : scene === "gobelins"
    ? {
        accent: "#b8e060",
        glow: "rgba(140,200,60,0.55)",
        bg: "radial-gradient(circle at center,rgba(18,30,8,0.96) 0%,rgba(5,12,2,0.98) 60%,rgba(2,6,1,1) 100%)"
      }
    : scene === "valkyrie"
    ? {
        accent: "#ffe090",
        glow: "rgba(255,220,120,0.60)",
        bg: "radial-gradient(circle at 50% 30%,rgba(255,245,200,0.14) 0%,rgba(30,20,8,0.96) 28%,rgba(6,4,1,1) 100%)"
      }
    : scene === "liquorice"
    ? {
        accent: "#f0f0ff",
        glow: "rgba(220,220,255,0.55)",
        bg: "radial-gradient(circle at center,rgba(16,12,28,0.97) 0%,rgba(6,4,14,0.99) 60%,rgba(1,1,4,1) 100%)"
      }
    : scene === "garde"
    ? {
        accent: "#b0b8c8",
        glow: "rgba(160,170,190,0.50)",
        bg: "radial-gradient(circle at center,rgba(18,20,26,0.97) 0%,rgba(8,10,14,0.99) 60%,rgba(2,3,5,1) 100%)"
      }
    : scene === "bandit"
    ? {
        accent: "#c8a060",
        glow: "rgba(180,130,60,0.55)",
        bg: "radial-gradient(circle at center,rgba(14,10,4,0.97) 0%,rgba(4,3,1,0.99) 55%,rgba(0,0,0,1) 100%)"
      }
    : baseStyle
  const overlay = document.createElement("div")
  overlay.className = "mobSpecialOverlay" + (scene ? " mobSpecialOverlay--" + scene : "")
  overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:999999999;background:" + style.bg + ";opacity:0;transition:opacity 0.22s ease;"

  if (scene === "vampire") {
    const blueWash = document.createElement("div")
    blueWash.className = "mobSpecialBlueWash"
    overlay.appendChild(blueWash)
  }
  if (scene === "witch") {
    const wickedWash = document.createElement("div")
    wickedWash.className = "mobSpecialWickedWash"
    overlay.appendChild(wickedWash)
  }
  if (scene === "ogre") {
    const ogreWash = document.createElement("div")
    ogreWash.className = "mobSpecialOgreWash"
    overlay.appendChild(ogreWash)
  }
  if (scene === "pretre") {
    const divineWash = document.createElement("div")
    divineWash.className = "mobSpecialDivineWash"
    overlay.appendChild(divineWash)
  }
  if (scene === "chnaw") {
    const chnawWash = document.createElement("div")
    chnawWash.className = "mobSpecialChnawWash"
    overlay.appendChild(chnawWash)
  }
  if (scene === "fantome") {
    const discoWash = document.createElement("div")
    discoWash.className = "mobSpecialDiscoWash"
    overlay.appendChild(discoWash)
  }
  if (scene === "jormungand") {
    const tideWash = document.createElement("div")
    tideWash.className = "mobSpecialTideWash"
    overlay.appendChild(tideWash)
  }
  if (scene === "kraken") {
    const krakenWash = document.createElement("div")
    krakenWash.className = "mobSpecialKrakenWash"
    overlay.appendChild(krakenWash)
  }
  if (scene === "nhiddog") {
    const bloodWash = document.createElement("div")
    bloodWash.className = "mobSpecialBloodWash"
    overlay.appendChild(bloodWash)
  }
  if (scene === "fenrir") {
    const fenrirWash = document.createElement("div")
    fenrirWash.className = "mobSpecialFenrirWash"
    overlay.appendChild(fenrirWash)
  }
  if (scene === "melenchon") {
    const tricolorWash = document.createElement("div")
    tricolorWash.className = "mobSpecialTricolorWash"
    overlay.appendChild(tricolorWash)
  }

  const stage = document.createElement("div")
  stage.className = "mobSpecialStage"
  overlay.appendChild(stage)

  if (presentation && presentation.video) {
    const stageVideo = document.createElement("video")
    stageVideo.className = "mobSpecialVideo" + (scene ? " mobSpecialVideo--" + scene : "")
    stageVideo.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.video) : "images/" + presentation.video
    stageVideo.autoplay = true
    stageVideo.loop = true
    stageVideo.muted = true
    stageVideo.playsInline = true
    stageVideo.setAttribute("playsinline", "")
    stageVideo.setAttribute("muted", "")
    overlay.appendChild(stageVideo)
    stageVideo.play().catch(() => {})
  }

  const ring = document.createElement("div")
  ring.className = "mobSpecialRing" + (scene ? " mobSpecialRing--" + scene : "")
  ring.style.cssText = "position:absolute;width:min(70vw,520px);height:min(70vw,520px);border-radius:50%;border:2px solid " + style.accent + ";box-shadow:0 0 60px " + style.glow + ", inset 0 0 50px rgba(255,255,255,0.05);animation:mobSpecialPulse 0.9s ease-in-out infinite alternate;"
  overlay.appendChild(ring)

  const box = document.createElement("div")
  box.className = "mobSpecialBox" + (scene ? " mobSpecialBox--" + scene : "")
  box.style.cssText = "position:relative;z-index:1;width:min(760px,88vw);padding:36px 34px;border:1px solid " + style.accent + ";border-radius:18px;background:linear-gradient(180deg,rgba(8,8,10,0.78),rgba(0,0,0,0.9));box-shadow:0 0 80px " + style.glow + ";text-align:center;overflow:hidden;"
  overlay.appendChild(box)

  if (presentation && presentation.image) {
    const heroImage = document.createElement("img")
    heroImage.className = "mobSpecialImage" + (scene ? " mobSpecialImage--" + scene : "")
    heroImage.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.image) : "images/" + presentation.image
    heroImage.alt = ""
    box.appendChild(heroImage)
  }

  if (presentation && presentation.sparkleImage) {
    const sparkle = document.createElement("img")
    sparkle.className = "mobSpecialSparkles" + (scene ? " mobSpecialSparkles--" + scene : "")
    sparkle.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.sparkleImage) : "images/" + presentation.sparkleImage
    sparkle.alt = ""
    sparkle.onerror = () => sparkle.style.display = "none"
    box.appendChild(sparkle)
  }

  if (presentation && Array.isArray(presentation.particles)) {
    presentation.particles.forEach((particle, idx) => {
      const glyph = document.createElement("div")
      glyph.className = "mobSpecialGlyph" + (scene ? " mobSpecialGlyph--" + scene : "")
      glyph.style.left = (18 + idx * 24) + "%"
      glyph.style.animationDelay = (idx * 0.16) + "s"
      glyph.innerText = particle
      stage.appendChild(glyph)
    })
  }

  if (scene === "witch") {
    const runeLeft = document.createElement("div")
    runeLeft.className = "mobSpecialRune mobSpecialRune--left"
    runeLeft.innerText = "✦"
    stage.appendChild(runeLeft)
    const runeRight = document.createElement("div")
    runeRight.className = "mobSpecialRune mobSpecialRune--right"
    runeRight.innerText = "✧"
    stage.appendChild(runeRight)
  }

  if (scene === "melenchon") {
    const crowd = document.createElement("div")
    crowd.className = "mobSpecialCrowd"
    stage.appendChild(crowd)
  }

  if (scene === "balraug") {
    const fissure = document.createElement("div")
    fissure.className = "mobSpecialFissure"
    stage.appendChild(fissure)
    const whip = document.createElement("div")
    whip.className = "mobSpecialWhip"
    stage.appendChild(whip)
  }

  if (scene === "jormungand") {
    const wave = document.createElement("div")
    wave.className = "mobSpecialWave"
    stage.appendChild(wave)
  }

  if (scene === "kraken") {
    const wave = document.createElement("div")
    wave.className = "mobSpecialKrakenWave"
    stage.appendChild(wave)
    const crack = document.createElement("div")
    crack.className = "mobSpecialScreenCrack"
    stage.appendChild(crack)
  }

  if (scene === "nhiddog") {
    const bloodSplash = document.createElement("img")
    bloodSplash.className = "mobSpecialBloodSplash"
    bloodSplash.src = typeof resolveImagePath === "function" ? resolveImagePath("blood_splash.png") : "images/blood_splash.png"
    bloodSplash.alt = ""
    stage.appendChild(bloodSplash)
  }

  if (scene === "chnaw") {
    for (let i = 0; i < 18; i++) {
      const clone = document.createElement("img")
      clone.className = "mobSpecialClone mobSpecialClone--chnaw"
      clone.src = typeof resolveImagePath === "function" ? resolveImagePath("chnaw.png") : "images/chnaw.png"
      clone.alt = ""
      clone.style.left = (Math.random() * 88 + 2) + "%"
      clone.style.top = (Math.random() * 78 + 6) + "%"
      clone.style.animationDelay = (Math.random() * 0.72).toFixed(2) + "s"
      clone.style.animationDuration = (0.45 + Math.random() * 0.42).toFixed(2) + "s"
      clone.style.setProperty("--chnaw-rot", (Math.random() * 30 - 15).toFixed(1) + "deg")
      stage.appendChild(clone)
    }
    const photoFlash = document.createElement("div")
    photoFlash.className = "mobSpecialCameraFlash"
    overlay.appendChild(photoFlash)
  }

  if (scene === "loup" || scene === "fenrir") {
    const moonWash = document.createElement("div")
    moonWash.className = "mobSpecialMoonWash"
    overlay.appendChild(moonWash)
    const moonDisc = document.createElement("div")
    moonDisc.className = "mobSpecialMoonDisc"
    overlay.appendChild(moonDisc)
  }

  if (scene === "valkyrie") {
    // Lance qui traverse l'écran en diagonale
    const spear = document.createElement("div")
    spear.className = "mobSpecialValkyireSpear"
    overlay.appendChild(spear)

    // Flash divin au moment de l'impact
    setTimeout(() => {
      const divFlash = document.createElement("div")
      divFlash.className = "mobSpecialValkyrieDivineFlash"
      overlay.appendChild(divFlash)
      setTimeout(() => divFlash.remove(), 800)
    }, 520)

    // Plumes qui tombent
    for (let i = 0; i < 22; i++) {
      const feather = document.createElement("div")
      feather.className = "mobSpecialFeather"
      feather.style.left = (Math.random() * 100) + "%"
      feather.style.animationDuration = (2.0 + Math.random() * 2.5) + "s"
      feather.style.animationDelay = (0.4 + Math.random() * 3.0) + "s"
      feather.style.fontSize = (10 + Math.random() * 10) + "px"
      feather.style.opacity = String(0.4 + Math.random() * 0.5)
      feather.innerText = "❧"
      overlay.appendChild(feather)
    }
  }

  if (scene === "liquorice") {
    const saltCount = 60
    for (let i = 0; i < saltCount; i++) {
      const grain = document.createElement("div")
      grain.className = "mobSpecialSaltGrain"
      grain.style.left = (Math.random() * 100) + "%"
      grain.style.animationDuration = (1.2 + Math.random() * 2.2) + "s"
      grain.style.animationDelay = (Math.random() * 3.5) + "s"
      grain.style.width = grain.style.height = (2 + Math.random() * 3) + "px"
      grain.style.opacity = String(0.5 + Math.random() * 0.5)
      overlay.appendChild(grain)
    }
  }

  if (scene === "bandit" && presentation && Array.isArray(presentation.slideImages) && presentation.slideImages.length) {
    // Positions éparpillées : [left%, top%, rotation]
    const positions = [
      [10,  6,  -6],
      [62, 4,   5],
      [12,  50, -4],
      [64, 48,  7]
    ]
    presentation.slideImages.forEach((src, i) => {
      const [l, t, r] = positions[i] || [10 + i * 22, 10 + i * 18, 0]
      const wrap = document.createElement("div")
      wrap.style.cssText = "position:absolute;left:" + l + "%;top:" + t + "%;transform:rotate(" + r + "deg);z-index:0;pointer-events:none;"
      const img = document.createElement("img")
      img.className = "mobSpecialBanditImg"
      img.alt = ""
      img.src = (typeof resolveImagePath === "function") ? resolveImagePath(src) : "images/" + src
      img.style.animationDelay = (i * 0.1) + "s"
      wrap.appendChild(img)
      overlay.appendChild(wrap)
    })
  }

  if (scene === "gobelins") {
    const bombXs = [18, 46, 72]
    bombXs.forEach((xPct, i) => {
      const bomb = document.createElement("img")
      bomb.className = "mobSpecialBomb"
      bomb.src = "images/bombe.png"
      bomb.alt = ""
      bomb.onerror = () => bomb.style.display = "none"
      bomb.style.left = xPct + "%"
      bomb.style.animationDelay = (i * 0.3) + "s"
      overlay.appendChild(bomb)

      const expl = document.createElement("div")
      expl.className = "mobSpecialExplosion"
      expl.style.left = xPct + "%"
      expl.style.animationDelay = (0.48 + i * 0.3) + "s"
      overlay.appendChild(expl)

      // Fumée principale
      const smoke = document.createElement("div")
      smoke.className = "mobSpecialSmoke"
      smoke.style.left = xPct + "%"
      smoke.style.animationDelay = (0.62 + i * 0.3) + "s"
      overlay.appendChild(smoke)

      // 2e nuage plus large
      const smoke2 = document.createElement("div")
      smoke2.className = "mobSpecialSmoke mobSpecialSmoke--wide"
      smoke2.style.left = xPct + "%"
      smoke2.style.animationDelay = (0.74 + i * 0.3) + "s"
      overlay.appendChild(smoke2)

      // Son bombe au moment de l'impact
      setTimeout(() => {
        const bSnd = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("bombe.mp3") : "audio/bombe.mp3")
        if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(bSnd, 0.68)
        bSnd.play().catch(() => {})
      }, 480 + i * 300)
    })
  }

  if (!["vampire", "melenchon", "ogre", "pretre", "chnaw", "fantome", "fenrir", "jormungand", "kraken", "nhiddog"].includes(scene)) {
    const icon = document.createElement("div")
    icon.style.cssText = "position:relative;z-index:2;font-size:64px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 0 18px " + style.accent + ");"
    icon.innerText = String(data.icon || "✦")
    box.appendChild(icon)
  }

  const mobName = document.createElement("div")
  mobName.style.cssText = "position:relative;z-index:2;font-family:Cinzel,serif;font-size:12px;letter-spacing:4px;color:" + style.accent + ";margin-bottom:10px;"
  mobName.innerText = String(data.mobName || "")
  box.appendChild(mobName)

  const title = document.createElement("div")
  title.style.cssText = "position:relative;z-index:2;font-family:'Cinzel Decorative',serif;font-size:clamp(26px,3.8vw,42px);color:#fff3df;text-shadow:0 0 22px " + style.accent + ";margin-bottom:14px;"
  title.innerText = String(data.attackName || "")
  box.appendChild(title)

  if (presentation && presentation.kicker) {
    const kicker = document.createElement("div")
    kicker.className = "mobSpecialKicker"
    kicker.style.color = style.accent
    kicker.innerText = String(presentation.kicker)
    box.appendChild(kicker)
  }

  if (data.flavor) {
    let flavorHost = box
    if (presentation && presentation.quoteFrame) {
      const frame = document.createElement("img")
      frame.className = "mobSpecialQuoteFrame" + (scene ? " mobSpecialQuoteFrame--" + scene : "")
      frame.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.quoteFrame) : "images/" + presentation.quoteFrame
      frame.alt = ""
      frame.onerror = () => frame.style.display = "none"
      box.appendChild(frame)
      const quoteWrap = document.createElement("div")
      quoteWrap.className = "mobSpecialQuoteWrap" + (scene ? " mobSpecialQuoteWrap--" + scene : "")
      box.appendChild(quoteWrap)
      flavorHost = quoteWrap
    }
    const flavor = document.createElement("div")
    flavor.style.cssText = "position:relative;z-index:2;font-family:'IM Fell English',serif;font-size:clamp(18px,2.5vw,28px);line-height:1.45;color:#ffd7c2;max-width:620px;margin:0 auto 18px auto;"
    flavor.innerText = String(data.flavor)
    flavorHost.appendChild(flavor)
  }

  const damage = document.createElement("div")
  damage.style.cssText = "position:relative;z-index:2;font-family:Cinzel,serif;font-size:30px;font-weight:bold;color:" + style.accent + ";text-shadow:0 0 18px " + style.accent + ";"
  damage.innerText = "→ " + String(data.target || "") + "  •  -" + clampInteger(data.dmg, 0, 9999) + " HP"
  box.appendChild(damage)

  let sceneAudio = null
  if (presentation && presentation.sound) {
    sceneAudio = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath(presentation.sound) : "audio/" + presentation.sound)
    const specialVolume = Number.isFinite(parseFloat(presentation.soundVolume)) ? parseFloat(presentation.soundVolume) : 0.82
    setManagedAudioBaseVolume(sceneAudio, specialVolume)
    sceneAudio.play().catch(() => {})
  }
  if (scene === "balraug") {
    setTimeout(() => {
      const whipAudio = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("whip.mp3") : "audio/whip.mp3")
      if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(whipAudio, 0.88)
      else whipAudio.volume = 0.88
      whipAudio.play().catch(() => {})
    }, 140)
  }

  const impactFlash = document.createElement("div")
  impactFlash.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at center, rgba(255,255,255,0.22), rgba(255,255,255,0.06) 28%, transparent 62%);mix-blend-mode:screen;"
  overlay.appendChild(impactFlash)

  document.body.appendChild(overlay)
  setTimeout(() => { overlay.style.opacity = "1" }, 20)
  setTimeout(() => { playSound("powSound", 0.84) }, 80)
  setTimeout(() => {
    impactFlash.style.transition = "opacity 0.12s ease"
    impactFlash.style.opacity = "1"
    setTimeout(() => {
      impactFlash.style.transition = "opacity 0.4s ease"
      impactFlash.style.opacity = "0"
    }, 90)
  }, 75)
  setTimeout(() => screenShakeHard(), 40)
  setTimeout(() => screenShakeHard(), 150)
  setTimeout(() => screenShake(), 310)
  setTimeout(() => screenShakeHard(), 520)
  setTimeout(() => screenShake(), 760)
  if (scene === "gobelins") {
    setTimeout(() => screenShakeHard(), 480)
    setTimeout(() => screenShakeHard(), 780)
    setTimeout(() => screenShakeHard(), 1080)
  }
  setTimeout(() => {
    overlay.style.opacity = "0"
    setTimeout(() => { if (overlay.parentNode) overlay.remove() }, 450)

  }, 6000)
  screenShakeHard()
  if (!scene || ["draugr", "ogre", "melenchon", "balraug", "dragon", "gobelins", "fenrir", "kraken", "jormungand", "nhiddog"].includes(scene)) screenShakeHard()
}

// ─── mobAttackEvent ───
function showMobAttackPresentation(data) {
  if (data.special) {
    showMobSpecialAttackEvent(data)
    return
  }
  const notif = document.createElement("div")
  notif.className = "combatEventCard"
  notif.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;opacity:0;transition:opacity 0.3s ease;"
  const ring = document.createElement("img")
  ring.src = "images/impact_ring.png"
  ring.className = "combatEventRing"
  ring.alt = ""
  ring.onerror = () => ring.style.display = "none"
  notif.appendChild(ring)
  const slash = document.createElement("img")
  slash.src = "images/slash_overlay.png"
  slash.className = "combatEventSlash"
  slash.alt = ""
  slash.onerror = () => slash.style.display = "none"
  notif.appendChild(slash)
  const panel = document.createElement("div")
  panel.className = "combatEventPanel"
  const icon = document.createElement("img")
  if (typeof createCombatIcon === "function") {
    const mapped = createCombatIcon({ name:data.attackName, effect:data.effect, type:data.type, animation:data.animation }, { name:data.mobName }, "combatEventIcon")
    icon.src = mapped.getAttribute("src") || ""
  } else {
    icon.src = "images/slash_overlay.png"
  }
  icon.className = "combatEventIcon"
  icon.alt = ""
  icon.onerror = () => icon.style.display = "none"
  panel.appendChild(icon)
  if (data.mobName) {
    const mobName = document.createElement("div")
    mobName.className = "combatEventMobName"
    mobName.innerText = String(data.mobName)
    panel.appendChild(mobName)
  }
  const attackName = document.createElement("div")
  attackName.className = "combatEventAttackName"
  attackName.innerText = String(data.attackName || "")
  panel.appendChild(attackName)
  const targetLine = document.createElement("div")
  targetLine.className = "combatEventTarget"
  targetLine.appendChild(document.createTextNode("Cible "))
  const targetStrong = document.createElement("span")
  targetStrong.className = "combatEventTargetName"
  targetStrong.innerText = String(data.target || "")
  targetLine.appendChild(targetStrong)
  panel.appendChild(targetLine)
  const damage = document.createElement("div")
  damage.className = "combatEventDamage"
  damage.innerText = "-" + clampInteger(data.dmg, 0, 9999) + " HP"
  panel.appendChild(damage)
  notif.appendChild(panel)
  document.body.appendChild(notif)
  setTimeout(() => { notif.style.opacity = "1" }, 30)
  setTimeout(() => {
    notif.style.opacity = "0"
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 500)

  }, 2800)
  screenShakeHard()
  playSound("powerSound", 0.52)

}
window.showMobAttackPresentation=showMobAttackPresentation
db.ref("game/mobAttackEvent").on("value",snap=>{
  const data=snap.val()
  if(!window.__sessionBusy && data?.time >= (window.__pageLoadTime||0))enqueueSharedVisual("legacy-mob-"+data.time,()=>showMobAttackPresentation(data),data.special?7000:3400)
})

// ─── curse/wheel ───
db.ref("curse/wheel").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) {
    window.__curseWheelTriggeredFor = null
    window.__activeCurseWheel = null
    if(typeof presentSavedCurseWheel==="function")presentSavedCurseWheel(null)
    return
  }
  presentSavedCurseWheel(data)
})

function cleanupRuneChallengeUI() {
  const overlay = document.getElementById("runeChallengeOverlay")
  if (overlay) overlay.remove()
  const playerBtn = document.getElementById("playerCodeBtn")
  if (playerBtn) playerBtn.remove()
  window.activeRuneChallengeData = null
  _state.runeJustOpened = false
}

// ─── runeChallenge ───
db.ref("game/runeChallenge").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  const previous = window.activeRuneChallengeData || null
  window.activeRuneChallengeData = data || null
  if (!data || !data.active) {
    cleanupRuneChallengeUI()
    updateRuneMenuBtn(false)
    updateThuumButton()
    return
  }
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  updateRuneMenuBtn(true)
  const overlay = document.getElementById("runeChallengeOverlay")
  const shouldOpenFresh =
    !previous ||
    !previous.active ||
    previous.time !== data.time
  if (overlay) {
    overlay.remove()
    renderRuneChallenge(data)
  } else if (shouldOpenFresh) {
    renderRuneChallenge(data)
  }
  if (isGM && shouldOpenFresh && !_state.runeJustOpened) _state.runeJustOpened = true
  updateThuumButton()
})

function ensureCemeteryGlyphIntro() {
  let g = document.getElementById("glipheOverlay")
  if (!g) {
    g = document.createElement("div")
    g.id = "glipheOverlay"
    g.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999990;opacity:0;transition:opacity 1s ease;"
    const im = document.createElement("img")
    im.src = (typeof resolveImagePath === "function") ? resolveImagePath("gliphe.png") : "images/gliphe.png"
    im.style.cssText = "max-height:70vh;max-width:70vw;object-fit:contain;filter:drop-shadow(0 0 30px purple);"
    g.appendChild(im)
    document.body.appendChild(g)
    const s2 = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("spell.mp3") : "audio/spell.mp3")
    setManagedAudioBaseVolume(s2, 0.9)
    s2.play().catch(() => {})
  }
  setTimeout(() => { g.style.opacity = "1" }, 50)
  setTimeout(() => {
    if (typeof startSpellAura === "function") startSpellAura()
  }, 1000)
}

// ─── cemeterySpell ───
// game/cemeterySpell : synchronisation dans exploration.js

// ─── playerDeath ───
db.ref("game/playerDeath").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) return
  const pid = data.player
  deadPlayers[pid] = true
  const tok = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === String(pid || "").toLowerCase())
  if (tok) {
    tok.classList.add("playerDead")
    if (!document.getElementById("skull_" + pid)) {
      const skull = document.createElement("div"); skull.id = "skull_" + pid
      skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
      skull.innerText = "💀"; tok.appendChild(skull)
    }
  }
  showNotification(pid.toUpperCase() + " est tombé !")
  const snd = new Audio("audio/defaite.mp3"); setManagedAudioBaseVolume(snd, 0.6); snd.play().catch(() => {})
  screenShakeHard()
  if (!isGM && getLocalPlayerId() === String(pid || "").toLowerCase()) triggerLocalDefeat("playerDeath")
  if (isGM) {
      // Un KO individuel ne remplace pas l’issue collective du combat.
      if (!document.getElementById("revive_" + pid)) {
        const revBtn = document.createElement("button"); revBtn.id = "revive_" + pid
      revBtn.style.cssText = "position:fixed;bottom:104px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 24px;font-family:'Cinzel Decorative',serif;font-size:13px;background:linear-gradient(rgba(0,80,0,0.8),rgba(0,40,0,0.8));color:#88ff88;border:2px solid rgba(50,180,50,0.6);border-radius:6px;cursor:pointer;letter-spacing:2px;animation:bifrostPulse 1.5s ease-in-out infinite alternate;"
      revBtn.innerText = "✦ Ressusciter " + pid.toUpperCase()
      revBtn.onclick = () => { revivePlayer(pid); revBtn.remove() }
      document.body.appendChild(revBtn)
    }
  }
  if (isGM) setTimeout(() => db.ref("game/playerDeath").remove(), 1200)
  })

// ─── combatOutcome — victoire/défaite fiable côté joueurs ───
// Fin de combat : combat-exit.js, sans filtre sur le héros local.

// ─── playerRevive ───
db.ref("game/playerRevive").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (!data.time || data.time < (window.__pageLoadTime || 0)) return
  const pid = data.player
  const tok = document.getElementById(pid)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + pid)
    if (skull) { skull.style.transition = "opacity 0.5s"; skull.style.opacity = "0"; setTimeout(() => skull.remove(), 500) }
  }
  deadPlayers[pid] = false
  if (!isGM && getLocalPlayerId() === String(pid || "").toLowerCase() && !window.__combatOutcomeQueued && !window.__combatOutcomeShowing) {
    window.__pendingLocalDefeat = false
    window.__combatOutcomeShowing = false
    const defeatScreen = document.getElementById("defeatScreen")
    if (defeatScreen) defeatScreen.style.display = "none"
  }
  const revBtn = document.getElementById("revive_" + pid)
  if (revBtn) revBtn.remove()
  void 0
})

// ─── mob2 et mob3 ───
;["mob2", "mob3"].forEach(slot => {
  db.ref("combat/" + slot).on("value", snap => {
  if (window.__sessionBusy) return
    const data = snap.val()
    activeMobSlots[slot] = !!data
    const existing = document.getElementById("mobToken_" + slot)
    if (existing) existing.remove()
    if (data && (gameState === "COMBAT" || gameState === "GAME")) {
      spawnExtraMobToken(data, slot)
      renderAllMobPanels()
    }
  })
})

db.ref("combat/eloSummon").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  const wasActive = !!(window.__eloSummonState && window.__eloSummonState.active)
  window.__eloSummonState = data || null
  const existing = document.getElementById("eloSummonToken")
  if (!combatActive || !data || !data.active) {
    if (existing) existing.remove()
    return
  }
  if (!wasActive) {
    const porkSnd = new Audio("audio/pork.mp3")
    if (typeof setManagedAudioBaseVolume === "function") setManagedAudioBaseVolume(porkSnd, 0.78)
    else porkSnd.volume = 0.78
    porkSnd.play().catch(() => {})
  }
  if (typeof spawnEloSummonToken === "function") spawnEloSummonToken(data)
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

function ensureTokenStateBadgeContainer(token) {
  if (!token) return null
  let container = token.querySelector(".tokenStateBadges")
  if (!container) {
    container = document.createElement("div")
    container.className = "tokenStateBadges"
    token.appendChild(container)
  }
  return container
}

function setTokenStateBadges(tokenId, badges) {
  const token = document.getElementById(tokenId)
  if (!token) return
  const container = ensureTokenStateBadgeContainer(token)
  if (!container) return
  container.innerHTML = ""
  ;(badges || []).forEach(badge => {
    const el = document.createElement("div")
    el.className = "tokenStateBadge tokenStateBadge--" + (badge.kind || "buff")
    el.innerText = badge.label || "?"
    el.title = badge.title || badge.label || ""
    container.appendChild(el)
  })
}

function clearCombatTokenStateVisuals() {
  ;["greg","ju","elo","bibi","mobToken","eloSummonToken"].forEach(id => {
    const token = document.getElementById(id)
    if (!token) return
    token.classList.remove("token--active-turn", "token--aggro", "token--marked")
    const badges = token.querySelector(".tokenStateBadges")
    if (badges) badges.innerHTML = ""
  })
}

function resetLocalCombatVisualState() {
  window.__combatTurnState = null
  window.__combatYuAggroState = null
  window.__combatSpiderSenseBuffState = null
  window.__combatBibiRageState = null
  window.__combatAttackMalusState = null
  window.__combatPlayerPoisonState = null
  window.__combatPlayerBleedState = null
  window.__eloSummonState = null
  clearCombatTokenStateVisuals()
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
}

function cleanupTransientGameUI(options = {}) {
  const {
    closeSavePanel = false
  } = options

  combatActive = false
  combatStarting = false
  window.__combatOutcomeShowing = false
  window.__pendingLocalDefeat = false
  window.__combatInitiativeHidden = false

  resetLocalCombatVisualState()
  resetMadnessPresentation()
  if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
  if (typeof closeMapLoreBookOverlay === "function") closeMapLoreBookOverlay()
  if (typeof closeCombatInitiativeOverlay === "function") closeCombatInitiativeOverlay()

  const initiativeToggle = document.getElementById("combatInitiativeToggle")
  if (initiativeToggle) initiativeToggle.remove()

  ;[
    "mobAttackPanel",
    "allyPNJPanel",
    "allyViewerPanel",
    "runeChallengeOverlay",
    "spellMiniGame",
    "curseIntroScreen",
    "curseWheelScreen",
    "documentOverlay"
  ].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.remove()
  })

  const combatArena = document.getElementById("combatArena"); if (combatArena) combatArena.style.display = "none"
  const combatGrid = document.getElementById("combatGrid"); if (combatGrid) combatGrid.style.display = "none"
  const combatFilter = document.getElementById("combatFilter"); if (combatFilter) combatFilter.style.display = "none"
  const defeatScreen = document.getElementById("defeatScreen"); if (defeatScreen) defeatScreen.style.display = "none"
  const fade = document.getElementById("fadeScreen"); if (fade) { fade.style.opacity = "0"; fade.style.pointerEvents = "none" }

  document.querySelectorAll("[id^='revive_']").forEach(btn => btn.remove())

  if (closeSavePanel) {
    const panel = document.getElementById("savePanel")
    if (panel) panel.remove()
  }

  updateMadnessVisibility()
  updateThuumButton()
}

function finalizeNewGameLocally() {
  gameStarted = false
  window.isNewGame = true
  window.__curseWheelTriggeredFor = null
  cemeteryEventDone = false
  odinVisionShown = false
  window.playerThuumData = {}
  window.playerThuumAccessData = {}
  window.mapLoreBookData = null
  window.readLoreBooksData = {}
  deadPlayers = {}
  pendingLevelUp = {}
  lastLevel = {}
  lastHP = {}
  stopAllMusic()
  cleanupTransientGameUI()
}

function updateCombatTokenStateVisuals() {
  if (!combatActive) {
    clearCombatTokenStateVisuals()
    return
  }

  const activeActorId = (typeof getCurrentCombatActorId === "function" ? getCurrentCombatActorId() : null) || ""
  ;["greg","ju","elo","bibi","mobToken","eloSummonToken"].forEach(id => {
    const token = document.getElementById(id)
    if (token) token.classList.remove("token--active-turn")
  })

  const activeTokenMap = {
    greg: "greg",
    ju: "ju",
    elo: "elo",
    bibi: "bibi",
    mob: "mobToken"
  }
  const activeTokenId = activeTokenMap[activeActorId] || (activeActorId === "eloSummon" ? "eloSummonToken" : "")
  if (activeTokenId) {
    const activeToken = document.getElementById(activeTokenId)
    if (activeToken && combatActive) activeToken.classList.add("token--active-turn")
  }

  const yuToken = document.getElementById("ju")
  if (yuToken) {
    const aggroTurns = parseInt(window.__combatYuAggroState?.turns, 10) || 0
    const spiderSense = !!(window.__combatSpiderSenseBuffState && window.__combatSpiderSenseBuffState.active)
    yuToken.classList.toggle("token--aggro", combatActive && aggroTurns > 0)
    const yuBadges = []
    if (aggroTurns > 0) {
      yuBadges.push({
        kind: "warn",
        label: "AGGRO " + aggroTurns,
        title: "Yu attire le mob pendant encore " + aggroTurns + " tour(s)"
      })
    }
    if (spiderSense) {
      yuBadges.push({
        kind: "buff",
        label: "SENSE",
        title: "Spider Sense est actif pour tout le combat"
      })
    }
    if (activeActorId === "ju") {
      yuBadges.unshift({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour de Yu"
      })
    }
    setTokenStateBadges("ju", yuBadges)
  }

  const gregToken = document.getElementById("greg")
  if (gregToken) {
    const gregBadges = []
    if (window.__combatBibiRageState && parseInt(window.__combatBibiRageState.turns, 10) > 0) {
      gregBadges.push({
        kind: "buff",
        label: "BIBI " + (parseInt(window.__combatBibiRageState.turns, 10) || 0),
        title: "Le Bibi renforce les attaques alliées"
      })
    }
    if (activeActorId === "greg") {
      gregBadges.unshift({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour de Greg"
      })
    }
    setTokenStateBadges("greg", gregBadges)
  }

  const eloToken = document.getElementById("elo")
  if (eloToken) {
    const eloBadges = []
    if (window.__eloSummonState && window.__eloSummonState.active) {
      eloBadges.push({
        kind: "ally",
        label: "PORK+",
        title: "John Pork renforce les dégâts d'Elo"
      })
    }
    if (activeActorId === "elo") {
      eloBadges.unshift({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour d'Elo"
      })
    }
    setTokenStateBadges("elo", eloBadges)
  }

  const bibiToken = document.getElementById("bibi")
  if (bibiToken) {
    const bibiBadges = []
    if (activeActorId === "bibi") {
      bibiBadges.push({
        kind: "buff",
        label: "TOUR",
        title: "C'est le tour de Bibi"
      })
    }
    setTokenStateBadges("bibi", bibiBadges)
  }

  const mobToken = document.getElementById("mobToken")
  if (mobToken) {
    const poisonTurns = parseInt(window.__combatPlayerPoisonState?.turns, 10) || 0
    const bleedTurns = parseInt(window.__combatPlayerBleedState?.turns, 10) || 0
    const malusTurns = parseInt(window.__combatAttackMalusState?.turns, 10) || 0
    const revealedWeakness = window.__combatRevealedWeaknessState
    const badges = []
    if (activeActorId === "mob") badges.push({ kind: "warn", label: "TOUR", title: "C'est le tour du mob" })
    if (poisonTurns > 0) badges.push({ kind: "warn", label: "POI " + poisonTurns, title: "Poison actif" })
    if (bleedTurns > 0) badges.push({ kind: "warn", label: "SAI " + bleedTurns, title: "Saignement actif" })
    if (malusTurns > 0) badges.push({ kind: "warn", label: "ATK-" + (parseInt(window.__combatAttackMalusState?.amount, 10) || 1), title: "Attaque réduite" })
    if (revealedWeakness && revealedWeakness.title) badges.push({ kind: "warn", label: "FAILLE", title: revealedWeakness.title + " — " + (revealedWeakness.text || "") })
    mobToken.classList.toggle("token--marked", badges.length > 0)
    setTokenStateBadges("mobToken", badges)
  }

  const summonToken = document.getElementById("eloSummonToken")
  if (summonToken) {
    const summon = window.__eloSummonState
    const summonTurns = parseInt(summon?.turnsLeft, 10) || 0
    const summonHp = parseInt(summon?.hp, 10) || 0
    const badges = summon && summon.active ? [
      { kind: "ally", label: activeActorId === "eloSummon" ? "TOUR" : "PORK", title: activeActorId === "eloSummon" ? "C'est le tour de John Pork" : "John Pork est présent" },
      { kind: "ally", label: "PORK " + summonTurns, title: "John Pork actif pendant " + summonTurns + " tour(s)" },
      { kind: "ally", label: "HP " + summonHp, title: "Points de vie de John Pork" }
    ] : []
    setTokenStateBadges("eloSummonToken", badges)
  }
}

db.ref("combat/mob/yuAggro").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatYuAggroState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/spiderSenseBuff").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatSpiderSenseBuffState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/revealedWeakness").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatRevealedWeaknessState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("game/defeatedMobs").on("value", snap => {
  if (window.__sessionBusy) return
  window.__defeatedMobFlags = snap.val() || {}
})


db.ref("combat/mob/bibiRage").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatBibiRageState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/attackMalus").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatAttackMalusState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/playerPoison").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatPlayerPoisonState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

db.ref("combat/mob/playerBleed").on("value", snap => {
  if (window.__sessionBusy) return
  window.__combatPlayerBleedState = snap.val() || null
  if (typeof renderCombatStatusPanel === "function") renderCombatStatusPanel()
  if (typeof updateCombatTokenStateVisuals === "function") updateCombatTokenStateVisuals()
})

// ─── elements ───
db.ref("elements").on("child_added", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (data && (gameState === "GAME" || gameState === "COMBAT")) renderMapElement(data)
})
db.ref("elements").on("child_changed", snap => {
  if (window.__sessionBusy) return
  const data = snap.val(); if (!data) return
  const el = document.getElementById("elem_" + data.id)
  if (el) { el.style.left = data.x + "px"; el.style.top = data.y + "px" }
})
db.ref("elements").on("child_removed", snap => {
  const el = document.getElementById("elem_" + snap.key)
  if (el) { el.style.transition = "opacity 0.4s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 400) }
})

function syncMapElementsFromDB() {
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  document.querySelectorAll("[id^='elem_']").forEach(el => el.remove())
  db.ref("elements").once("value", snap => {
    const data = snap.val()
    if (!data) return
    Object.values(data).forEach(item => {
      if (item) renderMapElement(item)
    })
  })
}

function syncWantedStateFromDB() {
  return db.ref("game").once("value").then(snap=>syncSharedExplorationState(snap.val()||{}))
}

// ─── wantedPosters ───
// game/wantedPosters : synchronisation dans exploration.js

// ─── wantedOpen ───
// game/wantedOpen : synchronisation dans exploration.js

// ─── wantedBoardOpen ───
// game/wantedBoardOpen : synchronisation dans exploration.js

// ─── simonState ───
db.ref("game/simonState").on("value", snap => {
  if (window.__sessionBusy) return
  const simon = snap.val(); if (!simon || gameState !== "GAME") return
  db.ref("game/cemeterySpell").once("value", s => {
    const spell = s.val()
    if (!spell || !spell.glipheShown || spell.freed) return
    if(typeof showSimonGame==="function")showSimonGame(spell,simon)
  })
})

// ─── document — indices / notes ───
// game/document : synchronisation dans exploration.js

// ─── playerAllyAccess — bouton invocations donné par le MJ ───
db.ref("game/playerAllyAccess").on("value", snap => {
  if (window.__sessionBusy) return
  if (isGM) return
  const data = snap.val()
  window.playerAllyAccessData = data || null
  const existing = document.getElementById("allyViewerPanel")

  if (!data && existing) existing.remove()
  updateThuumButton()
})

// ─── playerThuum — cris débloqués ───
db.ref("game/playerThuum").on("value", snap => {
  if (window.__sessionBusy) return
  window.playerThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

db.ref("game/playerThuumAccess").on("value", snap => {
  if (window.__sessionBusy) return
  window.playerThuumAccessData = snap.val() || {}
  updateThuumButton()
})

// ─── usedThuum — cooldown par combat ───
db.ref("combat/usedThuum").on("value", snap => {
  if (window.__sessionBusy) return
  window.usedThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

// ─── thuumUnlockEvent — découverte globale ───
db.ref("game/thuumUnlockEvent").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumUnlockTime) return
  if (Date.now() - data.time > 8000) { void 0; return } // purge donnée obsolète
  window.__lastThuumUnlockTime = data.time
  showThuumUnlockCinematic(data)
  setTimeout(updateThuumButton, 250)
  setTimeout(updateThuumButton, 1200)
})

// ─── thuumCast — utilisation globale ───
db.ref("game/thuumCast").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumCastTime) return
  window.__lastThuumCastTime = data.time
  if(data.outsideCombat !== false)enqueueSharedVisual("thuum-"+data.time,()=>playThuumCastEffect(data),2000)
})

// ─── allyBroadcast — cinématique invocation alliée (visible par tous) ───
db.ref("combat/allyBroadcast").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (typeof showAllyActionResult === "function") showAllyActionResult(data)
})

// ─── allyAction — PNJ allié en combat (legacy, gardé pour compatibilité) ───
db.ref("game/allyAction").on("value", snap => {
  if (window.__sessionBusy) return
  const data = snap.val()
  if (!data) return
  if (typeof showAllyActionResult === "function") showAllyActionResult(data)
})

// ─── mapAudio — musique spécifique à la map ───
// game/mapAudio : contrôleur de reprise partagé.

}) // fin DOMContentLoaded

/* ========================= */
/* FLY SWARM                 */
/* ========================= */

function triggerFlySwarm() {
  if(!isGM)return
  db.ref("events/flySwarm").set({ active: true, time: Date.now() })
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
}

function stopFlySwarm() {
  if(!isGM)return
  db.ref("events/flySwarm").remove()
}

/* ========================= */
/* TOKENS                    */
/* ========================= */

function getMaxHP(playerId, level) {
  const s = getPlayerStatsAtLevel(playerId, level || 1)
  return s ? s.hp : 100
}

function getMaxCarryWeight(playerId, level, data = null) {
  const source = data || {}
  const lvl = Math.max(1, parseInt(level ?? source.lvl, 10) || 1)
  const stats = (typeof getPlayerStatsAtLevel === "function") ? getPlayerStatsAtLevel(playerId, lvl) : null
  return Math.max(1, parseInt(source.poids, 10) || parseInt(stats?.poids, 10) || 100)
}

function isCharacterOverweight(playerId, data = null) {
  const source = data || {}
  const inventoryText = String(source.inventaire || "")
  const weight = Object.prototype.hasOwnProperty.call(source, "inventaire") && typeof _parseInventoryWeight === "function"
    ? _parseInventoryWeight(inventoryText) : Math.max(0, Number(source.carriedWeight) || 0)
  const maxWeight = getMaxCarryWeight(playerId, source.lvl, source)
  return {
    overweight: weight > maxWeight,
    weight,
    maxWeight
  }
}

function updateTokenFromDB(snapshot) {
  if (window.__sessionBusy) return
  const id   = snapshot.key
  const data = snapshot.val()
  if (!data) return
  window.__tokenPositions ||= {}; window.__tokenPositions[id]=data
  if(combatActive&&window.__pendingCombatOutcome?.combatId===window.__localCombatId&&!window.__combatReturnInProgress)return
  if (selected?.id === id && _state.tokenDragging) return
  const token = document.getElementById(id)
  if (!token) return
  const currentX = parseInt(token.style.left) || 0
  const currentY = parseInt(token.style.top)  || 0
  if (id === "bibi") { tokenFollowLabel(data) }
  if(!Number.isFinite(data.x)||!Number.isFinite(data.y))return
  token.style.left = data.x + "px"
  token.style.top  = data.y + "px"
  if (data.facing === 1) token.classList.add("faceLeft")
  else if (data.facing === 0) token.classList.remove("faceLeft")
  updateTokenStats(id)
  if (data.hp !== undefined) {
    if (id === "greg" && data.hp < 50) showBibiSpeech("Miiii !")
    db.ref("characters/" + id + "/lvl").once("value", lvlSnap => {
      const lvl   = parseInt(lvlSnap.val()) || 1
      const maxHP = getMaxHP(id, lvl)
      const bar   = document.getElementById("hp_" + id)
      if (bar) bar.style.width = Math.max(0, Math.min(100, (data.hp / maxHP) * 100)) + "%"
    })
    updateTokenGlow(id, data.hp)
    if (lastHP[id] !== undefined && data.hp < lastHP[id]) damageEffect(id)
    lastHP[id] = data.hp
  }
}

function updateTokenStats(id) {
  const stats = document.getElementById("stats_" + id)
  if (!stats) return
  readCharacter(id, snapshot => {
    const data = snapshot.val(); if (!data) return
    const hp         = data.hp || 0
    const curse      = data.curse || 0
    const corruption = data.corruption || 0
    const lvl        = data.lvl || 1

    const token     = document.getElementById(id)
    const { weight, maxWeight, overweight } = isCharacterOverweight(id, data)
    if (token) {
      token.classList.toggle("overweight", overweight)
      if (id !== "bibi" && (data.curse || 0) >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
      else                        { token.classList.remove("cursed"); stopBloodEffect(token)  }
    }

    const maxHP   = getMaxHP(id, lvl)
    const hpColor = hp > maxHP * 0.6 ? "#3cff6b" : hp > maxHP * 0.3 ? "#ffb347" : "#ff4040"
    let curseIcons = "", powerIcon = ""
    if (id !== "bibi") {
      for (let i = 0; i < curse; i++) curseIcons += "☠"
      powerIcon = corruption >= 10 ? "✨" : ""
    }

    stats.innerHTML = `
      <div class="powerText">⭐ Niv ${lvl}</div>
      <div class="hpText" style="color:${hpColor}">❤️ ${hp}/${maxHP}</div>
      ${weight > 0 ? `<div class="weightText">🎒 ${weight}${overweight ? ` <span class="overweightInline">SURCHARGÉ</span>` : ""}</div>` : (overweight ? `<div class="overweightText">SURCHARGÉ</div>` : "")}
      ${curseIcons ? `<div class="curseText">${curseIcons}</div>` : ""}
      ${powerIcon  ? `<div class="powerText">${powerIcon}</div>` : ""}
    `

    const bar = document.getElementById("hp_" + id)
    if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
    updateTokenGlow(id, hp)
  })
}

function updateTokenHP() {
  if (!myToken) return
  const hp = parseInt(document.getElementById("hp").value) || 0
  db.ref("characters/" + myToken.id + "/lvl").once("value", lvlSnap => {
    const lvl   = parseInt(lvlSnap.val()) || 1
    const maxHP = getMaxHP(id, lvl)
    const pct   = Math.max(0, Math.min(100, (hp / maxHP) * 100))
    const bar   = document.getElementById("hp_" + myToken.id)
    if (bar) bar.style.width = pct + "%"
    const token = document.getElementById(myToken.id)
    token.classList.remove("lowHP", "midHP", "fullHP")
    if (pct > 60)      token.classList.add("fullHP")
    else if (pct > 30) token.classList.add("midHP")
    else               token.classList.add("lowHP")
  })
  db.ref("characters/" + myToken.id + "/hp").set(hp)
  updateTokenStats(myToken.id)
}

/* ========================= */
/* PERSONNAGES                */
/* ========================= */

function watchCharacter(snapshot) {
  if (window.__sessionBusy) return
  const playerID = snapshot.key
  const rawData  = snapshot.val()
  const data = rawData && (playerID === "bibi" ? {...rawData,curse:0,corruption:0} : rawData)
  if (!data) return
  window.__publicCharacters ||= {}; window.__publicCharacters[playerID] = {hp:data.hp,lvl:data.lvl}

  updateTokenStats(playerID)
  updateGMStats(playerID, data)

  const xp         = parseInt(data.xp)        || 0
  const lvl        = parseInt(data.lvl)        || 1
  const hp         = parseInt(data.hp)         || 0
  const corruption = parseInt(data.corruption) || 0

  const maxHP = getMaxHP(playerID, lvl)
  const bar   = document.getElementById("hp_" + playerID)
  if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
  updateTokenGlow(playerID, hp)

  const token = document.getElementById(playerID)
  if (token) {
    const wasDead = !!deadPlayers[playerID]
    if (hp <= 0) {
      token.classList.add("playerDead")
      deadPlayers[playerID] = true
      if (!document.getElementById("skull_" + playerID)) {
        const skull = document.createElement("div")
        skull.id = "skull_" + playerID
        skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
        skull.innerText = "mort"
        token.appendChild(skull)
      }
      if(!wasDead&&Number.isFinite(data.hp)&&gameStarted&&(combatActive||gameState==="GAME")){
        showNotification(playerID.toUpperCase()+" est KO.")
        playSound("defeatSound",.35)
      }
    } else {
      token.classList.remove("playerDead")
      deadPlayers[playerID] = false
      const skull = document.getElementById("skull_" + playerID)
      if (skull) skull.remove()
    }
    if (corruption >= 10) {
      token.classList.add("powerReady")
      if (myToken && myToken.id === playerID && (!powerModeActive || !document.getElementById("usePowerBtn"))) activatePowerMode(playerID)
    } else {
      token.classList.remove("powerReady", "powerFull")
      if (myToken && myToken.id === playerID) powerModeActive = false
      if(myToken?.id===playerID)document.getElementById("usePowerBtn")?.remove()
      const p1 = document.getElementById("power1Sound")
      if (p1 && myToken && myToken.id === playerID) { p1.pause(); p1.currentTime = 0 }
    }
    const curseVal = parseInt(data.curse) || 0
    if (curseVal >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
    else               { token.classList.remove("cursed"); stopBloodEffect(token)  }
  }

  const localId = getLocalPlayerId()
  const localCurse = parseInt(data.curse) || 0
  if (
    !isGM &&
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse >= 8 &&
    !window.__curseWheelTriggeredFor
  ) {
    window.__curseWheelTriggeredFor = localId
    triggerCurseWheel(playerID)
  } else if (
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse < 8 &&
    window.__curseWheelTriggeredFor === localId
  ) {
    window.__curseWheelTriggeredFor = null
  }

  // Les mises à jour publiques ne doivent jamais modifier un autre héros.
  if (!canAccessCharacter(playerID)) return
  if (playerID === "bibi") _state.bibiData = { ...data }

  const previousLevel = lastLevel[playerID]
  const previousXP = window.__lastProgressionXP?.[playerID]
  if (!window.__lastProgressionXP) window.__lastProgressionXP = {}
  window.__lastProgressionXP[playerID] = xp
  lastLevel[playerID] = lvl
  if (isGM && previousXP !== undefined && xp > previousXP) {
    reconcilePartyProgression().catch(error => showNotification("Progression non confirmée : " + error.message))
  }
  if (previousLevel !== undefined && lvl > previousLevel && !window.__sessionBusy) triggerLevelUp(playerID)
}

function triggerLevelUp(playerID) {
  if (!canAccessCharacter(playerID) || window.__sessionBusy) return
  // Présentation seulement : les points sont attribués une seule fois par transaction.
  showNotification(playerID.toUpperCase() + " LEVEL UP !")
  showLevelUpEffect(playerID); showLevelUpText(playerID); playSound("levelUpSound")
}

function updateGMStats(playerID, data) {
  const box = document.getElementById("gmStats_" + playerID)
  if (!box) return
  if(playerID === "bibi")data={...data,curse:0,corruption:0}
  let curseIcons = ""
  for (let i = 0; i < (data.curse || 0); i++) curseIcons += "☠"
  box.innerHTML = `<div class="gmMiniHPText">❤️ ${data.hp || 0}</div><div class="gmMiniCurse">${curseIcons}</div><div class="gmMiniPower">${(data.corruption || 0) >= 10 ? "✨" : ""}</div>`
}

function getPartyLevel(callback) {
  const players = ["greg", "ju", "elo"]
  let total = 0, count = 0
  players.forEach(p => {
    db.ref("characters/" + p + "/lvl").once("value", snap => {
      total += parseInt(snap.val()) || 1
      if (++count === players.length) callback(Math.round(total / players.length))
    })
  })
}

function ensureMapMusicPlayback(mapName, delay = 0) {
  setTimeout(() => {
    if (!mapName || !mapMusic[mapName]) return
    crossfadeMusic(mapMusic[mapName])
    setTimeout(() => {
      const active = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const hasPlayback = !!(active && !active.paused && active.src && active.volume > 0.01)
      if (!hasPlayback) {
        crossfadeMusic(mapMusic[mapName])
        setTimeout(() => {
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

function revivePlayer(playerId) {
  deadPlayers[playerId] = false
  db.ref("characters/" + playerId + "/hp").set(1)
  const tok = document.getElementById(playerId)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + playerId)
    if (skull) skull.remove()
  }
  showNotification(playerId.toUpperCase() + " revient à la vie !")
  db.ref("game/playerRevive").set({ player: playerId, time: Date.now() })
}

/* ========================= */
/* MAP                       */
/* ========================= */

async function changeMap(mapName,customAudio){
 if(!isGM)return
 try{
 requireExplorationConnection();_musicTransitioning=false;_pendingMusic=null
 if(musicFadeInterval){clearInterval(musicFadeInterval);musicFadeInterval=null}
 _state._pendingMapAudio=!!customAudio
 await db.ref("game").update({map:mapName,mapAudio:customAudio?{file:customAudio,map:mapName,time:Date.now()}:null})
 maybeSpawnMapLoreBook(mapName)
 document.querySelectorAll(".gmSection").forEach(sec=>{sec.style.display="none"})
 }catch(error){showNotification("Carte non changée : "+error.message)}
}

/* ========================= */
/* XP                        */
/* ========================= */

async function giveXP(amount) {
  if (!isGM) return
  try {
    const gain = Number(amount)
    if (!Number.isInteger(gain) || gain <= 0 || window.__sessionBusy) return
    await db.ref("characters").transaction(current => {
      if (!current) return undefined
      const next = cloneSession(current)
      PLAYABLE_HEROES.forEach(id => { if (next[id]) next[id].xp = Math.min(999999, (Number(next[id].xp) || 0) + gain) })
      return progressCharacters(next)
    })
  } catch (error) { showNotification("XP non confirmée : " + error.message); return }
  showXPMessage(amount)
  addMJLog("⭐ MJ donne " + amount + " XP au groupe")
  addSessionLog("⭐ +" + amount + " XP donné au groupe")
  // Le familier suit Greg dans la même transaction de progression.
}

function syncBibiLevel() {
  db.ref("characters/greg/lvl").once("value", snap => {
    const gregLvl = parseInt(snap.val()) || 1
    db.ref("characters/bibi/lvl").once("value", snap2 => {
      const bibiLvl = parseInt(snap2.val()) || 1
      if (bibiLvl !== gregLvl) {
        db.ref("characters/bibi").update({ lvl: gregLvl, hp: getMaxHP('bibi', gregLvl) })
        addMJLog("🐶 Bibi passe niveau " + gregLvl)
      }
    })
  })
}

/* ========================= */
/* SAUVEGARDE                */
/* ========================= */

// Sauvegarde, restauration et nouvelle partie : persistence.js

function rollDice(max) {
  let playerName
  if (isGM) { playerName = "MJ" }
  else {
    if (!myToken) { showNotification("Choisissez un personnage !"); return }
    playerName = myToken.id
  }
  const result = Math.floor(Math.random() * max) + 1
  applyFreeDiceConsequences(playerName,max,result)
  db.ref("diceRoll").push({ player: playerName, dice: max, result, time: Date.now(), sender: playerName })
}

function gmRoll(max) {
  if (!isGM) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MJ", dice: max, result, time: Date.now(), sender: "MJ" })
}

function toggleDiceBar(forceState) {
  const bar = document.getElementById("diceBar")
  const toggle = document.getElementById("diceBarToggle")
  if (!bar || !toggle) return
  const collapsed = typeof forceState === "boolean" ? forceState : !bar.classList.contains("collapsed")
  bar.classList.toggle("collapsed", collapsed)
  toggle.innerText = collapsed ? "▴" : "▾"
  toggle.setAttribute("aria-label", collapsed ? "Déplier les dés" : "Replier les dés")
}

function toggleGMDamageControls(forceState) {
  const panel = document.getElementById("gmDamagePanel")
  const toggle = document.getElementById("gmDamageToggle")
  if (!panel || !toggle) return
  const collapsed = typeof forceState === "boolean" ? forceState : !panel.classList.contains("collapsed")
  panel.classList.toggle("collapsed", collapsed)
  toggle.innerText = collapsed ? "◀" : "▼"
  toggle.setAttribute("aria-label", collapsed ? "Afficher les contrôles du combat" : "Masquer les contrôles du combat")
}

function initGMCombatPanelsDrag() {
  if (window.__gmCombatPanelsDragInit) return
  window.__gmCombatPanelsDragInit = true

  const makeDraggable = (id) => {
    const panel = document.getElementById(id)
    if (!panel) return

    let dragging = false
    let offsetX = 0
    let offsetY = 0

    panel.addEventListener("mousedown", e => {
      if (!isGM) return
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("label")) return
      dragging = true
      const rect = panel.getBoundingClientRect()
      offsetX = e.clientX - rect.left
      offsetY = e.clientY - rect.top
      panel.style.cursor = "grabbing"
      panel.style.left = rect.left + "px"
      panel.style.top = rect.top + "px"
      panel.style.right = "auto"
      panel.style.bottom = "auto"
      e.preventDefault()
    })

    document.addEventListener("mousemove", e => {
      if (!dragging) return
      const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth)
      const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight)
      const left = Math.max(0, Math.min(maxLeft, e.clientX - offsetX))
      const top = Math.max(0, Math.min(maxTop, e.clientY - offsetY))
      panel.style.left = left + "px"
      panel.style.top = top + "px"
    })

    document.addEventListener("mouseup", () => {
      if (!dragging) return
      dragging = false
      panel.style.cursor = "grab"
    })

    panel.style.cursor = "grab"
  }

}

function mobRoll(max) {
  if (!isGM || !combatActive) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MOB", dice: max, result, time: Date.now(), sender: "MJ" })
}

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
  resultBox.classList.remove("crit", "fail", "mjRoll")
  resultBox.style.display = "flex"
  resultBox.style.transform = "translate(-50%, -50%)"
  resultBox.offsetHeight

  const safeName = String(playerName).replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const naturalRoll = Number.isFinite(parseInt(rawRoll, 10)) ? parseInt(rawRoll, 10) : final
  const isCritical = rollMeta.crit ?? (Number.isInteger(naturalRoll) && Number.isInteger(max) && naturalRoll === max && naturalRoll > 1)
  const isFailure = rollMeta.fail ?? (Number.isInteger(naturalRoll) && naturalRoll === 1)
  const { cube, label, resLabel } = _buildDice3D(resultBox)

  label.textContent = safeName + " — d" + max
  resLabel.textContent = ""
  resultBox.style.opacity = 1

  // Rotation rapide pendant 1.8s
  let t = 0
  cube.style.transition = "none"
  const spin = setInterval(() => {
    t += 0.15
    cube.style.transform = "rotateX(" + (t*137) + "deg) rotateY(" + (t*247) + "deg) rotateZ(" + (t*83) + "deg)"
  }, 16)

  setTimeout(() => {
    clearInterval(spin)
    // Aligner la face sur le résultat
    const displayVal = ((final - 1) % 6) + 1
    const rot = _DICE_FACE_ROTS[displayVal]
    cube.style.transition = "transform 0.45s cubic-bezier(0.2,0.8,0.3,1.15)"
    cube.style.transform = "rotateX(" + rot.rx + "deg) rotateY(" + rot.ry + "deg)"

    setTimeout(() => {
      resLabel.textContent = String(final)
      addDiceLog(playerName, max, final)

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
      setTimeout(() => {
        cube.style.transition = ""
        cube.style.animation = "diceIdle 10s linear infinite"
      }, 500)

      // Disparition
      setTimeout(() => {
        resultBox.style.opacity = 0
        setTimeout(() => {
          resultBox.style.display = "none"
          resultBox.classList.remove("crit","fail","mjRoll")
          cube.style.animation = ""
        }, 500)
      }, 1800)
    }, 300)
  }, 1800)
}

function rollStat(stat) {
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.style.display === "block") return
  if (!myToken) return
  const field = document.getElementById(stat); if (!field) return
  const statValue = parseInt(field.value) || 0
  const dice = Math.floor(Math.random() * 20) + 1
  applyFreeDiceConsequences(myToken.id,20,dice)
  db.ref("diceRoll").push({player:myToken.id,dice:20,result:dice+statValue,rawRoll:dice,time:Date.now(),sender:myToken.id}).catch(error=>showNotification("Jet non partagé : "+error.message))
}

/* ========================= */
/* GAME STATE                */
/* ========================= */

function refreshActivePNJs() {
  db.ref("game/storyImage").once("value", snap => {
    const image = snap.val()
    if (image && typeof showStoryImage === "function") showStoryImage(image)
  })
  db.ref("game/storyImage2").once("value", snap => {
    const image = snap.val()
    const box2 = document.getElementById("storyImage2")
    const img2 = document.getElementById("storyImageContent2")
    if (!image || !box2 || !img2) return
    img2.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : "images/" + image
    box2.style.opacity = "0"; box2.style.left = "0"; box2.style.right = "auto"; box2.style.transform = ""; box2.style.display = "flex"
    if (!pnjSlotOrder.includes(2)) pnjSlotOrder.push(2)
    updatePNJPositions()
    setTimeout(() => { box2.style.opacity = "1" }, 60)
  })
  db.ref("game/storyImage3").once("value", snap => {
    const image = snap.val()
    const box3 = document.getElementById("storyImage3")
    const img3 = document.getElementById("storyImageContent3")
    if (!image || !box3 || !img3) return
    img3.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : "images/" + image
    box3.style.opacity = "0"; box3.style.right = "0"; box3.style.left = "auto"; box3.style.transform = ""; box3.style.display = "flex"
    if (!pnjSlotOrder.includes(3)) pnjSlotOrder.push(3)
    updatePNJPositions()
    setTimeout(() => { box3.style.opacity = "1" }, 60)
  })
  db.ref("game/highPNJName").once("value", snap => {
    const data = snap.val()
    if (data && data.name && typeof showHighPNJScroll === "function") showHighPNJScroll(data.name)
  })
  db.ref("game/cemeterySpell").once("value", snap => {
    const data = snap.val()
    if (!data) return
    if (data.active && !data.glipheShown && typeof ensureCemeteryGlyphIntro === "function") { ensureCemeteryGlyphIntro(); return }
    if (data.glipheShown && !data.freed && typeof renderSpellDiceGame === "function") renderSpellDiceGame(data)
  })
}

  function setGameState(state) {
    const previousState=gameState
    gameState = state
    if(state==="COMBAT"&&previousState!=="COMBAT"&&typeof suspendExplorationForCombat==="function")suspendExplorationForCombat()
  if (state !== "GAME" && state !== "COMBAT" && typeof cleanupRuneChallengeUI === "function") cleanupRuneChallengeUI()
  switch (state) {
    case "MENU":
      document.getElementById("intro").style.display    = "flex"
      document.getElementById("camera").style.display   = "none"
      document.getElementById("playerSelect").style.display = "none"
      startMenuSparks()
      break
    case "INTRO":
      document.getElementById("intro").style.display  = "flex"
      document.getElementById("camera").style.display = "none"
      ;["storyImage","storyImage2","storyImage3"].forEach(id => { const el=document.getElementById(id); if(el) { el.style.display="none"; el.style.opacity="0" } })
      document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
      break
    case "DIALOGUE":
      document.getElementById("dialogueBox").style.display = "flex"
      document.getElementById("intro").style.display       = "none"
      break
    case "GAME":
      document.getElementById("camera").style.display = "block"
      document.body.classList.remove("in-combat")
      // Ne montrer le menu de sélection que si le joueur n'a pas encore choisi
      if (!myToken) document.getElementById("playerSelect").style.display = "block"
      setTimeout(updateThuumButton, 500)
      setTimeout(refreshActivePNJs, 150)
      break
    case "COMBAT":
      document.body.classList.add("in-combat")
      setTimeout(refreshActivePNJs, 150)
      break
    }
    if (state !== "GAME") closeMapLoreBookOverlay()
    setTimeout(updateMadnessVisibility, 30)
    setTimeout(updateThuumButton, 30)
    setTimeout(updateMapLoreBookVisibility, 30)
  }

function hideIntroLayers() {
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")

  if (start) {
    start.style.display = "none"
    start.style.opacity = "0"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
  }

  if (intro) {
    intro.style.display = "none"
    intro.style.opacity = "0"
    intro.style.pointerEvents = "none"
    intro.style.visibility = "hidden"
    intro.style.zIndex = "-1"
  }
  if (introBox) {
    introBox.style.display = ""
    introBox.style.opacity = ""
    introBox.style.visibility = ""
    introBox.style.pointerEvents = ""
  }
}

function resetAllPlayerStats() {
  if (!isGM) return
  if (!confirm("Réinitialiser les stats des joueurs au niveau 1 sans changer la map ni les positions ?")) return

  const initChars = {}
  ;["greg", "ju", "elo", "bibi"].forEach(pid => {
    const s = getPlayerStatsAtLevel(pid, 1)
    initChars[pid] = {
      lvl: 1,
      xp: 0,
      hp: s.hp,
      poids: s.poids,
      force: s.force,
      charme: s.charme,
      perspi: s.perspi,
      chance: s.chance,
      defense: s.defense,
      curse: 0,
      corruption: 0,
      freePoints: 0,
      gold: 0,
      inventaire: "",
      notes: ""
    }
  })

  const ops = Object.keys(initChars).map(pid => db.ref("characters/" + pid).set(initChars[pid]))
  Promise.allSettled(ops).then(results => {
    const failed = results.filter(r => r.status === "rejected")
    if (failed.length) {
      showNotification("⚠ Reset stats incomplet")
      return
    }
    showNotification("Stats joueurs réinitialisées")
    if (typeof addMJLog === "function") addMJLog("RESET — stats joueurs remises au niveau 1")
  })
}

/* ========================= */
/* JOURNAL DE SESSION        */
/* ========================= */

function addSessionLog(text) {
  const t = new Date()
  const hh = t.getHours().toString().padStart(2,"0")
  const mm = t.getMinutes().toString().padStart(2,"0")
  db.ref("game/sessionLog").push({ text: String(text), time: Date.now(), display: hh + ":" + mm })
}

function openSessionLog() {
  const panel = document.getElementById("sessionLogPanel")
  if (!panel) return
  if (panel.style.display === "flex") { closeSessionLog(); return }
  panel.style.display = "flex"
  const content = document.getElementById("sessionLogContent")
  content.innerHTML = ""
  db.ref("game/sessionLog").orderByChild("time").limitToLast(80).once("value", snap => {
    const entries = []
    snap.forEach(child => entries.unshift(child.val()))
    entries.forEach(e => {
      const row = document.createElement("div")
      row.style.cssText = "font-size:11px;color:#c8d8d0;letter-spacing:0.5px;padding:3px 0;border-bottom:1px solid rgba(30,90,102,0.15);"
      const ts = document.createElement("span")
      ts.style.cssText = "color:#1e8a9a;margin-right:8px;font-size:10px;"
      ts.textContent = "[" + (e.display || "--:--") + "]"
      const msg = document.createElement("span")
      msg.textContent = e.text
      row.appendChild(ts); row.appendChild(msg)
      content.appendChild(row)
    })
    if (!entries.length) { content.innerHTML = '<div style="color:#555;font-size:11px;text-align:center;padding:20px;">Aucune entrée</div>' }
  })
  // Mise à jour en temps réel
  if (panel.__logListener) db.ref("game/sessionLog").off("child_added", panel.__logListener)
  panel.__logListener = db.ref("game/sessionLog").orderByChild("time").startAt(Date.now()).on("child_added", snap => {
  if (window.__sessionBusy) return
    const e = snap.val(); if (!e) return
    const row = document.createElement("div")
    row.style.cssText = "font-size:11px;color:#c8d8d0;letter-spacing:0.5px;padding:3px 0;border-bottom:1px solid rgba(30,90,102,0.15);"
    const ts = document.createElement("span"); ts.style.cssText = "color:#1e8a9a;margin-right:8px;font-size:10px;"; ts.textContent = "[" + (e.display || "--:--") + "]"
    const msg = document.createElement("span"); msg.textContent = e.text
    row.appendChild(ts); row.appendChild(msg)
    content.insertBefore(row, content.firstChild)
    const empty = content.querySelector(".logEmpty"); if (empty) empty.remove()
  })
}

function closeSessionLog() {
  const panel = document.getElementById("sessionLogPanel")
  if (!panel) return
  if (panel.__logListener) { db.ref("game/sessionLog").off("child_added", panel.__logListener); panel.__logListener = null }
  panel.style.display = "none"
}

function clearSessionLog() {
  if (!isGM) return
  if (!confirm("Effacer tout le journal de session ?")) return
  db.ref("game/sessionLog").remove()
  const content = document.getElementById("sessionLogContent")
  if (content) content.innerHTML = '<div class="logEmpty" style="color:#555;font-size:11px;text-align:center;padding:20px;">Aucune entrée</div>'
}

function startEndSession() {
  if (!isGM) return

  const snd = document.getElementById("endingSound")
  const bg  = document.getElementById("endSessionBg")
  const logo = document.getElementById("endSessionLogo")
  if (!snd || !bg || !logo) return

  addSessionLog("🌙 Fin de session")
  db.ref("game/endSession").set({ time: Date.now(), active: true })

  // Stopper toute musique en cours
  stopAllMusic()

  // Lancer ending.mp3 géré par le système audio
  setManagedAudioBaseVolume(snd, 1, "music")
  snd.currentTime = 0
  snd.play().catch(() => {})

  // À 3,7s : afficher end.jpg en transparence + ending.png opaque
  const trigger = setTimeout(() => {
    bg.style.display = "block"
    logo.style.display = "block"
  }, 3700)

  // Space ou Escape ferment pour tout le monde
  function closeEndSession(e) {
    if (e.code !== "Space" && e.code !== "Escape") return
    e.preventDefault()
    clearTimeout(trigger)
    snd.pause(); snd.currentTime = 0
    bg.style.display = "none"
    logo.style.display = "none"
    db.ref("game/endSession").update({ active: false, closedAt: Date.now() })
    document.removeEventListener("keydown", closeEndSession)
  }
  document.addEventListener("keydown", closeEndSession)
}

function showIntroLayer() {
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")
  if (!intro) return
  intro.style.display = "flex"
  intro.style.opacity = "1"
  intro.style.pointerEvents = "auto"
  intro.style.visibility = "visible"
  intro.style.zIndex = "15"
  if (introBox) {
    introBox.style.display = "flex"
    introBox.style.opacity = "1"
    introBox.style.visibility = "visible"
    introBox.style.pointerEvents = "auto"
  }
}

function startGame() {
  if (gameStarted || window.__sessionBusy) return
  // Continuer ne doit jamais effacer la partie persistée.
  stopMenuSparks()
  const titleEl = document.getElementById("gameTitle")
  if (titleEl) { titleEl.classList.remove("visible"); titleEl.innerText = "" }
  document.body.focus()
  if (gameStarted) return
  gameStarted = true
  hideIntroLayers()
  setGameState(GAME_STATE.INTRO)
  const fade = document.getElementById("fadeScreen"); fade.style.opacity = 1
  const music = document.getElementById("music"); if (music) { music.pause(); music.currentTime = 0 }
  db.ref("game/map").once("value", snapshot => {
    const mapName = snapshot.val()
    if (mapName) {
      const map = document.getElementById("map")
      map.style.backgroundImage = "url('" + mapName + "')"
      calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
    }
  })
  setTimeout(() => {
    if (isGM) {
      // MJ : cinématique si newGame() vient d'être appelé
      if (window.isNewGame) {
        window.isNewGame = false
        stopAllMusic()
        playOpeningCinematic(startDialogue)
      }
      else showTavern()
    } else {
      if (window.isNewGame) {
        window.isNewGame = false
        stopAllMusic()
        playOpeningCinematic(startDialogue)
      } else {
        showTavern()
      }
    }
  }, 1500)
}

function fadeOut() {
  const fade = document.getElementById("fadeScreen"); if (!fade) return; fade.style.opacity = 0
}

function showTavern() {
  hideIntroLayers()
  setGameState("GAME")
  const fade = document.getElementById("fadeScreen"); const map = document.getElementById("map")
  primeMapMusicChannels()
  // Démarrer la musique immédiatement (dans la fenêtre du geste utilisateur)
  const earlyMap = currentMap || "taverne.jpg"
  if (mapMusic[earlyMap]) playInitialMapMusic(earlyMap)
  fadeOut()
  document.getElementById("camera").style.display  = "block"
  document.getElementById("diceBar").style.display  = "flex"
  document.getElementById("diceLog").style.display  = "block"
  tryAutoSelectAuthenticatedPlayer()
  // Ne montrer le menu de sélection que si le joueur n'a pas encore choisi
  if (!myToken) {
    document.getElementById("playerSelect").style.display = "block"
    setTimeout(openPlayerMenuOnStart, 100)
  }
  // Lire la vraie map depuis Firebase plutôt que forcer la taverne
  db.ref("game/map").once("value", snap => {
    const mapName = snap.val() || "taverne.jpg"
    map.style.backgroundImage = "url('images/" + mapName + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    currentMap = mapName
    calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
    // Le zoom sauvegardé sera restauré sans réécrire la session.
    if (isGM && window.isNewGame) maybeSpawnMapLoreBook(mapName)
    syncMapElementsFromDB()
    syncWantedStateFromDB()
    if (mapName !== earlyMap) playInitialMapMusic(mapName)
    ensureMapMusicPlayback(mapName, 0)
    setTimeout(() => { fade.style.opacity = 0 }, 500)
    ensureMapMusicPlayback(mapName, 800)
    awaitResumeSessionPresentation()
    setTimeout(() => { if (mapNames[mapName]) showLocation(mapNames[mapName]) }, 2000)
    // Forcer rechargement des stats et positions des tokens
    setTimeout(() => {
      ;["greg","ju","elo","bibi"].forEach(pid => updateTokenStats(pid))
    }, 600)
  })
}

function startIntro() {
  startMenuSparks()
  stopAllMusic()
  preloadAssets()
  setGameState("INTRO")
  setTimeout(animateGameTitle, 2000)
  const start = document.getElementById("startScreen")
  start.classList.add("fadeOut")
  setTimeout(() => {
    start.style.display = "none"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
    showIntroLayer()
    const music = document.getElementById("music"); music.volume = 0; music.play().catch(() => {})
    if (typeof setManagedAudioBaseVolume === "function") {
      setManagedAudioBaseVolume(music, 0, "music")
      const fade = setInterval(() => {
        const base = parseFloat(music.__baseVolume) || 0
        if (base < 1) {
          const newBase = Math.min(1, base + 0.05)
          music.__baseVolume = newBase
          music.volume = (typeof getScaledAudioVolume === "function") ? getScaledAudioVolume(newBase, "music") : newBase
        } else clearInterval(fade)
      }, 200)
    } else {
      music.__baseVolume = 1; music.__audioChannel = "music"
      const targetVolume = (typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8
      let v = 0
      const fade = setInterval(() => { if (v < targetVolume) { v = Math.min(targetVolume, v + 0.05); music.volume = v } else clearInterval(fade) }, 200)
    }
  }, 2000)
}

function animateGameTitle() {
  const titleEl = document.getElementById("gameTitle"); if (!titleEl) return
  titleEl.innerText = "La Prophétie des Mouches"
  titleEl.classList.remove("visible")
  setTimeout(() => titleEl.classList.add("visible"), 50)
}

function startDialogue() {
  hideIntroLayers()
  setGameState("DIALOGUE")
  index = 0
  document.getElementById("dialogueBox").style.display = "flex"
  showDialogue()
  dialogueLock = true; setTimeout(() => { dialogueLock = false }, 300)
}

function showDialogue() {
  const d = dialogue[index]
  document.getElementById("dialoguePortrait").src = d.portrait
  document.getElementById("dialogueText").textContent = d.text
}

document.addEventListener("click", e => {
  if (gameState !== "DIALOGUE") return
  if (e.target.tagName === "BUTTON" || e.target.closest("button")) return
  index++
  if (index < dialogue.length) showDialogue()
  else { document.getElementById("dialogueBox").style.display = "none"; showTavern() }
})

// Fermer le panel de preview si clic en dehors
document.addEventListener("click", e => {
  const btn = document.getElementById("playerPreviewBtn")
  if (btn && !btn.contains(e.target)) {
    const panel = document.getElementById("playerPreviewPanel")
    if (panel) panel.classList.remove("open")
  }
})

/* ========================= */
/* GM                        */
/* ========================= */

function requestGM() {
  if (window.__authRole === "gm") {
    activateGM(true)
    return
  }
  if (auth) {
    showGMAuthModal()
    return
  }
  const password = prompt("Mot de passe MJ")
  if (password && password.toLowerCase().trim() === "mouches") activateGM()
  else showNotification("Accès refusé")
}

function togglePlayerPreviewPanel() {
  const panel = document.getElementById("playerPreviewPanel")
  if (panel) panel.classList.toggle("open")
}

function enterPlayerPreview(playerId) {
  if (!isGM) return
  const panel = document.getElementById("playerPreviewPanel")
  if (panel) panel.classList.remove("open")

  window._previewSavedMyToken = myToken
  isGM = false
  myToken = document.getElementById(playerId)

  // UI MJ générale
  document.getElementById("gmBar").style.display  = "none"
  document.getElementById("mjLog").style.display  = "none"
  document.getElementById("playerPreviewBtn").style.display = "none"
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")

  // UI MJ combat (pas des gmSection)
  const gdp = document.getElementById("gmDamagePanel"); if (gdp) gdp.style.display = "none"

  // Bandeau
  const banner = document.getElementById("playerPreviewBanner")
  const names  = { greg:"Greg", ju:"Yu", elo:"Elo", bibi:"Bibi" }
  document.getElementById("previewPlayerName").innerText = names[playerId] || playerId
  banner.style.display = "flex"

  // Token sélectionné
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
  if (myToken) myToken.classList.add("selectedPlayer")

  // Fiche personnage
  document.getElementById("characterSheet").style.display = "none"
  if (typeof openCharacterSheet === "function") openCharacterSheet(playerId)

  // Stats combat (recharge le listener pour le bon joueur)
  if ((combatActive || gameState === "COMBAT") && typeof loadPlayerCombatStats === "function") {
    loadPlayerCombatStats()
  }
  if ((combatActive || gameState === "COMBAT") && typeof showCombatHUD === "function") {
    showCombatHUD()
  }

  // Bouton Thu'um
  if (typeof updateThuumButton === "function") updateThuumButton()
}

function exitPlayerPreview() {
  isGM = true
  myToken = window._previewSavedMyToken || null
  window._previewSavedMyToken = null

  // UI MJ générale
  document.getElementById("gmBar").style.display  = "flex"
  document.getElementById("mjLog").style.display  = "block"
  document.getElementById("playerPreviewBtn").style.display = "block"
  document.getElementById("playerPreviewBanner").style.display = "none"
  document.getElementById("characterSheet").style.display = "none"

  // UI MJ combat
  if (combatActive || gameState === "COMBAT") {
    const gdp = document.getElementById("gmDamagePanel"); if (gdp) gdp.style.display = "block"
  }

  // Token sélectionné
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
  if (myToken) myToken.classList.add("selectedPlayer")

  // Restaurer les stats combat sur le token MJ (si applicable)
  if ((combatActive || gameState === "COMBAT") && myToken && typeof loadPlayerCombatStats === "function") {
    loadPlayerCombatStats()
  }

  if (typeof updateThuumButton === "function") updateThuumButton()
}

function activateGM(fromFirebaseRole = false) {
  if (window.__authRole !== "gm" || isGM) return
  isGM = true
  document.getElementById("gmBar").style.display     = "flex"
  document.getElementById("mjLog").style.display     = "block"
  const gmSaveBar = document.getElementById("gmSaveBar")
  if (gmSaveBar) gmSaveBar.style.display = "none"
  const previewBtn = document.getElementById("playerPreviewBtn")
  if (previewBtn) previewBtn.style.display = "block"
  ensureMadnessGMButton()
  updateThuumButton()
  showNotification(fromFirebaseRole ? "🎲 Mode MJ activé (Firebase)" : "🎲 Mode MJ activé")
  // Fermer et masquer complètement le menu de sélection
  const select = document.getElementById("playerSelect")
  if (select) {
    select.style.transition = "opacity 0.4s ease"
    select.style.opacity = "0"
    setTimeout(() => { select.style.display = "none" }, 400)
  }
  setTimeout(syncWantedStateFromDB, 60)
}

function toggleGMSection(id) {
  const section = document.getElementById(id); if (!section) return
  const isOpen  = section.style.display === "block"
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  if (!isOpen) section.style.display = "block"
}

function toggleCategory(id, button) {
  const cat     = document.getElementById(id)
  if (!cat) return
  const opening = cat.style.display !== "block"

  // Trouve le panel parent (gmSection ou pnjTabContent)
  const parent = button.closest(".gmSection, .pnjTabContent")

  // Ferme tous les sous-menus du même panel parent seulement
  const scope = parent || document
  scope.querySelectorAll(".mapCategory").forEach(c => {
    if (c !== cat) {
      c.style.display = "none"
      c.style.maxHeight = ""
    }
  })
  scope.querySelectorAll(".mapCategoryButton").forEach(btn => {
    if (btn !== button) { btn.classList.remove("active"); const a = btn.querySelector(".arrow"); if (a) a.classList.remove("open") }
  })

  // Ouvre/ferme la cible avec animation
  if (opening) {
    cat.style.display = "block"
    cat.style.maxHeight = "0px"
    cat.style.overflow  = "hidden"
    cat.style.transition = "max-height 0.25s ease"
    requestAnimationFrame(() => { cat.style.maxHeight = cat.scrollHeight + "px" })
    button.classList.add("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.add("open")
  } else {
    cat.style.transition = "max-height 0.2s ease"
    cat.style.maxHeight  = "0px"
    setTimeout(() => { cat.style.display = "none"; cat.style.maxHeight = "" }, 200)
    button.classList.remove("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.remove("open")
  }
}

function openPNJTab(id, el) {
  if (window.event) window.event.stopPropagation()
  document.querySelectorAll(".pnjTabContent").forEach(tab => { tab.style.display = "none"; tab.classList.remove("active") })
  document.querySelectorAll(".pnjTab").forEach(tab => tab.classList.remove("active"))
  const target = document.getElementById(id)
  if (target) { target.style.display = "block"; target.classList.add("active") }
  el.classList.add("active")
}

function watchFreePoints(playerId) {
  if (window.__freePointsRef && window.__freePointsCb) {
    window.__freePointsRef.off("value", window.__freePointsCb)
  }
  const ref = db.ref("characters/" + playerId + "/freePoints")
  const cb = snap => {
    const pts = parseInt(snap.val()) || 0
    if (pts > 0 && typeof showFreePointsPanel === "function") {
      const localId = getLocalPlayerId()
      if (localId && localId === String(playerId).toLowerCase()) {
        showFreePointsPanel(playerId, pts)
      }
    }
  }
  window.__freePointsRef = ref
  window.__freePointsCb = cb
  ref.on("value", cb)
}

async function choosePlayer(id) {
  if (!CHARACTER_IDS.includes(id)) return
  if (isGM && window.__authRole === "gm") {
    myToken = document.getElementById(id); window.myToken = myToken
    selected = null; _state.tokenDragging = false; _state.tokenDragStart = null
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer", "gmSelected"))
    if (myToken) myToken.classList.add("selectedPlayer")
    showNotification("MJ joue : " + id.toUpperCase())
    watchLocalPlayerDefeat(id); updateThuumButton(); _collapsePlayerMenu(id)
    setTimeout(() => openCharacterSheet(id), 50)
    return
  }
  if (!PLAYABLE_HEROES.includes(id)) { showNotification("Bibi est le familier de Greg."); return }
  if (myToken || window.__playerSelectionPending) return
  const token = document.getElementById(id)
  if (!token) return
  window.__playerSelectionPending = true
  try {
    await initFirebaseAnonymousAuth()
    const uid = auth?.currentUser?.uid || window.__authUid
    if (!uid || uid !== window.__authUid) throw new Error("Connexion nécessaire pour choisir un héros")
    if (window.__authPlayerId && window.__authPlayerId !== id) throw new Error("Ce compte est déjà lié à " + window.__authPlayerId.toUpperCase())
    const result = await db.ref("profiles/" + uid + "/playerId").transaction(current => {
      return current === null || current === id ? id : undefined
    })
    if (!result.committed) throw new Error("Ce compte possède déjà un autre héros")
    if (window.__authUid !== uid) return
    window.__authPlayerId = id
    myToken = token; window.myToken = token
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
    token.classList.add("selectedPlayer")
    syncCharacterSubscriptions()
    watchLocalPlayerDefeat(id); watchFreePoints(id); updateThuumButton()
    updatePlayerAuthMenuState(); _collapsePlayerMenu(id)
    showNotification("Votre héros est : " + id.toUpperCase())
    if (window.__activeCurseWheel) presentSavedCurseWheel(window.__activeCurseWheel)
  } catch (error) {
    showNotification(error?.message || "Choix du héros impossible")
  } finally {
    window.__playerSelectionPending = false
  }
}

function _collapsePlayerMenu(id) {
  const select = document.getElementById("playerSelect")
  if (!select) return
  // Disparition complète après choix du personnage
  select.style.transition = "opacity 0.4s ease"
  select.style.opacity = "0"
  setTimeout(() => { if (myToken?.id === id) select.style.display = "none" }, 400)
}

function togglePlayerMenu() {
  document.getElementById("playerMenu").classList.toggle("open")
}

function openPlayerMenuOnStart() {
  const menu = document.getElementById("playerMenu")
  updatePlayerAuthMenuState()
  if (menu && !myToken) menu.classList.add("open")
}

/* ========================= */
/* DRAG TOKENS               */
/* ========================= */

document.querySelectorAll(".token").forEach(token=>{
  token.addEventListener("dblclick",e=>{if(isGM||canAccessCharacter(token.id)){e.preventDefault();openCharacterSheet(token.id)}})
  token.addEventListener("contextmenu",e=>{e.preventDefault();if(isGM||canAccessCharacter(token.id))openCharacterSheet(token.id)})
  token.addEventListener("mousedown",e=>{
    if(e.button!==0||e.target.closest("button")||e.target.closest("#playerSelect"))return
    if(!isGM&&!canAccessCharacter(token.id))return
    try{requireExplorationConnection()}catch(error){showNotification(error.message);return}
    if(token.classList.contains("playerDead")){showNotification("Ce personnage est KO.");return}
    const pointer={x:e.clientX,y:e.clientY,tokenId:token.id,moved:false}
    _state.tokenDragStart=pointer;_state.tokenDragging=false
    const rect=token.getBoundingClientRect(),scale=cameraZoom||1
    const select=()=>{if(_state.tokenDragStart!==pointer)return;selected=token;lastX=token.offsetLeft;_dragOffsetX=(e.clientX-rect.left)/scale;_dragOffsetY=(e.clientY-rect.top)/scale;lastSentX=NaN;lastSentY=NaN}
    if(token.id==="mobToken"||token.id.startsWith("mobToken_")||token.id==="eloSummonToken")select()
    else readCharacter(token.id,snap=>{if(_state.tokenDragStart!==pointer)return;if(isCharacterOverweight(token.id,snap.val()||{}).overweight){showNotification("Ce personnage est surchargé.");return}select()})
    e.preventDefault()
  })
})
function persistDraggedToken(token,position){
  if(token.id==="eloSummonToken")return db.ref("combat/eloSummon").update(position)
  if(token._fbSlot)return db.ref("combat/"+token._fbSlot).update(position)
  return writeExplorationPosition(token.id,position,token.id==="bibi")
}
document.addEventListener("mousemove",e=>{
  if(!selected||!window.__explorationOnline)return
  if(!isGM&&!canAccessCharacter(selected.id)&&!(selected.id==="eloSummonToken"&&myToken?.id==="elo"))return
  const origin=_state.tokenDragStart
  if(origin&&!origin.moved&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<4)return
  if(origin)origin.moved=true
  _state.tokenDragging=true
  const rect=document.getElementById("map").getBoundingClientRect(),scale=cameraZoom||1
  const x=(e.clientX-rect.left)/scale-_dragOffsetX,y=(e.clientY-rect.top)/scale-_dragOffsetY
  const gx=Math.round(x/grid)*grid,gy=Math.round(y/grid)*grid
  if(gx<lastX)selected.classList.add("faceLeft");else if(gx>lastX)selected.classList.remove("faceLeft")
  lastX=gx;selected.style.left=x+"px";selected.style.top=y+"px"
  if(Date.now()-lastSend>sendDelay&&(gx!==lastSentX||gy!==lastSentY)){
    const token=selected
    persistDraggedToken(token,{x:gx,y:gy,facing:token.classList.contains("faceLeft")?1:0}).catch(error=>showMovementError(error,token.id))
    lastSentX=gx;lastSentY=gy;lastSend=Date.now()
  }
})
document.addEventListener("mouseup",()=>{
  const token=selected,origin=_state.tokenDragStart
  selected=null;_state.tokenDragging=false;_state.tokenDragStart=null
  if(origin?.tokenId==="bibi"&&!origin.moved)resumeBibiFollowing()
  if(token&&(!origin||origin.moved)){
    const position=explorationPosition({x:Math.round(parseFloat(token.style.left)/grid)*grid,y:Math.round(parseFloat(token.style.top)/grid)*grid,facing:token.classList.contains("faceLeft")?1:0})
    token.style.left=position.x+"px";token.style.top=position.y+"px"
    persistDraggedToken(token,position).catch(error=>showMovementError(error,token.id))
    if(token.id==="bibi")tryBark()
  }
})

/* ========================= */
/* CAMÉRA DRAG & ZOOM        */
/* ========================= */

document.addEventListener("mousedown", e => {
  if (e.target.closest("button") || e.target.closest("input") ||
      e.target.closest("#playerSelect") || e.target.closest("#gmBar") ||
      e.target.closest(".gmSection") || e.target.closest("#diceBar") ||
      e.target.closest("#characterSheet") || e.target.closest("#shopOverlay") ||
      e.target.closest("#spellMiniGame") || e.target.closest("#runeChallengeOverlay") ||
      e.target.closest("#mobSelectionMenu") || e.target.closest("#wantedEditor")) return
  if (e.button === 0 && !e.target.closest(".token")) {
    cameraDragging = true; cameraStartX = e.clientX - cameraX; cameraStartY = e.clientY - cameraY
    document.body.style.cursor = "grabbing"
  }
})

document.addEventListener("mousemove", e => {
  if (!cameraDragging) return
  cameraX = e.clientX - cameraStartX; cameraY = e.clientY - cameraStartY
  clampCamera(); updateCamera()
})

document.addEventListener("mouseup", () => { cameraDragging = false; document.body.style.cursor = "default" })

// Aucun zoom interactif sur la carte.

document.addEventListener("contextmenu", e => { if (isGM) e.preventDefault() })

/* ========================= */
/* TOUCH EVENTS (MOBILE)     */
/* ========================= */

// Drag des tokens via touch (simule mousedown/mousemove/mouseup)
document.querySelectorAll(".token").forEach(token => {
  token.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    token.dispatchEvent(new MouseEvent("mousedown", {
      clientX: t.clientX, clientY: t.clientY,
      bubbles: true, cancelable: true
    }))
    e.preventDefault()
  }, { passive: false })
})

document.addEventListener("touchmove", e => {
  if (!selected) return
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  document.dispatchEvent(new MouseEvent("mousemove", {
    clientX: t.clientX, clientY: t.clientY, bubbles: true
  }))
  e.preventDefault()
}, { passive: false })

document.addEventListener("touchend", () => {
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
})

// Pan caméra tactile (pour MJ et joueurs)
let _touchPanId   = null
let _touchPanSX   = 0
let _touchPanSY   = 0

const _camera = document.getElementById("camera")
if (_camera) {
  _camera.addEventListener("touchstart", e => {
    if (selected) return // le drag token prend la priorité
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    if (t.target && t.target.closest && (
      t.target.closest(".token") ||
      t.target.closest("#playerSelect") ||
      t.target.closest("#gmBar") ||
      t.target.closest(".gmSection")
    )) return

    _touchPanId = t.identifier
    _touchPanSX = t.clientX - cameraX
    _touchPanSY = t.clientY - cameraY
    // Pour le MJ, activer aussi cameraDragging pour les listeners existants
    if (isGM) {
      cameraDragging = true
      cameraStartX = _touchPanSX
      cameraStartY = _touchPanSY
    }
  }, { passive: true })

  _camera.addEventListener("touchmove", e => {
    if (selected) return
    const t = Array.from(e.touches).find(x => x.identifier === _touchPanId)
    if (!t) return
    cameraX = t.clientX - _touchPanSX
    cameraY = t.clientY - _touchPanSY
    clampCamera()
    updateCamera()
    if (!isGM) e.preventDefault() // empêche le scroll sur mobile joueur
  }, { passive: false })

  _camera.addEventListener("touchend", e => {
    if (!Array.from(e.touches).find(x => x.identifier === _touchPanId)) {
      _touchPanId = null
      cameraDragging = false
    }
  }, { passive: true })
}

// Aucun zoom par pincement.

/* ========================= */
/* TOUCHES CLAVIER           */
/* ========================= */

document.addEventListener("keydown", e => {
  const key    = e.key.toLowerCase()
  const active = document.activeElement
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    if (key !== "j" && key !== "b" && key !== "escape") return
    active.blur(); document.body.focus()
  }

  if (key === "escape") {
    const gmAuthModal = document.getElementById("gmAuthModal"); if (gmAuthModal) { closeGMAuthModal(); return }
    const playerAuthModal = document.getElementById("playerAuthModal"); if (playerAuthModal) { closePlayerAuthModal(); return }
    const diceLogContent = document.getElementById("diceLogContent")
    if (diceLogContent && diceLogContent.style.display !== "none") { if (typeof toggleDiceLog === "function") toggleDiceLog(); return }
    const savePanel = document.getElementById("savePanel"); if (savePanel) { savePanel.remove(); return }
    const combatInitiativeOverlay = document.getElementById("combatInitiativeOverlay")
    if (combatInitiativeOverlay) {
      window.__combatInitiativeHidden = true
      if (typeof closeCombatInitiativeOverlay === "function") closeCombatInitiativeOverlay()
      if (typeof renderCombatInitiativeToggle === "function" && typeof getCombatTurnState === "function") {
        renderCombatInitiativeToggle(getCombatTurnState())
      }
      return
    }
    const wantedEditor = document.getElementById("wantedEditor"); if (wantedEditor && wantedEditor.style.display !== "none") { wantedEditor.style.display = "none"; return }
    const mobSelectionMenu = document.getElementById("mobSelectionMenu"); if (mobSelectionMenu && mobSelectionMenu.style.display !== "none") { mobSelectionMenu.style.display = "none"; return }
    const wantedBoard = document.getElementById("wantedBoardOverlay")
    const wantedOverlay = document.getElementById("wantedOverlay")
    if (wantedBoard && wantedOverlay) { if (typeof closeWantedBoard === "function") closeWantedBoard(); else wantedBoard.remove(); return }
    if (wantedBoard) { if (typeof closeWantedBoard === "function") closeWantedBoard(); else wantedBoard.remove(); return }
    let anyGMOpen = false
    document.querySelectorAll(".gmSection").forEach(sec => { if (sec.style.display !== "none" && sec.style.display !== "") anyGMOpen = true })
    if (anyGMOpen) { document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" }); return }
    const playerMenu = document.getElementById("playerMenu"); if (playerMenu && playerMenu.classList.contains("open")) { playerMenu.classList.remove("open"); return }
    const freePointsPanel = document.getElementById("freePointsPanel"); if (freePointsPanel) { freePointsPanel.remove(); return }
    const allyPNJPanel = document.getElementById("allyPNJPanel"); if (allyPNJPanel) { allyPNJPanel.remove(); return }
    const allyViewerPanel = document.getElementById("allyViewerPanel"); if (allyViewerPanel) { allyViewerPanel.remove(); return }
    const powersPanel = document.getElementById("playerThuumPanel"); if (powersPanel && powersPanel.style.display === "block") { closePlayerPowersPanel(); return }
    const docOverlay = document.getElementById("documentOverlay"); if (docOverlay && isGM) { hideDocument(); return }
    const loreOverlay = document.getElementById("mapLoreBookOverlay"); if (loreOverlay) { closeMapLoreBookOverlay(); return }
    const runeOverlay = document.getElementById("runeChallengeOverlay"); if (runeOverlay) { if (typeof closeRuneChallenge === "function") closeRuneChallenge(); else { runeOverlay.remove(); _state.runeJustOpened = false } return }
    const sheet = document.getElementById("characterSheet"); if (sheet && sheet.style.display !== "none" && sheet.style.display !== "") { closeCharacterSheet(); return }
    const shopOverlay = document.getElementById("shopOverlay"); if (shopOverlay && isGM) { closeShop(); return }
    if (wantedOverlay) { wantedOverlay.remove(); return }
    const combatHUD = document.getElementById("combatHUD")
    if (combatHUD && combatHUD.style.display === "flex") {
      if (isGM && window.__combatPreviewPlayerId && typeof closeCombatPreviewHUD === "function") closeCombatPreviewHUD()
      else combatHUD.style.display = "none"
      return
    }
    if (isGM && pnjSlotOrder && pnjSlotOrder.length) {
      if (typeof hideHighPNJScrollImmediate === "function") hideHighPNJScrollImmediate()
      db.ref("game/highPNJName").remove()
      closeLastPNJ()
      return
    }
    return
  }

  if (isGM) {
    if (key === "m") { toggleGMSection("mapMenu"); return }
    if (key === "r") { toggleGMSection("pnjMenu"); return }
    if (key === "p") { toggleGMSection("gmCharacters"); return }
    if (key === "x") { toggleGMSection("xpMenu"); return }
    if (key === "e") { toggleGMSection("elementsMenu"); return }
    if (key === "t") { toggleGMSection("mobMenu2"); return }
    if (key === "a" && combatActive) { openAllyPNJPanel(); return }
    if (key === "s" && !e.ctrlKey) { showSaveMenu(); return }
    if (key === "?") { toggleGMShortcutHelp(); return }
  }

  if (key === "b") {
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") closeCharacterSheet()
    else {
      if (!isGM && !myToken) { showNotification("Choisissez un personnage 🎭"); return }
      openCharacterSheet("bibi")
    }
    return
  }

  if (key === "j") {
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") { closeCharacterSheet(); return }
    if (isGM) {
      if (selected) openCharacterSheet(selected.id)
      else if (currentSheetPlayer) openCharacterSheet(currentSheetPlayer)
      else openCharacterSheet("greg")
      return
    }
    if (myToken) { openCharacterSheet(); return }
    showNotification("Choisissez un personnage 🎭")
  }
})
