// Draft exchange only: references media, does not bundle assets or save a played session.
function exportCampaignDraft(definition) {
  const content=createCampaignDefinition(definition)
  const actors=[...content.characters,...(content.bestiary || [])]
  const embedded=actors.some(character=>Object.keys(character.appearance || {}).length)
  const media=content.locations?.some(place=>place.background)||actors.some(c=>c.abilities?.some(a=>a.visual.image||a.visual.sequence&&Object.keys(CAMPAIGN_SEQUENCE_PHASES).some(key=>a.visual.sequence[key].images.length)))?"references-and-images":embedded?"references-and-portraits":"references"
  const text=JSON.stringify({format:"rpg-campaign-draft",version:1,media,definition:content},null,2)
  if(text.length>8*1024*1024)throw Error("Brouillon trop volumineux")
  return text
}
function importCampaignDraft(text) {
  if(typeof text!=="string" || text.length>8*1024*1024) throw Error("Fichier de brouillon invalide ou trop volumineux")
  let packet
  try{packet=JSON.parse(text)}catch(error){throw Error("Le brouillon ne contient pas un JSON valide")}
  if(!packet || packet.format!=="rpg-campaign-draft" || packet.version!==1 || !["references","references-and-portraits","references-and-images"].includes(packet.media))throw Error("Format ou version de brouillon non pris en charge")
  return createCampaignDefinition(packet.definition)
}
