function heroDisplayName(id) { const text=pikaDisplayText(String(id || "").trim());return text==="Pika"?text:text.toUpperCase() }
function heroPortraitFile(id) { return ACTIVE_CAMPAIGN.characters.find(character => character.id === id)?.portrait || id + ".png" }
function migratePikaCharacter(character) {
  if (!character || character.buildVersion === "pika-bard-v1") return false
  const level = Math.max(1, parseInt(character.lvl, 10) || 1)
  const previous = getPlayerStatsAtLevel("ju", level, { base:{force:4,charme:5,perspi:7,chance:5,defense:4,hp:110,poids:100}, main:"perspi" })
  const next = getPlayerStatsAtLevel("ju", level)
  for (const stat of allStats) {
    const value = Number(character[stat])
    character[stat] = Math.max(0, (Number.isFinite(value) ? value : previous[stat]) + next[stat] - previous[stat])
  }
  const hp = Number(character.hp)
  character.hp = Number.isFinite(hp) ? (hp <= 0 ? 0 : Math.max(1, hp + next.hp - previous.hp)) : next.hp
  character.name = "Pika"; character.race = "Elfe"; character.class = "Barde"; character.gift = "Appétit abyssal"
  character.buildVersion = "pika-bard-v1"
  return true
}
function migratePikaRoot(root) {
  if (!root?.characters?.ju || root.characters.ju.buildVersion === "pika-bard-v1") return undefined
  const next = JSON.parse(JSON.stringify(root)); migratePikaCharacter(next.characters.ju)
  for (const key of ["participants", "order"]) for (const actor of next.combat?.turnState?.[key] || []) if (actor.id === "ju") actor.label = "Pika"
  return next
}

function pikaDisplayText(text) { return String(text || "").replace(/\b(?:(?:ju|yu|you)(?:[\s_-]*pion)?|yulian)\b/gi, "Pika") }


