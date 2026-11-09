"use strict"

function explorationPosition(value) {
  const x=Number(value?.x),y=Number(value?.y)
  if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error("Position invalide")
  return {x:Math.max(-5000,Math.min(5000,Math.round(x))),y:Math.max(-5000,Math.min(5000,Math.round(y))),facing:value.facing===1?1:0}
}
function explorationBibiPosition(current,position,manual=false) {
  if(!manual && current?.followGreg===false)return undefined
  return {...(current||{}),...explorationPosition(position),...(manual?{followGreg:false}:{})}
}
function nextSpellPlayer(spell) {
  return SPELL_PLAYERS.map((_,i)=>SPELL_PLAYERS[((spell.turnIdx||0)+i)%SPELL_PLAYERS.length]).find(p=>!(spell.freed_players||[]).includes(p)&&(spell.tries?.[p]||0)<SPELL_MAX_TRIES)||null
}
function reduceExplorationRequest(current,id,seed) {
  const queued=current?.explorationRequests?.[id]
  if(!queued || queued.status!=="queued")return undefined
  const root=combatClone(current),request=root.explorationRequests[id],now=typeof reliableActionNow==="function"?reliableActionNow():Date.now()
  try{
    if(typeof validateReliableRequest==="function")validateReliableRequest(root,request)
    if(root.sessionControl?.phase)throw new Error("La partie est en cours de synchronisation")
    if(!Number.isFinite(request.time)||now-request.time>120000)throw new Error("Cette demande a expiré")
    if(!(request.kind==="dice"&&root.roles?.[request.uid]==="gm")&&(!SPELL_PLAYERS.includes(request.actor)||(root.roles?.[request.uid]!=="gm"&&root.profiles?.[request.uid]?.playerId!==request.actor)))throw new Error("Ce héros ne vous appartient pas")
    root.game ||= {}
    let result
    if(request.kind==="relic"){result=resolveBalrogSwordRequest(root,request)}else if(request.kind==="dice"){
      const max=Number(request.payload?.max);if(![4,6,8,10,12,20,100].includes(max))throw Error("Dé invalide")
      const roll=combatRandom(seed)(max),stat=request.payload?.stat
      if(stat&&!['force','charme','perspi','chance','defense'].includes(stat))throw Error("Statistique invalide")
      const value=stat?combatInt(getEffectiveCharacterData(request.actor,root.characters?.[request.actor]||{})[stat]):0
      recordHeroCritical(root,request.actor,roll===max,roll===1);root.diceRoll||={};root.diceRoll[id]={player:request.actor,dice:max,result:roll+value,...(stat?{rawRoll:roll}:{}),time:now,sender:request.actor}
      const entries=Object.keys(root.diceRoll);entries.slice(0,Math.max(0,entries.length-80)).forEach(key=>delete root.diceRoll[key]);result={mode:"dice",roll,dice:max}
    }else if(request.kind==="book"){
      const book=root.game.mapLoreBook,entry=MAP_LORE_BOOK_ENTRIES[book?.id]
      if(!book?.active || book.claimedBy || !entry || book.id!==request.payload?.bookId || book.time!==request.payload?.bookTime || book.map!==root.game.map)throw new Error("Ce livre n’est plus disponible")
      if(root.game.readLoreBooks?.[book.id])throw new Error("Ce livre a déjà été lu")
      const character=root.characters?.[request.actor]
      if(!character || character.hp<=0)throw new Error("Ce héros ne peut pas ouvrir le livre")
      book.claimedBy=request.actor;book.claimedAt=now;book.active=false
      root.game.readLoreBooks ||= {};root.game.readLoreBooks[book.id]=true
      if(entry.reward){const stat=entry.reward.stat;character[stat]=Math.min(stat==="curse"?8:999,Math.max(0,combatInt(character[stat]))+entry.reward.amount)}
      result={mode:"book",book:combatClone(book),actor:request.actor}
    } else if(request.kind==="hint"){
      const element=root.elements?.[request.payload?.elementId],challenge=root.game.runeChallenge
      if(!element?.isRune||!element.clickable||!challenge?.active||!runeHints.some(h=>h.id===element.runeHint))throw new Error("Ce fragment n’est plus disponible")
      challenge.unlockedHints ||= [];if(!challenge.unlockedHints.includes(element.runeHint))challenge.unlockedHints.push(element.runeHint)
      delete root.elements[request.payload.elementId]
      result={mode:"hint",hintId:element.runeHint,actor:request.actor}
    } else if(request.kind==="spell"){
      const spell=root.game.cemeterySpell
      if(!spell?.active || !spell.glipheShown || spell.freed || spell.time!==request.payload?.eventTime || combatInt(spell.revision)!==combatInt(request.payload?.revision))throw new Error("Cette épreuve a changé")
      if(nextSpellPlayer(spell)!==request.actor)throw new Error("Ce n’est pas votre tour")
      const roll=combatRandom(seed)(20),crit=roll===20,fail=roll===1
      recordHeroCritical(root,request.actor,crit,fail)
      spell.tries ||= {};spell.tries[request.actor]=(spell.tries[request.actor]||0)+1
      spell.freed_players ||= [];if(crit&&!spell.freed_players.includes(request.actor))spell.freed_players.push(request.actor)
      if(fail)root.characters[request.actor].hp=Math.max(0,(root.characters[request.actor].hp||0)-10)
      spell.turnIdx=(SPELL_PLAYERS.indexOf(request.actor)+1)%SPELL_PLAYERS.length
      spell.revision=combatInt(spell.revision)+1
      if(!nextSpellPlayer(spell)){
        spell.freed=true;spell.failedByZombie=spell.freed_players.length===0
        if(spell.failedByZombie)spell.encounter=combatRandom(seed+1)(2)===1?"zombie":"zombie2"
        root.game.completedEvents ||= {};root.game.completedEvents.cemetery=true
      }
      result={mode:"spell",actor:request.actor,roll,crit,fail,eventTime:spell.time,finished:!!spell.freed,failedByZombie:!!spell.failedByZombie}
    } else throw new Error("Demande inconnue")
    request.status="done";request.result=result
    root.game.explorationEvents ||= {};root.game.explorationEvents[id]={id,time:now,result}
    const old=Object.entries(root.game.explorationEvents).sort((a,b)=>a[1].time-b[1].time)
    old.slice(0,Math.max(0,old.length-120)).forEach(([key])=>delete root.game.explorationEvents[key])
    return root
  }catch(error){const unchanged=combatClone(current);unchanged.explorationRequests[id]={...queued,status:"failed",error:error.message};return unchanged}
}
