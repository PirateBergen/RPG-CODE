"use strict"


function isJormungandr(mob){return mob?.name==="jormungand"}
function isForchurMap(map){return String(map||"").toLowerCase()==="bateau.jpg"}
function combatHasJormungandr(root){return COMBAT_MOBS.some(slot=>isJormungandr(root?.combat?.[slot]))}
function combatHasWorldBoss(root){return COMBAT_MOBS.some(slot=>{const mob=root?.combat?.[slot];return mob&&(mob.balanceClass==="world"||WORLD_BOSS_NAMES.includes(mob.name))})}
// Shared eligibility for the authoritative reducer and the MJ controls.
function worldBossRetreatState(root){
  const combat=root?.combat,worldBoss=combatHasWorldBoss(root),round=combat?.turnState?.round||1
  const blockedUntilRound=combat?.retreatBlockedUntilRound||0,blocked=round<blockedUntilRound
  let reason=""
  if(!worldBoss||combat?.phase!=="active"||combat.turnState?.phase!=="active")reason="La fuite nécessite un combat world boss avec initiatives terminées"
  else if(combat.pendingRetreat)reason="Une tentative attend déjà son dé"
  else if(blocked)reason="Fuite indisponible jusqu’au round suivant"
  return {worldBoss,round,blocked,blockedUntilRound,allowed:!reason,reason}
}
function combatExitSnapshot(root,type,request={}){
  const c=root.combat,state=root.game?.combatState||{},origin=state.returnMap||root.game?.map||"taverne.jpg"
  const antrePassage=type==="defeat"&&combatHasWorldBoss(root)&&!root.game?.antreAfterlife?.used
  const map=antrePassage?"antre.jpg":type==="victory"&&c?.mob?.name==="balraug"?"prairie.jpg":type==="victory"&&c?.mob?.name==="kraken"?"niflheim.jpg":origin
  const tokens=combatClone(state.returnTokens||root.tokens||{})
  if(tokens.bibi&&root.tokens?.bibi)tokens.bibi.followGreg=root.tokens.bibi.followGreg!==false
  if(antrePassage){for(const [i,id]of COMBAT_CHARACTERS.entries())tokens[id]={...tokens[id],x:id==="bibi"?640:640+i*120,y:id==="bibi"?630:520};}
  const result={...(antrePassage?{antrePassage:true}:{}),type,combatId:c.id,time:Date.now(),returnMap:map,returnTokens:tokens,returnAudio:map===origin?(state.returnAudio||(root.game.mapAudio&&(!root.game.mapAudio.map||root.game.mapAudio.map===origin)?root.game.mapAudio:null)):null,lootBonus:!!COMBAT_MOBS.some(slot=>c?.[slot]?.victoryLootBonus?.active)}
  if(c.lastAction)result.finalAction=combatClone(c.lastAction)
  return result
}
function completeAntreDeparture(root){
 const state=root.game?.antreAfterlife
 if(!state?.used||!state.combatId||!["active","complete"].includes(state.phase)||(state.phase==="active"&&root.game.map==="antre.jpg"))return false
 let changed=false
 if(state.phase==="active"){state.phase="complete";state.exitedAt=Date.now();changed=true}
 if(!root.game.quantumImmortality){root.game.quantumImmortality={id:"guardian-"+state.combatId,source:"Gardienne",grantedAt:Date.now(),players:Object.fromEntries(COMBAT_CHARACTERS.filter(id=>root.characters?.[id]).map(id=>[id,true]))};changed=true}
 return changed
}
function restoreQuantumCombatants(root,outcome){
 const revived=[]
 for(const id of COMBAT_CHARACTERS){const c=root.characters?.[id];if(c&&c.hp<=0&&root.game?.quantumImmortality?.players?.[id]===true){c.hp=getCharacterMaxHp(id,c);revived.push(id)}}
 if(revived.length)outcome.quantumRevived=revived
 return revived
}

function sealCombatOutcome(root,type,request={}){
  root.game ||= {}
  if(root.game.combatOutcome?.combatId===root.combat.id&&root.combat.phase==="finished"&&root.game.combatOutcome.returnMap&&root.game.combatOutcome.returnTokens)return root.game.combatOutcome
  if(type==="victory"&&!(request.manual&&root.roles?.[request.uid]==="gm")&&COMBAT_MOBS.some(slot=>isJormungandr(root.combat?.[slot])&&!root.combat[slot].defeatedByThor))throw Error("Seule l’invocation de Thor peut vaincre Jörmungandr.")
  root.game.combatOutcome=combatExitSnapshot(root,type,request)
  if(root.game.combatOutcome.antrePassage)root.game.antreAfterlife={used:true,phase:"pending",combatId:root.combat.id,time:Date.now()}
  const now=new Date();root.game.sessionLog ||= {}
  root.game.sessionLog["combat-"+root.combat.id]={text:type==="victory"?"🏆 Victoire !":type==="retreat"?"⛵ Le groupe prend la fuite":"💀 Défaite",time:Date.now(),display:now.getHours().toString().padStart(2,"0")+":"+now.getMinutes().toString().padStart(2,"0")}
  delete root.combat.pendingRetreat
  root.combat.phase="finished";root.combat.turnState ||= {};root.combat.turnState.phase="finished"
  if(type==="victory"&&COMBAT_MOBS.some(slot=>root.combat[slot]?.name==="balraug")&&!root.game.balrogSword)root.game.balrogSword={status:"pending",combatId:root.combat.id,map:root.game.combatOutcome.returnMap}
  if(type==="victory"){
    root.game.defeatedMobs ||= {}
    COMBAT_MOBS.forEach(slot=>{if(root.combat[slot])root.game.defeatedMobs[root.combat[slot].name]=true})
  }
  return root.game.combatOutcome
}


