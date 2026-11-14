const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {fullScreen}=require('./full-exploration-screen.cjs'),engine=require('./combat.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),bytes=value=>Buffer.byteLength(JSON.stringify(value)??'null');
function instrumentDatabase(database){
 const original=database.ref.bind(database),bindings=[],stats={events:0,callbackBytes:0,paths:{}};
 const wrap=(ref,route)=>new Proxy(ref,{get(target,key){const value=Reflect.get(target,key,target);
  if(key==='on')return(event,callback,...args)=>{const record={route,event,callback,target,active:true};record.wrapped=snapshot=>{const size=bytes(snapshot.val());stats.events++;stats.callbackBytes+=size;const name=route+'|'+event;stats.paths[name]??={events:0,bytes:0};stats.paths[name].events++;stats.paths[name].bytes+=size;return callback(snapshot)};bindings.push(record);value.call(target,event,record.wrapped,...args);return callback};
  if(key==='off')return(event,callback)=>{for(const b of bindings)if(b.active&&b.route===route&&(!event||event===b.event)&&(!callback||callback===b.callback)){b.active=false;target.off(b.event,b.wrapped)}};
  if(['child','orderByChild','orderByKey','limitToLast','limitToFirst','startAt','endAt','equalTo'].includes(key))return(...args)=>wrap(value.apply(target,args),route+'|'+key+':'+JSON.stringify(args));
  return typeof value==='function'?value.bind(target):value;
 }});
 database.ref=input=>wrap(original(input),String(input||''));
 function reset(){stats.events=0;stats.callbackBytes=0;stats.paths={}}
 function snapshot(){const active={};for(const b of bindings)if(b.active){const key=b.route+'|'+b.event;active[key]=(active[key]||0)+1}return {...structuredClone(stats),activeSubscriptions:Object.values(active).reduce((n,x)=>n+x,0),repeatedSubscriptions:Object.fromEntries(Object.entries(active).filter(([,n])=>n>1))}}
 function stop(){for(const b of bindings)if(b.active){b.target.off(b.event,b.wrapped);b.active=false}database.goOffline()}
 return {reset,snapshot,stop};
}
async function profile(layout,padding){
 const projectId='demo-network-profile-'+layout+'-'+padding;
 let env,screens=[],probes=[],records=[],fetchJobs=[];
 const pump=async(ms)=>{for(let n=0;n<ms;n+=100){screens.forEach(s=>s.clock.tick(100));await pause(5)}};
 const until=async(fn,label)=>{for(let i=0;i<600;i++){if(await fn())return;await pump(100)}throw Error('Timeout '+label+' '+screens.flatMap(s=>s.errors).join(' | '))};
 function sdkCounters(){const collections=new Set(screens.map(s=>s.database._delegate._repoInternal.stats_));let sent=0,received=0;for(const collection of collections){const current=collection.get();sent+=current.bytes_sent||0;received+=current.bytes_received||0}return {sent,received}}
 function close(){probes.forEach(p=>p.stop());screens.forEach(s=>s.close());screens=[];probes=[]}
 function open(){for(const [uid,hero]of [['gm',null],['g','greg'],['y','ju'],['e','elo']]){
  const database=env.authenticatedContext(uid).database(),probe=instrumentDatabase(database),screen=fullScreen(database,uid,hero);probes.push(probe);screens.push(screen);
  const fetch=screen.w.fetch;screen.w.fetch=async(input,init)=>{const response=await fetch(input,init),entry={client:uid,path:new URL(input).pathname,method:init?.method||'GET',status:response.status,sent:Buffer.byteLength(init?.body||''),received:0};records.push(entry);const job=response.clone().arrayBuffer().then(buffer=>{entry.received=buffer.byteLength});fetchJobs.push(job);await job;return response};
 }}
 async function ready(){await until(()=>screens.every(s=>s.w.__authReady&&s.w.__actionOnline&&s.w.__explorationOnline&&(s.hero?s.w.__authPlayerId===s.hero:s.w.__authRole==='gm')),'clients ready');screens.forEach(s=>s.start());await pump(4000)}
 async function measure(name,fn){probes.forEach(p=>p.reset());records=[];fetchJobs=[];const before=sdkCounters();await fn();await pump(1200);await Promise.all(fetchJobs);const after=sdkCounters(),rest=records.map(x=>({...x}));return {name,rest:{requests:rest.length,sentBytes:rest.reduce((n,r)=>n+r.sent,0),responseBodyBytes:rest.reduce((n,r)=>n+r.received,0),conflicts:rest.filter(r=>r.status===412).length,byEndpoint:rest.reduce((all,r)=>{const key=r.method+' '+r.path;all[key]??={count:0,sent:0,received:0};all[key].count++;all[key].sent+=r.sent;all[key].received+=r.received;return all},{})},sdk:{sentCharacters:after.sent-before.sent,receivedCharacters:after.received-before.received},callbacks:probes.map((p,i)=>({client:screens[i].uid,...p.snapshot()}))}}
 try{
  env=await initializeTestEnvironment({projectId,database:{host:'127.0.0.1',port:9005,rules:fs.readFileSync(path.join(__dirname,'../firebase.database.rules.json'),'utf8')}});
  const root=engine.fixture();delete root.combat;delete root.game.combatState;root.characters.ju.buildVersion='pika-bard-v1';const state=Object.fromEntries(['characters','tokens','game','elements','events','curse'].map(k=>[k,root[k]??null]));const saves=Object.fromEntries(['current','previous'].map((name,i)=>[name,{...structuredClone(state),game:{...state.game,networkTestPadding:'x'.repeat(padding)},_schemaVersion:3,_saveName:name,_savedAt:100-i,_saveDate:'test'}]));delete root.saves;
  const seeded=layout===2?{storageLayout:2,active:root,saves,roles:root.roles,profiles:root.profiles}:{...root,saves};await env.withSecurityRulesDisabled(c=>c.database().ref().set(seeded));const admin=env.authenticatedContext('gm').database(),prefix=layout===2?'active/':'';
  open();await ready();await pump(20000);
  const stages=[];stages.push(await measure('idle',()=>pump(10000)));
  stages.push(await measure('mapChange',async()=>{await screens[0].w.changeMap('taverne.jpg');await until(()=>screens.every(s=>s.evaluate('currentMap')==='taverne.jpg'),'map');}));
  const combat=engine.fixture();await admin.ref(prefix+'combat').set(combat.combat);await admin.ref(prefix+'game/combatState').set(combat.game.combatState);await until(()=>screens.every(s=>s.w.__combatSnapshot?.id===combat.combat.id),'combat');await pump(30000);
  stages.push(await measure('attack',async()=>{let done=false,error;screens[1].w.submitCombatAction('hero','greg',{attack:'Chat Bite (CaC)',target:'mob'}).then(()=>done=true,e=>{error=e;done=true});await until(()=>done,'attack');if(error)throw error;}));
  assert((await admin.ref(prefix+'combat/mob/hp').once('value')).val()<1000);
  await admin.ref(prefix+'combat').remove();await admin.ref(prefix+'game/combatState').remove();await pump(15000);
  stages.push(await measure('save',async()=>{screens[0].w.prompt=()=> 'Mesure réseau';let done=false,result;screens[0].w.saveGame().then(value=>{result=value;done=true});await until(()=>done,'save');assert.equal(result,true,screens[0].errors.join(' | '))}));
  // Recreate four clients, rather than replaying a warm-cache connection.
  assert(screens.every(s=>s.errors.length===0),screens.flatMap(s=>s.errors).join(' | '));
  stages.push(await measure('coldReconnect',async()=>{close();open();await ready()}));
  assert(screens.every(s=>s.errors.length===0),screens.flatMap(s=>s.errors).join(' | '));
  const result={layout,paddingPerArchive:padding,clients:4,stages};console.log('OK network profile layout '+layout+', padding '+padding);return result;
 }finally{close();await env?.cleanup()}
}
function validateReport(report){
 assert.equal(report.cases.length,4)
 const total=stage=>stage.rest.sentBytes+stage.rest.responseBodyBytes
 for(const c of report.cases){
  assert.deepEqual(c.stages.map(s=>s.name),['idle','mapChange','attack','save','coldReconnect'])
  const idle=c.stages[0];assert.equal(total(idle),0);assert.equal(idle.sdk.sentCharacters,0);assert.equal(idle.sdk.receivedCharacters,0)
  for(const stage of c.stages){assert.equal(stage.callbacks.length,4);assert(stage.sdk.sentCharacters>=0&&stage.sdk.receivedCharacters>=0);assert.equal(stage.rest.conflicts,0)}
  for(const stage of c.stages)for(const client of stage.callbacks.filter(s=>s.client!=='gm'))assert(!Object.keys(client.paths).some(key=>/^saves(?:\/|\|)/.test(key)),'Les joueurs ne reçoivent pas les archives')
 }
 if(report.profileVersion>=2)for(const c of report.cases){const reconnect=c.stages.find(s=>s.name==='coldReconnect');const request=reconnect.rest.byEndpoint['GET /saves.json'];assert(request&&request.received<128,'Seuls les noms des archives sont lus au démarrage');assert(!reconnect.callbacks.some(client=>client.paths['saves|value']),'Aucune lecture du contenu normal des archives au démarrage')}
 for(const name of ['mapChange','attack']){
  const small=report.cases.find(c=>c.layout===2&&c.paddingPerArchive===150000).stages.find(s=>s.name===name)
  const large=report.cases.find(c=>c.layout===2&&c.paddingPerArchive===1000000).stages.find(s=>s.name===name)
  assert(total(large)<50000);assert(Math.abs(total(large)-total(small))<1000,'Les archives ne doivent pas gonfler les actions migrées')
  const legacy=report.cases.find(c=>c.layout===1&&c.paddingPerArchive===1000000).stages.find(s=>s.name===name);assert(total(legacy)>100*total(large))
 }
 return report
}

async function main(){
 assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:9005','Only the local test emulator is allowed');
 const cases=[];for(const padding of [150000,1000000])for(const layout of [1,2])cases.push(await profile(layout,padding));
 const report={format:1,profileVersion:2,version:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/GAME_V\s*=\s*"([^"]+)"/)[1],scope:'Four JSDOM clients, real game scripts and local Firebase emulator; synthetic campaign and archives only. REST full JSON bodies measured by a clone of responses, including responses otherwise cancelled by the app. SDK counters count JSON string characters, not UTF-8/network bytes. Callback bytes count application work and may overlap; do not add them to transport totals. No TLS, HTTP/WebSocket headers, compression, media, Internet latency or Firebase billing measured.',cases};
 validateReport(report);
 const target=process.env.RPG_NETWORK_PROFILE_REPORT||path.join(__dirname,'../_site/network-profile.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2));console.log('Report: '+target);
}
module.exports={profile,validateReport};if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1});
