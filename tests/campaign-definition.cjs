const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),context=vm.createContext({}),read=name=>fs.readFileSync(path.join(base,name),'utf8'),copy=value=>JSON.parse(JSON.stringify(value));
vm.runInContext(read('src/engine/campaigns/catalogs.js'),context);
vm.runInContext(read('src/engine/campaigns/definition.js'),context);
for(const file of ['enemies/stats.js','enemies/categories.js','world/locations-and-music.js'])vm.runInContext(read('src/campaigns/prophetie-des-mouches/'+file),context);
vm.runInContext(read('src/campaigns/prophetie-des-mouches/definition.js'),context);
vm.runInContext(read('src/engine/combat/roster.js'),context);
vm.runInContext(read('src/campaigns/prophetie-des-mouches/characters/identity-and-compatibility.js'),context);
const run=code=>vm.runInContext(code,context),definition=run('ACTIVE_CAMPAIGN');
assert.equal(definition.id,'prophetie-des-mouches');
assert.deepEqual(copy(run('COMBAT_HEROES')),['greg','ju','elo']);
assert.deepEqual(copy(run('COMBAT_CHARACTERS')),['greg','ju','elo','bibi']);
assert.deepEqual(copy(run('COMBAT_MOBS')),['mob','mob2','mob3']);
for(const id of ['greg','ju','elo','bibi']){const portrait=run('heroPortraitFile('+JSON.stringify(id)+')');assert.equal(portrait,id==='ju'?'pika-token.svg':id+'.png');assert(fs.existsSync(path.join(base,'images',portrait)))}
assert.equal(run('heroPortraitFile("inconnu")'),'inconnu.png');
assert.deepEqual(copy(run('[heroDisplayName("greg"),heroDisplayName("ju"),heroDisplayName("elo"),heroDisplayName("bibi"),heroDisplayName("Yulian")]')),['GREG','Pika','ELO','BIBI','Pika']);
assert(Object.isFrozen(definition));assert(Object.isFrozen(definition.characters));assert(Object.isFrozen(definition.characters[0]));
assert.deepEqual(copy(context.createCampaignDefinition(copy(definition))),copy(definition));
const other={schemaVersion:1,id:'autre-histoire',title:'Une autre histoire',characters:[{id:'aube',name:'Aube',kind:'hero',portrait:'aube.png'},{id:'nuit',name:'Nuit',kind:'hero',portrait:'nuit.png'},{id:'renard',name:'Renard',kind:'companion',owner:'aube',portrait:'renard.png'}]};
const second=vm.createContext({});vm.runInContext(read('src/engine/campaigns/definition.js'),second);second.ACTIVE_CAMPAIGN=second.createCampaignDefinition(other);vm.runInContext(read('src/engine/combat/roster.js'),second);assert.deepEqual(copy(vm.runInContext('COMBAT_HEROES',second)),['aube','nuit']);assert.deepEqual(copy(vm.runInContext('COMBAT_CHARACTERS',second)),['aube','nuit','renard']);assert.deepEqual(other.characters.map(c=>c.id),['aube','nuit','renard']);
for(const change of [d=>d.schemaVersion=9,d=>d.id='../campagne',d=>d.title='',d=>d.characters=[],d=>d.characters.push({...d.characters[0]}),d=>d.characters[0].id='constructor',d=>d.characters[0].portrait='../secret.png',d=>d.characters[0].portrait='https://test/image.png',d=>d.characters[0].kind='inconnu',d=>d.characters[2].owner='absent']){const bad=copy(other);change(bad);assert.throws(()=>context.createCampaignDefinition(bad))}
console.log('OK Définition de campagne : listes de combattants pilotées par la campagne, identifiants/portraits/alias historiques inchangés, description sérialisable, autre histoire isolée, erreurs refusées.');
