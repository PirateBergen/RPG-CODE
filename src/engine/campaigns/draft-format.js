// Draft exchange only: references media, does not bundle assets or save a played session.
function exportCampaignDraft(definition) {
  const content=createCampaignDefinition(definition)
  const text=JSON.stringify({format:"rpg-campaign-draft",version:1,media:"references",definition:content},null,2)
  if(text.length>8*1024*1024)throw Error("Brouillon trop volumineux")
  return text
}
function importCampaignDraft(text) {
  if(typeof text!=="string" || text.length>8*1024*1024) throw Error("Fichier de brouillon invalide ou trop volumineux")
  let packet
  try{packet=JSON.parse(text)}catch(error){throw Error("Le brouillon ne contient pas un JSON valide")}
  if(!packet || packet.format!=="rpg-campaign-draft" || packet.version!==1 || packet.media!=="references")throw Error("Format ou version de brouillon non pris en charge")
  return createCampaignDefinition(packet.definition)
}
