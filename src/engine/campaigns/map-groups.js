function createCampaignMapGroups(input){
  if(!Array.isArray(input)||input.length>100)throw Error('Liste des onglets de cartes invalide (100 maximum)')
  const ids=new Set(),names=new Set()
  return input.map(group=>{if(!group||typeof group.id!=='string'||!/^region-[a-z0-9-]+$/.test(group.id)||ids.has(group.id)||typeof group.name!=='string'||!group.name.trim()||group.name.length>120||names.has(group.name.trim().toLocaleLowerCase('fr')))throw Error('Nom d’onglet absent ou déjà utilisé');ids.add(group.id);names.add(group.name.trim().toLocaleLowerCase('fr'));return {id:group.id,name:group.name.trim()}})
}
function setDraftMapGroup(definition,group){const list=definition.mapGroups || [];return createCampaignDefinition({...definition,mapGroups:list.some(item=>item.id===group.id)?list.map(item=>item.id===group.id?group:item):[...list,group]})}
function removeDraftMapGroup(definition,id){return createCampaignDefinition({...definition,mapGroups:(definition.mapGroups || []).filter(group=>group.id!==id),...(definition.locations?{locations:definition.locations.map(place=>{if(place.groupId!==id)return place;const {groupId,...rest}=place;return rest})}:{})})}
function draftMapHeroTokens(definition,locationId){
  const saved=definition.staging?.find(board=>board.locationId===locationId)?.tokens || []
  return definition.characters.map((actor,index)=>saved.find(token=>token.kind==='character'&&token.refId===actor.id) || {id:'token-auto-'+Array.from(locationId+'|'+actor.id).map(letter=>letter.codePointAt(0).toString(16).padStart(2,'0')).join(''),kind:'character',refId:actor.id,x:15+(index%4)*23,y:35+(Math.floor(index/4)%3)*22})
}
