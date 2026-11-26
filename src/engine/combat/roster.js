// Le moteur reçoit ses personnages de la définition de la campagne.
const COMBAT_HEROES = ACTIVE_CAMPAIGN.characters.filter(character => character.kind === "hero").map(character => character.id)
const COMBAT_MOBS = ["mob", "mob2", "mob3"]
const COMBAT_CHARACTERS = [...COMBAT_HEROES, ...ACTIVE_CAMPAIGN.characters.filter(character => character.kind === "companion").map(character => character.id)]
