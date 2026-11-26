const ACTIVE_CAMPAIGN_RULES = createCampaignRuleSet("prophetie-des-mouches", {
  maxHp:helAdjustedMaxHP,
  equipmentState:()=>window.__balrogSword,
  equipmentModifiers:applyBalrogSwordEquipment
})
