// Authoring data only; no execution or writes to a played campaign.
function createCampaignAbilities(input) {
  if(!Array.isArray(input))throw Error('Liste de capacités invalide')
  const ids=new Set()
  return input.map(a=>{
    if(!a||typeof a.id!=='string'||!/^ability-[a-z0-9-]+$/.test(a.id)||ids.has(a.id))throw Error('Identifiant de capacité invalide ou dupliqué')
    ids.add(a.id)
    if(!['normal','special'].includes(a.kind)||typeof a.name!=='string'||!a.name.trim()||a.name.length>120||typeof a.description!=='string'||a.description.length>5000)throw Error('Nom ou description de capacité invalide')
    if(!['damage','heal','protection','effect'].includes(a.type)||![4,6,8,10,12,20,100].includes(a.dice)||!['force','charme','perspi','chance','defense','none'].includes(a.stat)||!['enemy','ally','self','allEnemies','allAllies'].includes(a.target))throw Error('Paramètres de capacité invalides')
    for(const key of ['powerMin','powerMax','cooldown','uses'])if(!Number.isSafeInteger(a[key])||a[key]<0||a[key]>1000000)throw Error('Valeur de capacité invalide')
    if(a.powerMax<a.powerMin)throw Error('La puissance maximum doit être supérieure ou égale au minimum.')
    const e=a.effect,v=a.visual
    if(!e||!['none','damageReduction','damageBoost','poison','stun'].includes(e.kind)||!Number.isSafeInteger(e.value)||e.value<0||e.value>100||!Number.isSafeInteger(e.turns)||e.turns<0||e.turns>100)throw Error('Effet de capacité invalide')
    if(e.kind!=='none'&&e.turns<1)throw Error('Précisez la durée de l’effet (au moins un tour).')
    if(!v||!['slash','projectile','fire','frost','lightning','heal','shield','smoke','swarm'].includes(v.preset)||!/^#[a-f0-9]{6}$/i.test(v.color)||![1,2,3].includes(v.intensity))throw Error('Visuel de capacité invalide')
    if(v.image!==undefined&&(a.kind!=='special'||typeof v.image!=='string'||v.image.length>600000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(v.image)))throw Error('Image de spéciale invalide')
    const extra={}
    if(a.announcement!==undefined){
      if(!a.announcement||!['auto','custom','none'].includes(a.announcement.mode)||typeof a.announcement.text!=='string'||a.announcement.text.length>1000)throw Error('Annonce de capacité invalide')
      extra.announcement={mode:a.announcement.mode,text:a.announcement.text}
    }
    if(a.progression!==undefined){
      if(!Array.isArray(a.progression))throw Error('Paliers de capacité invalides')
      const levels=new Set()
      extra.progression=a.progression.map(tier=>{
        if(!tier||!Number.isSafeInteger(tier.level)||tier.level<2||tier.level>1000||levels.has(tier.level))throw Error('Chaque palier doit avoir un niveau distinct, entre 2 et 1 000.')
        levels.add(tier.level)
        if(!Number.isSafeInteger(tier.powerMin)||!Number.isSafeInteger(tier.powerMax)||tier.powerMin<0||tier.powerMax<tier.powerMin||tier.powerMax>1000000||![1,2,3].includes(tier.intensity))throw Error('Puissance ou intensité de palier invalide')
        return {level:tier.level,powerMin:tier.powerMin,powerMax:tier.powerMax,intensity:tier.intensity}
      }).sort((a,b)=>a.level-b.level)
    }
    return {id:a.id,kind:a.kind,name:a.name,description:a.description,type:a.type,dice:a.dice,stat:a.stat,target:a.target,powerMin:a.powerMin,powerMax:a.powerMax,cooldown:a.cooldown,uses:a.uses,effect:{kind:e.kind,value:e.value,turns:e.turns},visual:{preset:v.preset,color:v.color,intensity:v.intensity,...(v.image?{image:v.image}:{}),...(v.sequence!==undefined?{sequence:createCampaignAbilitySequence(v.sequence,a.kind)}:{})},...extra}
  })
}
function resolveCampaignAbilityLevel(ability,level) {
  if(!Number.isSafeInteger(level)||level<1||level>1000)throw Error('Niveau de test invalide (1 à 1 000).')
  const base=createCampaignAbilities([ability])[0]
  const tier=base.progression?.filter(tier=>tier.level<=level).at(-1)
  return tier?{...base,powerMin:tier.powerMin,powerMax:tier.powerMax,visual:{...base.visual,intensity:tier.intensity}}:base
}
function campaignAbilityAnnouncement(ability,characterName) {
  if(ability.announcement?.mode==='none')return ''
  const automatic=characterName+' lance '+ability.name+' !'
  if(ability.announcement?.mode!=='custom'||!ability.announcement.text.trim())return automatic
  return ability.announcement.text.replace(/\{(personnage|attaque)\}/g,(_,key)=>key==='personnage'?characterName:ability.name)
}
