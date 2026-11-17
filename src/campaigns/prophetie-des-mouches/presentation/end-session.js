function showEndSessionPresentation(time,canClose=false){
  const snd=document.getElementById("endingSound"),bg=document.getElementById("endSessionBg"),logo=document.getElementById("endSessionLogo")
  if(!snd||!bg||!logo)return
  cancelSharedVisuals();stopAllMusic()
  const scope=createPresentationScope("__cancelEndSession",()=>{bg.style.display="none";logo.style.display="none"})
  scope.audio(snd);setManagedAudioBaseVolume(snd,1,"music");snd.currentTime=0;snd.play().catch(()=>{})
  scope.later(()=>{bg.style.display="block";logo.style.display="block"},Math.max(0,3700-(Date.now()-time)))
  if(canClose)scope.listen(document,"keydown",event=>{
    if(event.code!=="Space"&&event.code!=="Escape")return
    event.preventDefault();scope.cancel()
    db.ref("game/endSession").update({active:false,closedAt:Date.now()}).catch(error=>showNotification("Fermeture à synchroniser : "+error.message))
  })
}
function startEndSession(){
  if(!isGM)return
  const time=Date.now()
  addSessionLog("🌙 Fin de session")
  db.ref("game/endSession").set({time,active:true})
  showEndSessionPresentation(time,true)
}

