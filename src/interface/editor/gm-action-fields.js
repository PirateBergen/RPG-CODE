// Form fields for gameplay steps. Editing is delegated to the owning composer.
function createDraftGmGameplayFields({getDefinition,getSteps,input,select,button,renderSteps}){
  function gameplayFields(card,step){
    if(step.kind==='status'){
      select(card,'Action sur l’effet',{apply:'Appliquer ou renouveler',remove:'Lever cet effet'},step.operation,value=>{step.operation=value;renderSteps()})
      if(step.operation==='remove'){
        const known=[...(getDefinition().gmActions || []).flatMap(action=>action.steps),...getSteps()].filter(item=>item.kind==='status'&&item.operation==='apply'),effects=[...new Map(known.map(item=>[item.effectId,item])).values()]
        select(card,'Effet à lever',{'':'Choisir un effet',...Object.fromEntries(effects.map(item=>[item.effectId,item.label || 'Effet sans nom']))},step.effectId,value=>{const entry=effects.find(item=>item.effectId===value);if(entry)Object.assign(step,{effectId:entry.effectId,label:entry.label,category:entry.category})})
      }else{
        input(card,'Nom de l’effet','text',step.label,value=>step.label=value,{maxLength:120});select(card,'Nature',{blessing:'Bénédiction',curse:'Malédiction'},step.category,value=>step.category=value)
        select(card,'Ce qui change',CAMPAIGN_STATUS_MODIFIERS,step.modifier,value=>step.modifier=value);input(card,'Variation (+ pour augmenter, − pour réduire)','number',step.value,value=>step.value=value,{min:-1000000,max:1000000,step:'any'})
        const duration=document.createElement('div');duration.hidden=step.duration!=='rounds';select(card,'Durée',{rounds:'Un nombre de rounds',untilRemoved:'Jusqu’à son retrait par le MJ'},step.duration,value=>{step.duration=value;duration.hidden=value!=='rounds'});input(duration,'Nombre de rounds','number',step.rounds,value=>step.rounds=value,{min:1,max:100,step:1});card.append(duration)
      }
      const choices=document.createElement('div');choices.hidden=step.target!=='selected';choices.className='gm-rule-character-choices';select(card,'Cibles',{allHeroes:'Tous les héros',selected:'Personnages choisis',allEnemies:'Tous les ennemis du combat'},step.target,value=>{step.target=value;choices.hidden=value!=='selected'});for(const actor of getDefinition().characters){const label=document.createElement('label'),check=document.createElement('input');label.className='sequence-checkbox';check.type='checkbox';check.checked=step.characterIds.includes(actor.id);check.value=actor.id;check.addEventListener('change',()=>step.characterIds=[...choices.querySelectorAll('input:checked')].map(input=>input.value));label.append(check,document.createTextNode(actor.name));choices.append(label)}card.append(choices)
      const hint=document.createElement('p');hint.className='hint';hint.textContent='Le même effet est renouvelé, sans cumul. Le lever ne soigne pas gratuitement. Les rounds de l’essai avancent avec le bouton dédié ; les bonus de dégâts sont préparés pour les futures attaques.';card.append(hint)
    }

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
  return gameplayFields
}
