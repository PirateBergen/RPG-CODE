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
    if(request.kind==="initiative"&&request.payload?.reactionId){
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

