"use strict"

// Affiches wanted : édition MJ et affichage. Synchronisation dans exploration.js.
function openWantedEditor() { const wb=document.getElementById("wantedMobBtn"); if(wb){ wb.innerText="— Choisir un mob —"; wb.dataset.value="" }; document.getElementById("wantedEditor").style.display="flex" }
function normalizeWantedPosterData(data) {
  const allowedTiers = Object.keys(WANTED_REWARDS || {})
  const mob = WANTED_MOBS.includes(data?.mob) ? data.mob : ""
  const tier = allowedTiers.includes(data?.tier) ? data.tier : "weak"
  const reward = clampInteger(data?.reward, 1, 999999)
  const id = String(data?.id || ("wanted_" + Date.now()))
  if (!mob) return null
  return { mob, tier, reward, id }
}

function removeWantedPosterElement(id) {
  const safeId = String(id || "")
  if (!safeId) return
  cleanupMapElementDragHandlers(safeId)
  const el = document.getElementById("elem_" + safeId)
  if (el) el.remove()
  db.ref("elements/" + safeId).remove().catch(() => {})
}

async function cleanupLegacyWantedElements() {
  if(!isGM)return
  await transactCombatRoot(current=>{
    const legacy=Object.entries(current?.elements||{}).filter(([id,item])=>item?.wantedData)
    if(!legacy.length)return undefined
    const root=combatClone(current);root.game ||= {};root.game.wantedPosters ||= {}
    legacy.forEach(([id,item])=>{const poster=normalizeWantedPosterData({...item.wantedData,id});if(poster){root.game.wantedPosters[id] ||= poster;delete root.elements[id]}})
    return root
  })
}

async function publishWantedOverlay(data){if(!isGM)return;try{requireExplorationConnection();const poster=normalizeWantedPosterData(data);if(poster)await db.ref("game/wantedOpen").set({poster,time:Date.now()})}catch(error){showNotification(error.message)}}

async function createWantedPoster(){
 if(!isGM)return
 try{requireExplorationConnection();const id="wanted_"+db.ref("game/wantedPosters").push().key
 const poster=normalizeWantedPosterData({id,mob:document.getElementById("wantedMobBtn")?.dataset.value||"",tier:document.getElementById("wantedTierBtn")?.dataset.value||"weak",reward:document.getElementById("wantedReward").value})
 if(!poster)throw new Error("Affiche invalide")
 await db.ref("game").update({["wantedPosters/"+id]:poster,wantedOpen:{poster,time:Date.now()}})
 document.getElementById("wantedEditor").style.display="none"
 }catch(error){showNotification("Affiche non publiée : "+error.message)}
}

function renderWantedPoster(data) {
  const normalized = normalizeWantedPosterData(data)
  const list=document.getElementById("wantedList")
  if(!list || !normalized) return
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const card=document.createElement("div")
  card.id="wantedCard_" + normalized.id
  card.style.cssText="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(60,40,10,0.4);border:1px solid rgba(150,100,30,0.4);border-radius:4px;"
  const img=document.createElement("img")
  img.src="images/" + safeMobImage
  img.style.cssText="width:36px;height:36px;object-fit:contain;border-radius:3px;"
  img.onerror=()=>img.style.opacity="0.3"
  card.appendChild(img)
  const info=document.createElement("div")
  info.style.cssText="flex:1;"
  const name=document.createElement("div")
  name.style.cssText="font-family:Cinzel,serif;font-size:11px;color:rgb(255,200,80);"
  name.innerText = heroDisplayName(normalized.mob).toUpperCase()
  const meta=document.createElement("div")
  meta.style.cssText="font-size:10px;color:rgb(200,160,60);"
  meta.innerText = "💰 " + normalized.reward + " po — " + normalized.tier
  info.appendChild(name)
  info.appendChild(meta)
  card.appendChild(info)
  const open=document.createElement("button")
  open.style.cssText="padding:2px 8px;font-size:10px;background:rgba(90,70,20,0.5);color:#ffd68a;border:1px solid rgba(170,130,40,0.45);border-radius:3px;cursor:pointer;"
  open.innerText="Mettre en avant"
  open.onclick=()=>{ if (isGM) publishWantedOverlay(normalized); else showWantedOverlay(normalized) }
  card.appendChild(open)
  const del=document.createElement("button")
  del.style.cssText="padding:2px 8px;font-size:10px;background:rgba(80,20,0,0.5);color:#ff8888;border:1px solid rgba(150,40,0,0.4);border-radius:3px;cursor:pointer;"
  del.innerText="✕"
  del.onclick=()=>removePersistentWanted(normalized.id)
  card.appendChild(del)
  list.appendChild(card)
}

function showWantedOverlay(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return
  const existing = document.getElementById("wantedOverlay")
  if (existing) existing.remove()
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const ov=document.createElement("div")
  ov.id = "wantedOverlay"
  ov.dataset.posterId=normalized.id
  ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999999;cursor:pointer;"
  ov.onclick=()=>ov.remove()
  const p=document.createElement("div")
  p.style.cssText="position:relative;width:300px;padding:30px 20px;text-align:center;"
  const bg=document.createElement("img")
  bg.src="images/wanted.png"
  bg.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;opacity:0.9;"
  p.appendChild(bg)
  const inner=document.createElement("div")
  inner.style.cssText="position:relative;z-index:1;padding:20px;"
  const mi=document.createElement("img")
  mi.src="images/" + safeMobImage
  mi.style.cssText="width:100px;height:100px;object-fit:contain;border:3px solid rgb(100,60,10);border-radius:4px;margin:10px auto;display:block;"
  inner.appendChild(mi)
  const n=document.createElement("div")
  n.style.cssText="font-family:'Cinzel Decorative',serif;font-size:18px;color:rgb(80,40,0);letter-spacing:3px;margin-bottom:8px;"
  n.innerText=heroDisplayName(normalized.mob).toUpperCase()
  inner.appendChild(n)
  const r=document.createElement("div")
  r.style.cssText="font-family:Cinzel,serif;font-size:22px;color:rgb(120,70,0);font-weight:bold;"
  r.innerText="💰 " + normalized.reward + " po"
  inner.appendChild(r)
  p.appendChild(inner)

  // Bouton fermer (tablettes sans Echap)
  const closeBtn = document.createElement("button")
  closeBtn.innerText = "✕"
  closeBtn.style.cssText = "position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;background:rgba(20,10,0,0.95);border:1px solid rgba(212,168,53,0.7);color:#d4a835;font-size:18px;cursor:pointer;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.7);touch-action:manipulation;"
  closeBtn.onclick = e => { e.stopPropagation(); ov.remove() }
  p.appendChild(closeBtn)

  ov.appendChild(p)
  document.body.appendChild(ov)
}

function renderWantedBoardCard(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return null
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const card=document.createElement("button")
  card.type="button"
  card.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:190px;min-height:268px;padding:26px 18px 18px;background:url('images/wanted.png') center/100% 100% no-repeat;border:none;color:#5a3410;cursor:pointer;font-family:Cinzel,serif;filter:drop-shadow(0 8px 14px rgba(0,0,0,0.45));transition:transform 0.15s ease,filter 0.15s ease;"
  const pin=document.createElement("div")
  pin.style.cssText="position:absolute;top:10px;left:50%;transform:translateX(-50%) rotate(-8deg);width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f4e3bf 0%,#a67c34 45%,#5a3c12 100%);box-shadow:0 2px 5px rgba(0,0,0,0.45);"
  const img=document.createElement("img")
  img.src="images/" + safeMobImage
  img.style.cssText="width:82px;height:82px;object-fit:contain;margin-top:18px;border:3px solid rgba(100,60,10,0.55);border-radius:4px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.28));"
  img.onerror=()=>img.style.opacity="0.35"
  const subtitle=document.createElement("div")
  subtitle.style.cssText="font-family:'Cinzel Decorative',Cinzel,serif;font-size:13px;letter-spacing:3px;color:#7b4208;text-align:center;margin-top:10px;"
  subtitle.innerText="WANTED"
  const title=document.createElement("div")
  title.style.cssText="font-size:15px;letter-spacing:1px;color:#4f2f12;text-align:center;font-weight:bold;line-height:1.3;margin-top:8px;"
  title.innerText=heroDisplayName(normalized.mob).toUpperCase()
  const meta=document.createElement("div")
  meta.style.cssText="font-size:12px;color:#6b4720;text-align:center;line-height:1.6;margin-top:10px;"
  meta.innerText="Prime : " + normalized.reward + " po"
  const tier=document.createElement("div")
  tier.style.cssText="font-size:10px;color:#8a5a24;text-align:center;letter-spacing:1px;margin-top:2px;"
  tier.innerText=String(normalized.tier || "").toUpperCase()
  card.appendChild(pin)
  card.appendChild(img)
  card.appendChild(subtitle)
  card.appendChild(title)
  card.appendChild(meta)
  card.appendChild(tier)
  card.onmouseenter=()=>{ card.style.transform="translateY(-3px) rotate(-1deg)"; card.style.filter="drop-shadow(0 12px 18px rgba(0,0,0,0.5))" }
  card.onmouseleave=()=>{ card.style.transform=""; card.style.filter="drop-shadow(0 8px 14px rgba(0,0,0,0.45))" }
  card.onclick=()=>showWantedOverlay(normalized)
  return card
}

function buildWantedBoardContent(container, posters) {
  container.innerHTML=""
  const title=document.createElement("div")
  title.style.cssText="text-align:center;font-family:'Cinzel Decorative',Cinzel,serif;font-size:24px;letter-spacing:4px;color:#f1d08a;margin-bottom:8px;"
  title.innerText="TABLEAU DES PRIMES"
  const subtitle=document.createElement("div")
  subtitle.style.cssText="text-align:center;font-family:'IM Fell English',serif;font-size:16px;color:#d9be84;margin-bottom:18px;"
  subtitle.innerText="Cliquez sur une affiche pour la consulter"
  container.appendChild(title)
  container.appendChild(subtitle)
  const grid=document.createElement("div")
  grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,190px));justify-content:center;gap:22px 18px;padding:8px 6px 4px;"
  if (posters.length) {
    posters.forEach(poster => {
      const card = renderWantedBoardCard(poster)
      if (card) grid.appendChild(card)
    })
  } else {
    const empty=document.createElement("div")
    empty.style.cssText="grid-column:1/-1;text-align:center;padding:18px;font-family:Cinzel,serif;font-size:14px;color:#caa46b;border:1px solid rgba(160,110,40,0.25);border-radius:8px;background:rgba(25,15,6,0.6);"
    empty.innerText="Aucune affiche active pour le moment"
    grid.appendChild(empty)
  }
  container.appendChild(grid)
}

function openWantedBoard(fromFirebase) {
  const existing=document.getElementById("wantedBoardOverlay")
  if (existing) {
    if (fromFirebase) return
    closeWantedBoard(); return
  }
  if (isGM && !fromFirebase) db.ref("game/wantedBoardOpen").set({ time: Date.now() })
  const posterOverlay = document.getElementById("wantedOverlay")
  if (posterOverlay) posterOverlay.remove()
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  const bell = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("cloche.mp3") : "audio/cloche.mp3")
  setManagedAudioBaseVolume(bell, 0.78, "effects")
  bell.play().catch(() => {})
  const overlay=document.createElement("div")
  overlay.id="wantedBoardOverlay"
  overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.84);display:flex;align-items:center;justify-content:center;z-index:99999998;"
  overlay.onclick=e=>{ if(e.target===overlay) closeWantedBoard() }
  const panel=document.createElement("div")
  panel.style.cssText="width:min(960px,92vw);max-height:84vh;overflow-y:auto;padding:26px 24px 22px;background:url('images/wood.png') center/contain no-repeat;border:none;border-radius:0;box-shadow:none;"
  panel.onclick=e=>e.stopPropagation()
  const close=document.createElement("button")
  close.type="button"
  close.style.cssText="display:block;margin:0 0 14px auto;padding:6px 12px;background:rgba(80,20,0,0.55);color:#ffb0a0;border:1px solid rgba(180,60,20,0.45);border-radius:6px;cursor:pointer;font-family:Cinzel,serif;"
  close.innerText="Fermer"
  close.onclick=()=>closeWantedBoard()
  panel.appendChild(close)
  const content=document.createElement("div")
  content.id="wantedBoardContent"
  panel.appendChild(content)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
  const posters=Object.values(window.__wantedPostersData||{}).filter(Boolean)
  buildWantedBoardContent(content, posters)
  if (!posters.length) {
    db.ref("game/wantedPosters").once("value", snap => {
      const data=snap.val()||{}
      window.__wantedPostersData=data
      buildWantedBoardContent(content, Object.values(data).filter(Boolean))
    })
  }
}

function closeWantedBoard(fromFirebase) {
  const overlay = document.getElementById("wantedBoardOverlay")
  if (overlay) overlay.remove()
  if (isGM && !fromFirebase) db.ref("game/wantedBoardOpen").remove()
}
function toggleWantedDropdown(el) { const dd=document.getElementById("wantedMobDropdown"); if(!dd) return; if(dd.style.display!=="none"){ dd.style.display="none"; return }; if(!dd.dataset.built){ dd.dataset.built="1"; const em=document.createElement("div"); em.style.cssText="padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,120,60);cursor:pointer;"; em.innerText="— Choisir un mob —"; em.onmousedown=e=>{ e.stopPropagation(); selectWantedMob("","— Choisir un mob —") }; dd.appendChild(em); WANTED_MOBS.forEach(m=>{ const it=document.createElement("div"); it.style.cssText="padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,200,120);cursor:pointer;"; it.innerText=heroDisplayName(m); it.onmousedown=e=>{ e.stopPropagation(); selectWantedMob(m,it.innerText) }; it.onmouseenter=()=>it.style.background="rgb(60,35,5)"; it.onmouseleave=()=>it.style.background=""; dd.appendChild(it) }) }; const r=el.getBoundingClientRect(); dd.style.position="fixed"; dd.style.top=(r.bottom+2)+"px"; dd.style.left=r.left+"px"; dd.style.width=r.width+"px"; dd.style.display="block" }
function selectWantedMob(val, lbl) { const btn=document.getElementById("wantedMobBtn"); if(btn){ btn.innerText=lbl; btn.dataset.value=val }; const dd=document.getElementById("wantedMobDropdown"); if(dd) dd.style.display="none" }
function toggleWantedTierDropdown(el) { const dd=document.getElementById("wantedTierDropdown"); if(!dd) return; if(dd.style.display!=="none"){ dd.style.display="none"; return }; const r=el.getBoundingClientRect(); dd.style.position="fixed"; dd.style.top=(r.bottom+2)+"px"; dd.style.left=r.left+"px"; dd.style.width=r.width+"px"; dd.style.display="block" }
function selectWantedTier(val, lbl) { const btn=document.getElementById("wantedTierBtn"); if(btn){ btn.innerText=lbl; btn.dataset.value=val }; const dd=document.getElementById("wantedTierDropdown"); if(dd) dd.style.display="none"; const rw=WANTED_REWARDS[val]||WANTED_REWARDS.weak, ri=document.getElementById("wantedReward"); if(ri) ri.value=rw[Math.floor(Math.random()*rw.length)] }
