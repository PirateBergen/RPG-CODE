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
console.log('OK brouillons : copie isolée, description, stockage distinct, concurrence, corruption et quota.');
