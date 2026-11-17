function getCombatStatusEntries(){
 const entries=[],c=window.__combatSnapshot||{},state=c.turnState||getCombatTurnState(),actor=state?.currentActorId
 for(const id of COMBAT_CHARACTERS){if(window.__helMarks?.[id])entries.push({kind:"warn",title:heroDisplayName(id)+" — Marque des parjures",text:"PV maximum −15 %",meta:"Permanent — seul le MJ peut lever le courroux"});const ward=c.helReprieves?.[id];if(ward)entries.push({kind:"buff",title:heroDisplayName(id)+" — Sursis de Hel",text:"Le prochain coup fatal laisse à 1 PV, puis consomme le sursis",meta:"Jusqu’à la fin du round "+ward.expiresAfterRound})}
 if(state?.phase==="active"&&actor)entries.push({kind:"buff",title:"Tour actif",text:(actor==="greg"?"Greg et Bibi":COMBAT_MOBS.includes(actor)?combatEnemyLabel(actor):heroDisplayName(actor))+" joue maintenant",meta:"Round "+(state.round||1)})
 if(c.heroHaste)entries.push({kind:"buff",title:"SKARO’H — "+heroDisplayName(c.heroHaste.actor),text:"Attaques basiques consécutives",meta:c.heroHaste.remaining+" attaque(s) restante(s)"})
 if(state?.phase==="rolling")entries.push({kind:"warn",title:"Initiative",text:"Les jets d’initiative sont en cours",meta:"Ordre des tours en préparation"})
 for(const slot of COMBAT_MOBS){
  const mob=c[slot];if(!mob||mob.hp<=0)continue
  const effects=[],add=(title,text,meta,kind="warn")=>effects.push({kind,title,text,meta})
  if(mob.nidhoggWound)add("Morsure des racines","Dégâts reçus +"+mob.nidhoggWound.percent+" %","Jusqu’à la fin du round "+mob.nidhoggWound.expiresAfterRound)
  if(mob.helDuoWeakened)add("Jugement de la Couronne creuse","La prochaine attaque inflige 50 % de dégâts en moins","Spéciale comprise")
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
 for(const [id,buff]of Object.entries(c.heroBuffs||{}))if(buff.turns>0)entries.push({kind:"buff",title:heroDisplayName(id)+" — élixir",text:"+"+buff.amount+" "+buff.stat,meta:buff.turns+" round(s) restant(s)"})
 for(const [id,buff]of Object.entries(c.heroPowerBuffs||{}))if(buff.turns>0)entries.push({kind:"buff",title:heroDisplayName(id)+" — pouvoir",text:"Dégâts +25 %",meta:buff.turns+" round(s) restant(s)"})
 for(const [id,n]of Object.entries(c.heroStuns||{}))if(n>0)entries.push({kind:"warn",title:heroDisplayName(id)+" étourdi",text:"Action neutralisée",meta:n+" action(s) à sauter"})
 for(const [id,states]of Object.entries(c.gmStates||{}))for(const [key,value]of Object.entries(states)){const def=GM_COMBAT_STATES[key];if(def)entries.push({kind:"warn",title:(COMBAT_MOBS.includes(id)?combatEnemyLabel(id):heroDisplayName(id))+" — "+def.label,text:def.description,meta:value.turns+" "+def.unit+" restant(s)"+(value.amount?" · "+value.amount+(value.mode==="percent"?" %":" points"):"")})}
 const summon=c.eloSummon;if(summon?.active)entries.push({kind:"ally",title:"John Pork",text:"Tank : encaisse les attaques à cible unique. Bonus D4 aux attaques d’Elo"+(summon.frenzy?", doublé et en zone":""),meta:(summon.turnsLeft||0)+" round(s) · "+(summon.hp||0)+" / "+(summon.maxHP||0)+" PV"})
 const hits=window.__combatDamageLog||[];if(hits.length)entries.push({kind:"section",title:"Historique — jets, dégâts et conséquences"})
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
  const opened=new Set([...panel.querySelectorAll('details[open]')].map(row=>row.dataset.actionText))
  const previousScroll=panel.scrollTop
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

    const detailed=entry.kind==="summary"
    const row = document.createElement(detailed?"details":"div")
    row.className = "combatStatusItem combatStatusItem--" + (entry.kind || "buff")
    if(detailed){const toggle=document.createElement("summary");toggle.textContent=entry.title+" — détails de l’action";row.appendChild(toggle);row.addEventListener("keydown",event=>{if(event.key==="Escape"&&row.open){row.open=false;toggle.focus();event.stopPropagation()}})}
    if(detailed){row.dataset.actionText=entry.text;row.open=opened.has(entry.text)}
    if ((entry.title || "").toLowerCase().includes("tour actif")) row.classList.add("combatStatusItem--turn")
    if ((entry.title || "").toLowerCase().includes("faiblesse")) row.classList.add("combatStatusItem--weakness")

    const icon = document.createElement("img")
    icon.className = "combatStatusIcon"
    icon.src = "images/" + sanitizeAssetName(entry.icon || "impact_ring.png")
    icon.alt = ""
    icon.onerror = () => { icon.style.display = "none" }
    if(!detailed)row.appendChild(icon)

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
  panel.scrollTop=previousScroll
}

