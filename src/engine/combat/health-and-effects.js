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
  if(isJormungandr(target)){
    const origin=root.game?.combatState?.returnMap||root.game?.map
    if(!options.thorMjolnir||!isForchurMap(origin)||Math.max(0,combatInt(before))<=0){
      combatRecord(root,request,from,heroDisplayName(target.name),0,type,"Jörmungandr est invulnérable à cette attaque.");return 0
    }
    target.hp=0;target.defeatedByThor=true
  }else target.hp = Math.max(0, before - Math.max(0,combatInt(gmIncomingDamage(root,slot,["POISON","SAIGNEMENT"].includes(from)?amount:gmOutgoingDamage(root,request.kind==="hero"&&request.payload?.attack==="Le Bibi"?"bibi":request.actor,amount)))))
  combatRecord(root, request, from, heroDisplayName(target.name).toUpperCase(), before - target.hp, type, from + " → " + heroDisplayName(target.name).toUpperCase() + " : -" + (before - target.hp) + " PV ("+before+" → "+target.hp+" / "+target.maxHP+")"+(target.hp<=0?" — KO":""))
  krakenAfterDamage(root,request,slot,before-target.hp)
  return before - target.hp
}

function combatOutcome(root,request){
 if(root.characters?.bibi?.hp<=0)for(const slot of COMBAT_MOBS)if(root.combat[slot])delete root.combat[slot].bibiRage
 if(root.combat.eloSummon?.hp<=0)delete root.combat.eloSummon
 if(root.combat.phase==="finished")return true
 if(!livingHeroes(root).length){sealCombatOutcome(root,"defeat",request);return true}
 if(!livingMobs(root.combat).length){sealCombatOutcome(root,"victory",request);return true}
 return false
}

