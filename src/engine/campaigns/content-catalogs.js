// Copy declarative content without executing it or changing any session data.
function copyCampaignContent(value, parents = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (!value || typeof value !== "object" || parents.has(value) || !Array.isArray(value) && Object.prototype.toString.call(value) !== "[object Object]") throw Error("Contenu de campagne non sérialisable")
  parents.add(value)
  let result
  if (Array.isArray(value)) result=value.map(item => copyCampaignContent(item, parents))
  else result=Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw Error("Clé de contenu interdite")
    return [key, copyCampaignContent(item, parents)]
  }))
  parents.delete(value)
  return result
}
function campaignContentRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Table de contenu invalide")
  return Object.entries(value)
}
function campaignContentText(value) { return typeof value === "string" && !!value.trim() }
function validateCampaignAttack(value) {
  if (!value || !campaignContentText(value.name)) throw Error("Nom d’attaque absent")
  if (value.dice !== undefined && ![4,6,8,10,12,20,100].includes(value.dice)) throw Error("Dé d’attaque invalide")
  if (value.dmgMin !== undefined || value.dmgMax !== undefined) {
    if (!Number.isFinite(value.dmgMin) || !Number.isFinite(value.dmgMax) || value.dmgMin < 0 || value.dmgMax < value.dmgMin) throw Error("Dégâts d’attaque invalides")
  }
}
function createCampaignAttacks(input, characters) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Catalogue d’attaques invalide")
  const ids=new Set(characters.map(character => character.id)), result=copyCampaignContent(input)
  for (const key of ["heroes", "heroSpecials", "enemyTiers", "enemyOverrides", "enemySpecials"]) {
    for (const [id, value] of campaignContentRecord(result[key])) {
      if (!campaignContentText(id) || ["heroes", "heroSpecials"].includes(key) && !ids.has(id)) throw Error("Personnage d’attaque inconnu")
      if (key === "enemyTiers" && !["weak", "medium", "high", "boss"].includes(id)) throw Error("Niveau d’attaque ennemi inconnu")
      if (["heroSpecials", "enemySpecials"].includes(key)) validateCampaignAttack(value)
      else {
        if (!Array.isArray(value) || !value.length) throw Error("Liste d’attaques invalide")
        value.forEach(validateCampaignAttack)
        if (new Set(value.map(attack => attack.name)).size !== value.length) throw Error("Noms d’attaques dupliqués")
      }
    }
  }
  return Object.freeze(result)
}
function createCampaignItems(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Catalogue d’objets invalide")
  const result=copyCampaignContent(input)
  for (const [id, label] of campaignContentRecord(result.categories)) if (!campaignContentText(id) || typeof label !== "string") throw Error("Catégorie d’objet invalide")
  for (const key of ["armory", "shop"]) {
    if (!Array.isArray(result[key])) throw Error("Boutique invalide")
    const ids=new Set()
    for (const item of result[key]) {
      if (!item || !campaignContentText(item.id) || ids.has(item.id) || !campaignContentText(item.name) || !isCampaignAssetPath(item.img,["png","jpg","jpeg","webp","svg"]) || !Object.prototype.hasOwnProperty.call(result.categories,item.category) || !Number.isFinite(item.basePrix) || item.basePrix < 0 || !Number.isFinite(item.scaling) || item.scaling < 0) throw Error("Objet de boutique invalide")
      ids.add(item.id)
    }
  }
  return Object.freeze(result)
}
function createCampaignAllies(input) {
  if (!Array.isArray(input)) throw Error("Catalogue d’alliés invalide")
  const result=copyCampaignContent(input), ids=new Set(), actions=new Set()
  for (const ally of result) {
    if (!ally || !campaignContentText(ally.id) || ids.has(ally.id) || !campaignContentText(ally.name) || !isCampaignAssetPath(ally.image,["png","jpg","jpeg","webp","svg"]) || !Array.isArray(ally.actions) || !ally.actions.length) throw Error("Allié invalide")
    ids.add(ally.id)
    for (const action of ally.actions) {
      if (!action || !campaignContentText(action.id) || actions.has(action.id) || !campaignContentText(action.label) || !["damage","heal","buff","malus"].includes(action.type) || ![4,6,8,10,12,20,100].includes(action.dice)) throw Error("Capacité d’allié invalide")
      actions.add(action.id)
    }
  }
  return result
}
