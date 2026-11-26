const CAMPAIGN_GM_STEP_KINDS=['text','npc','image','sound','effect','clear']
const CAMPAIGN_GM_EFFECTS=['none','slash','projectile','fire','frost','lightning','heal','shield','smoke','swarm','beam','wave','explosion','mark']
function createCampaignGmActions(input,definition){
  if(!Array.isArray(input)||input.length>100)throw Error('100 boutons MJ maximum par campagne.')
  const ids=new Set()
  return input.map(action=>{
    if(!action||typeof action.id!=='string'||!/^event-[a-z0-9-]+$/.test(action.id)||ids.has(action.id)||typeof action.name!=='string'||!action.name.trim()||action.name.length>120)throw Error('Donnez un nom au bouton MJ (120 caractères maximum).')
    ids.add(action.id)
    if(!Array.isArray(action.locationIds)||new Set(action.locationIds).size!==action.locationIds.length||action.locationIds.some(id=>!definition.locations?.some(place=>place.id===id)))throw Error('Carte de bouton MJ introuvable ou dupliquée.')
    if(!Array.isArray(action.steps)||action.steps.length<1||action.steps.length>30)throw Error('Ajoutez de 1 à 30 étapes à votre bouton.')
    return {id:action.id,name:action.name.trim(),locationIds:[...action.locationIds],steps:action.steps.map(step=>{
      if(!step||!CAMPAIGN_GM_STEP_KINDS.includes(step.kind)||!['manual','auto'].includes(step.advance)||!Number.isFinite(step.delay)||step.delay<.2||step.delay>30)throw Error('Étape MJ invalide : délai de 0,2 à 30 secondes.')
      const result={kind:step.kind,advance:step.kind==='text'?'manual':step.advance,delay:step.delay}
      if(step.kind==='text'){if(typeof step.text!=='string'||!step.text.trim()||step.text.length>5000)throw Error('Écrivez le texte de votre étape (5 000 caractères maximum).');result.text=step.text}
      if(step.kind==='npc'){if(!definition.npcs?.some(npc=>npc.id===step.npcId))throw Error('Un bouton MJ utilise un PNJ introuvable. Modifiez son étape avant de retirer le PNJ.');result.npcId=step.npcId}
      if(step.kind==='sound'){if(!definition.audioTracks?.some(track=>track.id===step.audioId))throw Error('Un bouton MJ utilise un son introuvable. Modifiez son étape avant de retirer ce son.');if(!Number.isInteger(step.volume)||step.volume<0||step.volume>100)throw Error('Volume de son invalide.');result.audioId=step.audioId;result.volume=step.volume}
      if(step.kind==='image'){if(typeof step.image!=='string'||step.image.length>600000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(step.image))throw Error('Ajoutez une image à votre étape.');result.image=step.image}
      if(step.kind==='effect'){if(!CAMPAIGN_GM_EFFECTS.includes(step.effect)||typeof step.color!=='string'||!/^#[a-f0-9]{6}$/i.test(step.color)||![1,2,3].includes(step.intensity)||!Number.isFinite(step.duration)||step.duration<.2||step.duration>8||['darken','shake','flash'].some(key=>typeof step[key]!=='boolean'))throw Error('Réglages visuels invalides.');for(const key of ['effect','color','intensity','duration','darken','shake','flash'])result[key]=step[key]}
      return result
    })}
  })
}
