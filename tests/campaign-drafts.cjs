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
vm.runInContext(fs.readFileSync('src/interface/editor/locations.js','utf8'),context);
vm.runInContext(`
const location={id:'lieu-test',name:'Village des Brumes',type:'village',description:'Une place calme.',gmNotes:'Un passage secret.'}
const withPlace=setDraftLocation(neutral,location), editedPlace=setDraftLocation(withPlace,{...location,name:'Nouveau nom'})
if(neutral.locations!==undefined||withPlace.locations[0].name!=='Village des Brumes'||editedPlace.locations.length!==1||editedPlace.locations[0].name!=='Nouveau nom')throw Error('Édition de lieu incorrecte')
if(JSON.stringify(importCampaignDraft(exportCampaignDraft(withPlace)))!==JSON.stringify(withPlace))throw Error('Lieu perdu dans un échange')
if(removeDraftLocation(withPlace,'lieu-test').locations.length!==0)throw Error('Suppression incorrecte')
const preserved=JSON.stringify(ACTIVE_CAMPAIGN),copiedPlace=setDraftLocation(ACTIVE_CAMPAIGN,location)
if(JSON.stringify(copiedPlace.world)!==JSON.stringify(ACTIVE_CAMPAIGN.world)||JSON.stringify(ACTIVE_CAMPAIGN)!==preserved)throw Error('Modèle ou musiques modifiés')
globalThis.location=location
`,context);
for(const patch of ["name:' '","description:42","type:'invalid'","id:'../unsafe'","gmNotes:'x'.repeat(5001)"]){assert.throws(()=>vm.runInContext(`setDraftLocation(neutral,{...location,${patch}})`,context));}
assert.throws(()=>vm.runInContext("createCampaignDefinition({...neutral,locations:[location,location]})",context),/dupliqué/);
vm.runInContext(`
const imageLocation={...location,background:'data:image/jpeg;base64,/9j/AA=='}
const illustrated=setDraftLocation(neutral,imageLocation),packet=exportCampaignDraft(illustrated)
if(JSON.parse(packet).media!=='references-and-images'||importCampaignDraft(packet).locations[0].background!==imageLocation.background)throw Error('Fond perdu dans un échange')
if(setDraftLocation(illustrated,location).locations[0].background!==undefined)throw Error('Fond non retiré')
`,context);
for(const background of ['https://example.com/image.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,/9j/'+ 'A'.repeat(1200000)]){context.badBackground=background;assert.throws(()=>vm.runInContext('setDraftLocation(neutral,{...location,background:badBackground})',context));}
vm.runInContext(fs.readFileSync('src/interface/editor/abilities.js','utf8'),context);
vm.runInContext(`
const ability={id:'ability-test',kind:'normal',name:'Garde',description:'Protection',type:'protection',dice:6,stat:'defense',target:'self',powerMin:0,powerMax:0,cooldown:1,uses:0,effect:{kind:'damageReduction',value:25,turns:2},visual:{preset:'shield',color:'#00aaff',intensity:2}}
const abilityBaseline=JSON.stringify(ACTIVE_CAMPAIGN),withAbility=setDraftAbility(neutral,'new-hero',ability)
if(neutral.characters[0].abilities!==undefined||withAbility.characters[0].abilities[0].effect.value!==25)throw Error('Capacité non isolée')
const special={...ability,id:'ability-special',kind:'special',visual:{...ability.visual,image:'data:image/png;base64,iVBORw0KGgoAAA=='}}
const withSpecial=setDraftAbility(withAbility,'new-hero',special),exchanged=importCampaignDraft(exportCampaignDraft(withSpecial))
if(JSON.stringify(withSpecial)!==JSON.stringify(exchanged)||JSON.parse(exportCampaignDraft(withSpecial)).media!=='references-and-images')throw Error('Capacité perdue à l’export')
if(removeDraftAbility(withSpecial,'new-hero','ability-test').characters[0].abilities.length!==1)throw Error('Suppression incorrecte')
const modelWithAbility=setDraftAbility(ACTIVE_CAMPAIGN,'greg',ability)
if(JSON.stringify(ACTIVE_CAMPAIGN)!==abilityBaseline||JSON.stringify(modelWithAbility.attacks)!==JSON.stringify(ACTIVE_CAMPAIGN.attacks))throw Error('Anciennes attaques modifiées')
if(createCampaignAbilities(Array.from({length:120},(_,i)=>({...ability,id:'ability-'+i}))).length!==120)throw Error('Limite de quantité inattendue')
globalThis.ability=ability
`,context);
for(const patch of ["dice:5","powerMax:-1","effect:{kind:'damageReduction',value:101,turns:1}","effect:{kind:'stun',value:0,turns:0}","visual:{preset:'script',color:'#ffffff',intensity:1}","visual:{preset:'slash',color:'#ffffff',intensity:1,image:'data:image/svg+xml;base64,AAA'}"]){assert.throws(()=>vm.runInContext(`createCampaignAbilities([{...ability,${patch}}])`,context));}
vm.runInContext(`
const evolving={...ability,announcement:{mode:'custom',text:'{personnage} utilise {attaque} !'},progression:[{level:10,powerMin:12,powerMax:18,intensity:3},{level:5,powerMin:8,powerMax:12,intensity:2}]}
const progressionBefore=JSON.stringify(evolving)
if(resolveCampaignAbilityLevel(evolving,4).powerMax!==ability.powerMax||resolveCampaignAbilityLevel(evolving,5).powerMax!==12||resolveCampaignAbilityLevel(evolving,9).powerMax!==12||resolveCampaignAbilityLevel(evolving,10).powerMax!==18||resolveCampaignAbilityLevel(evolving,1000).powerMax!==18)throw Error('Seuils de progression incorrects')
if(resolveCampaignAbilityLevel(evolving,10).effect.value!==25||JSON.stringify(evolving)!==progressionBefore)throw Error('Progression cumulée ou mutée')
if(campaignAbilityAnnouncement(ability,'Aurore')!=='Aurore lance Garde !'||campaignAbilityAnnouncement(evolving,'Aurore')!=='Aurore utilise Garde !'||campaignAbilityAnnouncement({...evolving,announcement:{mode:'none',text:''}},'Aurore')!=='')throw Error('Annonce incorrecte')
if(campaignAbilityAnnouncement({...evolving,announcement:{mode:'custom',text:''}},'Aurore')!=='Aurore lance Garde !')throw Error('Repli automatique absent')
const storedEvolution=importCampaignDraft(exportCampaignDraft(setDraftAbility(neutral,'new-hero',evolving))).characters[0].abilities[0]
if(storedEvolution.progression[0].level!==5||storedEvolution.announcement.text!==evolving.announcement.text)throw Error('Évolution perdue dans un échange')
globalThis.evolving=evolving
`,context);
for(const patch of ["progression:[{level:1,powerMin:1,powerMax:2,intensity:1}]","progression:[{level:5,powerMin:1,powerMax:2,intensity:1},{level:5,powerMin:2,powerMax:3,intensity:2}]","announcement:{mode:'execute',text:'evil'}","announcement:{mode:'custom',text:'x'.repeat(1001)}"]){assert.throws(()=>vm.runInContext(`createCampaignAbilities([{...ability,${patch}}])`,context));}
for(const level of [0,-1,1.5,1001,NaN]){context.invalidLevel=level;assert.throws(()=>vm.runInContext('resolveCampaignAbilityLevel(evolving,invalidLevel)',context));}
vm.runInContext(fs.readFileSync('src/interface/editor/ability-sequence.js','utf8'),context);
vm.runInContext(`
const sequence=draftSequenceModel('dark'),sequenceOriginal=JSON.stringify(sequence)
sequence.preparation.images=[{image:'data:image/png;base64,iVBORw0KGgoAAA==',motion:'left',position:'actor'}]
const animated={...ability,kind:'special',visual:{...ability.visual,sequence}}
const withSequence=setDraftAbility(neutral,'new-hero',animated),sequencePacket=exportCampaignDraft(withSequence)
if(JSON.stringify(importCampaignDraft(sequencePacket))!==JSON.stringify(withSequence)||JSON.parse(sequencePacket).media!=='references-and-images')throw Error('Séquence perdue dans un échange')
if(resolveCampaignAbilityLevel({...animated,...{progression:[{level:5,powerMin:8,powerMax:12,intensity:3}]}},5).visual.sequence.launch.effect!=='beam')throw Error('Progression efface la séquence')
globalThis.sequence=sequence
`,context);
assert.throws(()=>vm.runInContext('createCampaignAbilitySequence(sequence,"normal")',context),/Image/);
for(const patch of ["duration:0","effect:'javascript'","size:500","images:[{image:'https://bad/image.png',motion:'fade',position:'center'}]","flash:'yes'","direction:'sideways'"]){assert.throws(()=>vm.runInContext(`createCampaignAbilitySequence({...sequence,impact:{...sequence.impact,${patch}}},'special')`,context));}
assert.throws(()=>vm.runInContext("createCampaignAbilitySequence({...sequence,order:['impact','impact','launch']},'special')",context),/Ordre/);
vm.runInContext(`for(const model of ['physical','magic','summon','dark','healing'])createCampaignAbilitySequence(draftSequenceModel(model),'normal');const reordered=createCampaignAbilitySequence({...sequence,order:['impact','preparation','launch']},'special');if(reordered.order[0]!=='impact')throw Error('Ordre perdu')`,context);
vm.runInContext(`
const automatic={...ability,powerMin:100,powerMax:200,growth:{percent:2,every:2,startLevel:1}},automaticBefore=JSON.stringify(automatic)
for(const [level,min,max]of [[1,100,200],[2,100,200],[3,102,204],[4,102,204],[5,104,208],[101,200,400]]){const value=resolveCampaignAbilityLevel(automatic,level);if(value.powerMin!==min||value.powerMax!==max||value.effect.value!==25||value.visual.intensity!==ability.visual.intensity)throw Error('Calcul automatique incorrect')}
if(resolveCampaignAbilityLevel({...automatic,powerMin:4,powerMax:8},3).powerMin!==4.08)throw Error('Petit bonus arrondi trop tôt')
if(resolveCampaignAbilityLevel({...automatic,growth:{percent:1.5,every:3,startLevel:5}},7).powerMin!==100||resolveCampaignAbilityLevel({...automatic,growth:{percent:1.5,every:3,startLevel:5}},8).powerMin!==101.5)throw Error('Niveau de départ incorrect')
if(JSON.stringify(automatic)!==automaticBefore)throw Error('Définition mutée')
const growthPacket=importCampaignDraft(exportCampaignDraft(setDraftAbility(neutral,'new-hero',automatic)))
if(growthPacket.characters[0].abilities[0].growth.every!==2)throw Error('Progression automatique perdue')
globalThis.automatic=automatic
`,context);
for(const growth of [{percent:-1,every:2,startLevel:1},{percent:2,every:0,startLevel:1},{percent:2,every:2.5,startLevel:1},{percent:2,every:2,startLevel:0},{percent:Infinity,every:2,startLevel:1}]){context.badGrowth=growth;assert.throws(()=>vm.runInContext('createCampaignAbilities([{...ability,growth:badGrowth}])',context));}
assert.throws(()=>vm.runInContext('createCampaignAbilities([{...evolving,growth:automatic.growth}])',context),/sans les cumuler/);
vm.runInContext(fs.readFileSync('src/interface/editor/enemy-templates.js','utf8'),context);
vm.runInContext(`
const enemyBaseline=JSON.stringify(ACTIVE_CAMPAIGN),enemyExamples=['goblin','wolf','bandit','draugr','golem'].map((key,i)=>createDraftEnemyTemplate(key,'enemy-'+i))
const allVariants={...enemyExamples[0],variants:Object.keys(DRAFT_ENEMY_VARIANTS)},enemyBefore=JSON.stringify(allVariants)
if(resolveDraftEnemy(allVariants,'medium',1).stats.hp!==32||resolveDraftEnemy(allVariants,'worldBoss',1).stats.hp!==320||resolveDraftEnemy(allVariants,'worldBoss',3).stats.hp!==371.2||JSON.stringify(allVariants)!==enemyBefore)throw Error('Variantes ou progression incorrectes')
const enemyDraft=createCampaignDefinition({...neutral,bestiary:[allVariants,...enemyExamples.slice(1)]}),heroBefore=JSON.stringify(enemyDraft.characters)
const editedEnemyAbility=setDraftAbility(enemyDraft,allVariants.id,{...allVariants.abilities[0],name:'Entaille gobeline'},'enemy')
if(editedEnemyAbility.bestiary[0].abilities[0].name!=='Entaille gobeline'||JSON.stringify(editedEnemyAbility.characters)!==heroBefore||enemyDraft.bestiary[0].abilities[0].name==='Entaille gobeline')throw Error('Capacités ennemies non isolées')
if(removeDraftAbility(editedEnemyAbility,allVariants.id,'ability-basic','enemy').bestiary[0].abilities.length!==0)throw Error('Suppression de capacité ennemie incorrecte')
if(removeDraftEnemy(enemyDraft,allVariants.id).bestiary.length!==4)throw Error('Suppression d’ennemi incorrecte')
if(JSON.stringify(importCampaignDraft(exportCampaignDraft(enemyDraft)))!==JSON.stringify(enemyDraft))throw Error('Bestiaire perdu à l’export')
const withBestiary=createCampaignDefinition({...ACTIVE_CAMPAIGN,bestiary:enemyExamples})
if(JSON.stringify(ACTIVE_CAMPAIGN)!==enemyBaseline||JSON.stringify(withBestiary.enemies)!==JSON.stringify(ACTIVE_CAMPAIGN.enemies))throw Error('Bestiaire historique modifié')
globalThis.exampleEnemy=allVariants
`,context);
for(const patch of ["variants:[]","variants:['weak','weak']","variants:['unknown']","stats:{...exampleEnemy.stats,hp:0}","growth:{hpPercent:101,statsPercent:3,every:1}","resistances:[{name:'Feu',percent:25}],weaknesses:[{name:'feu',percent:20}]","appearance:{portrait:'https://bad/image.png'}"]){assert.throws(()=>vm.runInContext(`createCampaignBestiary([{...exampleEnemy,${patch}}])`,context));}
assert.throws(()=>vm.runInContext("createCampaignBestiary([exampleEnemy,exampleEnemy])",context),/dupliqué/);
vm.runInContext(`
const boardData={locationId:location.id,tokens:[{id:'token-hero',kind:'character',refId:'new-hero',x:25,y:40},{id:'token-enemy',kind:'enemy',refId:exampleEnemy.id,x:70,y:60,variant:'worldBoss',level:3},{id:'token-npc',kind:'npc',refId:'npc-test',x:50,y:50}]}
const prepared=createCampaignDefinition({...neutral,locations:[location],bestiary:[exampleEnemy],npcs:[{id:'npc-test',name:'Gardienne',description:'Garde le pont.'}],staging:[boardData],preparationNotes:'Notes du MJ'})
const preparedBefore=JSON.stringify(prepared),moved=setDraftBoard(prepared,location.id,boardData.tokens.map(token=>({...token,x:30})))
if(JSON.stringify(prepared)!==preparedBefore||moved.staging[0].tokens[0].x!==30)throw Error('Déplacement non isolé')
if(JSON.stringify(importCampaignDraft(exportCampaignDraft(prepared)))!==JSON.stringify(prepared))throw Error('Préparation perdue à l’export')
if(removeDraftEnemy(prepared,exampleEnemy.id).staging[0].tokens.some(token=>token.kind==='enemy')||removeDraftCharacter(prepared,'new-hero').staging[0].tokens.some(token=>token.kind==='character')||removeDraftLocation(prepared,location.id).staging.length!==0)throw Error('Références de pions non nettoyées')
globalThis.prepared=prepared
`,context);
for(const patch of ["x:101","y:-1","refId:'unknown'","kind:'script'","id:'../unsafe'"]){assert.throws(()=>vm.runInContext(`setDraftBoard(prepared,location.id,[{...prepared.staging[0].tokens[0],${patch}}])`,context));}
assert.throws(()=>vm.runInContext("setDraftBoard(prepared,location.id,[{...prepared.staging[0].tokens[1],variant:'unknown'}])",context),/catégorie/);
assert.throws(()=>vm.runInContext("createCampaignDefinition({...prepared,staging:[prepared.staging[0],prepared.staging[0]]})",context),/Carte/);
assert.throws(()=>vm.runInContext("createCampaignDefinition({...prepared,npcs:[{id:'npc-test',name:'Gardienne',description:'',image:'https://bad/image.png'}]})",context),/Image/);
vm.runInContext(`
const grouped=setDraftMapGroup(prepared,{id:'region-rivebois',name:'Rivebois'}),inGroup=setDraftLocation(grouped,{...location,groupId:'region-rivebois'})
if(inGroup.locations[0].groupId!=='region-rivebois'||prepared.mapGroups!==undefined)throw Error('Onglet non isolé')
const renamed=setDraftMapGroup(inGroup,{id:'region-rivebois',name:'Bois'})
if(renamed.locations[0].groupId!=='region-rivebois')throw Error('Renommage casse les cartes')
const ungrouped=removeDraftMapGroup(inGroup,'region-rivebois')
if(ungrouped.locations[0].groupId!==undefined||JSON.stringify(ungrouped.staging)!==JSON.stringify(prepared.staging))throw Error('Suppression d’onglet efface des données')
const autoBefore=JSON.stringify(prepared),automaticTokens=draftMapHeroTokens(prepared,location.id)
if(automaticTokens.length!==prepared.characters.length||automaticTokens[0].x!==25||automaticTokens.some(token=>token.kind!=='character')||JSON.stringify(prepared)!==autoBefore)throw Error('Affichage automatique incorrect')
if(draftMapHeroTokens(neutral,'lieu-new')[0].id!==draftMapHeroTokens(neutral,'lieu-new')[0].id||draftMapHeroTokens(neutral,'lieu-new')[0].id===draftMapHeroTokens(neutral,'lieu-other')[0].id)throw Error('Identifiants automatiques instables')
if(JSON.stringify(importCampaignDraft(exportCampaignDraft(inGroup)))!==JSON.stringify(inGroup))throw Error('Onglets perdus à l’export')
`,context);
assert.throws(()=>vm.runInContext("setDraftLocation(prepared,{...location,groupId:'region-unknown'})",context),/Onglet/);
assert.throws(()=>vm.runInContext("createCampaignMapGroups([{id:'region-a',name:'Brume'},{id:'region-b',name:'brume'}])",context),/utilisé/);
vm.runInContext(`
const npcMapped=createCampaignDefinition({...prepared,npcs:prepared.npcs.map(npc=>({...npc,locationIds:[location.id]}))})
const npcRoundTrip=importCampaignDraft(exportCampaignDraft(npcMapped))
if(npcRoundTrip.npcs[0].locationIds[0]!==location.id)throw Error('Cartes de PNJ perdues')
if(removeDraftLocation(npcMapped,location.id).npcs[0].locationIds.length)throw Error('Carte supprimée toujours associée au PNJ')
if(npcMapped.npcs[0].locationIds.length!==1)throw Error('Suppression de carte non isolée')
`,context);
assert.throws(()=>vm.runInContext("createCampaignDefinition({...prepared,npcs:prepared.npcs.map(npc=>({...npc,locationIds:['lieu-absent']}))})",context),/Carte de PNJ/);
assert.throws(()=>vm.runInContext("createCampaignDefinition({...prepared,npcs:prepared.npcs.map(npc=>({...npc,locationIds:[location.id,location.id]}))})",context),/Carte de PNJ/);
