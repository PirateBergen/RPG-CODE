function reduceCombatRequest(current,id,seed){
 if(current?.combat?.pendingResolution||current?.combat?.interventionArmed){current=combatClone(current);delete current.combat.pendingResolution;delete current.combat.interventionArmed}
 const q=current?.combatRequests?.[id];if(!q||q.status!=="queued")return null
 if(["free","armIntervention","resolveIntervention","refreshIntervention","dismissIntervention"].includes(q.kind)){
  const root=combatClone(current);root.combatRequests[id]={...q,status:"failed",error:"Cette ancienne commande a été supprimée. Utilisez les états et PV du menu Intervenir."};return root
 }
 return reduceCombatRequestNow(current,id,seed)
}

