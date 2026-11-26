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
  const progression=createDraftAbilityProgression()
  let heroId=null,selected=null,image=null,generation=0,sequence=0,pending=0,previewTimer=null,previewAbility=null
  for(const [value,label] of Object.entries(DRAFT_ABILITY_VISUALS)){const option=document.createElement('option');option.value=value;option.textContent=label;$('abilityPreset').append(option)}
  function picture(){$('abilityImagePreview').hidden=!image;if(image)$('abilityImagePreview').src=image;else $('abilityImagePreview').removeAttribute('src');$('abilityImageRemove').disabled=!image}
  function kind(){$('abilityImagePanel').hidden=$('abilityKind').value!=='special'}
  $('abilityKind').addEventListener('change',kind)
  function read() {
    if(pending)throw Error('Attendez la fin de la préparation de l’image.')
    const value={id:selected || 'ability-'+crypto.randomUUID(),kind:$('abilityKind').value,name:$('abilityName').value.trim(),description:$('abilityDescription').value,type:$('abilityType').value,dice:Number($('abilityDice').value),stat:$('abilityStat').value,target:$('abilityTarget').value,effect:{kind:$('abilityEffect').value,value:$('abilityEffectValue').valueAsNumber,turns:$('abilityEffectTurns').valueAsNumber},visual:{preset:$('abilityPreset').value,color:$('abilityColor').value,intensity:Number($('abilityIntensity').value),...($('abilityKind').value==='special'&&image?{image}:{})}}
    for(const key of ['powerMin','powerMax','cooldown','uses'])value[key]=$('ability-'+key).valueAsNumber
    return createCampaignAbilities([{...value,...progression.read()}])[0]
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
    progression.open(ability)
    selected=ability?.id || null;generation++;pending=0;image=ability?.visual.image || null;picture();$('abilityImageFile').value=''
    $('abilityKind').value=ability?.kind || newKind;kind();$('abilityName').value=ability?.name || '';$('abilityDescription').value=ability?.description || '';$('abilityType').value=ability?.type || 'damage';$('abilityDice').value=ability?.dice || 6;$('abilityStat').value=ability?.stat || 'force';$('abilityTarget').value=ability?.target || 'enemy'
    for(const [key,value] of Object.entries({powerMin:4,powerMax:8,cooldown:0,uses:0}))$('ability-'+key).value=ability?.[key] ?? value
    $('abilityEffect').value=ability?.effect.kind || 'none';$('abilityEffectValue').value=ability?.effect.value ?? 0;$('abilityEffectTurns').value=ability?.effect.turns ?? 1;$('abilityPreset').value=ability?.visual.preset || 'slash';$('abilityColor').value=ability?.visual.color || '#d8b477';$('abilityIntensity').value=ability?.visual.intensity || 2;$('abilityError').textContent='';$('abilityRemove').hidden=!ability;$('abilityDialog').showModal();$('abilityName').focus()
  }
  function preview(ability) {
    resolveCampaignAbilityLevel(ability,$('abilityTestLevel').valueAsNumber)
    previewAbility=ability;$('abilityPreviewLevel').value=$('abilityTestLevel').value
    $('abilityPreviewTitle').textContent=ability.name;$('abilityPreviewActor').textContent=getDefinition().characters.find(c=>c.id===heroId).name
    $('abilityPreviewTarget').textContent=ability.target==='self'?'Soi-même':['ally','allAllies'].includes(ability.target)?'Allié':'Cible'
    const backdrop=getDefinition().locations?.find(p=>p.background)?.background
    $('abilityPreviewBackdrop').hidden=!backdrop;if(backdrop)$('abilityPreviewBackdrop').src=backdrop;else $('abilityPreviewBackdrop').removeAttribute('src')
    $('abilityPreview').showModal();replay();$('abilityReplay').onclick=replay;$('abilityPreviewClose').focus({preventScroll:true});$('abilityPreview').scrollTop=0
  }
  function replay(){try{const level=$('abilityPreviewLevel').valueAsNumber,ability=resolveCampaignAbilityLevel(previewAbility,level),hero=getDefinition().characters.find(c=>c.id===heroId);$('abilityPreviewError').textContent='';$('abilityAnnouncement').textContent=campaignAbilityAnnouncement(ability,hero.name);$('abilityAnnouncement').hidden=!$('abilityAnnouncement').textContent;$('abilityLevelSummary').textContent=`Niveau ${level} · Puissance ${ability.powerMin}–${ability.powerMax} · intensité ${ability.visual.intensity}/3 · hors bonus de statistiques` ;play(ability)}catch(error){$('abilityPreviewError').textContent=error.message}}
  $('abilityPreviewLevel').addEventListener('change',replay)
  function play(ability) {
    clearTimeout(previewTimer);const stage=$('abilityStage'),effects=$('abilityFx');effects.replaceChildren();stage.className='ability-stage';stage.style.setProperty('--ability-color',ability.visual.color)
    void stage.offsetWidth;stage.classList.add('playing','intensity-'+ability.visual.intensity,'preset-'+ability.visual.preset)
    const count=ability.visual.preset==='swarm'?18:ability.visual.preset==='frost'?9:1
    for(let i=0;i<count;i++){const spark=document.createElement('span');spark.className='ability-spark';spark.style.setProperty('--particle',String(i));effects.append(spark)}
    if(ability.visual.image){const artwork=document.createElement('img');artwork.src=ability.visual.image;artwork.alt='Illustration de la capacité';artwork.className='ability-artwork';effects.append(artwork)}
    previewTimer=setTimeout(()=>{stage.className='ability-stage';effects.replaceChildren()},2400)
  }
  $('abilityPreview').addEventListener('close',()=>{clearTimeout(previewTimer);$('abilityFx').replaceChildren();$('abilityStage').className='ability-stage';$('abilityReplay').onclick=null;previewAbility=null;$('abilityAnnouncement').textContent='';$('abilityPreviewError').textContent=''})
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
