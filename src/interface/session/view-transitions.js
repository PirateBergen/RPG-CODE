"use strict"
window.__sharedSceneReady=null
let sceneReadyWrite=null
function publishSceneReady(){
 if(!isGM||window.__authRole!=="gm"||window.__sessionBusy||window.__sharedSceneReady)return
 if(sceneReadyWrite)return sceneReadyWrite
 sceneReadyWrite=db.ref("game/sceneReady").set({time:Date.now()}).catch(error=>showNotification("Ouverture à synchroniser : "+error.message)).finally(()=>{sceneReadyWrite=null})
 return sceneReadyWrite
}
function finishOpeningPresentation(){
 if(typeof window.__cancelOpeningCinematic==="function")window.__cancelOpeningCinematic()
 document.getElementById("openingCinematic")?.remove()
 document.getElementById("gmOpenSceneBtn")?.remove()
 const dialogue=document.getElementById("dialogueBox");if(dialogue)dialogue.style.display="none"
 window.isNewGame=false;window.__introClickLockUntil=0
}
function prepareGMScene(){
 if(!gameStarted)return false
 if(!isGM||window.__authRole!=="gm")return
 if(window.__sessionBusy)return false
 if(gameState==="GAME"||gameState==="COMBAT")return
 gameStarted=true;stopMenuSparks();finishOpeningPresentation();showTavern();publishSceneReady()
}
function showGMOpeningExit(){
 if(!isGM||window.__authRole!=="gm"||document.getElementById("gmOpenSceneBtn"))return
 const button=document.createElement("button");button.id="gmOpenSceneBtn";button.textContent="Passer l’introduction et ouvrir la partie"
 button.style.cssText="position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:2147483646;padding:12px 22px;background:#24180b;color:#f2d28b;border:1px solid #c69b42;border-radius:8px;font:16px Georgia,serif;cursor:pointer"
 button.onclick=()=>prepareGMScene();document.body.appendChild(button)
}
const sceneOriginalStart=startGame
startGame=function(){if(window.__sharedSceneReady)window.isNewGame=false;return sceneOriginalStart()}
const sceneOriginalOpening=playOpeningCinematic
playOpeningCinematic=function(callback){
 window.__openingSequenceActive=true
 const result=sceneOriginalOpening(()=>{if(gameState==="INTRO"&&!window.__sharedSceneReady&&callback)callback()})
 showGMOpeningExit();return result
}
const sceneOriginalDialogue=startDialogue
startDialogue=function(){if(window.__sharedSceneReady)return showTavern();const result=sceneOriginalDialogue();showGMOpeningExit();return result}
const sceneOriginalTavern=showTavern
showTavern=function(){const opening=window.__openingSequenceActive;window.__openingSequenceActive=false;finishOpeningPresentation();const result=sceneOriginalTavern();if(opening&&isGM)publishSceneReady();return result}
const sceneOriginalChangeMap=changeMap
changeMap=function(...args){if(prepareGMScene()===false)return;return sceneOriginalChangeMap(...args)}
const sceneOriginalOpenPNJ=openPNJ
openPNJ=function(...args){if(prepareGMScene()===false)return;return sceneOriginalOpenPNJ(...args)}
document.addEventListener("DOMContentLoaded",()=>{
 db.ref("game/sceneReady").on("value",snap=>{
  window.__sharedSceneReady=snap.val()||null
  if(window.__sharedSceneReady&&gameStarted&&!window.__sessionBusy&&gameState!=="GAME"&&gameState!=="COMBAT"){finishOpeningPresentation();showTavern()}
 })
 for(const type of ["pointerdown","mousedown","click"])document.addEventListener(type,event=>{
  if(event.target?.closest?.("#gmBar,.gmSection,#playerPreviewBtn"))prepareGMScene()
 },true)
})
