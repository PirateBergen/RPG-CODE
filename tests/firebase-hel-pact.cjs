const fs=require('fs'),assert=require('assert/strict'),{initializeTestEnvironment}=require('@firebase/rules-unit-testing'),{fullScreen,base}=require('./full-exploration-screen.cjs'),{fixture}=require('./combat.cjs');
let env;const screens=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
async function pump(ms){for(let n=0;n<ms;n+=200){screens.forEach(s=>s.clock.tick(200));await delay(10)}}
async function until(fn){for(let n=0;n<300;n++){if(await fn())return;await pump(100)}throw Error('Timeout '+fn)}
(async()=>{try{
 env=await initializeTestEnvironment({projectId:'demo-hel-pact',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(base+'/firebase.database.rules.json','utf8')}})
 const initial=fixture();delete initial.combat;delete initial.game.combatState;initial.game.allyDiscoveries={odin:{time:1}};initial.game.playerAllyAccess={scope:'exploration',actionId:'odin_gungnir',pnjName:'Odin',playerId:'greg',grantId:'old',time:1};initial.game.summonedAllies={old:{pnjId:'odin',map:initial.game.map,x:100,y:100,time:1}}
 await env.withSecurityRulesDisabled(c=>c.database().ref().set(initial));for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo'],['gm2',null]])screens.push(fullScreen(env.authenticatedContext(uid).database(),uid,hero))
 await until(()=>screens.every(s=>s.w.__authReady&&s.w.__explorationOnline&&s.w.__actionOnline));screens.forEach(s=>s.start());await pump(1000)
 const gm=screens[0],read=async p=>(await gm.database.ref(p).once('value')).val();
 assert.equal(await screens[1].w.submitHelPactCommand({kind:'mark',targets:['greg']}),false)
 assert.equal(await gm.w.submitHelPactCommand({kind:'revoke',allyId:'odin'}),true);await until(()=>screens.every(s=>s.w.__explorationState?.allyBreaks?.odin));assert.equal(await read('game/playerAllyAccess'),null);assert.equal(await read('game/summonedAllies/old'),null)
 assert.equal(await gm.w.unlockAllyDiscovery('odin'),true);await until(()=>screens.every(s=>s.w.__explorationState?.allyDiscoveries?.odin));assert.equal(await read('game/allyBreaks/odin'),null)
 assert.equal(await gm.w.unlockAllyDiscovery('hel'),true);await until(()=>screens.every(s=>s.w.discoveredAllies().some(p=>p.id==='hel')));await pump(16000)
 assert.equal(await gm.w.submitHelPactCommand({kind:'mark',targets:['greg','elo']}),true);await until(()=>screens.every(s=>s.w.__helMarks?.greg&&s.w.__helMarks?.elo));await pump(2000)
 for(const s of screens){assert(s.w.document.getElementById('helWrathScene'));s.w.document.getElementById('helWrathScene').dispatchEvent(new s.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!s.w.document.getElementById('helWrathScene'));assert(s.w.__helMarks.greg)}
 const chars=await read('characters');assert.equal(chars.greg.hp,gm.w.getCharacterMaxHp('greg',chars.greg));assert.equal(await gm.w.submitHelPactCommand({kind:'mark',targets:['greg']}),false)
 const saved=gm.w.captureSession((await gm.database.ref().once('value')).val());assert(saved.game.helMarks.greg);assert(saved.characters.greg.helMark);assert.equal(saved.characters.greg.notes,'privé greg')
 await pump(12000);assert.equal(await gm.w.submitHelPactCommand({kind:'lift',targets:['greg']}),true);await until(()=>screens.every(s=>!s.w.__helMarks.greg));assert.equal(await read('characters/greg/hp'),chars.greg.hp)
 const reconnect=fullScreen(env.authenticatedContext('e').database(),'e','elo');screens.push(reconnect);await until(()=>reconnect.w.__authReady&&reconnect.w.__actionOnline);reconnect.start();await pump(2000);assert(reconnect.w.__helMarks.elo);assert(!reconnect.w.document.getElementById('helWrathScene'))
 await gm.w.launchReliableCombat('kraken','boss',[]);await until(()=>screens.every(s=>s.w.__combatSnapshot?.mob?.name==='kraken'));await pump(16000)
 const order=['greg','ju','elo','mob'].map(id=>({id,type:id==='mob'?'mob':'player',label:id}));await gm.database.ref('combat/turnState').set({phase:'active',order,participants:order,round:1,currentIndex:0,currentActorId:'greg',sequence:0});await until(()=>screens.every(s=>s.w.getCurrentCombatActorId()==='greg'))
 const seed=require('./combat.cjs').seedFor(20,20);for(const s of screens.filter(s=>s.w.__authRole==='gm'))s.w.Math.random=()=>(seed+.1)/4294967296
 const hel=gm.evaluate('ALLY_PNJS.find(p=>p.id==="hel")');assert.equal(await gm.w.giveAllyActionToPlayer(hel,hel.actions[0],'greg'),true)
 await screens[1].w.submitCombatAction('ally','greg',{pnjId:'hel',actionId:'hel_reprieve',target:'greg',secondaryTarget:'elo'});await until(()=>screens.every(s=>s.w.__combatSnapshot?.helReprieves?.greg&&s.w.__combatSnapshot?.helReprieves?.elo));assert.equal((await read('combat/lastAction')).result.roll,20)
 await gm.database.ref('characters/greg/hp').set(1);const state=await read('combat/turnState');await gm.database.ref('combat/turnState').set({...state,currentIndex:3,currentActorId:'mob',actorActionIndex:0});await until(()=>screens.every(s=>s.w.getCurrentCombatActorId()==='mob'));await pump(16000)
 await gm.w.submitCombatAction('enemy','mob',{attack:'Claquement de tentacule',target:'greg'});await until(()=>screens.every(s=>!s.w.__combatSnapshot?.helReprieves?.greg));assert.equal(await read('characters/greg/hp'),1);assert((await read('combat/helReprieves/elo')));const fightSave=gm.w.captureSession((await gm.database.ref().once('value')).val());assert(fightSave.combat.helReprieves.elo);assert(fightSave.combat.usedAllies.hel_reprieve)
 for(const s of screens)assert.deepEqual(s.errors,[])
 console.log('OK Hel : rupture/rétablissement, accès MJ, découverte, marque/levée, scène partagée et Échap, sauvegarde et reconnexion sans rejouer. Cinq sessions et émulateur local, aucune production.')
 }finally{screens.forEach(s=>s.close());await env?.cleanup()}
})().catch(error=>{console.error(error);process.exitCode=1})
