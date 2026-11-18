const fs=require('fs'),assert=require('assert/strict'),{initializeTestEnvironment}=require('@firebase/rules-unit-testing'),{fullScreen,base}=require('./full-exploration-screen.cjs'),{fixture}=require('./combat.cjs');
const heroes=['greg','ju','elo','bibi'],screens=[],delay=ms=>new Promise(r=>setTimeout(r,ms));let env;
async function pump(ms){for(let n=0;n<ms;n+=200){screens.forEach(s=>s.clock.tick(200));await delay(8)}}
async function until(fn){for(let i=0;i<350;i++){if(await fn())return;await pump(100)}throw Error('Timeout '+fn)}
function matches(s,positions){return heroes.every(id=>s.w.document.getElementById(id).style.left===positions[id].x+'px'&&s.w.document.getElementById(id).style.top===positions[id].y+'px')}
(async()=>{try{
 env=await initializeTestEnvironment({projectId:'demo-token-recovery',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(base+'/firebase.database.rules.json','utf8')}});
 const root=fixture();delete root.combat;delete root.game.combatState;
 await env.withSecurityRulesDisabled(c=>c.database().ref().set(root));
 for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo'],['gm2',null]])screens.push(fullScreen(env.authenticatedContext(uid).database(),uid,hero));
 await until(()=>screens.every(s=>s.w.__authReady&&s.w.__actionOnline));screens.forEach(s=>s.start());await pump(6000);
 const gm=screens[0],db=gm.evaluate('db'),read=async p=>(await db.ref(p).once('value')).val(),initial=await read('characters');
 const positions=Object.fromEntries(heroes.map((id,i)=>[id,{x:220+i*100,y:330,facing:i%2}]));
 screens.forEach(s=>s.w.setSessionBusy(true));await db.ref('tokens').update(positions);await until(()=>screens.every(s=>s.w.__tokenPositions?.elo?.x===positions.elo.x));
 screens.forEach(s=>s.w.setSessionBusy(false));await pump(300);assert(screens.every(s=>matches(s,positions)));
 console.log('OK Greg, Pika, Elo et Bibi : positions reçues sous verrou puis réaffichées automatiquement sur cinq écrans, sans déplacement');
 let release,held=false;const ref=db.ref.bind(db);
 db.ref=function(path){const r=ref(path);if(path!=='curse/wheel')return r;return new Proxy(r,{get(target,key){if(key!=='once')return Reflect.get(target,key);return async(...args)=>{const snap=await target.once(...args);held=true;await new Promise(resolve=>release=resolve);return snap}}})};
 const resume=gm.w.awaitResumeSessionPresentation();await until(()=>held);
 const latest=Object.fromEntries(heroes.map((id,i)=>[id,{x:440+i*100,y:510,facing:1}]));await ref('tokens').update(latest);await until(()=>screens.every(s=>s.w.__tokenPositions?.elo?.x===latest.elo.x));
 release();await resume;db.ref=ref;assert(matches(gm,latest));
 console.log('OK reprise lente hors combat : une ancienne lecture ne remplace pas les positions reçues entre-temps');
 for(const id of heroes)gm.w.document.getElementById(id).style.left='9000px';gm.w.document.dispatchEvent(new gm.w.Event('visibilitychange'));assert(matches(gm,latest));assert.deepEqual(await read('tokens'),{...root.tokens,...latest});
 console.log('OK retour sur l’onglet : réapplication locale des positions, sans écriture ni nouvelle lecture de fiche');
 await gm.w.launchReliableCombat('garde','medium',[]);await until(()=>screens.every(s=>s.w.__combatSnapshot?.mob?.name==='garde'));await pump(16000);
 const battle=Object.fromEntries(heroes.map((id,i)=>[id,{x:180+i*120,y:420,facing:0}]));
 await db.ref('tokens').update(battle);await db.ref('combat/presentation/positions').update(Object.fromEntries(heroes.map(id=>[id,{x:9000,y:9000,facing:1}])));await until(()=>screens.every(s=>s.w.__combatSnapshot?.presentation?.positions?.elo?.x===9000));
 await Promise.all(screens.map(s=>s.w.awaitResumeSessionPresentation()));await pump(1000);
 assert(screens.every(s=>matches(s,battle)));for(const s of screens)for(const id of heroes)assert.equal(s.w.document.getElementById(id).parentElement.id,'combatTokens');
 assert.deepEqual(await read('characters'),initial);assert.deepEqual(await read('tokens'),{...root.tokens,...battle,mobToken:await read('tokens/mobToken')});
 for(const s of screens)assert.deepEqual(s.errors,[]);
 console.log('OK combat : positions actuelles prioritaires sur l’ancien placement sauvegardé, quatre pions récupérés sans bouger ; fiches intactes');
 }finally{screens.forEach(s=>s.close());await env?.cleanup()}
})().catch(e=>{console.error(e);process.exitCode=1});
