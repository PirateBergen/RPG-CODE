const CAMPAIGN_GM_STEP_KINDS=['text','npc','image','sound','effect','clear','health','combat','status']
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
      const result={kind:step.kind,advance:['text','health','combat','status'].includes(step.kind)?'manual':step.advance,delay:step.delay}
      if(step.kind==='text'){if(typeof step.text!=='string'||!step.text.trim()||step.text.length>5000)throw Error('Écrivez le texte de votre étape (5 000 caractères maximum).');result.text=step.text}
      if(step.kind==='npc'){if(!definition.npcs?.some(npc=>npc.id===step.npcId))throw Error('Un bouton MJ utilise un PNJ introuvable. Modifiez son étape avant de retirer le PNJ.');result.npcId=step.npcId}
      if(step.kind==='sound'){if(!definition.audioTracks?.some(track=>track.id===step.audioId))throw Error('Un bouton MJ utilise un son introuvable. Modifiez son étape avant de retirer ce son.');if(!Number.isInteger(step.volume)||step.volume<0||step.volume>100)throw Error('Volume de son invalide.');result.audioId=step.audioId;result.volume=step.volume}
      if(step.kind==='image'){if(typeof step.image!=='string'||step.image.length>600000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(step.image))throw Error('Ajoutez une image à votre étape.');result.image=step.image}
      if(step.kind==='effect'){if(!CAMPAIGN_GM_EFFECTS.includes(step.effect)||typeof step.color!=='string'||!/^#[a-f0-9]{6}$/i.test(step.color)||![1,2,3].includes(step.intensity)||!Number.isFinite(step.duration)||step.duration<.2||step.duration>8||['darken','shake','flash'].some(key=>typeof step[key]!=='boolean'))throw Error('Réglages visuels invalides.');for(const key of ['effect','color','intensity','duration','darken','shake','flash'])result[key]=step[key]}
      if(step.kind==='health'){
        if(!['damage','heal'].includes(step.operation)||!['points','percentMax'].includes(step.unit)||!Number.isFinite(step.amount)||step.amount<=0||step.amount>(step.unit==='percentMax'?100:1000000)||!['allHeroes','selected','allEnemies'].includes(step.target))throw Error('Choisissez les cibles et un montant positif de PV (pourcentage maximum : 100).')
        if(!Array.isArray(step.characterIds)||new Set(step.characterIds).size!==step.characterIds.length||step.characterIds.some(id=>!definition.characters.some(actor=>actor.id===id))||(step.target==='selected'&&!step.characterIds.length))throw Error('Choisissez au moins un personnage existant pour cet effet de PV.')
        Object.assign(result,{operation:step.operation,unit:step.unit,amount:step.amount,target:step.target,characterIds:step.target==='selected'?[...step.characterIds]:[]})
      }
      if(step.kind==='combat'){
        if(!Array.isArray(step.enemies)||!step.enemies.length||step.enemies.length>20)throw Error('Ajoutez au moins un ennemi à la rencontre (20 maximum).')
        let total=0;result.enemies=step.enemies.map(entry=>{const enemy=definition.bestiary?.find(item=>item.id===entry.enemyId);if(!enemy)throw Error('Un bouton utilise un ennemi introuvable. Modifiez sa rencontre avant de retirer cet ennemi.');resolveDraftEnemy(enemy,entry.variant,entry.level);if(!Number.isSafeInteger(entry.count)||entry.count<1||entry.count>20)throw Error('Nombre d’ennemis invalide (1 à 20).');total+=entry.count;return {enemyId:entry.enemyId,variant:entry.variant,level:entry.level,count:entry.count}});if(total>20)throw Error('20 ennemis maximum par rencontre.')
      }
      if(step.kind==='status')Object.assign(result,createCampaignStatusStep(step,definition))
      return result
    })}
  })
}
