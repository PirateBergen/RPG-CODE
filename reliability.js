"use strict"
window.__actionOnline=false
window.__heroAssignments={}
window.__heroReservationsReady=false
let reliableEpoch=0,reliableOffset=0,reliabilityCleanupTimer=null,saveTrimPromise=null
const reliablePending=new Set()
function reliableActionNow(){return Date.now()+reliableOffset}
function requireActionConnection(allowSessionBusy=false){if(!window.__actionOnline)throw Error("Action non envoyée : connexion perdue. Attendez la reconnexion avant de réessayer.");if(allowSessionBusy&&(window.__authRole!=="gm"||!persistenceOperation))throw Error("Synchronisation MJ nécessaire");if(window.__sessionBusy&&!allowSessionBusy)throw Error("La partie se synchronise")}
function ownsReservedHero(id){const hero=id==="bibi"?"greg":id;return window.__heroAssignments?.[hero]?.uid===window.__authUid}
function validateReliableRequest(root,r){
 if(root?.securityVersion!==2)return
 const now=typeof reliableActionNow==="function"?reliableActionNow():Date.now()
 if(r.protocol!==2||r.sessionRevision!==(root.sessionControl?.revision||"initial")||!Number.isFinite(r.expiresAt)||r.expiresAt<now)throw Error("Demande expirée ou ancienne session : réessayez")
 if(root.roles?.[r.uid]!=="gm"&&root.heroAssignments?.[combatOwner(r.actor)]?.uid!==r.uid)throw Error("Ce héros a été libéré ou réattribué par le MJ")
}
async function reliablePut(path,value,providedSignal,allowSessionBusy=false,method="PUT",sheetFlush=false){
 const checkConnection=()=>{const id=/^characters\/(greg|ju|elo|bibi)$/.exec(path)?.[1];if(sheetFlush&&window.__sheetFlushAuthorized&&id&&canAccessCharacter(id)){if(!window.__actionOnline)throw Error("Connexion perdue — modifications non enregistrées");return}requireActionConnection(allowSessionBusy)}
 if(db.__isolatedTest){checkConnection();await db.ref(path)[method==="PATCH"?"update":"set"](value);return {ok:true,status:200}}
 checkConnection();const epoch=reliableEpoch,user=auth?.currentUser
 if(!user)throw Error("Connexion au compte nécessaire")
 const controller=providedSignal?null:new AbortController(),signal=providedSignal||controller.signal
 let timer,cancel
 const send=async()=>{
  const token=await user.getIdToken();checkConnection()
  if(epoch!==reliableEpoch||signal.aborted||window.__authUid!==user.uid)throw Error("Connexion interrompue : réessayez")
  const url=new URL(db.ref(path).toString());url.pathname+=".json";const configured=db.app.options.databaseURL?new URL(db.app.options.databaseURL):null;if(configured?.searchParams.has("ns"))url.searchParams.set("ns",configured.searchParams.get("ns"));url.searchParams.set("auth",token)
  const response=await fetch(url.href,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(value),signal,cache:"no-store"})
  if(!response.ok)throw Error(response.status===401||response.status===403?"Accès refusé : reconnectez-vous avec votre héros":"Enregistrement non confirmé. Vérifiez la partie avant de réessayer.")
  if(epoch!==reliableEpoch||!window.__actionOnline||window.__authUid!==user.uid)throw Error("Confirmation perdue : vérifiez l’état de la partie avant de réessayer")
  return response
 }
 if(!controller)return send()
 try{return await Promise.race([send(),new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(Error("Résultat non confirmé : consultez le journal et l’état de la partie avant de réessayer. Aucune relance automatique."))};reliablePending.add(cancel);timer=setTimeout(cancel,15000)})])}
 finally{clearTimeout(timer);if(cancel)reliablePending.delete(cancel);controller.abort()}
}

function submitReliableAction(branch,request){
 requireActionConnection();if(!window.__authUid)throw Error("Connexion au compte nécessaire")
 const ref=db.ref(branch).push(),epoch=reliableEpoch,now=reliableActionNow(),controller=new AbortController()
 const value={...request,uid:window.__authUid,status:"queued",protocol:2,time:now,expiresAt:now+15000,sessionRevision:persistenceRevision||"initial"}
 return new Promise((resolve,reject)=>{
  let done=false;const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);ref.off("value",listener);reliablePending.delete(disconnect);controller.abort();if(error&&typeof noteGMDiagnosticIssue==="function")noteGMDiagnosticIssue("Une demande a été refusée ou non confirmée. Consultez le journal et l’état du jeu avant de réessayer.");error?reject(error):resolve(result)}
  const listener=s=>{const r=s.val();if(r?.status==="done")finish(null,r.result);else if(["failed","cancelled"].includes(r?.status))finish(Error("Action refusée : "+(r.error||"demande annulée")+". Aucun nouvel effet appliqué par cette demande."))}
  const disconnect=()=>finish(Error("Connexion perdue : résultat non confirmé. Consultez le journal et l’état de la partie après la reconnexion avant toute nouvelle tentative."))
  const timer=setTimeout(async()=>{if(window.__actionOnline)try{await reliablePut(branch+"/"+ref.key+"/status","cancelled")}catch(e){}finish(Error("Résultat non confirmé : aucune confirmation reçue. Consultez le journal et l’état de la partie avant de réessayer. Aucune relance automatique."))},15000)
  reliablePending.add(disconnect)
  reliablePut(branch+"/"+ref.key,value,controller.signal).then(()=>{if(epoch!==reliableEpoch)return disconnect();if(!done)ref.on("value",listener,e=>finish(e))}).catch(e=>finish(e.name==="AbortError"?Error("Résultat non confirmé : consultez le journal et l’état de la partie avant de réessayer. Aucune relance automatique."):e))
 })
}
async function claimReservedHero(hero,uid=window.__authUid){
 requireActionConnection();if(!window.__heroReservationsReady)throw Error("Le MJ doit ouvrir la partie pour synchroniser les attributions.");if(!PLAYABLE_HEROES.includes(hero)||uid!==window.__authUid)throw Error("Héros invalide")
 const ref=db.ref("heroAssignments/"+hero)
 // This transaction changes only a reservation. A disconnected UI never admits a hero.
 const epoch=reliableEpoch,existing=(await ref.once("value")).val(),result=existing?.uid===uid?{committed:true,snapshot:{val:()=>existing}}:await ref.transaction(current=>current?undefined:{uid,claimedAt:reliableActionNow()},undefined,false)
 if(!result.committed)throw Error("Ce héros est déjà réservé. Le MJ peut libérer une attribution incorrecte.")
 if(!window.__actionOnline||epoch!==reliableEpoch)throw Error("Connexion interrompue : reconnectez-vous pour confirmer votre héros")
 window.__heroAssignments[hero]=result.snapshot.val()
 await reliablePut("profiles/"+uid+"/playerId",hero)
 window.__authPlayerId=hero;syncCharacterSubscriptions();renderEntrance()
 return hero
}
function migrateHeroAssignments(root){
 if(!root||root.securityVersion===2)return undefined
 const next=combatClone(root);next.heroAssignments||={}
 for(const hero of PLAYABLE_HEROES){if(next.heroAssignments[hero])continue;const candidates=Object.keys(next.profiles||{}).filter(uid=>next.profiles[uid]?.playerId===hero&&next.roles?.[uid]!=="gm"),online=candidates.filter(uid=>Object.keys(next.sessionClients?.[uid]||{}).length)
  const uid=candidates.length===1?candidates[0]:online.length===1?online[0]:null
  if(uid)next.heroAssignments[hero]={uid,claimedAt:Date.now()}
  else if(candidates.length)next.heroAssignments[hero]={uid:"__legacy_review__",claimedAt:Date.now(),needsGM:true}
 }
 next.securityVersion=2;return next
}
async function releaseReservedHero(hero){
 requireActionConnection();if(window.__authRole!=="gm"||!PLAYABLE_HEROES.includes(hero))throw Error("Action réservée au MJ")
 if(!confirm("Libérer "+entranceLabel(hero)+" ? Sa fiche et sa progression seront conservées. Le joueur devra choisir à nouveau."))return
 const expected=window.__heroAssignments[hero]?.uid
 await transactCombatRoot(root=>{if(root?.roles?.[window.__authUid]!=="gm"||root.sessionControl?.phase||root.heroAssignments?.[hero]?.uid!==expected)return undefined
  const next=combatClone(root);delete next.heroAssignments[hero];for(const p of Object.values(next.profiles||{}))if(p?.playerId===hero)delete p.playerId;return next
 })
 renderHeroManagement()
}
function restoreReservedPlayerSelection(){
 if(window.__heroReservationsReady&&window.__authRole!=="gm"&&window.__authPlayerId&&ownsReservedHero(window.__authPlayerId)&&gameStarted&&["GAME","COMBAT"].includes(gameState)&&!myToken&&!window.__playerSelectionPending)choosePlayer(window.__authPlayerId)
}
function refreshHeroAvailability(){
  for(const b of document.querySelectorAll(".entranceChoices button")){const match=b.getAttribute("onclick")?.match(/chooseEntrance\('(greg|ju|elo)'\)/);if(!match)continue;const hero=match[1],claim=window.__heroAssignments[hero],unavailable=!!claim&&claim.uid!==window.__authUid;b.disabled=unavailable;b.setAttribute("aria-disabled",String(unavailable));b.title=unavailable?"Héros réservé — le MJ peut libérer une attribution incorrecte":"";b.dataset.reserved=String(unavailable);const span=b.querySelector(".heroName")||b.querySelector("span");if(span)span.textContent=entranceLabel(hero)+(unavailable?" — réservé":"")}

}
function renderHeroManagement(){
 const panel=document.getElementById("heroManagementPanel");if(!panel)return;panel.replaceChildren()
 if(window.__authRole!=="gm"){panel.remove();return}
 const title=document.createElement("h2");title.textContent="Attribution des héros";panel.appendChild(title)
 for(const hero of PLAYABLE_HEROES){const row=document.createElement("div"),state=window.__heroAssignments[hero],label=document.createElement("p");label.textContent=entranceLabel(hero)+" — "+(!state?"disponible":state.needsGM?"ancienne attribution à vérifier":"réservé");row.appendChild(label);if(state){const b=document.createElement("button");b.textContent="Libérer ce héros";b.onclick=()=>releaseReservedHero(hero).catch(e=>showNotification(e.message));row.appendChild(b)}panel.appendChild(row)}
 const close=document.createElement("button");close.textContent="Fermer";close.onclick=()=>panel.remove();panel.appendChild(close)
}
function openHeroManagement(){if(window.__authRole!=="gm")return;document.getElementById("heroManagementPanel")?.remove();const p=document.createElement("section");p.id="heroManagementPanel";p.style.cssText="position:fixed;inset:12% 15%;z-index:2147483646;overflow:auto;padding:24px;background:#20160f;color:#f4dfaf;border:2px solid #b49151;border-radius:12px";document.body.appendChild(p);renderHeroManagement()}
async function cleanupCompletedActionRequests(){
 if(window.__authRole!=="gm"||!window.__actionOnline||window.__sessionBusy)return
 const now=reliableActionNow(),updates={}
 for(const branch of ["combatRequests","explorationRequests","characterRequests"]){const records=(await db.ref(branch).once("value")).val()||{};for(const [id,r]of Object.entries(records))if(["done","failed","cancelled"].includes(r?.status)&&now-(r.time||0)>300000)updates[branch+"/"+id]=null}
 if(Object.keys(updates).length)await db.ref().update(updates)
}
async function trimSaveHistory(){
 if(window.__authRole!=="gm"||!window.__actionOnline||window.__sessionBusy||saveTrimPromise)return
 const ref=db.ref("saves"),keepCache=()=>{};ref.on("value",keepCache)
 saveTrimPromise=(async()=>{try{await ref.once("value");await ref.transaction(records=>{
  if(!records||window.__sessionBusy)return undefined
  const entries=sortedSaveEntries(records).filter(([,save])=>{try{sessionFromSave(save);return true}catch(e){return false}})
  if(!entries.length)return undefined
  const next={current:entries[0][1],...(entries[1]?{previous:entries[1][1]}:{})}
  return JSON.stringify(records)===JSON.stringify(next)?undefined:next
 },undefined,false)}finally{ref.off("value",keepCache);saveTrimPromise=null}})();return saveTrimPromise
}
function renderReliableNetwork(){
 let banner=document.getElementById("actionOfflineBanner")
 if(window.__actionOnline){banner?.remove();return}
 if(!banner){banner=document.createElement("div");banner.id="actionOfflineBanner";banner.setAttribute("role","alert");banner.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px;background:#631b18;color:white;text-align:center;font:16px Georgia";document.body.appendChild(banner)}
 banner.textContent="Connexion perdue — actions suspendues. Aucune action n’est renvoyée automatiquement."
}
document.addEventListener("DOMContentLoaded",()=>{
 db.ref(".info/serverTimeOffset").on("value",s=>{reliableOffset=Number(s.val())||0})
 db.ref(".info/connected").on("value",s=>{const was=window.__actionOnline;window.__actionOnline=s.val()===true;if(!window.__actionOnline){reliableEpoch++;for(const cancel of [...reliablePending])cancel();selected=null;if(typeof _state!=="undefined")_state.tokenDragging=false}renderReliableNetwork();if(typeof refreshCombatActionStates==="function")refreshCombatActionStates();if(window.__actionOnline&&!was){window.__startReliabilityMaintenance?.();if(window.__authRole==="gm"){syncCombatCoordinator();syncExplorationCoordinator();syncCharacterEffects()}}if(window.__actionOnline&&!was&&gameStarted)showNotification("Connexion rétablie. Vérifiez la partie et réessayez l’action souhaitée.")})
 db.ref("securityVersion").on("value",s=>{window.__heroReservationsReady=s.val()===2;refreshHeroAvailability();restoreReservedPlayerSelection()})
 db.ref("heroAssignments").on("value",s=>{window.__heroAssignments=s.val()||{};if(window.__authUid)syncCharacterSubscriptions();if(window.__authRole!=="gm"&&window.__entryConfirmed&&!ownsReservedHero(window.__authPlayerId)){resetLocalCharacterAccess();resetEntrance();entranceMessage("Le MJ a libéré votre héros. Choisissez à nouveau.")}
  refreshHeroAvailability()
  renderHeroManagement();restoreReservedPlayerSelection()
 })
 const startMaintenance=()=>{clearInterval(reliabilityCleanupTimer);if(window.__authRole!=="gm"||!window.__actionOnline)return;transactCombatRoot(root=>{const assigned=migrateHeroAssignments(root),current=assigned||root;return (typeof migratePikaRoot==="function"&&migratePikaRoot(current))||assigned}).catch(e=>console.warn("Attribution à synchroniser",e));cleanupCompletedActionRequests().catch(()=>{});trimSaveHistory().catch(e=>console.warn("Anciennes sauvegardes conservées",e));reliabilityCleanupTimer=setInterval(()=>cleanupCompletedActionRequests().catch(()=>{}),60000)}
 window.__startReliabilityMaintenance=startMaintenance
 const original=updateIntroLogoutBtn;updateIntroLogoutBtn=function(...args){const r=original(...args);refreshHeroAvailability();startMaintenance();return r};startMaintenance()
 for(const type of ["pointerdown","mousedown","click","change","keydown"])document.addEventListener(type,e=>{if(window.__actionOnline||document.body.dataset.entryStage!=="playing"||e.target.closest?.("#musicVolumeSlider,#effectsVolumeSlider,#heroManagementPanel"))return;e.preventDefault();e.stopImmediatePropagation();renderReliableNetwork()},true)
})

async function requestReliableDice(actor,max,stat){try{requireActionConnection();return await submitExplorationAction("dice",actor,{max,...(stat?{stat}:{})})}catch(e){showNotification(e.message)}}
rollDice=function(max){if(!isGM&&!myToken)return showNotification("Choisissez votre héros");return requestReliableDice(isGM?"MJ":myToken.id,max)}
gmRoll=function(max){if(isGM)return requestReliableDice("MJ",max)}
mobRoll=function(max){if(isGM&&combatActive)return requestReliableDice("MOB",max)}
rollStat=function(stat){const sheet=document.getElementById("characterSheet");if(!myToken||sheet?.style.display==="block")return;return requestReliableDice(myToken.id,20,stat)}

// REST transactions never enter the SDK's offline write queue.
async function reliableRootTransaction(update,allowSessionBusy=false){
 if(db.__isolatedTest){requireActionConnection(allowSessionBusy);if(window.__authRole!=="gm")throw Error("Compte MJ nécessaire");return db.ref().transaction(update)}
 requireActionConnection(allowSessionBusy);const epoch=reliableEpoch,user=auth?.currentUser,controller=new AbortController()
 if(!user)throw Error("Compte MJ nécessaire")
 let cancel,timer
 const work=async()=>{
  const token=await user.getIdToken(),url=new URL(db.ref().toString());url.pathname=url.pathname.replace(/\/$/,"")+"/.json"
  const configured=db.app.options.databaseURL?new URL(db.app.options.databaseURL):null;if(configured?.searchParams.has("ns"))url.searchParams.set("ns",configured.searchParams.get("ns"));url.searchParams.set("auth",token)
  for(let attempt=0;attempt<12;attempt++){
   requireActionConnection(allowSessionBusy);if(epoch!==reliableEpoch||controller.signal.aborted||window.__authUid!==user.uid)throw Error("Connexion interrompue, aucune relance automatique")
   const read=await fetch(url.href,{headers:{"X-Firebase-ETag":"true"},signal:controller.signal,cache:"no-store"})
   if(!read.ok)throw Error("Lecture MJ refusée ou non confirmée")
   const current=await read.json(),value=update(current)
   const snapshot=data=>({val:()=>data,child:path=>snapshot(String(path).split('/').filter(Boolean).reduce((v,key)=>v?.[key]??null,data)),exists:()=>data!=null})
   if(value===undefined)return {committed:false,snapshot:snapshot(current)}
   requireActionConnection(allowSessionBusy);if(epoch!==reliableEpoch||controller.signal.aborted||window.__authUid!==user.uid)throw Error("Connexion interrompue, aucune relance automatique")
   const target=new URL(url)
   const write=await fetch(target.href,{method:"PUT",headers:{"Content-Type":"application/json","if-match":read.headers.get("etag")},body:JSON.stringify(value),signal:controller.signal,cache:"no-store"})
   if(write.status===412){await write.body?.cancel();continue}
   if(!write.ok)throw Error("Action MJ non confirmée")
   await write.body?.cancel()
   if(epoch!==reliableEpoch||!window.__actionOnline)throw Error("Confirmation perdue : vérifiez l’état de la partie")
   return {committed:true,snapshot:snapshot(value)}
  }
  throw Error("La partie a beaucoup changé. Vérifiez son état puis réessayez.")
 }
 try{return await Promise.race([work(),new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(Error("Connexion ou confirmation perdue. Vérifiez la partie avant de réessayer."))};reliablePending.add(cancel);timer=setTimeout(cancel,15000)})])}
 finally{clearTimeout(timer);if(cancel)reliablePending.delete(cancel);controller.abort()}
}

function reliableCharacterPatch(id,data){if(!canAccessCharacter(id))return Promise.reject(Error("Fiche privée"));return reliablePut("characters/"+id,data,undefined,false,"PATCH",true)}
