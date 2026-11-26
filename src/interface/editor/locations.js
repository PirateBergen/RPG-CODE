const DRAFT_LOCATION_TYPES={region:'Région',city:'Ville',village:'Village',wilderness:'Nature / extérieur',dungeon:'Donjon / souterrain',building:'Bâtiment / intérieur',other:'Autre'}
function setDraftLocation(definition,place) {
  const places=definition.locations || [], exists=places.some(item=>item.id===place.id)
  return createCampaignDefinition({...definition,locations:exists?places.map(item=>item.id===place.id?place:item):[...places,place]})
}
function removeDraftLocation(definition,id) {
  if(!definition.locations?.some(place=>place.id===id))throw Error('Lieu introuvable')
  return createCampaignDefinition({...definition,locations:definition.locations.filter(place=>place.id!==id)})
}
function createDraftLocationPanel({getDefinition,replaceDefinition,changed,message}) {
  const $=id=>document.getElementById(id),dialog=$('locationDialog')
  let selected=null,background=null,generation=0,sequence=0,pending=0
  function preview() {
    $('locationBackgroundPreview').hidden=!background
    if(background)$('locationBackgroundPreview').src=background;else $('locationBackgroundPreview').removeAttribute('src')
    $('locationBackgroundRemove').disabled=!background
  }
  function scene(image,name,description) {
    $('locationSceneImage').hidden=!image
    if(image)$('locationSceneImage').src=image;else $('locationSceneImage').removeAttribute('src')
    $('locationSceneTitle').textContent=name || 'Votre lieu';$('locationSceneDescription').textContent=description || '';$('locationScene').showModal();$('locationSceneClose').focus()
  }
  $('locationSceneClose').addEventListener('click',()=>$('locationScene').close())
  $('locationSceneOpen').addEventListener('click',()=>{if(pending){$('locationError').textContent='Attendez la fin de la préparation de l’image.';return}scene(background,$('locationName').value,$('locationDescription').value)})
  $('locationBackgroundFile').addEventListener('change',async()=>{
    const file=$('locationBackgroundFile').files[0],token=generation,request=++sequence;$('locationBackgroundFile').value='';if(!file)return
    pending++;$('locationError').textContent='Préparation de l’image…'
    try{const image=await readDraftImage(file,{maxSide:1920,maxLength:1200000});if(token===generation&&request===sequence){background=image;preview();$('locationError').textContent=''}}
    catch(error){if(token===generation&&request===sequence)$('locationError').textContent=error.message || 'Impossible de lire cette image.'}
    finally{if(token===generation)pending--}
  })
  $('locationBackgroundRemove').addEventListener('click',()=>{sequence++;background=null;preview()})
  for(const [value,label] of Object.entries(DRAFT_LOCATION_TYPES)){const option=document.createElement('option');option.value=value;option.textContent=label;$('locationType').append(option)}
  function edit(place) {
    generation++;pending=0;background=place?.background || null;$('locationBackgroundFile').value='';preview()
    selected=place?.id || null;$('locationName').value=place?.name || '';$('locationType').value=place?.type || 'other';$('locationDescription').value=place?.description || '';$('locationNotes').value=place?.gmNotes || '';$('locationError').textContent='';$('locationRemove').hidden=!place;dialog.showModal();$('locationName').focus()
  }
  function render() {
    const definition=getDefinition(),list=$('locations');list.replaceChildren()
    if(!definition.locations?.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Aucun lieu créé. Commencez par un village, une forêt ou le premier décor de votre histoire.';list.append(empty)}
    for(const place of definition.locations || []) {
      const card=document.createElement('div'),name=document.createElement('h3'),type=document.createElement('p'),description=document.createElement('p'),button=document.createElement('button')
      card.className='location-card';name.textContent=place.name;type.className='hint';type.textContent=DRAFT_LOCATION_TYPES[place.type];description.textContent=place.description || 'Description à imaginer.';description.className='location-description';button.type='button';button.textContent='Modifier';button.setAttribute('aria-label','Modifier le lieu '+place.name);button.addEventListener('click',()=>edit(place));card.append(name,type,description,button)
      if(place.background){const image=document.createElement('img');image.src=place.background;image.alt='Fond du lieu '+place.name;image.className='location-thumbnail';card.prepend(image)}
      const show=document.createElement('button');show.type='button';show.textContent='Aperçu du lieu';show.setAttribute('aria-label','Aperçu du lieu '+place.name);show.addEventListener('click',()=>scene(place.background,place.name,place.description));card.append(show);list.append(card)
    }
    // Existing story maps are references, kept intact until the map editor is available.
    const legacy=$('legacyLocations');legacy.replaceChildren()
    for(const [map,name] of Object.entries(definition.world?.names || {})) {
      const item=document.createElement('li');item.textContent=name || 'Carte sans nom';legacy.append(item)
    }
    $('legacyLocationPanel').hidden=!legacy.children.length
  }
  $('addLocation').addEventListener('click',()=>edit(null))
  $('locationCancel').addEventListener('click',()=>dialog.close())
  $('locationForm').addEventListener('submit',event=>{
    event.preventDefault()
    try {
      if(pending)throw Error('Attendez la fin de la préparation de l’image.')
      const place={id:selected || 'lieu-'+crypto.randomUUID(),name:$('locationName').value.trim(),type:$('locationType').value,description:$('locationDescription').value,gmNotes:$('locationNotes').value,...(background?{background}:{})}
      replaceDefinition(setDraftLocation(getDefinition(),place));changed();render();dialog.close();message('Lieu préparé. Enregistrez le brouillon pour le conserver.')
    }catch(error){$('locationError').textContent=error.message}
  })
  $('locationRemove').addEventListener('click',()=>{
    try {
      if(!selected||!window.confirm('Retirer ce lieu du brouillon ?'))return
      replaceDefinition(removeDraftLocation(getDefinition(),selected));changed();render();dialog.close();message('Lieu retiré du brouillon.')
    }catch(error){$('locationError').textContent=error.message}
  })
  return {render}
}
