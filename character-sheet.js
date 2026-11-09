"use strict"

// Fiches privées : inventaire, notes, poids, points libres et affichage de l’or.
const INVENTORY_STAT_LABELS=Object.freeze({force:"Force",charme:"Charme",perspi:"Perspicacité",chance:"Chance",defense:"Défense"})
const INVENTORY_EFFECT_STATS=Object.keys(INVENTORY_STAT_LABELS)

function refreshSheetEffectiveStatsDisplay() {
  if (!currentSheetPlayer) return
  const inventoryField = document.getElementById("inventaire")
  if (!inventoryField) return

  const previousMods = window.__sheetInventoryModifiers || { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
  const baseData = { ...(window.__sheetBaseCharacterData || {}) }

  INVENTORY_EFFECT_STATS.forEach(stat => {
    const field = document.getElementById(stat)
    if (!field) return
    const displayed = parseInt(field.value, 10)
    if (Number.isFinite(displayed)) baseData[stat] = displayed - (parseInt(previousMods[stat], 10) || 0)
  })

  const nextMods = (typeof getInventoryStatModifiers === "function")
    ? getEffectiveCharacterData(currentSheetPlayer,{...baseData,inventaire:inventoryField.value}).__inventoryStatMods
    : { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }

  INVENTORY_EFFECT_STATS.forEach(stat => {
    const field = document.getElementById(stat)
    if (!field) return
    field.value = (parseInt(baseData[stat], 10) || 0) + (nextMods[stat] || 0)
  })

  window.__sheetBaseCharacterData = baseData
  window.__sheetInventoryModifiers = nextMods
}

function getPersistedSheetStatValue(fieldId, rawValue, inventoryMods) {
  if (!INVENTORY_EFFECT_STATS.includes(fieldId)) return rawValue
  return Math.max(0, (parseInt(rawValue, 10) || 0) - (parseInt(inventoryMods[fieldId], 10) || 0))
}

function openCharacterSheet(id = null) {
  let playerID
  if (isGM) { if (!id) return; playerID = id }
  else {
    if (!myToken) { showNotification("Choisissez un personnage 🎭"); return }
    playerID = id || myToken.id
  }
  if (!canAccessCharacter(playerID)) { showNotification("Cette fiche est privée."); return }
  const goldField=document.getElementById("goldInput");if(goldField){goldField.dataset.dirty="false";goldField.value="";goldField.removeAttribute("aria-busy");goldField.style.display="none"}
  const sheetGeneration=window.__sheetViewGeneration=(window.__sheetViewGeneration||0)+1
  clearTimeout(window.__sheetFreePointsTimer)
  window.__sheetConfirmedCharacterData=null
  currentSheetPlayer = playerID
  document.getElementById("inventoryItemStats")?.replaceChildren()
  // Marquer la fiche avec l'ID du joueur pour éviter les sauvegardes croisées
  const sheet = document.getElementById("characterSheet")
  if (sheet) sheet.dataset.playerId = playerID
  const inv = document.getElementById("inventaire")
  inv.removeAttribute("readonly")
  const portraits = { greg:"gregsheet.jpg", ju:"pika-sheet.svg", elo:"elosheet.jpg", bibi:"bibisheet.jpg" }
  document.getElementById("sheetImage").src = "images/" + (portraits[playerID] || "elosheet.jpg")
  document.getElementById("sheetTitle").innerText = playerID === "ju" ? "PIKA — Elfe · Barde · Don : Appétit abyssal" : heroDisplayName(playerID).toUpperCase()
  document.querySelectorAll(".playerOnly").forEach(f => { f.style.display = playerID === "bibi" ? "none" : "block" })
  readCharacter(playerID, snapshot => {
    const data = snapshot.val(); if (!data || currentSheetPlayer !== playerID || sheetGeneration!==window.__sheetViewGeneration || !canAccessCharacter(playerID)) return
    window.__sheetBaseCharacterData = { ...data }
    window.__sheetConfirmedCharacterData={...data}
    window.__sheetInventoryModifiers = { force: 0, charme: 0, perspi: 0, chance: 0, defense: 0 }
    ;["lvl","xp","force","charme","perspi","chance","defense","hp"].forEach(k => { const el = document.getElementById(k); if (el) el.value = data[k] || 0 })
    if (!window._playerMaxPoids) window._playerMaxPoids = {}
    window._playerMaxPoids[playerID] = 100
    const mw = document.getElementById("maxWeight"); if (mw) mw.value = 100
    const invField = document.getElementById("inventaire")
    const notesField = document.getElementById("notes")
    if (invField) invField.value = data.inventaire || ""
    if (notesField) notesField.value = data.notes || ""
    refreshSheetEffectiveStatsDisplay()
    curseLevel = data.curse || 0
    document.querySelectorAll(".curseGem").forEach((g, i) => g.classList.toggle("active", i < curseLevel))
    corruptionLevel = data.corruption || 0
    document.querySelectorAll(".corruptionPoint").forEach((b, i) => b.classList.toggle("active", i < corruptionLevel))
    updateHPBar(); updateWeightBar()
  })
  document.getElementById("characterSheet").style.display = "block"
  window.GameWindows?.register(sheet,closeCharacterSheet)
  loadGold(playerID)
  // Vérifier si des points libres sont disponibles
  if (!isGM || playerID === myToken?.id) window.__sheetFreePointsTimer=setTimeout(() => {if(sheetGeneration===window.__sheetViewGeneration&&currentSheetPlayer===playerID&&document.getElementById("characterSheet")?.style.display!=="none"&&canAccessCharacter(playerID))checkFreePoints(playerID)}, 300)
}

let notesDraftScope=null,notesEditorDrafts=new Map()
function currentNotesDraftScope(){return (window.__authUid||"")+":"+(typeof persistenceRevision==="undefined"?"initial":persistenceRevision||"initial")}
function openNotesEditor(field) {
  const scope=currentNotesDraftScope();if(scope!==notesDraftScope){notesDraftScope=scope;notesEditorDrafts.clear()}
  const existing = document.getElementById("notesEditorPanel")
  if(existing){existing.__dismissNotes?.();if(existing.isConnected)return}
  const label = field.id === "inventaire" ? "Inventaire" : "Notes",editorPlayer=currentSheetPlayer,editorGeneration=window.__sheetViewGeneration
  const panel = document.createElement("div")
  panel.id = "notesEditorPanel"
  panel.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);width:min(340px,92vw);background:rgba(8,14,20,0.97);border:1px solid rgba(120,160,210,0.5);border-radius:12px;z-index:2000000000;box-shadow:0 8px 32px rgba(0,0,0,0.85);touch-action:none;"
  // Header draggable
  const header = document.createElement("div")
  header.style.cssText = "padding:10px 14px;cursor:grab;background:rgba(20,40,60,0.92);border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between;user-select:none;-webkit-user-select:none;"
  header.innerHTML = "<span style='font-family:Cinzel,serif;font-size:13px;color:#c7d3e8;'>✏ " + label + "</span>"
  const closeX = document.createElement("button");closeX.type="button";closeX.setAttribute("aria-label","Fermer et garder le brouillon")
  closeX.innerText = "✕"
  closeX.style.cssText = "color:#8aabcf;cursor:pointer;font-size:16px;padding:0 4px;"
  closeX.onclick = () => closeNotes()
  header.appendChild(closeX)
  panel.appendChild(header)
  // Drag logic
  let _dx = false, _sx, _sy, _ox, _oy
  header.addEventListener("pointerdown", e => {
    if(e.target.closest("button"))return
    _dx = true; _sx = e.clientX; _sy = e.clientY
    const r = panel.getBoundingClientRect(); _ox = r.left; _oy = r.top
    panel.style.transform = "none"; panel.style.left = _ox + "px"; panel.style.top = _oy + "px"
    header.style.cursor = "grabbing"; header.setPointerCapture(e.pointerId); e.preventDefault()
  })
  header.addEventListener("pointermove", e => {
    if (!_dx) return
    panel.style.left = (_ox + e.clientX - _sx) + "px"
    panel.style.top  = (_oy + e.clientY - _sy) + "px"
  })
  header.addEventListener("pointerup", () => { _dx = false; header.style.cursor = "grab" })
  // Textarea
  const ta = document.createElement("textarea")
  const draftKey=editorPlayer+":"+field.id
  ta.value = notesEditorDrafts.has(draftKey)?notesEditorDrafts.get(draftKey):field.value||""
  ta.style.cssText = "width:100%;height:160px;padding:12px 14px;background:rgba(5,10,15,0.95);border:none;border-bottom:1px solid rgba(120,160,210,0.25);color:#f0e8c8;font-family:'IM Fell English',serif;font-size:14px;line-height:1.5;resize:none;box-sizing:border-box;outline:none;-webkit-appearance:none;"
  ta.setAttribute("inputmode", "text")
  ta.spellcheck = false
  panel.appendChild(ta)
  let saving=false
  const retainDraft=()=>{if(scope!==currentNotesDraftScope())return;if(ta.value===(field.value||""))notesEditorDrafts.delete(draftKey);else notesEditorDrafts.set(draftKey,ta.value)}
  const closeNotes=(discard=false)=>{if(saving)return;if(discard)notesEditorDrafts.delete(draftKey);else retainDraft();panel.remove();window.GameWindows?.closed(panel)}
  panel.__dismissNotes=closeNotes;ta.addEventListener("input",retainDraft)
  // Boutons
  const btnRow = document.createElement("div")
  btnRow.style.cssText = "display:flex;gap:8px;padding:10px 14px;justify-content:flex-end;"
  const cancelBtn = document.createElement("button")
  cancelBtn.innerText = "Annuler"
  cancelBtn.style.cssText = "padding:8px 16px;background:#222;color:#d0c4ae;border:1px solid #555;border-radius:8px;font-family:Cinzel,serif;font-size:12px;cursor:pointer;"
  cancelBtn.onclick = () => closeNotes(true)
  const saveBtn = document.createElement("button")
  saveBtn.innerText = "Enregistrer"
  saveBtn.style.cssText = "padding:8px 16px;background:linear-gradient(#3d5d44,#233526);color:#e8f4e0;border:1px solid #87aa86;border-radius:8px;font-family:Cinzel,serif;font-size:12px;cursor:pointer;"
  const message=document.createElement("p");message.setAttribute("role","status");message.style.cssText="margin:8px 12px;color:#f0e8c8";panel.appendChild(message)
  saveBtn.onclick=async()=>{
    if(saving)return;saving=true;saveBtn.disabled=true;cancelBtn.disabled=true;ta.readOnly=true;message.textContent="Enregistrement…"
    try{
      requireActionConnection();if(currentSheetPlayer!==editorPlayer||editorGeneration!==window.__sheetViewGeneration||!canAccessCharacter(editorPlayer))throw Error("La fiche a changé : votre texte n’a pas été transféré");field.value=ta.value;field.dispatchEvent(new Event("input",{bubbles:true}));clearTimeout(window.__sheetAutoSaveTimer);window.__sheetAutoSaveTimer=null
      const result=await autoSaveCharacter();if(result===false)throw Error("Vérifiez les valeurs de la fiche")
      notesEditorDrafts.delete(draftKey);panel.remove();window.GameWindows?.closed(panel);showNotification(label+" de "+heroDisplayName(editorPlayer)+(label==="Notes"?" enregistrées":" enregistré"))
    }catch(error){message.textContent="Enregistrement non confirmé : "+error.message+". Votre texte reste dans cette fenêtre."}
    finally{saving=false;saveBtn.disabled=false;cancelBtn.disabled=false;ta.readOnly=false}
  }
  btnRow.appendChild(cancelBtn)
  btnRow.appendChild(saveBtn)
  panel.appendChild(btnRow)
  document.body.appendChild(panel)
  window.GameWindows?.register(panel,closeNotes,{returnFocus:field});panel.setAttribute("role","dialog");panel.setAttribute("aria-label",label+" — brouillon conservé à la fermeture")
  setTimeout(() => {if(panel.isConnected)ta.focus()}, 80)
}

function closeCharacterSheet() {
  clearTimeout(window.__sheetFreePointsTimer)
  const closingGeneration=window.__sheetViewGeneration
  if (window.__sheetAutoSaveTimer) {
    clearTimeout(window.__sheetAutoSaveTimer)
    window.__sheetAutoSaveTimer = null
  }
  const closingPlayerId = currentSheetPlayer
  Promise.resolve(saveCharacter()).then(saved => {
    if (!saved) return
    const sheet = document.getElementById("characterSheet"); if (!sheet) return
    if(closingGeneration!==window.__sheetViewGeneration||currentSheetPlayer!==closingPlayerId)return
    window.__sheetViewGeneration=(window.__sheetViewGeneration||0)+1
    currentSheetPlayer=null;sheet.dataset.playerId=""
    sheet.style.display = "none"
    window.GameWindows?.closed(sheet)
    window.__sheetBaseCharacterData = null
    window.__sheetConfirmedCharacterData=null
    window.__sheetInventoryModifiers = null
    if (pendingLevelUp[closingPlayerId]) { triggerLevelUp(closingPlayerId); pendingLevelUp[closingPlayerId] = false }
  })
}

function forceCloseCharacterSheetWithoutSave() {
  clearTimeout(window.__sheetFreePointsTimer)
  window.__sheetViewGeneration=(window.__sheetViewGeneration||0)+1
  if (window.__sheetAutoSaveTimer) {
    clearTimeout(window.__sheetAutoSaveTimer)
    window.__sheetAutoSaveTimer = null
  }
  const sheet = document.getElementById("characterSheet")
  if (!sheet) return
  sheet.style.display = "none"
  window.GameWindows?.closed(sheet,{restoreFocus:false})
  sheet.dataset.playerId = ""
  currentSheetPlayer = null
  window.__sheetBaseCharacterData = null
    window.__sheetConfirmedCharacterData=null
  window.__sheetInventoryModifiers = null
  const title = document.getElementById("sheetTitle")
  if (title) title.innerText = ""
  const img = document.getElementById("sheetImage")
  if (img) img.removeAttribute("src")
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if ("value" in f) f.value = ""
  })
}

function collectCharacterSheetPatch(){
 const confirmed=window.__sheetConfirmedCharacterData;if(!confirmed)throw Error("Attendez la lecture de la fiche")
 const data={},pending=window.__characterPendingFields?.[currentSheetPlayer+":"+window.__sheetViewGeneration]||{},inventory=document.getElementById("inventaire")?.value||"",notes=document.getElementById("notes")?.value||"",mods=getEffectiveCharacterData(currentSheetPlayer,{...confirmed,inventaire:inventory}).__inventoryStatMods
 for(const field of document.querySelectorAll("#characterSheet .sheetField")){
  if(field.offsetParent===null||["weight","maxWeight","inventaire","notes"].includes(field.id))continue
  const value=String(field.value??"").trim();if(!value)continue
  if(!Number.isSafeInteger(Number(value))||Number(value)<0)throw Error("Valeur invalide : "+field.id)
  const raw=getPersistedSheetStatValue(field.id,Number(value),mods)
  if(pending[field.id]||raw!==Number(confirmed[field.id]))data[field.id]=raw
 }
 if(pending.inventaire||inventory!==String(confirmed.inventaire||"")){data.inventaire=inventory;data.equipmentModifiers=mods;data.carriedWeight=Math.max(0,_parseInventoryWeight(inventory))}
 if(pending.notes||notes!==String(confirmed.notes||""))data.notes=notes
 if(confirmed.poids!==100)data.poids=100
 const gold=document.getElementById("goldInput");if(gold?.dataset.dirty==="true"){const value=Number(gold.value);if(!gold.value.trim()||!Number.isSafeInteger(value)||value<0||value>999999)throw Error("Or : indiquez un entier entre 0 et 999999");data.gold=value}
 return data
}
function confirmCharacterSheetPatch(id,data,generation){
 if(currentSheetPlayer!==id||generation!==window.__sheetViewGeneration)return
 window.__sheetConfirmedCharacterData={...window.__sheetConfirmedCharacterData,...data}
 window.__sheetBaseCharacterData={...window.__sheetBaseCharacterData,...data}
 confirmSheetGold(id,data.gold,generation)
}
function saveCharacter(){
 if(window.__sheetAllocation?.id===currentSheetPlayer)return window.__sheetAllocation.promise.then(()=>saveCharacter(),()=>false)
 if(!canAccessCharacter(currentSheetPlayer))return Promise.resolve(false)
 const id=currentSheetPlayer,generation=window.__sheetViewGeneration;let data
 try{data=collectCharacterSheetPatch()}catch(error){showNotification(error.message);return Promise.resolve(false)}
 if(window.__actionOnline)showNotification("Enregistrement de la fiche de "+heroDisplayName(id)+"…")
 return persistCharacterEdits(id,data,generation).then(()=>{confirmCharacterSheetPatch(id,data,generation);showNotification("Fiche de "+heroDisplayName(id)+" enregistrée");return true}).catch(error=>{showNotification("Fiche de "+heroDisplayName(id)+" non confirmée : "+error.message+". Le texte reste dans la fiche.");return false})
}
function autoSaveCharacter(){
 if(window.__sheetAllocation?.id===currentSheetPlayer)return window.__sheetAllocation.promise.then(()=>autoSaveCharacter())
 const id=currentSheetPlayer,generation=window.__sheetViewGeneration,sheet=document.getElementById("characterSheet")
 if(!canAccessCharacter(id)||sheet?.dataset.playerId!==id)return Promise.reject(Error("La fiche a changé"))
 let data;try{data=collectCharacterSheetPatch()}catch(error){return Promise.reject(error)}
 return persistCharacterEdits(id,data,generation).then(()=>{confirmCharacterSheetPatch(id,data,generation);["greg","ju","elo","bibi"].forEach(p=>updateTokenStats(p));return true})
}

function queueCharacterAutoSave(delay = 220) {
  if (window.__sheetAutoSaveTimer) clearTimeout(window.__sheetAutoSaveTimer)
  const epoch=reliableEpoch,uid=window.__authUid,revision=persistenceRevision,wasOnline=window.__actionOnline
  window.__sheetAutoSaveTimer = setTimeout(() => {
    window.__sheetAutoSaveTimer = null
    Promise.resolve().then(()=>{if(!wasOnline||epoch!==reliableEpoch||uid!==window.__authUid||revision!==persistenceRevision)throw Error("Connexion ou partie changée : enregistrez explicitement votre brouillon");return autoSaveCharacter()}).catch(error=>showNotification("Modifications non enregistrées : "+error.message+". Le texte reste dans la fiche."))
  }, Math.max(0, parseInt(delay, 10) || 0))
}

function updateHPBar() {
  const hp = parseInt(document.getElementById("hp").value) || 0
  document.getElementById("hpBar").style.width = Math.max(0, Math.min(100, hp)) + "%"
}

function _parseInventoryWeight(text) { return parseInventoryWeight(text).total }

function updateWeightBar() {
  if (!currentSheetPlayer) return
  const inventory = document.getElementById("inventaire"), result = parseInventoryWeight(inventory?.value || "")
  const total = result.total, max = 100
  refreshSheetEffectiveStatsDisplay()
  document.getElementById("weight").value = total
  document.getElementById("maxWeight").value = max
  const bar = document.getElementById("weightBar"), pct = Math.max(0, Math.min(100, total / max * 100))
  bar.style.width = pct + "%"; bar.style.background = result.warnings.length ? "#e6a23c" : total > max ? "red" : pct >= 70 ? "orange" : "lime"
  const token = document.getElementById(currentSheetPlayer); if (token) token.classList.toggle("overweight", total > max)
  let status = document.getElementById("inventoryWeightStatus")
  if (!status) { status = document.createElement("div"); status.id = "inventoryWeightStatus"; status.setAttribute("role", "status"); document.getElementById("inventoryTools")?.appendChild(status) }
  if (status) {
    status.replaceChildren()
    const summary = document.createElement("strong")
    summary.textContent = (result.warnings.length ? "Poids incomplet : " : "Poids total : ") + total + " / 100" + (total > max ? " — SURCHARGE : retirez " + Math.round((total - max)*1000)/1000 : "")
    status.appendChild(summary)
    for (const warning of result.warnings) { const row = document.createElement("div"); row.textContent = "Ligne " + warning.line + " : " + warning.message; status.appendChild(row) }
    inventory?.setAttribute("aria-invalid", String(result.warnings.length > 0))
  }
}


function addInventoryStatRow(){
 if(!canAccessCharacter(currentSheetPlayer))return
 const zone=document.getElementById("inventoryItemStats");if(!zone)return
 const row=document.createElement("div");row.className="inventoryStatRow";row.style.cssText="display:flex;gap:8px;flex-wrap:wrap;align-items:center"
 row.dataset.stat="force"
 const choices=document.createElement("fieldset");choices.className="inventoryStatChoices"
 const legend=document.createElement("legend");legend.textContent="Caractéristique";choices.appendChild(legend)
 for(const [value,text]of Object.entries(INVENTORY_STAT_LABELS)){
  const button=document.createElement("button");button.type="button";button.dataset.stat=value;button.textContent=text;button.setAttribute("aria-pressed",String(value===row.dataset.stat))
  button.onclick=()=>{row.dataset.stat=value;for(const other of choices.querySelectorAll("button"))other.setAttribute("aria-pressed",String(other===button))}
  button.onkeydown=event=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();event.stopPropagation();const buttons=[...choices.querySelectorAll("button")],index=buttons.indexOf(button),next=buttons[(index+(["ArrowLeft","ArrowUp"].includes(event.key)?-1:1)+buttons.length)%buttons.length];next.click();next.focus()}
  choices.appendChild(button)
 }
 row.appendChild(choices)
 const pointsLabel=document.createElement("label");pointsLabel.textContent="Points ";const points=document.createElement("input");points.className="inventoryStatValue";points.type="number";points.min="-1000";points.max="1000";points.step="1";points.value="1";points.style.width="80px";points.setAttribute("aria-label","Points de caractéristique");pointsLabel.appendChild(points);row.appendChild(pointsLabel)
 const remove=document.createElement("button");remove.type="button";remove.className="inventoryStatRemove";remove.textContent="Retirer";remove.onclick=()=>row.remove();row.appendChild(remove);zone.appendChild(row);choices.querySelector("button").focus()
}
function inventoryItemStatText(){
 const names=INVENTORY_STAT_LABELS,totals={}
 for(const row of document.querySelectorAll("#inventoryItemStats .inventoryStatRow")){
  const key=row.dataset.stat,input=row.querySelector(".inventoryStatValue"),value=Number(input.value)
  if(!Object.hasOwn(names,key)||!input.value.trim()||!Number.isSafeInteger(value)||Math.abs(value)>1000){input.focus();throw Error("Choisissez une caractéristique et un nombre entier entre -1000 et 1000.")}
  totals[key]=(totals[key]||0)+value
 }
 return Object.entries(totals).filter(([,v])=>v!==0).map(([key,value])=>(value>0?"+":"")+value+" "+names[key]).join(", ")
}

function addInventoryItem() {
  if (!canAccessCharacter(currentSheetPlayer)) return
  const name = document.getElementById("inventoryItemName"), quantity = document.getElementById("inventoryItemQuantity"), weight = document.getElementById("inventoryItemWeight")
  const label = name.value.trim(), qty = Number(quantity.value.replace(",", ".")), rawWeight = weight.value.trim().replace(",", "."), amount = Number(rawWeight)
  if (!label || /[\r\n()]/.test(label) || /(?:^|\s)[x×]\s*\d/i.test(label)) { showNotification("Indiquez un nom d’objet sans parenthèses ni quantité."); name.focus(); return }
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1000000) { showNotification("La quantité doit être un entier supérieur à zéro."); quantity.focus(); return }
  if (!rawWeight || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(rawWeight) || !Number.isFinite(amount) || amount < 0 || amount > 1000000) { showNotification("Indiquez un poids positif ou zéro, sans unité."); weight.focus(); return }
  let bonuses;try{bonuses=inventoryItemStatText()}catch(error){showNotification(error.message);return}
  const inventory = document.getElementById("inventaire"), line = label + (bonuses ? " — "+bonuses : "") + (qty === 1 ? "" : " x" + qty) + " (" + amount + ")"
  const parsed = parseInventoryWeight(line); if (parsed.warnings.length || parsed.entries.length !== 1) { showNotification("Cet objet ne peut pas être ajouté : vérifiez son nom et son poids."); return }
  inventory.value += (inventory.value && !inventory.value.endsWith("\n") ? "\n" : "") + line
  inventory.dispatchEvent(new Event("input", {bubbles:true})); updateWeightBar(); queueCharacterAutoSave(0)
  name.value = ""; quantity.value = "1"; weight.value = ""; document.getElementById("inventoryItemStats")?.replaceChildren(); name.focus()
}

// Attribution des points libres.
function showFreePointsPanel(playerID, points) {
  if (!canAccessCharacter(playerID)) return
  const existing = document.getElementById("freePointsPanel"); if (existing) existing.remove()
  if (points <= 0) return

  const panel = document.createElement("div"); panel.id = "freePointsPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:20px;z-index:999999999;min-width:320px;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#d4a835;margin-bottom:6px;text-align:center;"
  title.innerText = "✦ LEVEL UP ✦"
  panel.appendChild(title)

  const sub = document.createElement("div"); sub.style.cssText = "font-family:'IM Fell English',serif;font-size:13px;color:#6a9aaa;text-align:center;margin-bottom:16px;font-style:italic;"
  sub.innerText = "Répartissez vos points de capacité"
  panel.appendChild(sub)

  const counter = document.createElement("div"); counter.id = "freePointsCounter"; counter.style.cssText = "text-align:center;font-size:28px;color:#d4a835;margin-bottom:16px;letter-spacing:2px;"
  counter.innerText = points + " point" + (points > 1 ? "s" : "") + " restant" + (points > 1 ? "s" : "")
  panel.appendChild(counter)

  let remaining = points
  const changes = {}

  const stats = ["force","charme","perspi","chance","defense"]
  const statLabels = { force:"Force", charme:"Charme", perspi:"Perspicacité", chance:"Chance", defense:"Défense" }

  stats.forEach(stat => {
    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:6px 10px;background:rgba(10,30,38,0.6);border:1px solid rgba(30,90,102,0.3);border-radius:2px;"

    const label = document.createElement("div"); label.style.cssText = "font-size:12px;color:#a0c8d0;letter-spacing:1px;flex:1;"
    label.innerText = statLabels[stat]

    const addedEl = document.createElement("div"); addedEl.id = "fp_added_"+stat; addedEl.style.cssText = "font-size:11px;color:#d4a835;min-width:40px;text-align:center;"
    addedEl.innerText = "+0"

    const minus = document.createElement("button"); minus.innerText = "−"; minus.style.cssText = "width:26px;height:26px;font-size:16px;background:rgba(80,20,20,0.5);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;margin:0 4px;"
    minus.onclick = () => {
      if (!(changes[stat] > 0)) return
      changes[stat]--; remaining++
      addedEl.innerText = "+" + (changes[stat] || 0)
      counter.innerText = remaining + " point" + (remaining > 1 ? "s" : "") + " restant" + (remaining > 1 ? "s" : "")
      confirmBtn.disabled = remaining > 0; confirmBtn.style.opacity = remaining > 0 ? "0.4" : "1"
    }

    const plus = document.createElement("button"); plus.innerText = "+"; plus.style.cssText = "width:26px;height:26px;font-size:16px;background:rgba(20,60,80,0.5);color:#88ccdd;border:1px solid rgba(30,90,102,0.4);border-radius:2px;cursor:pointer;margin:0 4px;"
    plus.onclick = () => {
      if (remaining <= 0) return
      changes[stat] = (changes[stat] || 0) + 1; remaining--
      addedEl.innerText = "+" + changes[stat]
      counter.innerText = remaining + " point" + (remaining > 1 ? "s" : "") + " restant" + (remaining > 1 ? "s" : "")
      confirmBtn.disabled = remaining > 0; confirmBtn.style.opacity = remaining > 0 ? "0.4" : "1"
    }

    row.appendChild(label); row.appendChild(minus); row.appendChild(addedEl); row.appendChild(plus)
    panel.appendChild(row)
  })

  const confirmBtn = document.createElement("button"); confirmBtn.style.cssText = "width:100%;margin-top:12px;padding:10px;font-family:Cinzel,serif;font-size:13px;background:rgba(10,40,52,0.8);color:#a0c8d0;border:1px solid #1e5a66;border-radius:2px;cursor:pointer;opacity:0.4;letter-spacing:2px;transition:all 0.2s;"
  confirmBtn.innerText = "✦ Confirmer"; confirmBtn.disabled = true
  let submitting=false
  confirmBtn.onclick = async () => {
    if(submitting||!canAccessCharacter(playerID)||remaining!==0||window.__sessionBusy)return
    submitting=true;const generation=window.__sheetViewGeneration,allocation={...changes},controls=[...panel.querySelectorAll("button"),confirmBtn]
    controls.forEach(b=>b.disabled=true);confirmBtn.innerText="Enregistrement…"
    try{
      requireActionConnection();clearTimeout(window.__sheetAutoSaveTimer);window.__sheetAutoSaveTimer=null
      if(currentSheetPlayer===playerID&&!await saveCharacter())throw Error("Enregistrez d’abord la fiche")
      const operation=persistCharacterTransaction(playerID,current=>spendCharacterPoints(current,allocation,points)||undefined).then(result=>{
        if(!result.committed)throw Error("Ces points ont déjà été utilisés. Rouvrez la fiche.")
        if(currentSheetPlayer===playerID&&generation===window.__sheetViewGeneration){
          const confirmed=result.snapshot.val(),previous=window.__sheetConfirmedCharacterData||{},inventory=document.getElementById("inventaire"),notes=document.getElementById("notes")
          if(inventory.value===String(previous.inventaire||""))inventory.value=confirmed.inventaire||""
          if(notes.value===String(previous.notes||""))notes.value=confirmed.notes||""
          const effective=getEffectiveCharacterData(playerID,{...confirmed,inventaire:inventory.value}),oldEffective=getEffectiveCharacterData(playerID,previous)
          for(const key of ["lvl","xp","hp",...stats]){const field=document.getElementById(key);if(field&&Number(field.value)===Number(oldEffective[key]))field.value=effective[key]}
          window.__sheetConfirmedCharacterData={...confirmed};window.__sheetBaseCharacterData={...confirmed};window.__sheetInventoryModifiers=getInventoryStatModifiers(inventory.value)
          updateWeightBar();updateHPBar()
        }
        panel.remove();window.GameWindows?.closed(panel);showNotification("Points de "+heroDisplayName(playerID)+" enregistrés");flashGold();return true
      }).finally(()=>{if(window.__sheetAllocation?.promise===operation)window.__sheetAllocation=null})
      window.__sheetAllocation={id:playerID,promise:operation};await operation
    }catch(error){showNotification("Points non confirmés : "+error.message)}
    finally{submitting=false;controls.forEach(b=>b.disabled=false);confirmBtn.disabled=remaining>0;confirmBtn.innerText="✦ Confirmer"}
  }
  panel.appendChild(confirmBtn)

  document.body.appendChild(panel)
  window.GameWindows?.register(panel,()=>{if(!submitting){panel.remove();window.GameWindows.closed(panel)}})
  flashGold()
}

function checkFreePoints(playerID) {
  const generation=window.__sheetViewGeneration
  if (!canAccessCharacter(playerID)||currentSheetPlayer!==playerID) return
  db.ref("characters/" + playerID + "/freePoints").once("value", snap => {
    if (!canAccessCharacter(playerID)||currentSheetPlayer!==playerID||generation!==window.__sheetViewGeneration||document.getElementById("characterSheet")?.style.display==="none") return
    const pts = parseInt(snap.val()) || 0
    if (pts > 0) showFreePointsPanel(playerID, pts)
  })
}

// Affichage et édition de la bourse.
function toggleGoldInput() {
  const input   = document.getElementById("goldInput")
  const display = document.getElementById("goldDisplay")
  if (!input || !display) return
  const snd = new Audio("audio/coin.mp3"); setManagedAudioBaseVolume(snd, 0.7); snd.play().catch(()=>{})
  setTimeout(()=>{ let iv=setInterval(()=>{ if(snd.volume>0.05) snd.volume=Math.max(0,snd.volume-0.04); else{ snd.pause(); clearInterval(iv) } },100) }, 2000)
  const open = input.style.display !== "none"
  if (open) {
    input.style.display = "none"
    display.style.display = "block"
  } else {
    display.style.display = "none"
    input.style.display = "block"
    input.focus(); input.select()
  }
}

async function saveGold() {
 const id=currentSheetPlayer,input=document.getElementById("goldInput"),generation=window.__sheetViewGeneration
 if(!input||!canAccessCharacter(id))return false
 const value=Number(input.value);input.dataset.dirty="true"
 if(!input.value.trim()||!Number.isSafeInteger(value)||value<0||value>999999){showNotification("Or : indiquez un entier entre 0 et 999999");return false}
 const key=id+":"+value;if(window.__goldSavePending?.key===key)return window.__goldSavePending.promise
 const promise=(async()=>{input.setAttribute("aria-busy","true");if(window.__actionOnline)showNotification("Enregistrement de l’or de "+heroDisplayName(id)+"…");try{
  await persistCharacterEdits(id,{gold:value})
  if(currentSheetPlayer===id&&generation===window.__sheetViewGeneration&&Number(input.value)===value){input.dataset.dirty="false";input.style.display="none";const display=document.getElementById("goldDisplay");if(display){display.innerText=value+" po";display.style.display="block"}}
  showNotification("Or de "+heroDisplayName(id)+" enregistré : "+value+" po");return true
 }catch(error){if(currentSheetPlayer===id&&generation===window.__sheetViewGeneration)input.style.display="block";showNotification("Or de "+heroDisplayName(id)+" non confirmé : "+error.message);return false}
 finally{if(window.__goldSavePending?.key===key){window.__goldSavePending=null;input.removeAttribute("aria-busy")}}})()
 window.__goldSavePending={key,promise};return promise
}

function loadGold(playerID) {
  const generation=window.__sheetViewGeneration
  if (!canAccessCharacter(playerID)) return
  db.ref("characters/" + playerID + "/gold").once("value", snap => {
    if (!canAccessCharacter(playerID) || currentSheetPlayer !== playerID || generation!==window.__sheetViewGeneration) return
    const val = parseInt(snap.val()) || 0
    const input   = document.getElementById("goldInput")
    const display = document.getElementById("goldDisplay")
    if(input?.dataset.dirty==="true")return
    if (input) { input.value = val;input.dataset.dirty="false" }
    if (display) { display.innerText = val + " po"; display.style.display = "block" }
  })
}

// Écritures de fiche ordonnées, sans renvoi après une coupure.
function enqueueCharacterMutation(id,write){
  try{if(!canAccessCharacter(id))throw Error("Fiche privée");if(!window.__actionOnline)throw Error("Connexion perdue : modification non envoyée");if(window.__sessionBusy&&!window.__sheetFlushAuthorized)throw Error("La partie se synchronise")}catch(error){return Promise.reject(error)}
  window.__characterEditQueue||={}
  const epoch=reliableEpoch,uid=window.__authUid,revision=persistenceRevision
  const promise=Promise.resolve(window.__characterEditQueue[id]).catch(()=>{}).then(()=>{if(epoch!==reliableEpoch||uid!==window.__authUid||revision!==persistenceRevision)throw Error("Contexte changé : enregistrez à nouveau la fiche");return write()})
  window.__characterEditQueue[id]=promise
  pendingSessionWrites.add(promise);promise.then(()=>pendingSessionWrites.delete(promise),()=>pendingSessionWrites.delete(promise));return promise
}
function persistCharacterEdits(id,data,sourceGeneration=null){
 const patch=JSON.parse(JSON.stringify(data)),keys=Object.keys(patch),key=id+":"+sourceGeneration
 window.__characterPendingFields||={};const fields=sourceGeneration==null?null:(window.__characterPendingFields[key]||={})
 if(fields)keys.forEach(name=>fields[name]=(fields[name]||0)+1)
 return enqueueCharacterMutation(id,()=>reliableCharacterPatch(id,patch)).finally(()=>{if(!fields)return;for(const name of keys){if(--fields[name]<=0)delete fields[name]}if(!Object.keys(fields).length&&window.__characterPendingFields[key]===fields)delete window.__characterPendingFields[key]})
}
function persistCharacterTransaction(id,update){return enqueueCharacterMutation(id,()=>reliableCharacterTransaction(id,update))}

function confirmSheetGold(id,value,generation){if(value==null||currentSheetPlayer!==id||generation!==window.__sheetViewGeneration)return;const field=document.getElementById("goldInput");if(field&&Number(field.value)===value)field.dataset.dirty="false"}
