function openAllyPNJPanel() {
  if(!combatActive)return openAllyDiscoveryPanel()
  if (!isGM) return
  const worldBoss=combatHasWorldBoss({combat:window.__combatSnapshot})
  const existing = document.getElementById("allyPNJPanel")
  if (existing) {
    existing.remove()
    return
  }
  const panel = document.createElement("div"); panel.id = "allyPNJPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.97);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:16px;z-index:99999999;min-width:min(380px,92vw);max-width:92vw;box-sizing:border-box;max-height:82vh;overflow-y:auto;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#1e8a9a;margin-bottom:12px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;"
  const titleText = document.createElement("span")
  titleText.innerText = "⚔ INVOCATIONS"
  const titleClose = document.createElement("span")
  titleClose.style.cssText = "cursor:pointer;color:#ff8888;font-size:14px;"
  titleClose.innerText = "✕"
  titleClose.onclick = () => {
    const panelEl = document.getElementById("allyPNJPanel")
    if (panelEl) panelEl.remove()
  }
  title.appendChild(titleText)
  title.appendChild(titleClose)
  panel.appendChild(title)
  if(typeof appendKingOdinCall==="function")appendKingOdinCall(panel)
  const manage=document.createElement("button");manage.type="button";manage.textContent="Gérer les alliances / Rompre une alliance";manage.style.cssText="min-height:44px;width:100%;margin-bottom:10px";manage.onclick=()=>{panel.remove();openAllyDiscoveryPanel()};panel.appendChild(manage)

  db.ref("combat/usedAllies").once("value", snap => {
    const used = snap.val() || {}
    combatAllyOptions().forEach(pnj => {
      const block = document.createElement("div");block.dataset.ally=pnj.id; block.style.cssText = "margin-bottom:14px;border-bottom:1px solid rgba(30,90,102,0.15);padding-bottom:12px;"
      const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;"
      const img = document.createElement("img"); img.src = "images/"+pnj.image; img.style.cssText = `width:40px;height:40px;border-radius:50%;border:2px solid ${pnj.color};object-fit:contain;box-shadow:0 0 10px ${pnj.color}44;`; img.onerror=()=>img.style.opacity="0.3"
      if(pnj.id===HEL_NIDHOGG_DUO.id){const dragon=document.createElement("img");dragon.src="images/nhiddog.png";dragon.alt="Nidhogg";dragon.style.cssText=img.style.cssText;header.appendChild(dragon)}
      const info = document.createElement("div")
      const infoName = document.createElement("div")
      infoName.style.cssText = `font-size:14px;color:${pnj.color};letter-spacing:2px;text-shadow:0 0 8px ${pnj.color}88;`
      infoName.innerText = pnj.name
      const infoRole = document.createElement("div")
      infoRole.style.cssText = "font-size:10px;color:#5a9aaa;"
      infoRole.innerText = pnj.role
      info.appendChild(infoName)
      info.appendChild(infoRole)
      header.appendChild(img); header.appendChild(info); block.appendChild(header)
      if(pnj.id!==HEL_NIDHOGG_DUO.id){
        const freeActions=document.createElement("div");freeActions.className="allyFreeActions"
        const summon=document.createElement("button"),grant=document.createElement("button");summon.type=grant.type="button";summon.textContent="Invoquer librement";grant.textContent="Donner l’invocation libre";summon.dataset.freeSummon=pnj.id;grant.dataset.freeGrant=pnj.id
        summon.disabled=grant.disabled=!!window.__explorationState?.allyBreaks?.[pnj.id]
        summon.onclick=async()=>{summon.disabled=true;if(await placeAllyOnMap(pnj.id))panel.remove();else summon.disabled=false};grant.onclick=()=>openAllyGrantPicker(pnj,pnj.actions[0],{free:true});freeActions.append(summon,grant);block.appendChild(freeActions)
      }
      if(!worldBoss){panel.appendChild(block);return}

      pnj.actions.forEach(action => {
        const allianceBroken=!!window.__explorationState?.allyBreaks?.[pnj.id],lockedHel=["hel","nidhogg"].includes(pnj.id)&&!window.__explorationState?.allyDiscoveries?.[pnj.id],duoState=pnj.id===HEL_NIDHOGG_DUO.id?helNidhoggAvailability(currentCombatAllyContext()):null
        const isUsed = !!used[action.id]||allianceBroken||lockedHel||!!duoState&&!duoState.allowed
        const typeColors = { damage:"#ff7777", heal:"#77ff99", malus:"#ffaa44", buff:"#88aaff" }
        const typeLabels = { damage:"ATQ", heal:"SOIN", malus:"MALUS", buff:"BUFF" }
        const btn = document.createElement("div")
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:5px;border-radius:2px;border:1px solid ${isUsed?"rgba(30,90,102,0.15)":pnj.color+"55"};background:${isUsed?"rgba(5,15,20,0.3)":`rgba(8,20,24,0.9)`};cursor:${isUsed?"not-allowed":"pointer"};opacity:${isUsed?"0.4":"1"};transition:background 0.15s;`
        const iconEl = document.createElement("span")
        iconEl.style.fontSize = "20px"
        iconEl.innerText = action.icon
        const center = document.createElement("div")
        center.style.flex = "1"
        const labelEl = document.createElement("div")
        labelEl.style.cssText = `font-size:12px;color:${isUsed?"#444":pnj.color};letter-spacing:1px;`
        labelEl.innerText = action.label
        if (action.dice) {
          const diceEl = document.createElement("span")
          diceEl.style.cssText = "color:#8888ff;font-size:10px;"
          diceEl.innerText = " (D" + action.dice + ")"
          labelEl.appendChild(diceEl)
        }
        const descEl = document.createElement("div")
        descEl.style.cssText = "font-size:10px;color:#5a7a8a;margin-top:2px;"
        descEl.innerText = typeof allyActionDescription==="function"?allyActionDescription(pnj,action):action.desc
        if(duoState&&!duoState.allowed)descEl.innerText+=" — "+duoState.reason
        center.appendChild(labelEl)
        center.appendChild(descEl)
        const badge = document.createElement("span")
        badge.style.cssText = `font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(30,90,102,0.2);color:${typeColors[action.type]};letter-spacing:1px;`
        badge.innerText = allianceBroken?"ALLIANCE ROMPUE":lockedHel?"À DÉBLOQUER":isUsed ? "INDISPONIBLE" : pnj.id===HEL_NIDHOGG_DUO.id?"DUO · ROI":typeLabels[action.type]
        btn.appendChild(iconEl)
        btn.appendChild(center)
        btn.appendChild(badge)
        if (!isUsed) {
          btn.onmouseenter=()=>btn.style.background=`rgba(20,40,52,0.95)`
          btn.onmouseleave=()=>btn.style.background=`rgba(8,20,24,0.9)`
          btn.onclick=()=>triggerAllyAction(pnj, action, panel)

          const grantBtn = document.createElement("button")
          grantBtn.innerText = "Donner"
          grantBtn.style.cssText = "padding:5px 8px;font-family:Cinzel,serif;font-size:10px;background:rgba(70,20,90,0.75);color:#f0d0ff;border:1px solid rgba(180,120,255,0.45);border-radius:3px;cursor:pointer;margin-left:6px;white-space:nowrap;"
          grantBtn.onclick = e => {
            e.stopPropagation()
            grantAllyActionToPlayers(pnj, action)
          }
          btn.appendChild(grantBtn)
        }
        block.appendChild(btn)
      })
      panel.appendChild(block)
    })
    document.body.appendChild(panel)
  })
}

function triggerAllyAction(pnj, action, panel) {
  if(!isGM&&window.playerAllyAccessData?.scope==="combat-free")return requestExplorationSummon(pnj,action)
  if(!combatActive){if(isGM){openAllyGrantPicker(pnj,action);return}return requestExplorationSummon(pnj,action)}
  if(pnj.id==="hel")return requestAllyCombatAction(pnj,action,null,panel)
  if (!isGM && myToken && (action.type === "heal" || action.type === "buff")) {
    _executeAllyAction(pnj, action, myToken.id, panel)
    return
  }
  if (action.type === "heal" || action.type === "buff") { _allyChooseTarget(pnj, action, panel); return }
  _executeAllyAction(pnj, action, null, panel)
}

function _allyChooseTarget(pnj, action, panel) {
  const picker = document.createElement("div"); picker.id = "allyTargetPicker"
  picker.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid "+pnj.color+";border-radius:3px;padding:16px;z-index:999999999;font-family:Cinzel,serif;min-width:220px;"
  const pickerTitle = document.createElement("div")
  pickerTitle.style.cssText = `font-size:11px;color:${pnj.color};letter-spacing:2px;margin-bottom:12px;`
  pickerTitle.innerText = "CHOISIR LA CIBLE"
  picker.appendChild(pickerTitle)
  ;["greg","ju","elo","bibi"].forEach(pid => {
    const btn = document.createElement("button"); btn.style.cssText = "display:block;width:100%;padding:8px;margin-bottom:6px;font-family:Cinzel,serif;font-size:12px;background:rgba(10,30,38,0.8);color:#e0f0f4;border:1px solid rgba(30,90,102,0.5);border-radius:2px;cursor:pointer;text-align:left;"
    const img = document.createElement("img")
    img.src = "images/" + sanitizeAssetName(heroPortraitFile(pid))
    img.style.cssText = "width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:8px;"
    btn.appendChild(img)
    btn.appendChild(document.createTextNode(heroDisplayName(pid).toUpperCase()))
    btn.onclick=()=>{ picker.remove(); _executeAllyAction(pnj, action, pid, panel) }
    picker.appendChild(btn)
  })
  const cancel = document.createElement("button"); cancel.style.cssText = "display:block;width:100%;padding:6px;font-family:Cinzel,serif;font-size:11px;background:rgba(80,20,20,0.4);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;"
  cancel.innerText = "✕ Annuler"; cancel.onclick=()=>picker.remove(); picker.appendChild(cancel)
  document.body.appendChild(picker)
}

function _executeAllyAction(pnj, action, targetId, panel) { return requestAllyCombatAction(pnj,action,targetId,panel) }

function showAllyActionResult(data) { /* Les jets et effets sont désormais résolus par le MJ, une seule fois. */ }

