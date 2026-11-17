"use strict"

// Livres de carte et documents partagés du MJ. Notes personnelles : character-sheet.js.
const MAP_LORE_BOOK_MAPS = [
  "taverne.jpg",
  "tavernebrume.png",
  "palaisville.jpg",
  "mairemaison.jpg",
  "marche.jpg",
  "marche1.jpg",
  "interieurmine.jpg"
]

const MAP_LORE_BOOK_IMAGES = ["livre.png", "livre1.png", "livre2.png"]

const MAP_LORE_BOOK_ENTRIES = {
  revenus: {
    id: "revenus",
    text: "Ils sont revenus.\nIls sont revenus.\nIls sont revenus.",
    reward: null
  },
  logique: {
    id: "logique",
    text: "Jour 12 : je suis persuadé que ce lieu a une logique.\nJour 19 : je suis persuadé que cette logique m'échappe.\nJour 23 : je ne suis plus sûr de vouloir comprendre.",
    reward: { stat: "perspi", amount: 1, label: "Intelligence" }
  },
  subtile: {
    id: "subtile",
    text: "Certains apprennent à éviter les coups.\nD'autres apprennent à ne jamais être là quand ils arrivent.\nLa différence est subtile, mais elle sauve des vies.",
    reward: { stat: "defense", amount: 1, label: "Dextérité" }
  },
  danger: {
    id: "danger",
    text: "Si vous lisez ceci, c'est que vous êtes probablement en danger.\nSi vous n'êtes pas en danger, reposez ce livre immédiatement, vous allez l'être.",
    reward: { stat: "curse", amount: 1, label: "Malédiction" }
  }
}

function isMapLoreBookMap(mapName) {
  return MAP_LORE_BOOK_MAPS.includes(mapName)
}

function getMapLoreBookPosition(mapName) {
  const positions = {
    "taverne.jpg":       { left: "20%", bottom: "18%" },
    "tavernebrume.png":  { left: "18%", bottom: "18%" },
    "palaisville.jpg":   { left: "76%", bottom: "16%" },
    "mairemaison.jpg":   { left: "24%", bottom: "20%" },
    "marche.jpg":        { left: "30%", bottom: "16%" },
    "marche1.jpg":       { left: "26%", bottom: "18%" },
    "interieurmine.jpg": { left: "74%", bottom: "15%" }
  }
  return positions[mapName] || { left: "22%", bottom: "18%" }
}

function closeMapLoreBookOverlay() {
  const overlay = document.getElementById("mapLoreBookOverlay")
  if (overlay) overlay.remove()
  window.__openedMapLoreBookId = null;window.__openedMapLoreBookTime=null
}

function updateMapLoreBookVisibility() {
  const existing = document.getElementById("mapLoreBookToken")
  const data = window.mapLoreBookData
  if(window.__openedMapLoreBookId&&(!data||data.id!==window.__openedMapLoreBookId||data.time!==window.__openedMapLoreBookTime||data.map!==currentMap||combatActive))closeMapLoreBookOverlay()
  const shouldShow = !!(
    data &&
    data.active &&
    !data.claimedBy &&
    data.map === currentMap &&
    gameState === "GAME" &&
    !combatActive
  )

  if (!shouldShow) {
    if (existing) existing.remove()
    return
  }

  const mapEl = document.getElementById("map")
  if (!mapEl) return
  const pos = getMapLoreBookPosition(currentMap)
  const token = existing || document.createElement("img")

  if (!existing) {
    token.id = "mapLoreBookToken"
    token.style.position = "absolute"
    token.style.width = "88px"
    token.style.height = "88px"
    token.style.objectFit = "contain"
    token.style.cursor = "pointer"
    token.style.pointerEvents = "auto"
    token.draggable = false
    token.style.zIndex = "58"
    token.style.filter = "drop-shadow(0 10px 16px rgba(0,0,0,0.82))"
    token.style.animation = "bookFloatIdle 2.8s ease-in-out infinite"
    token.onmousedown = e => { e.stopPropagation() }
    token.onclick = e => { e.stopPropagation(); tryOpenMapLoreBook() }
    mapEl.appendChild(token)
  }

  token.src = "images/" + (data.image || "livre.png")
  token.style.left = pos.left
  token.style.bottom = pos.bottom
}

function showMapLoreBookOverlay(bookData) {
  const entry = MAP_LORE_BOOK_ENTRIES[bookData?.id]
  if (!entry||!canPresentMapLoreBook(bookData)) return
  closeMapLoreBookOverlay()
  playSound("parcheminSound", 0.85)

  const overlay = document.createElement("div")
  overlay.id = "mapLoreBookOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.58);z-index:9999996;opacity:0;transition:opacity 0.4s ease;"

  const box = document.createElement("div")
  box.style.cssText = "position:relative;width:min(760px,86vw);height:min(640px,84vh);display:flex;align-items:center;justify-content:center;"

  const img = document.createElement("img")
  img.src = "images/paper1.png"
  img.style.cssText = "width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 18px 42px rgba(0,0,0,0.9));pointer-events:none;"
  box.appendChild(img)

  const text = document.createElement("div")
  text.style.cssText = "position:absolute;left:18%;top:24%;width:64%;height:46%;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;font-family:'IM Fell English',serif;font-size:clamp(22px,2vw,34px);line-height:1.45;color:#3c2713;text-shadow:0 1px 0 rgba(255,235,190,0.2);padding:34px 40px;box-sizing:border-box;background:url('images/paper1.png') center/100% 100% no-repeat;"
  text.innerText = entry.text
  box.appendChild(text)

  if (entry.reward) {
    const reward = document.createElement("div")
    reward.style.cssText = "position:absolute;left:20%;bottom:18%;width:60%;text-align:center;font-family:'Cinzel',serif;font-size:clamp(14px,1.2vw,18px);letter-spacing:2px;color:#68451f;"
    reward.innerText = "+1 " + entry.reward.label + (bookData.claimedBy ? " — attribué à "+heroDisplayName(bookData.claimedBy) : "")
    box.appendChild(reward)
  }

  // Fermer en cliquant sur le fond
  overlay.addEventListener("pointerdown", e => { if (e.target === overlay) closeMapLoreBookOverlay() })

  // Bouton fermer (tablettes sans Echap)
  const closeBtn = document.createElement("button")
  closeBtn.innerText = "✕"
  closeBtn.style.cssText = "position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;background:rgba(20,12,8,0.95);border:1px solid rgba(212,168,53,0.6);color:#d4a835;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.7);touch-action:manipulation;"
  closeBtn.onclick = closeMapLoreBookOverlay
  box.appendChild(closeBtn)

  overlay.appendChild(box)
  document.body.appendChild(overlay)
  window.__openedMapLoreBookId = bookData.id;window.__openedMapLoreBookTime=bookData.time
  setTimeout(() => { overlay.style.opacity = "1" }, 30)
}

function tryOpenMapLoreBook() {
  const book=window.mapLoreBookData,actor=getLocalPlayerId()
  if(isGM||!SPELL_PLAYERS.includes(actor)||!book?.active)return
  return requestExplorationAction("book",actor,{bookId:book.id,bookTime:book.time})
}

async function maybeSpawnMapLoreBook(mapName){
  if(!isGM||window.__authRole!=="gm")return
  const revision=persistenceRevision||"initial",seed=Math.floor(Math.random()*4294967296)
  try{await reliableRootTransaction(root=>{
    if(root?.sessionControl?.phase||(root?.sessionControl?.revision||"initial")!==revision||root?.game?.map!==mapName)return undefined
    delete root.game.mapLoreBook
    const dice=combatRandom(seed)
    if(!isMapLoreBookMap(mapName)||dice(100)>20)return root
    const read=root.game.readLoreBooks||{},pool=Object.values(MAP_LORE_BOOK_ENTRIES).filter(entry=>!read[entry.id])
    if(!pool.length)return root
    const entry=pool[dice(pool.length)-1],image=MAP_LORE_BOOK_IMAGES[dice(MAP_LORE_BOOK_IMAGES.length)-1]
    root.game.mapLoreBook={id:entry.id,image,map:mapName,active:true,time:Date.now()};return root
  })}catch(error){console.warn("Livre non créé",error)}
}

async function showDocument(image,title){
  if(!isGM||window.__authRole!=="gm")return
  try{requireActionConnection();await reliablePut("game/document",{image:String(image||""),title:String(title||""),time:Date.now(),id:db.ref("game/document").push().key})}
  catch(error){showNotification("Document non affiché : "+error.message)}
}

async function hideDocument(){
  if(!isGM||window.__authRole!=="gm")return
  try{requireActionConnection();await reliablePut("game/document",null)}
  catch(error){showNotification("Document non fermé : "+error.message)}
}

function _renderDocument(data) {
  const existing = document.getElementById("documentOverlay"); if (existing) existing.remove()
  if (!data) return

  const overlay = document.createElement("div"); overlay.id = "documentOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9999995;opacity:0;transition:opacity 0.8s ease;"

  const img = document.createElement("img"); img.src = (typeof resolveImagePath === "function") ? resolveImagePath(data.image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(data.image || "")) ? String(data.image || "") : "images/" + data.image)
  img.style.cssText = "max-height:80vh;max-width:80vw;object-fit:contain;filter:drop-shadow(0 20px 50px rgba(0,0,0,0.9));animation:pnjIdle 3s ease-in-out infinite;pointer-events:none;"
  img.onerror = () => img.style.opacity = "0.3"
  overlay.appendChild(img)

  // Bouton fermer — visible pour tous (tablettes sans Echap)
  const closeBtn = document.createElement("button")
  closeBtn.innerText = "✕"
  closeBtn.style.cssText = "position:fixed;top:18px;right:18px;width:42px;height:42px;border-radius:50%;background:rgba(20,12,8,0.95);border:1px solid rgba(212,168,53,0.6);color:#d4a835;font-size:20px;cursor:pointer;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.7);touch-action:manipulation;"
  closeBtn.onclick = () => { if (isGM) hideDocument(); else overlay.remove() }
  overlay.appendChild(closeBtn)

  document.body.appendChild(overlay)
  setTimeout(() => overlay.style.opacity = "1", 30)
  playSound("parcheminSound", 0.7)
}

function canPresentMapLoreBook(book){
  const live=window.mapLoreBookData
  return !!(gameStarted&&!window.__sessionBusy&&gameState==="GAME"&&!combatActive&&book&&live&&live.id===book.id&&live.time===book.time&&live.map===currentMap&&(!book.claimedBy||book.claimedBy===live.claimedBy))
}

function presentMapLoreBookEvent(book,actor){
  const revision=persistenceRevision,transition=window.__mapTransitionSequence||0;let attempts=0
  const show=()=>{
    if(revision!==persistenceRevision||transition!==(window.__mapTransitionSequence||0)||!gameStarted||gameState!=="GAME"||combatActive)return
    if(window.__sessionBusy){if(attempts++<120)setTimeout(show,250);return}
    if(!canPresentMapLoreBook(book))return
    showMapLoreBookOverlay(book);showNotification(heroDisplayName(actor)+" ouvre le livre.")
  };show()
}

const PLAYER_DOCUMENTS=[
 {id:"baldur-note",image:"note baldur.png",title:"Note de Baldur",kind:"Note"},
 {id:"forest-note",image:"note foret.png",title:"Note de la Forêt",kind:"Note"},
 {id:"maelstrom-fresco",image:"fresque.jpg",title:"Fresque Maelstrom",kind:"Fresque"},
 {id:"mysterious-rune",image:"rune-mysterieuse.png",title:"Rune mystérieuse",kind:"Rune"}
]
window.__playerDocuments={}
function getGrantedDocuments(actor,grants=window.__playerDocuments){return PLAYER_DOCUMENTS.filter(doc=>grants?.[actor]?.[doc.id]===true)}
function closePersonalDocument(){const el=document.getElementById("personalDocumentOverlay");el?.remove();if(el)window.GameWindows?.closed(el)}
function openPersonalDocument(id,actor=getLocalPlayerId(),preview=false){
 const doc=PLAYER_DOCUMENTS.find(d=>d.id===id),test=preview&&window.__isolatedTestMode&&db.__isolatedTest&&window.__authRole==="gm"
 if(!doc||!getGrantedDocuments(actor).some(d=>d.id===id)||(!test&&(isGM||actor!==window.__authPlayerId||actor!==getLocalPlayerId())))return false
 closePersonalDocument();const overlay=document.createElement("section"),box=document.createElement("div"),title=document.createElement("h2"),image=document.createElement("img"),close=document.createElement("button")
 overlay.id="personalDocumentOverlay";overlay.dataset.documentId=id;overlay.dataset.actor=actor;overlay.dataset.preview=String(!!test);overlay.className="personalDocumentOverlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",doc.title);box.className="personalDocumentBox";title.textContent=doc.title;image.src="images/"+doc.image;image.alt=doc.title;close.textContent="Fermer ✕";close.type="button";close.onclick=closePersonalDocument;box.append(title,image,close);overlay.appendChild(box);overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)closePersonalDocument()});document.body.appendChild(overlay);window.GameWindows?.register(overlay,closePersonalDocument);playSound("parcheminSound",.7);return true
}
function renderGrantedDocuments(panel,actor=getLocalPlayerId(),grants=window.__playerDocuments,preview=false){
 const docs=getGrantedDocuments(actor,grants),intro=document.createElement("p");intro.className="playerActionHint";intro.textContent="Tes documents — à consulter librement, uniquement sur ton écran.";panel.appendChild(intro)
 if(!docs.length){const empty=document.createElement("p");empty.textContent="Le MJ ne t’a pas encore confié de document.";panel.appendChild(empty)}
 for(const doc of docs){const button=document.createElement("button"),image=document.createElement("img"),text=document.createElement("span"),name=document.createElement("strong"),kind=document.createElement("small");button.type="button";button.className="playerDocumentCard";button.dataset.documentId=doc.id;image.src="images/"+doc.image;image.alt="";name.textContent=doc.title;kind.textContent=doc.kind+" · Consulter";text.append(name,kind);button.append(image,text);button.onclick=()=>{if(openPersonalDocument(doc.id,actor,preview)&&!preview){const menu=document.getElementById("playerThuumPanel");if(menu)menu.style.display="none";document.getElementById("playerThuumBtn")?.setAttribute("aria-expanded","false")}};panel.appendChild(button)}
}
async function setDocumentRecipients(id,actors,expected=null){
 requireActionAccess({gmOnly:true});requireActionConnection()
 if(!PLAYER_DOCUMENTS.some(d=>d.id===id)||!Array.isArray(actors)||actors.some(a=>!PLAYABLE_HEROES.includes(a)))throw Error("Document ou destinataire inconnu")
 const selected=[...new Set(actors)],uid=window.__authUid,revision=persistenceRevision||"initial"
 const result=await reliableRootTransaction(root=>{
  if(root?.roles?.[uid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision)return undefined
  const current=PLAYABLE_HEROES.filter(a=>root.game?.playerDocuments?.[a]?.[id]===true)
  if(expected&&JSON.stringify(current.slice().sort())!==JSON.stringify(expected.slice().sort()))return undefined
  root.game||={};root.game.playerDocuments||={}
  for(const actor of PLAYABLE_HEROES){root.game.playerDocuments[actor]||={};if(selected.includes(actor))root.game.playerDocuments[actor][id]=true;else delete root.game.playerDocuments[actor][id]}
  return root
 })
 if(!result.committed)throw Error("Les accès ou la partie ont changé. Fermez puis rouvrez ce panneau.")
 return true
}
function closeDocumentGrantPanel(){const el=document.getElementById("documentGrantPanel");el?.remove();if(el)window.GameWindows?.closed(el)}
async function openDocumentGrantPanel(id){
 try{
  requireActionAccess({gmOnly:true});requireActionConnection();const doc=PLAYER_DOCUMENTS.find(d=>d.id===id);if(!doc)return
  const revision=persistenceRevision,grants=(await db.ref("game/playerDocuments").once("value")).val()||{}
  if(window.__authRole!=="gm"||revision!==persistenceRevision||window.__sessionBusy)return
  closeDocumentGrantPanel();const panel=document.createElement("section"),box=document.createElement("div"),title=document.createElement("h2"),help=document.createElement("p"),error=document.createElement("p"),save=document.createElement("button"),close=document.createElement("button"),expected=PLAYABLE_HEROES.filter(a=>grants[a]?.[id]===true)
  panel.id="documentGrantPanel";panel.className="personalDocumentOverlay";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Donner un document");box.className="documentGrantBox";title.textContent=doc.title;help.textContent="Choisissez qui pourra consulter ce document dans Action → Documents. Décochez un joueur pour retirer son accès.";error.setAttribute("role","alert");box.append(title,help,error)
  for(const actor of PLAYABLE_HEROES){const label=document.createElement("label"),input=document.createElement("input"),name=document.createElement("span");input.type="checkbox";input.value=actor;input.checked=expected.includes(actor);name.textContent=heroDisplayName(actor);label.append(input,name);box.appendChild(label)}
  save.textContent="Enregistrer les accès";save.type="button";save.onclick=async()=>{const inputs=[...box.querySelectorAll("input")],selected=inputs.filter(i=>i.checked).map(i=>i.value);save.disabled=true;inputs.forEach(i=>i.disabled=true);try{await setDocumentRecipients(id,selected,expected);closeDocumentGrantPanel();document.querySelectorAll(".gmSection").forEach(menu=>menu.style.display="none");showNotification("Accès au document enregistrés.")}catch(e){error.textContent=e.message}finally{save.disabled=false;inputs.forEach(i=>i.disabled=false)}};close.textContent="Annuler";close.type="button";close.onclick=closeDocumentGrantPanel;box.append(save,close);panel.appendChild(box);document.body.appendChild(panel);window.GameWindows?.register(panel,closeDocumentGrantPanel)
 }catch(error){showNotification(error.message)}
}
function renderGMDocumentLibrary(){
 const host=document.getElementById("gmDocumentLibrary");if(!host)return;host.replaceChildren()
 for(const doc of PLAYER_DOCUMENTS){const row=document.createElement("div"),name=document.createElement("strong"),show=document.createElement("button"),give=document.createElement("button");row.className="gmDocumentRow";name.textContent=doc.title;show.textContent="Afficher à tous";show.type="button";show.onclick=()=>showDocument(doc.image,doc.title);give.textContent="Donner…";give.type="button";give.dataset.grantDocument=doc.id;give.onclick=()=>openDocumentGrantPanel(doc.id);row.append(name,show,give);host.appendChild(row)}
}
document.addEventListener("DOMContentLoaded",()=>{
 renderGMDocumentLibrary()
 db.ref("game/playerDocuments").on("value",snapshot=>{window.__playerDocuments=snapshot.val()||{};const viewer=document.getElementById("personalDocumentOverlay");if(viewer&&!getGrantedDocuments(viewer.dataset.actor).some(d=>d.id===viewer.dataset.documentId))closePersonalDocument();if(typeof updateThuumButton==="function")updateThuumButton()})
})
