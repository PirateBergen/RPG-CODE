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
  return createCampaignDefinition({...definition,characters:definition.characters.filter(c=>c.id!==id)})
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
      if(!window.confirm('Retirer ce personnage du brouillon ?'))return
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
const DRAFT_ABILITY_VISUALS={slash:'Entaille',projectile:'Projectile magique',fire:'Flammes',frost:'Givre',lightning:'Éclair',heal:'Halo de soin',shield:'Bouclier',smoke:'Brume sombre',swarm:'Nuée de particules'}
function setDraftAbility(definition,heroId,ability) {
  if(!definition.characters.some(c=>c.id===heroId))throw Error('Personnage introuvable')
  return createCampaignDefinition({...definition,characters:definition.characters.map(c=>{
    if(c.id!==heroId)return c
    const list=c.abilities || []
    return {...c,abilities:list.some(a=>a.id===ability.id)?list.map(a=>a.id===ability.id?ability:a):[...list,ability]}
  })})
}
function removeDraftAbility(definition,heroId,id) {
  if(!definition.characters.find(c=>c.id===heroId)?.abilities?.some(a=>a.id===id))throw Error('Capacité introuvable')
  return createCampaignDefinition({...definition,characters:definition.characters.map(c=>c.id===heroId?{...c,abilities:c.abilities.filter(a=>a.id!==id)}:c)})
}
function createDraftAbilityPanel({getDefinition,replaceDefinition,changed,message}) {
  const $=id=>document.getElementById(id)
  let heroId=null,selected=null,image=null,generation=0,sequence=0,pending=0,previewTimer=null
  for(const [value,label] of Object.entries(DRAFT_ABILITY_VISUALS)){const option=document.createElement('option');option.value=value;option.textContent=label;$('abilityPreset').append(option)}
  function picture(){$('abilityImagePreview').hidden=!image;if(image)$('abilityImagePreview').src=image;else $('abilityImagePreview').removeAttribute('src');$('abilityImageRemove').disabled=!image}
  function kind(){$('abilityImagePanel').hidden=$('abilityKind').value!=='special'}
  $('abilityKind').addEventListener('change',kind)
  function read() {
    if(pending)throw Error('Attendez la fin de la préparation de l’image.')
    const value={id:selected || 'ability-'+crypto.randomUUID(),kind:$('abilityKind').value,name:$('abilityName').value.trim(),description:$('abilityDescription').value,type:$('abilityType').value,dice:Number($('abilityDice').value),stat:$('abilityStat').value,target:$('abilityTarget').value,effect:{kind:$('abilityEffect').value,value:$('abilityEffectValue').valueAsNumber,turns:$('abilityEffectTurns').valueAsNumber},visual:{preset:$('abilityPreset').value,color:$('abilityColor').value,intensity:Number($('abilityIntensity').value),...($('abilityKind').value==='special'&&image?{image}:{})}}
    for(const key of ['powerMin','powerMax','cooldown','uses'])value[key]=$('ability-'+key).valueAsNumber
    return createCampaignAbilities([value])[0]
  }
  function render() {
    const hero=getDefinition().characters.find(c=>c.id===heroId);$('abilityOwner').textContent='Attaques de '+hero.name
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
    selected=ability?.id || null;generation++;pending=0;image=ability?.visual.image || null;picture();$('abilityImageFile').value=''
    $('abilityKind').value=ability?.kind || newKind;kind();$('abilityName').value=ability?.name || '';$('abilityDescription').value=ability?.description || '';$('abilityType').value=ability?.type || 'damage';$('abilityDice').value=ability?.dice || 6;$('abilityStat').value=ability?.stat || 'force';$('abilityTarget').value=ability?.target || 'enemy'
    for(const [key,value] of Object.entries({powerMin:4,powerMax:8,cooldown:0,uses:0}))$('ability-'+key).value=ability?.[key] ?? value
    $('abilityEffect').value=ability?.effect.kind || 'none';$('abilityEffectValue').value=ability?.effect.value ?? 0;$('abilityEffectTurns').value=ability?.effect.turns ?? 1;$('abilityPreset').value=ability?.visual.preset || 'slash';$('abilityColor').value=ability?.visual.color || '#d8b477';$('abilityIntensity').value=ability?.visual.intensity || 2;$('abilityError').textContent='';$('abilityRemove').hidden=!ability;$('abilityDialog').showModal();$('abilityName').focus()
  }
  function preview(ability) {
    $('abilityPreviewTitle').textContent=ability.name;$('abilityPreviewActor').textContent=getDefinition().characters.find(c=>c.id===heroId).name
    $('abilityPreviewTarget').textContent=ability.target==='self'?'Soi-même':['ally','allAllies'].includes(ability.target)?'Allié':'Cible'
    const backdrop=getDefinition().locations?.find(p=>p.background)?.background
    $('abilityPreviewBackdrop').hidden=!backdrop;if(backdrop)$('abilityPreviewBackdrop').src=backdrop;else $('abilityPreviewBackdrop').removeAttribute('src')
    $('abilityPreview').showModal();play(ability);$('abilityReplay').onclick=()=>play(ability);$('abilityPreviewClose').focus()
  }
  function play(ability) {
    clearTimeout(previewTimer);const stage=$('abilityStage'),effects=$('abilityFx');effects.replaceChildren();stage.className='ability-stage';stage.style.setProperty('--ability-color',ability.visual.color)
    void stage.offsetWidth;stage.classList.add('playing','intensity-'+ability.visual.intensity,'preset-'+ability.visual.preset)
    const count=ability.visual.preset==='swarm'?18:ability.visual.preset==='frost'?9:1
    for(let i=0;i<count;i++){const spark=document.createElement('span');spark.className='ability-spark';spark.style.setProperty('--particle',String(i));effects.append(spark)}
    if(ability.visual.image){const artwork=document.createElement('img');artwork.src=ability.visual.image;artwork.alt='Illustration de la capacité';artwork.className='ability-artwork';effects.append(artwork)}
    previewTimer=setTimeout(()=>{stage.className='ability-stage';effects.replaceChildren()},2400)
  }
  $('abilityPreview').addEventListener('close',()=>{clearTimeout(previewTimer);$('abilityFx').replaceChildren();$('abilityStage').className='ability-stage';$('abilityReplay').onclick=null})
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
  $('abilityForm').addEventListener('submit',event=>{event.preventDefault();try{replaceDefinition(setDraftAbility(getDefinition(),heroId,read()));changed();render();$('abilityDialog').close();message('Capacité ajoutée au brouillon. Pensez à l’enregistrer.')}catch(e){$('abilityError').textContent=e.message}})
  $('abilityRemove').addEventListener('click',()=>{try{if(!selected||!window.confirm('Retirer cette capacité du brouillon ?'))return;replaceDefinition(removeDraftAbility(getDefinition(),heroId,selected));changed();render();$('abilityDialog').close()}catch(e){$('abilityError').textContent=e.message}})
  return {open(id){heroId=id;render();$('abilityLibrary').showModal()}}
}
(() => {
  const $=id=>document.getElementById(id)
  let current=null, dirty=false, copyMode=false, store
  try { store=createLocalCampaignDraftStore(window.localStorage) } catch { /* Export remains available without storage. */ }
  const message=(text,error=false)=>{ $(error?'error':'status').textContent=text; $(error?'status':'error').textContent='' }
  const guard=fn=>async(...args)=>{try{await fn(...args)}catch(error){message(error.message || 'Impossible de terminer cette action.',true)}}
  const discard=()=>!dirty || window.confirm('Abandonner les modifications non enregistrées de ce brouillon ?')
  const uuid=()=>crypto.randomUUID()
  const characterPanel=createDraftCharacterPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message,guard,onAbilities:id=>abilityPanel.open(id)})
  const abilityPanel=createDraftAbilityPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message})
  const locationPanel=createDraftLocationPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message})
  function mark(value) { dirty=value; $('state').textContent=value?'Modifications non enregistrées':'Brouillon enregistré localement'; $('delete').disabled=!current?.revision }
  function definition() {return createCampaignDefinition({...current.definition,title:$('title').value.trim(),description:$('description').value})}
  function open(record) {
    current=record; $('empty').hidden=true; $('editor').hidden=false
    $('title').value=record.definition.title; $('description').value=record.definition.description || ''
    summary();characterPanel.render();locationPanel.render()
    mark(!record.revision); message(record.revision?'Brouillon ouvert.':'Brouillon prêt. Enregistrez-le pour le retrouver.'); refresh()
  }
  function summary() {
    const d=current.definition
    $('summary').textContent=`Contenu : ${d.characters.length} personnage(s), ${d.locations?.length || 0} lieu(x) créé(s), ${Object.keys(d.world?.names || {}).length} carte(s) du modèle, ${Object.keys(d.enemies?.stats || {}).length} ennemi(s), ${d.allies?.length || 0} allié(s).`
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
    store.remove(current);current=null;dirty=false;$('editor').hidden=true;$('empty').hidden=false;refresh();message('Brouillon local supprimé.')
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
