function renderAllMobPanels(snapshot=null) {
  const active = MOB_SLOTS.filter(s => activeMobSlots[s])
  const fromSnapshot=!!snapshot&&active.every(slot=>snapshot[slot])
  const renderKey=fromSnapshot?JSON.stringify([isGM,snapshot.id,snapshot.turnState?.round,active.map(slot=>[slot,snapshot[slot]])]):null
  const ex=document.getElementById("mobAttackPanel")
  if(combatActive&&active.length&&renderKey&&ex?.__renderKey===renderKey)return
  if(ex) ex.remove()
  const exT=document.getElementById("mobAttackToggle"); if(exT) exT.remove()
  if (!active.length || !combatActive) return

  const container = document.createElement("div"); container.id = "mobAttackPanel"
  container.__renderKey=renderKey
  container.style.cssText = "position:fixed;top:calc(96px + 38vh - 132px);right:22px;width:320px;display:flex;flex-direction:column;gap:10px;z-index:9999999;max-height:48vh;overflow-y:auto;padding:4px;"

  // Grab & drop pour le MJ
  if (isGM) {
    let pointer=null,ox=0,oy=0
    container.style.cursor="grab"
    container.addEventListener("pointerdown",e=>{
      if(e.button!==0||e.pointerType==="touch"||e.target.closest("button,input,select,textarea,summary,[role=button]")||e.target.closest("[onclick]"))return
      pointer=e.pointerId;const rect=container.getBoundingClientRect();ox=e.clientX-rect.left;oy=e.clientY-rect.top
      container.setPointerCapture?.(pointer);container.style.cursor="grabbing";e.preventDefault()
    })
    container.addEventListener("pointermove",e=>{
      if(pointer!==e.pointerId)return
      container.style.left=Math.max(0,Math.min(window.innerWidth-container.offsetWidth,e.clientX-ox))+"px"
      container.style.top=Math.max(0,Math.min(window.innerHeight-container.offsetHeight,e.clientY-oy))+"px"
      container.style.bottom="auto";container.style.right="auto"
    })
    const stop=e=>{if(pointer!==e.pointerId)return;pointer=null;container.style.cursor="grab"}
    for(const event of ["pointerup","pointercancel","lostpointercapture"])container.addEventListener(event,stop)
  }

  document.body.appendChild(container)
  const append=(slot,md)=>{
    if(!md||!container.isConnected||document.getElementById("mobAttackPanel")!==container)return
    container.appendChild(buildMobSubPanel(md,slot))
    if(typeof installKrakenEnemyPanelControls==="function")installKrakenEnemyPanelControls(container)
  }
  active.forEach(slot=>{
    if(fromSnapshot)append(slot,snapshot[slot])
    else db.ref("combat/"+slot).once("value",snap=>append(slot,snap.val()))
  })
}

function buildMobSubPanel(mobData, slot) {
  const king=isKingEncounter(mobData),themed=king||isKrakenEncounter(mobData)
  const kraken=typeof isKrakenEncounter==="function"&&isKrakenEncounter(mobData)
  const panel = document.createElement("div"); panel.dataset.slot=slot; panel.style.cssText = "background:url('images/mobpanel.png') center/100% 100% no-repeat;padding:12px;filter:drop-shadow(0 12px 18px rgba(0,0,0,0.22));"
  const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
  const titleWrap = document.createElement("div"); titleWrap.style.cssText = "display:flex;align-items:center;gap:8px;min-width:0;"
  const portrait = document.createElement("img"); portrait.src = "images/" + sanitizeAssetName((mobData.name || "gobelins") + ".png"); portrait.style.cssText = "width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45));"; portrait.onerror = () => portrait.style.display = "none"; titleWrap.appendChild(portrait)
  const tEl = document.createElement("div"); tEl.style.cssText = "font-family:Cinzel,serif;font-size:12px;color:#ffb6a0;font-weight:bold;letter-spacing:1px;"; tEl.innerText = heroDisplayName(mobData.name||"MOB").toUpperCase()+"  Niv."+(mobData.lvl||1); if(mobData.balanceClass==="world")tEl.innerText+=(king?" · World boss · 1 action":" · World boss · 2 actions")+(!kraken&&!king&&mobData.hp<=mobData.maxHP*.5?" · Furie +"+(mobData.balanceVersion===3?12:15)+" %":""); if(mobData.chargingSpecial)tEl.innerText+=" · ⚠ "+mobData.chargingSpecial.name+" dès le round "+mobData.chargingSpecial.readyRound; titleWrap.appendChild(tEl); header.appendChild(titleWrap)

  if(mobData.kingMinion)tEl.innerText+=mobData.kingRole==="garde"?" · Garde du Roi":" · Chasseur — vise les isolés"
  if(isJormungandr(mobData)){const note=document.createElement("div");note.textContent="Invulnérable";note.style.cssText="color:#9bd8ff;font:12px Georgia";titleWrap.appendChild(note)}
  if (isGM) {
    const cBtn = document.createElement("button"); cBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(40,40,80,0.5);color:#8888ff;border:1px solid rgba(80,80,180,0.4);border-radius:3px;cursor:pointer;"; cBtn.innerText = themed?"Replier les attaques":"—"; if(themed)cBtn.className="krakenEnemyFold"
    cBtn.onclick=()=>{ if(themed&&typeof setKrakenEnemyPanelCollapsed==="function"){setKrakenEnemyPanelCollapsed(!document.getElementById("mobAttackPanel")?.classList.contains("krakenEnemyCollapsed"));return} const p=panel.closest("#mobAttackPanel"); if(p) p.style.display="none"; const tg=document.getElementById("mobAttackToggle"); if(tg) tg.style.display="block" }; header.appendChild(cBtn)
    const xBtn = document.createElement("button"); xBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(120,0,0,0.5);color:#ff8888;border:1px solid rgba(180,0,0,0.4);border-radius:3px;cursor:pointer;"; xBtn.innerText = "✕"; xBtn.onclick=()=>removeMobSlot(slot); if(!isJormungandr(mobData))header.appendChild(xBtn)
  }
  if(themed&&!isGM){const fold=document.createElement("button");fold.className="krakenEnemyFold";fold.textContent="Replier les attaques";fold.onclick=()=>setKrakenEnemyPanelCollapsed(!document.getElementById("mobAttackPanel")?.classList.contains("krakenEnemyCollapsed"));header.append(fold)}
  panel.appendChild(header)

  const pct = Math.max(0,Math.min(100,((mobData.hp||0)/(mobData.maxHP||1))*100))
  const hpWrap = document.createElement("div"); hpWrap.style.cssText = "width:100%;height:6px;background:rgba(80,0,0,0.5);border-radius:3px;margin-bottom:8px;"
  const hpFill = document.createElement("div"); hpFill.id = "subPanelHPFill_"+slot; hpFill.classList.add("combatMobHpFill"); hpFill.dataset.health=pct>50?"healthy":pct>25?"wounded":"critical"; hpFill.style.width=pct+"%"; hpWrap.appendChild(hpFill); panel.appendChild(hpWrap)

  const tier = mobData.tier||"weak", atks = king?kingNormalAttacks(mobData):kraken?krakenNormalAttacks(mobData):typeof getMobAttacksForMob === "function" ? getMobAttacksForMob(mobData.name, tier) : (mobAttacks[tier]||mobAttacks.weak), mobLvl = mobData.lvl||1
  const getRange = (attack, lvl, mobTier) => {
    if (typeof getMobDamageRange === "function") return getMobDamageRange(attack, lvl, mobTier,mobData)
    const factor = 1 + Math.max(0, (lvl || 1) - 1) * 0.15
    return {
      min: Math.round((attack?.dmgMin || 0) * factor),
      max: Math.round((attack?.dmgMax || 0) * factor)
    }
  }
  const specialAtk = king?kingSpecialAttack(mobData):kraken?krakenSpecialAttack(mobData):typeof getMobSpecialAttack === "function" ? getMobSpecialAttack(mobData.name, tier) : null
  const specialUsed = king?kingSpecialUsed(mobData):kraken?krakenSpecialUsed(mobData):!!mobData.specialUsed

  if (isGM) {
    // Bouton aléatoire intelligent
    const rBtn = document.createElement("button"); rBtn.style.cssText = "width:100%;padding:5px;margin-bottom:5px;font-family:Cinzel,serif;font-size:10px;background:rgba(80,30,120,0.5);color:#cc88ff;border:1px solid rgba(120,50,200,0.5);border-radius:4px;cursor:pointer;"
    rBtn.innerText = "Aléatoire (ciblage auto)"
    rBtn.onclick = () => {
      requestEnemyCombatAction(null,mobData,panel,panel._manualTarget,slot)
    }
    bindCombatActionState(rBtn,slot,{name:"Aléatoire"},false,true)
    panel.appendChild(rBtn)

    atks.forEach(atk => {
      const isCD = atks.length > 1 && mobData.lastAttack===atk.name
      const btn = document.createElement("div")
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      btn.classList.add("combatMobAttack"); btn.classList.toggle("is-unavailable",isCD)
      const row = document.createElement("div")
      row.style.cssText = "display:flex;align-items:center;gap:6px;"
      row.appendChild(createCombatIcon(atk, mobData, "combatIcon combatIcon--small"))
      const name = document.createElement("span")
      name.classList.add("combatMobAttackName"); name.classList.toggle("is-unavailable",isCD)
      name.innerText = atk.name + (isCD?" Recharge":"")
      const dmg = document.createElement("span")
      dmg.style.cssText = "font-size:9px;color:#ff8888;margin-left:auto;"
      dmg.innerText = min + "-" + max
      row.appendChild(name)
      row.appendChild(dmg)
      btn.appendChild(row)
      if (!isCD) {
        btn.onmouseenter=()=>btn.style.background="rgba(180,20,20,0.6)"
        btn.onmouseleave=()=>btn.style.background="rgba(120,10,10,0.4)"
        btn.onclick=()=>{
          const target = panel._manualTarget || null
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlot(atk, mobData, panel, target, slot)
        }
      }
      bindCombatActionState(btn,slot,atk,false,true)
      panel.appendChild(btn)
    })

    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sBtn = document.createElement("div")
      sBtn.classList.add("combatMobSpecial"); sBtn.classList.toggle("is-unavailable",specialUsed)
      const sTop = document.createElement("div")
      sTop.style.cssText = "display:flex;align-items:center;gap:8px;"
      sTop.appendChild(createCombatIcon(specialAtk, mobData, "combatIcon"))
      const sName = document.createElement("span")
      sName.classList.add("combatMobSpecialName"); sName.classList.toggle("is-unavailable",specialUsed)
      sName.innerText = specialAtk.name + (specialUsed ? " — SPÉCIALE DÉJÀ UTILISÉE" : "")
      const sDmg = document.createElement("span")
      sDmg.classList.add("combatMobSpecialDamage"); sDmg.classList.toggle("is-unavailable",specialUsed)
      sDmg.innerText = sMin + "-" + sMax
      sTop.appendChild(sName)
      sTop.appendChild(sDmg)
      sBtn.appendChild(sTop)
      const sFlavor = document.createElement("div")
      sFlavor.classList.add("combatMobSpecialFlavor"); sFlavor.classList.toggle("is-unavailable",specialUsed)
      sFlavor.innerText = specialAtk.flavor || "Attaque signature à usage unique."
      sBtn.appendChild(sFlavor)
      if (!specialUsed) {
        sBtn.onmouseenter=()=>sBtn.style.filter="brightness(1.08)"
        sBtn.onmouseleave=()=>sBtn.style.filter=""
        sBtn.onclick=()=>{
          const target = specialAtk.effect === "all" ? "all" : (panel._manualTarget || null)
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlot(specialAtk, mobData, panel, target, slot)
        }
      }
      if(mobData.balanceClass==="world"&&!specialUsed){
        const charge=mobData.chargingSpecial,round=window.__combatSnapshot?.turnState?.round||1
        sName.innerText+=charge?(round<charge.readyRound?" — EN PRÉPARATION":" — PRÊTE"):" — ANNONCER"
        sFlavor.innerText+=" Annoncée un round avant son déclenchement."
        if(charge&&round<charge.readyRound){sBtn.onclick=null;sBtn.style.cursor="not-allowed";sBtn.style.opacity="0.5"}
      }
      bindCombatActionState(sBtn,slot,specialAtk,true,true)
      panel.appendChild(sBtn)
      if(king&&mobData.chargingSpecial){const protections=document.createElement("button");protections.textContent="Protections MJ — avant l’impact";protections.onclick=()=>openKingProtection(slot);panel.append(protections)}
      if(mobData.chargingSpecial&&typeof openCombatReaction==="function"){
        const reactionButton=document.createElement("button");reactionButton.className="combatReactionLaunch";reactionButton.dataset.reactionSlot=slot;reactionButton.textContent=mobData.chargingSpecial.reaction?"Réactions / protections":"Faire réagir les joueurs";reactionButton.onclick=()=>openCombatReaction(slot);panel.appendChild(reactionButton)
      }
    }

    const autoTarget=document.createElement("button"); autoTarget.innerText="Ciblage automatique"; autoTarget.onclick=()=>{panel._manualTarget=null;panel._currentTarget=null}; panel.appendChild(autoTarget)
    // Sélection manuelle de cible (override)
    const targetRow = document.createElement("div"); targetRow.style.cssText = "display:flex;gap:3px;margin-top:6px;flex-wrap:wrap;border-top:1px solid rgba(180,40,40,0.2);padding-top:6px;"
    const label = document.createElement("div"); label.style.cssText = "width:100%;font-family:Cinzel,serif;font-size:9px;color:#5a3a3a;margin-bottom:3px;"; label.innerText = "Forcer la cible :"
    targetRow.appendChild(label)
    ;["greg","ju","elo","bibi"].forEach(pid => {
      const btn = document.createElement("button"); btn.dataset.target=pid; btn.style.cssText = "padding:2px 6px;font-family:Cinzel,serif;font-size:9px;border-radius:2px;cursor:pointer;border:1px solid rgba(180,40,40,0.4);background:rgba(60,10,10,0.6);color:#ffaaaa;"; btn.innerText = heroDisplayName(pid).toUpperCase()
      btn.onclick=()=>{ targetRow.querySelectorAll("button[data-target]").forEach(b=>{ b.style.background=b.dataset.target===pid?"rgba(180,40,40,0.6)":"rgba(60,10,10,0.6)" }); panel._currentTarget=pid; panel._manualTarget=pid }
      targetRow.appendChild(btn)
    })
    panel.appendChild(targetRow)
    panel.appendChild(buildMobPassTurnBlock(String(slot || "mob"), String(heroDisplayName(mobData.name || "MOB")).toUpperCase()))
  } else {
    // Vue lecture seule pour les joueurs
    atks.forEach(atk => {
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      const row = document.createElement("div"); row.style.cssText = "padding:5px 8px;margin-bottom:3px;background:rgba(60,5,5,0.5);border:1px solid rgba(120,20,20,0.3);border-radius:3px;opacity:0.85;"
      const line = document.createElement("div")
      line.style.cssText = "display:flex;align-items:center;gap:6px;"
      line.appendChild(createCombatIcon(atk, mobData, "combatIcon combatIcon--small"))
      const name = document.createElement("span")
      name.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#ffaaaa;"
      name.innerText = atk.name
      const dmg = document.createElement("span")
      dmg.style.cssText = "font-size:9px;color:#884444;margin-left:auto;"
      dmg.innerText = min + "-" + max
      line.appendChild(name)
      line.appendChild(dmg)
      row.appendChild(line)
      const desc = document.createElement("div")
      desc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#d3b8a0;"
      desc.innerText = atk.flavor || atk.effect || "Attaque ennemie."
      row.appendChild(desc)
      panel.appendChild(row)
    })
    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sRow = document.createElement("div")
      sRow.classList.add("combatMobReadonlySpecial"); sRow.classList.toggle("is-unavailable",specialUsed)
      const sLine = document.createElement("div")
      sLine.style.cssText = "display:flex;align-items:center;gap:6px;"
      sLine.appendChild(createCombatIcon(specialAtk, mobData, "combatIcon combatIcon--small"))
      const sName = document.createElement("span")
      sName.classList.add("combatMobReadonlySpecialName"); sName.classList.toggle("is-unavailable",specialUsed)
      sName.innerText = specialAtk.name
      const sState = document.createElement("span")
      sState.classList.add("combatMobReadonlySpecialState"); sState.classList.toggle("is-unavailable",specialUsed)
      sState.innerText = specialUsed ? (kraken?"UTILISÉE DANS CETTE PHASE":"UNIQUE") : (sMin + "-" + sMax)
      sLine.appendChild(sName)
      sLine.appendChild(sState)
      sRow.appendChild(sLine)
      const sDesc = document.createElement("div")
      sDesc.classList.add("combatMobReadonlySpecialDescription"); sDesc.classList.toggle("is-unavailable",specialUsed)
      sDesc.innerText = king ? "Attaque majeure du Roi." : specialAtk.flavor || specialAtk.effect || "Attaque signature à usage unique."
      sRow.appendChild(sDesc)
      panel.appendChild(sRow)
    }
    const passRow = document.createElement("div")
    passRow.style.cssText = "padding:6px 8px;margin-top:8px;background:rgba(24,16,16,0.28);border:1px solid rgba(190,140,90,0.16);border-radius:6px;opacity:0.82;"
    const passTitle = document.createElement("div")
    passTitle.style.cssText = "font-family:Cinzel,serif;font-size:10px;color:#d8c0a0;"
    passTitle.innerText = "Passer le tour"
    const passDesc = document.createElement("div")
    passDesc.style.cssText = "margin-top:4px;font-size:9px;line-height:1.35;color:#bba28d;"
    passDesc.innerText = String(heroDisplayName(mobData.name || "MOB")).toUpperCase() + " peut aussi choisir de ne pas agir."
    passRow.appendChild(passTitle)
    passRow.appendChild(passDesc)
    panel.appendChild(passRow)
  }

  if(typeof appendBossEncounterPanels==="function")appendBossEncounterPanels(panel,mobData,slot)
  return panel
}


function launchMobAttackFromSlot(attack, mobData, panel, forcedTarget, slot) { return requestEnemyCombatAction(attack,mobData,panel,forcedTarget,slot) }

function addMobToFight(mobId, forceTier) { return addReliableCombatMob(mobId, forceTier) }

function removeMobSlot(slot) { return removeReliableCombatMob(slot) }

function spawnExtraMobToken(mobData, slot) {
  const container=document.getElementById("combatTokens"); if(!container){ if(!mobData._retryCount) mobData._retryCount=0; if(++mobData._retryCount<10) setTimeout(()=>spawnExtraMobToken(mobData,slot),300); return }
  const existing=document.getElementById("mobToken_"+slot)
  if(existing){ if(existing._slotRef&&existing._slotRefCb) existing._slotRef.off("value",existing._slotRefCb); existing.remove() }
  const tok=document.createElement("div"); tok.id="mobToken_"+slot; tok.className="token";tok.dataset.mobName=mobData.name
  const idx=slot==="mob2"?1:2, startX=Math.round((window.innerWidth-4*110)/2)
  tok.style.cssText=`position:absolute;width:70px;height:70px;left:${startX+(idx+4)*90}px;top:${Math.round(window.innerHeight*0.25)}px;z-index:200;display:flex;flex-direction:column;align-items:center;cursor:pointer;`
  const img=document.createElement("img"); img.style.cssText="width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid #cc2200;box-shadow:0 0 10px rgba(200,0,0,0.5);"; img.src="images/"+mobData.name+".png"; img.onerror=()=>img.style.display="none"; tok.appendChild(img)
  const label=document.createElement("div"); label.style.cssText="font-family:Cinzel,serif;font-size:9px;color:#ff8888;margin-top:2px;text-align:center;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:2px;"; label.innerText=heroDisplayName(mobData.name||"MOB").toUpperCase()+" "+mobData.hp+"/"+mobData.maxHP; tok.appendChild(label)
  tok.addEventListener("mousedown",e=>{ if(!isGM) return; selected=tok; lastX=tok.offsetLeft; _state.tokenDragStart={x:e.clientX,y:e.clientY}; _state.tokenDragging=false; tok._fbSlot=slot; e.preventDefault() })
  container.appendChild(tok)
}

/* ========================= */
/* PNJ                       */
/* ========================= */

