// Stable public bindings while the rest of the engine is progressively decoupled.
// Keep the tables mutable, as with the original const-backed catalogs.
const mapNames = ACTIVE_CAMPAIGN.world?.names || {}
const mapMusic = ACTIVE_CAMPAIGN.world?.music || {}
const mobStats = ACTIVE_CAMPAIGN.enemies?.stats || {}
const WORLD_BOSS_NAMES = ACTIVE_CAMPAIGN.enemies?.worldBosses || []
const CLASSIC_BOSS_NAMES = ACTIVE_CAMPAIGN.enemies?.classicBosses || []
