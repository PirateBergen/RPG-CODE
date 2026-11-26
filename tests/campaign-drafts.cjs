const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const context=vm.createContext({window:{}});for(const file of ['config.js','src/platform/storage/draft-store.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const data=new Map([['game-progress','unchanged']]),storage={get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};context.storage=storage;
vm.runInContext(`
const store=createLocalCampaignDraftStore(storage), baseline=JSON.stringify(ACTIVE_CAMPAIGN)
const definition=importCampaignDraft(exportCampaignDraft({...ACTIVE_CAMPAIGN,description:'Essai'}))
definition.characters[0].stats.hp=999
if(JSON.stringify(ACTIVE_CAMPAIGN)!==baseline)throw Error('Modèle modifié')
globalThis.first=store.save({draftId:'test-a',revision:0,definition})
globalThis.second=store.save({draftId:'test-b',revision:0,definition})
globalThis.store=store
`,context);
assert.equal(context.first.revision,1);assert.equal(context.first.definition.description,'Essai');assert.equal(context.store.list().drafts.length,2);
const updated=context.store.save({...context.first,definition:{...context.first.definition,title:'Modifié'}});assert.equal(updated.revision,2);
assert.throws(()=>context.store.save(context.first),/autre onglet/);assert.throws(()=>context.store.remove(context.first),/autre onglet/);
storage.setItem('rpg-campaign-editor:v1:draft:broken','{');assert.equal(context.store.list().issues.length,1);assert.equal(context.store.list().drafts.length,2);
context.store.remove(updated);assert.equal(data.get('game-progress'),'unchanged');assert(data.has('rpg-campaign-editor:v1:draft:broken'));
const old=storage.setItem;storage.setItem=()=>{throw Error('quota')};assert.throws(()=>context.store.save({...context.second,definition:context.second.definition}),/quota/);storage.setItem=old;assert.equal(context.store.get('test-b').revision,1);
assert.throws(()=>vm.runInContext('importCampaignDraft(JSON.stringify({format:"save",version:1}))',context));
vm.runInContext(fs.readFileSync('src/interface/editor/characters.js','utf8'),context);
vm.runInContext(`
const original=JSON.stringify(ACTIVE_CAMPAIGN), hero=createDraftHero('new-hero','Aurore')
const neutral=createCampaignDefinition({schemaVersion:1,id:'nouveau',title:'Nouvelle histoire',characters:[hero,createDraftHero('other')]})
const changed=updateDraftCharacter(neutral,'new-hero',{name:'Orion',stats:{...hero.stats,hp:145},mainStat:'chance'})
if(changed.characters[0].id!=='new-hero'||changed.characters[0].stats.hp!==145||neutral.characters[0].name!=='Aurore')throw Error('Édition non isolée')
if(removeDraftCharacter(changed,'other').characters.length!==1)throw Error('Suppression incorrecte')
const copied=updateDraftCharacter(ACTIVE_CAMPAIGN,'greg',{name:'Autre héros',stats:{...ACTIVE_CAMPAIGN.characters[0].stats,hp:150},mainStat:'force'})
if(JSON.stringify(copied.attacks)!==JSON.stringify(ACTIVE_CAMPAIGN.attacks)||JSON.stringify(ACTIVE_CAMPAIGN)!==original)throw Error('Contenu perdu ou modèle modifié')
globalThis.neutral=neutral
`,context);
assert.throws(()=>vm.runInContext("removeDraftCharacter(removeDraftCharacter(neutral,'other'),'new-hero')",context),/au moins un héros/);
assert.throws(()=>vm.runInContext("removeDraftCharacter(ACTIVE_CAMPAIGN,'greg')",context),/lié/);
assert.throws(()=>vm.runInContext("updateDraftCharacter(neutral,'new-hero',{name:'A',stats:{force:1},mainStat:'force'})",context),/Statistiques/);
console.log('OK brouillons : copie isolée, description, stockage distinct, concurrence, corruption et quota.');
vm.runInContext(`
const profileHero={...createDraftHero('profile'),race:'Elfe',class:'Barde',alignment:'Chaotique neutre',customInfo:[{label:'Don',value:'Musique'}],appearance:{portrait:'data:image/jpeg;base64,/9j/AA=='}}
const profileCampaign=createCampaignDefinition({schemaVersion:1,id:'profile',title:'Profil',characters:[profileHero]})
const roundtrip=importCampaignDraft(exportCampaignDraft(profileCampaign))
if(JSON.stringify(roundtrip)!==JSON.stringify(profileCampaign))throw Error('Profil perdu dans un échange')
globalThis.profileHero=profileHero
`,context);
for(const patch of ["appearance:{portrait:'data:image/svg+xml;base64,AAAA'}","customInfo:[{label:'',value:'invalide'}]","race:42"]){assert.throws(()=>vm.runInContext(`createCampaignDefinition({schemaVersion:1,id:'invalid',title:'Invalide',characters:[{...profileHero,${patch}}]})`,context));}
