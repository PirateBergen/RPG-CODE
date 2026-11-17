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

