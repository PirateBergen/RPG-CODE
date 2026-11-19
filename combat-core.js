/* Generated from src/source-map.json by tools/build-source.cjs. Edit the source files, then rebuild. */
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
  for(const [key,token]of Object.entries(root.game.summonedAllies||{}))if(token.combatId===root.combat.id)delete root.game.summonedAllies[key]
  if(root.game.playerAllyAccess?.scope==="combat-free"&&root.game.playerAllyAccess.combatId===root.combat.id)delete root.game.playerAllyAccess
  delete root.combat.pendingRetreat
  root.combat.phase="finished";root.combat.turnState ||= {};root.combat.turnState.phase="finished"
  if(type==="victory"&&COMBAT_MOBS.some(slot=>root.combat[slot]?.name==="balraug")&&!root.game.balrogSword)root.game.balrogSword={status:"pending",combatId:root.combat.id,map:root.game.combatOutcome.returnMap}
  if(type==="victory"){
    root.game.defeatedMobs ||= {}
    COMBAT_MOBS.forEach(slot=>{if(root.combat[slot])root.game.defeatedMobs[root.combat[slot].name]=true})
  }
  return root.game.combatOutcome
}


const COMBAT_HEROES = ["greg", "ju", "elo"]
const COMBAT_MOBS = ["mob", "mob2", "mob3"]
const COMBAT_CHARACTERS = [...COMBAT_HEROES, "bibi"]
function recordHeroCritical(root,actor,crit,fail){
 if(!COMBAT_HEROES.includes(actor)||!root.characters?.[actor])return
 const c=root.characters[actor]
 if(crit)c.corruption=Math.min(10,combatInt(c.corruption)+1)
 if(fail)c.curse=Math.min(8,combatInt(c.curse)+1)
}
const combatClone = value => JSON.parse(JSON.stringify(value))
const combatInt = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback
const combatOwner = id => id === "bibi" ? "greg" : id

function combatRandom(seed) {
  let state = seed >>> 0
  return max => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return 1 + Math.floor(state / 4294967296 * max) }
}

function livingMobs(combat) { return COMBAT_MOBS.filter(slot => combat?.[slot] && combatInt(combat[slot].hp) > 0) }
function livingHeroes(root) { return COMBAT_CHARACTERS.filter(id => combatInt(root.characters?.[id]?.hp) > 0) }
function combatActorAlive(root, id) {
  if (id === "greg") return combatInt(root.characters?.greg?.hp) > 0 || combatInt(root.characters?.bibi?.hp) > 0
  return COMBAT_MOBS.includes(id) ? combatInt(root.combat?.[id]?.hp) > 0 : combatInt(root.characters?.[id]?.hp) > 0
}

function combatParticipants(root) {
  const list = COMBAT_HEROES.filter(id => combatActorAlive(root, id)).map(id => ({ id, type: "player", label: id === "greg" ? "Greg / Bibi" : id === "ju" ? "Pika" : "Elo", image: id === "ju" ? "pika-token.svg" : id + ".png" }))
  livingMobs(root.combat).forEach(slot => list.push({ id: slot, type: "mob", label: heroDisplayName(root.combat[slot].name).toUpperCase(), image: root.combat[slot].name + ".png" }))
  return list
}

function normalizeCombatTurns(root) {
  const state = root.combat?.turnState
  if (!state) return
  const oldActor = state.currentActorId === "bibi" ? "greg" : state.currentActorId
  ;["participants", "order"].forEach(key => {
    const seen = new Set()
    state[key] = (state[key] || []).filter(entry => entry.id !== "bibi" && !seen.has(entry.id) && (seen.add(entry.id), true))
    state[key].forEach(entry => { if (entry.id === "greg") entry.label = "Greg / Bibi" })
  })
  if (state.rolls) delete state.rolls.bibi
  if (state.phase === "active") {
    const index = state.order.findIndex(entry => entry.id === oldActor)
    state.currentIndex = Math.max(0, index)
    state.currentActorId = state.order[state.currentIndex]?.id || ""
  }
  state.sequence = combatInt(state.sequence)
}

function finalizedInitiative(state) {
  if (!state || state.phase !== "rolling") return null
  const participants = (state.participants || []).filter(p => p.id !== "bibi")
  if (!participants.length || participants.some(p => !Number.isInteger(state.rolls?.[p.id]) || state.rolls[p.id] < 1 || state.rolls[p.id] > 12)) return null
  const order = participants.map((p, index) => ({ ...p, index, roll: state.rolls[p.id],...(state.initiativeBonuses?{bonus:state.initiativeBonuses[p.id]||0,total:state.rolls[p.id]+(state.initiativeBonuses[p.id]||0)}:{}) })).sort((a, b) => (b.total??b.roll) - (a.total??a.roll) || (a.type === b.type ? a.index - b.index : a.type === "player" ? -1 : 1))
  return { ...state, phase: "active", order, currentIndex: 0, currentActorId: order[0].id, round: 1, sequence: 0 }
}

function recordConfirmedCombatAction(root,request,result){
  root.game ||= {}; root.game.sessionLog ||= {}
  const label=id=>heroDisplayName(root.combat?.[id]?.name||({greg:"Greg",ju:"Pika",elo:"Elo",bibi:"Bibi"})[id]||id||"MJ")
  const source=result.pnjId?combatAllyDefinition(result.pnjId)?.name||label(request.actor):label(result.actor||request.actor)
  const effects=Object.entries(root.combat?.hits||{}).filter(([key])=>key.startsWith(request.id+"_")).map(([,h])=>h.detail?String(h.detail):!["dmg","mob","manual","heal"].includes(h.type)?String(h.detail||"Effet appliqué"):label(h.from)+" → "+label(h.to)+" : "+(h.type==="heal"?"+":h.type==="buff"||h.type==="malus"?"effet ":"−")+h.amount+(h.type==="buff"||h.type==="malus"?"":" PV"))
  const text=[source,(result.mode==="arbitrated"?result.message:result.attack||result.message)||({pass:"Tour passé",skip:"Acteur KO : tour passé",manual:"Ajustement MJ",thuum:"Cri"})[result.mode]||"Action",result.roll!=null?"D"+(result.dice||"?")+" · dé : "+result.roll+(result.luckBonus?" + "+result.luckBonus+" Chance = "+result.rollTotal:"")+(result.controlBonus?" + "+result.controlBonus+" Charme (contrôle)":"")+(result.crit?" (critique)":result.fail?" (échec critique)":""):"",...effects,...(!effects.length&&result.message&&result.attack&&result.mode!=="arbitrated"?[result.message]:[])].filter(Boolean).join(" · ")
  const fullText=[text,result.explanation,result.message&&result.message!==result.attack&&!text.includes(result.message)?result.message:""].filter(Boolean).join(" · ").slice(0,6000)
  root.game.sessionLog["action-"+request.id]={text:fullText,time:request.time,display:new Date(request.time).toTimeString().slice(0,5),status:"applied",combatId:root.combat.id,requestId:request.id}
  if(["hero","ally","enemy"].includes(request.kind)&&(result.attack||result.message))combatRecord(root,request,source,result.targetName||(result.targets?.length>1?"Groupe":result.targets?.length?label(result.targets[0]):result.target?label(result.target):"Combat"),0,"summary",fullText)
  const entries=Object.entries(root.game.sessionLog).sort((a,b)=>(b[1].time||0)-(a[1].time||0));entries.slice(200).forEach(([key])=>delete root.game.sessionLog[key])
}

function combatRecord(root, request, from, to, amount, type, detail) {
  root.combat.hits ||= {}
  const index = Object.keys(root.combat.hits).filter(key => key.startsWith(request.id + "_")).length
  root.combat.hits[request.id + "_" + index] = { from, to, amount: Math.max(0, combatInt(amount)), type, round: Math.max(1, combatInt(root.combat.turnState?.round, 1)), time: request.time, detail }
  const keys = Object.keys(root.combat.hits).sort((a, b) => root.combat.hits[b].time - root.combat.hits[a].time)
  keys.slice(120).forEach(key => delete root.combat.hits[key])
}

function combatCharacter(root, id) {
  const raw = root.characters?.[id]
  if (!raw) throw new Error("Personnage introuvable")
  const data = getEffectiveCharacterData(id, raw, root.game?.balrogSword)
  const buff=root.combat.heroBuffs?.[id];if(root.combat.balanceVersion===3&&buff?.turns>0)data[buff.stat]=(Number(data[buff.stat])||0)+buff.amount
  const debuff = root.combat.heroDebuffs?.[id]
  if (debuff?.turns > 0) { data.force = Math.max(0, data.force - (debuff.amount || 2)); data.defense = Math.max(0, data.defense - (debuff.amount || 2)) }
  return data
}

function combatFriendlyTarget(root,id){return id==="eloSummon"?(root.combat?.eloSummon?.active?root.combat.eloSummon:null):root.characters?.[id]}
function combatFriendlyName(id){return id==="eloSummon"?"John Pork":heroDisplayName(id)}
function combatFriendlyMaxHP(root,id){const c=combatFriendlyTarget(root,id);return id==="eloSummon"?c?.maxHP||1:getCharacterMaxHp(id,c||{})}
function combatHeal(root, request, from, id, amount, resurrect = false) {
  const c = combatFriendlyTarget(root,id)
  if (!c || (!resurrect && combatInt(c.hp) <= 0)) throw new Error("La cible est KO ; une résurrection est nécessaire")
  const before = combatInt(c.hp), max = Math.max(before,combatFriendlyMaxHP(root,id))
  const adjusted=Math.max(0,combatInt(resurrect&&before<=0?max:amount))
  c.hp = Math.min(max,before+adjusted)
  combatRecord(root, request, from, id, c.hp - before, "heal", from + " → " + combatFriendlyName(id).toUpperCase() + " : +" + (c.hp - before) + " PV ("+before+" → "+c.hp+" / "+max+")")
  return c.hp - before
}

function combatDamage(root, request, from, slot, amount, type = "dmg", options = {}) {
  const target = root.combat[slot]
  if (!target || combatInt(target.hp) <= 0) return 0
  const before = combatInt(target.hp)
  amount=krakenIncomingDamage(root,request,from,slot,amount)
  amount=kingIncomingDamage(root,request,from,slot,amount)
  if(!options.ignoreNidhoggWound)amount=nidhoggIncomingDamage(root,slot,amount)
  if(isJormungandr(target)){
    const origin=root.game?.combatState?.returnMap||root.game?.map
    if(!options.thorMjolnir||!isForchurMap(origin)||Math.max(0,combatInt(before))<=0){
      combatRecord(root,request,from,heroDisplayName(target.name),0,type,"Jörmungandr est invulnérable à cette attaque.");return 0
    }
    target.hp=0;target.defeatedByThor=true
  }else {
    let dealt=Math.max(0,combatInt(gmIncomingDamage(root,slot,["POISON","SAIGNEMENT"].includes(from)?amount:gmOutgoingDamage(root,request.kind==="hero"&&request.payload?.attack==="Le Bibi"?"bibi":request.actor,amount))))
    if(Number.isFinite(options.damageCap))dealt=Math.min(dealt,Math.max(0,combatInt(options.damageCap)))
    target.hp = Math.max(0, before - dealt)
  }
  combatRecord(root, request, from, heroDisplayName(target.name).toUpperCase(), before - target.hp, type, from + " → " + heroDisplayName(target.name).toUpperCase() + " : -" + (before - target.hp) + " PV ("+before+" → "+target.hp+" / "+target.maxHP+")"+(target.hp<=0?" — KO":""))
  krakenAfterDamage(root,request,slot,before-target.hp)
  kingAfterDamage(root,request,slot)
  return before - target.hp
}

function combatOutcome(root,request){
 for(const slot of COMBAT_MOBS)if(isKingEncounter(root.combat[slot]))synchronizeKingStage(root,slot,request||{id:"king-phase"})
 if(root.characters?.bibi?.hp<=0)for(const slot of COMBAT_MOBS)if(root.combat[slot])delete root.combat[slot].bibiRage
 if(root.combat.eloSummon?.hp<=0)delete root.combat.eloSummon
 if(root.combat.phase==="finished")return true
 if(!livingHeroes(root).length){sealCombatOutcome(root,"defeat",request);return true}
 if(!livingMobs(root.combat).length){sealCombatOutcome(root,"victory",request);return true}
 return false
}

function tickCombatRound(root, request) {
  COMBAT_MOBS.forEach(slot => {
    const mob = root.combat[slot]; if (!mob) return
    ;["playerPoison", "playerBleed"].forEach(key => {
      const effect = mob[key]
      if (effect?.turns > 0) combatDamage(root, request, key === "playerPoison" ? "POISON" : "SAIGNEMENT", slot, effect.damage || 1)
    })
    if(mob.nidhoggWound?.expiresAfterRound<=(root.combat.turnState?.round||1))delete mob.nidhoggWound
    ;["playerPoison", "playerBleed", "bibiRage", "yuAggro", "attackMalus"].forEach(key => {
      if (mob[key]?.turns > 0 && --mob[key].turns <= 0) delete mob[key]
    })
  })
  Object.entries(root.combat.heroDebuffs || {}).forEach(([id, effect]) => { if (--effect.turns <= 0) delete root.combat.heroDebuffs[id] })
  for(const field of ["heroBuffs","heroPowerBuffs"])for(const [id,buff]of Object.entries(root.combat[field]||{}))if(--buff.turns<=0)delete root.combat[field][id]
  const summon = root.combat.eloSummon
  if(summon)for(const key of ["debuffRounds"])if(summon[key]>0)summon[key]--
  if (summon && (--summon.turnsLeft <= 0 || combatInt(summon.hp) <= 0)) delete root.combat.eloSummon
  tickKrakenHolds(root,request)
  gmTickStatusRound(root,request)
  for(const [id,ward]of Object.entries(root.combat.helReprieves||{}))if(ward.expiresAfterRound<=(root.combat.turnState.round||1))delete root.combat.helReprieves[id]
}

function nextCombatTurn(root, request, skipRemaining = false) {
  const state = root.combat.turnState
  const order = state.order || []
  if (!order.length || combatOutcome(root, request)) return
  const current=state.currentActorId,mob=root.combat[current]
  const haste=root.combat.heroHaste
  if(haste&&combatOwner(haste.actor)===current){
   if(request.kind==="hero"&&request.actor===haste.actor&&haste.remaining>1){haste.remaining--;state.sequence=combatInt(state.sequence)+1;return}
   delete root.combat.heroHaste
  }
  if(!skipRemaining&&request.kind!=="pass"&&COMBAT_MOBS.includes(current)&&mob?.hp>0&&(state.actorActionIndex||0)+1<Math.min(2,mob.actionsPerTurn||1)){state.actorActionIndex=(state.actorActionIndex||0)+1;state.sequence=combatInt(state.sequence)+1;return}
  gmEndStatusTurn(root,current)
  state.actorActionIndex=0
  for (let attempts = 0; attempts < order.length*101; attempts++) {
    state.currentIndex = (combatInt(state.currentIndex) + 1) % order.length
    if (state.currentIndex === 0) { tickCombatRound(root, request); state.round = Math.max(1, combatInt(state.round, 1)) + 1 }
    if (combatOutcome(root, request)) return
    const id = order[state.currentIndex].id
    if(root.combat[id]?.reihktParalyzed){delete root.combat[id].reihktParalyzed;gmBeginStatusTurn(root,id);gmEndStatusTurn(root,id);continue}
    if (combatActorAlive(root, id)) {
      if(!gmBeginStatusTurn(root,id))continue
      if (root.combat.heroStuns?.[id] > 0) { root.combat.heroStuns[id]--;if(root.combat.heroHypnosis?.[id]>0)root.combat.heroHypnosis[id]--;gmEndStatusTurn(root,id); continue }
      if(COMBAT_MOBS.includes(id)&&root.combat[id]?.pikaHypnosisTurns>0){root.combat[id].pikaHypnosisTurns--;gmEndStatusTurn(root,id);continue}
      state.currentActorId = id; state.sequence = combatInt(state.sequence) + 1; return
    }
  }
}

function requireCombatTurn(root, request, actor) {
  const state = root.combat.turnState
  if(request.kind!=="pass"&&gmParalyzed(root,actor))throw Error("Cet acteur est paralysé par le MJ")
  if (state?.phase !== "active" || root.combat.phase === "finished") throw new Error("Le combat n’est pas prêt à recevoir une action")
  if (state.currentActorId !== combatOwner(actor)) throw new Error("Ce n’est pas le tour de cet acteur")
  if (combatInt(request.sequence) !== combatInt(state.sequence)) throw new Error("Ce tour est déjà terminé")
  if (!combatActorAlive(root, actor) || (actor !== "greg" && COMBAT_CHARACTERS.includes(actor) && combatInt(root.characters[actor].hp) <= 0) || (actor === "greg" && request.kind !== "pass" && combatInt(root.characters.greg.hp) <= 0)) throw new Error("Cet acteur est KO")
}

function chooseEnemyTarget(root, slot, attack, forced, dice) {
  const alive = livingHeroes(root)
  const tank=root.combat.eloSummon?.active&&root.combat.eloSummon.hp>0
  if (attack.effect === "all") return tank?[...alive,"eloSummon"]:alive
  if(forced&&![...alive,...(tank?["eloSummon"]:[])].includes(forced))throw new Error("La cible choisie est KO ou invalide")
  if(tank)return ["eloSummon"]
  if(forced)return [forced]
  if (root.combat[slot].yuAggro?.turns > 0 && alive.includes("ju")) return ["ju"]
  if(root.combat[slot].kingMinion&&root.combat[slot].kingRole==="isoler"&&alive.length>1){
    const isolation=id=>{const p=root.tokens?.[id];if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return 0;return Math.min(...alive.filter(other=>other!==id).map(other=>{const q=root.tokens?.[other];return Number.isFinite(q?.x)&&Number.isFinite(q?.y)?Math.hypot(p.x-q.x,p.y-q.y):0}))}
    return [[...alive].sort((a,b)=>isolation(b)-isolation(a))[0]]
  }
  if (!alive.length) throw new Error("Aucune cible vivante")
  if (isPhysicalMobAttack(attack)) {
    const mob = slot === "mob" ? (root.tokens?.mobToken || root.combat.mob) : root.combat[slot]
    const ranked = [...alive].sort((a, b) => Math.hypot((root.tokens[a]?.x || 0) - mob.x, (root.tokens[a]?.y || 0) - mob.y) - Math.hypot((root.tokens[b]?.x || 0) - mob.x, (root.tokens[b]?.y || 0) - mob.y))
    const roll = dice(100)
    if (roll <= 68) return [ranked[0]]
    if (roll <= 90) return [ranked[Math.min(1, ranked.length - 1)]]
  }
  if ((attack.effect === "ranged" || attack.effect === "magic") && dice(100) <= 60) return [[...alive].sort((a, b) => root.characters[b].hp - root.characters[a].hp)[0]]
  return [alive[dice(alive.length) - 1]]
}

function resolveHeroCombatAction(root, request, dice) {
  const actor = request.actor, payload = request.payload || {}, c = root.combat
  requireCombatTurn(root, request, actor)
  if(payload.support==="krakenRelease")return resolveKrakenRelease(root,request,dice)
  if(payload.support==="kingStrategy")return resolveKingSupport(root,request,dice)
  const raw = root.characters[actor], data = combatCharacter(root, actor)
  const special = !!payload.special
  const attack = getCombatHeroAttack(actor,payload.attack,special)
  if (!attack || attack.name !== payload.attack) throw new Error("Capacité inconnue")
  if(attack.name==="Le Bibi"&&combatInt(root.characters?.bibi?.hp)<=0)throw Error("Bibi est KO : cette attaque est indisponible")
  if(attack.name==="Le Bibi"&&gmParalyzed(root,"bibi"))throw Error("Bibi est paralysée par le MJ")
  if(c.heroHaste&&(attack.name==="Le Bibi"||c.heroHaste.actor!==actor||special||getPlayerAttackTypeKey(attack)==="heal"))throw Error("SKARO’H permet seulement deux attaques basiques du personnage concerné")
  if(actor==="ju"&&attack.pikaKind)return resolvePikaHeroAction(root,request,attack,dice)
  if (special && c.playerSpecials?.[actor]) throw new Error("Spéciale déjà utilisée")
  const heal = getPlayerAttackTypeKey(attack) === "heal"
  if(heal){const target=combatFriendlyTarget(root,payload.target);if(!target||target.hp<=0)throw Error("La cible est KO ; une résurrection est nécessaire");if(target.hp>=combatFriendlyMaxHP(root,payload.target))throw Error("Cette cible a déjà tous ses PV")}
  const slot = payload.target || livingMobs(c)[0]
  if (!heal && !livingMobs(c).includes(slot)) throw new Error("Choisissez un ennemi vivant")
  const mob = !heal ? c[slot] : null
  if (actor === "greg" && attack.name === "I know Frank (si arc)" && !playerHasInventoryItem(raw, "arc")) throw new Error("Greg doit posséder un arc")
  if (actor === "greg" && attack.name === "Chat Bite (CaC)") {
    const p = root.tokens.greg, candidates = slot === "mob" ? [root.tokens.mobToken,c.mob,c.presentation?.positions?.mobToken] : [c[slot],root.tokens["mobToken_"+slot],c.presentation?.positions?.["mobToken_"+slot]]
    const m = candidates.find(position => Number.isFinite(position?.x) && Number.isFinite(position?.y))
    if (!p || !m || !Number.isFinite(m.x) || Math.hypot(p.x - m.x, p.y - m.y) > 180) throw new Error("La morsure nécessite le contact avec la cible")
  }
  const players = Object.fromEntries(COMBAT_CHARACTERS.map(id => [id, combatCharacter(root, id)]))
  if (special && !isPlayerSpecialConditionMet(actor, attack, { mob, charData: data, players })) throw new Error(attack.conditionText || "Condition de spéciale non remplie")
  const max = Math.max(2, combatInt(attack.dice, 20)), roll = dice(max), crit = roll === max, fail = roll === 1
  const adjusted=c.balanceVersion===3?calibratedHeroRoll(data,roll,max):{total:roll,bonus:0}
  const stat = combatInt(data[getAttackStatKey(attack.stat)])
  const power = getPlayerAttackPower(attack, adjusted.total, stat, { playerId: actor, charData: data, isSpecial: special,balanceVersion:c.balanceVersion })
  recordHeroCritical(root,actor,crit,fail)
  if(actor!=="bibi"&&raw.cursedEffect==="critOnly"&&raw.cursedCombatId===c.id&&!crit){
    if(special){c.playerSpecials ||= {};c.playerSpecials[actor]=true}
    nextCombatTurn(root,request)
    return {actor,attack:attack.name,roll,dice:max,crit,fail,amount:0,mode:"curse-blocked",special,target:slot,message:"Malédiction : seul un critique produit un effet"}
  }
  if (heal) {
    if (![...COMBAT_CHARACTERS,...(c.eloSummon?.active?["eloSummon"]:[])].includes(payload.target)) throw new Error("Choisissez un héros à soigner")
    const amount = combatHeal(root, request, actor.toUpperCase(), payload.target, fail ? Math.max(4, Math.round(power * 0.45)) : crit ? power * combatCriticalMultiplier(c) : power)
    const explanation=crit?"Critique : soin multiplié par "+combatCriticalMultiplier(c)+" avant la limite des PV maximum.":fail?"Échec critique : soin réduit.":""
    nextCombatTurn(root, request)
    return { actor, attack: attack.name, roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus, dice: max, crit, fail, amount, explanation, mode: "heal", special, target: payload.target, targetName: combatFriendlyName(payload.target).toUpperCase() }
  }
  let damage = fail ? 0 : power * (crit ? combatCriticalMultiplier(c) : 1), groupHeal = 0
  if(special&&c.balanceVersion===3){damage=calibratedSpecialDamage(actor,power,crit,fail,combatCriticalMultiplier(c));if(actor==="elo")groupHeal=fail?Math.round(calibratedHealth(data.lvl)*.025):Math.round(calibratedHealth(data.lvl)*.08*(crit?combatCriticalMultiplier(c):1))}
  else if (special) {
    damage = Math.round(damage * (attack.damageBonus || 1.75))
    const modified = applyPlayerSpecialModifiers(actor, { charData: data, mobHpRatio: mob.hp / Math.max(1, mob.maxHP), mobSpecialUsed: !!mob.specialUsed, gregCriticalHp: root.characters.greg.hp <= getCharacterMaxHp("greg", root.characters.greg) * .2, anyAllyQuarterHp: COMBAT_CHARACTERS.some(id => root.characters[id].hp > 0 && root.characters[id].hp <= getCharacterMaxHp(id, root.characters[id]) * .25), crit, fail, damage, flatBonus: 0, multiplier: 1, basePower: power })
    damage = Math.round(modified.damage*SPECIAL_DAMAGE_MULTIPLIER); groupHeal = modified.groupHeal || 0
  }
  if (!fail && mob.bibiRage?.turns > 0) damage += mob.bibiRage.damage || 2
  if (!fail && mob.yuAggro?.turns > 0) damage += mob.yuAggro.allyBonus || 1
  if (!fail && mob.spiderSenseBuff?.active) damage = Math.round(damage * (mob.spiderSenseBuff.damageMult || 1.1))
  if (attack.name === "Je vais te raconter une histoire" && /foret|mine/i.test(root.game.combatState?.returnMap || root.game.map || "")) damage *= c.balanceVersion===3?1.25:2
  if(attack.name === "Spider Sense" && !fail)damage=Math.round(damage*.65)
  if (attack.name === "Spider Sense" && !fail) { c.playerFlags ||= {}; c.playerFlags[actor] ||= {}; c.playerFlags[actor].spiderSense = true; mob.spiderSenseBuff = { active: true, damageMult: 1.1 }; const weakness = getMobWeakness(mob.name, mob.tier || "weak"); if (weakness) mob.revealedWeakness = { mobName: mob.name, title: weakness.title, text: weakness.text }; if (crit) mob.victoryLootBonus = { active: true } }
  if (attack.name === "Petite merde" && c.playerFlags?.[actor]?.spiderSense) damage *= 2
  if(attack.name==="Je suis jet laguée"&&c.balanceVersion!==3)damage=Math.round(damage*1.25)
  if(c.balanceVersion===3)damage=calibratedOutgoingDamage(root,actor,damage,attack.name==="Le Bibi"?"bibi":actor)
  let amount = combatDamage(root, request, actor.toUpperCase() + " — " + attack.name, slot, Math.round(damage))
  if (!fail&&actor==="greg"&&attack.name!=="Le Bibi"&&getPlayerAttackTypeKey(attack)==="physical"&&mob.name==="roi"&&balrogSwordIsEquipped(root))mob.balrogSwordWeaken=Math.max(mob.balrogSwordWeaken||0,crit?.25:.15)
  if (!fail) {
    if ((actor === "greg" || actor === "bibi") && attack.name === "Le Bibi" && crit) mob.bibiRage = { damage: c.balanceVersion===3?Math.max(1,Math.round(calibratedHealth(data.lvl)*.025)):2, turns: 3 }
    if (actor === "greg" && attack.name === "I know Frank (si arc)" && crit) mob.playerBleed = { damage: c.balanceVersion===3?Math.max(1,Math.round(calibratedHealth(data.lvl)*.01)):1, turns: 2 }
    if (actor === "ju" && getPlayerAttackTypeKey(attack) === "charm") { mob.yuAggro = { turns: 3, allyBonus: 1 }; if (crit) mob.yuSkipNextTurn = { active: true } }
    if (attack.name === "Petite merde" && crit) mob.attackMalus = { amount: 1, turns: 2 }
    if (attack.name === "Je vais te raconter une histoire" && crit) mob.playerPoison = { damage: c.balanceVersion===3?Math.max(1,Math.round(calibratedHealth(data.lvl)*.015)):2, turns: 2 }
    if (attack.name === "Je suis jet laguée") c.eloSummon = { name:"John Pork", active: true, hp: Math.round(getCharacterMaxHp("elo", raw) * (c.balanceVersion===3?.35:.8)), maxHP: Math.round(getCharacterMaxHp("elo", raw) * (c.balanceVersion===3?.35:.8)), turnsLeft: 3, ...(c.balanceVersion===3?{defense:data.defense,lvl:data.lvl}:{}),damageBonus: 4, frenzy: crit, x: 720, y: 430 }
    else if (actor === "elo" && c.eloSummon?.active) {
      if(c.eloSummon.stunnedAttacks>0)c.eloSummon.stunnedAttacks--;else{
      const bonusRoll=dice(4)
      const bonus = Math.max(0,(c.balanceVersion===3?Math.round(calibratedHealth(data.lvl)*.012*bonusRoll):bonusRoll) * (c.eloSummon.frenzy ? 2 : 1)-(c.eloSummon.debuffRounds>0?2:0))
      ;(c.eloSummon.frenzy ? livingMobs(c) : [slot]).forEach(s => {const hit=combatDamage(root, request, "JOHN PORK", s, bonus);if(s===slot)amount+=hit})
      }
    }
  }
  let groupHealAmount=0
  if (groupHeal > 0) [...COMBAT_CHARACTERS,...(c.eloSummon?.active?["eloSummon"]:[])].filter(id=>combatFriendlyTarget(root,id)?.hp>0).forEach(id=>{groupHealAmount+=combatHeal(root,request,"ELO",id,groupHeal)})
  if (special) { c.playerSpecials ||= {}; c.playerSpecials[actor] = true }
  const consequences=[]
  if(crit){
    consequences.push("Critique : dégâts multipliés par "+combatCriticalMultiplier(c)+" avant les autres bonus, protections et la limite des PV restants.")
    if(attack.name==="Je vais te raconter une histoire")consequences.push("Poison appliqué : "+mob.playerPoison.damage+" PV à chaque fin de round pendant "+mob.playerPoison.turns+" rounds.")
    if(attack.name==="I know Frank (si arc)")consequences.push("Saignement appliqué : "+mob.playerBleed.damage+" PV à chaque fin de round pendant "+mob.playerBleed.turns+" rounds.")
    if(attack.name==="Le Bibi")consequences.push("Rage : +"+mob.bibiRage.damage+" dégâts aux attaques alliées sur cette cible pendant 3 rounds.")
    if(attack.name==="Petite merde")consequences.push("Attaques ennemies : −1 dégât pendant 2 rounds.")
    if(attack.name==="Spider Sense")consequences.push("Butin de victoire amélioré.")
  }
  if(fail)consequences.push("Échec critique : aucun dégât de cette attaque.")
  if(attack.name==="Je suis jet laguée"&&!fail)consequences.push("John Pork invoqué : "+c.eloSummon.hp+" PV, protège contre les attaques à cible unique pendant 3 rounds."+(crit?" Frénésie critique : ses bonus D4 sont doublés et touchent tous les ennemis lors des prochaines attaques d’Elo.":""))
  const explanation=consequences.join(" ")
  nextCombatTurn(root, request)
  return { actor, attack: attack.name, roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus, dice: max, crit, fail, amount, groupHealAmount, explanation, mode: "damage", special, target: slot, targetName: heroDisplayName(mob.name).toUpperCase(),...(attack.name==="Je suis jet laguée"&&!fail?{message:"John Pork arrive : "+amount+" dégâts. Il protège le groupe pendant 3 rounds."}:{}) }
}

function resolveEnemyCombatAction(root, request, dice) {
  const slot = request.actor, c = root.combat, mob = c[slot], payload = request.payload || {}
  requireCombatTurn(root, request, slot)
  if (!mob) throw new Error("Ennemi introuvable")
  synchronizeKrakenStage(root,slot,request)
  synchronizeKingStage(root,slot,request)
  if(mob.allyStagger){delete mob.allyStagger;nextCombatTurn(root,request);return {actor:slot,mode:"skip",message:"Le courroux du Jarl interrompt cette action"}}
  const special = isKingEncounter(mob)?kingSpecialAttack(mob):isKrakenEncounter(mob)?krakenSpecialAttack(mob):getMobSpecialAttack(mob.name, mob.tier || "weak")
  const normal = isKingEncounter(mob)?kingNormalAttacks(mob):isKrakenEncounter(mob)?krakenNormalAttacks(mob):getMobAttacksForMob(mob.name, mob.tier || "weak")
  let specialRoll = null
  let attack = payload.random ? null : [...normal, ...(special ? [special] : [])].find(a => a.name === payload.attack)
  if (payload.random) {
    specialRoll = isKrakenEncounter(mob)?null:dice(20)
    const charged=mob.chargingSpecial&&c.turnState.round>=mob.chargingSpecial.readyRound
    const shouldPrepare=isKingEncounter(mob)?c.turnState.round>=2:isKrakenEncounter(mob)?c.turnState.round>=(mob.krakenNextSpecialRound||3):specialRoll===20
    const choices = (charged || (!mob.chargingSpecial&&shouldPrepare)) && special && !mob.specialUsed ? [special] : normal.filter(a => normal.length === 1 || a.name !== mob.lastAttack)
    attack = choices[dice(choices.length) - 1]
  }
  if (!attack) throw new Error("Attaque ennemie inconnue")
  if (!attack.special && normal.length > 1 && mob.lastAttack === attack.name) throw new Error("Cette attaque recharge ; choisissez-en une autre ou passez le tour")
  if (attack.special && mob.specialUsed) throw new Error("Spéciale déjà utilisée")
  if (mob.yuSkipNextTurn?.active) { delete mob.yuSkipNextTurn; nextCombatTurn(root, request,true); return { actor: slot, mode: "skip", message: "L’ennemi est neutralisé pour cette action" } }
  let reaction=null,kingCharge=null
  if(attack.special&&mob.balanceClass==="world"){
    if(!mob.chargingSpecial){mob.chargingSpecial={id:request.id,name:attack.name,readyRound:(c.turnState.round||1)+1,...(isKrakenEncounter(mob)?{krakenStage:attack.krakenStage}:{}),...(isKingEncounter(mob)?{kingStage:attack.kingStage,kingTargets:chooseEnemyTarget(root,slot,attack,payload.target,dice)}:{})};nextCombatTurn(root,request);return {actor:slot,mode:"warning",attack:attack.name,special:true,message:heroDisplayName(mob.name).toUpperCase()+" prépare « "+attack.name+" » pour le prochain round !",...(isKingEncounter(mob)?{kingScene:KING_PHASES[attack.kingStage-1].scene,kingWarning:true,kingSlot:slot,kingLights:kingAuroraCount(mob)}:{})}}
    if(c.turnState.round<mob.chargingSpecial.readyRound)throw new Error("La spéciale se prépare pour le prochain round ; choisissez une autre action")
    reaction=mob.chargingSpecial.reaction
    if(reaction?.status==="rolling")throw Error("Réactions en attente : le MJ doit valider les protections ou annuler l’événement")
    if(isKingEncounter(mob)){
      kingCharge=combatClone(mob.chargingSpecial)
      if(attack.kingStage===5&&!mob.king.refugesConfirmed&&!mob.king.odinInvoked)throw Error("Le MJ doit valider les refuges de Turn Around, même si personne ne s’y trouve")
    }
    delete mob.chargingSpecial
  }
  let targets = chooseEnemyTarget(root, slot, attack, payload.target, dice)
  if(kingCharge?.kingTargets&&attack.effect!=="all")targets=kingCharge.kingTargets.filter(id=>combatFriendlyTarget(root,id)?.hp>0)
  const range = getMobDamageRange(attack, mob.lvl || 1, mob.tier || "weak",mob)
  let damage = range.min + dice(range.max - range.min + 1) - 1
  if (mob.attackMalus) damage = Math.max(0, damage - (mob.attackMalus.amount || 0))
  if (mob.malus?.source === "La Sorcière") damage = Math.round(damage * combatWitchDamageFactor(root,mob))
  damage=gmOutgoingDamage(root,slot,damage)
  if(mob.balrogSwordWeaken){damage=Math.round(damage*(1-mob.balrogSwordWeaken));delete mob.balrogSwordWeaken}
  const duoWeakened=!!mob.helDuoWeakened
  if(duoWeakened){damage=Math.round(damage*.5);delete mob.helDuoWeakened}
  let applied = 0,kingAvoided=false
  const consequences=[]
  if(duoWeakened)consequences.push("Jugement de Hel et Nidhogg : dégâts de cette attaque réduits de 50 %. L’effet est consommé.")
  if(specialRoll)consequences.push("D20 de sélection de l’attaque : "+specialRoll+" (ce dé ne multiplie pas les dégâts).")
  targets.forEach(id => {
    const victim=combatFriendlyTarget(root,id),before = combatInt(victim.hp)
    const reduction=kingReactionReduction(mob,attack,id,reaction?.status==="ready"?reaction.decisions?.[id]||0:0,kingCharge)
    const reactedDamage=Math.round(damage*(1-reduction/100)),protectedDamage=gmIncomingDamage(root,id,reactedDamage),taken=c.balanceVersion===3?calibratedIncomingDamage(id==="eloSummon"?victim:combatCharacter(root,id),protectedDamage):protectedDamage
    if(reduction)combatRecord(root,request,"RÉACTION MJ",combatFriendlyName(id),0,"reaction",combatFriendlyName(id)+" : protection −"+reduction+" % contre « "+attack.name+" » ("+damage+" → "+reactedDamage+" avant armure et autres protections)")
    victim.hp = helPreventKO(root,request,id,before,Math.max(0, before - Math.max(0,combatInt(taken)))); applied += before - victim.hp
    if(reduction===100){kingAvoided=true;combatRecord(root,request,heroDisplayName(mob.name),combatFriendlyName(id),0,"mob",combatFriendlyName(id)+" évite complètement « "+attack.name+" » : aucun dégât ni effet secondaire");return}
    if(id==="eloSummon"){if(attack.effect==="stun"){victim.stunnedAttacks=1;consequences.push("John Pork : prochain bonus d’attaque neutralisé.")}if(attack.effect==="debuff"){victim.debuffRounds=2;consequences.push("John Pork : bonus de dégâts −2 pendant 2 rounds.")}combatRecord(root,request,heroDisplayName(mob.name),"John Pork",before-victim.hp,"mob","John Pork encaisse "+(before-victim.hp)+" dégâts ("+before+" → "+victim.hp+" / "+victim.maxHP+" PV)"+(victim.hp<=0?" — KO":""));return}
    if (id !== "bibi" && attack.effect === "curse") root.characters[id].curse = Math.min(8, combatInt(root.characters[id].curse) + 1)
    if (attack.effect === "stun") { c.heroStuns ||= {}; c.heroStuns[combatOwner(id)] = 1 }
    if (attack.effect === "debuff") { c.heroDebuffs ||= {}; c.heroDebuffs[id] = { amount: 2, turns: 2 } }
    if(isKrakenEncounter(mob)&&attack.effect==="grab"&&taken>0&&!mob.krakenHold)mob.krakenHold={target:id,roundsLeft:2,startedRound:c.turnState.round||1,releaseNeeded:Math.max(1,Math.round(mob.maxHP*.10)),damageTaken:0}
    if(attack.effect==="curse"&&id!=="bibi")consequences.push(combatFriendlyName(id)+" : jauge de malédiction après attaque "+root.characters[id].curse+" / 8.")
    if(attack.effect==="stun")consequences.push(combatFriendlyName(id)+" : une action neutralisée (tour partagé pour Greg et Bibi).")
    if(attack.effect==="debuff")consequences.push(combatFriendlyName(id)+" : Force et Défense −2 pendant 2 rounds.")
    if(mob.krakenHold?.target===id&&attack.effect==="grab"&&taken>0)consequences.push(combatFriendlyName(id)+" saisi : dégâts infligés −25 %, pression en fin de round pendant 2 rounds. Libération par assistance ou "+mob.krakenHold.releaseNeeded+" dégâts cumulés sur le Kraken.")
    combatRecord(root, request, heroDisplayName(mob.name).toUpperCase(), id.toUpperCase(), before - root.characters[id].hp, "mob", heroDisplayName(mob.name) + " — " + attack.name + " → " + combatFriendlyName(id) + " : -" + (before - root.characters[id].hp) + " PV ("+before+" → "+victim.hp+")"+(victim.hp<=0?" — KO":""))
  })
  if (attack.special){mob.specialUsed = true;if(isKrakenEncounter(mob)){mob.krakenSpecialStageUsed=attack.krakenStage;mob.specialUsed=krakenSpecialUsed(mob);mob.krakenNextSpecialRound=(c.turnState.round||1)+3}}
  if(isKingEncounter(mob)&&attack.special){mob.king.specialsUsed[attack.kingStage]=true;mob.specialUsed=kingSpecialUsed(mob);if(attack.kingStage===1&&kingAvoided)kingGrantOpening(mob,2);if(attack.kingStage===4||attack.kingStage===5)kingGrantOpening(mob,3)}
  if(isKrakenEncounter(mob)&&mob.krakenDisorientedActions>0)mob.krakenDisorientedActions--
  if (attack.healSelfRatio) {const before=mob.hp;mob.hp = Math.min(mob.maxHP, mob.hp + Math.min(isKingEncounter(mob)?Math.round(mob.maxHP*.05):Infinity,Math.round(applied * attack.healSelfRatio)));consequences.push(heroDisplayName(mob.name)+" récupère "+(mob.hp-before)+" PV ("+before+" → "+mob.hp+" / "+mob.maxHP+").")}
  mob.lastAttack = attack.name
  const presentation = { attackName: attack.name+(mob.balanceClass==="world"&&mob.hp<=mob.maxHP*.5?" — Furie":""), icon: attack.icon || "⚔", dmg: targets.length===1?applied:damage, damageSummary:targets.map(id=>{const hit=Object.entries(c.hits||{}).filter(([key])=>key.startsWith(request.id+"_")).map(([,hit])=>hit).filter(h=>h.type==="mob"&&(h.to===id.toUpperCase()||id==="eloSummon"&&h.to==="John Pork")).at(-1);return combatFriendlyName(id)+" −"+(hit?.amount||0)+" PV"}).join(" · "), target: targets.length > 1 ? "TOUS" : combatFriendlyName(targets[0]||"AUCUNE").toUpperCase(), mobName: heroDisplayName(mob.name).toUpperCase(), time: request.time, special: !!attack.special, animation: attack.animation || "" }
  nextCombatTurn(root, request)
  return { actor: slot, attack: attack.name, amount: applied, targets, explanation:consequences.join(" "), mode: "enemy", special: !!attack.special, presentation, ...(specialRoll ? {roll:specialRoll,dice:20} : {}),...(isKingEncounter(mob)?{kingScene:attack.special?KING_PHASES[attack.kingStage-1].scene:"sentence",kingSlot:slot,kingLights:kingAuroraCount(mob),kingProtected:applied===0,kingOdin:attack.kingStage===5&&!!mob.king.odinInvoked}:{}) }
}

function resolveAllyCombatAction(root, request, dice) {
  if(!combatHasWorldBoss(root))throw Error("Les invocations sont réservées aux combats de world boss")
  requireCombatTurn(root, request, request.actor)
  const payload = request.payload || {}, pnj = combatAllyDefinition(payload.pnjId), action = pnj?.actions.find(a => a.id === payload.actionId)
  if (!pnj || !action) throw new Error("Action alliée inconnue")
  if(root.game?.allyBreaks?.[pnj.id])throw Error("Alliance rompue : ce soutien est indisponible")
  if(pnj.id==="hel"&&!root.game?.allyDiscoveries?.hel)throw Error("Le MJ doit débloquer l’alliance avec Hel")
  if (root.combat.usedAllies?.[action.id]) throw new Error("Cette intervention a déjà été utilisée")
  if (root.roles?.[request.uid] !== "gm" && (["exploration","combat-free"].includes(root.game.playerAllyAccess?.scope) || root.game.playerAllyAccess?.actionId !== action.id || (root.game.playerAllyAccess.playerId&&root.game.playerAllyAccess.playerId!==request.actor) || (root.game.playerAllyAccess.combatId&&root.game.playerAllyAccess.combatId!==root.combat.id))) throw new Error("Le MJ doit autoriser cette intervention")
  if(pnj.id==="nidhogg"||pnj.id===HEL_NIDHOGG_DUO.id)return resolveHelNidhoggCombatAction(root,request,pnj,action,dice)
  const enhanced=enhancedCombatCriticals(root.combat)
  if(enhanced&&(root.combat.allyRetryRounds?.[action.id]||0)>(root.combat.turnState?.round||1))throw Error("Thor reprend ses forces : nouvelle tentative au prochain round")
  if(enhanced){
    if(["heal","buff"].includes(action.type)){const target=combatFriendlyTarget(root,payload.target);if(!target||!COMBAT_CHARACTERS.includes(payload.target)||action.type==="buff"&&target.hp<=0)throw Error("Choisissez un héros valide")}
    else if(!livingMobs(root.combat).includes(payload.target||livingMobs(root.combat)[0]))throw Error("Choisissez un ennemi vivant")
  }
  const roll = dice(action.dice), crit = roll !== 1 && roll >= (action.critMin || action.dice);let fail = roll === 1,thorVictory=false
  let amount = 0,thorLethalDamage=0,totalAllyDamage=0
  const consequences=[]
  const wasKO=combatFriendlyTarget(root,payload.target)?.hp<=0
  if(pnj.id==="hel"){
    const selected=[payload.target,...(payload.secondaryTarget?[payload.secondaryTarget]:[])]
    if(new Set(selected).size!==selected.length||selected.some(p=>!COMBAT_CHARACTERS.includes(p)||!root.characters[p]||root.characters[p].hp<=0))throw Error("Choisissez des héros vivants distincts")
    const success=roll>=8&&!fail,protectedTargets=success?(crit?selected:selected.slice(0,1)):[]
    root.combat.helReprieves||={}
    for(const target of protectedTargets){root.combat.helReprieves[target]={expiresAfterRound:(root.combat.turnState.round||1)+1};combatRecord(root,request,"HEL",heroDisplayName(target),0,"reprieve",heroDisplayName(target)+" : Sursis de Hel jusqu’à la fin du prochain round. Un coup fatal laisse à 1 PV, puis consomme le sursis.")}
    root.combat.usedAllies||={};root.combat.usedAllies[action.id]=true;delete root.game.playerAllyAccess
    const explanation=success?(crit?"Critique : sursis accordé aux héros choisis.":"Sursis accordé au premier héros choisi."):"Jet inférieur à 8 : aucun sursis. Intervention et action consommées."
    nextCombatTurn(root,request)
    return {actor:request.actor,attack:action.label,pnjId:pnj.id,actionId:action.id,target:payload.target,roll,dice:20,crit,fail,amount:0,mode:"ally",explanation,interventionFailed:!success,protectedTargets}
  }
  const thorRetry=enhanced&&fail&&action.id==="thor_mjolnir"&&isJormungandr(root.combat[payload.target||livingMobs(root.combat)[0]])&&isForchurMap(root.game?.combatState?.returnMap||root.game?.map)
  if(enhanced&&fail){
    consequences.push(thorRetry?"Échec critique : Thor rate Jörmungandr, aucun dégât. L’action du héros est consommée. Le MJ peut réautoriser Thor au prochain round pour conserver une issue à ce combat.":"Échec critique : intervention ratée, aucun dégât, soin ou effet. L’intervention et l’action du héros sont consommées.")
  } else if (action.type === "damage") {
    amount = root.combat.balanceVersion===3?calibratedAllyDamage(pnj,action,roll,crit,fail,root.combat.mob.partyLevel,combatCriticalMultiplier(root.combat)):Math.round((action.dmgBase + roll * action.dmgBonus) * (crit && action.critMult ? action.critMult : 1) * (fail ? .2 : 1))
    const targets=action.chainMin&&roll>=action.chainMin?livingMobs(root.combat):[payload.target||livingMobs(root.combat)[0]]
    const thorMjolnir=pnj.id==="thor"&&action.id==="thor_mjolnir"
    targets.forEach(slot=>{
      if(!livingMobs(root.combat).includes(slot))throw Error("Choisissez un ennemi vivant")
      const dealt=combatDamage(root,request,pnj.name,slot,root.combat.balanceVersion===3&&!isJormungandr(root.combat[slot])?Math.min(amount,Math.round(root.combat[slot].maxHP*(enhanced&&crit?.5:.4))):amount,"dmg",{thorMjolnir,...(enhanced?{damageCap:Math.floor(root.combat[slot].maxHP*(crit?.5:.4))}:{})})
      totalAllyDamage+=dealt
      if(action.staggerOnCrit&&crit&&dealt>0&&root.combat[slot].hp>0){root.combat[slot].allyStagger=true;consequences.push(heroDisplayName(root.combat[slot].name)+" : prochaine action interrompue.")}
      if(thorMjolnir&&isJormungandr(root.combat[slot])&&dealt>0){thorLethalDamage=dealt;thorVictory=true;fail=false}
    })
    if(thorVictory)amount=thorLethalDamage
    else if(root.combat.balanceVersion===3)amount=totalAllyDamage
    if(crit&&!thorVictory)consequences.push("Critique : dégâts multipliés par "+(root.combat.balanceVersion===3?combatCriticalMultiplier(root.combat):action.critMult||1)+" avant protections et limites."+(root.combat.balanceVersion===3?" Intervention limitée à "+(enhanced?50:40)+" % des PV maximum de chaque cible, sauf Thor contre Jörmungandr.":""))
    if(targets.length>1)consequences.push("Attaque en chaîne : "+targets.length+" ennemis ciblés.")
  } else if (action.type === "heal") {
    if(enhanced&&wasKO&&!crit)consequences.push("Résurrection manquée : un critique est nécessaire. L’intervention et l’action sont consommées.")
    else amount = combatHeal(root, request, pnj.name, payload.target, root.combat.balanceVersion===3?Math.round(calibratedAllyHeal(pnj,roll,action.dice,root.combat.mob.partyLevel)*(enhanced&&crit&&!wasKO?1.5:1)):roll * (action.healMult || 1), crit)
  }
  else if (action.type === "buff") {
    const target = root.characters[payload.target]; if (!target || target.hp <= 0) throw new Error("Choisissez un héros vivant")
    const turns=enhanced&&crit?4:3
    const stat = playerMainStat[payload.target]; amount = root.combat.balanceVersion===3?Math.max(1,Math.round(combatInt(target[stat])*(.15+.15*roll/action.dice))):roll * (action.buffMult || 1); if(root.combat.balanceVersion===3){root.combat.heroBuffs||={};root.combat.heroBuffs[payload.target]={stat,amount,turns}}else target[stat] = Math.min(999, combatInt(target[stat]) + amount)
    combatRecord(root, request, pnj.name, payload.target.toUpperCase(), amount, "buff", pnj.name + " renforce " + combatFriendlyName(payload.target)+" : +"+amount+" "+stat+(root.combat.balanceVersion===3?" pendant "+turns+" rounds":""))
  } else if (action.type === "malus" && roll >= (action.threshold || 10)) {
    const slot = payload.target || livingMobs(root.combat)[0]; if (!livingMobs(root.combat).includes(slot)) throw new Error("Choisissez un ennemi vivant")
    if (pnj.id === "odin") root.combat[slot].attackMalus = { amount: root.combat.balanceVersion===3?Math.max(1,Math.round(calibratedHealth(root.combat.mob.partyLevel)*.04*(enhanced&&crit?1.25:1))):15 }
    root.combat[slot].malus = { label: action.label, source: pnj.name, roll,...(enhanced&&crit&&pnj.id==="witch"?{damageReduction:.35}:{}) }
    combatRecord(root, request, pnj.name, root.combat[slot].name, 0, "malus", pnj.name + " — " + action.label+(pnj.id==="odin"?" : attaques ennemies −"+root.combat[slot].attackMalus.amount+" dégâts jusqu’à la fin du combat":pnj.id==="witch"?" : dégâts ennemis −"+(enhanced&&crit?35:25)+" % jusqu’à la fin du combat":""))
  } else if(action.type==="malus"){
    consequences.push("Seuil "+(action.threshold||10)+" non atteint : aucun affaiblissement appliqué.")
  }
  if(action.type==="heal"&&crit)consequences.push(wasKO?"Critique : résurrection avec tous les PV maximum.":enhanced?"Critique : soin renforcé ×1,5, limité aux PV maximum.":"Cible déjà vivante : soin normal, limité aux PV maximum ; aucun bonus de soin critique supplémentaire prévu actuellement.")
  if(crit&&["buff","malus"].includes(action.type))consequences.push(enhanced?(action.type==="buff"?"Critique : bonus prolongé à 4 rounds.":pnj.id==="witch"?"Critique : dégâts ennemis réduits de 35 % au lieu de 25 %.":"Critique : affaiblissement renforcé de 25 % avant arrondi."):"Aucun bonus critique supplémentaire prévu pour ce soutien actuellement.")
  const explanation=consequences.join(" ")
  root.combat.usedAllies ||= {}
  if(thorRetry){root.combat.allyRetryRounds||={};root.combat.allyRetryRounds[action.id]=(root.combat.turnState?.round||1)+1}
  else {root.combat.usedAllies[action.id] = true;if(root.combat.allyRetryRounds)delete root.combat.allyRetryRounds[action.id]}
  delete root.game.playerAllyAccess
  nextCombatTurn(root, request)
  return { actor: request.actor, attack: action.label, pnjId: pnj.id, actionId: action.id, target: payload.target || "", roll, dice: action.dice, crit, fail, amount, explanation, interventionFailed:enhanced&&(fail||action.type==="heal"&&wasKO&&!crit), mode: "ally",...(thorVictory?{thorVictory:true,message:"Mjölnir frappe : Jörmungandr est vaincu par Thor."}:{}) }
}

function reduceCombatRequestNow(current, id, seed) {
  const queued = current?.combatRequests?.[id]
  if (!queued || queued.status !== "queued") return null
  const root = combatClone(current), request = root.combatRequests[id]
  request.id = id
  const fail = error => { const unchanged = combatClone(current); unchanged.combatRequests[id] = { ...queued, status: "failed", error: String(error.message || error).slice(0, 300) }; return unchanged }
  try {
    if(typeof validateReliableRequest==="function")validateReliableRequest(root,request)
    if (root.sessionControl?.phase) throw new Error("La session est en cours de sauvegarde ou de chargement")
    if (!root.combat || root.combat.id !== request.combatId) throw new Error("Ce combat est terminé ou a changé")
    if (!Number.isFinite(request.time) || (typeof reliableActionNow==="function"?reliableActionNow():Date.now()) - request.time > 120000) throw new Error("Cette action a expiré")
    const gm = root.roles?.[request.uid] === "gm", profile = root.profiles?.[request.uid]?.playerId
    if (!gm && (profile !== combatOwner(request.actor) || !COMBAT_CHARACTERS.includes(request.actor))) throw new Error("Vous ne contrôlez pas cet acteur")
    normalizeCombatTurns(root)
    const dice = combatRandom(seed)
    let result
    if(root.combat.heroHaste&&["ally","thuum"].includes(request.kind))throw Error("Terminez les deux attaques de SKARO’H ou passez votre tour")
    // Reaction dice use the already-authorized shared-die request channel. They
    // never modify initiative rolls, turn sequence, or critical gauges.
    if(request.kind==="initiative"&&request.payload?.kingOdin){
      result=resolveKingOdinCall(root,request)
    }
    else if(request.kind==="initiative"&&request.payload?.reactionId){
      result=resolveCombatReactionRoll(root,request,dice)
    }
    else if(request.kind === "initiative"){
      const ts=root.combat.turnState;if(ts?.participants?.some(p=>p.id===request.actor)&&Number.isInteger(ts.rolls?.[request.actor])){request.status="done";request.result={mode:"control",message:"Initiative déjà prise en compte"};return root}if(ts?.phase!=="rolling"||!ts.participants?.some(p=>p.id===request.actor)||ts.rolls?.[request.actor]!=null)throw Error("Initiative déjà enregistrée ou combat changé");ts.rolls||={};ts.rolls[request.actor]=dice(12);result={mode:"control",message:"Initiative enregistrée"}
    }
    else if(request.kind==="requestRetreat"){
      if(!gm)throw Error("Seul le MJ peut demander la fuite")
      const availability=worldBossRetreatState(root)
      if(!availability.allowed)throw Error(availability.reason)
      if(!livingHeroes(root).includes(request.actor))throw Error("Choisissez un personnage vivant")
      root.combat.pendingRetreat={id:request.id,actor:request.actor};result={actor:request.actor,mode:"control",skipTurnBanner:true,message:heroDisplayName(request.actor)+" doit lancer un D12 pour la fuite"}
    }
    else if(request.kind==="cancelRetreat"){
      if(!gm||root.combat.pendingRetreat?.id!==request.payload?.pendingId)throw Error("Cette tentative a changé")
      delete root.combat.pendingRetreat;result={mode:"control",skipTurnBanner:true,message:"Tentative de fuite annulée avant le jet"}
    }
    else if(request.kind==="rollRetreat"){
      const pending=root.combat.pendingRetreat
      if(root.combat.phase!=="active"||root.combat.turnState?.phase!=="active"||!combatHasWorldBoss(root)||!pending||pending.id!==request.payload?.pendingId||pending.actor!==request.actor)throw Error("Cette tentative de fuite a changé")
      if(!livingHeroes(root).includes(request.actor))throw Error("Le personnage choisi est KO ; le MJ doit choisir quelqu’un d’autre")
      const roll=dice(12),success=roll===12;delete root.combat.pendingRetreat
      if(success)sealCombatOutcome(root,"retreat",request)
      else root.combat.retreatBlockedUntilRound=(root.combat.turnState.round||1)+1
      result={actor:request.actor,mode:"retreat-roll",skipTurnBanner:true,roll,dice:12,crit:success,fail:roll===1,success,message:success?"Fuite réussie !":"Fuite échouée : le combat continue. Nouvelle tentative au round suivant."}
    }
    else if (request.kind === "hero") result = resolveHeroCombatAction(root, request, dice)
    else if (request.kind === "enemy") { if (!gm || !COMBAT_MOBS.includes(request.actor)) throw new Error("Action réservée au MJ"); result = resolveEnemyCombatAction(root, request, dice) }
    else if (request.kind === "ally") result = resolveAllyCombatAction(root, request, dice)
    else if (request.kind === "pass") { requireCombatTurn(root, request, request.actor); if(COMBAT_MOBS.includes(request.actor)){delete root.combat[request.actor].lastAttack;delete root.combat[request.actor].allyStagger;} nextCombatTurn(root, request); result = { actor: request.actor, mode: "pass", message: "Tour passé" } }
    else if (request.kind === "skipDead") {
      if (!gm || root.combat.turnState?.currentActorId !== request.actor || combatActorAlive(root, request.actor) || combatInt(request.sequence) !== combatInt(root.combat.turnState.sequence)) throw new Error("Le tour ne peut pas être sauté")
      nextCombatTurn(root, request); result = { actor: request.actor, mode: "skip", message: "Acteur KO : tour passé" }
    }
    else if (request.kind === "manualDamage") {
      if (!gm) throw new Error("Action réservée au MJ")
      const amount = combatInt(request.payload?.amount)
      if (amount < 1 || amount > 50000 || !livingMobs(root.combat).includes(request.payload?.target)) throw new Error("Dégâts ou cible invalides")
      const dealt=combatDamage(root, request, "MJ", request.payload.target, amount); combatOutcome(root, request); result = { mode: "manual", amount:dealt }
    } else if (request.kind === "thuum") {
      requireCombatTurn(root, request, request.actor)
      const word = request.payload?.word, def = window.THUUMS?.[word], learned = root.game.playerThuum?.[request.actor]?.[word]
      if (!def || !learned?.unlocked || !root.game.playerThuumAccess?.[request.actor]?.[word]?.allowed) throw new Error("Ce Thu’um n’est pas autorisé")
      if (root.combat.usedThuum?.[request.actor]?.[word]) throw new Error("Ce Thu’um est déjà utilisé")
      const target = request.payload.target || livingMobs(root.combat)[0]
      if (!livingMobs(root.combat).includes(target)) throw new Error("Choisissez une cible vivante")
      const amounts = root.combat.balanceVersion===3?calibratedThuumDamage(word,learned.rank,root.characters[request.actor].lvl):def.combatDamageByRank(learned.rank || 1)
      if(word!=="SKARO'H")livingMobs(root.combat).forEach(slot => combatDamage(root, request, word, slot, slot === target ? amounts.main : amounts.splash))
      if (word === "REIHKT" && !isJormungandr(root.combat[target])) root.combat[target].reihktParalyzed = true
      root.combat.usedThuum ||= {}; root.combat.usedThuum[request.actor] ||= {}; root.combat.usedThuum[request.actor][word] = true
      delete root.game.playerThuumAccess[request.actor][word]
      // Le cri et ses effets visuels sont transmis avec le résultat de cette action.
      if(word==="SKARO'H"){root.combat.heroHaste={actor:request.actor,remaining:2};root.combat.turnState.sequence=combatInt(root.combat.turnState.sequence)+1}else nextCombatTurn(root, request); result = { actor: request.actor, mode: "thuum", word, amount: amounts.main,message:word==="SKARO'H"?"Deux attaques basiques consécutives sont disponibles":word==="REIHKT"?"La cible perd son prochain tour, sauf Jörmungandr":"" }
    } else throw new Error("Action inconnue")
    request.status = "done"; request.result = result
    recordConfirmedCombatAction(root,request,result)
    const visual={id,combatId:root.combat.id,time:Date.now(),result,nextTurn:combatClone(root.combat.turnState)}
    root.combat.lastAction = visual
    if(root.game.combatOutcome?.combatId===root.combat.id)root.game.combatOutcome.finalAction=combatClone(visual)
    root.combat.visualEvents ||= {}; root.combat.visualEvents[id]=visual
    const entries=Object.entries(root.combat.visualEvents).sort((a,b)=>a[1].time-b[1].time)
    entries.slice(0,Math.max(0,entries.length-120)).forEach(([key])=>delete root.combat.visualEvents[key])
    return root
  } catch (error) { return fail(error) }
}

function combatChargeKey(mob){const charge=mob?.chargingSpecial;return charge?mob.name+":"+(charge.id||charge.name+":"+charge.readyRound):""}
function resolveCombatReactionRoll(root,request,dice){
 const c=root.combat,payload=request.payload||{},reaction=c[payload.slot]?.chargingSpecial?.reaction,actor=request.actor
 if(c.phase!=="active"||c.turnState?.phase!=="active"||c[payload.slot]?.hp<=0||!reaction||reaction.id!==payload.reactionId||reaction.status!=="rolling")throw Error("Cette réaction est terminée ou a changé")
 if(!reaction.participants.includes(actor)||root.characters?.[actor]?.hp<=0)throw Error("Ce personnage ne doit pas lancer ce dé")
 reaction.rolls||={};if(reaction.rolls[actor]||Object.prototype.hasOwnProperty.call(reaction.decisions||{},actor))throw Error("Le jet ou la décision de réaction est déjà enregistré")
 const roll=dice(reaction.dice),data=combatCharacter(root,actor),adjusted=c.balanceVersion===3?calibratedHeroRoll(data,roll,reaction.dice):{total:roll,bonus:0},success=roll!==1&&adjusted.total>=reaction.threshold
 reaction.rolls[actor]={roll,total:adjusted.total,bonus:adjusted.bonus,success}
 return {mode:"reaction-roll",skipTurnBanner:true,actor,roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus,dice:reaction.dice,crit:roll===reaction.dice,fail:roll===1,success,message:heroDisplayName(actor)+" — réaction : "+adjusted.total+" / seuil "+reaction.threshold+". "+(success?"Réussite proposée":"Échec proposé")+", décision finale du MJ."}
}

function applyCombatReactionAdjustment(current,uid,combatId,revision,change,changeId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active"||current.combat.turnState?.phase!=="active")throw Error("Le combat ou la partie a changé")
 if(current.combat.gmAdjustmentLog?.[changeId])return current
 const root=combatClone(current),c=root.combat,mob=c[change.slot],charge=mob?.chargingSpecial
 if(!COMBAT_MOBS.includes(change.slot)||!charge||mob.hp<=0)throw Error("Cette attaque n’est plus en préparation")
 const integer=(n,min,max)=>{if(!Number.isInteger(n)||n<min||n>max)throw Error("Valeur attendue entre "+min+" et "+max);return n}
 let reaction=charge.reaction,message
 if(change.kind==="start"){
  if(change.chargeKey!==combatChargeKey(mob))throw Error("L’attaque annoncée a changé")
  if(reaction)throw Error("Cette attaque possède déjà un événement de réaction")
  const participants=change.participants;if(!Array.isArray(participants)||!participants.length||participants.length>4||new Set(participants).size!==participants.length||participants.some(id=>!COMBAT_CHARACTERS.includes(id)||root.characters?.[id]?.hp<=0))throw Error("Choisissez au moins un personnage vivant")
  if(![6,12,20].includes(change.dice))throw Error("Choisissez D6, D12 ou D20")
  charge.reaction={id:changeId,status:"rolling",participants,dice:change.dice,threshold:integer(change.threshold,2,change.dice),successReduction:integer(change.successReduction,0,100),rolls:{},decisions:{}}
  message="Réactions ouvertes contre « "+charge.name+" » : "+participants.map(heroDisplayName).join(", ")+" · D"+change.dice+" · seuil "+change.threshold
 }else{
  if(!reaction||reaction.id!==change.reactionId)throw Error("Cet événement a changé")
  if(change.kind==="cancel"){delete charge.reaction;message="Réactions annulées contre « "+charge.name+" » ; aucune protection de réaction ne sera appliquée"}
  else if(change.kind==="decision"){
   if(reaction.status!=="rolling"||!reaction.participants.includes(change.target))throw Error("Décision indisponible")
   reaction.decisions||={};reaction.decisions[change.target]=integer(change.amount,0,100)
   message=heroDisplayName(change.target)+" : décision MJ, −"+change.amount+" % pour cette attaque uniquement"
  }else if(change.kind==="reopen"){
   if(reaction.status!=="ready")throw Error("Les décisions sont déjà ouvertes")
   reaction.status="rolling";message="Décisions rouvertes contre « "+charge.name+" » ; nouvelle validation MJ requise"
  }else if(change.kind==="finish"){
   if(reaction.status!=="rolling")throw Error("Les protections sont déjà validées")
   reaction.decisions||={}
   for(const id of reaction.participants){if(!Object.prototype.hasOwnProperty.call(reaction.decisions,id)){if(root.characters?.[id]?.hp<=0)reaction.decisions[id]=0;else if(reaction.rolls?.[id])reaction.decisions[id]=reaction.rolls[id].success?reaction.successReduction:0;else throw Error("Il manque un jet ou une décision MJ pour "+heroDisplayName(id))}}
   reaction.status="ready";message="Protections validées contre « "+charge.name+" » : "+reaction.participants.map(id=>heroDisplayName(id)+" −"+reaction.decisions[id]+" %").join(" · ")
  }else throw Error("Commande de réaction inconnue")
 }
 c.gmAdjustmentLog||={};c.gmAdjustmentLog[changeId]={text:message,time:Date.now()};const entries=Object.keys(c.gmAdjustmentLog);entries.slice(0,Math.max(0,entries.length-80)).forEach(id=>delete c.gmAdjustmentLog[id])
 combatRecord(root,{id:changeId,time:Date.now()},"MJ","Réactions",0,"reaction",message)
 recordConfirmedCombatAction(root,{id:changeId,actor:"mj",time:Date.now()},{mode:"control",message})
 return root
}

function getCombatHeroAttack(actor,name,special=false){if(special)return getPlayerSpecialAttack(actor);const list=actor==="bibi"?[attacks.greg.find(a=>a.name==="Le Bibi")]:attacks[actor]||[];return list.find(a=>a?.name===name)}

// Retired preparations are discarded, never replayed as attacks.
function reduceCombatRequest(current,id,seed){
 if(current?.combat?.pendingResolution||current?.combat?.interventionArmed){current=combatClone(current);delete current.combat.pendingResolution;delete current.combat.interventionArmed}
 const q=current?.combatRequests?.[id];if(!q||q.status!=="queued")return null
 if(["free","armIntervention","resolveIntervention","refreshIntervention","dismissIntervention"].includes(q.kind)){
  const root=combatClone(current);root.combatRequests[id]={...q,status:"failed",error:"Cette ancienne commande a été supprimée. Utilisez les états et PV du menu Intervenir."};return root
 }
 return reduceCombatRequestNow(current,id,seed)
}

const GM_COMBAT_STATES={
 paralysis:{label:"Paralysé",icon:"⛓",unit:"tours",description:"Ne peut pas agir pendant le nombre de tours complets choisi. Un world boss perd toutes ses actions du tour. Greg et Bibi sont affectés séparément : l’autre peut encore agir."},
 weakened:{label:"Affaibli",icon:"▼",unit:"rounds",description:"Inflige moins de dégâts. Choisissez la réduction en points ou en pourcentage. Les soins ne sont pas réduits."},
 vulnerable:{label:"Vulnérable",icon:"◇",unit:"rounds",description:"Subit davantage de dégâts. Choisissez le supplément en points ou en pourcentage."},
 protected:{label:"Protégé",icon:"🛡",unit:"rounds",description:"Subit moins de dégâts, sans descendre sous zéro. Choisissez la réduction en points ou en pourcentage. Si la cible est aussi vulnérable, la protection s’applique après la vulnérabilité."},
 poison:{label:"Poison",icon:"☠",unit:"rounds",description:"Perd les PV indiqués à chaque fin de round. Ces dégâts fixes ignorent les états Protégé et Vulnérable."},
 bleeding:{label:"Saignement",icon:"🩸",unit:"rounds",description:"Perd les PV indiqués à chaque fin de round, indépendamment du poison ou de la brûlure."},
 burning:{label:"Brûlure",icon:"🔥",unit:"rounds",description:"Perd les PV indiqués à chaque fin de round, indépendamment des autres dégâts périodiques."},
 regeneration:{label:"Régénération",icon:"✚",unit:"rounds",description:"Récupère les PV indiqués à chaque fin de round, sans dépasser ses PV maximum. Ne réanime pas une cible KO."}
}
function gmTarget(root,id){return COMBAT_MOBS.includes(id)?root.combat?.[id]:root.characters?.[id]}
function gmStateMap(root,id){return root.combat?.gmStates?.[id]||{}}
function gmParalyzed(root,id){return (gmStateMap(root,id).paralysis?.turns||0)>0}
function gmTurnMembers(owner){return owner==="greg"?["greg","bibi"]:[owner]}
function gmEndStatusTurn(root,owner){for(const id of gmTurnMembers(owner)){const state=gmStateMap(root,id).paralysis;if(state?.activeTurn){delete state.activeTurn;if(--state.turns<=0)delete root.combat.gmStates[id].paralysis}}}
function gmBeginStatusTurn(root,owner){
 const alive=gmTurnMembers(owner).filter(id=>(gmTarget(root,id)?.hp||0)>0)
 for(const id of alive){const state=gmStateMap(root,id).paralysis;if(state)state.activeTurn=true}
 if(alive.length&&alive.every(id=>gmParalyzed(root,id))){gmEndStatusTurn(root,owner);return false}
 return true
}
function gmModifyDamage(amount,state,increase=false){if(!state)return Math.max(0,Math.round(amount));const n=state.mode==="percent"?amount*state.amount/100:state.amount;return Math.max(0,Math.round(amount+(increase?n:-n)))}
function gmOutgoingDamage(root,actor,amount){return gmModifyDamage(amount,gmStateMap(root,actor).weakened)}
function gmIncomingDamage(root,id,amount){if(amount<=0)return 0;const states=gmStateMap(root,id);return gmModifyDamage(gmModifyDamage(amount,states.vulnerable,true),states.protected)}
function gmTickStatusRound(root,request){
 for(const [id,states]of Object.entries(root.combat.gmStates||{})){
  const target=gmTarget(root,id);if(!target)continue
  for(const key of ["poison","bleeding","burning","regeneration"]){const state=states[key];if(!state||target.hp<=0)continue;const before=target.hp,max=COMBAT_MOBS.includes(id)?target.maxHP:getCharacterMaxHp(id,target)
   if(key==="regeneration")target.hp=Math.min(max,target.hp+state.amount)
   else if(!isJormungandr(COMBAT_MOBS.includes(id)?target:null))target.hp=helPreventKO(root,request,id,before,Math.max(0,target.hp-state.amount))
   if(before!==target.hp)combatRecord(root,request,"MJ — "+GM_COMBAT_STATES[key].label,id,Math.abs(before-target.hp),key==="regeneration"?"heal":"dmg","Effet MJ : "+GM_COMBAT_STATES[key].label)
  }
  for(const [key,state]of Object.entries(states))if(key!=="paralysis"&&--state.turns<=0)delete states[key]
 }
}
function applyGMCombatAdjustment(current,uid,combatId,revision,change,changeId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active"||current.combat.turnState?.phase!=="active")throw Error("Le combat ou la partie a changé")
 if(current.combat.gmAdjustmentLog?.[changeId])return current
 const root=combatClone(current),c=root.combat,id=change.target,target=gmTarget(root,id),request={id:changeId,uid,actor:"mj",manual:true,time:Date.now()}
 if(![...COMBAT_CHARACTERS,...COMBAT_MOBS].includes(id)||!target)throw Error("Choisissez une cible existante")
 const label=COMBAT_MOBS.includes(id)?heroDisplayName(target.name):heroDisplayName(id)
 let message="",integer=(value,min,max)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error("Valeur attendue entre "+min+" et "+max);return n}
 c.gmStates||={};c.gmStates[id]||={}
 if(change.kind==="state"){
  const def=GM_COMBAT_STATES[change.state];if(!def)throw Error("État inconnu")
  const turns=integer(change.turns,1,99),mode=change.mode==="percent"?"percent":"points",amount=change.state==="paralysis"?0:integer(change.amount,1,mode==="percent"?100:50000)
  c.gmStates[id][change.state]={turns,amount,mode,...(change.state==="paralysis"&&combatOwner(id)===c.turnState.currentActorId?{activeTurn:true}:{})}
  if(change.state==="paralysis"&&c.heroHaste?.actor===id)delete c.heroHaste
  message=label+" : "+def.label+" pendant "+turns+" "+def.unit+(amount?" ("+amount+(mode==="percent"?" %":" points")+")":"")
 }else if(change.kind==="remove"){
  if(!GM_COMBAT_STATES[change.state])throw Error("État inconnu")
  delete c.gmStates[id][change.state];message=label+" : "+GM_COMBAT_STATES[change.state].label+" retiré"
 }else if(change.kind==="clear"){c.gmStates[id]={};message=label+" : états MJ retirés"}
 else if(change.kind==="hp"){
  const max=COMBAT_MOBS.includes(id)?target.maxHP:getCharacterMaxHp(id,target),value=integer(change.amount,0,50000),before=target.hp
  if(!["set","heal","damage"].includes(change.operation))throw Error("Ajustement de PV inconnu")
  target.hp=Math.max(0,Math.min(max,change.operation==="set"?value:before+(change.operation==="heal"?value:-value)))
  message=label+" : "+before+" → "+target.hp+" / "+max+" PV (ajustement MJ)"
  if(target.hp!==before)combatRecord(root,request,"MJ",label,Math.abs(target.hp-before),target.hp>before?"heal":"dmg",message)
 }else throw Error("Ajustement inconnu")
 delete c.pendingResolution;delete c.interventionArmed
 for(const slot of COMBAT_MOBS)synchronizeKrakenStage(root,slot,request)
 if(!combatOutcome(root,request)){
  const owner=c.turnState.currentActorId,members=gmTurnMembers(owner).filter(member=>(gmTarget(root,member)?.hp||0)>0)
  if(!combatActorAlive(root,owner)||(members.length&&members.every(member=>gmParalyzed(root,member))))nextCombatTurn(root,request,true)
 }
 c.gmAdjustmentLog||={};c.gmAdjustmentLog[changeId]={time:request.time,text:message,target:id}
 Object.keys(c.gmAdjustmentLog).slice(0,-50).forEach(key=>delete c.gmAdjustmentLog[key])
 recordConfirmedCombatAction(root,request,{mode:"control",message})
 c.visualEvents||={};c.visualEvents[changeId]={id:changeId,combatId:c.id,time:request.time,result:{mode:"control",message},nextTurn:combatClone(c.turnState)}
 Object.keys(c.visualEvents).slice(0,-120).forEach(key=>delete c.visualEvents[key])
 return root
}
// This profile is attached only when a new Kraken encounter is created.
function isKrakenEncounter(mob){return mob?.name==="kraken"&&mob.encounterProfile==="kraken-v1"}
function initializeKrakenEncounter(mob){if(mob.name!=="kraken")return mob;const hp=Math.round(mob.maxHP*1.35/5)*5;return {...mob,hp,maxHP:hp,baseBalancedHP:hp,encounterProfile:"kraken-v1",krakenStage:1,krakenSpecialStageUsed:0,krakenNextSpecialRound:3}}
function krakenStage(mob){return Math.max(mob?.krakenStage||1,mob?.hp<=mob?.maxHP*.25?3:mob?.hp<=mob?.maxHP*.60?2:1)}
function krakenStageName(mob){return ["","La traque","L’étreinte des profondeurs","Le navire sous la menace"][krakenStage(mob)]}
function krakenSpecialAttack(mob){
 const stage=mob.chargingSpecial?.krakenStage||krakenStage(mob),base=getMobSpecialAttack("kraken","boss")
 return {...base,oncePerCombat:false,oncePerPhase:true,name:stage===3?"Écrasement du navire":base.name,krakenStage:stage,flavor:stage===3?"Le Kraken soulève sa masse pour écraser le pont. Cherchez un abri ou interrompez sa préparation !":base.flavor}
}
function krakenNormalAttacks(mob){const list=getMobAttacksForMob("kraken","boss");if(krakenStage(mob)>=2&&!mob.krakenHold)list.push({name:"Saisie tentaculaire",icon:"🐙",dmgMin:10,dmgMax:15,effect:"grab",flavor:"Une tentacule saisit une cible. Un allié peut la libérer ou frapper le Kraken.",desc:"Saisit une cible : dégâts infligés −25 %. Un allié peut la libérer ou infliger assez de dégâts au Kraken."});return list}
function krakenSpecialUsed(mob){return (mob.krakenSpecialStageUsed||0)>=krakenStage(mob)}
function synchronizeKrakenStage(root,slot,request){
 const mob=root.combat?.[slot];if(!isKrakenEncounter(mob))return
 if(mob.hp<=0){delete mob.krakenHold;return}
 const stage=krakenStage(mob)
 if(stage>(mob.krakenStage||1)){mob.krakenStage=stage;mob.krakenNextSpecialRound=Math.max(mob.krakenNextSpecialRound||0,(root.combat.turnState?.round||1)+1);combatRecord(root,request,"KRAKEN","Phase",0,"phase","Kraken — phase "+stage+" : "+krakenStageName(mob)+". Aucun coup supplémentaire gratuit.")}
 mob.specialUsed=krakenSpecialUsed(mob)
 if(mob.krakenHold&&root.characters?.[mob.krakenHold.target]?.hp<=0)delete mob.krakenHold
}
function krakenDamageFactor(attack,mob){
 if(!isKrakenEncounter(mob))return 1
 const stage=attack.krakenStage||krakenStage(mob)
 return [0,1.04,1.10,1.20][stage]*(attack.effect==="grab"?.70:1)*(attack.special&&stage===3?1.20:1)*(mob.krakenDisorientedActions>0?.8:1)
}
function krakenHeroDamageFactor(root,actor){return COMBAT_MOBS.some(slot=>isKrakenEncounter(root.combat[slot])&&root.combat[slot].hp>0&&root.combat[slot].krakenHold?.target===actor)?.75:1}
function krakenIncomingDamage(root,request,from,slot,amount){
 const mob=root.combat[slot];if(!isKrakenEncounter(mob)||request.kind!=="hero"||["POISON","SAIGNEMENT"].includes(from))return amount
 if(mob.krakenOpeningHits>0||mob.krakenOpeningRequest===request.id){if(mob.krakenOpeningRequest!==request.id){mob.krakenOpeningHits--;mob.krakenOpeningRequest=request.id}return Math.round(amount*1.25)}return amount
}
function krakenAfterDamage(root,request,slot,amount){
 const mob=root.combat[slot];if(!isKrakenEncounter(mob))return
 if(mob.krakenHold){mob.krakenHold.damageTaken+=amount;if(mob.krakenHold.damageTaken>=mob.krakenHold.releaseNeeded){combatRecord(root,request,"KRAKEN",mob.krakenHold.target,0,"release","La tentacule lâche sa prise sous les dégâts infligés au Kraken.");delete mob.krakenHold}}
 synchronizeKrakenStage(root,slot,request)
}
function tickKrakenHolds(root,request){
 for(const slot of COMBAT_MOBS){const mob=root.combat[slot];if(!isKrakenEncounter(mob))continue;synchronizeKrakenStage(root,slot,request);const hold=mob.krakenHold;if(!hold||(root.combat.turnState.round||1)<=hold.startedRound)continue
  const victim=root.characters[hold.target];let base=Math.round(calibratedHealth(mob.partyLevel)*(krakenStage(mob)===3?.08:.06));if(mob.attackMalus)base=Math.max(0,base-(mob.attackMalus.amount||0));if(mob.malus?.source==="La Sorcière")base=Math.round(base*combatWitchDamageFactor(root,mob));if(mob.krakenDisorientedActions>0)base=Math.round(base*.8)
  const damage=calibratedIncomingDamage(combatCharacter(root,hold.target),gmIncomingDamage(root,hold.target,gmOutgoingDamage(root,slot,base))),before=victim.hp;victim.hp=helPreventKO(root,request,hold.target,before,Math.max(0,before-damage))
  combatRecord(root,request,"ÉTREINTE",hold.target,before-victim.hp,"mob","L’étreinte du Kraken inflige "+(before-victim.hp)+" dégâts à "+heroDisplayName(hold.target))
  if(--hold.roundsLeft<=0||victim.hp<=0)delete mob.krakenHold
 }
}
function resolveKrakenRelease(root,request,dice){
 requireCombatTurn(root,request,request.actor)
 const mob=root.combat[request.payload?.target],hold=mob?.krakenHold
 if(!isKrakenEncounter(mob)||!hold||mob.hp<=0||root.characters?.[hold.target]?.hp<=0)throw Error("Aucun personnage à libérer de cette tentacule")
 if(root.combat.heroHaste)throw Error("Terminez les attaques de SKARO’H avant une assistance")
 const roll=dice(12),data=combatCharacter(root,request.actor),adjusted=calibratedHeroRoll(data,roll,12),threshold=hold.target===request.actor?8:7,cursed=data.cursedEffect==="critOnly"&&data.cursedCombatId===root.combat.id,success=roll!==1&&adjusted.total>=threshold&&(!cursed||roll===12),target=hold.target
 recordHeroCritical(root,request.actor,roll===12,roll===1);if(success)delete mob.krakenHold;nextCombatTurn(root,request)
 return {actor:request.actor,mode:"control",roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus,dice:12,crit:roll===12,fail:roll===1,success,message:heroDisplayName(request.actor)+(success?" libère ":" ne parvient pas à libérer ")+heroDisplayName(target)+" de la tentacule. Cette tentative consomme son action."}
}
function bossWeaknessNotes(name){
 if(name==="kraken")return [
  {id:"cannon",title:"Boulets de canon",hint:"Une tentacule exposée peut être frappée pendant la préparation.",strategy:"Valider un tir ou un impact lourd sur la tentacule.",effect:"Interrompt la spéciale annoncée et libère la cible saisie. Une fois par phase."},
  {id:"abyss",title:"Davy Jones et les pactes marins",hint:"Les références aux abysses maudites perturbent ses mouvements.",strategy:"Valider une diversion, un pacte ou une mise en scène convaincante.",effect:"Dégâts −20 % pendant ses deux prochaines attaques. Une fois par phase."},
  {id:"deck",title:"Terre ferme",hint:"Une tentacule immobilisée contre le pont perd son avantage.",strategy:"Valider un ancrage, un piège ou une manœuvre exposant la tentacule.",effect:"Les trois prochaines actions d’attaque de héros (hors cris) infligent +25 %. Une fois par phase."}
 ]
 const base=mobWeaknesses[name];return (Array.isArray(base)?base:base?[base]:[]).map((entry,index)=>({id:String(index),title:entry.title,hint:entry.text,strategy:"À arbitrer selon les jets et la stratégie des joueurs.",effect:"Utiliser Intervenir pour appliquer l’effet décidé par le MJ.",requiresDefeatedMob:entry.requiresDefeatedMob||null}))
}
function applyBossTactic(current,uid,combatId,revision,change,changeId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active")throw Error("Le combat ou la partie a changé")
 if(current.combat.gmAdjustmentLog?.[changeId])return current
 const root=combatClone(current),mob=root.combat[change.slot],note=mob&&bossWeaknessNotes(mob.name).find(note=>note.id===change.noteId),request={id:changeId,actor:"mj",uid,time:Date.now()}
 if(!COMBAT_MOBS.includes(change.slot)||!mob||mob.hp<=0||!note)throw Error("Choisissez un boss vivant et une faiblesse existante")
 if(note.requiresDefeatedMob&&!root.game?.defeatedMobs?.[note.requiresDefeatedMob])throw Error("Cette faiblesse exige la défaite de "+note.requiresDefeatedMob)
 let message
 if(change.kind==="reveal"){
  mob.revealedBossNotes||={};mob.revealedBossNotes[note.id]={title:note.title,text:note.hint};message=heroDisplayName(mob.name)+" — indice révélé : "+note.title+". "+note.hint
 }else if(change.kind==="apply"){
  if(!isKrakenEncounter(mob))throw Error("Appliquez l’effet choisi avec Intervenir")
  synchronizeKrakenStage(root,change.slot,request);if(change.stage!==krakenStage(mob))throw Error("La phase du Kraken a changé")
  const key=note.id+"-"+krakenStage(mob);mob.krakenTacticsUsed||={};if(mob.krakenTacticsUsed[key])throw Error("Cette faiblesse a déjà été exploitée pendant cette phase")
  if(note.id==="cannon"){if(!mob.chargingSpecial)throw Error("Le Kraken ne prépare pas de spéciale à interrompre");mob.krakenSpecialStageUsed=Math.max(mob.krakenSpecialStageUsed||0,mob.chargingSpecial.krakenStage||krakenStage(mob));delete mob.chargingSpecial;delete mob.krakenHold;mob.specialUsed=krakenSpecialUsed(mob)}
  if(note.id==="abyss")mob.krakenDisorientedActions=2
  if(note.id==="deck"){mob.krakenOpeningHits=3;delete mob.krakenOpeningRequest}
  mob.krakenTacticsUsed[key]=true;message="Stratégie validée par le MJ — "+note.title+" : "+note.effect
 }else throw Error("Commande inconnue")
 root.combat.gmAdjustmentLog||={};root.combat.gmAdjustmentLog[changeId]={time:request.time,text:message};Object.keys(root.combat.gmAdjustmentLog).slice(0,-80).forEach(id=>delete root.combat.gmAdjustmentLog[id]);recordConfirmedCombatAction(root,request,{mode:"control",message});return root
}
function resolveHelNidhoggCombatAction(root,request,pnj,action,dice){
 const c=root.combat,payload=request.payload||{},duo=pnj.id===HEL_NIDHOGG_DUO.id
 const slot=payload.target||(duo?helNidhoggAvailability(root).kingSlots[0]:livingMobs(c)[0])
 if(duo){const state=helNidhoggAvailability(root,slot);if(!state.allowed)throw Error(state.reason)}
 else if(!root.game?.allyDiscoveries?.nidhogg||root.game?.allyBreaks?.nidhogg)throw Error("Le MJ doit débloquer l’alliance avec Nidhogg")
 if(!livingMobs(c).includes(slot))throw Error("Choisissez un ennemi vivant")
 const roll=dice(20),crit=roll===20,fail=roll===1,mob=c[slot],limit=Math.floor(mob.maxHP*(duo?(crit?.30:.25):(crit?.50:.40)))
 let amount=0,explanation=""
 if(!fail){
  const power=duo?limit:c.balanceVersion===3?calibratedAllyDamage(pnj,action,roll,crit,false,mob.partyLevel||c.mob.partyLevel,2):Math.round((action.dmgBase+roll*action.dmgBonus)*(crit?2:1))
  amount=combatDamage(root,request,pnj.name,slot,Math.min(power,limit),"dmg",{damageCap:limit,ignoreNidhoggWound:duo})
  if(duo){if(mob.hp>0)mob.helDuoWeakened=true;explanation=(crit?"Critique : base de 30 %":"Base de 25 %")+" des PV maximum du Roi, sans multiplication supplémentaire, protections conservées. Sa prochaine attaque inflige 50 % de dégâts en moins, spéciale comprise."}
  else if(amount>0&&mob.hp>0){mob.nidhoggWound={percent:crit?25:15,expiresAfterRound:(c.turnState.round||1)+1};explanation="Morsure des racines : dégâts reçus +"+(crit?25:15)+" % jusqu’à la fin du prochain round ; non cumulable avec elle-même."+(crit?" Critique : dégâts ×2 avant protections et plafond de 50 % des PV maximum.":"")}
 }else explanation="Échec critique : aucun dégât ni effet. "+(duo?"Les interventions de Hel et Nidhogg":"L’intervention de Nidhogg")+" et l’action du héros sont consommées."
 c.usedAllies||={};for(const id of duo?["hel_reprieve","nidhogg_bite","hel_nidhogg_judgment"]:[action.id])c.usedAllies[id]=true
 delete root.game.playerAllyAccess
 nextCombatTurn(root,request)
 return {actor:request.actor,pnjId:pnj.id,actionId:action.id,attack:action.label,target:slot,targetName:heroDisplayName(mob.name),roll,dice:20,crit,fail,amount,mode:"ally",duo,interventionFailed:fail,explanation}
}
function recordKingVisual(root,request,slot,scene,message,extra={}){
 const id=(request.id||"king")+"-"+scene+"-"+slot,c=root.combat
 c.kingEvents||={};c.kingEvents[id]={id,combatId:c.id,time:Date.now(),scene,message,...extra}
 Object.keys(c.kingEvents).slice(0,-50).forEach(key=>delete c.kingEvents[key])
}
function summonKingSchnaw(root,slot,request){
 const king=root.combat[slot],state=king.king,c=root.combat
 while((state.minionsSummoned||0)<2){
  const target=COMBAT_MOBS.find(s=>s!==slot&&(!c[s]||c[s].hp<=0));if(!target)break
  const index=state.minionsSummoned||0,weak=index<(state.disruptions||0),mob=calibratedCombatMob("chnaw","high",king.partyLevel,3)
  const hp=Math.max(1,Math.round(calibratedPartyDamage(king.partyLevel)*(weak?.85:1.3)))
  c[target]={...mob,hp,maxHP:hp,baseBalancedHP:hp,actionsPerTurn:1,kingMinion:true,kingMaster:slot,kingRole:index===0?"isoler":"garde",damageGroupFactor:weak?.60:.85,x:king.x+(index?170:-170),y:king.y+80,slot:target}
  if(!Number.isFinite(c[target].x))c[target].x=index?750:350
  if(!Number.isFinite(c[target].y))c[target].y=260
  if(c.gmStates)delete c.gmStates[target]
  const entry={id:target,type:"mob",label:"SCHNAW — "+(index===0?"Chasseur":"Garde"),image:"chnaw.png",roll:1,bonus:0,total:1}
  const ts=c.turnState;if(ts){ts.participants=(ts.participants||[]).filter(p=>p.id!==target);ts.participants.push(entry);ts.order=(ts.order||[]).filter(p=>p.id!==target);ts.order.push(entry);ts.rolls||={};ts.rolls[target]=1;ts.currentIndex=Math.max(0,ts.order.findIndex(p=>p.id===ts.currentActorId))}
  state.minionsSummoned=index+1
  combatRecord(root,request,"ROI","Invocation",0,"control","Un Schnaw "+(weak?"affaibli par le rituel perturbé":"renforcé")+" rejoint la fin de l’initiative : "+hp+" PV, une action par tour.")
 }
}
function synchronizeKingStage(root,slot,request){
 const mob=root.combat?.[slot];if(!isKingEncounter(mob))return
 mob.king.specialsUsed||={};mob.king.auroras||={}
 if(mob.hp<=0){delete mob.chargingSpecial;return}
 const stage=kingStage(mob),before=mob.king.phase
 if(stage>before){
  delete mob.chargingSpecial
  for(let phase=before+1;phase<=stage;phase++){
   mob.king.phase=phase
   combatRecord(root,request,"ROI","Phase",0,"phase","Roi — phase "+phase+" / 5 : "+KING_PHASES[phase-1].name+". Aucun dégât ni tour supplémentaire gratuit.")
   recordKingVisual(root,request,slot,"phase-"+phase,KING_PHASES[phase-1].quote,{phase})
   if(phase===3)summonKingSchnaw(root,slot,request)
   if(phase===5){mob.chargingSpecial={id:(request.id||"king")+"-turn-around",name:"Turn Around",kingStage:5,readyRound:(root.combat.turnState?.round||1)+2};mob.king.refugesConfirmed=false;mob.king.refugeTargets=[]}
  }
 }
 if(stage>=3)summonKingSchnaw(root,slot,request)
 mob.specialUsed=kingSpecialUsed(mob)
}
function kingAfterDamage(root,request,slot){
 const mob=root.combat[slot]
 if(isKingEncounter(mob))synchronizeKingStage(root,slot,request)
 else if(mob?.kingMinion&&mob.hp<=0&&isKingEncounter(root.combat[mob.kingMaster]))synchronizeKingStage(root,mob.kingMaster,request)
}
function kingIncomingDamage(root,request,from,slot,amount){
 const mob=root.combat[slot];if(!isKingEncounter(mob))return amount
 if(COMBAT_MOBS.some(s=>root.combat[s]?.kingMaster===slot&&root.combat[s]?.kingRole==="garde"&&root.combat[s].hp>0)){
  amount=Math.round(amount*.8);combatRecord(root,request,"GARDE SCHNAW","ROI",0,"control","Le Schnaw garde réduit les dégâts reçus par le Roi de 20 %.")
 }
 if(request.kind==="hero"&&(mob.king.openingHits>0||mob.king.openingRequest===request.id)&&!["POISON","SAIGNEMENT"].includes(from)){
  if(mob.king.openingRequest!==request.id){mob.king.openingHits--;mob.king.openingRequest=request.id}
  amount=Math.round(amount*1.25)
 }
 return amount
}
function kingReactionReduction(mob,attack,id,reduction,charge){
 if(!isKingEncounter(mob))return reduction
 reduction=Math.max(reduction,charge?.kingShelter?.[id]||0)
 if(attack.kingStage===5){
  if(mob.king.odinInvoked)return 100
  if((mob.king.refugeTargets||[]).includes(id))reduction=Math.max(reduction,[25,60,85,100][kingAuroraCount(mob)])
 }
 return reduction
}
function kingGrantOpening(mob,hits=2){mob.king.openingHits=hits;delete mob.king.openingRequest}
function kingReleaseAurora(root,slot,index,actor,request){
 const mob=root.combat[slot]
 if(!isKingEncounter(mob)||mob.hp<=0||kingStage(mob)!==5||mob.chargingSpecial?.kingStage!==5||!Number.isInteger(index)||index<0||index>2)throw Error("Cette aurore n’est pas disponible")
 mob.king.auroras||={}
 if(mob.king.auroras[index])throw Error("Cette aurore est déjà libérée")
 mob.king.auroras[index]={actor,time:Date.now()}
 const message=heroDisplayName(actor)+" libère l’aurore "+(index+1)+" — "+kingAuroraCount(mob)+" / 3. Rejoignez les refuges ; le MJ valide les personnages protégés."
 combatRecord(root,request,"AURORES",actor,0,"control",message);return message
}
function kingInvokeOdin(root,slot,request){
 const mob=root.combat[slot];if(!kingOdinAvailable(mob))throw Error("Libérez les trois aurores avant d’appeler Odin, pendant Turn Around")
 mob.king.odinInvoked=true;mob.king.refugesConfirmed=true;mob.king.refugeTargets=livingHeroes(root)
 const betrayed=!!root.game?.allyBreaks?.odin
 const message=betrayed?"Ne prenez pas ma présence pour un pardon. Je ne viens pas pour vous. Je viens pour les aurores.":"Vous avez rendu leur liberté aux aurores. Ensemble, nous empêcherons leur extinction."
 combatRecord(root,request,"ODIN","AURORES",0,"control",message+" Turn Around sera entièrement arrêté pour le groupe, Bibi compris. L’alliance reste inchangée.")
 return message
}
function resolveKingOdinCall(root,request){
 const slot=request.payload?.slot,mob=root.combat?.[slot]
 if(root.combat.phase!=="active"||root.combat.turnState?.phase!=="active"||!COMBAT_CHARACTERS.includes(request.actor)||root.characters?.[request.actor]?.hp<=0)throw Error("Choisissez un personnage vivant dans ce combat")
 const message=kingInvokeOdin(root,slot,request)
 return {actor:request.actor,mode:"control",skipTurnBanner:true,message,kingScene:"odin",kingSlot:slot,kingLights:3}
}
function resolveKingSupport(root,request,dice){
 requireCombatTurn(root,request,request.actor)
 if(root.combat.heroHaste)throw Error("Terminez les attaques de SKARO’H avant une stratégie")
 const {target:slot,strategy,index}=request.payload,mob=root.combat[slot]
 if(!isKingEncounter(mob)||mob.hp<=0)throw Error("Choisissez le Roi vivant")
 mob.king.specialsUsed||={}
 let message,roll,adjusted,success=true
 if(strategy==="aurora")message=kingReleaseAurora(root,slot,index,request.actor,request)
 else{
  if(strategy==="drain"&&mob.chargingSpecial?.kingStage!==2)throw Error("Aucun drain à interrompre")
  if(strategy==="disrupt"&&(kingStage(mob)!==2||mob.king.disruptions>=2))throw Error("Le rituel des Schnaw ne peut plus être perturbé")
  if(!["drain","disrupt"].includes(strategy))throw Error("Stratégie inconnue")
  roll=dice(12);adjusted=calibratedHeroRoll(combatCharacter(root,request.actor),roll,12)
  const raw=root.characters[request.actor];success=roll!==1&&adjusted.total>=7&&(!(raw.cursedEffect==="critOnly"&&raw.cursedCombatId===root.combat.id)||roll===12)
  recordHeroCritical(root,request.actor,roll===12,roll===1)
  if(success){if(strategy==="drain"){delete mob.chargingSpecial;mob.king.specialsUsed[2]=true;mob.specialUsed=kingSpecialUsed(mob);kingGrantOpening(mob)}else mob.king.disruptions++}
  message=heroDisplayName(request.actor)+" — "+(strategy==="drain"?"interruption du drain":"perturbation du rituel des Schnaw")+" : "+(success?"réussite":"échec")+". Action consommée."+(success&&strategy==="drain"?" Aucun soin pour le Roi ; deux actions offensives de héros à +25 %.":"")
 }
 nextCombatTurn(root,request)
 return {actor:request.actor,mode:"control",message,success,...(roll?{roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus,dice:12,crit:roll===12,fail:roll===1}:{}),...(strategy==="aurora"?{kingScene:"aurora",kingRelease:true,kingLights:kingAuroraCount(mob)}:strategy==="drain"&&success?{kingScene:"blood",kingProtected:true}:{})}
}
function applyKingTactic(current,uid,combatId,revision,change,id){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId||current.combat.phase!=="active")throw Error("Le combat ou la session a changé")
 if(current.combat.gmAdjustmentLog?.[id])return current
 const root=combatClone(current),slot=change.slot,mob=root.combat[slot],request={id,uid,actor:"mj",time:Date.now()}
 if(!COMBAT_MOBS.includes(slot)||!isKingEncounter(mob)||mob.hp<=0||change.phase!==kingStage(mob))throw Error("La phase du Roi a changé")
 mob.king.specialsUsed||={};mob.king.auroras||={}
 let message,scene
 if(change.kind==="drain"){
  if(mob.chargingSpecial?.kingStage!==2||mob.chargingSpecial.id!==change.chargeId)throw Error("Ce drain n’est plus en préparation")
  delete mob.chargingSpecial;mob.king.specialsUsed[2]=true;mob.specialUsed=kingSpecialUsed(mob);kingGrantOpening(mob)
  message="Le MJ valide l’interruption du drain : aucun soin, deux actions offensives de héros à +25 %.";scene="blood"
 }else if(change.kind==="disrupt"){
  if(kingStage(mob)!==2||mob.king.disruptions>=2)throw Error("Les deux perturbations possibles sont déjà validées ou le rituel est terminé")
  mob.king.disruptions++;message="Le MJ valide la perturbation du rituel : un Schnaw arrivera affaibli."
 }else if(change.kind==="aurora"){message=kingReleaseAurora(root,slot,change.index,"mj",request);scene="aurora"}
 else if(change.kind==="odin"){message=kingInvokeOdin(root,slot,request);scene="odin"}
 else if(["pillar","refuges"].includes(change.kind)){
  const targets=change.targets;if(!Array.isArray(targets)||targets.length>4||new Set(targets).size!==targets.length||targets.some(a=>!COMBAT_CHARACTERS.includes(a)||root.characters?.[a]?.hp<=0))throw Error("Choisissez uniquement des personnages vivants")
  const charge=mob.chargingSpecial;if(!charge||charge.id!==change.chargeId)throw Error("L’attaque annoncée a changé")
  if(change.kind==="pillar"){
   if(charge.kingStage!==1||mob.king.pillars<=0||!targets.length)throw Error("Aucun pilier disponible contre cette Sentence")
   mob.king.pillars--;charge.kingShelter||={};targets.forEach(a=>charge.kingShelter[a]=100);message="Le pilier absorbera Sentence royale pour "+targets.map(heroDisplayName).join(", ")+". Pilier détruit ; "+mob.king.pillars+" restant(s)."
  }else{
   if(charge.kingStage!==5)throw Error("Les refuges sont réservés à Turn Around")
   mob.king.refugeTargets=targets;mob.king.refugesConfirmed=true;message="Refuges validés : "+(targets.map(heroDisplayName).join(", ")||"personne")+". "+kingAuroraCount(mob)+" aurore(s), protection "+[25,60,85,100][kingAuroraCount(mob)]+" % dans les refuges."
  }
 }else throw Error("Décision inconnue")
 root.combat.gmAdjustmentLog||={};root.combat.gmAdjustmentLog[id]={time:request.time,text:message};Object.keys(root.combat.gmAdjustmentLog).slice(0,-80).forEach(key=>delete root.combat.gmAdjustmentLog[key])
 recordConfirmedCombatAction(root,request,{mode:"control",message})
 if(scene)recordKingVisual(root,request,slot,scene,message,{lights:kingAuroraCount(mob),success:true,kingRelease:change.kind==="aurora"})
 return root
}

function applyKingSceneDismissal(current,uid,combatId,revision,sceneId){
 if(current?.roles?.[uid]!=="gm")throw Error("Action réservée au MJ")
 if(current.sessionControl?.phase||(current.sessionControl?.revision||"initial")!==revision||current.combat?.id!==combatId)throw Error("Le combat ou la session a changé")
 const c=current.combat
 const event=sceneId.startsWith("king-")?c.kingEvents?.[sceneId.slice(5)]:sceneId.startsWith("combat-")?c.visualEvents?.[sceneId.slice(7)]:null
 if(!event||!(event.phase||event.scene||event.result?.kingScene))throw Error("Fenêtre du Roi introuvable")
 const root=combatClone(current);root.combat.kingSceneDismissals||={};root.combat.kingSceneDismissals[sceneId]={time:Date.now(),uid}
 Object.keys(root.combat.kingSceneDismissals).slice(0,-150).forEach(key=>delete root.combat.kingSceneDismissals[key])
 return root
}
