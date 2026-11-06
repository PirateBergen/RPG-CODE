const fs=require('fs'),path=require('path'),assert=require('assert/strict');const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');const {fullScreen}=require('./full-exploration-screen.cjs');const delay=ms=>new Promise(r=>setTimeout(r,ms));async function until(fn){for(let i=0;i<250;i++){if(fn())return;await delay(20)}throw Error('Attente dépassée')}
const results=[];async function test(name,fn){try{await fn();results.push({name,ok:true});console.log('OK '+name)}catch(error){results.push({name,ok:false,error:error.stack});console.log('ÉCHEC '+name+' : '+error.message)}}
let env;const list=[];const all=fn=>list.every(fn);async function pump(ms){for(let n=0;n<ms;n+=1000){for(const s of list)s.clock.tick(Math.min(1000,ms-n));await delay(20)}}
const source=path.resolve(__dirname,'..');
function fixture(map,event){return{roles:{gm:'gm',gm2:'gm'},profiles:{g:{playerId:'greg'},y:{playerId:'ju'},e:{playerId:'elo'}},characters:Object.fromEntries(['greg','ju','elo','bibi'].map(id=>[id,{hp:100,lvl:1,force:5,charme:5,perspi:5,chance:5,defense:5,poids:100,inventaire:'',notes:'privé '+id,curse:0,corruption:0}])),tokens:{greg:{x:160,y:240,facing:1},ju:{x:320,y:240,facing:0},elo:{x:480,y:240,facing:0},bibi:{x:680,y:400,facing:1,followGreg:false}},game:{map,completedEvents:{cemetery:true},...(event==='cemetery'?{cemeterySpell:{active:true,glipheShown:true,freed:true,failedByZombie:true,combatLaunched:true,time:Date.now()-10000}}:{}),...(event==='custom'?{mapAudio:{map,file:'lowcombat.mp3',time:Date.now()}}:{})}}}
(async()=>{try{
env=await initializeTestEnvironment({projectId:'demo-rpg-exit',database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(path.join(source,'firebase.database.rules.json'),'utf8')}});
const initial=fixture('prairie.jpg');await env.withSecurityRulesDisabled(c=>c.database().ref().set(initial));for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo'],['gm2',null]])list.push(fullScreen(env.authenticatedContext(uid).database(),uid,hero));await until(()=>all(s=>s.w.__authReady&&(s.hero?s.w.__authPlayerId===s.hero:s.w.__authRole==='gm')));list.forEach(s=>s.start());await delay(300);await pump(3000);
const gm=list[0],read=async p=>(await gm.database.ref(p).once('value')).val();
async function scenario({label,map,mob='gobelins',tier='weak',type='victory',target=map,event,slow=false,aoe=false,solo=false,extras=[],offline=false,legacy=false}){
 await test(label,async()=>{
 const base=fixture(map,event);for(const s of list){s.w.cleanupTransientGameUI();s.evaluate('gameState="GAME";gameStarted=true;window.__localCombatId=null;window.__combatOutcomeQueued=false;window.__pendingCombatOutcome=null;window.__combatIntroUntil=0');s.errors.length=0;s.clock.setSystemTime(Date.now())}await env.withSecurityRulesDisabled(c=>c.database().ref().set(base));await until(()=>all(s=>s.evaluate('currentMap')===map));await pump(2000);
 await gm.w.launchReliableCombat(mob,tier,extras);await until(()=>all(s=>s.w.__combatSnapshot?.mob?.name===mob&&s.evaluate('combatActive')));const id=gm.w.__combatSnapshot.id;
 await pump(mob==='roi'?27000:7500);
 for(const s of list)assert.deepEqual(s.errors,[]);
 if(solo){await gm.database.ref().update(Object.fromEntries(['greg','ju','elo'].map(id=>['characters/'+id+'/hp',0])));await until(()=>list[1].w.__publicCharacters?.greg?.hp===0&&list[1].w.__publicCharacters?.bibi?.hp>0);await pump(1000);assert.equal(await read('game/combatOutcome'),null);assert((await read('characters/bibi/hp'))>0);await gm.database.ref('combat/turnState').set({phase:'active',participants:[{id:'greg',type:'player',label:'Greg / Bibi'},{id:'mob',type:'mob',label:mob}],order:[{id:'greg',type:'player',label:'Greg / Bibi'},{id:'mob',type:'mob',label:mob}],rolls:{},currentActorId:'greg',currentIndex:0,round:1,sequence:0});await pump(9000);list[1].clock.setSystemTime(Date.now());list[1].w.__combatIntroUntil=0;assert.equal(list[1].w.__sharedVisualBusy,false);assert.equal(list[1].w.getCurrentCombatActorId(),'greg');const before=(await read('combat/mob/hp'));const notices=[],originalNotice=list[1].w.showNotification;list[1].w.showNotification=(m)=>{notices.push(m);originalNotice(m)};await list[1].w.requestHeroCombatAction(list[1].evaluate('attacks.greg.find(a=>a.name==="Le Bibi")'));list[1].w.showNotification=originalNotice;await until(()=>gm.w.__combatSnapshot?.lastAction?.result?.actor==='bibi');const last=await read('combat/lastAction');assert(last,JSON.stringify({notices,hud:list[1].w.getCombatHUDPlayerId(),public:list[1].w.__publicCharacters,requests:await read('combatRequests')}));assert.equal(last.result.actor,'bibi');assert((await read('combat/mob/hp'))<=before);assert.equal(await read('game/combatOutcome'),null)}
 if(slow)list[3].w.enqueueSharedVisual('slow-'+id,()=>{},20000);
 if(offline){list[2].database.goOffline();await until(()=>!list[2].w.__explorationOnline)}
 if(legacy){await gm.database.ref().update({'combat/phase':'finished','combat/turnState/phase':'finished','game/combatOutcome':{combatId:id,type,time:Date.now()-20000}})}else if(aoe){
 await gm.database.ref('combat/turnState').set({phase:'active',participants:[{id:'mob',type:'mob',label:mob}],order:[{id:'mob',type:'mob',label:mob}],rolls:{},currentActorId:'mob',currentIndex:0,round:1,sequence:0});
 await gm.database.ref().update(Object.fromEntries(['greg','ju','elo','bibi'].map(id=>['characters/'+id+'/hp',1])));await pump(4000);
 const attack=gm.evaluate('getMobAttacksForMob("'+mob+'","'+tier+'").find(a=>a.effect==="all").name');await gm.w.submitCombatAction('enemy','mob',{attack});
 }else if(type==='defeat')await gm.database.ref().update(Object.fromEntries(['greg','ju','elo','bibi'].map(id=>['characters/'+id+'/hp',0])));
 else await gm.database.ref().update(Object.fromEntries(['mob','mob2','mob3'].slice(0,extras.length+1).map(slot=>['combat/'+slot+'/hp',0])));
 await pump(legacy?10000:1000);await until(()=>list.filter((_,i)=>!offline||i!==2).every(s=>s.w.__pendingCombatOutcome?.combatId===id));const outcome=await read('game/combatOutcome');assert.equal(outcome.type,type);assert.equal(outcome.returnMap,target);
 await pump(slow?42000:18000);
 if(offline){list[2].database.goOnline();await until(()=>list[2].w.__explorationOnline&&list[2].w.__pendingCombatOutcome?.combatId===id);await pump(18000)}
 await until(()=>all(s=>s.evaluate('gameState')==='GAME'&&!s.evaluate('combatActive')&&!s.w.__combatReturnInProgress));
 assert.equal(await read('combat'),null);assert.equal(await read('game/combatState'),null);assert.equal(await read('game/map'),target);assert.deepEqual(await read('tokens'),base.tokens);assert.equal(Object.keys((await read('game/sessionLog'))||{}).filter(k=>k==='combat-'+id).length,1);
 for(const s of list){
 const end=s.endings.filter(e=>e.id===id),back=s.returns.filter(e=>e.id===id);assert.equal(end.length,1,'Une animation sur '+s.uid);assert.equal(end[0].type,type);assert.equal(back.length,1);assert(back[0].time-end[0].time>=(type==='victory'?7000:5000));assert.equal(s.evaluate('currentMap'),target);assert(s.w.document.getElementById('map').style.backgroundImage.includes(target));assert.equal(s.w.document.getElementById('combatArena').style.display,'none');assert.equal(s.w.__pendingLocalDefeat,false);assert.equal(s.w.__combatOutcomeShowing,false);assert.equal(s.w.__combatOutcomeQueued,false);
 for(const [id,p]of Object.entries(base.tokens)){const t=s.w.document.getElementById(id);assert.equal(t.parentElement.id,'map');assert.equal(t.style.left,p.x+'px');assert.equal(t.style.top,p.y+'px')}
 assert.equal(s.w.document.querySelectorAll('[id^="mobToken_"]').length,0);assert.deepEqual(s.errors,[])
 }
 if(type==='defeat')for(const id of ['greg','ju','elo','bibi'])assert.equal(await read('characters/'+id+'/hp'),0)
 if(event==='cemetery'){assert.equal((await read('game/cemeterySpell')).combatLaunched,true);assert.equal(await read('game/completedEvents/cemetery'),true)}
 if(event==='custom')assert.equal((await read('game/mapAudio')).file,'lowcombat.mp3')
 })
}
await scenario({label:'Victoire à trois ennemis : animation unique et retour des cinq sessions',map:'prairie.jpg',extras:['loup','garde']});
await scenario({label:'Bibi seule peut continuer ; quatre KO terminent le combat et ramènent tout le monde',map:'prairie.jpg',type:'defeat',solo:true});
await scenario({label:'Attaque de zone du dragon : quatre KO, défaite et carte restaurée',map:'prairie.jpg',mob:'dragon',tier:'boss',type:'defeat',aoe:true});
await scenario({label:'Victoire Balraug : tous reviennent dans la prairie, même avec un écran en retard',map:'balraug.jpg',mob:'balraug',tier:'boss',target:'prairie.jpg',slow:true});
await scenario({label:'Défaite Balraug : retour au lieu du combat, aucune transition de victoire',map:'balraug.jpg',mob:'balraug',tier:'boss',type:'defeat'});
await scenario({label:'Victoire Kraken : Niflheim pour tous',map:'tourbillon.jpg',mob:'kraken',tier:'boss',target:'niflheim.jpg'});
await scenario({label:'Défaite Kraken : retour au tourbillon pour tous',map:'tourbillon.jpg',mob:'kraken',tier:'boss',type:'defeat'});
await scenario({label:'Combat du cimetière : défaite, retour et absence de nouveau combat automatique',map:'cimetiere.jpg',mob:'zombie',tier:'high',type:'defeat',event:'cemetery'});
await scenario({label:'Combat pendant un événement Bifrost : retour correct après victoire',map:'bifrost.jpg',mob:'golem',tier:'high'});
await scenario({label:'Ancienne fin de combat encore ouverte : sortie mise à niveau et bonne carte de boss',map:'tourbillon.jpg',mob:'kraken',tier:'boss',target:'niflheim.jpg',legacy:true});
await scenario({label:'Déconnexion d’un joueur pendant la défaite : animation reçue à la reprise et retour correct',map:'prairie.jpg',type:'defeat',offline:true});
await scenario({label:'Roi : sortie de la cinématique de boss puis victoire et carte d’origine',map:'palaisville.jpg',mob:'roi',tier:'boss'});
await scenario({label:'Musique personnalisée : carte, pions et piste restaurés après défaite',map:'prairie.jpg',type:'defeat',event:'custom'});
await test('Nouvelle page après défaite : bonne carte et pions KO sans rejouer une défaite passée',async()=>{const fresh=fullScreen(env.authenticatedContext('g').database(),'g','greg');list.push(fresh);await until(()=>fresh.w.__authPlayerId==='greg');fresh.start();await pump(12000);assert.equal(fresh.evaluate('gameState'),'GAME');assert.equal(fresh.evaluate('combatActive'),false);assert.equal(fresh.evaluate('currentMap'),'prairie.jpg');assert.equal(fresh.endings.length,0);assert.equal(fresh.w.document.getElementById('greg').style.left,'160px');assert.deepEqual(fresh.errors,[])});
}finally{list.forEach(s=>s.close());await env?.cleanup()}
const report={scope:'Scripts complets dans cinq DOM JSDOM authentifiés distinctement, émulateur officiel Firebase, horloges et lectures audio simulées. Aucun combat de production modifié.',passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results};if(process.env.RPG_EXIT_FIREBASE_REPORT)fs.writeFileSync(process.env.RPG_EXIT_FIREBASE_REPORT,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
