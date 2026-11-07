const fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom');
const {createMockUserToken}=require('@firebase/util');
const FakeTimers=require('@sinonjs/fake-timers');
const base=path.resolve(__dirname,'..');
function fullScreen(database,uid,hero,options={}){
 const errors=[],sounds=[],warnings=[],dice=[],visuals=[],endings=[],returns=[],dom=new JSDOM(fs.readFileSync(path.join(base,'index.html'),'utf8'),{url:options.testMode?'https://rpg.test/?test=1':'https://rpg.test/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,ctx=dom.getInternalVMContext(),evaluate=s=>vm.runInContext(s,ctx),callbacks=[];
 if(options.transition)w.sessionStorage.setItem("rpg_session_transition",options.transition);
 const clock=FakeTimers.withGlobal(w).install({now:Date.now(),toFake:['Date','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame']});
 w.Math.random=()=>0.5;
 const nativeAdd=w.document.addEventListener.bind(w.document);w.document.addEventListener=(name,cb,opts)=>name==='DOMContentLoaded'?callbacks.push(cb):nativeAdd(name,cb,opts);
 w.console={log(){},warn(...e){warnings.push(e.map(String).join(' '))},error(...e){errors.push(e.map(x=>x?.stack||String(x)).join(' '))}};w.addEventListener('error',e=>{errors.push(e.error?.stack||e.message);e.preventDefault()});
 const gradient={addColorStop(){}};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:[]})},{get:(o,k)=>o[k]||(()=>{})});
 w.HTMLMediaElement.prototype.play=function(){sounds.push(this.getAttribute('src')||this.id);return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};
 w.Audio=function(src){const a=w.document.createElement('audio');if(src)a.src=src;return a};
 const project=database._delegate._repoInternal.repoInfo_.namespace;w.fetch=(input,init)=>{w.__fetchRequests||=[];w.__fetchRequests.push({method:init?.method||"GET"});const url=new URL(input);url.searchParams.set("ns",project);return global.fetch(url,init).then(async response=>{if(!response.ok&&response.status!==412){let error;try{error=(await response.clone().json()).error}catch(e){}w.__httpDiagnostics||=[];w.__httpDiagnostics.push({path:url.pathname,method:init?.method||"GET",status:response.status,error})}return response})};w.AbortController=global.AbortController;
 const auth={currentUser:{uid,getIdToken:async()=>createMockUserToken({sub:uid,iat:Math.floor(Date.now()/1000),firebase:{sign_in_provider:"anonymous",identities:{}}},project)},onAuthStateChanged(cb){Promise.resolve().then(()=>cb(this.currentUser));return()=>{}},signInAnonymously(){return Promise.resolve({user:this.currentUser})}};
 w.firebase={initializeApp(){},database:()=>database,auth:()=>auth};w.firebase.database.ServerValue={TIMESTAMP:Date.now()};
 for(const id of ['map','camera']){const el=w.document.getElementById(id);Object.defineProperty(el,'offsetWidth',{value:1600});Object.defineProperty(el,'offsetHeight',{value:1000});el.getBoundingClientRect=()=>({left:0,top:0,width:1600,height:1000})}
 for(const el of w.document.querySelectorAll('.token')){Object.defineProperty(el,'offsetLeft',{get:()=>parseFloat(el.style.left)||0});Object.defineProperty(el,'offsetTop',{get:()=>parseFloat(el.style.top)||0});el.getBoundingClientRect=()=>({left:(parseFloat(el.style.left)||0)*evaluate('cameraZoom'),top:(parseFloat(el.style.top)||0)*evaluate('cameraZoom'),width:80,height:80})}
 for(const n of ['config.js','state.js','utils.js','access.js','persistence.js','local-test-mode.js','presentation.js','game.js','ui.js','combat.js','combat-core.js','combat-runtime.js','exploration-core.js','exploration.js','combat-exit.js','character-effects-core.js','character-effects.js','session-view.js','gm-arbitration.js','entrance.js','reliability.js'])evaluate(fs.readFileSync(path.join(base,n),'utf8'));
 w.reliableActionNow=()=>Date.now();
 const originalDice=w.addDiceLog;w.addDiceLog=(...args)=>{dice.push(args);return originalDice(...args)};const runeVictory=w._showRuneVictoryNow;w._showRuneVictoryNow=(...args)=>{visuals.push('runeVictory');return runeVictory(...args)};
 for(const [name,type]of [['_showVictoryNow','victory'],['_showDefeatNow','defeat']]){const original=w[name];w[name]=(...args)=>{endings.push({type,id:args[0]?.combatId,time:w.Date.now()});return original(...args)}}const complete=w.completeCombatReturn;w.completeCombatReturn=(...args)=>{returns.push({id:args[0]?.combatId,time:w.Date.now()});return complete(...args)};
 for(const name of ['startMenuSparks','startSnow','preloadAssets'])if(w[name])w[name]=()=>{};
 for(const cb of callbacks)try{cb()}catch(e){errors.push(e.stack)}
 function start(){evaluate('gameStarted=true;gameState="GAME";');w.showTavern()}
 return{w,dom,ctx,evaluate,clock,errors,sounds,warnings,dice,visuals,endings,returns,database,uid,hero,start,close(){database.ref().off();clock.uninstall();w.close()}};
}
module.exports={fullScreen,base};
