function startSpellAura() { if(document.getElementById("spellAura")) return; const a=document.createElement("div"); a.id="spellAura"; a.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5000;opacity:0;transition:opacity 2s ease;"; const v=document.createElement("div"); v.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(150,0,255,0.5);animation:spellPulse 2s ease-in-out infinite alternate;"; a.appendChild(v); document.body.appendChild(a); setTimeout(()=>a.style.opacity="1",50) }
function stopSpellAura() { const a=document.getElementById("spellAura"); if(!a) return; a.style.transition="opacity 1.5s ease"; a.style.opacity="0"; setTimeout(()=>{ if(a.parentNode) a.remove() },1500) }

async function triggerCemeteryEvent(){
 if(!isGM||combatActive||combatStarting)return
 try{requireExplorationConnection();await transactCombatRoot(current=>{
 if(current?.game?.completedEvents?.cemetery||current?.game?.cemeterySpell?.active)return undefined
 const root=combatClone(current);root.game ||= {};root.game.cemeterySpell={active:true,time:Date.now(),glipheShown:false};return root
 })}catch(error){showNotification(error.message)}
}

function renderSpellDiceGame(data) {
  const ex=document.getElementById("spellMiniGame"); if(ex) ex.remove()
  const tries=data.tries||{}, freed=data.freed_players||[], turnIdx=data.turnIdx||0
  let realCur=SPELL_PLAYERS.filter(p=>!freed.includes(p))[0]||SPELL_PLAYERS[0]
  for(let i=0;i<SPELL_PLAYERS.length;i++){ const p=SPELL_PLAYERS[(turnIdx+i)%SPELL_PLAYERS.length]; if(!freed.includes(p)&&(tries[p]||0)<SPELL_MAX_TRIES){ realCur=p; break } }
  const ov=document.createElement("div"); ov.id="spellMiniGame"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.8s ease;overflow:hidden;background:rgba(10,0,18,0.92);"
  const ttl=document.createElement("div"); ttl.style.cssText="position:relative;z-index:1;font-family:'Cinzel Decorative',serif;font-size:22px;color:#dd66ff;letter-spacing:5px;text-shadow:0 0 30px #aa00ff;text-align:center;margin-bottom:8px;"; ttl.innerText="⛧  SORT D'EMPRISONNEMENT  ⛧"; ov.appendChild(ttl)
  const sub=document.createElement("div"); sub.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;margin-bottom:28px;text-align:center;"; sub.innerText="Lancez un D20 — seul un coup critique peut briser les chaînes..."; ov.appendChild(sub)
  const sr=document.createElement("div"); sr.style.cssText="position:relative;z-index:1;display:flex;gap:20px;margin-bottom:28px;flex-wrap:wrap;justify-content:center;"
  SPELL_PLAYERS.forEach(pid=>{ const t=tries[pid]||0,iF=freed.includes(pid),isOut=t>=SPELL_MAX_TRIES&&!iF,isCur=pid===realCur&&!iF; const card=document.createElement("div"); card.style.cssText=`display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 20px;border-radius:10px;border:2px solid ${iF?"#44ff44":isOut?"#ff4444":isCur?"#cc44ff":"rgba(150,0,255,0.4)"};background:${isCur?"rgba(120,0,180,0.3)":"rgba(0,0,0,0.3)"};min-width:100px;text-align:center;`; const n=document.createElement("div"); n.style.cssText=`font-family:Cinzel,serif;font-size:13px;letter-spacing:2px;color:${iF?"#44ff44":isOut?"#ff6666":isCur?"#dd88ff":"#9955cc"};`; n.innerText=(iF?"✓ ":isOut?"✕ ":isCur?"▶ ":"")+heroDisplayName(pid).toUpperCase(); card.appendChild(n); const dr=document.createElement("div"); dr.style.cssText="display:flex;gap:4px;"; for(let i=0;i<SPELL_MAX_TRIES;i++){ const d=document.createElement("div"); d.style.cssText="width:12px;height:12px;border-radius:2px;border:1px solid rgba(150,0,255,0.5);background:"+(i<t?(iF?"#44ff44":"rgba(180,0,80,0.6)"):"transparent")+";"; dr.appendChild(d) }; card.appendChild(dr); sr.appendChild(card) })
  ov.appendChild(sr)
  if(myToken&&myToken.id===realCur&&!freed.includes(myToken.id)){ const t=tries[myToken.id]||0; if(t<SPELL_MAX_TRIES){ const rb=document.createElement("div"); rb.id="spellRollBtn"; rb.style.cssText="position:relative;z-index:1;width:120px;height:120px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,rgba(180,0,255,0.6),rgba(80,0,150,0.3));border:3px solid rgba(200,50,255,0.8);box-shadow:0 0 30px rgba(180,0,255,0.5);cursor:pointer;margin-bottom:16px;animation:bifrostPulse 2s ease-in-out infinite alternate;"; rb.innerHTML=`<span style="font-size:36px;">🎲</span><span style="font-family:Cinzel,serif;font-size:11px;color:#cc88ff;letter-spacing:2px;margin-top:4px;">LANCER D20</span>`; rb.onclick=()=>rollSpellDice(myToken.id,t); ov.appendChild(rb); const h=document.createElement("div"); h.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:11px;color:#7733aa;font-style:italic;"; h.innerText=`Essai ${t+1} / ${SPELL_MAX_TRIES}`; ov.appendChild(h) } else { const out=document.createElement("div"); out.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:14px;color:#ff6666;text-shadow:0 0 10px red;"; out.innerText="✕ Vos essais sont épuisés..."; ov.appendChild(out) } }
  else if(myToken&&!freed.includes(myToken.id)){ const w=document.createElement("div"); w.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;"; w.innerText=`✦ Au tour de ${heroDisplayName(realCur).toUpperCase()} de briser son sort... ✦`; ov.appendChild(w) }
  else if(myToken&&freed.includes(myToken.id)){ const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:15px;color:#44ff44;text-shadow:0 0 10px lime;"; d.innerText="✓ Vous êtes libéré — attendez les autres..."; ov.appendChild(d) }
  if(isGM){ const gr=document.createElement("div"); gr.style.cssText="position:relative;z-index:1;display:flex;gap:8px;margin-top:16px;"; const lb=document.createElement("button"); lb.innerText="🔓 Libérer"; lb.style.cssText="padding:8px 18px;font-family:Cinzel,serif;font-size:12px;background:rgba(20,80,20,0.5);color:#88ff88;border:1px solid rgba(50,180,50,0.5);border-radius:4px;cursor:pointer;"; lb.onclick=finishCemeteryByGM; gr.appendChild(lb); ov.appendChild(gr) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",50)
}

function rollSpellDice(playerId) {
  const spell=window.__cemeterySpellData
  if(!spell || (!isGM && myToken?.id!==playerId))return
  return requestExplorationAction("spell",playerId,{eventTime:spell.time,revision:spell.revision||0})
}

function showSpellRollResult(roll, isCrit, isFail, playerId, cb) {
  const res=document.createElement("div"); res.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;font-family:'Cinzel Decorative',serif;"
  const color=isCrit?"#44ff44":isFail?"#ff4444":"#cc88ff"
  res.innerHTML=`<div style="font-size:48px;margin-bottom:8px;">${roll}</div><div style="font-size:24px;color:${color};text-shadow:0 0 20px ${color};letter-spacing:3px;">${isCrit?"⚡ CRITIQUE ! ⚡":isFail?"💀 ÉCHEC CRITIQUE":`D20 : ${roll}`}</div><div style="font-size:14px;color:${color};opacity:0.8;margin-top:6px;font-family:Cinzel,serif;">${isCrit?"Sort brisé !":isFail?"-10 HP":"Pas assez..."}</div>`
  document.body.appendChild(res); if(isCrit){ flashGold(); flashGold(); screenShake() }; if(isFail) screenShakeHard()
  setTimeout(()=>{ res.style.transition="opacity 0.8s"; res.style.opacity="0"; setTimeout(()=>{ res.remove(); if(cb) cb() },800) },2500)
}

function showSpellFreed() {
  stopSpellAura(); stopSpecialMusic('sortPrisonMusic')
  setTimeout(()=>{ if(currentMap&&mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap]) },1000)
  playSound("powerSound",0.8); flashGold(); flashGold(); screenShakeHard(); powerExplosion()
  const msg=document.createElement("div"); msg.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative',serif;font-size:36px;color:#cc88ff;text-shadow:0 0 30px purple;text-align:center;z-index:99999999;pointer-events:none;"
  const msgTitle = document.createElement("div")
  msgTitle.innerText = "⚡ SORT BRISÉ ⚡"
  const msgSub = document.createElement("span")
  msgSub.style.cssText = "font-size:18px;color:#aa66ff;"
  msgSub.innerText = "Les héros sont libérés !"
  msg.appendChild(msgTitle)
  msg.appendChild(msgSub)
  document.body.appendChild(msg)
  setTimeout(()=>{ msg.style.transition="opacity 1s"; msg.style.opacity="0"; setTimeout(()=>msg.remove(),1000) },4000)
}

/* ========================= */
/* PNJ ALLIÉS — INVOCATION   */
/* ========================= */

