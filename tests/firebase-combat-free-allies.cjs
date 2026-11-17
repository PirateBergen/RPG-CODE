const fs=require('fs'),assert=require('assert/strict'),{initializeTestEnvironment}=require('@firebase/rules-unit-testing'),{fullScreen,base}=require('./full-exploration-screen.cjs'),{fixture}=require('./combat.cjs');
let env;const screens=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
async function pump(ms){for(let n=0;n<ms;n+=200){screens.forEach(s=>s.clock.tick(200));await delay(8)}}
async function until(fn){for(let n=0;n<350;n++){if(await fn())return;await pump(100)}throw Error('Timeout '+fn)}
(async()=>{try{
 env=await initializeTestEnvironment({projectId:'demo-free-allies',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(base+'/firebase.database.rules.json','utf8')}});
 const initial=fixture();delete initial.combat;delete initial.game.combatState;
 await env.withSecurityRulesDisabled(c=>c.database().ref().set(initial));
 for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo'],['gm2',null]])screens.push(fullScreen(env.authenticatedContext(uid).database(),uid,hero));
 await until(()=>screens.every(s=>s.w.__authReady&&s.w.__explorationOnline&&s.w.__actionOnline));screens.forEach(s=>s.start());await pump(1000);
 const gm=screens[0],read=async p=>(await gm.database.ref(p).once('value')).val(),tokens=s=>s.w.document.querySelectorAll('.summonedAllyToken');
 assert.equal(await gm.w.placeAllyOnMap('odin'),true);await until(()=>screens.every(s=>tokens(s).length===1));
 await gm.w.launchReliableCombat('garde','medium',[]);await until(()=>screens.every(s=>s.w.__combatSnapshot?.mob?.name==='garde'));await pump(16000);
 assert(screens.every(s=>tokens(s).length===0));assert.notEqual(gm.w.document.getElementById('allyBtn').style.display,'none');
 gm.w.document.getElementById('allyPNJPanel')?.remove();gm.w.openAllyPNJPanel();await until(()=>gm.w.document.getElementById('allyPNJPanel')?.textContent.includes('Invoquer librement'));gm.w.document.getElementById('allyPNJPanel').remove();
 const combat=await read('combat'),chars=await read('characters');
 assert.equal(await gm.w.placeAllyOnMap('hel'),true);await until(()=>screens.every(s=>tokens(s).length===1));
 for(const s of screens)assert.equal(tokens(s)[0].querySelectorAll('button').length,s.w.__authRole==='gm'?1:0);
 assert.deepEqual(await read('combat'),combat);assert.deepEqual(await read('characters'),chars);
 let all=await read('game/summonedAllies'),id=Object.keys(all).find(k=>all[k].combatId===combat.id);assert(id);
 await assert.rejects(screens[1].w.updateSummonedAlly(id,{remove:true}));
 assert.equal(await gm.w.updateSummonedAlly(id,{x:410,y:310}),true);await until(()=>screens.every(s=>tokens(s)[0].style.left==='410px'));
 tokens(gm)[0].querySelector('button').click();await until(()=>screens.every(s=>tokens(s).length===0));
 const hel=gm.evaluate('ALLY_PNJS.find(p=>p.id==="hel")');assert.equal(await gm.w.giveFreeCombatAllyAccess(hel,'greg'),true);
 await until(()=>screens[1].w.hasPlayerAllyAccess());
 await screens[1].w.triggerAllyAction(hel,hel.actions[0]);await until(()=>screens.every(s=>tokens(s).length===1));
 assert.deepEqual(await read('combat'),combat);assert.deepEqual(await read('characters'),chars);assert.equal(await read('game/playerAllyAccess'),null);
 assert(screens.every(s=>!s.w.document.querySelector('.allyScene')));
 const saved=gm.w.captureSession((await gm.database.ref().once('value')).val());assert(Object.values(saved.game.summonedAllies).some(t=>t.combatId===combat.id));
 await gm.w.requestManualCombatOutcome('victory');await pump(26000);await until(()=>screens.every(s=>!s.evaluate('combatActive')));
 all=await read('game/summonedAllies');assert.equal(Object.values(all).length,1);assert.equal(Object.values(all)[0].pnjId,'odin');await until(()=>screens.every(s=>tokens(s).length===1));
 for(const s of screens)assert.deepEqual(s.errors,[]);
 console.log('OK invocation libre : cinq sessions, combat ordinaire, pion synchronisé, déplacement/retrait MJ seuls, autorisation joueur sans pouvoir ni action, sauvegarde et sortie. Émulateur local uniquement.');
 }finally{screens.forEach(s=>s.close());await env?.cleanup()}
})().catch(e=>{console.error(e);process.exitCode=1});
