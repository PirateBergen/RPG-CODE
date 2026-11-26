const DRAFT_SEQUENCE_LABELS={none:'Aucun effet',slash:'Entaille',projectile:'Projectile',fire:'Flammes',frost:'Givre',lightning:'Éclair',heal:'Halo de soin',shield:'Bouclier',smoke:'Brume',swarm:'Nuée',beam:'Rayon',wave:'Vague',explosion:'Explosion',mark:'Marque au sol'}
function draftSequenceModel(model,color='#d8b477') {
  const phase=(effect,duration,extra={})=>({enabled:true,effect,duration,color,size:100,direction:'forward',darken:false,shake:false,flash:false,images:[],...extra})
  const models={physical:[phase('none',600),phase('slash',700),phase('explosion',600,{shake:true})],magic:[phase('swarm',1000),phase('projectile',900),phase('wave',700)],summon:[phase('smoke',1200,{darken:true}),phase('mark',1200),phase('wave',800)],dark:[phase('smoke',1400,{darken:true}),phase('beam',1000),phase('explosion',900,{shake:true,darken:true})],healing:[phase('swarm',800),phase('heal',1200),phase('shield',800)]}
  return Object.fromEntries(Object.keys(CAMPAIGN_SEQUENCE_PHASES).map((key,i)=>[key,(models[model] || models.magic)[i]]))
}
function createDraftSequenceEditor() {
  const $=id=>document.getElementById(id)
  let generation=0,pending=0
  const controls={}
  function select(label,options,value){const wrap=document.createElement('label'),input=document.createElement('select');wrap.textContent=label;for(const [key,text]of Object.entries(options)){const option=document.createElement('option');option.value=key;option.textContent=text;input.append(option)}input.value=value;wrap.append(input);return {wrap,input}}
  function imageRow(parent,item) {
    const row=document.createElement('fieldset'),legend=document.createElement('legend'),image=document.createElement('img');legend.textContent='Image de l’étape';image.src=item.image;image.alt='Élément de l’animation';image.className='sequence-editor-image'
    const motion=select('Apparition / déplacement',{fade:'Fondu',left:'Depuis la gauche',right:'Depuis la droite',rise:'Depuis le bas'},item.motion),position=select('Position',{actor:'Côté personnage',center:'Centre',target:'Côté cible'},item.position)
    row.sequenceData={image:item.image,motion:motion.input,position:position.input}
    const remove=document.createElement('button');remove.type='button';remove.textContent='Retirer cet élément';remove.addEventListener('click',()=>row.remove());row.append(legend,image,motion.wrap,position.wrap,remove);parent.append(row)
  }
  for(const [key,title]of Object.entries(CAMPAIGN_SEQUENCE_PHASES)) {
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');summary.textContent=title;details.append(summary,body);$('sequenceSteps').append(details)
    const fields={}
    for(const [name,label]of Object.entries({enabled:'Activer cette étape',darken:'Assombrir le décor',shake:'Tremblement à l’impact',flash:'Flash unique doux'})){
      const wrap=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.sequenceField=name;wrap.className='sequence-checkbox';wrap.append(input,document.createTextNode(label));body.append(wrap);fields[name]=input
    }
    const effect=select('Effet',DRAFT_SEQUENCE_LABELS,'none'),direction=select('Direction',{forward:'Personnage vers cible',reverse:'Cible vers personnage'},'forward');body.append(effect.wrap,direction.wrap);fields.effect=effect.input;fields.direction=direction.input
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
