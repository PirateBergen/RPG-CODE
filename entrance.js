"use strict"
window.__entryChoice=null
window.__entranceEpoch=0
window.__entryConfirmed=false
let entranceBusy=false,entranceLaunch=null,entranceJoinTimer=null,entranceIdentity=null
function entranceMessage(text){const e=document.getElementById("entranceFeedback");if(e)e.textContent=text||""}
function renderEntrance(){
 const gm=window.__authRole==="gm"
 document.body.dataset.entryRole=gm?"gm":"player"
 document.getElementById("lobbyWaiting").style.display=window.__entryConfirmed&&!gm?"block":"none"
 document.getElementById("entranceSignOut").hidden=!(window.__authPlayerId||gm)
 if(!window.__entryConfirmed){
  document.getElementById("introBox").style.setProperty("display","none","important")
  if(window.__entryChoice==="gm"&&gm)confirmEntrance("gm")
  else if(PLAYABLE_HEROES.includes(window.__entryChoice)&&window.__authPlayerId===window.__entryChoice&&!gm)confirmEntrance(window.__entryChoice)
  return
 }
 if(entranceIdentity!==window.__authUid||(!gm&&window.__authPlayerId!==window.__entryChoice))return resetEntrance()
 document.getElementById("introBox").style.setProperty("display",gm?"flex":"none","important")
 if(!gm)queueEntranceJoin()
}
function resetEntrance(){
 window.__entranceEpoch++
 clearTimeout(entranceJoinTimer);entranceJoinTimer=null
 window.__entryConfirmed=false;window.__entryChoice=null;window.__entranceAccountRequested=false;entranceIdentity=null;entranceBusy=false
 gameStarted=false;stopAllMusic();setGameState("MENU");document.body.dataset.entryStage="choice"
 const start=document.getElementById("startScreen");start.classList.remove("fadeOut");start.style.cssText="display:flex;opacity:1;visibility:visible;pointer-events:auto;z-index:999999999"
 document.getElementById("intro").style.display="none";entranceMessage("");renderEntrance()
}
function confirmEntrance(choice){
 if(window.__entryConfirmed)return
 const gm=choice==="gm"
 if(gm?window.__authRole!=="gm":window.__authRole==="gm"||window.__authPlayerId!==choice)return
 window.__entranceAccountRequested=false;window.__entranceEpoch++;window.__entryConfirmed=true;window.__entryChoice=choice;entranceIdentity=window.__authUid
 document.body.dataset.entryStage="lobby";document.body.dataset.entryRole=gm?"gm":"player"
 document.getElementById("startScreen").style.pointerEvents="none"
 closeGMAuthModal();closePlayerAuthModal();entranceMessage("")
 entranceOriginalIntro();renderEntrance()
 if(!gm)queueEntranceJoin()
}
async function chooseEntrance(choice){
 if(entranceBusy||window.__entryConfirmed||window.__sessionBusy)return
 if(choice!=="gm"&&!PLAYABLE_HEROES.includes(choice))return
 entranceBusy=true;window.__entryChoice=choice;entranceMessage("Connexion…")
 try{
  await initFirebaseAnonymousAuth()
  if(choice==="gm"){
   if(window.__authRole==="gm")confirmEntrance("gm");else{entranceMessage("Connectez-vous avec le compte MJ.");showGMAuthModal()}
   return
  }
  if(window.__entranceAccountRequested){entranceMessage("Connectez-vous ou créez le compte de ce héros.");showPlayerAuthModal();return}
  if(window.__authRole==="gm")throw Error("Ce compte est celui du MJ. Déconnectez-vous pour utiliser un compte joueur.")
  const uid=window.__authUid
  if(!uid)throw Error("Connexion indisponible. Réessayez.")
  if(window.__authPlayerId&&window.__authPlayerId!==choice)throw Error("Ce compte est lié à "+entranceLabel(window.__authPlayerId)+". Choisissez ce héros, ou déconnectez-vous pour changer de compte.")
  const result=await db.ref("profiles/"+uid+"/playerId").transaction(current=>current===null||current===choice?choice:undefined,undefined,false)
  if(!result.committed)throw Error("Ce compte est déjà lié à un autre héros.")
  if(window.__authUid!==uid)return
  window.__authPlayerId=choice;syncCharacterSubscriptions();confirmEntrance(choice)
 }catch(e){entranceMessage(e.message||"Connexion impossible")}
 finally{entranceBusy=false}
}
function entranceLabel(id){return id==="ju"?"Yu":id==="greg"?"Greg":id==="elo"?"Elo":"MJ"}
const entranceOriginalClosePlayerAuth=closePlayerAuthModal
closePlayerAuthModal=function(...args){window.__entranceAccountRequested=false;return entranceOriginalClosePlayerAuth(...args)}
const entranceOriginalPlayerAuth=showPlayerAuthModal
showPlayerAuthModal=function(){
 const r=entranceOriginalPlayerAuth(),create=document.getElementById("playerAuthCreate")
 if(create&&!PLAYABLE_HEROES.includes(window.__entryChoice)){create.innerText="Choisir un héros pour créer un compte";create.onclick=()=>{closePlayerAuthModal();window.__entranceAccountRequested=true;entranceMessage("Choisissez le héros de votre nouveau compte.")}}
 return r
}
function entranceAccount(){showPlayerAuthModal()}
function queueEntranceJoin(){
 if(entranceJoinTimer||!window.__entryConfirmed||window.__authRole==="gm"||gameStarted||window.__sessionBusy)return
 if(!entranceLaunch||entranceLaunch.revision!==(persistenceRevision||"initial"))return
 // A returning player can join the session already opened by the MJ.
 if(entranceLaunch.time<(window.__pageLoadTime||0)&&!window.__sharedSceneReady)return
 const launch=entranceLaunch,uid=window.__authUid
 entranceJoinTimer=setTimeout(()=>{
  entranceJoinTimer=null
  if(!window.__entryConfirmed||window.__authRole==="gm"||window.__sessionBusy||gameStarted)return
  if(entranceLaunch?.id!==launch.id||launch.revision!==(persistenceRevision||"initial")||window.__authUid!==uid){queueEntranceJoin();return}
  window.isNewGame=!!launch.introduction
  entranceOriginalStartGame()
 },2200)
}
const entranceOriginalIntro=startIntro
startIntro=function(){if(!window.__entryConfirmed){renderEntrance();return}const r=entranceOriginalIntro();renderEntrance();return r}
const entranceOriginalStartGame=startGame
startGame=async function(){
 if(window.__sessionBusy||gameStarted)return
 if(window.__authRole!=="gm"){queueEntranceJoin();return}
 if(!window.__entryConfirmed)return
 const revision=persistenceRevision||"initial",id=db.ref().push().key,introduction=!!window.isNewGame
 try{
  const result=await transactCombatRoot(root=>{
   if(root?.roles?.[window.__authUid]!=="gm"||root.sessionControl?.phase||(root.sessionControl?.revision||"initial")!==revision)return undefined
   const next=combatClone(root);next.game||={};next.game.lobbyLaunch={id,time:Date.now(),revision,introduction};return next
  })
  if(!result.committed)throw Error("La partie se synchronise. Réessayez.")
  entranceOriginalStartGame()
 }catch(e){showNotification("Lancement impossible : "+e.message)}
}
const entranceOriginalIntroLayer=showIntroLayer
showIntroLayer=function(...args){const r=entranceOriginalIntroLayer(...args);renderEntrance();return r}
const entranceOriginalTavern=showTavern
showTavern=function(...args){document.body.dataset.entryStage="playing";document.getElementById("introBox").style.removeProperty("display");return entranceOriginalTavern(...args)}
const entranceOriginalAuthMenu=updatePlayerAuthMenuState
updatePlayerAuthMenuState=function(...args){const r=entranceOriginalAuthMenu(...args);renderEntrance();return r}
const entranceOriginalLogoutState=updateIntroLogoutBtn
updateIntroLogoutBtn=function(...args){const r=entranceOriginalLogoutState(...args);renderEntrance();return r}
document.addEventListener("DOMContentLoaded",()=>{
 document.getElementById("startScreen").removeEventListener("pointerdown",safeStartIntro)
 db.ref("game/lobbyLaunch").on("value",s=>{entranceLaunch=s.val();queueEntranceJoin()})
 db.ref("sessionControl").on("value",()=>queueEntranceJoin())
 db.ref("game/sceneReady").on("value",()=>queueEntranceJoin())
 renderEntrance()
})
