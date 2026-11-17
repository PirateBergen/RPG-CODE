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
    if (authPlayer) { status.style.display = "block"; status.innerText = "Connecté en tant que " + heroDisplayName(authPlayer).toUpperCase() }
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
      return claimReservedHero(chosenPlayer,uid).then(() => {
        showPlayerAuthMessage("Compte joueur créé et lié à " + heroDisplayName(chosenPlayer).toUpperCase())
        showNotification("Compte joueur créé : " + heroDisplayName(chosenPlayer).toUpperCase())
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
  // Le personnage est choisi sur le premier écran.
  const charLabel = document.createElement("div")
  charLabel.style.cssText = "font-size:11px;color:#8aabcf;margin-bottom:6px;letter-spacing:1px;"
  charLabel.innerText = window.__entryChoice && PLAYABLE_HEROES.includes(window.__entryChoice) ? "Personnage : " + (window.__entryChoice === "ju" ? "Pika" : window.__entryChoice.toUpperCase()) : "Choisissez d’abord votre personnage sur l’écran d’accueil"
  box.appendChild(charLabel)
  // champ caché qui stocke la valeur sélectionnée
  const charInput = document.createElement("input")
  charInput.id = "playerAuthCharacter"; charInput.type = "hidden"; charInput.value = PLAYABLE_HEROES.includes(window.__entryChoice) ? window.__entryChoice : ""
  box.appendChild(charInput)
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
  createBtn.id = "playerAuthCreate"
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
    showNotification("Compte joueur déjà connecté : " + heroDisplayName(window.__authPlayerId).toUpperCase()); return
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
  if(typeof syncGMDiagnosticsButton==="function")syncGMDiagnosticsButton()
  const isAuth = !!(window.__authPlayerId || window.__authRole === "gm")
  const introBtn = document.getElementById("introLogoutBtn")
  const menuBtn = document.getElementById("playerMenuLogoutBtn")
  if (introBtn) introBtn.style.display = isAuth ? "" : "none"
  if (menuBtn) menuBtn.style.display = isAuth ? "" : "none"
}

// A cached GM role must not activate the UI before the later scripts are ready.
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initFirebaseAnonymousAuth,{once:true})
else queueMicrotask(initFirebaseAnonymousAuth)

