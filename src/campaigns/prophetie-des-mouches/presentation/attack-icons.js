function getCombatAssetFromAttack(attack, mobData) {
  const type = String(attack?.type || "").toLowerCase()
  const effect = String(attack?.effect || "").toLowerCase()
  const name = String(attack?.name || "").toLowerCase()
  const animation = String(attack?.animation || "").toLowerCase()
  const mobName = String(mobData?.name || "").toLowerCase()

  if (animation === "bloodmoon" || mobName.includes("vampire")) return "fang.png"
  if (animation === "howl" || mobName.includes("loup") || mobName.includes("fenrir")) return "fang.png"
  if (animation === "fire" || name.includes("feu") || name.includes("braise")) return "fire.png"
  if (animation === "storm") return "arc.png"
  if (animation === "arcane" || animation === "witch" || type.includes("sort") || type.includes("magie") || type.includes("charme") || type.includes("analyse")) return "arcane.png"
  if (animation === "spectral" || animation === "abyss" || animation === "venom" || animation === "shadow") return "shadow.png"
  if (animation === "divine" || type.includes("soin") || name.includes("prêtre") || mobName.includes("pretre") || mobName.includes("valkyrie") || mobName.includes("odin") || mobName.includes("freya")) return "holy.png"
  if (effect === "curse") return "curse.png"
  if (effect === "all") return "impact_ring.png"
  if (type.includes("distance")) return "arc.png"
  if (type.includes("invocation")) return "rune_glow.png"
  if (type.includes("spécial") || type.includes("special")) return "impact_ring.png"
  if (type.includes("mêlée") || type.includes("melee") || name.includes("morsure") || name.includes("griffe") || name.includes("crocs")) return "claw.png"
  return "slash_overlay.png"
}

function createCombatIcon(attack, mobData, className) {
  const img = document.createElement("img")
  img.className = className || "combatIcon"
  img.src = "images/" + getCombatAssetFromAttack(attack, mobData)
  img.alt = ""
  img.onerror = () => { img.style.display = "none" }
  return img
}


