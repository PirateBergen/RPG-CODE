const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing'),{fullScreen}=require('./full-exploration-screen.cjs'),{seedFor}=require('./combat.cjs');
const screens=[],results=[],delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let env;
async function until(fn){for(let n=0;n<400;n++){if(await fn())return;await delay(15)}throw Error('Attente dépassée : '+fn)}
async function pump(ms){for(let n=0;n<ms;n+=250){screens.forEach(s=>s.clock.tick(250));await delay(15)}}
async function test(name,fn){await fn();results.push({name,ok:true});console.log('OK '+name)}
(async()=>{try{
 env=await initializeTestEnvironment({projectId:'demo-rpg-typed-dice',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(path.resolve(__dirname,'../firebase.database.rules.json'),'utf8')}});
 await env.withSecurityRulesDisabled(c=>c.database().ref().set({securityVersion:2,roles:{gm:'gm',gm2:'gm'},heroAssignments:{greg:{uid:'g',claimedAt:1},ju:{uid:'y',claimedAt:1},elo:{uid:'e',claimedAt:1}},profiles:{g:{playerId:'greg'},y:{playerId:'ju'},e:{playerId:'elo'}},characters:Object.fromEntries(['greg','ju','elo','bibi'].map(id=>[id,{hp:160,lvl:5,force:10,charme:10,perspi:10,defense:10,chance:id==='greg'?999:10,corruption:0,curse:0,inventaire:'Arc',notes:'privé'}])),tokens:Object.fromEntries(['greg','ju','elo','bibi'].map((id,index)=>[id,{x:100+index*80,y:300}])),game:{map:'taverne.jpg'}}));
 for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo'],['gm2',null]]){const screen=fullScreen(env.authenticatedContext(uid).database(),uid,hero);screen.events=[];screen.database.ref('diceRoll').on('child_added',snapshot=>screen.events.push({id:snapshot.key,...snapshot.val()}));screens.push(screen)}
 await until(()=>screens.every(s=>s.w.__authReady&&s.w.__actionOnline&&(s.hero?s.w.__authPlayerId===s.hero:s.w.__authRole==='gm')));screens.forEach(s=>s.start());await pump(2500);const [gm,greg,pika,elo,gm2]=screens,read=async p=>(await gm.database.ref(p).once('value')).val();
 await test('Cliquer sur D20 propose les types sans lancer immédiatement',async()=>{
  greg.evaluate(greg.w.document.querySelector('#diceBar button[onclick="chooseDiceRoll(20)"]').getAttribute('onclick'));assert(greg.w.document.getElementById('diceChoiceModal'));assert.equal(greg.events.length,0);assert(greg.w.document.querySelector('[data-dice-kind=initiative]').disabled);
 });
 await test('Chance : naturel 8 + bonus 2, résultat et animation identiques sur cinq écrans',async()=>{
  for(const s of [gm,gm2])s.w.Math.random=()=>seedFor(8,20)/4294967296;
  await greg.w.performDiceChoice('chance');await until(()=>screens.every(s=>s.events.length===1));const event=gm.events[0];assert.equal(event.diceKind,'chance');assert.equal(event.rawRoll,8);assert.equal(event.bonus,2);assert.equal(event.result,10);for(const s of screens)assert.deepEqual(s.events[0],event);
  await pump(7000);for(const s of screens){assert.equal(s.dice.at(-1)[2],10);assert.equal(s.dice.at(-1)[3].diceKind,'chance');assert(Array.from(s.w.document.querySelectorAll('#diceLogContent .logEntry')).some(entry=>entry.innerText.includes('Chance')))}assert.equal(await read('characters/greg/corruption'),0);
 });
 await test('Le MJ choisit un personnage ; un jet libre conserve son résultat brut',async()=>{
  gm.w.chooseDiceRoll(6);const select=gm.w.document.querySelector('#diceChoiceModal select');select.value='ju';select.dispatchEvent(new gm.w.Event('change'));await gm.w.performDiceChoice('chance');await until(()=>screens.every(s=>s.events.length===2));assert.equal(gm.events[1].player,'ju');assert.equal(gm.events[1].diceKind,'chance');
  elo.w.chooseDiceRoll(8);await elo.w.performDiceChoice('free');await until(()=>screens.every(s=>s.events.length===3));assert.equal(gm.events[2].diceKind,undefined);assert.equal(gm.events[2].rawRoll,undefined);assert(gm.events[2].result>=1&&gm.events[2].result<=8);await pump(14000);
 });
 await test('Initiative depuis D20 : un D12 réel enregistré, sans relance',async()=>{
  await gm.w.launchReliableCombat('garde','medium',[]);await until(()=>screens.every(s=>s.w.__combatSnapshot?.turnState?.phase==='rolling'));await pump(14000);for(const s of [gm,gm2])s.w.Math.random=()=>seedFor(7,12)/4294967296;
  greg.w.chooseDiceRoll(20);assert(!greg.w.document.querySelector('[data-dice-kind=initiative]').disabled);await greg.w.performDiceChoice('initiative');await until(()=>screens.every(s=>s.w.__combatSnapshot.turnState.rolls?.greg===7));
  greg.w.chooseDiceRoll(20);assert(greg.w.document.querySelector('[data-dice-kind=initiative]').disabled);greg.w.closeDiceChoice();assert.equal(gm.events.length,3);
  for(const s of [pika,elo]){s.w.chooseDiceRoll(6);await s.w.performDiceChoice('initiative')}await until(()=>screens.every(s=>s.w.__combatSnapshot.turnState.phase==='active'));
  for(const s of screens)assert.equal(JSON.stringify(s.w.__combatSnapshot.turnState.rolls),JSON.stringify(gm.w.__combatSnapshot.turnState.rolls));
 });
 await test('Combat actif : Initiative verrouillée, Chance ne change ni ordre ni séquence',async()=>{
  const before=await read('combat/turnState');pika.w.chooseDiceRoll(12);assert(pika.w.document.querySelector('[data-dice-kind=initiative]').disabled);await pika.w.performDiceChoice('chance');await until(()=>screens.every(s=>s.events.length===4));assert.deepEqual(await read('combat/turnState'),before);
  const event=gm.events[3];assert.equal(event.player,'ju');assert.equal(event.diceKind,'chance');await assertFails(pika.database.ref('diceRoll/'+event.id+'/result').set(9999));await pump(1000);for(const s of screens)assert.deepEqual(s.errors,[]);
 });
 console.log(JSON.stringify({passed:results.length,scope:'Cinq sessions JSDOM, émulateur Firebase officiel, règles inchangées, aucune donnée de production.',results},null,2));
}finally{screens.forEach(s=>s.close());await env?.cleanup()}})().catch(error=>{console.error(error);process.exitCode=1});
