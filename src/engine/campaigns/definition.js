// Description de contenu uniquement : ni connexion, ni écriture de partie.
function createCampaignDefinition(input) {
  if (!input || input.schemaVersion !== 1) throw Error("Version de campagne inconnue")
  if (typeof input.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) throw Error("Identifiant de campagne invalide")
  if (typeof input.title !== "string" || !input.title.trim()) throw Error("Titre de campagne absent")
  if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 5000)) throw Error("Description invalide (5 000 caractères maximum)")
  if (!Array.isArray(input.characters) || !input.characters.length) throw Error("Personnages de campagne absents")
  const ids = new Set()
  const locations={}
  if(input.locations!==undefined){
    if(!Array.isArray(input.locations)||input.locations.length>200)throw Error('Liste des lieux invalide (200 maximum)')
    const locationIds=new Set()
    locations.locations=input.locations.map(place=>{
      if(!place||typeof place.id!=='string'||!/^lieu-[a-z0-9-]+$/.test(place.id)||locationIds.has(place.id))throw Error('Identifiant de lieu invalide ou dupliqué')
      locationIds.add(place.id)
      if(typeof place.name!=='string'||!place.name.trim()||place.name.length>120)throw Error('Nom de lieu invalide')
      if(!['region','city','village','wilderness','dungeon','building','other'].includes(place.type))throw Error('Type de lieu invalide')
      for(const key of ['description','gmNotes'])if(typeof place[key]!=='string'||place[key].length>5000)throw Error('Texte de lieu invalide (5 000 caractères maximum)')
      if(place.background!==undefined&&(typeof place.background!=='string'||place.background.length>1200000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(place.background)))throw Error('Image de fond invalide ou trop volumineuse')
      return {id:place.id,name:place.name,type:place.type,description:place.description,gmNotes:place.gmNotes,...(place.background!==undefined?{background:place.background}:{})}
    })
  }
  const characters = input.characters.map(character => {
    if (!character || typeof character.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(character.id) || ["constructor", "prototype", "__proto__", "mob", "mob2", "mob3"].includes(character.id) || ids.has(character.id)) throw Error("Identifiant de personnage invalide ou dupliqué")
    ids.add(character.id)
    if (typeof character.name !== "string" || !character.name.trim()) throw Error("Nom de personnage absent")
    if (!["hero", "companion"].includes(character.kind)) throw Error("Type de personnage inconnu")
    if (typeof character.portrait !== "string" || /[:\\]/.test(character.portrait) || character.portrait.startsWith("/") || character.portrait.split("/").some(part => !part || part === "." || part === "..") || !/\.(png|jpe?g|webp|svg)$/i.test(character.portrait)) throw Error("Portrait de personnage invalide")
    const build={}
    if(character.abilities!==undefined)build.abilities=createCampaignAbilities(character.abilities)
    for (const key of ['race','class','alignment']) if(character[key]!==undefined) {
      if(typeof character[key]!=='string'||character[key].length>100)throw Error('Identité de personnage invalide')
      build[key]=character[key]
    }
    if(character.customInfo!==undefined){
      if(!Array.isArray(character.customInfo)||character.customInfo.length>30||character.customInfo.some(item=>!item||typeof item.label!=='string'||!item.label.trim()||item.label.length>100||typeof item.value!=='string'||item.value.length>2000))throw Error('Informations personnalisées invalides')
      build.customInfo=character.customInfo.map(item=>({label:item.label,value:item.value}))
    }
    if(character.appearance!==undefined){
      if(!character.appearance||typeof character.appearance!=='object'||Array.isArray(character.appearance))throw Error('Images de personnage invalides')
      build.appearance={}
      for(const key of ['portrait','fullBody'])if(character.appearance[key]!==undefined){
        const value=character.appearance[key]
        if(typeof value!=='string'||value.length>400000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Image de personnage invalide ou trop volumineuse')
        build.appearance[key]=value
      }
    }
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
  const catalogs={...(input.bestiary!==undefined?{bestiary:createCampaignBestiary(input.bestiary)}:{}),...(input.world!==undefined?{world:createCampaignWorld(input.world)}:{}), ...(input.enemies!==undefined?{enemies:createCampaignEnemies(input.enemies)}:{})}
  return Object.freeze({schemaVersion:1, id:input.id, title:input.title, ...(input.description !== undefined ? {description:input.description} : {}), ...catalogs, ...content, ...locations, characters:Object.freeze(characters.map(character => Object.freeze(character)))})
}
