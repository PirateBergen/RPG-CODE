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
  return createCampaignDefinition({...definition,locations:definition.locations.filter(place=>place.id!==id),...(definition.staging!==undefined?{staging:definition.staging.filter(board=>board.locationId!==id)}:{})})
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
      if(!selected||!window.confirm('Retirer ce lieu et ses pions de préparation du brouillon ?'))return
      replaceDefinition(removeDraftLocation(getDefinition(),selected));changed();render();dialog.close();message('Lieu retiré du brouillon.')
    }catch(error){$('locationError').textContent=error.message}
  })
  return {render}
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
      for(const [button,text,action]of [[editButton,'Modifier',()=>edit(enemy)],[abilities,'Attaques et capacités',()=>onAbilities(enemy.id)],[copy,'Dupliquer',()=>{try{replaceDefinition(setDraftEnemy(getDefinition(),{...enemy,id:'enemy-'+crypto.randomUUID(),name:enemy.name.slice(0,110)+' (copie)'}));changed();render();message('Copie ajoutée au brouillon.')}catch(e){message(e.message,true)}}],[remove,'Retirer',()=>{if(!window.confirm('Retirer cet ennemi, ses capacités et ses pions de préparation du brouillon ?'))return;replaceDefinition(removeDraftEnemy(getDefinition(),enemy.id));changed();render();message('Ennemi retiré du brouillon.')}]] ) {button.type='button';button.textContent=text;button.setAttribute('aria-label',text+' : '+enemy.name);button.addEventListener('click',action)}
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
  function render(place,selectedId) {
    locationId=place?.id || null;drag=null;layer.replaceChildren();board.hidden=!place
    if(!place)return
    image.onload=()=>{if(locationId===place.id&&image.naturalWidth)board.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight}
    image.hidden=!place.background;if(place.background){if(image.getAttribute('src')!==place.background)image.src=place.background;if(image.complete&&image.naturalWidth)board.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight}else{image.removeAttribute('src');board.style.aspectRatio='16/9'}
    const definition=getDefinition(),tokens=definition.staging?.find(item=>item.locationId===place.id)?.tokens || []
    for(const token of tokens) {
      const actor=draftStagingActor(definition,token);if(!actor)continue
      const button=document.createElement('button'),caption=document.createElement('span'),art=document.createElement('img');button.type='button';button.className='prep-token';button.dataset.tokenId=token.id;button.style.left=token.x+'%';button.style.top=token.y+'%';button.setAttribute('aria-label','Pion '+draftTokenName(definition,token));button.title=draftTokenName(definition,token);caption.className='prep-token-name';caption.textContent=draftTokenName(definition,token);art.src=actor.appearance?.portrait || actor.image || actor.portrait || 'images/draft-hero.svg';art.alt='';art.draggable=false;art.addEventListener('error',()=>{art.remove();button.classList.add('no-portrait')});button.append(art,caption)
      button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();button.focus({preventScroll:true});onSelect(token.id);select(token.id);drag={id:token.id,button,startX:event.clientX,startY:event.clientY,x:token.x,y:token.y};button.setPointerCapture(event.pointerId)})
      button.addEventListener('pointermove',event=>{if(drag?.id!==token.id)return;const rect=board.getBoundingClientRect();drag.x=Math.round(Math.min(98,Math.max(2,token.x+(event.clientX-drag.startX)*100/rect.width))*100)/100;drag.y=Math.round(Math.min(98,Math.max(2,token.y+(event.clientY-drag.startY)*100/rect.height))*100)/100;button.style.left=drag.x+'%';button.style.top=drag.y+'%'})
      button.addEventListener('pointerup',event=>{if(drag?.id!==token.id)return;const state=drag;drag=null;if(Math.abs(event.clientX-state.startX)+Math.abs(event.clientY-state.startY)>2)onMove(token.id,{x:state.x,y:state.y});else{button.style.left=token.x+'%';button.style.top=token.y+'%'}})
      button.addEventListener('pointercancel',()=>{drag=null;button.style.left=token.x+'%';button.style.top=token.y+'%'})
      button.addEventListener('click',()=>{onSelect(token.id);select(token.id)})
      button.addEventListener('keydown',event=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[event.key]){event.preventDefault();onSelect(token.id);const factor=event.shiftKey?5:1;onMove(token.id,{x:Math.max(2,Math.min(98,token.x+moves[event.key][0]*factor)),y:Math.max(2,Math.min(98,token.y+moves[event.key][1]*factor))});layer.querySelector('[data-token-id="'+token.id+'"]')?.focus({preventScroll:true})}else if(event.key==='Delete'){event.preventDefault();onRemove(token.id)}})
      layer.append(button)
    }
    select(selectedId)
  }
  return {render,select}
}
function createDraftGmWorkspace({getDefinition,replaceDefinition,changed,onSave,message}) {
  const $=id=>document.getElementById(id),dialog=$('gmWorkspace');let locationId=null,selectedId=null,npcImage=null,npcGeneration=0,npcPending=false
  const tokens=()=>getDefinition().staging?.find(board=>board.locationId===locationId)?.tokens || []
  function status(text,error=false){$('workspaceStatus').textContent=text;$('workspaceStatus').classList.toggle('workspace-error',error)}
  function guard(fn){return (...args)=>{try{fn(...args)}catch(e){status(e.message,true)}}}
  const board=createDraftStagingBoard({getDefinition,onSelect:id=>{selectedId=id;inspector();board.select(id)},onMove:(id,patch)=>updateToken(id,patch),onRemove:id=>removeToken(id)})
  function commit(value){replaceDefinition(value);changed();status('Préparation modifiée. Enregistrez le brouillon pour la conserver.')}
  function updateToken(id,patch){try{commit(setDraftBoard(getDefinition(),locationId,tokens().map(token=>token.id===id?{...token,...patch}:token)));renderMap()}catch(e){status(e.message,true)}}
  function removeToken(id){try{commit(setDraftBoard(getDefinition(),locationId,tokens().filter(token=>token.id!==id)));selectedId=null;renderMap()}catch(e){status(e.message,true)}}
  function actors(kind){return getDefinition()[{character:'characters',enemy:'bestiary',npc:'npcs',ally:'allies'}[kind]] || []}
  function option(select,value,label){const item=document.createElement('option');item.value=value;item.textContent=label;select.append(item)}
  function sourceChanged(){const actor=actors($('prepKind').value).find(item=>item.id===$('prepSource').value);$('prepEnemyOptions').hidden=$('prepKind').value!=='enemy';$('prepVariant').replaceChildren();for(const key of actor?.variants || [])option($('prepVariant'),key,DRAFT_ENEMY_VARIANTS[key].label);$('prepLevel').value=actor?.baseLevel || 1;$('prepAddToken').disabled=!locationId||!actor}
  function palette(){const selected=$('prepSource').value,variant=$('prepVariant').value,level=$('prepLevel').value;$('prepSource').replaceChildren();for(const actor of actors($('prepKind').value))option($('prepSource'),actor.id,actor.name);if([...$('prepSource').options].some(item=>item.value===selected))$('prepSource').value=selected;sourceChanged();if($('prepSource').value===selected){if([...$('prepVariant').options].some(item=>item.value===variant))$('prepVariant').value=variant;$('prepLevel').value=level}}
  function inspector(){const token=tokens().find(item=>item.id===selectedId);$('prepInspector').hidden=!token;if(!token)return;$('prepTokenSelect').value=token.id;$('prepTokenLabel').value=token.label || '';$('prepTokenX').value=token.x;$('prepTokenY').value=token.y;$('prepSelectedEnemy').hidden=token.kind!=='enemy';$('prepSelectedVariant').replaceChildren();const actor=draftStagingActor(getDefinition(),token);for(const key of actor?.variants || [])option($('prepSelectedVariant'),key,DRAFT_ENEMY_VARIANTS[key].label);$('prepSelectedVariant').value=token.variant || '';$('prepSelectedLevel').value=token.level || 1;$('prepSelectedStats').textContent=token.kind==='enemy'?'PV préparés : '+resolveDraftEnemy(actor,token.variant,token.level).stats.hp:''}
  function renderMap(){const places=getDefinition().locations || [],previous=locationId;$('prepLocation').replaceChildren();for(const place of places)option($('prepLocation'),place.id,place.name);if(!places.some(place=>place.id===locationId)){locationId=places[0]?.id || null;selectedId=null}if(previous!==locationId)selectedId=null;$('prepLocation').value=locationId || '';const place=places.find(item=>item.id===locationId);$('prepMapEmpty').hidden=!!place;$('prepMapName').textContent=place?.name || 'Aucun lieu préparé';board.render(place,selectedId);$('prepTokenSelect').replaceChildren();option($('prepTokenSelect'),'','Choisir un pion');for(const token of tokens())option($('prepTokenSelect'),token.id,draftTokenName(getDefinition(),token)+(token.kind==='enemy'?' · '+DRAFT_ENEMY_VARIANTS[token.variant].label+' niv. '+token.level:''));if(!tokens().some(token=>token.id===selectedId))selectedId=null;inspector();palette()}
  $('prepLocation').addEventListener('change',()=>{locationId=$('prepLocation').value;selectedId=null;renderMap()});$('prepKind').addEventListener('change',palette);$('prepSource').addEventListener('change',sourceChanged)
  $('prepZoom').addEventListener('input',()=>{$('prepBoard').style.width=$('prepZoom').value+'%';$('prepZoomValue').textContent=$('prepZoom').value+' %'})
  $('prepGrid').addEventListener('change',()=>$('prepBoard').classList.toggle('with-grid',$('prepGrid').checked))
  $('prepAddToken').addEventListener('click',guard(()=>{if(!locationId)throw Error('Créez d’abord un lieu.');const kind=$('prepKind').value,actor=actors(kind).find(item=>item.id===$('prepSource').value),count=$('prepQuantity').valueAsNumber;if(!actor||!Number.isInteger(count)||count<1||count>20)throw Error('Choisissez une fiche et une quantité entre 1 et 20.');const next=[...tokens()];for(let i=0;i<count;i++){const index=next.length;next.push({id:'token-'+crypto.randomUUID(),kind,refId:actor.id,x:20+30*(index%3),y:25+40*(Math.floor(index/3)%2),...(kind==='enemy'?{variant:$('prepVariant').value,level:$('prepLevel').valueAsNumber}:{})})}commit(setDraftBoard(getDefinition(),locationId,next));selectedId=next.at(-1).id;renderMap()}))
  $('prepTokenSelect').addEventListener('change',()=>{selectedId=$('prepTokenSelect').value;inspector();board.select(selectedId)})
  $('prepApplyToken').addEventListener('click',()=>{const token=tokens().find(item=>item.id===selectedId);if(!token)return;updateToken(selectedId,{label:$('prepTokenLabel').value.trim(),x:$('prepTokenX').valueAsNumber,y:$('prepTokenY').valueAsNumber,...(token.kind==='enemy'?{variant:$('prepSelectedVariant').value,level:$('prepSelectedLevel').valueAsNumber}:{})})})
  $('prepRemoveToken').addEventListener('click',()=>removeToken(selectedId))
  function goTab(key){for(const button of $('workspaceTabs').querySelectorAll('[role=tab]')){const active=button.dataset.workspaceTab===key;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1}for(const panel of dialog.querySelectorAll('[role=tabpanel]'))panel.hidden=panel.id!=='workspace-'+key;$('workspaceBody').scrollTop=0}
  const tabButtons=[...$('workspaceTabs').querySelectorAll('[role=tab]')];for(const [index,button]of tabButtons.entries()){button.addEventListener('click',()=>goTab(button.dataset.workspaceTab));button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabButtons.length;if(event.key==='ArrowLeft')next=(index+tabButtons.length-1)%tabButtons.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabButtons.length-1;if(next!==undefined){event.preventDefault();goTab(tabButtons[next].dataset.workspaceTab);tabButtons[next].focus()}})}
  function backToEditor(id){dialog.close();const panel=$(id);panel.open=true;panel.scrollIntoView({block:'start'});panel.querySelector('summary')?.focus()}
  for(const [button,panel]of [['workspaceEditPlaces','locationPanel'],['workspaceEditHeroes','characterPanel'],['workspaceEditBestiary','bestiaryPanel']])$(button).addEventListener('click',()=>backToEditor(panel))
  $('workspaceClose').addEventListener('click',()=>dialog.close());$('workspaceSave').addEventListener('click',guard(()=>{onSave();status($('error').textContent || $('status').textContent,!!$('error').textContent)}))
  dialog.addEventListener('close',()=>board.render(getDefinition().locations?.find(place=>place.id===locationId),selectedId))
  $('workspaceNotes').addEventListener('input',()=>{replaceDefinition({...getDefinition(),preparationNotes:$('workspaceNotes').value});changed();status('Notes modifiées. Enregistrez le brouillon pour les conserver.')})
  $('workspaceNpcImage').addEventListener('change',async()=>{const file=$('workspaceNpcImage').files[0],token=++npcGeneration;$('workspaceNpcImage').value='';if(!file)return;npcPending=true;try{const data=await readDraftImage(file,{maxSide:1200,maxLength:600000,preserveTransparency:true});if(token===npcGeneration){npcImage=data;$('workspaceNpcPreview').src=data;$('workspaceNpcPreview').hidden=false;status('Image du PNJ prête.')}}catch(e){if(token===npcGeneration)status(e.message,true)}finally{if(token===npcGeneration)npcPending=false}})
  $('workspaceNpcRemoveImage').addEventListener('click',()=>{npcGeneration++;npcPending=false;npcImage=null;$('workspaceNpcPreview').removeAttribute('src');$('workspaceNpcPreview').hidden=true})
  $('workspaceNpcAdd').addEventListener('click',guard(()=>{if(npcPending)throw Error('Attendez la préparation de l’image du PNJ.');const npc={id:'npc-'+crypto.randomUUID(),name:$('workspaceNpcName').value.trim(),description:$('workspaceNpcDescription').value,...(npcImage?{image:npcImage}:{})};commit(createCampaignDefinition({...getDefinition(),npcs:[...(getDefinition().npcs || []),npc]}));$('workspaceNpcName').value='';$('workspaceNpcDescription').value='';$('workspaceNpcRemoveImage').click();renderNpcs();palette()}))
  function renderNpcs(){const list=$('workspaceNpcs');list.replaceChildren();for(const npc of getDefinition().npcs || []){const card=document.createElement('div'),name=document.createElement('h3'),text=document.createElement('p'),remove=document.createElement('button');card.className='workspace-card';name.textContent=npc.name;text.textContent=npc.description;remove.type='button';remove.textContent='Retirer '+npc.name;remove.addEventListener('click',guard(()=>{if(!window.confirm('Retirer ce PNJ et ses pions de préparation ?'))return;commit(createCampaignDefinition({...getDefinition(),...withoutDraftActorTokens(getDefinition(),'npc',npc.id),npcs:getDefinition().npcs.filter(item=>item.id!==npc.id)}));renderNpcs();renderMap()}));card.append(name,text,remove);list.append(card)}if(!list.children.length)list.textContent='Aucun PNJ créé pour le moment.';$('workspaceAlliesInfo').textContent=getDefinition().allies?.length?`${getDefinition().allies.length} alliés du modèle sont aussi disponibles dans la palette de la carte.`:''}
  function render(){if(!getDefinition())return;renderMap();renderNpcs();$('workspaceHeroList').textContent=getDefinition().characters.map(actor=>actor.name).join(' · ');$('workspaceEnemyList').textContent=(getDefinition().bestiary || []).map(actor=>actor.name).join(' · ') || 'Aucun ennemi préparé.';$('workspaceNotes').value=getDefinition().preparationNotes || '';}
  $('openGmWorkspace').addEventListener('click',()=>{render();goTab('maps');status('Mode préparation locale. Aucun joueur connecté à cette carte.');dialog.showModal();$('workspaceClose').focus({preventScroll:true})})
  return {render}
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
  const bestiaryPanel=createDraftBestiaryPanel({getDefinition:()=>current.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},message,onAbilities:id=>abilityPanel.open(id,'enemy')})
  const workspace=createDraftGmWorkspace({getDefinition:()=>current?.definition,replaceDefinition:value=>{current={...current,definition:value}},changed:()=>{mark(true);summary()},onSave:()=>{if(!$('title').value.trim())throw Error('Donnez un titre à la campagne avant de l’enregistrer.');$('editor').requestSubmit()},message})
  function mark(value) { dirty=value; $('state').textContent=value?'Modifications non enregistrées':'Brouillon enregistré localement'; $('delete').disabled=!current?.revision }
  function definition() {return createCampaignDefinition({...current.definition,title:$('title').value.trim(),description:$('description').value})}
  function open(record) {
    current=record; $('empty').hidden=true; $('editor').hidden=false
    $('title').value=record.definition.title; $('description').value=record.definition.description || ''
    summary();characterPanel.render();locationPanel.render();bestiaryPanel.render();workspace.render()
    mark(!record.revision); message(record.revision?'Brouillon ouvert.':'Brouillon prêt. Enregistrez-le pour le retrouver.'); refresh()
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
