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

