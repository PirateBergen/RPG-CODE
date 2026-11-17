function _getFallbackMobSpecialAttack(mobName, mobTier) {
  const label = String(mobName || "créature").toUpperCase()
  if (mobTier === "boss") return { name:"Cataclysme de " + label, icon:"☄", dmgMin:22, dmgMax:36, effect:"all", animation:"abyss", flavor:"Le boss décide que la nuance n'est plus nécessaire." }
  if (mobTier === "high") return { name:"Signature maudite", icon:"✦", dmgMin:14, dmgMax:24, effect:"curse", animation:"arcane", flavor:"Une technique personnelle visiblement interdite dans plusieurs royaumes." }
  if (mobTier === "medium") return { name:"Montée en pression", icon:"💢", dmgMin:10, dmgMax:17, effect:null, animation:"stone", flavor:"Le combat prend soudain un ton bien moins raisonnable." }
  return { name:"Sale surprise", icon:"🗡", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Petit gabarit, mauvaises idées." }
}

function getMobSpecialAttack(mobName, mobTier) {
  const key = /^(?:(?:ju|yu|you)\s*pion|pika|you|yu)$/i.test(String(mobName || "").trim()) ? "ju pion" : String(mobName || "").toLowerCase()
  const attack = mobSpecialAttacks[key] || _getFallbackMobSpecialAttack(mobName, mobTier)
  return attack ? { ...attack, special:true, oncePerCombat:true } : null
}

function getMobAttacksForMob(mobName, mobTier) {
  const key = /^(?:(?:ju|yu|you)\s*pion|pika|you|yu)$/i.test(String(mobName || "").trim()) ? "ju pion" : String(mobName || "").toLowerCase()
  const attacks = mobAttackOverrides[key]
  if (attacks && attacks.length) return attacks.map(attack => ({ ...attack }))
  return (mobAttacks[mobTier] || mobAttacks.weak).map(attack => ({ ...attack }))
}

