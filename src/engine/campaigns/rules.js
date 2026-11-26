// Trusted code adapters are separate from serializable, editable campaign content.
function createCampaignRuleSet(campaignId, handlers = {}) {
  if (typeof campaignId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(campaignId) || !handlers || typeof handlers !== "object" || Array.isArray(handlers)) throw Error("Règles de campagne invalides")
  for (const [name, handler] of Object.entries(handlers)) if (!["maxHp", "equipmentState", "equipmentModifiers"].includes(name) || typeof handler !== "function") throw Error("Branchement de campagne invalide")
  return Object.freeze({campaignId, handlers:Object.freeze({...handlers})})
}
function applyCampaignRule(name, args, fallback, rules = ACTIVE_CAMPAIGN_RULES, campaign = ACTIVE_CAMPAIGN) {
  if (rules.campaignId !== campaign.id || campaign.ruleSet && campaign.ruleSet !== rules.campaignId) throw Error("Les règles ne correspondent pas à la campagne")
  const handler=Object.prototype.hasOwnProperty.call(rules.handlers,name)?rules.handlers[name]:null
  if (!handler) return fallback
  const value=handler(...args)
  return value === undefined ? fallback : value
}
