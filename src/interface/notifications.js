function inferNotificationType(text) {
  const normalized = String(text || "").toLowerCase()
  if (
    normalized.includes("erreur") ||
    normalized.includes("incomplet") ||
    normalized.includes("introuvable") ||
    normalized.includes("corrompue") ||
    normalized.includes("corrompu") ||
    normalized.includes("refusé") ||
    normalized.includes("refuse") ||
    normalized.includes("ko") ||
    normalized.includes("tombé") ||
    normalized.includes("ne peut pas") ||
    normalized.includes("condition non remplie") ||
    normalized.includes("surchargé") ||
    normalized.includes("surcharge") ||
    normalized.includes("empoisonné") ||
    normalized.includes("saigne")
  ) return "danger"

  if (
    normalized.includes("gagne") ||
    normalized.includes("récupère") ||
    normalized.includes("recupere") ||
    normalized.includes("pièces d'or") ||
    normalized.includes("pieces d'or") ||
    normalized.includes("level up") ||
    normalized.includes("revient à la vie") ||
    normalized.includes("revient a la vie") ||
    normalized.includes("sauvegardé") ||
    normalized.includes("sauvegarde") ||
    normalized.includes("donnée aux joueurs") ||
    normalized.includes("donné aux joueurs")
  ) return "gain"

  if (
    normalized.includes("spéciale") ||
    normalized.includes("speciale") ||
    normalized.includes("faiblesse révélée") ||
    normalized.includes("faiblesse revelee") ||
    normalized.includes("pouvoir") ||
    normalized.includes("malédiction") ||
    normalized.includes("malediction") ||
    normalized.includes("skraa") ||
    normalized.includes("reihkt") ||
    normalized.includes("cri")
  ) return "special"

  return "info"
}

function showNotification(text, type) {
  text=pikaDisplayText(text)
  const box = document.getElementById("notification")
  if (!box) return
  const resolvedType = type || inferNotificationType(text)
  if (box.__hideTimer) clearTimeout(box.__hideTimer)
  box.setAttribute("role","status");box.setAttribute("aria-live","polite");box.setAttribute("aria-atomic","true")
  let clearance=100
  for(const id of ["gmBar","diceBar","playerThuumBtn"]){const el=document.getElementById(id);if(!el)continue;const r=el.getBoundingClientRect();if(r.width&&r.height&&r.top>innerHeight/2&&getComputedStyle(el).visibility!=="hidden")clearance=Math.max(clearance,innerHeight-r.top+12)}
  box.style.setProperty("--notice-bottom",clearance+"px")
  box.dataset.type = resolvedType
  box.innerText = text
  box.style.opacity = 1
  box.__hideTimer = setTimeout(() => {
    box.style.opacity = 0
    box.dataset.type = ""
  }, Math.min(9000,Math.max(4500,String(text).length*45)))
}

