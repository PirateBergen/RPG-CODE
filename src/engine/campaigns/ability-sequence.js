const CAMPAIGN_SEQUENCE_PHASES={preparation:'Préparation',launch:'Lancement',impact:'Impact'}
const CAMPAIGN_SEQUENCE_EFFECTS=['none','slash','projectile','fire','frost','lightning','heal','shield','smoke','swarm','beam','wave','explosion','mark']
function createCampaignAbilitySequence(input,kind) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Animation composée invalide')
  if(input.order!==undefined&&(!Array.isArray(input.order)||input.order.length!==3||new Set(input.order).size!==3||input.order.some(key=>!Object.hasOwn(CAMPAIGN_SEQUENCE_PHASES,key))))throw Error('Ordre des étapes invalide')
  const phases=Object.fromEntries(Object.keys(CAMPAIGN_SEQUENCE_PHASES).map(key=>{
    const phase=input[key]
    if(!phase||typeof phase.enabled!=='boolean'||!Number.isSafeInteger(phase.duration)||phase.duration<200||phase.duration>8000||!CAMPAIGN_SEQUENCE_EFFECTS.includes(phase.effect)||!/^#[a-f0-9]{6}$/i.test(phase.color)||!Number.isInteger(phase.size)||phase.size<25||phase.size>200||!['forward','reverse'].includes(phase.direction)||['darken','shake','flash'].some(field=>typeof phase[field]!=='boolean')||!Array.isArray(phase.images)||phase.images.length>3)throw Error('Réglages d’étape invalides')
    const images=phase.images.map(item=>{
      if(kind!=='special'||!item||typeof item.image!=='string'||item.image.length>600000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(item.image)||!['fade','left','right','rise'].includes(item.motion)||!['actor','center','target'].includes(item.position))throw Error('Image d’étape invalide')
      return {image:item.image,motion:item.motion,position:item.position}
    })
    return [key,{enabled:phase.enabled,duration:phase.duration,effect:phase.effect,color:phase.color,size:phase.size,direction:phase.direction,darken:phase.darken,shake:phase.shake,flash:phase.flash,images}]
  }))
  return {...phases,...(input.order?{order:[...input.order]}:{})}
}
