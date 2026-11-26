function createCampaignNpcs(input) {
  if(!Array.isArray(input))throw Error('Liste de PNJ invalide')
  const ids=new Set()
  return input.map(npc=>{
    if(!npc||typeof npc.id!=='string'||!/^npc-[a-z0-9-]+$/.test(npc.id)||ids.has(npc.id)||typeof npc.name!=='string'||!npc.name.trim()||npc.name.length>120||typeof npc.description!=='string'||npc.description.length>5000)throw Error('Fiche de PNJ invalide')
    ids.add(npc.id)
    if(npc.image!==undefined&&(typeof npc.image!=='string'||npc.image.length>600000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(npc.image)))throw Error('Image de PNJ invalide')
    return {id:npc.id,name:npc.name,description:npc.description,...(npc.image?{image:npc.image}:{})}
  })
}
function draftStagingActor(definition,token){return (token.kind==='character'?definition.characters:token.kind==='enemy'?definition.bestiary:token.kind==='npc'?definition.npcs:token.kind==='ally'?definition.allies:[])?.find(actor=>actor.id===token.refId)}
function createCampaignStaging(input,definition) {
  if(!Array.isArray(input))throw Error('Préparation des cartes invalide')
  const maps=new Set(),ids=new Set()
  return input.map(board=>{
    if(!board||!definition.locations?.some(place=>place.id===board.locationId)||maps.has(board.locationId)||!Array.isArray(board.tokens)||board.tokens.length>200)throw Error('Carte de préparation invalide (200 pions maximum)')
    maps.add(board.locationId)
    return {locationId:board.locationId,tokens:board.tokens.map(token=>{
      if(!token||typeof token.id!=='string'||!/^token-[a-z0-9-]+$/.test(token.id)||ids.has(token.id)||!['character','enemy','npc','ally'].includes(token.kind)||typeof token.refId!=='string'||!Number.isFinite(token.x)||!Number.isFinite(token.y)||token.x<0||token.x>100||token.y<0||token.y>100)throw Error('Position ou identifiant de pion invalide')
      ids.add(token.id);const actor=draftStagingActor(definition,token)
      if(!actor)throw Error('Un pion référence une fiche introuvable. Retirez ce pion avant de supprimer sa fiche.')
      if(token.label!==undefined&&(typeof token.label!=='string'||token.label.length>100))throw Error('Nom de pion invalide')
      if(token.kind==='enemy'&&(!actor.variants.includes(token.variant)||!Number.isSafeInteger(token.level)||token.level<actor.baseLevel||token.level>1000))throw Error('Un pion utilise une catégorie ou un niveau devenu indisponible. Modifiez-le sur sa carte.')
      return {id:token.id,kind:token.kind,refId:token.refId,x:token.x,y:token.y,...(token.label?{label:token.label}:{}),...(token.kind==='enemy'?{variant:token.variant,level:token.level}:{})}
    })}
  })
}
function setDraftBoard(definition,locationId,tokens){const list=definition.staging || [];return createCampaignDefinition({...definition,staging:list.some(board=>board.locationId===locationId)?list.map(board=>board.locationId===locationId?{locationId,tokens}:board):[...list,{locationId,tokens}]})}
function withoutDraftActorTokens(definition,kind,refId){return definition.staging===undefined?{}:{staging:definition.staging.map(board=>({...board,tokens:board.tokens.filter(token=>token.kind!==kind||token.refId!==refId)}))}}
