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
(() => {
  const $=id=>document.getElementById(id)
  let current=null, dirty=false, copyMode=false, store
  try { store=createLocalCampaignDraftStore(window.localStorage) } catch { /* Export remains available without storage. */ }
  const message=(text,error=false)=>{ $(error?'error':'status').textContent=text; $(error?'status':'error').textContent='' }
  const guard=fn=>async(...args)=>{try{await fn(...args)}catch(error){message(error.message || 'Impossible de terminer cette action.',true)}}
  const discard=()=>!dirty || window.confirm('Abandonner les modifications non enregistrées de ce brouillon ?')
  const uuid=()=>crypto.randomUUID()
  function mark(value) { dirty=value; $('state').textContent=value?'Modifications non enregistrées':'Brouillon enregistré localement'; $('delete').disabled=!current?.revision }
  function definition() {return createCampaignDefinition({...current.definition,title:$('title').value.trim(),description:$('description').value})}
  function open(record) {
    current=record; $('empty').hidden=true; $('editor').hidden=false
    $('title').value=record.definition.title; $('description').value=record.definition.description || ''
    const d=record.definition
    $('summary').textContent=`Contenu : ${d.characters.length} personnage(s), ${Object.keys(d.world?.names || {}).length} lieu(x), ${Object.keys(d.enemies?.stats || {}).length} ennemi(s), ${d.allies?.length || 0} allié(s).`
    mark(!record.revision); message(record.revision?'Brouillon ouvert.':'Brouillon prêt. Enregistrez-le pour le retrouver.'); refresh()
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
    const base=copyMode?importCampaignDraft(exportCampaignDraft(ACTIVE_CAMPAIGN)):{schemaVersion:1,id:'campagne-'+uuid(),characters:[{id:'heros',name:'Héros',kind:'hero',portrait:'images/draft-hero.svg'}]}
    open({draftId:uuid(),revision:0,definition:createCampaignDefinition({...base,title,description:''})});$('create').close();$('title').focus()
  }))
  $('editor').addEventListener('input',()=>mark(true))
  $('editor').addEventListener('submit',guard(event=>{
    event.preventDefault();if(!store)throw Error('Stockage indisponible : exportez votre brouillon pour le conserver.')
    const record=store.save({...current,definition:definition()});open(record);message('Brouillon enregistré dans ce navigateur.')
  }))
  $('export').addEventListener('click',guard(()=>{
    const d=definition(),url=URL.createObjectURL(new Blob([exportCampaignDraft(d)],{type:'application/json'})),link=document.createElement('a')
    link.href=url;link.download=d.id+'.campagne-brouillon.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Fichier de brouillon exporté. Les médias restent des références.')
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
