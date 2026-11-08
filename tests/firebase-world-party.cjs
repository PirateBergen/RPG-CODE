const fs=require('fs'),assert=require('assert/strict');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const base=require('path').resolve(__dirname,'..');
const {fullScreen}=require(base+'/tests/full-exploration-screen.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));let screens=[],env;
async function until(fn){for(let i=0;i<400;i++){if(await fn())return;for(const s of screens)s.clock.tick(100);await delay(10)}throw Error('timeout')}
(async()=>{try{
env=await initializeTestEnvironment({projectId:'demo-world-marker',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(base+'/firebase.database.rules.json','utf8')}});
const tokens={greg:{x:100,y:200},ju:{x:200,y:200},elo:{x:300,y:200},bibi:{x:180,y:200,followGreg:false}};
await env.withSecurityRulesDisabled(c=>c.database().ref().set({roles:{gm:'gm'},profiles:{g:{playerId:'greg'}},characters:Object.fromEntries(['greg','ju','elo','bibi'].map(id=>[id,{hp:100,lvl:1,force:5,charme:5,perspi:5,chance:5,defense:5,poids:100,inventaire:'',notes:'',curse:0,corruption:0}])),tokens,game:{map:'taverne.jpg'}}));
for(const [uid,hero]of [['gm',null],['g','greg']]){const s=fullScreen(env.authenticatedContext(uid).database(),uid,hero);screens.push(s);const style=s.w.document.createElement('style');style.textContent=fs.readFileSync(base+'/style.css','utf8');s.w.document.head.append(style)}
await until(()=>screens.every(s=>s.w.__authReady));for(const s of screens)s.start();await until(()=>screens.every(s=>s.evaluate('currentMap')==='taverne.jpg'&&s.w.__explorationOnline));
const [gm,player]=screens;const read=async p=>(await gm.database.ref(p||undefined).once('value')).val();
await gm.database.ref('game/map').set('MAPMONDE.jpg');await until(()=>screens.every(s=>s.w.document.body.classList.contains('worldPartyView')));
for(const s of screens){assert.equal(s.w.getComputedStyle(s.w.document.getElementById('greg')).display,'none');assert.equal(s.w.document.getElementById('worldPartyMarker').hidden,false)}
assert.equal(await read('game/worldPartyPosition'),null);console.log('OK world-only rendering and no default writes');
await gm.w.writeWorldPartyPosition({x:650,y:480});await until(()=>screens.every(s=>s.w.document.getElementById('worldPartyMarker').style.left==='650px'));
assert.deepEqual(await read('tokens'),tokens);console.log('OK shared placement preserves all tokens and Bibi following');
await assert.rejects(player.w.writeWorldPartyPosition({x:1,y:1}));await assertFails(player.database.ref('game/worldPartyPosition').set({x:1,y:1}));console.log('OK player blocked by interface and server rules');
await assert.rejects(gm.w.writeWorldPartyPosition({x:NaN,y:5}));
const marker=gm.w.document.getElementById('worldPartyMarker');gm.evaluate('cameraZoom=0.5');
function pointer(type,x,y){const e=new gm.w.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:1});marker.dispatchEvent(e)}
pointer('pointerdown',325,240);pointer('pointermove',400,300);pointer('pointerup',400,300);await until(()=>screens.every(s=>s.w.document.getElementById('worldPartyMarker').style.left==='800px'));assert.equal((await read('game/worldPartyPosition')).y,600);console.log('OK drag uses camera scale and synchronizes on drop');
gm.w.__explorationOnline=false;await assert.rejects(gm.w.writeWorldPartyPosition({x:20,y:30}));gm.w.__explorationOnline=true;assert.equal((await read('game/worldPartyPosition')).x,800);console.log('OK offline placement rejected');
await gm.database.ref('game/map').set('prairie.jpg');await until(()=>screens.every(s=>s.evaluate('currentMap')==='prairie.jpg'));for(const s of screens){assert.equal(s.w.document.getElementById('worldPartyMarker').hidden,true);assert.notEqual(s.w.getComputedStyle(s.w.document.getElementById('greg')).display,'none')}
assert.deepEqual(await read('tokens'),tokens);await gm.database.ref('game/map').set('MAPMONDE.jpg');await until(()=>screens.every(s=>!s.w.document.getElementById('worldPartyMarker').hidden));assert.equal(marker.style.left,'800px');console.log('OK return to normal map and revisit retain separate positions');
const saved=gm.w.captureSession(await read(''));assert.deepEqual(JSON.parse(JSON.stringify(saved.game.worldPartyPosition)),{x:800,y:600});const restored=gm.w.sessionFromSave(saved);assert.equal(restored.game.worldPartyPosition.x,800);console.log('OK save capture and validation preserve group marker');
const reconnected=fullScreen(env.authenticatedContext('g').database(),'g','greg');screens.push(reconnected);await until(()=>reconnected.w.__authReady);reconnected.start();await until(()=>reconnected.w.document.getElementById('worldPartyMarker')?.style.left==='800px');console.log('OK fresh player session restores saved marker');
for(const s of screens){s.w.setGameState('COMBAT');assert.equal(s.w.document.getElementById('worldPartyMarker').hidden,true);s.w.setGameState('GAME');assert.equal(s.w.document.getElementById('worldPartyMarker').hidden,false);assert.deepEqual(s.errors,[])}console.log('OK combat visibility and zero JavaScript errors');
}finally{for(const s of screens)s.close();await env?.cleanup()}})().catch(e=>{console.error(e);process.exitCode=1});
