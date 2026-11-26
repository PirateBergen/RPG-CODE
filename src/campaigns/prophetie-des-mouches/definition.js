// Campagne historique active. Changer de campagne et de stockage sera une étape distincte.
const ACTIVE_CAMPAIGN = createCampaignDefinition({
  schemaVersion:1,
  id:"prophetie-des-mouches",
  title:"La Prophétie des Mouches",
  characters:[
    {id:"greg", name:"Greg", kind:"hero", portrait:"greg.png"},
    {id:"ju", name:"Pika", kind:"hero", portrait:"pika-token.svg"},
    {id:"elo", name:"Elo", kind:"hero", portrait:"elo.png"},
    {id:"bibi", name:"Bibi", kind:"companion", owner:"greg", portrait:"bibi.png"}
  ]
})
