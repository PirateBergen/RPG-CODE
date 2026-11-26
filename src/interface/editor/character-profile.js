// User-selected raster images are decoded locally and reduced before being embedded.
async function readDraftCharacterImage(file) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choisissez une image PNG, JPEG ou WebP de 10 Mo maximum.')
  const bitmap=await createImageBitmap(file)
  try {
    if(bitmap.width*bitmap.height>40000000)throw Error('Cette image est trop grande. Choisissez une version plus petite.')
    let size=900, result=''
    do {
      const ratio=Math.min(1,size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas')
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio))
      const ctx=canvas.getContext('2d');ctx.fillStyle='#19232d';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
      result=canvas.toDataURL('image/jpeg',.82);size=Math.floor(size*.75)
    }while(result.length>400000 && size>=150)
    if(result.length>400000)throw Error('Image trop volumineuse après réduction.')
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
      try{const data=await readDraftCharacterImage(file);if(token===generation&&sequence===sequences[key]){appearance[key]=data;preview(key);$('characterError').textContent=''}}
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
