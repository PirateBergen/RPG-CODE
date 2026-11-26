function createDraftMapNavigator({getDefinition,commit,onSelect,onCreateMap,onEditMap}) {
  const $=id=>document.getElementById(id);let regionId=null,editingId=null,currentPlace=null;const remembered=new Map()
  function render(locationId){
    const definition=getDefinition(),all=definition.locations || [],groups=[...(definition.mapGroups || [])];if(!groups.length||all.some(place=>!place.groupId))groups.push({id:'',name:groups.length?'À classer':'Cartes'})
    if(regionId===null){const prior=all.find(place=>place.id===locationId);regionId=prior?.groupId || groups[0]?.id || ''}if(!groups.some(group=>group.id===regionId))regionId=groups[0]?.id || ''
    const places=all.filter(place=>(place.groupId || '')===regionId);currentPlace=places.find(place=>place.id===locationId)||places.find(place=>place.id===remembered.get(regionId))||places[0]||null;if(currentPlace)remembered.set(regionId,currentPlace.id)
    $('prepRegions').replaceChildren();for(const [index,group]of groups.entries()){
      const button=document.createElement('button');button.type='button';button.id='prep-region-'+(group.id || 'unclassified');button.setAttribute('role','tab');button.setAttribute('aria-controls','prepRegionPanel');button.setAttribute('aria-selected',String(group.id===regionId));button.tabIndex=group.id===regionId?0:-1;button.textContent=group.name+' ('+all.filter(place=>(place.groupId || '')===group.id).length+')';button.addEventListener('click',()=>{regionId=group.id;onSelect(null)});button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%groups.length;if(event.key==='ArrowLeft')next=(index+groups.length-1)%groups.length;if(event.key==='Home')next=0;if(event.key==='End')next=groups.length-1;if(next!==undefined){event.preventDefault();regionId=groups[next].id;onSelect(null);$('prepRegions').querySelectorAll('button')[next]?.focus()}});$('prepRegions').append(button)
    }
    $('prepRegionPanel').setAttribute('aria-labelledby','prep-region-'+(regionId || 'unclassified'));$('prepRenameRegion').disabled=!regionId;$('prepDeleteRegion').disabled=!regionId
    $('prepMapGallery').replaceChildren();for(const place of places){const button=document.createElement('button'),label=document.createElement('span');button.type='button';button.className='prep-map-card';button.setAttribute('aria-label','Afficher la carte '+place.name);button.setAttribute('aria-pressed',String(place.id===currentPlace?.id));if(place.background){const image=document.createElement('img');image.src=place.background;image.alt='';image.loading='lazy';button.append(image)}else{const placeholder=document.createElement('span');placeholder.className='prep-map-placeholder';placeholder.textContent='Carte sans image';button.append(placeholder)}label.textContent=place.name;button.append(label);button.addEventListener('click',()=>{remembered.set(regionId,place.id);onSelect(place)});$('prepMapGallery').append(button)}
    $('prepRegionEmpty').hidden=places.length>0;$('prepEditMap').disabled=!currentPlace
    return currentPlace
  }
  function edit(group){editingId=group?.id || null;$('mapGroupName').value=group?.name || '';$('mapGroupError').textContent='';$('mapGroupDialog').showModal();$('mapGroupName').focus()}
  $('prepAddRegion').addEventListener('click',()=>edit(null));$('prepRenameRegion').addEventListener('click',()=>edit(getDefinition().mapGroups?.find(group=>group.id===regionId)))
  $('mapGroupCancel').addEventListener('click',()=>$('mapGroupDialog').close())
  $('mapGroupForm').addEventListener('submit',event=>{event.preventDefault();try{const group={id:editingId || 'region-'+crypto.randomUUID(),name:$('mapGroupName').value.trim()};commit(setDraftMapGroup(getDefinition(),group));regionId=group.id;$('mapGroupDialog').close();onSelect(null)}catch(e){$('mapGroupError').textContent=e.message}})
  $('prepDeleteRegion').addEventListener('click',()=>{if(!regionId||!window.confirm('Supprimer cet onglet ? Ses cartes seront conservées dans « À classer ».'))return;commit(removeDraftMapGroup(getDefinition(),regionId));regionId=null;onSelect(null)})
  $('prepCreateMap').addEventListener('click',()=>onCreateMap(regionId || ''));$('prepEditMap').addEventListener('click',()=>{if(currentPlace)onEditMap(currentPlace)})
  return {render,reveal(id){const place=getDefinition().locations?.find(place=>place.id===id);if(place)regionId=place.groupId || ''}}
}
