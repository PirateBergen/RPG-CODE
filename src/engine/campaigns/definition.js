// Description de contenu uniquement : ni connexion, ni écriture de partie.
function createCampaignDefinition(input) {
  if (!input || input.schemaVersion !== 1) throw Error("Version de campagne inconnue")
  if (typeof input.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) throw Error("Identifiant de campagne invalide")
  if (typeof input.title !== "string" || !input.title.trim()) throw Error("Titre de campagne absent")
  if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 5000)) throw Error("Description invalide (5 000 caractères maximum)")
  if (!Array.isArray(input.characters) || !input.characters.length) throw Error("Personnages de campagne absents")
  const ids = new Set()
  const characters = input.characters.map(character => {
    if (!character || typeof character.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(character.id) || ["constructor", "prototype", "__proto__", "mob", "mob2", "mob3"].includes(character.id) || ids.has(character.id)) throw Error("Identifiant de personnage invalide ou dupliqué")
    ids.add(character.id)
    if (typeof character.name !== "string" || !character.name.trim()) throw Error("Nom de personnage absent")
    if (!["hero", "companion"].includes(character.kind)) throw Error("Type de personnage inconnu")
    if (typeof character.portrait !== "string" || /[:\\]/.test(character.portrait) || character.portrait.startsWith("/") || character.portrait.split("/").some(part => !part || part === "." || part === "..") || !/\.(png|jpe?g|webp|svg)$/i.test(character.portrait)) throw Error("Portrait de personnage invalide")
    const build={}
    if(character.stats!==undefined){
      const stats=copyCampaignContent(character.stats)
      if(!stats||typeof stats!=="object"||Array.isArray(stats)||["force","charme","perspi","chance","defense","hp","poids"].some(key=>!Number.isFinite(stats[key])||stats[key]<0)||stats.hp<=0)throw Error("Statistiques de personnage invalides")
      build.stats=Object.fromEntries(["force","charme","perspi","chance","defense","hp","poids"].map(key=>[key,stats[key]]))
    }
    if(character.mainStat!==undefined){if(!["force","charme","perspi","chance","defense"].includes(character.mainStat))throw Error("Statistique principale invalide");build.mainStat=character.mainStat}
    if(character.stats!==undefined&&character.mainStat===undefined)throw Error("Statistique principale absente")
    return {...build,id:character.id, name:character.name, kind:character.kind, portrait:character.portrait, ...(character.kind === "companion" ? {owner:character.owner} : {})}
  })
  const heroes = new Set(characters.filter(character => character.kind === "hero").map(character => character.id))
  if (!heroes.size) throw Error("La campagne doit définir un héros")
  for (const character of characters) if (character.kind === "companion" && !heroes.has(character.owner)) throw Error("Le compagnon doit appartenir à un héros de la campagne")
  if(input.ruleSet!==undefined&&(typeof input.ruleSet!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.ruleSet)))throw Error("Identifiant de règles invalide")
  const content={...(input.story!==undefined?{story:createCampaignStory(input.story,characters)}:{}), ...(input.ruleSet!==undefined?{ruleSet:input.ruleSet}:{}),...(input.attacks!==undefined?{attacks:createCampaignAttacks(input.attacks, characters)}:{}), ...(input.items!==undefined?{items:createCampaignItems(input.items)}:{}), ...(input.allies!==undefined?{allies:createCampaignAllies(input.allies)}:{})}
  const catalogs={...(input.world!==undefined?{world:createCampaignWorld(input.world)}:{}), ...(input.enemies!==undefined?{enemies:createCampaignEnemies(input.enemies)}:{})}
  return Object.freeze({schemaVersion:1, id:input.id, title:input.title, ...(input.description !== undefined ? {description:input.description} : {}), ...catalogs, ...content, characters:Object.freeze(characters.map(character => Object.freeze(character)))})
}
