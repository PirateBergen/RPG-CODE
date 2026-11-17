async function giveXP(amount) {
 if(!isGM||window.__authRole!=="gm")return false
 const gain=Number(amount);if(!Number.isSafeInteger(gain)||gain<=0||gain>999999)return false
 if(window.__xpGrantPending)return false
 if(window.__lastXPGrant?.gain===gain&&Date.now()-window.__lastXPGrant.time<700)return false
 window.__xpGrantPending=true
 try{requireActionConnection();showNotification("Attribution d’XP en cours…");const revision=persistenceRevision||"initial"
  const result=await reliableRootTransaction(current=>{if(!current?.characters||current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision)throw Error("La partie a changé ou se synchronise");const root=cloneSession(current);PLAYABLE_HEROES.forEach(id=>{if(root.characters[id])root.characters[id].xp=Math.min(999999,(Number(root.characters[id].xp)||0)+gain)});root.characters=progressCharacters(root.characters);return root})
  if(!result.committed)throw Error("Attribution non confirmée")
  window.__lastXPGrant={gain,time:Date.now()};showXPMessage(gain);addMJLog("⭐ MJ donne "+gain+" XP au groupe");addSessionLog("⭐ +"+gain+" XP donné au groupe");return true
 }catch(error){showNotification("XP non confirmée : "+error.message+". Vérifiez l’XP du groupe avant de réessayer.");return false}finally{window.__xpGrantPending=false}
}


/* ========================= */
/* SAUVEGARDE                */
/* ========================= */

// Sauvegarde, restauration et nouvelle partie : persistence.js

