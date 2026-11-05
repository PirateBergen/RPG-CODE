"use strict"
function ownsCharacterRequest(root,request){return COMBAT_HEROES.includes(request.actor)&&(root.roles?.[request.uid]==="gm"||root.profiles?.[request.uid]?.playerId===combatOwner(request.actor))}
function reduceCharacterRequest(current,id,seed){
 const queued=current?.characterRequests?.[id];if(!queued||queued.status!=="queued")return undefined
 const root=combatClone(current),r=root.characterRequests[id]
 try{
  if(root.sessionControl?.phase)throw new Error("La partie est en cours de synchronisation")
  if(!Number.isFinite(r.time)||Math.abs(Date.now()-r.time)>120000)throw new Error("Demande expirée")
  if(!ownsCharacterRequest(root,r))throw new Error("Ce personnage ne vous appartient pas")
  const c=root.characters?.[r.actor];if(!c)throw new Error("Personnage introuvable")
  root.game ||= {}
  if(r.kind==="power"){
   if(combatInt(c.corruption)<10)throw new Error("Le pouvoir nécessite dix points")
   c.corruption=0;root.game.powerEvents ||= {};root.game.powerEvents[id]={id,player:r.actor,time:Date.now()}
   const old=Object.keys(root.game.powerEvents);old.slice(0,Math.max(0,old.length-80)).forEach(k=>delete root.game.powerEvents[k])
  }else if(r.kind==="curse-spin"){
   const w=root.curse?.wheel
   if(!w||w.id!==r.payload?.wheelId||w.player!==r.actor||!["intro","wheel"].includes(w.state))throw new Error("Cette roue n’est plus disponible")
   w.state="spinning";w.startedAt=Date.now();w.result=combatRandom(seed)(curseWheelChoices.length)-1
  }else throw new Error("Demande inconnue")
  r.status="done";r.result={kind:r.kind,actor:r.actor};return root
 }catch(error){const clean=combatClone(current);clean.characterRequests[id]={...queued,status:"failed",error:error.message};return clean}
}
function advanceCharacterState(current){
 if(!current||current.sessionControl?.phase)return undefined
 const root=combatClone(current);root.curse ||= {};let changed=false,w=root.curse.wheel
 if(w?.player==="bibi"){delete root.curse.wheel;w=null;changed=true}
 if(w?.state==="result"&&!w.applied){
  const next=resolveCharacterCurse(root.characters?.[w.player],w.player,String(w.id||w.time),w.result)
  if(next){next.curse=0;root.characters[w.player]=next}w.applied=true;w.resultAt=Date.now();changed=true
 }
 if(w?.state==="spinning"&&Date.now()>=w.startedAt+4500){
  const next=resolveCharacterCurse(root.characters?.[w.player],w.player,w.id,w.result)
  if(next){next.curse=0;root.characters[w.player]=next}w.state="result";w.applied=true;w.resultAt=Date.now();changed=true
 }
 if(w?.state==="result"&&w.applied&&Date.now()>=(w.resultAt||w.time||0)+5000){delete root.curse.wheel;w=null;changed=true}
 if(!w){const player=COMBAT_HEROES.find(id=>combatInt(root.characters?.[id]?.curse)>=8);if(player){const id="curse-"+player+"-"+Date.now();root.curse.wheel={id,player,state:"wheel",time:Date.now()};changed=true}}
 return changed?root:undefined
}
