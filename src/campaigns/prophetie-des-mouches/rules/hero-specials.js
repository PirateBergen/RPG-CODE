function isPlayerSpecialConditionMet(playerId, specialAttack, context = {}) {
  if (!specialAttack) return false
  const rule = specialAttack.rule || ""
  if(rule==="ally_below_twenty")return pikaAllyInDanger(context.players||{},playerId)
  const mob = context.mob || null
  const charData = context.charData || {}
  const players = context.players || {}

  if (rule === "mob_below_half") {
    if (!mob) return false
    const hp = parseInt(mob.hp, 10) || 0
    const maxHP = Math.max(1, parseInt(mob.maxHP, 10) || hp || 1)
    return hp <= Math.ceil(maxHP * 0.5)
  }

  if (rule === "mob_below_forty") {
    if (!mob) return false
    const hp = parseInt(mob.hp, 10) || 0
    const maxHP = Math.max(1, parseInt(mob.maxHP, 10) || hp || 1)
    return hp <= Math.ceil(maxHP * 0.4)
  }

  if (rule === "after_spider_sense") {
    return hasPlayerCombatTrigger(playerId, "spiderSense")
  }

  if (rule === "mob_used_special") {
    return !!mob?.specialUsed
  }

  if (rule === "ally_below_sixty") {
    return ["greg","ju","elo","bibi"].some(id => {
      const ally = players[id]
      if (!ally) return false
      const hp = parseInt(ally.hp, 10) || 0
      const maxHP = getCharacterMaxHp(id, ally)
      return hp <= Math.ceil(maxHP * 0.6)
    })
  }

  if (rule === "self_below_seventy") {
    const hp = parseInt(charData.hp, 10) || 0
    const maxHP = getCharacterMaxHp(playerId, charData)
    return hp <= Math.ceil(maxHP * 0.7)
  }

  if (rule === "greg_below_twenty") {
    const greg = players.greg || {}
    const hp = parseInt(greg.hp, 10) || 0
    const maxHP = getCharacterMaxHp("greg", greg)
    return hp <= Math.ceil(maxHP * 0.2)
  }

  return false
}

function getPlayerLevelScaling(playerId, charData = null) {
  const source = charData || {}
  const lvl = Math.max(1, parseInt(source.lvl, 10) || 1)
  return {
    lvl,
    damageFlat: Math.max(0, (lvl - 1) * 2),
    supportFlat: Math.max(0, Math.floor((lvl - 1) * 1.5)),
    finisherFlat: Math.max(0, (lvl - 1) * 3)
  }
}

function applyPlayerSpecialModifiers(playerId, state) {
  const pid = String(playerId || "").toLowerCase()
  const next = { ...state }
  const scaling = getPlayerLevelScaling(playerId, state.charData)
  next.levelScaling = scaling
  next.failEffectText = ""

  if (pid === "greg") {
    next.damage += 14 + scaling.finisherFlat
    next.flatBonus += 14 + scaling.finisherFlat
    if ((state.mobHpRatio || 1) <= 0.25) {
      next.damage += 8
      next.flatBonus += 8
    }
    if (state.crit) {
      next.damage += 10 + scaling.supportFlat
      next.flatBonus += 10 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = 0
      next.flatBonus = 0
      next.failEffectText = "Greg vacille et rate sa fenêtre d'exécution."
    }
  } else if (pid === "ju") {
    next.damage += 10 + scaling.damageFlat
    next.flatBonus += 10 + scaling.damageFlat
    if (state.mobSpecialUsed) {
      next.damage += 6 + scaling.supportFlat
      next.flatBonus += 6 + scaling.supportFlat
    }
    if (state.crit) {
      next.damage += 4 + scaling.supportFlat
      next.flatBonus += 4 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = Math.max(0, Math.round(state.basePower * 0.4))
      next.flatBonus = 0
      next.failEffectText = "Le plan s'effondre et Pika dévoile trop tôt son jeu."
    }
  } else if (pid === "elo") {
    next.damage += 9 + scaling.damageFlat
    next.flatBonus += 9 + scaling.damageFlat
    next.groupHeal = 6 + (parseInt(state.charData?.charme, 10) || 0) + scaling.supportFlat
    if (state.anyAllyQuarterHp) next.groupHeal += 4
    if (state.crit) next.groupHeal *= 2
    if (state.fail) {
      next.damage = 0
      next.flatBonus = 0
      next.groupHeal = Math.max(3, Math.round((6 + scaling.supportFlat) * 0.5))
      next.failEffectText = "L'incantation se brise, mais un souffle d'espoir subsiste."
    }
  } else if (pid === "bibi") {
    next.damage += 12 + scaling.damageFlat
    next.flatBonus += 12 + scaling.damageFlat
    if (state.gregCriticalHp) {
      next.damage += 8 + scaling.supportFlat
      next.flatBonus += 8 + scaling.supportFlat
    }
    if (state.crit) {
      next.damage += 6 + scaling.supportFlat
      next.flatBonus += 6 + scaling.supportFlat
    }
    if (state.fail) {
      next.damage = Math.max(0, Math.round(state.basePower * 0.5))
      next.flatBonus = 0
      next.failEffectText = "Bibi part trop tôt et s'éparpille au lieu de mordre juste."
    }
  }

  return next
}

