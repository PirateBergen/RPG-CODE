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
