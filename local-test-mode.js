"use strict"
window.__isolatedTestMode = new URLSearchParams(location.search).get("test") === "1"
if (window.__isolatedTestMode) document.body.dataset.testMode = "true"
function rpgStorageKey(key) { return window.__isolatedTestMode ? "test." + key : key }
function createIsolatedTestDatabase(live) {
  const storageKey = "rpg.test.session.v1", clone = value => value == null ? null : JSON.parse(JSON.stringify(value))
  let state
  try { state = JSON.parse(sessionStorage.getItem(storageKey) || "null") } catch (_) {}
  if (!state || state.testSchema !== 1) state = { ...initialSession(), roles:{}, profiles:{}, heroAssignments:{}, securityVersion:2, testSchema:1 }
  state.roles = {}; state.sessionClients = {}; state.sessionAcks = {}; state.sessionControl = {revision:state.sessionControl?.revision || "initial"}
  const listeners = new Set(); let serial = 0
  const parts = path => String(path || "").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
  const get = (root, path) => parts(path).reduce((value,key) => value?.[key], root) ?? null
  const snap = (value,path) => ({ key:parts(path).at(-1) || null, val:()=>clone(value), exists:()=>value != null, child:key=>snap(get(value,key),path+"/"+key), forEach:callback=>{ for(const [key,item] of Object.entries(value || {})) if(callback(snap(item,path+"/"+key)) === true)return true;return false } })
  const viewed = (root,entry) => {
    let value = get(root,entry.path)
    if (entry.query && value && typeof value === "object") {
      let items = Object.entries(value).sort((a,b)=>(a[1]?.[entry.query.order] || 0)-(b[1]?.[entry.query.order] || 0))
      if(entry.query.start != null)items=items.filter(([,v])=>v?.[entry.query.order] >= entry.query.start)
      if(entry.query.limit)items=items.slice(-entry.query.limit)
      value=Object.fromEntries(items)
    }
    return value
  }
  function notify(before) {
    for(const entry of [...listeners]) {
      const previous=viewed(before,entry),current=viewed(state,entry)
      if(JSON.stringify(previous)===JSON.stringify(current))continue
      if(entry.event === "value")queueMicrotask(()=>listeners.has(entry)&&entry.callback(snap(current,entry.path)))
      else {
        const keys=new Set([...Object.keys(previous||{}),...Object.keys(current||{})])
        for(const key of keys){const a=previous?.[key],b=current?.[key],event=a==null&&b!=null?"child_added":a!=null&&b==null?"child_removed":JSON.stringify(a)!==JSON.stringify(b)?"child_changed":null;if(event===entry.event)queueMicrotask(()=>listeners.has(entry)&&entry.callback(snap(event==="child_removed"?a:b,entry.path+"/"+key)))}
      }
    }
  }
  function persist(before) { try {sessionStorage.setItem(storageKey,JSON.stringify(state))} catch (_) {console.warn("Essai : stockage local plein ; gardez cet onglet ouvert.")} notify(before) }
  function put(root,path,value) {
    const keys=parts(path);if(!keys.length)return clone(value)||{}
    let node=root;for(const key of keys.slice(0,-1)) {if(!node[key]||typeof node[key]!=="object")node[key]={};node=node[key]}
    if(value==null)delete node[keys.at(-1)];else node[keys.at(-1)]=clone(value)
    return root
  }
  function ref(path="",query=null) {
    path=parts(path).join("/")
    // Only the signed-in account's GM role is read online. Every game read/write is local.
    if(/^roles\/[^/]+$/.test(path)) {
      const real=live.ref(path),wrapped=new Map(),uid=parts(path)[1]
      const accept=s=>{const before=clone(state);state.roles[uid]=s.val()==="gm"?"gm":null;persist(before);return snap(state.roles[uid],path)}
      return {key:uid,on(event,callback,error){const cb=s=>callback(accept(s));wrapped.set(callback,cb);real.on(event,cb,error);return callback},off(event,callback){if(callback){real.off(event,wrapped.get(callback));wrapped.delete(callback)}else for(const cb of wrapped.values())real.off(event,cb)},once(event,callback){return real.once(event).then(s=>{const value=accept(s);callback?.(value);return value})},set(){return Promise.reject(Error("Les comptes ne se modifient pas dans un essai."))},update(){return this.set()},remove(){return this.set()}}
    }
    const info=path===".info/connected"?true:path===".info/serverTimeOffset"?0:undefined
    const api={key:parts(path).at(-1)||null,child:key=>ref(path+"/"+key),toString:()=>"local-test:///"+path,
      once(event,callback){const value=snap(info!==undefined?info:viewed(state,{path,query}),path);callback?.(value);return Promise.resolve(value)},
      on(event,callback){const entry={path,query,event,callback};listeners.add(entry);const value=info!==undefined?info:viewed(state,entry);if(event==="value")queueMicrotask(()=>listeners.has(entry)&&callback(snap(value,path)));else if(event==="child_added")for(const [key,item]of Object.entries(value||{}))queueMicrotask(()=>listeners.has(entry)&&callback(snap(item,path+"/"+key)));return callback},
      off(event,callback){for(const e of [...listeners])if(e.path===path&&(!event||e.event===event)&&(!callback||e.callback===callback))listeners.delete(e)},
      set(value){const before=clone(state);state=put(state,path,value);persist(before);return Promise.resolve()},
      update(values){const before=clone(state);for(const [key,value]of Object.entries(values||{}))state=put(state,path?path+"/"+key:key,value);persist(before);return Promise.resolve()},
      remove(){return api.set(null)},
      transaction(update,completion){try{const previous=get(state,path),value=update(clone(previous));if(value===undefined){const result={committed:false,snapshot:snap(previous,path)};completion?.(null,false,result.snapshot);return Promise.resolve(result)}const before=clone(state);state=put(state,path,value);persist(before);const result={committed:true,snapshot:snap(get(state,path),path)};completion?.(null,true,result.snapshot);return Promise.resolve(result)}catch(error){completion?.(error,false,null);return Promise.reject(error)}},
      push(value){const child=ref(path+"/test-"+Date.now()+"-"+(++serial));if(value!==undefined){const written=child.set(value);child.then=(resolve,reject)=>written.then(()=>resolve?.({key:child.key}),reject)}return child},
      onDisconnect:()=>({remove:()=>Promise.resolve(),set:()=>Promise.resolve(),cancel:()=>Promise.resolve()}),
      orderByChild:key=>ref(path,{...query,order:key}),limitToLast:limit=>ref(path,{...query,limit}),startAt:start=>ref(path,{...query,start})
    };return api
  }
  return {__isolatedTest:true,ref,app:{options:{databaseURL:"local-test:///"}},goOnline(){},goOffline(){}}
}
function openIsolatedTest() {
  if(window.__authRole!=="gm")return entranceMessage("Connectez-vous d’abord avec le compte MJ.")
  const url=new URL(location.href);url.searchParams.set("test","1");location.assign(url.href)
}
function returnFromIsolatedTest() {const url=new URL(location.href);url.searchParams.delete("test");location.assign(url.href)}
let specialPreviewSerial=0,specialPreviewPending=false
function specialPreviewAllowed(){return !!(window.__isolatedTestMode&&typeof db!=="undefined"&&db.__isolatedTest&&window.__authRole==="gm"&&isGM&&gameStarted&&document.body.dataset.entryStage==="playing")}
function closeSpecialPreviewPanel(){const panel=document.getElementById("specialPreviewPanel");if(panel?.__resizePreview)window.removeEventListener("resize",panel.__resizePreview);panel?.remove();if(panel)window.GameWindows?.closed(panel)}
function playSpecialPreview(actor){
 if(!specialPreviewAllowed()||!CHARACTER_IDS.includes(actor))return false
 if(specialPreviewPending||window.__sharedVisualBusy||window.__sessionBusy||(combatActive&&Date.now()<(window.__combatIntroUntil||0))){showNotification("Attendez la fin de l’animation en cours.");return false}
 const attack=getPlayerSpecialAttack(actor);if(!attack)return false
 const duration=actor==="ju"?4200:6800
 let cancelled=false,cancelEffect=null,releaseTimer=null
 const cancel=()=>{cancelled=true;clearTimeout(releaseTimer);cancelEffect?.();specialPreviewPending=false;if(window.__cancelSpecialPreview===cancel)window.__cancelSpecialPreview=null}
 specialPreviewPending=true;window.__cancelSpecialPreview=cancel;closeSpecialPreviewPanel()
 const added=enqueueSharedVisual("special-preview-"+(++specialPreviewSerial),()=>{
  if(cancelled||!specialPreviewAllowed()){cancel();return}
  if(actor==="ju"){presentPikaAttack({actor,attack:attack.name,pikaKind:"endikaki",mode:"damage",special:true,fail:false,crit:false,amount:0,message:"APERÇU — Endikaki : animation et son uniquement"});cancelEffect=window.__cancelEndikakiPresentation}
  else cancelEffect=showPlayerAttackImpact(actor,attack,{mode:"damage",amount:0,targetName:"Cible d’essai"},{special:true,preview:true,crit:false,fail:false})
  releaseTimer=setTimeout(cancel,duration)
 },duration)
 if(!added)cancel()
 return added
}
function openSpecialPreviewPanel(){
 if(!specialPreviewAllowed())return
 if(specialPreviewPending||window.__sharedVisualBusy){showNotification("Attendez la fin de l’animation en cours.");return}
 if(document.getElementById("specialPreviewPanel"))return closeSpecialPreviewPanel()
 const panel=document.createElement("section");panel.id="specialPreviewPanel";panel.className="specialPreviewPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Tester les spéciales")
 const title=document.createElement("h2");title.textContent="Tester les spéciales";panel.appendChild(title)
 const help=document.createElement("p");help.textContent="Animations et sons uniquement, sans condition. Aucun PV, tour, jauge ou usage de spéciale n’est modifié.";panel.appendChild(help)
 for(const actor of CHARACTER_IDS){const b=document.createElement("button");b.type="button";b.dataset.specialPreview=actor;b.textContent=heroDisplayName(actor)+" — "+getPlayerSpecialAttack(actor).name;b.onclick=()=>playSpecialPreview(actor);panel.appendChild(b)}
 const close=document.createElement("button");close.type="button";close.textContent="Fermer";close.onclick=closeSpecialPreviewPanel;panel.appendChild(close);document.body.appendChild(panel);const place=()=>{const top=Math.min(innerHeight-100,Math.max(12,(document.getElementById("isolatedTestBanner")?.getBoundingClientRect().bottom||0)+12));panel.style.top=top+"px";panel.style.transform="translateX(-50%)";panel.style.maxHeight="calc(100dvh - "+(top+12)+"px)"};panel.__resizePreview=place;window.addEventListener("resize",place);place();window.GameWindows?.register(panel,closeSpecialPreviewPanel)
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!window.__isolatedTestMode)return
  const banner=document.createElement("aside");banner.id="isolatedTestBanner";banner.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:8px 14px;background:#3f253d;color:#ffe4a3;font:14px Georgia;text-align:center";banner.textContent="ESSAI LOCAL — la campagne et ses sauvegardes ne sont pas modifiées. "
  const back=document.createElement("button");back.textContent="Revenir à la campagne";back.onclick=returnFromIsolatedTest;banner.appendChild(back);const previews=document.createElement("button");previews.id="testSpecialsBtn";previews.type="button";previews.textContent="Tester les spéciales";previews.onclick=openSpecialPreviewPanel;banner.appendChild(previews);const actions=document.createElement("button");actions.id="testPlayerActionsBtn";actions.type="button";actions.textContent="Actions des joueurs";actions.onclick=()=>openTestPlayerActions("greg");banner.appendChild(actions);document.body.appendChild(banner)
})

function thuumEffectDescription(word,rank=1){
 const def=getThuumDef(word);if(!def)return ""
 if(word==="SKRAA"){const d=def.combatDamageByRank(rank);return def.description+" "+d.main+" dégâts sur la cible, "+d.splash+" sur chacun des autres ennemis."}
 if(word==="REIHKT"){const d=def.combatDamageByRank(rank);return d.main+" dégâts. "+def.description}
 return def.description||""
}
async function openTestPlayerActions(actor){
 if(!window.__isolatedTestMode||window.__authRole!=="gm"||!["greg","ju","elo"].includes(actor))return
 const root=(await db.ref().once("value")).val()||{}
 if(!window.__isolatedTestMode||window.__authRole!=="gm")return
 document.getElementById("testPlayerActionsPanel")?.remove()
 const panel=document.createElement("section"),title=document.createElement("h2"),notice=document.createElement("p"),tabs=document.createElement("nav"),close=document.createElement("button")
 panel.id="testPlayerActionsPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Aperçu des actions des joueurs");title.textContent="Actions de "+heroDisplayName(actor);notice.textContent="Aperçu en lecture seule de l’essai local. Aucun changement de rôle ni utilisation de pouvoir.";panel.append(title,notice,tabs)
 for(const id of ["greg","ju","elo"]){const button=document.createElement("button");button.textContent=heroDisplayName(id);button.setAttribute("aria-pressed",String(id===actor));button.onclick=()=>openTestPlayerActions(id);tabs.appendChild(button)}
 const add=(name,text)=>{const card=document.createElement("section"),heading=document.createElement("h3"),desc=document.createElement("p");heading.textContent=name;desc.textContent=text;card.append(heading,desc);panel.appendChild(card)}
 for(const [word,data]of Object.entries(root.game?.playerThuum?.[actor]||{})){if(!data?.unlocked||!getThuumDef(word))continue;const allowed=!!root.game?.playerThuumAccess?.[actor]?.[word]?.allowed,used=!!root.combat?.usedThuum?.[actor]?.[word];add(word+" — "+getThuumDef(word).words.join(" • "),thuumEffectDescription(word,data.rank||1)+" "+(used?"Déjà utilisé dans ce combat.":allowed?"Autorisation MJ accordée.":"Autorisation MJ requise."))}
 for(const pnj of ALLY_PNJS.filter(p=>root.game?.allyDiscoveries?.[p.id]))add(pnj.name,pnj.actions.map(a=>a.label+" : "+a.desc).join(" ")+" World boss uniquement, sur autorisation du MJ.")
 const access=root.game?.playerAllyAccess;if(access?.playerId===actor)add("Invocation autorisée",access.pnjName+" — "+access.actionId)
 if(Number(root.characters?.[actor]?.corruption)>=10)add("Libérer le pouvoir","Jauge pleine : le pouvoir personnel est disponible.")
 if(root.game?.runeChallenge?.active)add("Défi runique","Le défi de runes est en cours.")
 if(panel.querySelectorAll("section").length===0)add("Aucune action spéciale disponible","Ce personnage n’a actuellement ni cri appris, ni allié découvert, ni pouvoir chargé, ni défi actif.")
 close.textContent="Fermer";close.onclick=()=>panel.remove();panel.appendChild(close);panel.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();panel.remove()}});document.body.appendChild(panel);panel.scrollTop=0;tabs.querySelector("button")?.focus({preventScroll:true})
}
