// Campagne historique active. Changer de campagne et de stockage sera une étape distincte.
const ACTIVE_CAMPAIGN = createCampaignDefinition({
  schemaVersion:1,
  id:"prophetie-des-mouches",
  title:"La Prophétie des Mouches",
  world:{names:CAMPAIGN_MAP_NAMES, music:CAMPAIGN_MAP_MUSIC},
  enemies:{stats:CAMPAIGN_ENEMY_STATS, worldBosses:CAMPAIGN_WORLD_BOSSES, classicBosses:CAMPAIGN_CLASSIC_BOSSES},
  attacks:{heroes:CAMPAIGN_HERO_ATTACKS, heroSpecials:CAMPAIGN_HERO_SPECIALS, enemyTiers:CAMPAIGN_ENEMY_ATTACKS, enemyOverrides:CAMPAIGN_ENEMY_ATTACK_OVERRIDES, enemySpecials:CAMPAIGN_ENEMY_SPECIALS},
  items:{armory:CAMPAIGN_ARMORY_ITEMS, shop:CAMPAIGN_SHOP_ITEMS, categories:CAMPAIGN_ITEM_CATEGORIES},
  allies:CAMPAIGN_ALLIES,
  ruleSet:"prophetie-des-mouches",
  story:{introduction:CAMPAIGN_INTRODUCTION, curseChoices:CAMPAIGN_CURSE_CHOICES, odinVisions:CAMPAIGN_ODIN_VISIONS, runeDialogues:CAMPAIGN_RUNE_DIALOGUES, cemetery:{players:CAMPAIGN_CEMETERY_PLAYERS,maxTries:CAMPAIGN_CEMETERY_MAX_TRIES}},
  characters:[
    {id:"greg", name:"Greg", kind:"hero", portrait:"greg.png", stats:CAMPAIGN_BASE_STATS.greg, mainStat:CAMPAIGN_MAIN_STATS.greg},
    {id:"ju", name:"Pika", kind:"hero", portrait:"pika-token.svg", stats:CAMPAIGN_BASE_STATS.ju, mainStat:CAMPAIGN_MAIN_STATS.ju},
    {id:"elo", name:"Elo", kind:"hero", portrait:"elo.png", stats:CAMPAIGN_BASE_STATS.elo, mainStat:CAMPAIGN_MAIN_STATS.elo},
    {id:"bibi", name:"Bibi", kind:"companion", owner:"greg", portrait:"bibi.png", stats:CAMPAIGN_BASE_STATS.bibi, mainStat:CAMPAIGN_MAIN_STATS.bibi}
  ]
})
