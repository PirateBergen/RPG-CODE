"use strict"
let gmDiagnosticsSubscriptions=[],gmDiagnosticsTimer=null,gmDiagnosticsEpoch=0,gmDiagnosticsData={},gmDiagnosticsIssue=null
function gmDiagnosticsAllowed(){return window.__authRole==="gm"&&document.body.dataset.entryStage==="playing"}
function noteGMDiagnosticIssue(message){gmDiagnosticsIssue={time:Date.now(),message};renderGMDiagnostics()}
function syncGMDiagnosticsButton(){
 const button=document.getElementById("gmDiagnosticsBtn");if(!button)return
 button.hidden=!gmDiagnosticsAllowed()
 if(button.hidden)closeGMDiagnostics(false)
}
function closeGMDiagnostics(restoreFocus=true){
 gmDiagnosticsEpoch++;for(const [ref,callback]of gmDiagnosticsSubscriptions)ref.off("value",callback)
 gmDiagnosticsSubscriptions=[];clearInterval(gmDiagnosticsTimer);gmDiagnosticsTimer=null;gmDiagnosticsData={}
 const panel=document.getElementById("gmDiagnosticsPanel");panel?.remove()
 const button=document.getElementById("gmDiagnosticsBtn");button?.setAttribute("aria-expanded","false")
 if(panel)window.GameWindows?.closed(panel,{restoreFocus});if(panel&&restoreFocus&&!window.GameWindows&&!button?.hidden)button?.focus()
}
function toggleGMDiagnostics(){
 if(document.getElementById("gmDiagnosticsPanel")){closeGMDiagnostics();return}
 if(!gmDiagnosticsAllowed())return
 const epoch=++gmDiagnosticsEpoch,panel=document.createElement("section");panel.id="gmDiagnosticsPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-labelledby","gmDiagnosticsTitle")
 const header=document.createElement("div");header.className="gmDiagnosticsHeader"
 const title=document.createElement("h2");title.id="gmDiagnosticsTitle";title.textContent="État de la partie"
 const close=document.createElement("button");close.type="button";close.textContent="Fermer ✕";close.onclick=()=>closeGMDiagnostics();header.append(title,close)
 const content=document.createElement("div");content.id="gmDiagnosticsContent";panel.append(header,content);document.body.appendChild(panel)
 window.GameWindows?.register(panel,closeGMDiagnostics,{returnFocus:document.getElementById("gmDiagnosticsBtn")})
 document.getElementById("gmDiagnosticsBtn")?.setAttribute("aria-expanded","true")
 const listen=(key,path,requests=false)=>{
  let ref=db.ref(path);if(requests)ref=ref.limitToLast(60)
  const callback=s=>{if(epoch!==gmDiagnosticsEpoch)return;gmDiagnosticsData[key]=s.val();renderGMDiagnostics()}
  gmDiagnosticsSubscriptions.push([ref,callback]);ref.on("value",callback,()=>{if(epoch!==gmDiagnosticsEpoch)return;gmDiagnosticsData.readError=true;renderGMDiagnostics()})
 }
 listen("online",".info/connected");listen("clients","sessionClients");listen("profiles","profiles");listen("assignments","heroAssignments");listen("roles","roles")
 listen("savedAt","saves/current/_savedAt");listen("saveName","saves/current/_saveName");listen("control","sessionControl")
 listen("pendingCombat","combat/pendingResolution");listen("pendingScene","game/pendingGMAction")
 for(const branch of ["combatRequests","explorationRequests","characterRequests"])listen(branch,branch,true)
 gmDiagnosticsTimer=setInterval(renderGMDiagnostics,1000);renderGMDiagnostics();close.focus()
}
function renderGMDiagnostics(){
 const content=document.getElementById("gmDiagnosticsContent");if(!content)return
 if(!gmDiagnosticsAllowed()){closeGMDiagnostics(false);return}
 const data=gmDiagnosticsData,online=data.online===true,now=typeof reliableActionNow==="function"?reliableActionNow():Date.now()
 content.replaceChildren()
 const line=(text,style="")=>{const p=document.createElement("p");p.textContent=text;if(style)p.className=style;content.appendChild(p);return p}
 const heading=text=>{const h=document.createElement("h3");h.textContent=text;content.appendChild(h)}
 const time=value=>Number.isFinite(value)&&value>0?new Date(value).toLocaleString("fr-FR"):null
 line(window.__isolatedTestMode?"Essai local — diagnostic et sauvegardes séparés de la campagne.":"Campagne", "gmDiagnosticsMuted")
 line(data.online===undefined?"Lecture de la connexion…":online?"Cet écran est connecté.":"Cet écran est hors ligne : les états distants ci-dessous peuvent dater.",online?"":"gmDiagnosticsWarning")
 if(data.readError)line("Diagnostic incomplet : une lecture a été refusée ou interrompue. Fermez puis rouvrez le panneau.","gmDiagnosticsWarning")
 heading("Connexions signalées")
 const names={greg:"Greg",ju:"Pika",elo:"Elo"}
 if(data.clients===undefined||data.assignments===undefined)line("Lecture des présences…","gmDiagnosticsMuted")
 else{
  for(const [hero,name]of Object.entries(names)){
   const uid=data.assignments?.[hero]?.uid,tabs=uid?Object.keys(data.clients?.[uid]||{}):[]
   line(name+" — "+(!uid?"non attribué":tabs.length?(online?"connecté":"présence précédemment signalée")+" · "+tabs.length+" écran(s)":"aucune présence signalée"))
  }
  line("Bibi est contrôlée par Greg ; elle n’a pas de connexion séparée.","gmDiagnosticsMuted")
 }
 heading("Versions des écrans")
 line("Cet écran MJ : "+String(window.GAME_V||"version non communiquée"),"gmDiagnosticsMuted")
 if(data.clients!==undefined){
  let count=0
  for(const [uid,tabs]of Object.entries(data.clients||{}))for(const client of Object.keys(tabs||{})){
   const hero=Object.keys(names).find(id=>data.assignments?.[id]?.uid===uid),label=hero?names[hero]:data.roles?.[uid]==="gm"?"MJ":"Compte sans héros"
   const raw=data.profiles?.[uid]?.clientVersions?.[client],version=typeof raw==="string"&&/^[\w.-]{1,40}$/.test(raw)?raw:null
   line(label+" · écran "+(++count)+" : "+(version||"version non communiquée")+(version&&window.GAME_V&&version!==window.GAME_V?" — recharge conseillée":""),version&&window.GAME_V&&version!==window.GAME_V?"gmDiagnosticsWarning":"gmDiagnosticsMuted")
  }
  if(!count)line("Aucun écran signalé pour le moment.","gmDiagnosticsMuted")
 }
 line("Une présence signalée ne confirme pas que le joueur a vu une animation.","gmDiagnosticsMuted")
 heading("Sauvegarde")
 const saved=time(data.savedAt)
 line(data.savedAt===undefined?"Lecture de la dernière sauvegarde…":saved?(online?"Dernière sauvegarde enregistrée : ":"Dernière sauvegarde connue : ")+saved+" — "+String(data.saveName||"Partie").slice(0,120):"Aucune sauvegarde courante signalée.")
 heading("Demandes et synchronisation")
 const phases={saving:"Sauvegarde en cours",loading:"Chargement en cours",resetting:"Nouvelle partie en préparation"}
 line(data.control?.phase?(phases[data.control.phase]||"Synchronisation en cours"):"Aucune opération de sauvegarde ou de chargement signalée.")
 if(data.pendingCombat||data.pendingScene)line("Une décision du MJ est en attente. Utilisez le bouton de décision pour la traiter.","gmDiagnosticsWarning")
 const queued=[];let loaded=true
 for(const branch of ["combatRequests","explorationRequests","characterRequests"]){if(data[branch]===undefined)loaded=false;for(const r of Object.values(data[branch]||{}))if(r?.status==="queued"&&Number.isFinite(r.expiresAt)&&r.expiresAt>now&&r.sessionRevision===(data.control?.revision||"initial"))queued.push(r)}
 line(!loaded?"Lecture des demandes…":queued.length?queued.length+" demande(s) récente(s) en attente de confirmation.":"Aucune demande récente en attente.")
 if(queued.some(r=>now-(r.time||now)>10000))line("Une demande tarde à être confirmée : vérifiez le journal avant de réessayer.","gmDiagnosticsWarning")
 if(gmDiagnosticsIssue){heading("Dernier incident sur cet écran");line(gmDiagnosticsIssue.message+" ("+time(gmDiagnosticsIssue.time)+")","gmDiagnosticsWarning")}
 line("Ce panneau observe la partie ; il ne relance aucune action.","gmDiagnosticsMuted")
}
document.addEventListener("DOMContentLoaded",()=>{
 new MutationObserver(syncGMDiagnosticsButton).observe(document.body,{attributes:true,attributeFilter:["data-entry-stage","data-entry-role"]})
 syncGMDiagnosticsButton()
})
