/* Generated from src/source-map.json by tools/build-source.cjs. Edit the source files, then rebuild. */
// Espace autonome : aucune clé ni connexion de partie.
function createLocalCampaignDraftStore(storage) {
  const prefix = "rpg-campaign-editor:v1:draft:"
  const key = id => {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw Error("Identifiant de brouillon invalide")
    return prefix + id
  }
  function get(id) {
    const raw = storage.getItem(key(id))
    if (raw === null) return null
    const record = JSON.parse(raw)
    if (!record || record.version !== 1 || record.draftId !== id || !Number.isSafeInteger(record.revision) || record.revision < 1 || !Number.isFinite(record.createdAt) || !Number.isFinite(record.updatedAt)) throw Error("Brouillon local illisible")
    return {...record, definition:createCampaignDefinition(record.definition)}
  }
  return {
    get,
    list() {
      const drafts = [], issues = []
      for (let i=0;i<storage.length;i++) {
        const name=storage.key(i)
        if (!name?.startsWith(prefix)) continue
        try { drafts.push(get(name.slice(prefix.length))) } catch { issues.push(name) }
      }
      return {drafts:drafts.sort((a,b)=>b.updatedAt-a.updatedAt),issues}
    },
    save(record) {
      const definition=createCampaignDefinition(record.definition), previous=get(record.draftId)
      if ((previous?.revision || 0) !== record.revision) throw Error("Ce brouillon a changé dans un autre onglet. Exportez vos modifications avant de le rouvrir.")
      const now=Date.now(), next={version:1,draftId:record.draftId,revision:record.revision+1,createdAt:previous?.createdAt || now,updatedAt:now,definition}
      storage.setItem(key(record.draftId),JSON.stringify(next))
      return next
    },
    remove(record) {
      if (get(record.draftId)?.revision !== record.revision) throw Error("Ce brouillon a changé dans un autre onglet. Rouvrez-le avant de le supprimer.")
      storage.removeItem(key(record.draftId))
    }
  }
}
function createDraftAudioStore(){
  let opening=null
  function database(){if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open('rpg-campaign-editor-audio-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};request.onerror=()=>{opening=null;reject(Error('Le stockage audio du navigateur est indisponible. Conservez vos fichiers originaux.'))};request.onblocked=()=>{opening=null;reject(Error('Fermez les autres onglets de l’éditeur pour ouvrir le stockage audio.'))}});return opening}
  async function run(mode,action){const db=await database();return new Promise((resolve,reject)=>{const transaction=db.transaction('files',mode),request=action(transaction.objectStore('files'));transaction.oncomplete=()=>resolve(request.result);transaction.onerror=transaction.onabort=()=>reject(Error('Impossible de conserver ce son dans le navigateur. Vérifiez l’espace disponible et gardez le fichier original.'))})}
  return {get:hash=>run('readonly',store=>store.get(hash)),put:(hash,blob)=>run('readwrite',store=>store.put(blob,hash))}
}
async function readDraftAudioFile(file){
  const extension=file.name.split('.').pop().toLowerCase(),mime={mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'}[extension]
  if(!mime||file.size<1||file.size>50*1024*1024)throw Error('Choisissez un fichier MP3, WAV, OGG ou M4A de 50 Mo maximum.')
  const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join(''),blob=new Blob([bytes],{type:mime})
  const url=URL.createObjectURL(blob),test=new Audio();test.preload='metadata'
  try{await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Ce fichier audio ne peut pas être lu par ce navigateur.')),15000);test.onloadedmetadata=()=>{clearTimeout(timeout);resolve()};test.onerror=()=>{clearTimeout(timeout);reject(Error('Fichier audio illisible ou format non pris en charge.'))};test.src=url})}finally{test.onloadedmetadata=test.onerror=null;test.pause();test.removeAttribute('src');test.load();URL.revokeObjectURL(url)}
  return {sha256,mime,blob,fileName:file.name,bytes:file.size}
}
function createDraftMapAudioPlayer({resolveSource,createAudio=()=>new Audio(),revoke=url=>URL.revokeObjectURL(url)}){
  const audio=createAudio();audio.loop=true;audio.volume=.5;let key=null,url=null,disposable=false,generation=0
  function release(){audio.pause();audio.removeAttribute('src');audio.load();if(url&&disposable)revoke(url);key=null;url=null;disposable=false}
  return {
    async play(track){const token=++generation;if(!track){release();return}const next=draftAudioTrackKey(track);if(key===next&&url){if(audio.paused)try{await audio.play()}catch(error){if(token===generation)throw error}return}let source;try{source=await resolveSource(track)}catch(error){if(token===generation)release();if(token===generation)throw error;return}if(token!==generation){if(source.disposable)revoke(source.url);return}release();key=next;url=source.url;disposable=!!source.disposable;audio.src=url;try{await audio.play()}catch(error){if(token===generation)throw error}},
    pause(){generation++;audio.pause()},stop(){generation++;release()},setVolume(value){audio.volume=Math.min(1,Math.max(0,Number(value)||0))},currentKey:()=>key
  }
}
// User-selected raster images are decoded locally and reduced before being embedded.
async function readDraftImage(file,{maxSide=900,maxLength=400000,preserveTransparency=false}={}) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choisissez une image PNG, JPEG ou WebP de 10 Mo maximum.')
  const bitmap=await createImageBitmap(file)
  try {
    if(bitmap.width*bitmap.height>40000000)throw Error('Cette image est trop grande. Choisissez une version plus petite.')
    let size=maxSide, result=''
    do {
      const ratio=Math.min(1,size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas')
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio))
      const ctx=canvas.getContext('2d');if(!preserveTransparency){ctx.fillStyle='#19232d';ctx.fillRect(0,0,canvas.width,canvas.height)}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
      result=canvas.toDataURL(preserveTransparency?'image/png':'image/jpeg',.82);size=Math.floor(size*.75)
    }while(result.length>maxLength && size>=150)
    if(result.length>maxLength)throw Error('Image trop volumineuse après réduction.')
    return result
  }finally{bitmap.close()}
}
function createDraftCharacterProfile() {
  const $=id=>document.getElementById(id)
  let appearance={},generation=0,pending=0
  const sequences={portrait:0,fullBody:0}
  function preview(key) {
    const image=$(key+'Preview');image.hidden=!appearance[key];if(appearance[key])image.src=appearance[key];else image.removeAttribute('src')
    $(key+'Remove').disabled=!appearance[key]
  }
  function addInfo(item={label:'',value:''}) {
    if($('customInfo').children.length>=30)throw Error('30 informations personnalisées maximum.')
    const row=document.createElement('fieldset'),legend=document.createElement('legend'),label=document.createElement('input'),value=document.createElement('textarea'),remove=document.createElement('button'),labelTitle=document.createElement('label'),valueTitle=document.createElement('label')
    legend.textContent='Information personnalisée';label.maxLength=100;label.required=true;label.value=item.label;value.maxLength=2000;value.rows=3;value.value=item.value
    labelTitle.textContent='Intitulé (ex. : origine, don, idéal)';valueTitle.textContent='Contenu';labelTitle.append(label);valueTitle.append(value)
    remove.type='button';remove.textContent='Retirer cette information';remove.addEventListener('click',()=>row.remove());row.append(legend,labelTitle,valueTitle,remove);$('customInfo').append(row)
  }
  $('addCustomInfo').addEventListener('click',()=>{try{addInfo()}catch(e){$('characterError').textContent=e.message}})
  for(const key of ['portrait','fullBody']) {
    $(key+'File').addEventListener('change',async()=>{
      const file=$(key+'File').files[0],token=generation;$(key+'File').value='';if(!file)return
      const sequence=++sequences[key]
      pending++;$('characterError').textContent='Préparation de l’image…'
      try{const data=await readDraftImage(file);if(token===generation&&sequence===sequences[key]){appearance[key]=data;preview(key);$('characterError').textContent=''}}
      catch(e){if(token===generation&&sequence===sequences[key])$('characterError').textContent=e.message || 'Impossible de lire cette image.'}
      finally{if(token===generation)pending--}
    })
    $(key+'Remove').addEventListener('click',()=>{sequences[key]++;appearance={...appearance};delete appearance[key];preview(key)})
  }
  return {
    open(c){generation++;pending=0;appearance={...c.appearance};$('characterRace').value=c.race || '';$('characterClass').value=c.class || '';
      for(const option of $('characterAlignment').querySelectorAll('[data-custom]'))option.remove()
      if(c.alignment&&![...$('characterAlignment').options].some(option=>option.value===c.alignment)){const option=document.createElement('option');option.value=c.alignment;option.textContent=c.alignment;option.dataset.custom='true';$('characterAlignment').append(option)}
      $('characterAlignment').value=c.alignment || '';$('customInfo').replaceChildren();(c.customInfo || []).forEach(addInfo);for(const key of ['portrait','fullBody']){$(key+'File').value='';preview(key)}},
    read(){if(pending)throw Error('Attendez la fin de la préparation des images.');return {race:$('characterRace').value.trim(),class:$('characterClass').value.trim(),alignment:$('characterAlignment').value,customInfo:[...$('customInfo').children].map(row=>({label:row.querySelector('input').value.trim(),value:row.querySelector('textarea').value})),appearance}}
  }
}
const DRAFT_CHARACTER_STATS = {force:'Force',charme:'Charme',perspi:'Perspicacité',chance:'Chance',defense:'Défense',hp:'PV maximum',poids:'Capacité d’inventaire'}
function createDraftHero(id, name = 'Nouveau héros') {
  return {id,name,kind:'hero',portrait:'images/draft-hero.svg',stats:{force:10,charme:10,perspi:10,chance:10,defense:10,hp:100,poids:100},mainStat:'force'}
}
// Validate the whole draft before replacing a character; keep identities and dependencies.
function updateDraftCharacter(definition, id, changes) {
  if (!definition.characters.some(c=>c.id===id)) throw Error('Personnage introuvable')
  const profile=Object.fromEntries(['race','class','alignment','customInfo','appearance'].filter(key=>changes[key]!==undefined).map(key=>[key,changes[key]]))
  return createCampaignDefinition({...definition,characters:definition.characters.map(c=>c.id===id?{...c,...profile,name:changes.name,stats:changes.stats,mainStat:changes.mainStat}:c)})
}
function removeDraftCharacter(definition, id) {
  if (!definition.characters.some(c=>c.id===id)) throw Error('Personnage introuvable')
  if (definition.ruleSet || definition.characters.some(c=>c.owner===id) || definition.attacks?.heroes?.[id] || definition.attacks?.heroSpecials?.[id] || definition.story?.cemetery?.players.includes(id)) throw Error('Ce personnage est lié à un compagnon, des attaques ou un scénario. Sa suppression attend l’édition de ces liens.')
  if (definition.characters.filter(c=>c.kind==='hero'&&c.id!==id).length===0) throw Error('Conservez au moins un héros dans la campagne.')
  return createCampaignDefinition({...definition,...withoutDraftActorTokens(definition,'character',id),characters:definition.characters.filter(c=>c.id!==id)})
}
function createDraftCharacterPanel({getDefinition,replaceDefinition,changed,message,guard,onAbilities}) {
  const $=id=>document.getElementById(id), dialog=$('characterDialog'), fields=$('characterStats')
  const profile=createDraftCharacterProfile()
  let selected=null, pendingHero=null
  for(const [key,label] of Object.entries(DRAFT_CHARACTER_STATS)) {
    const wrapper=document.createElement('div'), title=document.createElement('label'),input=document.createElement('input')
    title.htmlFor='stat-'+key;title.textContent=label;input.id='stat-'+key;input.type='number';input.min=key==='hp'?'1':'0';input.step='1';input.required=true
    wrapper.append(title,input);fields.append(wrapper)
    if(!['hp','poids'].includes(key)){const option=document.createElement('option');option.value=key;option.textContent=label;$('characterMainStat').append(option)}
  }
  function render() {
    const list=$('characters');list.replaceChildren()
    for(const c of getDefinition().characters) {
      const row=document.createElement('div'),name=document.createElement('h3'),detail=document.createElement('p'),button=document.createElement('button')
      row.className='character-card';name.textContent=c.name;detail.className='hint';detail.textContent=c.kind==='companion'?'Compagnon de '+getDefinition().characters.find(hero=>hero.id===c.owner)?.name:'Héros · '+(c.stats?c.stats.hp+' PV maximum':'statistiques à définir')
      button.type='button';button.textContent='Modifier';button.setAttribute('aria-label','Modifier '+c.name);button.addEventListener('click',()=>edit(c));row.append(name,detail)
      if(c.appearance?.portrait){const image=document.createElement('img');image.src=c.appearance.portrait;image.alt='Portrait de '+c.name;image.className='hero-avatar';row.prepend(image)}
      const identity=document.createElement('p');identity.className='hint';identity.textContent=[c.race,c.class,c.alignment].filter(Boolean).join(' · ');row.append(identity,button)
      const abilities=document.createElement('button');abilities.type='button';abilities.textContent='Attaques et capacités';abilities.setAttribute('aria-label','Attaques et capacités de '+c.name);abilities.addEventListener('click',()=>onAbilities(c.id));row.append(abilities);list.append(row)
    }
  }
  function edit(c, isNew=false) {
    pendingHero=isNew?c:null
    selected=c.id;$('characterName').value=c.name
    profile.open(c)
    const stats=c.stats || createDraftHero('preview').stats
    for(const key of Object.keys(DRAFT_CHARACTER_STATS))$('stat-'+key).value=stats[key]
    $('characterMainStat').value=c.mainStat || 'force';$('characterError').textContent='';dialog.showModal();$('characterName').focus()
  }
  $('addHero').addEventListener('click',guard(()=>{
    edit(createDraftHero('hero-'+crypto.randomUUID()),true)
  }))
  $('characterCancel').addEventListener('click',()=>dialog.close())
  $('characterForm').addEventListener('submit',event=>{
    event.preventDefault()
    try {
      const name=$('characterName').value.trim();if(!name)throw Error('Saisissez un nom de personnage.')
      const stats=Object.fromEntries(Object.keys(DRAFT_CHARACTER_STATS).map(key=>[key,$('stat-'+key).valueAsNumber]))
      if(Object.values(stats).some(value=>!Number.isSafeInteger(value)))throw Error('Utilisez des nombres entiers pour les statistiques.')
      const d=pendingHero?createCampaignDefinition({...getDefinition(),characters:[...getDefinition().characters,pendingHero]}):getDefinition()
      replaceDefinition(updateDraftCharacter(d,selected,{name,stats,mainStat:$('characterMainStat').value,...profile.read()}));changed();render();dialog.close();message('Fiche modifiée. Enregistrez le brouillon pour la conserver.')
    }catch(error){$('characterError').textContent=error.message}
  })
  $('characterRemove').addEventListener('click',()=>{
    try {
      if(pendingHero){dialog.close();return}
      const next=removeDraftCharacter(getDefinition(),selected)
      if(!window.confirm('Retirer ce personnage et ses pions de préparation du brouillon ?'))return
      replaceDefinition(next);changed();render();dialog.close();message('Personnage retiré du brouillon.')
    }catch(error){$('characterError').textContent=error.message}
  })
  return {render}
}
const DRAFT_LOCATION_TYPES={region:'Région',city:'Ville',village:'Village',wilderness:'Nature / extérieur',dungeon:'Donjon / souterrain',building:'Bâtiment / intérieur',other:'Autre'}
function setDraftLocation(definition,place) {
  const places=definition.locations || [], exists=places.some(item=>item.id===place.id)
  return createCampaignDefinition({...definition,locations:exists?places.map(item=>item.id===place.id?place:item):[...places,place]})
}
function removeDraftLocation(definition,id) {
  if(!definition.locations?.some(place=>place.id===id))throw Error('Lieu introuvable')
  return createCampaignDefinition({...definition,locations:definition.locations.filter(place=>place.id!==id),...(definition.gmActions!==undefined?{gmActions:definition.gmActions.map(action=>({...action,locationIds:action.locationIds.filter(value=>value!==id)}))}:{}),...(definition.npcs!==undefined?{npcs:definition.npcs.map(npc=>npc.locationIds?{...npc,locationIds:npc.locationIds.filter(value=>value!==id)}:npc)}:{}),...(definition.staging!==undefined?{staging:definition.staging.filter(board=>board.locationId!==id)}:{})})
}
function createDraftLocationPanel({getDefinition,replaceDefinition,changed,message,audioLibrary}) {
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
  function edit(place,groupId='') {
    generation++;pending=0;background=place?.background || null;$('locationBackgroundFile').value='';preview()
    audioLibrary.fillSelect($('locationAudioSelect'),place?.audioId || '')
    $('locationGroup').replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='À classer';$('locationGroup').append(empty);for(const group of getDefinition().mapGroups || []){const option=document.createElement('option');option.value=group.id;option.textContent=group.name;$('locationGroup').append(option)}$('locationGroup').value=place?.groupId || groupId
    selected=place?.id || null;$('locationName').value=place?.name || '';$('locationType').value=place?.type || 'other';$('locationDescription').value=place?.description || '';$('locationNotes').value=place?.gmNotes || '';$('locationError').textContent='';$('locationRemove').hidden=!place;dialog.showModal();$('locationName').focus()
  }
  function render() {
    const definition=getDefinition(),list=$('locations');list.replaceChildren()
    if(!definition.locations?.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Aucun lieu créé. Commencez par un village, une forêt ou le premier décor de votre histoire.';list.append(empty)}
    for(const place of definition.locations || []) {
      const card=document.createElement('div'),name=document.createElement('h3'),type=document.createElement('p'),description=document.createElement('p'),button=document.createElement('button')
      card.className='location-card';name.textContent=place.name;type.className='hint';type.textContent=[DRAFT_LOCATION_TYPES[place.type],definition.mapGroups?.find(group=>group.id===place.groupId)?.name].filter(Boolean).join(' · ');description.textContent=place.description || 'Description à imaginer.';description.className='location-description';button.type='button';button.textContent='Modifier';button.setAttribute('aria-label','Modifier le lieu '+place.name);button.addEventListener('click',()=>edit(place));card.append(name,type,description,button)
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
      const place={id:selected || 'lieu-'+crypto.randomUUID(),name:$('locationName').value.trim(),type:$('locationType').value,description:$('locationDescription').value,gmNotes:$('locationNotes').value,...($('locationAudioSelect').value?{audioId:$('locationAudioSelect').value}:{}),...($('locationGroup').value?{groupId:$('locationGroup').value}:{}),...(background?{background}:{})}
      replaceDefinition(setDraftLocation(getDefinition(),place));changed();render();dialog.close();message('Lieu préparé. Enregistrez le brouillon pour le conserver.')
    }catch(error){$('locationError').textContent=error.message}
  })
  $('locationRemove').addEventListener('click',()=>{
    try {
      if(!selected||!window.confirm('Retirer ce lieu et ses pions de préparation du brouillon ?'))return
      replaceDefinition(removeDraftLocation(getDefinition(),selected));changed();render();dialog.close();message('Lieu retiré du brouillon.')
    }catch(error){$('locationError').textContent=error.message}
  })
  return {render,create:groupId=>edit(null,groupId),edit}
}
function createDraftAbilityProgression() {
  const $=id=>document.getElementById(id)
  function tierRow(tier) {
    const row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Palier d’évolution';row.append(legend)
    for(const [key,title,min,max] of [['level','À partir du niveau',2,1000],['powerMin','Nouvelle puissance minimum',0,1000000],['powerMax','Nouvelle puissance maximum',0,1000000]]){
      const label=document.createElement('label'),input=document.createElement('input');label.textContent=title;input.type='number';input.min=min;input.max=max;input.step=1;input.required=true;input.dataset.tierField=key;input.value=tier[key];label.append(input);row.append(label)
    }
    const label=document.createElement('label'),select=document.createElement('select');label.textContent='Intensité visuelle à ce palier'
    for(const [value,text] of [[1,'Douce'],[2,'Normale'],[3,'Forte']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
    select.dataset.tierField='intensity';select.value=tier.intensity;label.append(select);row.append(label)
    const remove=document.createElement('button');remove.type='button';remove.textContent='Retirer ce palier';remove.addEventListener('click',()=>row.remove());row.append(remove);$('abilityTiers').append(row)
  }
  $('addAbilityTier').addEventListener('click',()=>{
    const levels=[...$('abilityTiers').querySelectorAll('[data-tier-field=level]')].map(input=>input.valueAsNumber).filter(Number.isFinite),level=Math.max(1,...levels)+1
    if(level>1000){$('abilityError').textContent='Le niveau maximum des paliers est 1 000.';return}
    tierRow({level,powerMin:$('ability-powerMin').valueAsNumber || 0,powerMax:$('ability-powerMax').valueAsNumber || 0,intensity:Number($('abilityIntensity').value)})
  })
  $('abilityAnnouncementMode').addEventListener('change',()=>{$('abilityAnnouncementCustom').hidden=$('abilityAnnouncementMode').value!=='custom'})
  function mode(){const value=$('abilityGrowthMode').value;$('abilityAutomaticGrowth').hidden=value!=='automatic';$('abilityLegacyGrowth').hidden=value!=='legacy';for(const input of $('abilityAutomaticGrowth').querySelectorAll('input'))input.disabled=value!=='automatic';for(const input of $('abilityLegacyGrowth').querySelectorAll('input,select'))input.disabled=value!=='legacy';explain()}
  function explain(){const percent=$('abilityGrowthPercent').valueAsNumber,every=$('abilityGrowthEvery').valueAsNumber,start=$('abilityGrowthStart').valueAsNumber;$('abilityGrowthExample').textContent=Number.isFinite(percent)&&Number.isInteger(every)&&every>0&&Number.isInteger(start)?`Base au niveau ${start} ; +${percent} % au niveau ${start+every} ; +${Math.round(percent*2*10000)/10000} % au niveau ${start+2*every}. Les bonus sont calculés sur la puissance de base, sans multiplication entre eux.`:'Renseignez un pourcentage et un intervalle valides.'}
  $('abilityGrowthMode').addEventListener('change',mode)
  for(const id of ['abilityGrowthPercent','abilityGrowthEvery','abilityGrowthStart'])$(id).addEventListener('input',explain)
  return {
    open(ability){$('abilityTiers').replaceChildren();(ability?.progression || []).forEach(tierRow);$('abilityAnnouncementMode').value=ability?.announcement?.mode || 'auto';$('abilityAnnouncementText').value=ability?.announcement?.text || '';$('abilityAnnouncementCustom').hidden=$('abilityAnnouncementMode').value!=='custom';$('abilityTestLevel').value=1;
      $('abilityGrowthMode').querySelector('[value=legacy]')?.remove();if(ability?.progression?.length){const option=document.createElement('option');option.value='legacy';option.textContent='Paliers existants (conservés)';$('abilityGrowthMode').append(option)}
      $('abilityGrowthMode').value=ability?.growth?'automatic':ability?.progression?.length?'legacy':'fixed';$('abilityGrowthPercent').value=ability?.growth?.percent ?? 2;$('abilityGrowthEvery').value=ability?.growth?.every ?? 2;$('abilityGrowthStart').value=ability?.growth?.startLevel ?? 1;mode()},
    read(){const value=$('abilityGrowthMode').value;return {announcement:{mode:$('abilityAnnouncementMode').value,text:$('abilityAnnouncementText').value},...(value==='automatic'?{growth:{percent:$('abilityGrowthPercent').valueAsNumber,every:$('abilityGrowthEvery').valueAsNumber,startLevel:$('abilityGrowthStart').valueAsNumber}}:{}),...(value==='legacy'?{progression:[...$('abilityTiers').children].map(row=>Object.fromEntries([...row.querySelectorAll('[data-tier-field]')].map(input=>[input.dataset.tierField,input.type==='number'?input.valueAsNumber:Number(input.value)])))}:{})}}
  }
}
const DRAFT_SEQUENCE_LABELS={none:'Aucun effet',slash:'Entaille',projectile:'Projectile',fire:'Flammes',frost:'Givre',lightning:'Éclair',heal:'Halo de soin',shield:'Bouclier',smoke:'Brume',swarm:'Nuée',beam:'Rayon',wave:'Vague',explosion:'Explosion',mark:'Marque au sol'}
function draftSequenceModel(model,color='#d8b477') {
  const phase=(effect,duration,extra={})=>({enabled:true,effect,duration,color,size:100,direction:'forward',darken:false,shake:false,flash:false,images:[],...extra})
  const models={physical:[phase('none',600),phase('slash',700),phase('explosion',600,{shake:true})],magic:[phase('swarm',1000),phase('projectile',900),phase('wave',700)],summon:[phase('smoke',1200,{darken:true}),phase('mark',1200),phase('wave',800)],dark:[phase('smoke',1400,{darken:true}),phase('beam',1000),phase('explosion',900,{shake:true,darken:true})],healing:[phase('swarm',800),phase('heal',1200),phase('shield',800)]}
  return Object.fromEntries(Object.keys(CAMPAIGN_SEQUENCE_PHASES).map((key,i)=>[key,(models[model] || models.magic)[i]]))
}
function createDraftSequenceEditor({onPreview}) {
  const $=id=>document.getElementById(id)
  let generation=0,pending=0
  const controls={}
  function watch(label,action){const button=document.createElement('button');button.type='button';button.className='effect-watch';button.textContent='Voir';button.setAttribute('aria-label','Voir : '+label);button.addEventListener('click',action);return button}
  function quickPhase(fields,overrides={}){return {enabled:true,duration:1400,effect:fields.effect.value,color:fields.color.value || '#d8b477',size:Number.isInteger(fields.size.valueAsNumber)&&fields.size.valueAsNumber>=25&&fields.size.valueAsNumber<=200?fields.size.valueAsNumber:100,direction:fields.direction.value,darken:false,shake:false,flash:false,images:[],...overrides}}
  function select(label,options,value){const wrap=document.createElement('label'),input=document.createElement('select');wrap.textContent=label;for(const [key,text]of Object.entries(options)){const option=document.createElement('option');option.value=key;option.textContent=text;input.append(option)}input.value=value;wrap.append(input);return {wrap,input}}
  function imageRow(parent,item) {
    const row=document.createElement('fieldset'),legend=document.createElement('legend'),image=document.createElement('img');legend.textContent='Image de l’étape';image.src=item.image;image.alt='Élément de l’animation';image.className='sequence-editor-image'
    const motion=select('Apparition / déplacement',{fade:'Fondu',left:'Depuis la gauche',right:'Depuis la droite',rise:'Depuis le bas'},item.motion),position=select('Position',{actor:'Côté personnage',center:'Centre',target:'Côté cible'},item.position)
    row.sequenceData={image:item.image,motion:motion.input,position:position.input}
    const remove=document.createElement('button');remove.type='button';remove.textContent='Retirer cet élément';remove.addEventListener('click',()=>row.remove());row.append(legend,image,motion.wrap,position.wrap,watch('le mouvement de cette image',()=>onPreview({enabled:true,duration:1800,effect:'none',color:'#d8b477',size:100,direction:'forward',darken:false,shake:false,flash:false,images:[{image:item.image,motion:motion.input.value,position:position.input.value}]},'Mouvement de l’image')),remove);parent.append(row)
  }
  for(const [key,title]of Object.entries(CAMPAIGN_SEQUENCE_PHASES)) {
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');summary.textContent=title;details.append(summary,body);$('sequenceSteps').append(details)
    const fields={}
    for(const [name,label]of Object.entries({enabled:'Activer cette étape',darken:'Assombrir le décor',shake:'Tremblement à l’impact',flash:'Flash unique doux'})){
      const wrap=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.sequenceField=name;wrap.className='sequence-checkbox';wrap.append(input,document.createTextNode(label));fields[name]=input
      if(name==='enabled')body.append(wrap);else{const line=document.createElement('div');line.className='effect-control';line.append(wrap,watch(title+' — '+label,()=>onPreview(quickPhase(fields,{effect:'none',[name]:true}),label)));body.append(line)}
    }
    const effect=select('Effet',DRAFT_SEQUENCE_LABELS,'none'),direction=select('Direction',{forward:'Personnage vers cible',reverse:'Cible vers personnage'},'forward');const effectLine=document.createElement('div');effectLine.className='effect-control';effectLine.append(effect.wrap,watch(title+' — effet sélectionné',()=>onPreview(quickPhase(fields),DRAFT_SEQUENCE_LABELS[fields.effect.value])));body.append(effectLine,direction.wrap);fields.effect=effect.input;fields.direction=direction.input
    for(const [name,label,type,min,max,step]of [['duration','Durée (secondes)','number',.2,8,.1],['size','Taille de l’effet (%)','number',25,200,1],['color','Couleur','color']]){
      const wrap=document.createElement('label'),input=document.createElement('input');wrap.textContent=label;input.type=type;input.dataset.sequenceField=name;if(type==='number'){input.min=min;input.max=max;input.step=step}wrap.append(input);body.append(wrap);fields[name]=input
    }
    const imagePanel=document.createElement('details'),heading=document.createElement('summary'),list=document.createElement('div'),fileLabel=document.createElement('label'),file=document.createElement('input'),hint=document.createElement('p');heading.textContent='Images de cette étape';imagePanel.className='sequence-images';fileLabel.textContent='Ajouter une image transparente';file.type='file';file.accept='image/png,image/jpeg,image/webp';fileLabel.append(file);hint.className='hint';hint.textContent='Jusqu’à trois éléments par étape, 10 Mo par fichier. Les images sont réduites et leur transparence conservée.';imagePanel.append(heading,list,fileLabel,hint);body.append(imagePanel);fields.images=list
    file.addEventListener('change',async()=>{const imageFile=file.files[0],token=generation;file.value='';if(!imageFile)return;if(list.children.length>=3){$('abilityError').textContent='Trois images maximum par étape.';return}pending++;$('abilityError').textContent='Préparation de l’image…';try{const image=await readDraftImage(imageFile,{maxSide:1200,maxLength:600000,preserveTransparency:true});if(token===generation&&list.children.length<3){imageRow(list,{image,motion:'fade',position:'center'});$('abilityError').textContent=''}}catch(e){if(token===generation)$('abilityError').textContent=e.message || 'Image illisible'}finally{if(token===generation)pending--}})
    controls[key]=fields
  }
  function fill(sequence) {
    generation++;pending=0
    $('sequenceOrder').value=sequence.order?.join(',') || 'preparation,launch,impact'
    for(const [key,fields]of Object.entries(controls)){const phase=sequence[key];for(const [name,input]of Object.entries(fields)){if(name==='images'){input.replaceChildren();phase.images.forEach(item=>imageRow(input,item))}else if(input.type==='checkbox')input.checked=phase[name];else input.value=name==='duration'?phase.duration/1000:phase[name]}}
  }
  function kind(){for(const panel of $('sequenceSteps').querySelectorAll('.sequence-images'))panel.hidden=$('abilityKind').value!=='special'}
  $('abilityKind').addEventListener('change',kind)
  $('sequenceEnabled').addEventListener('change',()=>{$('sequenceAdvanced').hidden=!$('sequenceEnabled').checked})
  $('sequenceApplyModel').addEventListener('click',()=>{fill(draftSequenceModel($('sequenceModel').value,$('abilityColor').value));$('sequenceEnabled').checked=true;$('sequenceAdvanced').hidden=false;kind()})
  return {
    open(ability){$('sequenceEnabled').checked=!!ability?.visual.sequence;$('sequenceAdvanced').hidden=!$('sequenceEnabled').checked;fill(ability?.visual.sequence || draftSequenceModel('magic',$('abilityColor').value));kind()},
    read(){if(pending)throw Error('Attendez la fin de la préparation des images d’étapes.');if(!$('sequenceEnabled').checked)return undefined;return {...Object.fromEntries(Object.entries(controls).map(([key,fields])=>[key,Object.fromEntries(Object.entries(fields).map(([name,input])=>[name,name==='images'?($('abilityKind').value==='special'?[...input.children].map(row=>({image:row.sequenceData.image,motion:row.sequenceData.motion.value,position:row.sequenceData.position.value})):[]):input.type==='checkbox'?input.checked:input.type==='number'?(name==='duration'?Math.round(input.valueAsNumber*1000):input.valueAsNumber):input.value]))])),order:$('sequenceOrder').value.split(',')}}
  }
}
function createDraftSequencePlayer(stage,effects,onPhase) {
  let timers=[],generation=0
  function cancel(){generation++;timers.forEach(clearTimeout);timers=[];effects.replaceChildren();stage.className='ability-stage';onPhase('')}
  function later(fn,time,token){timers.push(setTimeout(()=>{if(token===generation)fn()},time))}
  function play(ability,only='all') {
    cancel();const token=generation,phases=(ability.visual.sequence.order || Object.keys(CAMPAIGN_SEQUENCE_PHASES)).map(key=>[key,ability.visual.sequence[key]]).filter(([key,phase])=>phase.enabled&&(only==='all'||key===only));let delay=0
    const show=(key,p)=>{
      effects.replaceChildren();stage.className='ability-stage';stage.style.setProperty('--ability-color',p.color);void stage.offsetWidth;stage.classList.add('composed','playing','intensity-'+ability.visual.intensity,'preset-'+p.effect);if(p.shake)stage.classList.add('sequence-shake');onPhase(CAMPAIGN_SEQUENCE_PHASES[key])
      if(p.darken){const dark=document.createElement('div');dark.className='sequence-dark';effects.append(dark)}
      if(p.flash){const flash=document.createElement('div');flash.className='sequence-flash';effects.append(flash)}
      const particles=document.createElement('div');particles.className='sequence-particles';particles.style.transform=`scale(${(p.direction==='reverse'?-1:1)*p.size/100},${p.size/100})`;effects.append(particles)
      if(p.effect!=='none')for(let i=0;i<(p.effect==='swarm'?18:p.effect==='frost'?9:1);i++){const spark=document.createElement('span');spark.className='ability-spark';spark.style.setProperty('--particle',String(i));spark.style.animationDuration=p.duration+'ms';particles.append(spark)}
      const images=p.images.length?p.images:key==='launch'&&ability.visual.image?[{image:ability.visual.image,motion:'fade',position:'center'}]:[]
      for(const item of images){const image=document.createElement('img');image.src=item.image;image.alt='Élément de la spéciale';image.className='sequence-artwork motion-'+item.motion;image.style.left={actor:'5%',center:'30%',target:'55%'}[item.position];image.style.width=40*p.size/100+'%';image.style.animationDuration=p.duration+'ms';effects.append(image)}
    }
    for(const [key,phase]of phases){if(!delay)show(key,phase);else later(()=>show(key,phase),delay,token);delay+=phase.duration}
    if(!phases.length)onPhase('Aucune étape activée')
    else later(()=>{effects.replaceChildren();stage.className='ability-stage';onPhase('Animation terminée')},delay,token)
  }
  return {play,cancel}
}
const DRAFT_ABILITY_VISUALS={slash:'Entaille',projectile:'Projectile magique',fire:'Flammes',frost:'Givre',lightning:'Éclair',heal:'Halo de soin',shield:'Bouclier',smoke:'Brume sombre',swarm:'Nuée de particules'}
function setDraftAbility(definition,heroId,ability,ownerKind='character') {
  if(!['character','enemy'].includes(ownerKind))throw Error('Type de propriétaire inconnu')
  const key=ownerKind==='enemy'?'bestiary':'characters',actors=definition[key] || []
  if(!actors.some(c=>c.id===heroId))throw Error('Personnage ou ennemi introuvable')
  return createCampaignDefinition({...definition,[key]:actors.map(c=>{
    if(c.id!==heroId)return c
    const list=c.abilities || []
    return {...c,abilities:list.some(a=>a.id===ability.id)?list.map(a=>a.id===ability.id?ability:a):[...list,ability]}
  })})
}
function removeDraftAbility(definition,heroId,id,ownerKind='character') {
  if(!['character','enemy'].includes(ownerKind))throw Error('Type de propriétaire inconnu')
  const key=ownerKind==='enemy'?'bestiary':'characters',actors=definition[key] || []
  if(!actors.find(c=>c.id===heroId)?.abilities?.some(a=>a.id===id))throw Error('Capacité introuvable')
  return createCampaignDefinition({...definition,[key]:actors.map(c=>c.id===heroId?{...c,abilities:c.abilities.filter(a=>a.id!==id)}:c)})
}
function createDraftAbilityPanel({getDefinition,replaceDefinition,changed,message}) {
  const $=id=>document.getElementById(id)
  const progression=createDraftAbilityProgression()
  const sequenceEditor=createDraftSequenceEditor({onPreview:quickPreview})
  const sequencePlayer=createDraftSequencePlayer($('abilityStage'),$('abilityFx'),text=>{$('abilityPhaseStatus').textContent=text})
  let heroId=null,ownerKind='character',selected=null,image=null,generation=0,sequence=0,pending=0,previewTimer=null,previewAbility=null
  const owner=()=>getDefinition()[ownerKind==='enemy'?'bestiary':'characters']?.find(c=>c.id===heroId)
  for(const [value,label] of Object.entries(DRAFT_ABILITY_VISUALS)){const option=document.createElement('option');option.value=value;option.textContent=label;$('abilityPreset').append(option)}
  function picture(){$('abilityImagePreview').hidden=!image;if(image)$('abilityImagePreview').src=image;else $('abilityImagePreview').removeAttribute('src');$('abilityImageRemove').disabled=!image}
  function kind(){$('abilityImagePanel').hidden=$('abilityKind').value!=='special'}
  $('abilityKind').addEventListener('change',kind)
  function read() {
    if(pending)throw Error('Attendez la fin de la préparation de l’image.')
    const value={id:selected || 'ability-'+crypto.randomUUID(),kind:$('abilityKind').value,name:$('abilityName').value.trim(),description:$('abilityDescription').value,type:$('abilityType').value,dice:Number($('abilityDice').value),stat:$('abilityStat').value,target:$('abilityTarget').value,effect:{kind:$('abilityEffect').value,value:$('abilityEffectValue').valueAsNumber,turns:$('abilityEffectTurns').valueAsNumber},visual:{preset:$('abilityPreset').value,color:$('abilityColor').value,intensity:Number($('abilityIntensity').value),...($('abilityKind').value==='special'&&image?{image}:{})}}
    for(const key of ['powerMin','powerMax','cooldown','uses'])value[key]=$('ability-'+key).valueAsNumber
    const sequence=sequenceEditor.read();if(sequence)value.visual.sequence=sequence
    return createCampaignAbilities([{...value,...progression.read()}])[0]
  }
  function render() {
    const hero=owner();$('abilityOwner').textContent='Attaques de '+hero.name
    for(const type of ['normal','special']) {
      const list=$(type+'Abilities');list.replaceChildren()
      for(const ability of hero.abilities || [])if(ability.kind===type) {
        const row=document.createElement('div'),name=document.createElement('h3'),info=document.createElement('p'),editButton=document.createElement('button'),test=document.createElement('button')
        row.className='ability-card';name.textContent=ability.name;info.className='hint';info.textContent=`D${ability.dice} · ${ability.powerMin}–${ability.powerMax} · ${DRAFT_ABILITY_VISUALS[ability.visual.preset]}`
        editButton.type=test.type='button';editButton.textContent='Modifier';editButton.setAttribute('aria-label','Modifier la capacité '+ability.name);editButton.addEventListener('click',()=>edit(ability));test.textContent='Tester le visuel';test.setAttribute('aria-label','Tester le visuel '+ability.name);test.addEventListener('click',()=>preview(ability));row.append(name,info,editButton,test);list.append(row)
      }
      if(!list.children.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Aucune capacité ajoutée.';list.append(empty)}
    }
    const legacy=getDefinition().attacks,old=[...(legacy?.heroes?.[heroId] || []),...(legacy?.heroSpecials?.[heroId]?[legacy.heroSpecials[heroId]]:[])]
    $('legacyAbilities').textContent=old.length?'Attaques du modèle conservées : '+old.map(a=>a.name).join(', ')+'. Leur conversion vers ce créateur sera traitée séparément.':''
  }
  function edit(ability,newKind='normal') {
    progression.open(ability)
    selected=ability?.id || null;generation++;pending=0;image=ability?.visual.image || null;picture();$('abilityImageFile').value=''
    $('abilityKind').value=ability?.kind || newKind;kind();$('abilityName').value=ability?.name || '';$('abilityDescription').value=ability?.description || '';$('abilityType').value=ability?.type || 'damage';$('abilityDice').value=ability?.dice || 6;$('abilityStat').value=ability?.stat || 'force';$('abilityTarget').value=ability?.target || 'enemy'
    for(const [key,value] of Object.entries({powerMin:4,powerMax:8,cooldown:0,uses:0}))$('ability-'+key).value=ability?.[key] ?? value
    $('abilityEffect').value=ability?.effect.kind || 'none';$('abilityEffectValue').value=ability?.effect.value ?? 0;$('abilityEffectTurns').value=ability?.effect.turns ?? 1;$('abilityPreset').value=ability?.visual.preset || 'slash';$('abilityColor').value=ability?.visual.color || '#d8b477';$('abilityIntensity').value=ability?.visual.intensity || 2;sequenceEditor.open(ability);$('abilityError').textContent='';$('abilityRemove').hidden=!ability;$('abilityDialog').showModal();$('abilityName').focus()
  }
  function preview(ability) {
    resolveCampaignAbilityLevel(ability,$('abilityTestLevel').valueAsNumber)
    previewAbility=ability;$('abilityPreviewLevel').value=$('abilityTestLevel').value
    $('abilityPreviewTitle').textContent=ability.name;$('abilityPreviewActor').textContent=owner().name
    $('abilityPreviewTarget').textContent=ability.target==='self'?'Soi-même':['ally','allAllies'].includes(ability.target)?'Allié':'Cible'
    $('abilityPreviewScene').replaceChildren();const neutral=document.createElement('option');neutral.value='';neutral.textContent='Décor neutre';$('abilityPreviewScene').append(neutral)
    for(const place of getDefinition().locations || [])if(place.background){const option=document.createElement('option');option.value=place.id;option.textContent=place.name;$('abilityPreviewScene').append(option)}
    $('abilityPreviewScene').selectedIndex=$('abilityPreviewScene').options.length>1?1:0;setBackdrop();$('abilityPreviewPart').value='all'
    $('abilityPreview').showModal();replay();$('abilityReplay').onclick=replay;$('abilityPreviewClose').focus({preventScroll:true});$('abilityPreview').scrollTop=0
  }
  function quickPreview(phase,title){try{
    const sequence=draftSequenceModel('magic');for(const key of Object.keys(CAMPAIGN_SEQUENCE_PHASES))sequence[key].enabled=false;sequence.launch=phase
    const ability={id:'ability-effect-preview',kind:'special',name:title,description:'',type:'effect',dice:6,stat:'none',target:'enemy',powerMin:0,powerMax:0,cooldown:0,uses:0,effect:{kind:'none',value:0,turns:0},visual:{preset:'slash',color:phase.color,intensity:2,sequence},announcement:{mode:'none',text:''}}
    const previous=$('abilityTestLevel').value;$('abilityTestLevel').value=1;try{preview(createCampaignAbilities([ability])[0])}finally{$('abilityTestLevel').value=previous}
    $('abilityLevelSummary').textContent='Essai isolé de cet effet · aucun réglage modifié'
  }catch(error){$('abilityError').textContent=error.message}}
  $('abilityQuickEffect').addEventListener('click',()=>{const phase=draftSequenceModel('magic',$('abilityColor').value).launch;phase.effect=$('abilityPreset').value;quickPreview(phase,DRAFT_ABILITY_VISUALS[phase.effect])})
  function replay(){try{const level=$('abilityPreviewLevel').valueAsNumber,ability=resolveCampaignAbilityLevel(previewAbility,level),hero=owner();$('abilityPreviewError').textContent='';$('abilityAnnouncement').textContent=campaignAbilityAnnouncement(ability,hero.name);$('abilityAnnouncement').hidden=!$('abilityAnnouncement').textContent;const bonus=ability.growth?` · bonus automatique +${campaignAbilityGrowthBonus(ability.growth,level)} %`:'';$('abilityLevelSummary').textContent=`Niveau ${level} · Puissance ${ability.powerMin}–${ability.powerMax}${bonus} · intensité ${ability.visual.intensity}/3 · hors bonus de statistiques` ;play(ability)}catch(error){$('abilityPreviewError').textContent=error.message}}
  $('abilityPreviewLevel').addEventListener('change',replay)
  function setBackdrop(){const backdrop=getDefinition().locations?.find(p=>p.id===$('abilityPreviewScene').value)?.background;$('abilityPreviewBackdrop').hidden=!backdrop;if(backdrop)$('abilityPreviewBackdrop').src=backdrop;else $('abilityPreviewBackdrop').removeAttribute('src')}
  $('abilityPreviewScene').addEventListener('change',setBackdrop)
  $('abilityPreviewPart').addEventListener('change',replay)
  function play(ability) {
    clearTimeout(previewTimer);sequencePlayer.cancel();if(ability.visual.sequence){sequencePlayer.play(ability,$('abilityPreviewPart').value);return}
    $('abilityPhaseStatus').textContent='Animation simple';const stage=$('abilityStage'),effects=$('abilityFx');effects.replaceChildren();stage.className='ability-stage';stage.style.setProperty('--ability-color',ability.visual.color)
    void stage.offsetWidth;stage.classList.add('playing','intensity-'+ability.visual.intensity,'preset-'+ability.visual.preset)
    const count=ability.visual.preset==='swarm'?18:ability.visual.preset==='frost'?9:1
    for(let i=0;i<count;i++){const spark=document.createElement('span');spark.className='ability-spark';spark.style.setProperty('--particle',String(i));effects.append(spark)}
    if(ability.visual.image){const artwork=document.createElement('img');artwork.src=ability.visual.image;artwork.alt='Illustration de la capacité';artwork.className='ability-artwork';effects.append(artwork)}
    previewTimer=setTimeout(()=>{stage.className='ability-stage';effects.replaceChildren()},2400)
  }
  $('abilityPreview').addEventListener('close',()=>{clearTimeout(previewTimer);sequencePlayer.cancel();$('abilityFx').replaceChildren();$('abilityStage').className='ability-stage';$('abilityReplay').onclick=null;previewAbility=null;$('abilityAnnouncement').textContent='';$('abilityPreviewError').textContent=''})
  $('abilityPreviewClose').addEventListener('click',()=>$('abilityPreview').close())
  $('abilityTest').addEventListener('click',()=>{try{preview(read())}catch(e){$('abilityError').textContent=e.message}})
  $('addNormalAbility').addEventListener('click',()=>edit(null,'normal'));$('addSpecialAbility').addEventListener('click',()=>edit(null,'special'))
  $('abilityLibraryClose').addEventListener('click',()=>$('abilityLibrary').close());$('abilityCancel').addEventListener('click',()=>$('abilityDialog').close())
  $('abilityImageFile').addEventListener('change',async()=>{
    const file=$('abilityImageFile').files[0],token=generation,request=++sequence;$('abilityImageFile').value='';if(!file)return
    pending++;$('abilityError').textContent='Préparation de l’image…'
    try{const result=await readDraftImage(file,{maxSide:1200,maxLength:600000,preserveTransparency:true});if(token===generation&&request===sequence){image=result;picture();$('abilityError').textContent=''}}catch(e){if(token===generation&&request===sequence)$('abilityError').textContent=e.message || 'Image illisible'}finally{if(token===generation)pending--}
  })
  $('abilityImageRemove').addEventListener('click',()=>{sequence++;image=null;picture()})
  $('abilityForm').addEventListener('submit',event=>{event.preventDefault();try{replaceDefinition(setDraftAbility(getDefinition(),heroId,read(),ownerKind));changed();render();$('abilityDialog').close();message('Capacité ajoutée au brouillon. Pensez à l’enregistrer.')}catch(e){$('abilityError').textContent=e.message}})
  $('abilityRemove').addEventListener('click',()=>{try{if(!selected||!window.confirm('Retirer cette capacité du brouillon ?'))return;replaceDefinition(removeDraftAbility(getDefinition(),heroId,selected,ownerKind));changed();render();$('abilityDialog').close()}catch(e){$('abilityError').textContent=e.message}})
  return {open(id,type='character'){heroId=id;ownerKind=type;render();$('abilityLibrary').showModal()}}
}
function createDraftEnemyTemplate(template,id) {
  const templates={goblin:{name:'Gobelin',description:'Petit pillard rusé, dangereux en groupe.',portrait:'images/gobelins.png',hp:32,force:8,defense:4,variants:['weak','medium','high'],attack:'Coup de lame',power:[4,8],visual:'slash'},wolf:{name:'Loup',description:'Prédateur rapide qui cherche à isoler sa proie.',portrait:'images/loup.png',hp:68,force:12,defense:5,variants:['weak','medium','high'],attack:'Morsure',power:[6,10],visual:'slash'},bandit:{name:'Bandit',description:'Combattant opportuniste qui préfère les embuscades.',portrait:'images/bandit.png',hp:34,force:10,defense:6,variants:['weak','medium','high'],attack:'Estoc',power:[5,9],visual:'projectile'},draugr:{name:'Draugr',description:'Gardien mort-vivant lent mais tenace.',portrait:'images/draugr.png',hp:80,force:13,defense:9,variants:['weak','medium','high','boss'],attack:'Frappe funéraire',power:[7,12],visual:'smoke'},golem:{name:'Golem de pierre',description:'Créature lourde et résistante, dont les articulations sont exposées.',portrait:'images/golem.png',hp:64,force:18,defense:14,variants:['medium','high','boss','worldBoss'],attack:'Poing de pierre',power:[10,16],visual:'fire'}}
  const t=templates[template]
  const normal={id:'ability-basic',kind:'normal',name:t?.attack || 'Frappe',description:'Attaque de base personnalisable.',type:'damage',dice:6,stat:'force',target:'enemy',powerMin:t?.power[0] || 4,powerMax:t?.power[1] || 8,cooldown:0,uses:0,effect:{kind:'none',value:0,turns:1},visual:{preset:t?.visual || 'slash',color:'#d8b477',intensity:2},growth:{percent:2,every:2,startLevel:1}}
  const enemy={id,name:t?.name || 'Nouvel ennemi',description:t?.description || '',portrait:t?.portrait || 'images/draft-hero.svg',variants:t?[...t.variants]:['medium'],baseLevel:1,stats:{hp:t?.hp || 60,force:t?.force || 10,charme:2,perspi:6,chance:5,defense:t?.defense || 6},growth:{hpPercent:8,statsPercent:3,every:1},resistances:[],weaknesses:[],abilities:[normal]}
  if(template==='golem'){
    enemy.resistances=[{name:'Coups physiques',percent:25}];enemy.weaknesses=[{name:'Articulations exposées',percent:20}]
    enemy.abilities.push({...normal,id:'ability-stone-guard',kind:'special',name:'Carapace de pierre',description:'Durcit son corps pendant deux tours.',type:'protection',target:'self',powerMin:0,powerMax:0,cooldown:3,effect:{kind:'damageReduction',value:25,turns:2},visual:{preset:'shield',color:'#86b3ce',intensity:2}})
  }
  if(template==='draugr')enemy.weaknesses=[{name:'Feu',percent:20}]
  return createCampaignBestiary([enemy])[0]
}
function setDraftEnemy(definition,enemy) {
  const list=definition.bestiary || []
  return createCampaignDefinition({...definition,bestiary:list.some(item=>item.id===enemy.id)?list.map(item=>item.id===enemy.id?enemy:item):[...list,enemy]})
}
function removeDraftEnemy(definition,id){if(!definition.bestiary?.some(item=>item.id===id))throw Error('Ennemi introuvable');return createCampaignDefinition({...definition,...withoutDraftActorTokens(definition,'enemy',id),bestiary:definition.bestiary.filter(item=>item.id!==id)})}
const DRAFT_ENEMY_STATS={hp:'PV maximum',force:'Force / puissance',charme:'Charme',perspi:'Perspicacité',chance:'Chance',defense:'Défense'}
function createDraftBestiaryPanel({getDefinition,replaceDefinition,changed,message,onAbilities}) {
  const $=id=>document.getElementById(id),dialog=$('enemyDialog');let current=null,generation=0,pending=0,appearance={}
  const requests={portrait:0,fullBody:0}
  for(const [key,value]of Object.entries(DRAFT_ENEMY_VARIANTS)){
    const label=document.createElement('label'),input=document.createElement('input');label.className='sequence-checkbox';input.type='checkbox';input.value=key;input.name='enemyVariant';label.append(input,document.createTextNode(value.label));$('enemyVariants').append(label)
  }
  for(const [key,label]of Object.entries(DRAFT_ENEMY_STATS)){
    const wrap=document.createElement('label'),input=document.createElement('input');wrap.textContent=label;input.id='enemyStat-'+key;input.type='number';input.min=key==='hp'?'1':'0';input.max=1000000;input.step='any';input.required=true;wrap.append(input);$('enemyStats').append(wrap)
  }
  function traitRow(kind,item={name:'',percent:20}) {
    const list=$(kind==='resistances'?'enemyResistances':'enemyWeaknesses');if(list.children.length>=20)throw Error('20 lignes maximum par rubrique.')
    const row=document.createElement('fieldset'),legend=document.createElement('legend'),nameLabel=document.createElement('label'),name=document.createElement('input'),percentLabel=document.createElement('label'),percent=document.createElement('input'),remove=document.createElement('button')
    legend.textContent=kind==='resistances'?'Résistance':'Faiblesse';nameLabel.textContent='Type ou condition (ex. : feu)';name.value=item.name;name.maxLength=80;name.required=true;nameLabel.append(name);percentLabel.textContent=kind==='resistances'?'Dégâts subis en moins (%)':'Dégâts subis en plus (%)';percent.type='number';percent.min=0;percent.max=kind==='resistances'?100:200;percent.step='any';percent.required=true;percent.value=item.percent;percentLabel.append(percent);remove.type='button';remove.textContent='Retirer cette ligne';remove.addEventListener('click',()=>{row.remove();updatePreview()});row.append(legend,nameLabel,percentLabel,remove);list.append(row)
  }
  for(const [id,key]of [['enemyAddResistance','resistances'],['enemyAddWeakness','weaknesses']])$(id).addEventListener('click',()=>{try{traitRow(key)}catch(e){$('enemyError').textContent=e.message}})
  function images(){for(const [key,prefix]of [['portrait','enemyPortrait'],['fullBody','enemyFullBody']]){const source=appearance[key] || (key==='portrait'?current?.portrait:null);$(prefix+'Preview').hidden=!source;if(source)$(prefix+'Preview').src=source;else $(prefix+'Preview').removeAttribute('src');$(prefix+'Remove').disabled=!appearance[key]}}
  for(const [key,prefix]of [['portrait','enemyPortrait'],['fullBody','enemyFullBody']]){
    $(prefix+'File').addEventListener('change',async()=>{const file=$(prefix+'File').files[0],token=generation,request=++requests[key];$(prefix+'File').value='';if(!file)return;pending++;$('enemyError').textContent='Préparation de l’image…';try{const image=await readDraftImage(file,{maxSide:1200,maxLength:600000,preserveTransparency:true});if(token===generation&&request===requests[key]){appearance[key]=image;images();$('enemyError').textContent=''}}catch(e){if(token===generation&&request===requests[key])$('enemyError').textContent=e.message || 'Image illisible'}finally{if(token===generation)pending--}})
    $(prefix+'Remove').addEventListener('click',()=>{requests[key]++;delete appearance[key];images()})
  }
  function read(forPreview=false){
    const traits=id=>[...$(id).children].map(row=>({name:row.querySelector('input').value.trim(),percent:row.querySelector('input[type=number]').valueAsNumber}))
    return {...current,name:$('enemyName').value.trim() || (forPreview?'Ennemi':''),description:$('enemyDescription').value,variants:[...$('enemyVariants').querySelectorAll('input:checked')].map(input=>input.value),baseLevel:$('enemyBaseLevel').valueAsNumber,stats:Object.fromEntries(Object.keys(DRAFT_ENEMY_STATS).map(key=>[key,$('enemyStat-'+key).valueAsNumber])),growth:{hpPercent:$('enemyHpGrowth').valueAsNumber,statsPercent:$('enemyStatsGrowth').valueAsNumber,every:$('enemyGrowthEvery').valueAsNumber},resistances:traits('enemyResistances'),weaknesses:traits('enemyWeaknesses'),appearance:{...appearance}}
  }
  function updatePreview(){if(!current)return;try{const data=read(true),select=$('enemyTestVariant'),previous=select.value;select.replaceChildren();for(const key of data.variants){const option=document.createElement('option');option.value=key;option.textContent=DRAFT_ENEMY_VARIANTS[key].label;select.append(option)}if(data.variants.includes(previous))select.value=previous;const result=resolveDraftEnemy(data,select.value,$('enemyTestLevel').valueAsNumber);$('enemyStatsPreview').textContent=Object.entries(result.stats).map(([key,value])=>DRAFT_ENEMY_STATS[key]+' : '+value).join(' · ')}catch(e){$('enemyStatsPreview').textContent=e.message}}
  function edit(enemy){generation++;pending=0;current=copyCampaignContent(enemy);appearance={...enemy.appearance};$('enemyName').value=enemy.name;$('enemyDescription').value=enemy.description;$('enemyBaseLevel').value=enemy.baseLevel;for(const input of $('enemyVariants').querySelectorAll('input'))input.checked=enemy.variants.includes(input.value);for(const key of Object.keys(DRAFT_ENEMY_STATS))$('enemyStat-'+key).value=enemy.stats[key];$('enemyHpGrowth').value=enemy.growth.hpPercent;$('enemyStatsGrowth').value=enemy.growth.statsPercent;$('enemyGrowthEvery').value=enemy.growth.every;$('enemyTestLevel').value=enemy.baseLevel;for(const [key,id]of [['resistances','enemyResistances'],['weaknesses','enemyWeaknesses']]){$(id).replaceChildren();enemy[key].forEach(item=>traitRow(key,item))}for(const prefix of ['enemyPortrait','enemyFullBody'])$(prefix+'File').value='';images();$('enemyError').textContent='';updatePreview();dialog.showModal();$('enemyName').focus()}
  function render(){
    const list=$('bestiary');list.replaceChildren();for(const enemy of getDefinition().bestiary || []){
      const card=document.createElement('div'),name=document.createElement('h3'),image=document.createElement('img'),info=document.createElement('p'),editButton=document.createElement('button'),abilities=document.createElement('button'),copy=document.createElement('button'),remove=document.createElement('button');card.className='enemy-card';name.textContent=enemy.name;image.src=enemy.appearance?.portrait || enemy.portrait;image.alt='Portrait de '+enemy.name;image.className='enemy-thumb';info.className='hint';info.textContent=enemy.variants.map(key=>DRAFT_ENEMY_VARIANTS[key].label).join(' · ')
      for(const [button,text,action]of [[editButton,'Modifier',()=>edit(enemy)],[abilities,'Attaques et capacités',()=>onAbilities(enemy.id)],[copy,'Dupliquer',()=>{try{replaceDefinition(setDraftEnemy(getDefinition(),{...enemy,id:'enemy-'+crypto.randomUUID(),name:enemy.name.slice(0,110)+' (copie)'}));changed();render();message('Copie ajoutée au brouillon.')}catch(e){message(e.message,true)}}],[remove,'Retirer',()=>{if(!window.confirm('Retirer cet ennemi, ses capacités et ses pions de préparation du brouillon ?'))return;try{replaceDefinition(removeDraftEnemy(getDefinition(),enemy.id));changed();render();message('Ennemi retiré du brouillon.')}catch(e){message(e.message,true)}}]] ) {button.type='button';button.textContent=text;button.setAttribute('aria-label',text+' : '+enemy.name);button.addEventListener('click',action)}
      card.append(image,name,info,editButton,abilities,copy,remove);list.append(card)
    }
    if(!list.children.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Aucun ennemi créé. Ajoutez les exemples ou créez votre propre monstre.';list.append(empty)}
    $('enemyLegacyNotice').textContent=getDefinition().enemies?`${Object.keys(getDefinition().enemies.stats).length} ennemis du modèle sont conservés séparément avec leurs règles. Ils ne sont pas remplacés par ces nouvelles fiches.`:''
  }
  $('enemyAdd').addEventListener('click',()=>edit(createDraftEnemyTemplate(null,'enemy-'+crypto.randomUUID())))
  $('enemyAddTemplate').addEventListener('click',()=>edit(createDraftEnemyTemplate($('enemyTemplate').value,'enemy-'+crypto.randomUUID())))
  $('enemyAddExamples').addEventListener('click',()=>{try{const examples=['goblin','wolf','bandit','draugr','golem'].map(key=>createDraftEnemyTemplate(key,'enemy-'+crypto.randomUUID()));replaceDefinition(createCampaignDefinition({...getDefinition(),bestiary:[...(getDefinition().bestiary || []),...examples]}));changed();render();message('Cinq monstres de départ ajoutés. Enregistrez le brouillon pour les conserver.')}catch(e){message(e.message,true)}})
  $('enemyCancel').addEventListener('click',()=>dialog.close());$('enemyForm').addEventListener('input',updatePreview);$('enemyForm').addEventListener('change',updatePreview)
  $('enemyForm').addEventListener('submit',event=>{event.preventDefault();try{if(pending)throw Error('Attendez la fin de la préparation des images.');replaceDefinition(setDraftEnemy(getDefinition(),read()));changed();render();dialog.close();message('Ennemi préparé. Enregistrez le brouillon pour le conserver.')}catch(e){$('enemyError').textContent=e.message}})
  return {render}
}
function draftTokenName(definition,token){const actor=draftStagingActor(definition,token);return token.label || actor?.name || 'Pion'}
function createDraftStagingBoard({getDefinition,onSelect,onMove,onRemove}) {
  const board=document.getElementById('prepBoard'),layer=document.getElementById('prepTokenLayer'),image=document.getElementById('prepMapImage');let locationId=null,drag=null
  function select(id){for(const button of layer.querySelectorAll('button')){const active=button.dataset.tokenId===id;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))}}
  function render(place,selectedId,displayTokens) {
    locationId=place?.id || null;drag=null;layer.replaceChildren();board.hidden=!place
    if(!place)return
    image.onload=()=>{if(locationId===place.id&&image.naturalWidth)board.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight}
    image.hidden=!place.background;if(place.background){if(image.getAttribute('src')!==place.background)image.src=place.background;if(image.complete&&image.naturalWidth)board.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight}else{image.removeAttribute('src');board.style.aspectRatio='16/9'}
    const definition=getDefinition(),tokens=displayTokens ?? definition.staging?.find(item=>item.locationId===place.id)?.tokens ?? []
    for(const token of tokens) {
      const actor=draftStagingActor(definition,token);if(!actor)continue
      const button=document.createElement('button'),caption=document.createElement('span'),art=document.createElement('img');button.type='button';button.className='prep-token';button.dataset.tokenId=token.id;button.style.left=token.x+'%';button.style.top=token.y+'%';button.setAttribute('aria-label','Pion '+draftTokenName(definition,token));button.title=draftTokenName(definition,token);caption.className='prep-token-name';caption.textContent=draftTokenName(definition,token);art.src=actor.appearance?.portrait || actor.image || actor.portrait || 'images/draft-hero.svg';art.alt='';art.draggable=false;art.addEventListener('error',()=>{art.remove();button.classList.add('no-portrait')});button.append(art,caption)
      button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();button.focus({preventScroll:true});onSelect(token.id);select(token.id);drag={id:token.id,button,startX:event.clientX,startY:event.clientY,x:token.x,y:token.y};button.setPointerCapture(event.pointerId)})
      button.addEventListener('pointermove',event=>{if(drag?.id!==token.id)return;const rect=board.getBoundingClientRect();drag.x=Math.round(Math.min(98,Math.max(2,token.x+(event.clientX-drag.startX)*100/rect.width))*100)/100;drag.y=Math.round(Math.min(98,Math.max(2,token.y+(event.clientY-drag.startY)*100/rect.height))*100)/100;button.style.left=drag.x+'%';button.style.top=drag.y+'%'})
      button.addEventListener('pointerup',event=>{if(drag?.id!==token.id)return;const state=drag;drag=null;if(Math.abs(event.clientX-state.startX)+Math.abs(event.clientY-state.startY)>2)onMove(token.id,{x:state.x,y:state.y});else{button.style.left=token.x+'%';button.style.top=token.y+'%'}})
      button.addEventListener('pointercancel',()=>{drag=null;button.style.left=token.x+'%';button.style.top=token.y+'%'})
      button.addEventListener('click',()=>{onSelect(token.id);select(token.id)})
      button.addEventListener('keydown',event=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[event.key]){event.preventDefault();onSelect(token.id);const factor=event.shiftKey?5:1;onMove(token.id,{x:Math.max(2,Math.min(98,token.x+moves[event.key][0]*factor)),y:Math.max(2,Math.min(98,token.y+moves[event.key][1]*factor))});layer.querySelector('[data-token-id="'+token.id+'"]')?.focus({preventScroll:true})}else if(event.key==='Delete'&&onRemove){event.preventDefault();onRemove(token.id)}})
      layer.append(button)
    }
    select(selectedId)
  }
  return {render,select}
}
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
function createDraftNpcPanel({getDefinition,commit,status,getLocationId}) {
  const $=id=>document.getElementById(id);let filter='all',editing=null,image=null,generation=0,pending=false
  const places=()=>getDefinition()?.locations || []
  function attempt(fn){return ()=>{try{fn()}catch(error){status(error.message,true)}}}
  function preview(){ $('workspaceNpcPreview').hidden=!image;if(image)$('workspaceNpcPreview').src=image;else $('workspaceNpcPreview').removeAttribute('src') }
  function choices(ids=[]){const list=$('npcLocationChoices');list.replaceChildren();for(const place of places()){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=place.id;check.checked=ids.includes(place.id);label.append(check,document.createTextNode(place.name));list.append(label)}if(!list.children.length)list.textContent='Créez des cartes pour y classer vos PNJ.'}
  function reset(npc){generation++;pending=false;editing=npc?.id || null;image=npc?.image || null;$('workspaceNpcName').value=npc?.name || '';$('workspaceNpcDescription').value=npc?.description || '';$('workspaceNpcImage').value='';choices(npc?.locationIds || (places().some(p=>p.id===filter)?[filter]:[]));preview();$('workspaceNpcAdd').textContent=npc?'Appliquer au PNJ':'Créer ce PNJ';$('npcCancelEdit').hidden=!npc}
  $('workspaceNpcImage').addEventListener('change',async()=>{const file=$('workspaceNpcImage').files[0];$('workspaceNpcImage').value='';if(!file)return;const token=++generation;pending=true;try{const value=await readDraftImage(file,{maxSide:1200,maxLength:600000,preserveTransparency:true});if(token===generation){image=value;preview();status('Image du PNJ prête.')}}catch(error){if(token===generation)status(error.message,true)}finally{if(token===generation)pending=false}})
  $('workspaceNpcRemoveImage').addEventListener('click',()=>{generation++;pending=false;image=null;preview()})
  $('npcCancelEdit').addEventListener('click',()=>reset())
  $('workspaceNpcAdd').addEventListener('click',attempt(()=>{if(pending)throw Error('Attendez la préparation de l’image du PNJ.');const npc={id:editing || 'npc-'+crypto.randomUUID(),name:$('workspaceNpcName').value.trim(),description:$('workspaceNpcDescription').value,locationIds:[...document.querySelectorAll('#npcLocationChoices input:checked').values()].map(el=>el.value),...(image?{image}:{})},all=getDefinition().npcs || [];commit(createCampaignDefinition({...getDefinition(),npcs:editing?all.map(item=>item.id===editing?npc:item):[...all,npc]}));reset();render()}))
  function background(){const place=places().find(item=>item.id===$('npcSceneMap').value);$('npcSceneBackground').hidden=!place?.background;if(place?.background)$('npcSceneBackground').src=place.background;else $('npcSceneBackground').removeAttribute('src')}
  function show(npc){const select=$('npcSceneMap');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Sans décor';select.append(blank);for(const place of places()){const option=document.createElement('option');option.value=place.id;option.textContent=place.name;select.append(option)}select.value=(places().some(p=>p.id===filter)?filter:npc.locationIds?.[0]) || getLocationId() || '';background();$('npcSceneName').textContent=npc.name;$('npcSceneImage').hidden=!npc.image;if(npc.image)$('npcSceneImage').src=npc.image;else $('npcSceneImage').removeAttribute('src');$('npcScene').showModal();$('npcSceneClose').focus()}
  $('npcSceneMap').addEventListener('change',background);$('npcSceneClose').addEventListener('click',()=>$('npcScene').close());$('npcScene').addEventListener('close',()=>{for(const id of ['npcSceneImage','npcSceneBackground'])$(id).removeAttribute('src');$('npcSceneName').textContent=''})
  function render(){const all=getDefinition().npcs || [];if(!['all','unassigned',...places().map(p=>p.id)].includes(filter))filter='all';const tabs=$('npcMapTabs');tabs.replaceChildren();const groups=[{id:'all',name:'Tous'},{id:'unassigned',name:'À classer'},...places()];const matches=(npc,key)=>key==='all'||(key==='unassigned'?!npc.locationIds?.length:npc.locationIds?.includes(key));for(const [index,group]of groups.entries()){const tab=document.createElement('button');tab.type='button';tab.id='npc-tab-'+group.id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','workspaceNpcs');tab.setAttribute('aria-selected',String(filter===group.id));tab.tabIndex=filter===group.id?0:-1;tab.textContent=group.name+' ('+all.filter(n=>matches(n,group.id)).length+')';tab.addEventListener('click',()=>{filter=group.id;render();if(!editing)choices(places().some(p=>p.id===filter)?[filter]:[])});tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%groups.length;if(event.key==='ArrowLeft')next=(index+groups.length-1)%groups.length;if(event.key==='Home')next=0;if(event.key==='End')next=groups.length-1;if(next!==undefined){event.preventDefault();filter=groups[next].id;render();$('npc-tab-'+filter).focus()}});tabs.append(tab)}
    const list=$('workspaceNpcs');list.setAttribute('aria-labelledby','npc-tab-'+filter);list.replaceChildren();for(const npc of all.filter(n=>matches(n,filter))){const card=document.createElement('article'),name=document.createElement('h3'),text=document.createElement('p'),where=document.createElement('p');card.className='workspace-card npc-card';name.textContent=npc.name;text.textContent=npc.description;where.className='hint';where.textContent=(npc.locationIds || []).map(id=>places().find(p=>p.id===id)?.name).join(' · ') || 'À classer';card.append(name,where,text);if(npc.image){const img=document.createElement('img');img.src=npc.image;img.alt='';img.className='npc-card-image';card.prepend(img)}for(const [label,action]of [['Afficher',()=>show(npc)],['Modifier',()=>{reset(npc);$('npcEditor').open=true;$('workspaceNpcName').focus()}],['Retirer',()=>{if(!window.confirm('Retirer ce PNJ et ses pions de préparation ?'))return;commit(createCampaignDefinition({...getDefinition(),...withoutDraftActorTokens(getDefinition(),'npc',npc.id),npcs:all.filter(item=>item.id!==npc.id)}));if(editing===npc.id)reset();render()}]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label+' le PNJ '+npc.name);button.addEventListener('click',attempt(action));card.append(button)}list.append(card)}if(!list.children.length)list.textContent='Aucun PNJ dans cet onglet.';$('workspaceAlliesInfo').textContent=getDefinition().allies?.length?getDefinition().allies.length+' alliés du modèle sont conservés pour la campagne.':'';if(!editing)choices([...document.querySelectorAll('#npcLocationChoices input:checked')].map(el=>el.value))
  }
  return {render,close(){if($('npcScene').open)$('npcScene').close();reset()}}
}
function createDraftGmActionPlayer({getDefinition,audioLibrary,getLocationId,getTrialState,setTrialState}){
  const $=id=>document.getElementById(id),dialog=$('gmActionPreview'),store=createDraftAudioStore(),audio=new Audio();audio.loop=false;let action=null,index=-1,timer=null,shakeTimer=null,generation=0,soundGeneration=0,url=null,live=false,simulation=null,runId=null,pendingRule=null
  const effect=createDraftSequencePlayer($('gmActionEffectStage'),$('gmActionEffects'),()=>{})
  function stopSound(){soundGeneration++;audio.pause();audio.removeAttribute('src');audio.load();if(url)URL.revokeObjectURL(url);url=null}
  function clearScene(){stopSound();effect.cancel();clearTimeout(shakeTimer);$('gmActionScene').classList.remove('action-scene-shake');for(const id of ['gmActionActorImage','gmActionIllustration']){$(id).removeAttribute('src');$(id).hidden=true}$('gmActionActor').hidden=true;$('gmActionActorName').textContent='';$('gmActionText').hidden=true;$('gmActionText').textContent=''}
  function hideRule(){$('gmActionRulePanel').hidden=true;$('gmActionScene').hidden=false;pendingRule=null;$('gmActionNext').disabled=false}
  function cancel(){generation++;clearTimeout(timer);clearScene();hideRule()}
  async function playSound(step){stopSound();const token=soundGeneration;try{const track=getDefinition().audioTracks?.find(item=>item.id===step.audioId);if(!track)throw Error('Son introuvable.');let source;if(track.source==='custom'){const blob=await store.get(track.sha256);if(token!==soundGeneration)return;if(!blob)throw Error('Son absent de ce navigateur : réassociez le fichier dans « Mes sons ».');source=URL.createObjectURL(blob);url=source}else source=track.path;if(token!==soundGeneration)return;audio.volume=step.volume/100;audio.src=source;await audio.play()}catch(error){if(token===soundGeneration&&dialog.open)$('gmActionPreviewError').textContent=error.name==='NotAllowedError'?'Cliquez sur Rejouer pour autoriser le son.':error.message}}
  audio.addEventListener('error',()=>{if(dialog.open&&audio.getAttribute('src'))$('gmActionPreviewError').textContent='Impossible de lire ce son. Vous pouvez continuer l’aperçu.'})
  function background(){const place=getDefinition().locations?.find(item=>item.id===$('gmActionPreviewMap').value);$('gmActionBackground').hidden=!place?.background;if(place?.background)$('gmActionBackground').src=place.background;else $('gmActionBackground').removeAttribute('src')}
  function ruleState(){return live?getTrialState():simulation}
  function showRule(step){pendingRule=step;stopSound();effect.cancel();$('gmActionRulePanel').hidden=false;$('gmActionScene').hidden=true;$('gmActionRuleMode').textContent=live?'PARTIE D’ESSAI · effet de jeu réel sur cet essai':'SIMULATION · aucune modification de la partie d’essai';$('gmActionRuleSummary').textContent=step.kind==='combat'?'Démarrer un combat : '+step.enemies.map(entry=>{const enemy=getDefinition().bestiary.find(item=>item.id===entry.enemyId);return entry.count+' × '+enemy.name+' ('+DRAFT_ENEMY_VARIANTS[entry.variant].label+', niveau '+entry.level+')'}).join(' ; '):(step.operation==='heal'?'Rendre ':'Retirer ')+step.amount+(step.unit==='percentMax'?' % des PV maximum':' PV')+' — '+(step.target==='allHeroes'?'tous les héros':step.target==='allEnemies'?'tous les ennemis du combat':step.characterIds.map(id=>getDefinition().characters.find(actor=>actor.id===id).name).join(', '));renderDraftActionState($('gmActionRuleState'),getDefinition(),ruleState());$('gmActionRuleApply').textContent=live?'Appliquer à la partie d’essai':'Simuler cet effet';$('gmActionRuleApply').disabled=false;$('gmActionRuleSkip').disabled=false;$('gmActionRuleResult').textContent='';$('gmActionNext').disabled=true}
  $('gmActionRuleApply').addEventListener('click',()=>{if(!pendingRule)return;try{const result=applyCampaignGameplayStep(getDefinition(),ruleState(),pendingRule,runId+'-'+index);if(live)setTrialState(result.state);else simulation=result.state;renderDraftActionState($('gmActionRuleState'),getDefinition(),result.state);$('gmActionRuleResult').textContent=result.changes.map(change=>change.kind==='combat'?'Combat démarré avec '+change.count+' ennemi(s).':change.name+' : '+change.before+' → '+change.after+' PV').join(' · ');pendingRule=null;$('gmActionRuleApply').disabled=true;$('gmActionRuleSkip').disabled=true;$('gmActionNext').disabled=false}catch(error){$('gmActionRuleResult').textContent=error.message}})
  $('gmActionRuleSkip').addEventListener('click',()=>{pendingRule=null;$('gmActionRuleApply').disabled=true;$('gmActionRuleSkip').disabled=true;$('gmActionRuleResult').textContent='Effet ignoré. Aucune modification.';$('gmActionNext').disabled=false})
  function next(){clearTimeout(timer);if(!action)return;if(index>=action.steps.length-1){dialog.close();return}hideRule();index++;const step=action.steps[index],token=++generation;$('gmActionPreviewError').textContent='';$('gmActionPreviewStatus').textContent='Étape '+(index+1)+' / '+action.steps.length+' · '+({text:'Texte — continuez quand vous avez terminé la lecture',npc:'Apparition du PNJ',image:'Illustration',sound:'Son',effect:'Effet visuel',clear:'Scène effacée',health:'Modifier les PV — confirmation MJ',combat:'Déclencher un combat — confirmation MJ'}[step.kind]);$('gmActionNext').textContent=index===action.steps.length-1?(live?'Fermer la scène':'Terminer l’aperçu'):'Étape suivante'
    if(step.kind==='text'){$('gmActionText').textContent=step.text;$('gmActionText').hidden=false;$('gmActionText').scrollTop=0}
    if(step.kind==='npc'){const npc=getDefinition().npcs?.find(item=>item.id===step.npcId);$('gmActionActor').hidden=false;$('gmActionActorName').textContent=npc?.name || '';if(npc?.image){$('gmActionActorImage').src=npc.image;$('gmActionActorImage').hidden=false}else{$('gmActionActorImage').hidden=true;$('gmActionActorImage').removeAttribute('src')}}
    if(step.kind==='image'){$('gmActionIllustration').src=step.image;$('gmActionIllustration').hidden=false}
    if(step.kind==='sound')playSound(step)
    if(step.kind==='effect'){const phase={enabled:true,effect:step.effect,duration:step.duration*1000,color:step.color,size:100,direction:'forward',darken:step.darken,shake:false,flash:step.flash,images:[]},disabled={...phase,enabled:false};effect.play({visual:{intensity:step.intensity,sequence:{preparation:phase,launch:disabled,impact:disabled}}});clearTimeout(shakeTimer);$('gmActionScene').classList.remove('action-scene-shake');if(step.shake){void $('gmActionScene').offsetWidth;$('gmActionScene').classList.add('action-scene-shake');shakeTimer=setTimeout(()=>$('gmActionScene').classList.remove('action-scene-shake'),step.duration*1000)}}
    if(step.kind==='clear')clearScene()
    if(['health','combat'].includes(step.kind))showRule(step)
    if(step.advance==='auto'&&!['text','health','combat'].includes(step.kind)&&index<action.steps.length-1)timer=setTimeout(()=>{if(token===generation&&dialog.open)next()},step.delay*1000)
  }
  function replay(){if(live)return;cancel();simulation=createCampaignActionSession(getDefinition());runId=crypto.randomUUID();index=-1;next()}
  function open(value,only,execute=false){cancel();live=execute;simulation=createCampaignActionSession(getDefinition());runId=crypto.randomUUID();$('gmActionReplay').hidden=live;action=copyCampaignContent(value);if(only!==undefined)action.steps=[action.steps[only]];$('gmActionPreviewName').textContent=value.name || 'Essai du bouton';const select=$('gmActionPreviewMap');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Sans décor';select.append(blank);for(const place of getDefinition().locations || []){const option=document.createElement('option');option.value=place.id;option.textContent=place.name;select.append(option)}select.value=value.locationIds?.[0] || getLocationId() || '';background();audioLibrary.holdForAction(true);if(!dialog.open)dialog.showModal();index=-1;next();$('gmActionNext').focus()}
  $('gmActionPreviewMap').addEventListener('change',background);$('gmActionPreviewClose').addEventListener('click',()=>dialog.close());$('gmActionNext').addEventListener('click',next);$('gmActionReplay').addEventListener('click',replay);dialog.addEventListener('close',()=>{cancel();action=null;$('gmActionBackground').removeAttribute('src');audioLibrary.holdForAction(false)});window.addEventListener('pagehide',cancel)
  return {open,close(){if(dialog.open)dialog.close();else cancel()}}
}
function renderDraftActionState(parent,definition,state){
  parent.replaceChildren();const heroes=document.createElement('div');heroes.className='gm-rule-health-list'
  for(const actor of definition.characters){const health=state.characters[actor.id];if(!health)continue;const row=document.createElement('p');row.dataset.actorId=actor.id;row.textContent=actor.name+' : '+health.hp+' / '+health.maxHP+' PV';heroes.append(row)}parent.append(heroes)
  const combat=document.createElement('p');combat.className='gm-rule-combat-state';combat.textContent=state.combat?.active?'Combat en cours · '+state.combat.enemies.length+' ennemi(s)':'Aucun combat en cours';parent.append(combat)
  if(state.combat?.active){const list=document.createElement('ul');list.className='gm-rule-enemies';for(const enemy of state.combat.enemies){const item=document.createElement('li');item.dataset.enemyId=enemy.id;item.textContent=enemy.name+' · '+DRAFT_ENEMY_VARIANTS[enemy.variant].label+' · niveau '+enemy.level+' · '+enemy.hp+' / '+enemy.maxHP+' PV';list.append(item)}parent.append(list)}
}
function createDraftGmActionPanel({getDefinition,getDraftId,commit,status,getLocationId,audioLibrary}){
  const $=id=>document.getElementById(id),dialog=$('gmActionEditor'),player=createDraftGmActionPlayer({getDefinition,audioLibrary,getLocationId,getTrialState:trialState,setTrialState:value=>{sessions.set(getDraftId(),value);renderTrial()}}),labels={text:'Texte',npc:'PNJ',image:'Image',sound:'Son',effect:'Effet visuel',clear:'Effacer la scène',health:'Modifier les PV',combat:'Déclencher un combat'};const sessions=new Map();let selected=null,steps=[],generation=0,pending=0
  function error(text=''){$('gmActionError').textContent=text;if(text&&!dialog.open)status(text,true)}
  function attempt(fn){return ()=>{try{fn()}catch(e){error(e.message)}}}
  function defaults(kind){return {kind,advance:kind==='effect'?'auto':'manual',delay:2,...(kind==='text'?{text:''}:kind==='npc'?{npcId:getDefinition().npcs?.[0]?.id || ''}:kind==='sound'?{audioId:getDefinition().audioTracks?.[0]?.id || '',volume:70}:kind==='effect'?{effect:'smoke',duration:2,color:'#9c74ca',intensity:2,darken:false,shake:false,flash:false}:kind==='image'?{image:''}:kind==='health'?{operation:'damage',amount:10,unit:'points',target:'allHeroes',characterIds:[]}:kind==='combat'?{enemies:[]}:{})}}
  function input(parent,label,type,value,onChange,extra={}){const wrap=document.createElement('label'),el=document.createElement(type==='textarea'?'textarea':'input');wrap.textContent=label;if(type!=='textarea')el.type=type;Object.assign(el,extra);el.value=value;el.addEventListener('input',()=>onChange(type==='number'||type==='range'?el.valueAsNumber:el.value));wrap.append(el);parent.append(wrap);return el}
  function select(parent,label,options,value,onChange){const wrap=document.createElement('label'),el=document.createElement('select');wrap.textContent=label;el.setAttribute('aria-label',label);for(const [key,name]of Object.entries(options)){const option=document.createElement('option');option.value=key;option.textContent=name;el.append(option)}el.value=value;el.addEventListener('change',()=>onChange(el.value));wrap.append(el);parent.append(wrap);return el}
  function button(parent,label,fn,aria=label){const el=document.createElement('button');el.type='button';el.textContent=label;el.setAttribute('aria-label',aria);el.addEventListener('click',attempt(fn));parent.append(el);return el}
  function trialState(){const key=getDraftId();const state=reconcileCampaignActionSession(getDefinition(),sessions.get(key) || createCampaignActionSession(getDefinition()));sessions.set(key,state);return state}
  function renderTrial(){renderDraftActionState($('gmActionTrialState'),getDefinition(),trialState());$('gmActionTrialEnd').hidden=!trialState().combat?.active}
  $('gmActionTrialReset').addEventListener('click',()=>{if(!window.confirm('Réinitialiser uniquement les PV et le combat de cette partie d’essai ?'))return;sessions.set(getDraftId(),createCampaignActionSession(getDefinition()));renderTrial();status('Partie d’essai réinitialisée. Le brouillon reste inchangé.')})
  $('gmActionTrialEnd').addEventListener('click',()=>{const state=trialState();sessions.set(getDraftId(),{...state,combat:null});renderTrial();status('Combat d’essai terminé.')})
  function gameplayFields(card,step){
    if(step.kind==='health'){
      select(card,'Effet sur la vie',{damage:'Retirer des PV',heal:'Rendre des PV'},step.operation,value=>step.operation=value)
      const amount=input(card,'Montant','number',step.amount,value=>step.amount=value,{min:.01,max:step.unit==='percentMax'?100:1000000,step:'any'})
      select(card,'Unité',{points:'PV fixes',percentMax:'% des PV maximum'},step.unit,value=>{step.unit=value;amount.max=value==='percentMax'?100:1000000})
      const choices=document.createElement('div');choices.className='gm-rule-character-choices';choices.hidden=step.target!=='selected'
      select(card,'Cibles',{allHeroes:'Tous les héros',selected:'Personnages choisis',allEnemies:'Tous les ennemis du combat'},step.target,value=>{step.target=value;choices.hidden=value!=='selected'})
      for(const actor of getDefinition().characters){const label=document.createElement('label'),check=document.createElement('input');label.className='sequence-checkbox';check.type='checkbox';check.value=actor.id;check.checked=step.characterIds.includes(actor.id);check.addEventListener('change',()=>{step.characterIds=[...choices.querySelectorAll('input:checked')].map(input=>input.value)});label.append(check,document.createTextNode(actor.name));choices.append(label)}card.append(choices)
      const hint=document.createElement('p');hint.className='hint';hint.textContent='Modification directe, sans défense ni critique. Les PV restent entre 0 et le maximum. Les soins peuvent relever un personnage à 0 PV.';card.append(hint)
    }
    if(step.kind==='combat'){
      const list=document.createElement('div');card.append(list)
      function rows(){list.replaceChildren();for(const [index,entry]of step.enemies.entries()){
        const row=document.createElement('fieldset'),legend=document.createElement('legend');row.className='gm-rule-enemy';legend.textContent='Groupe '+(index+1);row.append(legend)
        select(row,'Ennemi',{'':'Choisir dans le bestiaire',...Object.fromEntries((getDefinition().bestiary || []).map(enemy=>[enemy.id,enemy.name]))},entry.enemyId,value=>{const enemy=getDefinition().bestiary.find(item=>item.id===value);entry.enemyId=value;entry.variant=enemy?.variants[0] || '';entry.level=enemy?.baseLevel || 1;rows()})
        const enemy=getDefinition().bestiary?.find(item=>item.id===entry.enemyId)
        select(row,'Catégorie',Object.fromEntries((enemy?.variants || []).map(key=>[key,DRAFT_ENEMY_VARIANTS[key].label])),entry.variant,value=>entry.variant=value)
        input(row,'Niveau','number',entry.level,value=>entry.level=value,{min:enemy?.baseLevel || 1,max:1000,step:1});input(row,'Nombre','number',entry.count,value=>entry.count=value,{min:1,max:20,step:1});button(row,'Retirer ce groupe',()=>{step.enemies.splice(index,1);rows()});list.append(row)
      }}
      button(card,'Ajouter des ennemis',()=>{if(step.enemies.length>=20)throw Error('20 ennemis maximum par rencontre.');const enemy=getDefinition().bestiary?.[0];if(!enemy)throw Error('Créez d’abord un ennemi dans le Bestiaire.');step.enemies.push({enemyId:enemy.id,variant:enemy.variants[0],level:enemy.baseLevel,count:1});rows()});rows();const hint=document.createElement('p');hint.className='hint';hint.textContent='Les PV et statistiques sont calculés selon la catégorie et le niveau du bestiaire. Un combat existant ne sera pas remplacé.';card.append(hint)
    }
    const hint=document.createElement('p');hint.className='hint';hint.textContent='Cet effet attend votre confirmation. Il est simulé dans l’aperçu, et appliqué à la partie d’essai avec Déclencher.';card.append(hint)
  }
  function read(only){if(pending)throw Error('Attendez la préparation de l’image.');const action={id:selected || 'event-'+crypto.randomUUID(),name:$('gmActionName').value.trim() || (only!==undefined?'Essai de l’étape':''),locationIds:[...document.querySelectorAll('#gmActionLocations input:checked')].map(el=>el.value),steps:only===undefined?steps:[steps[only]]};return createCampaignGmActions([action],getDefinition())[0]}
  function renderSteps(){const list=$('gmActionSteps');list.replaceChildren();for(const [index,step]of steps.entries()){const card=document.createElement('fieldset'),legend=document.createElement('legend');card.className='gm-action-step';card.dataset.kind=step.kind;legend.textContent=(index+1)+'. '+labels[step.kind];card.append(legend)
    if(step.kind==='text'){input(card,'Texte affiché','textarea',step.text,value=>step.text=value,{maxLength:5000,rows:4});const hint=document.createElement('p');hint.className='hint';hint.textContent='Ce texte attend le clic du MJ. Il reste visible aux étapes suivantes, jusqu’à un autre texte ou « Effacer la scène ».';card.append(hint)}
    if(step.kind==='npc'){select(card,'Personnage à afficher',{'':'Choisir un PNJ',...Object.fromEntries((getDefinition().npcs || []).map(npc=>[npc.id,npc.name]))},step.npcId,value=>step.npcId=value);if(!getDefinition().npcs?.length){const hint=document.createElement('p');hint.textContent='Créez d’abord un PNJ dans l’onglet PNJ et alliés.';card.append(hint)}}
    if(step.kind==='image'){const img=document.createElement('img');img.className='gm-action-image';img.alt='Image de l’étape';img.hidden=!step.image;if(step.image)img.src=step.image;const label=document.createElement('label'),file=document.createElement('input');label.textContent='Votre image (PNG, JPEG ou WebP)';file.type='file';file.accept='image/png,image/jpeg,image/webp';file.addEventListener('change',async()=>{const chosen=file.files[0];file.value='';if(!chosen)return;const token=generation,request=(step.request || 0)+1;step.request=request;pending++;error('Préparation de l’image…');try{const data=await readDraftImage(chosen,{maxSide:1200,maxLength:600000,preserveTransparency:true});if(token===generation&&steps.includes(step)&&step.request===request){step.image=data;img.src=data;img.hidden=false;error()}}catch(e){if(token===generation&&steps.includes(step)&&step.request===request)error(e.message)}finally{if(token===generation)pending--}});label.append(file);card.append(label,img);button(card,'Retirer l’image',()=>{step.request=(step.request || 0)+1;step.image='';img.removeAttribute('src');img.hidden=true})}
    if(step.kind==='sound'){const sound=select(card,'Son de la campagne',{},step.audioId,value=>step.audioId=value);audioLibrary.fillSelect(sound,step.audioId);button(card,'Mes sons / importer un fichier',()=>audioLibrary.openForAction(id=>{if(dialog.open&&steps.includes(step)){step.audioId=id;audioLibrary.fillSelect(sound,id)}}));input(card,'Volume (%)','number',step.volume,value=>step.volume=value,{min:0,max:100,step:5})}
    if(step.kind==='effect'){select(card,'Effet',DRAFT_SEQUENCE_LABELS,step.effect,value=>step.effect=value);input(card,'Couleur','color',step.color,value=>step.color=value);select(card,'Intensité',{'1':'Douce','2':'Normale','3':'Forte'},String(step.intensity),value=>step.intensity=Number(value));input(card,'Durée de l’effet (secondes)','number',step.duration,value=>step.duration=value,{min:.2,max:8,step:.1});for(const [key,title]of Object.entries({darken:'Assombrir',shake:'Tremblement',flash:'Flash doux'})){const label=document.createElement('label'),check=document.createElement('input');label.className='sequence-checkbox';check.type='checkbox';check.checked=step[key];check.addEventListener('change',()=>step[key]=check.checked);label.append(check,document.createTextNode(title));card.append(label)}}
    if(step.kind==='clear'){const hint=document.createElement('p');hint.textContent='Retire le personnage, le texte, l’image et les effets ; arrête le son de la scène.';card.append(hint)}
    if(['health','combat'].includes(step.kind))gameplayFields(card,step)
    if(!['text','health','combat'].includes(step.kind)){const delayWrap=document.createElement('div');delayWrap.hidden=step.advance!=='auto';select(card,'Passer à la suite',{'manual':'Au clic du MJ','auto':'Après un délai'},step.advance,value=>{step.advance=value;delayWrap.hidden=value!=='auto'});input(delayWrap,'Attendre (secondes)','number',step.delay,value=>step.delay=value,{min:.2,max:30,step:.1});card.append(delayWrap)}
    const controls=document.createElement('div');controls.className='gm-action-add';button(controls,'Voir cette étape',()=>player.open(read(index)));button(controls,'↑',()=>{[steps[index-1],steps[index]]=[steps[index],steps[index-1]];renderSteps()},'Monter l’étape '+(index+1)).disabled=index===0;button(controls,'↓',()=>{[steps[index+1],steps[index]]=[steps[index],steps[index+1]];renderSteps()},'Descendre l’étape '+(index+1)).disabled=index===steps.length-1;button(controls,'Retirer',()=>{steps.splice(index,1);renderSteps()},'Retirer l’étape '+(index+1));card.append(controls);list.append(card)
  }if(!steps.length)list.textContent='Commencez par un modèle ou ajoutez votre premier élément ci-dessous.'}
  function edit(action){generation++;pending=0;selected=action?.id || null;steps=copyCampaignContent(action?.steps || []);$('gmActionEditorTitle').textContent=action?'Modifier le bouton MJ':'Créer un bouton MJ';$('gmActionName').value=action?.name || '';const locations=$('gmActionLocations');locations.replaceChildren();for(const place of getDefinition().locations || []){const label=document.createElement('label'),check=document.createElement('input');label.className='sequence-checkbox';check.type='checkbox';check.value=place.id;check.checked=action?.locationIds.includes(place.id) || false;label.append(check,document.createTextNode(place.name));locations.append(label)}error();renderSteps();dialog.showModal();$('gmActionName').focus()}
  for(const button of document.querySelectorAll('[data-action-kind]'))button.addEventListener('click',attempt(()=>{if(steps.length>=30)throw Error('30 étapes maximum par bouton.');steps.push(defaults(button.dataset.actionKind));renderSteps()}))
  for(const button of document.querySelectorAll('[data-action-model]'))button.addEventListener('click',()=>{if(steps.length&&!window.confirm('Remplacer les étapes en préparation par ce modèle ?'))return;const npc={...defaults('npc'),advance:'auto',delay:.6},text={...defaults('text'),text:'Bienvenue. J’ai quelque chose à vous révéler…'};steps=button.dataset.actionModel==='announcement'?[{...text,text:'Un nouvel événement commence…'}]:button.dataset.actionModel==='dialogue'?[npc,text]:[{...defaults('effect'),darken:true,delay:1},npc,text];renderSteps()})
  $('gmActionNew').addEventListener('click',()=>edit());$('gmActionCancel').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{generation++;pending=0;steps=[];selected=null});$('gmActionTest').addEventListener('click',attempt(()=>player.open(read())));$('gmActionApply').addEventListener('click',attempt(()=>{const action=read(),all=getDefinition().gmActions || [];commit(createCampaignDefinition({...getDefinition(),gmActions:selected?all.map(item=>item.id===selected?action:item):[...all,action]}));dialog.close();render()}));$('gmActionFilter').addEventListener('change',render)
  function render(){renderTrial();const filter=$('gmActionFilter'),previous=filter.value;filter.replaceChildren();for(const [id,name]of [['all','Tous les boutons'],['unassigned','À classer'],...(getDefinition().locations || []).map(place=>[place.id,place.name])]){const option=document.createElement('option');option.value=id;option.textContent=name;filter.append(option)}filter.value=[...filter.options].some(o=>o.value===previous)?previous:'all';const list=$('gmActionList');list.replaceChildren();for(const action of getDefinition().gmActions || []){if(filter.value==='unassigned'?action.locationIds.length:filter.value!=='all'&&!action.locationIds.includes(filter.value))continue;const card=document.createElement('article'),title=document.createElement('h3'),summary=document.createElement('p'),where=document.createElement('p');card.className='workspace-card gm-action-card';title.textContent=action.name;summary.textContent=action.steps.map(step=>labels[step.kind]).join(' → ');where.className='hint';where.textContent=action.locationIds.map(id=>getDefinition().locations?.find(place=>place.id===id)?.name).join(' · ') || 'À classer';card.append(title,summary,where);button(card,'Tester',()=>player.open(action),'Tester le bouton '+action.name);button(card,'Déclencher en partie d’essai',()=>player.open(action,undefined,true),'Déclencher le bouton '+action.name);button(card,'Modifier',()=>edit(action),'Modifier le bouton '+action.name);button(card,'Dupliquer',()=>{commit(createCampaignDefinition({...getDefinition(),gmActions:[...getDefinition().gmActions,{...copyCampaignContent(action),id:'event-'+crypto.randomUUID(),name:(action.name+' — copie').slice(0,120)}]}));render()},'Dupliquer le bouton '+action.name);button(card,'Retirer',()=>{if(!window.confirm('Retirer ce bouton de la campagne ?'))return;commit(createCampaignDefinition({...getDefinition(),gmActions:getDefinition().gmActions.filter(item=>item.id!==action.id)}));render()},'Retirer le bouton '+action.name);list.append(card)}if(!list.children.length)list.textContent='Aucun bouton ici. Créez votre première scène.'}
  return {render,close(){player.close();if(dialog.open)dialog.close()}}
}
function createDraftGmWorkspace({getDraftId,getDefinition,replaceDefinition,changed,onSave,message,onCreateMap,onEditMap,audioLibrary}) {
  const $=id=>document.getElementById(id),dialog=$('gmWorkspace');let locationId=null,selectedId=null
  const tokens=()=>locationId?draftMapHeroTokens(getDefinition(),locationId):[]
  function status(text,error=false){ $('workspaceStatus').textContent=text; $('workspaceStatus').classList.toggle('workspace-error',error) }
  function guard(fn){return (...args)=>{try{fn(...args)}catch(e){status(e.message,true)}}}
  function commit(value){replaceDefinition(value);changed();status('Campagne modifiée. Enregistrez le brouillon pour la conserver.')}
  const board=createDraftStagingBoard({getDefinition,onSelect:id=>{selectedId=id;board.select(id)},onMove:(id,patch)=>{try{const token=tokens().find(token=>token.id===id);if(!token)return;const saved=getDefinition().staging?.find(item=>item.locationId===locationId)?.tokens || [];const updated={...token,...patch};commit(setDraftBoard(getDefinition(),locationId,saved.some(item=>item.id===id)?saved.map(item=>item.id===id?updated:item):[...saved,updated]));renderMap()}catch(e){status(e.message,true)}}})
  const navigator=createDraftMapNavigator({getDefinition,commit,onSelect:place=>{locationId=place?.id || null;selectedId=null;renderMap()},onCreateMap,onEditMap})
  function renderMap(){const place=navigator.render(locationId);if(locationId!==place?.id)selectedId=null;locationId=place?.id || null;$('prepMapEmpty').hidden=!!place;$('prepMapName').textContent=place?.name || 'Choisissez une carte';board.render(place,selectedId,tokens());audioLibrary.mapChanged(place)}
  $('prepZoom').addEventListener('input',()=>{$('prepBoard').style.width=$('prepZoom').value+'%';$('prepZoomValue').textContent=$('prepZoom').value+' %'})
  $('locationDialog').addEventListener('close',()=>{if(dialog.open){navigator.reveal(locationId);renderMap()}})
  function goTab(key){$('workspaceFiles').open=false;for(const button of $('workspaceTabs').querySelectorAll('[role=tab]')){const active=button.dataset.workspaceTab===key;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1}for(const panel of $('workspaceBody').children)panel.hidden=panel.id!=='workspace-'+key;$('workspaceBody').scrollTop=0}
  const tabButtons=[...$('workspaceTabs').querySelectorAll('[role=tab]')];for(const [index,button]of tabButtons.entries()){button.addEventListener('click',()=>{render();goTab(button.dataset.workspaceTab)});button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabButtons.length;if(event.key==='ArrowLeft')next=(index+tabButtons.length-1)%tabButtons.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabButtons.length-1;if(next!==undefined){event.preventDefault();render();goTab(tabButtons[next].dataset.workspaceTab);tabButtons[next].focus()}})}
  $('workspaceEditPlaces').addEventListener('click',()=>{const panel=$('locationPanel');panel.open=true;panel.scrollIntoView({block:'start'});panel.querySelector('summary').focus()})
  $('workspaceClose').addEventListener('click',()=>dialog.close());$('workspaceSave').addEventListener('click',guard(()=>{onSave();status($('error').textContent || $('status').textContent,!!$('error').textContent)}))
  dialog.addEventListener('cancel',event=>{if(event.target===dialog&&$('workspaceFiles').open){event.preventDefault();$('workspaceFiles').open=false}})
  dialog.addEventListener('close',()=>{$('workspaceFiles').open=false;audioLibrary.setWorkspaceOpen(false);npcPanel.close();actionPanel.close();if(getDefinition())board.render(getDefinition().locations?.find(place=>place.id===locationId),selectedId,tokens())})
  $('workspaceNotes').addEventListener('input',()=>{replaceDefinition({...getDefinition(),preparationNotes:$('workspaceNotes').value});changed();status('Notes modifiées. Enregistrez le brouillon pour les conserver.')})
  const npcPanel=createDraftNpcPanel({getDefinition,commit,status,getLocationId:()=>locationId})
  const actionPanel=createDraftGmActionPanel({getDefinition,getDraftId,commit,status,getLocationId:()=>locationId,audioLibrary})
  const renderNpcs=()=>npcPanel.render()
  function render(){if(!getDefinition())return;renderMap();renderNpcs();actionPanel.render();$('workspaceNotes').value=getDefinition().preparationNotes || '';}
  function open(key='campaign'){if(!getDefinition())return;render();goTab(key);status('Mode préparation locale. Aucun joueur connecté à cette carte.');if(!dialog.open)dialog.showModal();audioLibrary.setWorkspaceOpen(true);$('workspace-tab-'+key).focus({preventScroll:true})}
  $('openGmWorkspace').addEventListener('click',()=>open())
  return {render,open,showTab:goTab}
}
function createDraftAudioLibrary({getDefinition,replaceDefinition,changed}){
  const $=id=>document.getElementById(id),dialog=$('audioLibraryDialog'),store=createDraftAudioStore();let currentMapId=null,enabled=false,workspaceOpen=false,context='location',importGeneration=0,syncGeneration=0,previewHeld=false,actionSelect=null
  const player=createDraftMapAudioPlayer({resolveSource:async track=>{if(track.source==='builtin')return {url:track.path,disposable:false};const blob=await store.get(track.sha256);if(!blob)throw Error('Fichier audio absent de ce navigateur : réassociez « '+track.fileName+' » dans la bibliothèque.');return {url:URL.createObjectURL(blob),disposable:true}}})
  const tracks=()=>getDefinition()?.audioTracks || [],mapPlace=()=>getDefinition()?.locations?.find(place=>place.id===currentMapId),currentTrack=()=>tracks().find(track=>track.id===mapPlace()?.audioId)
  function status(text,error=false){$('audioLibraryStatus').textContent=text;$('audioLibraryStatus').classList.toggle('workspace-error',error)}
  function fillSelect(select,value=select.value){select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Sans son';select.append(empty);for(const track of tracks()){const option=document.createElement('option');option.value=track.id;option.textContent=track.name;select.append(option)}select.value=tracks().some(track=>track.id===value)?value:''}
  function mapUi(){fillSelect($('mapSoundSelect'),mapPlace()?.audioId || '');$('mapSoundToggle').textContent=enabled?'Couper les ambiances':'Écouter les ambiances';$('mapSoundToggle').setAttribute('aria-pressed',String(enabled));$('mapSoundState').textContent=currentTrack()?(enabled?'Ambiance active : ':'Ambiance prête : ')+currentTrack().name:'Carte sans ambiance sonore.'}
  async function sync(){const token=++syncGeneration;mapUi();if(!workspaceOpen||dialog.open||previewHeld)return;if(!enabled){player.stop();return}try{await player.play(currentTrack());if(token===syncGeneration)mapUi()}catch(error){if(token!==syncGeneration)return;enabled=false;mapUi();$('mapSoundState').textContent=error.name==='NotAllowedError'?'Cliquez sur « Écouter les ambiances » pour autoriser le son.':error.message}}
  function commit(value){replaceDefinition(value);changed()}
  function assignMap(id){const place=mapPlace();if(!place)return;const {audioId,...rest}=place;commit(setDraftLocation(getDefinition(),{...rest,...(id?{audioId:id}:{})}));sync()}
  function refresh(){fillSelect($('locationAudioSelect'));mapUi();if(dialog.open)render()}
  function selectImported(id){refresh();if(context==='action'){actionSelect?.(id);return;}if(context==='location'&&$('locationDialog').open)$('locationAudioSelect').value=id;else if(context==='map'&&mapPlace())assignMap(id)}
  async function importFile(file,expected){const token=++importGeneration;status('Préparation du son personnalisé…');try{const result=await readDraftAudioFile(file);if(token!==importGeneration)return;if(expected&&result.sha256!==expected.sha256)throw Error('Ce fichier ne correspond pas au son attendu. Choisissez le fichier original : '+expected.fileName);await store.put(result.sha256,result.blob);if(token!==importGeneration)return;const existing=tracks().find(track=>track.source==='custom'&&track.sha256===result.sha256);let id=existing?.id;if(!id){const track={id:'sound-'+crypto.randomUUID(),name:($('audioImportName').value.trim() || file.name.replace(/\.[^.]+$/,'') || 'Son personnalisé').slice(0,120),source:'custom',sha256:result.sha256,fileName:result.fileName,mime:result.mime,bytes:result.bytes};commit(createCampaignDefinition({...getDefinition(),audioTracks:[...tracks(),track]}));id=track.id}if(expected){refresh();sync()}else selectImported(id);status(existing?'Fichier réassocié au son existant. Vous pouvez le réutiliser sur vos cartes.':context==='action'?'Son personnalisé ajouté au bouton en préparation.':context==='map'?'Son personnalisé ajouté à la carte affichée. Enregistrez le brouillon.':'Son personnalisé ajouté et sélectionné. Appliquez la fiche de la carte, puis enregistrez le brouillon.')}catch(error){if(token===importGeneration)status(error.message,true)}}
  $('audioImportFile').addEventListener('change',()=>{const file=$('audioImportFile').files[0];$('audioImportFile').value='';if(file)importFile(file)})
  $('audioAddBuiltin').addEventListener('click',()=>{try{const examples={forest:{name:'Forêt',path:'audio/foret.mp3'},tavern:{name:'Taverne',path:'audio/ambiancetaverne.mp3'},market:{name:'Marché',path:'audio/marche.mp3'}},entry=examples[$('audioBuiltinChoice').value],existing=tracks().find(track=>track.source==='builtin'&&track.path===entry.path),id=existing?.id || 'sound-'+crypto.randomUUID();if(!existing)commit(createCampaignDefinition({...getDefinition(),audioTracks:[...tracks(),{id,source:'builtin',...entry}]}));selectImported(id);status('Son de base disponible pour les cartes.')}catch(error){status(error.message,true)}})
  function render(){const list=$('audioLibraryList');list.replaceChildren();for(const track of tracks()){
    const row=document.createElement('div'),label=document.createElement('label'),name=document.createElement('input'),info=document.createElement('p'),availability=document.createElement('p'),rename=document.createElement('button'),test=document.createElement('button'),remove=document.createElement('button');row.className='audio-track-card';row.dataset.audioId=track.id;label.textContent='Nom du son';name.value=track.name;name.maxLength=120;label.append(name);info.className=availability.className='hint';info.textContent=track.source==='custom'?'Fichier personnel : '+track.fileName:'Son de base disponible sur le site';rename.type=test.type=remove.type='button';rename.textContent='Renommer';test.textContent='Écouter';test.setAttribute('aria-label','Écouter '+track.name);remove.textContent='Retirer de la bibliothèque'
    rename.addEventListener('click',()=>{try{commit(createCampaignDefinition({...getDefinition(),audioTracks:tracks().map(item=>item.id===track.id?{...item,name:name.value.trim()}:item)}));refresh();status('Nom modifié. Les cartes gardent le même son.')}catch(error){status(error.message,true)}})
    test.addEventListener('click',async()=>{try{await player.play(track);status('Écoute : '+track.name)}catch(error){status(error.message,true)}})
    remove.addEventListener('click',()=>{try{if(!window.confirm('Retirer ce son ? Les cartes qui l’utilisent passeront en « Sans son ».'))return;commit(removeDraftAudioTrack(getDefinition(),track.id));if(player.currentKey()===draftAudioTrackKey(track))player.stop();refresh();status('Son retiré de cette campagne. Le fichier original reste inchangé.')}catch(error){status(error.message,true)}})
    row.append(label,info,availability,rename,test,remove)
    if(track.source==='custom'){
      availability.textContent='Vérification du fichier local…';store.get(track.sha256).then(blob=>{if(row.isConnected)availability.textContent=blob?'Fichier disponible dans ce navigateur.':'Fichier à réassocier dans ce navigateur.'}).catch(()=>{if(row.isConnected)availability.textContent='Stockage audio indisponible.'})
      const attach=document.createElement('label'),file=document.createElement('input');attach.textContent='Réassocier le fichier original';file.type='file';file.accept='.mp3,.wav,.ogg,.m4a';file.addEventListener('change',()=>{const selected=file.files[0];file.value='';if(selected)importFile(selected,track)});attach.append(file);row.append(attach)
    }
    list.append(row)
  }if(!list.children.length)list.textContent='Aucun son ajouté. Importez vos fichiers personnels ou choisissez un son de base.'}
  function open(value='location'){context=value;status('');render();dialog.showModal()}
  $('locationManageAudio').addEventListener('click',()=>open('location'));$('mapManageAudio').addEventListener('click',()=>open('map'));$('audioLibraryClose').addEventListener('click',()=>dialog.close());$('audioStopTest').addEventListener('click',()=>{player.stop();status('Écoute arrêtée.')})
  dialog.addEventListener('close',()=>{importGeneration++;if(workspaceOpen&&enabled)sync();else player.stop()})
  $('mapSoundSelect').addEventListener('change',()=>{try{assignMap($('mapSoundSelect').value)}catch(error){$('mapSoundState').textContent=error.message}})
  $('mapSoundToggle').addEventListener('click',()=>{enabled=!enabled;sync()});$('mapSoundVolume').addEventListener('input',()=>{player.setVolume(Number($('mapSoundVolume').value)/100);$('mapSoundVolumeValue').textContent=$('mapSoundVolume').value+' %'})
  window.addEventListener('pagehide',()=>{syncGeneration++;player.stop()})
  return {fillSelect,refresh,openForAction(callback){actionSelect=callback;open('action')},holdForAction(value){previewHeld=value;if(value){syncGeneration++;player.pause()}else sync()},mapChanged(place){currentMapId=place?.id || null;sync()},setWorkspaceOpen(value){workspaceOpen=value;if(!value){syncGeneration++;enabled=false;player.stop();mapUi()}else sync()}}
}
(() => {
  const $=id=>document.getElementById(id)
  let current=null, dirty=false, copyMode=false, store
  try { store=createLocalCampaignDraftStore(window.localStorage) } catch { /* Export remains available without storage. */ }
  const message=(text,error=false)=>{ $(error?'error':'status').textContent=text; $(error?'status':'error').textContent='';if($('gmWorkspace').open){$('workspaceStatus').textContent=text;$('workspaceStatus').classList.toggle('workspace-error',error)} }
  const guard=fn=>async(...args)=>{try{await fn(...args)}catch(error){message(error.message || 'Impossible de terminer cette action.',true)}}
  const discard=()=>!dirty || window.confirm('Abandonner les modifications non enregistrées de ce brouillon ?')
  const uuid=()=>crypto.randomUUID()
  const characterPanel=createDraftCharacterPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message,guard,onAbilities:id=>abilityPanel.open(id)})
  const abilityPanel=createDraftAbilityPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message})
  const audioLibrary=createDraftAudioLibrary({getDefinition:()=>current?.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()}})
  const locationPanel=createDraftLocationPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message,audioLibrary})
  const bestiaryPanel=createDraftBestiaryPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message,onAbilities:id=>abilityPanel.open(id,'enemy')})
  const workspace=createDraftGmWorkspace({getDraftId:()=>current?.draftId,getDefinition:()=>current?.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},onCreateMap:groupId=>locationPanel.create(groupId),onEditMap:place=>locationPanel.edit(place),onSave:()=>{if(!$('title').value.trim()){workspace.showTab('campaign');$('title').focus();throw Error('Donnez un titre à la campagne avant de l’enregistrer.');}$('editor').requestSubmit()},message,audioLibrary})
  function mark(value) { dirty=value; $('state').textContent=value?'Modifications non enregistrées':'Brouillon enregistré localement'; $('delete').disabled=!current?.revision;$('selectedCampaignState').textContent=$('state').textContent }
  function definition() {return createCampaignDefinition({...current.definition,title:$('title').value.trim(),description:$('description').value})}
  function open(record) {
    current=record; $('empty').hidden=true; $('editor').hidden=false;$('selectedCampaign').hidden=false;$('selectedCampaignTitle').textContent=record.definition.title
    $('title').value=record.definition.title; $('description').value=record.definition.description || ''
    summary();characterPanel.render();locationPanel.render();bestiaryPanel.render();workspace.render()
    mark(!record.revision);if(!$('gmWorkspace').open)workspace.open(); message(record.revision?'Brouillon ouvert.':'Brouillon prêt. Enregistrez-le pour le retrouver.'); refresh()
  }
  function summary() {
    const d=current.definition
    $('summary').textContent=`Contenu : ${d.characters.length} personnage(s), ${d.locations?.length || 0} lieu(x) créé(s), ${d.bestiary?.length || 0} ennemi(s) créé(s), ${Object.keys(d.world?.names || {}).length} carte(s) du modèle, ${Object.keys(d.enemies?.stats || {}).length} ennemi(s) du modèle, ${d.allies?.length || 0} allié(s).`
  }
  function refresh() {
    const library=$('library'); library.replaceChildren()
    if (!store) {message('Le stockage local est indisponible. Vous pouvez créer puis exporter un brouillon.',true);return}
    try {
      const {drafts,issues}=store.list()
      if (!drafts.length) {const p=document.createElement('p');p.textContent='Aucun brouillon enregistré pour le moment.';p.className='hint';library.append(p)}
      for (const draft of drafts) {
        const button=document.createElement('button'), date=document.createElement('small')
        button.type='button';button.textContent=draft.definition.title;button.setAttribute('aria-current',String(current?.draftId===draft.draftId));date.textContent=new Date(draft.updatedAt).toLocaleString('fr-FR');button.append(date)
        button.addEventListener('click',guard(()=>{if(discard())open(store.get(draft.draftId))}));library.append(button)
      }
      if(issues.length)message(`${issues.length} brouillon(s) illisible(s), conservé(s) sans modification.`,true)
    }catch{message('Impossible de lire les brouillons locaux. Vos modifications restent exportables.',true)}
  }
  function create(copy) {
    if(!discard())return
    copyMode=copy; $('newTitle').value=copy?'La Prophétie des Mouches — copie':''
    $('createHeading').textContent=copy?'Copier le contenu de la Prophétie':'Une nouvelle campagne'
    $('create').showModal();$('newTitle').focus()
  }
  $('new').addEventListener('click',()=>create(false));$('copy').addEventListener('click',()=>create(true))
  $('cancel').addEventListener('click',()=>$('create').close())
  $('creation').addEventListener('submit',guard(event=>{
    event.preventDefault();const title=$('newTitle').value.trim();if(!title)throw Error('Saisissez un titre.')
    const base=copyMode?importCampaignDraft(exportCampaignDraft(ACTIVE_CAMPAIGN)):{schemaVersion:1,id:'campagne-'+uuid(),characters:[createDraftHero('heros','Mon premier héros')]}
    open({draftId:uuid(),revision:0,definition:createCampaignDefinition({...base,title,description:''})});$('create').close();$('title').focus()
  }))
  $('editor').addEventListener('input',()=>mark(true))
  $('editor').addEventListener('submit',guard(event=>{
    event.preventDefault();if(!store)throw Error('Stockage indisponible : exportez votre brouillon pour le conserver.')
    let record
    try{record=store.save({...current,definition:definition()})}catch(error){if(error.name==='QuotaExceededError')throw Error('Le stockage du navigateur est plein. Exportez ce brouillon pour conserver vos modifications, puis libérez de la place.');throw error}
    open(record);message('Brouillon enregistré dans ce navigateur.')
  }))
  $('export').addEventListener('click',guard(()=>{
    const d=definition(),url=URL.createObjectURL(new Blob([exportCampaignDraft(d)],{type:'application/json'})),link=document.createElement('a')
    link.href=url;link.download=d.id+'.campagne-brouillon.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Fichier de brouillon exporté. Les images ajoutées aux fiches et aux lieux sont incluses ; les autres médias restent des références.')
  }))
  $('delete').addEventListener('click',guard(()=>{
    if(!current?.revision || !window.confirm('Supprimer ce brouillon local et ses modifications ? Cette action ne touche aucune partie.'))return
    $('gmWorkspace').close();store.remove(current);current=null;dirty=false;$('selectedCampaign').hidden=true;$('editor').hidden=true;$('empty').hidden=false;refresh();message('Brouillon local supprimé.')
  }))
  $('import').addEventListener('click',()=>{if(discard())$('file').click()})
  $('file').addEventListener('change',guard(async()=>{
    const file=$('file').files[0];$('file').value='';if(!file)return
    if(file.size>8*1024*1024)throw Error('Fichier trop volumineux (8 Mo maximum).')
    const imported=importCampaignDraft(await file.text());if(!discard())return
    open({draftId:uuid(),revision:0,definition:imported})
  }))
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}})
  window.addEventListener('storage',event=>{if(event.key?.startsWith('rpg-campaign-editor:v1:draft:')){refresh();message('La bibliothèque a changé dans un autre onglet. Rouvrez le brouillon avant de le modifier ; exportez d’abord vos changements.')}})
  refresh()
})()
