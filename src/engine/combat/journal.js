function recordConfirmedCombatAction(root,request,result){
  root.game ||= {}; root.game.sessionLog ||= {}
  const label=id=>heroDisplayName(root.combat?.[id]?.name||({greg:"Greg",ju:"Pika",elo:"Elo",bibi:"Bibi"})[id]||id||"MJ")
  const effects=Object.entries(root.combat?.hits||{}).filter(([key])=>key.startsWith(request.id+"_")).map(([,h])=>h.detail?String(h.detail):!["dmg","mob","manual","heal"].includes(h.type)?String(h.detail||"Effet appliqué"):label(h.from)+" → "+label(h.to)+" : "+(h.type==="heal"?"+":h.type==="buff"||h.type==="malus"?"effet ":"−")+h.amount+(h.type==="buff"||h.type==="malus"?"":" PV"))
  const text=[label(result.actor||request.actor),(result.mode==="arbitrated"?result.message:result.attack||result.message)||({pass:"Tour passé",skip:"Acteur KO : tour passé",manual:"Ajustement MJ",thuum:"Cri"})[result.mode]||"Action",result.roll!=null?"dé : "+result.roll+(result.luckBonus?" + "+result.luckBonus+" Chance = "+result.rollTotal:"")+(result.controlBonus?" + "+result.controlBonus+" Charme (contrôle)":"")+(result.crit?" (critique)":result.fail?" (échec critique)":""):"",...effects,...(!effects.length&&result.message&&result.attack&&result.mode!=="arbitrated"?[result.message]:[])].filter(Boolean).join(" · ")
  const fullText=[text,result.explanation,result.message&&result.message!==result.attack&&!text.includes(result.message)?result.message:""].filter(Boolean).join(" · ").slice(0,6000)
  root.game.sessionLog["action-"+request.id]={text:fullText,time:request.time,display:new Date(request.time).toTimeString().slice(0,5),status:"applied",combatId:root.combat.id,requestId:request.id}
  if(request.kind==="hero"&&result.attack)combatRecord(root,request,label(result.actor),result.targetName||label(result.target),0,"summary",fullText)
  const entries=Object.entries(root.game.sessionLog).sort((a,b)=>(b[1].time||0)-(a[1].time||0));entries.slice(200).forEach(([key])=>delete root.game.sessionLog[key])
}

function combatRecord(root, request, from, to, amount, type, detail) {
  root.combat.hits ||= {}
  const index = Object.keys(root.combat.hits).filter(key => key.startsWith(request.id + "_")).length
  root.combat.hits[request.id + "_" + index] = { from, to, amount: Math.max(0, combatInt(amount)), type, round: Math.max(1, combatInt(root.combat.turnState?.round, 1)), time: request.time, detail }
  const keys = Object.keys(root.combat.hits).sort((a, b) => root.combat.hits[b].time - root.combat.hits[a].time)
  keys.slice(120).forEach(key => delete root.combat.hits[key])
}

