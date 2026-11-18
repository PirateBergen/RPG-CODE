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

