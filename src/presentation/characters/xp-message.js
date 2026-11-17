function showXPMessage(amount) {
  const msg = document.createElement("div")
  msg.innerText = "+" + amount + " XP pour le groupe"
  msg.style.cssText = "position:fixed;left:50%;top:55%;transform:translate(-50%,0);font-family:Cinzel;font-size:40px;color:gold;text-shadow:0 0 10px gold,0 0 20px orange,0 0 40px gold;pointer-events:none;z-index:999999999;opacity:0;transition:all 1s ease;"
  document.body.appendChild(msg)
  setTimeout(() => { msg.style.opacity = "1"; msg.style.transform = "translate(-50%,-40px)" }, 50)
  setTimeout(() => { msg.style.opacity = "0"; msg.style.transform = "translate(-50%,-120px)" }, 2500)
  setTimeout(() => msg.remove(), 3500)
}

