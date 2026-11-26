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
  return {
    open(ability){$('abilityTiers').replaceChildren();(ability?.progression || []).forEach(tierRow);$('abilityAnnouncementMode').value=ability?.announcement?.mode || 'auto';$('abilityAnnouncementText').value=ability?.announcement?.text || '';$('abilityAnnouncementCustom').hidden=$('abilityAnnouncementMode').value!=='custom';$('abilityTestLevel').value=1},
    read(){return {announcement:{mode:$('abilityAnnouncementMode').value,text:$('abilityAnnouncementText').value},progression:[...$('abilityTiers').children].map(row=>Object.fromEntries([...row.querySelectorAll('[data-tier-field]')].map(input=>[input.dataset.tierField,input.type==='number'?input.valueAsNumber:Number(input.value)])))}}
  }
}
