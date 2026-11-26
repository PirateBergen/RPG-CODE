// Validate static campaign content without reading or writing a session.
function isCampaignAssetPath(value, extensions) {
  return typeof value === "string" && !/[:\\\0?#]/.test(value) && !value.startsWith("/") && !value.split("/").some(part => !part || part === "." || part === "..") && extensions.includes(value.split(".").pop().toLowerCase())
}
function createCampaignWorld(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Catalogue des lieux invalide")
  const table = (value, music) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Table des lieux invalide")
    return Object.fromEntries(Object.entries(value).map(([image, content]) => {
      if (!isCampaignAssetPath(image, ["png", "jpg", "jpeg", "webp", "svg"]) || typeof content !== "string" || music && !isCampaignAssetPath(content, ["mp3", "wav", "ogg", "m4a"])) throw Error("Lieu ou musique invalide")
      return [image, content]
    }))
  }
  // Missing names/music and empty display labels retain their historical meaning.
  return Object.freeze({names:table(input.names, false), music:table(input.music, true)})
}
function createCampaignEnemies(input) {
  if (!input || !input.stats || typeof input.stats !== "object" || Array.isArray(input.stats)) throw Error("Bestiaire invalide")
  const stats = Object.fromEntries(Object.entries(input.stats).map(([id, value]) => {
    if (!id.trim() || ["__proto__", "constructor", "prototype"].includes(id) || !value || !["weak", "medium", "high", "boss"].includes(value.tier) || !Number.isFinite(value.baseHP) || value.baseHP <= 0) throw Error("Statistiques de monstre invalides")
    return [id, {tier:value.tier, baseHP:value.baseHP}]
  }))
  const group = value => {
    if (!Array.isArray(value) || new Set(value).size !== value.length || value.some(id => typeof id !== "string" || !Object.prototype.hasOwnProperty.call(stats, id))) throw Error("Catégorie de boss invalide")
    return [...value]
  }
  const worldBosses=group(input.worldBosses), classicBosses=group(input.classicBosses)
  if (worldBosses.some(id => classicBosses.includes(id))) throw Error("Catégories de boss incompatibles")
  return Object.freeze({stats, worldBosses, classicBosses})
}
