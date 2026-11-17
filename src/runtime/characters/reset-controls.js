async function resetAllPlayerStats(){
 if(!isGM||window.__authRole!=="gm"||window.__statsResetPending)return false
 window.__statsResetPending=true
 try{requireActionConnection();if(!confirm("Réinitialiser les stats des joueurs au niveau 1 sans changer la map ni les positions ?"))return false
  const revision=persistenceRevision||"initial",characters=initialSession().characters
  const result=await reliableRootTransaction(current=>{if(!current||current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision)throw Error("La partie a changé ou se synchronise");return {...current,characters:cloneSession(characters)}})
  if(!result.committed)throw Error("Réinitialisation non confirmée")
  showNotification("Stats joueurs réinitialisées");if(typeof addMJLog==="function")addMJLog("RESET — stats joueurs remises au niveau 1");return true
 }catch(error){showNotification("Réinitialisation non confirmée : "+error.message);return false}finally{window.__statsResetPending=false}
}

/* ========================= */
/* JOURNAL DE SESSION        */
/* ========================= */

