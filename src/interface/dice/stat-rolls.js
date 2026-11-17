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

