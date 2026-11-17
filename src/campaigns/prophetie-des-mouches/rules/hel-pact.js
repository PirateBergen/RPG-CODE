function helAdjustedMaxHP(id,data,base){
 const marked=Object.prototype.hasOwnProperty.call(data||{},"helMark")?data.helMark===true:!!window.__helMarks?.[id]
 return Math.max(1,marked?Math.floor(base*.85):base)
}
function applyHelPactCommand(current,uid,revision,command,id,time=Date.now()){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision)throw Error("La partie a changé")
 if(!current.characters||!current.game)throw Error("Aucune partie active")
 if(current.game.helCommands?.[id])return current
 const root=JSON.parse(JSON.stringify(current)),g=root.game
 let text=""
 if(command.kind==="revoke"){
  const ally=ALLY_PNJS.find(p=>p.id===command.allyId);if(!ally)throw Error("Allié inconnu")
  g.allyBreaks||={};g.allyBreaks[ally.id]={time};if(g.allyDiscoveries)delete g.allyDiscoveries[ally.id]
  if(ally.actions.some(a=>a.id===g.playerAllyAccess?.actionId))delete g.playerAllyAccess
  for(const [key,token]of Object.entries(g.summonedAllies||{}))if(token.pnjId===ally.id)delete g.summonedAllies[key]
  text="Alliance rompue : "+ally.name+". Ses autorisations restantes sont annulées."
 }else if(["mark","lift"].includes(command.kind)){
  const targets=[...new Set(command.targets||[])];if(!targets.length||targets.some(p=>!["greg","ju","elo","bibi"].includes(p)||!root.characters[p]))throw Error("Choisissez les personnages concernés")
  g.helMarks||={};let changed=false
  for(const target of targets){const c=root.characters[target],marked=!!g.helMarks[target]||c.helMark===true
   if(command.kind==="mark"&&!marked){c.helMark=true;g.helMarks[target]={time};c.hp=Math.min(Math.max(0,Number(c.hp)||0),getCharacterMaxHp(target,c));changed=true}
   if(command.kind==="lift"&&marked){c.helMark=false;delete g.helMarks[target];changed=true}
  }
  if(!changed)throw Error(command.kind==="mark"?"Ces personnages portent déjà la marque":"Ces personnages ne portent pas la marque")
  text=(command.kind==="mark"?"Courroux de Hel — Marque des parjures : PV maximum −15 %. ":"Courroux de Hel levé, sans soin gratuit. ")+targets.map(heroDisplayName).join(", ")
  if(command.kind==="mark")g.helWrathEvent={id,time,targets}
 }else throw Error("Commande inconnue")
 g.helCommands||={};g.helCommands[id]={time};Object.keys(g.helCommands).slice(0,-80).forEach(k=>delete g.helCommands[k])
 g.sessionLog||={};g.sessionLog[id]={text,time,display:new Date(time).toTimeString().slice(0,5),status:"applied"}
 return root
}
function helPreventKO(root,request,id,before,next){
 const ward=root.combat?.helReprieves?.[id],round=root.combat?.turnState?.round||1
 if(before>0&&next<=0&&ward&&ward.expiresAfterRound>=round){delete root.combat.helReprieves[id];combatRecord(root,request,"HEL",heroDisplayName(id),0,"reprieve","Sursis de Hel : "+heroDisplayName(id)+" reste à 1 PV. Le sursis est consommé.");return 1}
 return next
}
