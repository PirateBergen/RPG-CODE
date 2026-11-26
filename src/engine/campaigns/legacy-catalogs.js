// Stable public bindings while the rest of the engine is progressively decoupled.
// Keep the tables mutable, as with the original const-backed catalogs.
const mapNames = ACTIVE_CAMPAIGN.world?.names || {}
const mapMusic = ACTIVE_CAMPAIGN.world?.music || {}
const mobStats = ACTIVE_CAMPAIGN.enemies?.stats || {}
const WORLD_BOSS_NAMES = ACTIVE_CAMPAIGN.enemies?.worldBosses || []
const CLASSIC_BOSS_NAMES = ACTIVE_CAMPAIGN.enemies?.classicBosses || []

const attacks = ACTIVE_CAMPAIGN.attacks?.heroes || {}
const playerSpecialAttacks = ACTIVE_CAMPAIGN.attacks?.heroSpecials || {}
const mobAttacks = ACTIVE_CAMPAIGN.attacks?.enemyTiers || {}
const mobAttackOverrides = ACTIVE_CAMPAIGN.attacks?.enemyOverrides || {}
const mobSpecialAttacks = ACTIVE_CAMPAIGN.attacks?.enemySpecials || {}
const shopItemsArmurerie = ACTIVE_CAMPAIGN.items?.armory || []
const shopItems = ACTIVE_CAMPAIGN.items?.shop || []
const categoryLabels = ACTIVE_CAMPAIGN.items?.categories || {}
const ALLY_PNJS = ACTIVE_CAMPAIGN.allies || []

const dialogue = ACTIVE_CAMPAIGN.story?.introduction || []
const curseWheelChoices = ACTIVE_CAMPAIGN.story?.curseChoices || []
const ODIN_VISIONS = ACTIVE_CAMPAIGN.story?.odinVisions || []
const runeEventDialogues = ACTIVE_CAMPAIGN.story?.runeDialogues || []
const SPELL_PLAYERS = ACTIVE_CAMPAIGN.story?.cemetery?.players || []
const SPELL_MAX_TRIES = ACTIVE_CAMPAIGN.story?.cemetery?.maxTries ?? 0

const playerBaseStats = Object.fromEntries(ACTIVE_CAMPAIGN.characters.filter(character=>character.stats).map(character=>[character.id,character.stats]))
const playerMainStat = Object.fromEntries(ACTIVE_CAMPAIGN.characters.filter(character=>character.mainStat).map(character=>[character.id,character.mainStat]))
