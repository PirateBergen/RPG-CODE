function resolveHeroCombatAction(root, request, dice) {
  const actor = request.actor, payload = request.payload || {}, c = root.combat
  requireCombatTurn(root, request, actor)
  if(payload.support==="krakenRelease")return resolveKrakenRelease(root,request,dice)
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
    const amount = combatHeal(root, request, actor.toUpperCase(), payload.target, fail ? Math.max(4, Math.round(power * 0.45)) : crit ? power * (c.balanceVersion===3?1.6:2) : power)
    const explanation=crit?"Critique : soin multiplié par "+(c.balanceVersion===3?1.6:2)+" avant la limite des PV maximum.":fail?"Échec critique : soin réduit.":""
    nextCombatTurn(root, request)
    return { actor, attack: attack.name, roll,rollTotal:adjusted.total,luckBonus:adjusted.bonus, dice: max, crit, fail, amount, explanation, mode: "heal", special, target: payload.target, targetName: combatFriendlyName(payload.target).toUpperCase() }
  }
  let damage = fail ? 0 : power * (crit ? (c.balanceVersion===3?1.6:2) : 1), groupHeal = 0
  if(special&&c.balanceVersion===3){damage=calibratedSpecialDamage(actor,power,crit,fail);if(actor==="elo")groupHeal=fail?Math.round(calibratedHealth(data.lvl)*.025):Math.round(calibratedHealth(data.lvl)*.08*(crit?1.6:1))}
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
    consequences.push("Critique : dégâts multipliés par "+(c.balanceVersion===3?1.6:2)+" avant les autres bonus, protections et la limite des PV restants.")
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

