const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing'),{fullScreen}=require('./full-exploration-screen.cjs');
const screens=[],results=[],delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let env;
async function until(fn){for(let n=0;n<400;n++){if(await fn())return;await delay(15)}throw Error('Attente dépassée : '+fn)}
async function pump(ms){for(let n=0;n<ms;n+=250){screens.forEach(s=>s.clock.tick(250));await delay(15)}}
async function test(name,fn){await fn();results.push({name,ok:true});console.log('OK '+name)}
(async()=>{try{
 env=await initializeTestEnvironment({projectId:'demo-rpg-reactions',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(path.resolve(__dirname,'../firebase.database.rules.json'),'utf8')}});
 await env.withSecurityRulesDisabled(c=>c.database().ref().set({securityVersion:2,roles:{gm:'gm',gm2:'gm'},heroAssignments:{greg:{uid:'g',claimedAt:1},ju:{uid:'y',claimedAt:1},elo:{uid:'e',claimedAt:1}},profiles:{g:{playerId:'greg'},y:{playerId:'ju'},e:{playerId:'elo'}},characters:Object.fromEntries(['greg','ju','elo','bibi'].map(id=>[id,{hp:160,lvl:5,force:10,charme:10,perspi:10,defense:0,chance:10,corruption:0,curse:0,inventaire:'Arc',notes:'privé'}])),tokens:Object.fromEntries(['greg','ju','elo','bibi'].map((id,index)=>[id,{x:100+index*80,y:300}])),game:{map:'tourbillon.jpg'}}));
 for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo'],['gm2',null]])screens.push(fullScreen(env.authenticatedContext(uid).database(),uid,hero));
 await until(()=>screens.every(s=>s.w.__authReady&&(s.hero?s.w.__authPlayerId===s.hero:s.w.__authRole==='gm')));screens.forEach(s=>s.start());await pump(2500);
 const [gm,greg,pika,elo,gm2]=screens,read=async path=>(await gm.database.ref(path).once('value')).val();let reactionId,combatId;
 await test('Attaque réellement annoncée, bouton MJ disponible sur les cinq sessions',async()=>{
  await gm.w.launchReliableCombat('kraken',null,[]);await pump(14000);await until(()=>screens.every(s=>s.w.__combatSnapshot?.id));combatId=await read('combat/id');
  const order=['greg','ju','elo','mob'].map(id=>({id,type:id==='mob'?'mob':'player'}));await gm.database.ref('combat/turnState').set({phase:'active',round:1,sequence:0,order,participants:order,currentIndex:3,currentActorId:'mob'});await until(()=>gm.w.getCurrentCombatActorId()==='mob');
  const attack=gm.w.getMobSpecialAttack('kraken','boss');await gm.w.submitCombatAction('enemy','mob',{attack:attack.name});await until(()=>screens.every(s=>s.w.__combatSnapshot?.mob?.chargingSpecial));await pump(1000);
  assert(gm.w.document.querySelector('#combatReactionBar [data-reaction-slot="mob"]'));assert(!greg.w.document.getElementById('combatReactionBar'));
  const panel=gm.w.buildMobSubPanel(gm.w.__combatSnapshot.mob,'mob');assert(panel.querySelector('[data-reaction-slot="mob"]'));
 });
 await test('Le MJ choisit deux lanceurs ; fenêtre partagée et aucun dé pour Elo',async()=>{
  gm.w.openCombatReaction('mob');const form=gm.w.document.querySelector('#combatReactionModal');assert(form);assert.equal(form.querySelectorAll('input[type=checkbox]').length,4);
  for(const input of form.querySelectorAll('input[type=checkbox]'))input.checked=['greg','ju'].includes(input.value);
  form.querySelector('[data-reaction-command=start]').click();await until(()=>screens.every(s=>s.w.__combatSnapshot?.mob?.chargingSpecial?.reaction));reactionId=await read('combat/mob/chargingSpecial/reaction/id');await pump(1000);
  for(const s of screens)assert(s.w.document.getElementById('combatReactionModal'));assert(greg.w.document.querySelector('[data-reaction-roll=greg]'));assert(!greg.w.document.querySelector('[data-reaction-roll=ju]'));assert(!elo.w.document.querySelector('[data-reaction-roll]'));
 });
 await test('Deux clics simultanés, un seul jet confirmé ; aucun tour consommé',async()=>{
  const before=await read('combat/turnState'),characters=await read('characters');await Promise.all([greg.w.rollCombatReaction('mob','greg'),greg.w.rollCombatReaction('mob','greg'),pika.w.rollCombatReaction('mob','ju')]);
  await until(()=>screens.every(s=>s.w.__combatSnapshot.mob.chargingSpecial.reaction.rolls?.greg&&s.w.__combatSnapshot.mob.chargingSpecial.reaction.rolls?.ju));
  const rolls=await read('combat/mob/chargingSpecial/reaction/rolls');assert.deepEqual(Object.keys(rolls).sort(),['greg','ju']);assert.deepEqual(await read('combat/turnState'),before);assert.deepEqual(await read('characters'),characters);
  for(const s of screens)assert.deepEqual(JSON.parse(JSON.stringify(s.w.__combatSnapshot.mob.chargingSpecial.reaction.rolls)),rolls);
  const requests=Object.values(await read('combatRequests')).filter(r=>r.payload?.reactionId===reactionId);assert.equal(requests.length,2);assert(requests.every(r=>r.status==='done'));
 });
 await test('Permissions : usurpation refusée ; protections et seuil réservés au MJ',async()=>{
  await assertFails(greg.database.ref('combat/mob/chargingSpecial/reaction/decisions/greg').set(100));await assertFails(greg.database.ref('combat/mob/chargingSpecial/reaction/threshold').set(2));
  await assert.rejects(()=>greg.w.sendCombatReaction({slot:'mob',kind:'cancel',reactionId}));
 });
 await test('Sauvegarde/reconnexion garde l’événement et empêche un second jet',async()=>{
  const saved=gm.w.captureSession((await gm.database.ref().once('value')).val());assert.equal(saved.combat.mob.chargingSpecial.reaction.id,reactionId);
  greg.database.goOffline();await delay(100);greg.database.goOnline();await pump(1000);
  const before=await read('combat/mob/chargingSpecial/reaction/rolls/greg');await greg.w.rollCombatReaction('mob','greg');assert.deepEqual(await read('combat/mob/chargingSpecial/reaction/rolls/greg'),before);
  const returned=gm.w.sessionFromSave(saved);assert.deepEqual(JSON.parse(JSON.stringify(returned.combat.mob.chargingSpecial.reaction)),await read('combat/mob/chargingSpecial/reaction'));
 });
 await test('MJ valide 100/25 % ; les réductions sont identiques sur tous les écrans',async()=>{
  await gm.w.sendCombatReaction({slot:'mob',kind:'decision',reactionId,target:'greg',amount:100});await gm2.w.sendCombatReaction({slot:'mob',kind:'decision',reactionId,target:'ju',amount:25});await gm.w.sendCombatReaction({slot:'mob',kind:'finish',reactionId});await until(()=>screens.every(s=>s.w.__combatSnapshot.mob.chargingSpecial.reaction.status==='ready'));
  for(const s of screens){const reaction=s.w.__combatSnapshot.mob.chargingSpecial.reaction;assert.equal(reaction.decisions.greg,100);assert.equal(reaction.decisions.ju,25)}
 });
 await test('Résolution : protection propre à cette attaque, dégâts réels et fermeture',async()=>{
  const state=await read('combat/turnState');await gm.database.ref('combat/turnState').set({...state,round:2,currentIndex:3,currentActorId:'mob',actorActionIndex:0});await until(()=>screens.every(s=>s.w.__combatSnapshot.turnState.round===2));await pump(14000);
  const before=await read('characters');await gm.w.submitCombatAction('enemy','mob',{attack:gm.w.getMobSpecialAttack('kraken','boss').name});await until(()=>screens.every(s=>!s.w.__combatSnapshot?.mob?.chargingSpecial));await pump(1000);
  const after=await read('characters');assert.equal(after.greg.hp,before.greg.hp);const normal=before.elo.hp-after.elo.hp;assert(normal>0);assert.equal(before.ju.hp-after.ju.hp,Math.round(normal*.75));
  for(const s of screens){assert(!s.w.document.getElementById('combatReactionModal'));assert(!s.w.document.getElementById('combatReactionBar'));assert.deepEqual(s.errors,[])}
 });
 console.log(JSON.stringify({passed:results.length,scope:'Cinq sessions, émulateur Firebase local, règles de production inchangées, aucun accès aux données réelles.',results},null,2));
}finally{screens.forEach(s=>s.close());await env?.cleanup()}})().catch(error=>{console.error(error);process.exitCode=1});
